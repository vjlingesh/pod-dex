import type { GenerationJob } from "@pod-dex/queue";
import { loadEpisode, loadTranscript, replaceOutputs, setEpisodeStatus } from "../db.js";
import { generateShowNotes } from "../generation/show-notes.js";
import { NonRetryableJobError } from "./transcribe.js";

/**
 * Turns a transcribed episode into publishable outputs. Show notes are the first
 * format (#8); later slices add the rest behind the same job.
 */
export async function runGeneration(job: GenerationJob): Promise<void> {
  const { orgId, episodeId } = job;

  const episode = await loadEpisode(orgId, episodeId);
  if (!episode) throw new NonRetryableJobError(`episode ${episodeId} no longer exists`);

  const transcript = await loadTranscript(orgId, episodeId);
  if (!transcript) {
    throw new NonRetryableJobError(`episode ${episodeId} has no transcript to generate from`);
  }

  await setEpisodeStatus(orgId, episodeId, "generating", { error: null });

  try {
    const showNotes = await generateShowNotes({
      episodeTitle: episode.title,
      segments: transcript.segments,
      fullText: transcript.fullText,
    });

    // Replaced as a set rather than appended, so a regeneration leaves exactly
    // one copy of each output kind.
    await replaceOutputs(orgId, episodeId, [showNotes]);
    await setEpisodeStatus(orgId, episodeId, "ready");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setEpisodeStatus(orgId, episodeId, "failed", { error: message.slice(0, 1000) });
    throw err;
  }
}
