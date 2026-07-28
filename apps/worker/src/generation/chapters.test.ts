import type { TranscriptSegment } from "@pod-dex/db";
import { describe, expect, it } from "vitest";
import { chapterBoundaries, formatTimestamp, toChapters } from "./chapters.js";

const segment = (start: number, end: number, text = "x"): TranscriptSegment => ({
  speaker: "Speaker 0",
  start,
  end,
  text,
});

describe("formatTimestamp", () => {
  it("uses M:SS below an hour and H:MM:SS above it", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(65)).toBe("1:05");
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });

  it("floors fractional seconds and never goes negative", () => {
    expect(formatTimestamp(59.9)).toBe("0:59");
    expect(formatTimestamp(-5)).toBe("0:00");
  });
});

describe("chapterBoundaries", () => {
  it("returns nothing for an empty transcript", () => {
    expect(chapterBoundaries([])).toEqual([]);
  });

  it("splits the runtime into roughly the requested number of chapters", () => {
    const segments = Array.from({ length: 60 }, (_, i) => segment(i * 10, i * 10 + 10));

    const chunks = chapterBoundaries(segments, 6);

    expect(chunks.length).toBeGreaterThanOrEqual(5);
    expect(chunks.length).toBeLessThanOrEqual(7);
  });

  it("starts every chapter on a segment boundary, never mid-utterance", () => {
    const segments = [segment(0, 30, "one"), segment(30, 60, "two"), segment(60, 90, "three")];

    const starts = chapterBoundaries(segments, 3).map((c) => c.start);

    expect(starts.every((start) => segments.some((s) => s.start === start))).toBe(true);
  });

  it("never produces more chapters than there are segments", () => {
    expect(chapterBoundaries([segment(0, 10)], 6)).toHaveLength(1);
  });
});

describe("toChapters", () => {
  it("pairs each boundary with its title and a formatted label", () => {
    expect(toChapters([{ start: 0 }, { start: 90 }], ["Opening", "The turn"])).toEqual([
      { start: 0, label: "0:00", title: "Opening" },
      { start: 90, label: "1:30", title: "The turn" },
    ]);
  });

  it("falls back to a positional title when the model returns too few", () => {
    expect(toChapters([{ start: 0 }, { start: 60 }], ["Only one"])[1]).toEqual({
      start: 60,
      label: "1:00",
      title: "Part 2",
    });
  });
});
