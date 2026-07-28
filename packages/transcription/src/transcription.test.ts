import { afterEach, describe, expect, it } from "vitest";
import { groupIntoSegments } from "./deepgram.js";
import { transcribeWithFake } from "./fake.js";
import { selectTranscriber } from "./index.js";

const originalKey = process.env.DEEPGRAM_API_KEY;

afterEach(() => {
  process.env.DEEPGRAM_API_KEY = originalKey ?? "";
});

describe("selectTranscriber", () => {
  it("uses the offline fake when no Deepgram key is configured", () => {
    process.env.DEEPGRAM_API_KEY = "";
    expect(selectTranscriber()).toBe(transcribeWithFake);
  });

  it("uses Deepgram once a key is present", () => {
    process.env.DEEPGRAM_API_KEY = "dg_test";
    expect(selectTranscriber()).not.toBe(transcribeWithFake);
  });
});

describe("groupIntoSegments", () => {
  it("collapses consecutive words by one speaker into a single utterance", () => {
    const segments = groupIntoSegments([
      { word: "Hello", start: 0, end: 1, speaker: "Speaker 0" },
      { word: "there", start: 1, end: 2, speaker: "Speaker 0" },
      { word: "Hi", start: 2, end: 3, speaker: "Speaker 1" },
    ]);

    expect(segments).toEqual([
      { speaker: "Speaker 0", start: 0, end: 2, text: "Hello there" },
      { speaker: "Speaker 1", start: 2, end: 3, text: "Hi" },
    ]);
  });

  it("starts a new segment when the same speaker returns after another", () => {
    const segments = groupIntoSegments([
      { word: "a", start: 0, end: 1, speaker: "Speaker 0" },
      { word: "b", start: 1, end: 2, speaker: "Speaker 1" },
      { word: "c", start: 2, end: 3, speaker: "Speaker 0" },
    ]);

    expect(segments).toHaveLength(3);
  });
});

describe("the fake transcriber", () => {
  it("produces diarized segments with ordered timestamps and full text", async () => {
    const result = await transcribeWithFake({
      audioUrl: "https://s3.test/a.mp3",
      episodeTitle: "Ep",
    });

    expect(result.provider).toBe("fake");
    expect(result.fullText.length).toBeGreaterThan(200);
    expect(new Set(result.segments.map((s) => s.speaker))).toEqual(
      new Set(["Speaker 0", "Speaker 1"]),
    );

    const starts = result.words.map((w) => w.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(result.durationSeconds).toBeGreaterThan(0);
  });
});
