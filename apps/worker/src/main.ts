import { loadEnv, numberEnv } from "@pod-dex/env";
import {
  GENERATION_QUEUE,
  type GenerationJob,
  TRANSCRIPTION_QUEUE,
  type TranscriptionJob,
  checkQueueHealth,
  closeConnection,
  closeQueues,
  getConnection,
} from "@pod-dex/queue";
import { Worker } from "bullmq";
import { runGeneration } from "./jobs/generate.js";
import { runTranscription } from "./jobs/transcribe.js";

loadEnv();

const concurrency = numberEnv("WORKER_CONCURRENCY", 2);

async function main() {
  if (!(await checkQueueHealth())) {
    throw new Error("cannot reach Redis — is the infra up? (make infra)");
  }

  const connection = getConnection();

  const transcription = new Worker<TranscriptionJob>(
    TRANSCRIPTION_QUEUE,
    async (job) => runTranscription(job.data),
    { connection, concurrency },
  );

  const generation = new Worker<GenerationJob>(
    GENERATION_QUEUE,
    async (job) => runGeneration(job.data),
    { connection, concurrency },
  );

  for (const worker of [transcription, generation]) {
    worker.on("failed", (job, err) => {
      console.error(`[${worker.name}] job ${job?.id} failed:`, err.message);
    });
    worker.on("completed", (job) => {
      console.log(`[${worker.name}] job ${job.id} done`);
    });
  }

  console.log(
    `worker online — ${TRANSCRIPTION_QUEUE} and ${GENERATION_QUEUE}, concurrency ${concurrency}`,
  );

  const shutdown = async () => {
    await Promise.all([transcription.close(), generation.close()]);
    await closeQueues();
    await closeConnection();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
