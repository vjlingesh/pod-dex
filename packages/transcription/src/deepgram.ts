import type { TranscriptSegment, TranscriptWord } from "@pod-dex/db";
import { env } from "@pod-dex/env";
import { type TranscribeInput, type TranscriptResult, TranscriptionError } from "./types.js";

const MODEL = "nova-2";

type DeepgramWord = {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  speaker?: number;
};

type DeepgramResponse = {
  metadata?: { duration?: number };
  results?: {
    channels?: Array<{
      detected_language?: string;
      alternatives?: Array<{ transcript?: string; words?: DeepgramWord[] }>;
    }>;
  };
};

/**
 * Deepgram is given the signed URL rather than the bytes, so the audio never
 * passes through this process. Diarization is on: speaker labels are what make
 * the later highlight and quote-card slices possible.
 */
export async function transcribeWithDeepgram(input: TranscribeInput): Promise<TranscriptResult> {
  const params = new URLSearchParams({
    model: MODEL,
    diarize: "true",
    punctuate: "true",
    utterances: "true",
    smart_format: "true",
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      authorization: `Token ${env("DEEPGRAM_API_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ url: input.audioUrl }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TranscriptionError(
      `Deepgram request failed (${res.status}): ${detail.slice(0, 400)}`,
    );
  }

  return toTranscript((await res.json()) as DeepgramResponse);
}

function toTranscript(payload: DeepgramResponse): TranscriptResult {
  const channel = payload.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];
  const rawWords = alternative?.words ?? [];

  const words: TranscriptWord[] = rawWords.map((word) => ({
    word: word.punctuated_word ?? word.word,
    start: word.start,
    end: word.end,
    speaker: `Speaker ${word.speaker ?? 0}`,
  }));

  return {
    provider: "deepgram",
    model: MODEL,
    language: channel?.detected_language ?? null,
    fullText: alternative?.transcript ?? "",
    segments: groupIntoSegments(words),
    words,
    durationSeconds: payload.metadata?.duration ? Math.round(payload.metadata.duration) : null,
  };
}

/**
 * Deepgram labels speakers per word; the useful unit downstream is a run of
 * consecutive words by one speaker, so they are collapsed into utterances here.
 */
export function groupIntoSegments(words: TranscriptWord[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  for (const word of words) {
    const current = segments.at(-1);
    if (current && current.speaker === word.speaker) {
      current.end = word.end;
      current.text = `${current.text} ${word.word}`;
      continue;
    }
    segments.push({
      speaker: word.speaker,
      start: word.start,
      end: word.end,
      text: word.word,
    });
  }

  return segments;
}
