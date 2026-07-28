import type { TranscriptionJob } from "@pod-dex/queue";
import { presignDownload } from "@pod-dex/storage";
import { transcribe } from "@pod-dex/transcription";
import { loadEpisode, saveTranscript, setEpisodeStatus } from "../db.js";

export class NonRetryableJobError extends Error {}

/**
 * Fetches the audio via a signed URL — never a public one — hands it to the
 * transcription provider, and stores the diarized result.
 *
 * Throwing lets BullMQ retry with backoff. Conditions that will never succeed
 * on a retry (episode deleted, no audio) raise NonRetryableJobError instead, so
 * the queue does not spend three attempts on a certainty.
 */
export async function runTranscription(job: TranscriptionJob): Promise<void> {
  const { orgId, episodeId } = job;

  const episode = await loadEpisode(orgId, episodeId);
  if (!episode) throw new NonRetryableJobError(`episode ${episodeId} no longer exists`);
  if (!episode.audioKey) throw new NonRetryableJobError(`episode ${episodeId} has no audio`);

  await setEpisodeStatus(orgId, episodeId, "transcribing", { error: null });

  try {
    const audioUrl = await presignDownload(episode.audioKey, 3600);
    const result = await transcribe({ audioUrl, episodeTitle: episode.title });

    await saveTranscript(orgId, episodeId, result);
    await setEpisodeStatus(orgId, episodeId, "transcribed", {
      durationSeconds: result.durationSeconds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setEpisodeStatus(orgId, episodeId, "failed", { error: message.slice(0, 1000) });
    throw err;
  }
}
