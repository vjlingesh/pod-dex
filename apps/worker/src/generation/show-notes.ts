import type { Chapter, OutputBody, TranscriptSegment } from "@pod-dex/db";
import { complete } from "@pod-dex/llm";
import { chapterBoundaries, toChapters } from "./chapters.js";

/** Keeps prompts inside a sane token budget on long episodes. */
function excerpt(text: string, limit = 12000): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}\n…[truncated]`;
}

function transcriptForPrompt(segments: TranscriptSegment[]): string {
  return excerpt(
    segments.map((s) => `[${Math.floor(s.start)}s] ${s.speaker}: ${s.text}`).join("\n"),
  );
}

/**
 * Titles the chapters whose boundaries were already computed from the
 * transcript. The model sees each chunk and returns one line per chapter.
 */
async function titleChapters(
  episodeTitle: string,
  chunks: Array<{ start: number; text: string }>,
): Promise<string[]> {
  const numbered = chunks
    .map((chunk, index) => `${index + 1}. ${excerpt(chunk.text, 1200)}`)
    .join("\n\n");

  const raw = await complete({
    tier: "fast",
    task: "chapter-titles",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You title podcast chapters. Reply with one title per chapter, numbered, nothing else. " +
          "Each title is at most eight words, concrete, and describes what is actually discussed. " +
          "No colons, no clickbait.",
      },
      {
        role: "user",
        content: `Episode: ${episodeTitle}\n\nChapters:\n\n${numbered}`,
      },
    ],
  });

  return raw
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

export type ShowNotesInput = {
  episodeTitle: string;
  segments: TranscriptSegment[];
  fullText: string;
  /** Voice profile samples, injected as few-shot examples when the org has them (#9). */
  voiceSamples?: string[];
};

export type GeneratedOutput = {
  kind: "show_notes";
  title: string;
  body: OutputBody;
};

export async function generateShowNotes(input: ShowNotesInput): Promise<GeneratedOutput> {
  const chunks = chapterBoundaries(input.segments);

  const [titles, intro, takeaways] = await Promise.all([
    chunks.length > 0 ? titleChapters(input.episodeTitle, chunks) : Promise.resolve([]),
    writeIntro(input),
    writeTakeaways(input),
  ]);

  const chapters = toChapters(chunks, titles);

  return {
    kind: "show_notes",
    title: "Show notes",
    body: {
      markdown: renderMarkdown(input.episodeTitle, intro, chapters, takeaways),
      chapters,
    },
  };
}

async function writeIntro(input: ShowNotesInput): Promise<string> {
  return (
    await complete({
      tier: "smart",
      task: "show-notes-intro",
      messages: [
        {
          role: "system",
          content: voiceAwareSystemPrompt(
            "You write podcast show notes. Produce a single paragraph, three sentences at most, " +
              "that tells a reader why this episode is worth their time. No hype, no rhetorical questions.",
            input.voiceSamples,
          ),
        },
        {
          role: "user",
          content: `Episode: ${input.episodeTitle}\n\nTranscript:\n${transcriptForPrompt(input.segments)}`,
        },
      ],
    })
  ).trim();
}

async function writeTakeaways(input: ShowNotesInput): Promise<string[]> {
  const raw = await complete({
    tier: "smart",
    task: "show-notes-takeaways",
    messages: [
      {
        role: "system",
        content: voiceAwareSystemPrompt(
          "You extract the key takeaways from a podcast episode. Reply with three to five lines, " +
            "one takeaway per line, no numbering or bullets. Each line states something specific " +
            "the episode actually establishes.",
          input.voiceSamples,
        ),
      },
      {
        role: "user",
        content: `Episode: ${input.episodeTitle}\n\nTranscript:\n${transcriptForPrompt(input.segments)}`,
      },
    ],
  });

  return raw
    .split("\n")
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

/**
 * Appends the workspace's writing samples as few-shot examples. With no samples
 * this returns the base prompt unchanged, which is the pre-#9 behaviour.
 */
export function voiceAwareSystemPrompt(base: string, voiceSamples?: string[]): string {
  if (!voiceSamples?.length) return base;

  const examples = voiceSamples
    .map((sample, index) => `Example ${index + 1}:\n${sample.trim()}`)
    .join("\n\n");

  return `${base}\n\nMatch the voice of the following samples written by the host — their rhythm, vocabulary and level of formality. Do not copy their content.\n\n${examples}`;
}

function renderMarkdown(
  episodeTitle: string,
  intro: string,
  chapters: Chapter[],
  takeaways: string[],
): string {
  const parts = [`# ${episodeTitle}`, "", intro];

  if (chapters.length > 0) {
    parts.push("", "## Chapters", "");
    for (const chapter of chapters) {
      parts.push(`- **${chapter.label}** — ${chapter.title}`);
    }
  }

  if (takeaways.length > 0) {
    parts.push("", "## Key takeaways", "");
    for (const takeaway of takeaways) {
      parts.push(`- ${takeaway}`);
    }
  }

  return `${parts.join("\n")}\n`;
}
