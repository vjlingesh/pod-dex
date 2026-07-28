import type { Chapter, TranscriptSegment } from "@pod-dex/db";

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/**
 * Chapter boundaries come from the transcript, not the model: the model is asked
 * to title each chapter, but the timestamps are computed here so they are always
 * real. A model asked to invent timestamps will happily invent wrong ones, and a
 * wrong timestamp in published show notes is worse than a dull chapter title.
 */
export function chapterBoundaries(
  segments: TranscriptSegment[],
  targetCount = 6,
): Array<{ start: number; end: number; text: string }> {
  if (segments.length === 0) return [];

  const total = segments.at(-1)?.end ?? 0;
  const count = Math.max(1, Math.min(targetCount, segments.length));
  const window = total / count;

  const chunks: Array<{ start: number; end: number; text: string }> = [];

  for (const segment of segments) {
    const current = chunks.at(-1);
    // Start a new chapter once this one has covered its share of the runtime,
    // but always break on a segment boundary so a chapter never splits a speaker
    // mid-sentence.
    if (!current || segment.start - current.start >= window) {
      chunks.push({ start: segment.start, end: segment.end, text: segment.text });
      continue;
    }
    current.end = segment.end;
    current.text = `${current.text} ${segment.text}`;
  }

  return chunks;
}

export function toChapters(boundaries: Array<{ start: number }>, titles: string[]): Chapter[] {
  return boundaries.map((boundary, index) => ({
    start: boundary.start,
    label: formatTimestamp(boundary.start),
    title: titles[index]?.trim() || `Part ${index + 1}`,
  }));
}
