import { optionalEnv } from "@pod-dex/env";
import { transcribeWithDeepgram } from "./deepgram.js";
import { transcribeWithFake } from "./fake.js";
import type { TranscribeInput, Transcriber, TranscriptResult } from "./types.js";

export { groupIntoSegments } from "./deepgram.js";
export { TranscriptionError } from "./types.js";
export type { TranscribeInput, TranscriptResult, Transcriber } from "./types.js";

/**
 * Deepgram when a key is configured, the offline fake otherwise. Decided per
 * call rather than at import so a key added to .env takes effect on restart
 * without any code path changing.
 */
export function selectTranscriber(): Transcriber {
  return optionalEnv("DEEPGRAM_API_KEY") ? transcribeWithDeepgram : transcribeWithFake;
}

export async function transcribe(input: TranscribeInput): Promise<TranscriptResult> {
  return selectTranscriber()(input);
}
