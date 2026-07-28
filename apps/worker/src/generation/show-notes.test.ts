import type { TranscriptSegment } from "@pod-dex/db";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pod-dex/llm", () => ({ complete: vi.fn() }));

const llm = await import("@pod-dex/llm");
const { generateShowNotes, voiceAwareSystemPrompt } = await import("./show-notes.js");

const segments: TranscriptSegment[] = [
  { speaker: "Speaker 0", start: 0, end: 30, text: "Welcome to the show." },
  { speaker: "Speaker 1", start: 30, end: 60, text: "Glad to be here." },
  { speaker: "Speaker 0", start: 60, end: 90, text: "Let us talk about scaling." },
];

function respond(byTask: Record<string, string>) {
  vi.mocked(llm.complete).mockImplementation(async (req) => byTask[req.task ?? ""] ?? "");
}

describe("generateShowNotes", () => {
  it("renders an intro, timestamped chapters and takeaways as copyable markdown", async () => {
    respond({
      "chapter-titles": "1. Opening\n2. Scaling pains\n3. What worked",
      "show-notes-intro": "A conversation about scaling.",
      "show-notes-takeaways": "Measure onboarding\nWrite things down",
    });

    const output = await generateShowNotes({
      episodeTitle: "Ep 1",
      segments,
      fullText: "…",
    });

    expect(output.kind).toBe("show_notes");
    expect(output.body.markdown).toContain("# Ep 1");
    expect(output.body.markdown).toContain("A conversation about scaling.");
    expect(output.body.markdown).toContain("## Chapters");
    expect(output.body.markdown).toContain("## Key takeaways");
    expect(output.body.markdown).toContain("Write things down");
  });

  it("takes chapter timestamps from the transcript rather than the model", async () => {
    respond({
      "chapter-titles": "1. Opening\n2. Scaling pains\n3. What worked",
      "show-notes-intro": "Intro.",
      "show-notes-takeaways": "One",
    });

    const output = await generateShowNotes({ episodeTitle: "Ep 1", segments, fullText: "…" });

    const starts = output.body.chapters?.map((chapter) => chapter.start) ?? [];
    expect(starts.every((start) => segments.some((s) => s.start === start))).toBe(true);
    expect(output.body.chapters?.[0]?.label).toBe("0:00");
  });

  it("still produces show notes when the model returns no chapter titles", async () => {
    respond({ "show-notes-intro": "Intro.", "show-notes-takeaways": "One" });

    const output = await generateShowNotes({ episodeTitle: "Ep 1", segments, fullText: "…" });

    expect(output.body.chapters?.[0]?.title).toBe("Part 1");
  });
});

describe("voiceAwareSystemPrompt", () => {
  it("leaves the prompt untouched when the workspace has no voice samples", () => {
    expect(voiceAwareSystemPrompt("Base prompt.")).toBe("Base prompt.");
    expect(voiceAwareSystemPrompt("Base prompt.", [])).toBe("Base prompt.");
  });

  it("appends the samples as labelled examples", () => {
    const prompt = voiceAwareSystemPrompt("Base prompt.", ["First sample", "Second sample"]);

    expect(prompt).toContain("Base prompt.");
    expect(prompt).toContain("Example 1:\nFirst sample");
    expect(prompt).toContain("Example 2:\nSecond sample");
  });
});
