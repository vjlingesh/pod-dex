import { loadEnv, numberEnv } from "@pod-dex/env";
import {
  TRANSCRIPTION_QUEUE,
  type TranscriptionJob,
  checkQueueHealth,
  closeConnection,
  closeQueues,
  getConnection,
} from "@pod-dex/queue";
import { Worker } from "bullmq";
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

  transcription.on("failed", (job, err) => {
    console.error(`[${TRANSCRIPTION_QUEUE}] job ${job?.id} failed:`, err.message);
  });
  transcription.on("completed", (job) => {
    console.log(`[${TRANSCRIPTION_QUEUE}] job ${job.id} done`);
  });

  console.log(`worker online — ${TRANSCRIPTION_QUEUE}, concurrency ${concurrency}`);

  const shutdown = async () => {
    await transcription.close();
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
