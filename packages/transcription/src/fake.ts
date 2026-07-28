import type { TranscriptWord } from "@pod-dex/db";
import { groupIntoSegments } from "./deepgram.js";
import type { TranscribeInput, TranscriptResult } from "./types.js";

/**
 * Stand-in used whenever DEEPGRAM_API_KEY is unset, so the whole pipeline runs
 * offline and deterministically. It produces a plausible two-speaker interview
 * with real timestamps and speaker labels — enough shape for the generation,
 * highlight and quote-card slices to be exercised end to end.
 */
const SCRIPT: Array<[string, string]> = [
  ["Speaker 0", "Welcome back to the show. Today we are talking about how teams actually ship."],
  ["Speaker 1", "Thanks for having me. It is a topic I have opinions about."],
  ["Speaker 0", "Let us start at the beginning. What was the first thing that broke as you grew?"],
  [
    "Speaker 1",
    "Onboarding. We had a process that worked fine for ten people and collapsed at forty. Nobody noticed until new hires started taking a full quarter to get productive.",
  ],
  ["Speaker 0", "How did you find out it was onboarding rather than hiring?"],
  [
    "Speaker 1",
    "We measured time to first meaningful commit. It went from four days to thirty-one. That number was impossible to argue with.",
  ],
  ["Speaker 0", "That is a striking jump. What did you change first?"],
  [
    "Speaker 1",
    "We wrote things down. Sounds obvious, but most of our knowledge lived in three people's heads. Documentation was the single highest leverage thing we did that year.",
  ],
  ["Speaker 0", "And the result?"],
  [
    "Speaker 1",
    "Time to first commit came back down to six days, and it stayed there even as we doubled again. The lesson is that process debt compounds exactly like technical debt.",
  ],
  ["Speaker 0", "That is a great note to end on. Thanks for coming on."],
  ["Speaker 1", "My pleasure."],
];

const WORDS_PER_SECOND = 2.6;

export async function transcribeWithFake(input: TranscribeInput): Promise<TranscriptResult> {
  const words: TranscriptWord[] = [];
  let clock = 0.5;

  for (const [speaker, line] of SCRIPT) {
    for (const token of line.split(/\s+/)) {
      const duration = 1 / WORDS_PER_SECOND;
      words.push({
        word: token,
        start: Number(clock.toFixed(2)),
        end: Number((clock + duration).toFixed(2)),
        speaker,
      });
      clock += duration;
    }
    // A beat between speaker turns, so segment boundaries look real.
    clock += 0.6;
  }

  return {
    provider: "fake",
    model: null,
    language: "en",
    fullText: SCRIPT.map(([, line]) => line).join(" "),
    segments: groupIntoSegments(words),
    words,
    durationSeconds: Math.ceil(clock),
  };
}
