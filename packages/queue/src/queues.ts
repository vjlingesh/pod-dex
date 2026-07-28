import { Queue } from "bullmq";
import { getConnection } from "./connection.js";

export const TRANSCRIPTION_QUEUE = "transcription";
export const GENERATION_QUEUE = "generation";

/** Job payloads carry ids only — never audio, transcripts or any other blob. */
export type TranscriptionJob = {
  episodeId: string;
  orgId: string;
};

export type GenerationJob = {
  episodeId: string;
  orgId: string;
  /** Set when the user asked for a rerun, so existing outputs are replaced deliberately. */
  regenerate?: boolean;
};

/**
 * Retry with backoff, then leave the job in the failed set rather than deleting
 * it — a dead job is evidence, and the episode row carries the error the user sees.
 */
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: false,
};

let transcription: Queue<TranscriptionJob> | undefined;
let generation: Queue<GenerationJob> | undefined;

export function transcriptionQueue(): Queue<TranscriptionJob> {
  if (!transcription) {
    transcription = new Queue<TranscriptionJob>(TRANSCRIPTION_QUEUE, {
      connection: getConnection(),
      defaultJobOptions,
    });
  }
  return transcription;
}

export function generationQueue(): Queue<GenerationJob> {
  if (!generation) {
    generation = new Queue<GenerationJob>(GENERATION_QUEUE, {
      connection: getConnection(),
      defaultJobOptions,
    });
  }
  return generation;
}

/**
 * The episode id doubles as the job id, so an episode enqueued twice — a retried
 * upload-complete, an RSS poll that races itself — produces one job, not two.
 *
 * BullMQ reserves ":" inside custom job ids, hence the "-" separators.
 */
export async function enqueueTranscription(job: TranscriptionJob): Promise<void> {
  await transcriptionQueue().add("transcribe", job, { jobId: `transcribe-${job.episodeId}` });
}

export async function enqueueGeneration(job: GenerationJob): Promise<void> {
  await generationQueue().add("generate", job, {
    // A regeneration is a deliberate rerun, so it gets a fresh id rather than
    // being deduplicated against the original job.
    jobId: job.regenerate
      ? `generate-${job.episodeId}-${Date.now()}`
      : `generate-${job.episodeId}`,
  });
}

export async function closeQueues(): Promise<void> {
  await transcription?.close();
  await generation?.close();
  transcription = undefined;
  generation = undefined;
}
