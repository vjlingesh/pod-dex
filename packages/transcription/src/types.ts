import type { TranscriptSegment, TranscriptWord } from "@pod-dex/db";

export type TranscriptResult = {
  provider: string;
  model: string | null;
  language: string | null;
  fullText: string;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  durationSeconds: number | null;
};

export type TranscribeInput = {
  /** Short-lived signed URL. The provider fetches the audio itself. */
  audioUrl: string;
  episodeTitle: string;
};

export type Transcriber = (input: TranscribeInput) => Promise<TranscriptResult>;

export class TranscriptionError extends Error {}
