import type { CompletionRequest } from "./types.js";

/**
 * Offline stand-in used whenever OPENROUTER_API_KEY is unset. Responses are
 * canned but shaped exactly like the real ones, so every downstream slice —
 * parsing, storage, rendering, copy buttons — is exercised for real without
 * network access or spend.
 *
 * Anything genuinely derived from the episode (chapter timestamps, quote
 * attribution) is computed from the transcript by the caller rather than asked
 * for here, so those parts stay correct even with the fake in play.
 */
const CANNED: Record<string, string> = {
  "show-notes-intro":
    "A candid conversation about what actually breaks when a team outgrows its own processes — and why the fix turned out to be writing things down rather than hiring faster.",

  "show-notes-takeaways": [
    "Onboarding is usually the first process to break, and it breaks quietly.",
    "Time to first meaningful commit is a metric nobody can argue with.",
    "Documentation was the single highest-leverage investment of the year.",
    "Process debt compounds exactly the way technical debt does.",
  ].join("\n"),

  "linkedin-posts": [
    "Our onboarding worked fine at ten people and collapsed at forty.\n\nNobody noticed. There was no incident, no outage, no angry customer. New hires just quietly started taking a full quarter to become productive.\n\nWe only caught it because we measured time to first meaningful commit. Four days became thirty-one.\n\nThat number ended the debate.",
    "The highest-leverage thing we did last year was not a hire, a tool, or a reorg.\n\nWe wrote things down.\n\nMost of our operating knowledge lived in three people's heads. Every new person had to reconstruct it by interrupting someone. Documentation turned a thirty-one day ramp into six.",
    "Process debt compounds exactly like technical debt.\n\nYou take a shortcut because it is fine at your current size. It stays fine. Then it is quietly not fine, and by the time you notice, the interest has been accruing for a year.\n\nThe difference is that nobody files a bug against a process.",
    "A metric that changed how we run engineering: time to first meaningful commit.\n\nNot lines of code. Not story points. How long before a new hire ships something that matters.\n\nIt is impossible to game and impossible to argue with.",
  ].join("\n\n---\n\n"),

  "newsletter-blurb":
    "This week's episode is about the moment a company outgrows the processes that got it there. Our guest's team hit it at around forty people, and the tell was not an outage or a missed deadline — it was that new hires had quietly started taking a full quarter to become productive.\n\nThey found it by measuring time to first meaningful commit, which went from four days to thirty-one. That single number ended an argument that had been running on vibes for months.\n\nThe fix was less exciting than the diagnosis: they wrote things down. Most of the company's operating knowledge lived in three people's heads, so every new hire had to reconstruct it by interruption. Documentation brought the ramp back to six days, and it held even after the team doubled again.\n\nThe line that stuck with us: process debt compounds exactly like technical debt, except nobody ever files a bug against a process.",

  "blog-post":
    "## The failure nobody reported\n\nMost scaling problems announce themselves. A service falls over, a deadline slips, a customer complains. The problem this team hit did none of that. Their onboarding process, which had worked perfectly well at ten people, stopped working somewhere around forty — and the only symptom was that new hires took longer and longer to do anything useful.\n\n## Finding a number worth arguing about\n\nThe breakthrough was measurement. Time to first meaningful commit had gone from four days to thirty-one. Once that was on a chart, the conversation stopped being about whether there was a problem and started being about which problem it was.\n\n## The unglamorous fix\n\nThe answer was documentation. Most of the company's working knowledge lived in three people's heads, which meant every new hire had to extract it by interrupting someone senior. Writing it down brought the ramp back to six days — and it stayed there through the next doubling, which is the part that matters.\n\n## Why this generalises\n\nProcess debt compounds like technical debt. The shortcut is genuinely fine when you take it, stays fine for a while, and then quietly stops being fine long before anyone notices. The difference is that no one files a bug against a process, so it goes unpaid until something breaks.",

  "case-study-angles": [
    "Scaling onboarding from ten to forty people without slowing delivery",
    "Using time to first meaningful commit as a leading indicator of process debt",
    "Documentation as an engineering investment rather than a chore",
  ].join("\n"),

  highlights: JSON.stringify([
    {
      quote:
        "We measured time to first meaningful commit. It went from four days to thirty-one. That number was impossible to argue with.",
      score: 95,
    },
    {
      quote: "The lesson is that process debt compounds exactly like technical debt.",
      score: 92,
    },
    {
      quote: "We had a process that worked fine for ten people and collapsed at forty.",
      score: 88,
    },
    {
      quote:
        "Most of our knowledge lived in three people's heads. Documentation was the single highest leverage thing we did that year.",
      score: 85,
    },
    {
      quote: "Nobody noticed until new hires started taking a full quarter to get productive.",
      score: 78,
    },
    {
      quote: "Time to first commit came back down to six days, and it stayed there.",
      score: 74,
    },
  ]),
};

/**
 * Tasks whose answer has to match the shape of the input — a chapter list has
 * as many titles as there are chapters — are derived rather than canned.
 */
const DERIVED: Record<string, (prompt: string) => string> = {
  "chapter-titles": (prompt) => {
    // The prompt numbers each chapter "1. …", "2. …" on its own line.
    const chunks = prompt.split(/\n\s*(?=\d+\.\s)/).filter((chunk) => /^\d+\.\s/.test(chunk));

    return chunks
      .map((chunk, index) => {
        const text = chunk.replace(/^\d+\.\s*/, "").trim();
        const firstSentence = text.split(/(?<=[.?!])\s/)[0] ?? text;
        const title = firstSentence
          .split(/\s+/)
          .slice(0, 7)
          .join(" ")
          .replace(/[.,;:?!]+$/, "");

        return `${index + 1}. ${title || `Part ${index + 1}`}`;
      })
      .join("\n");
  },
};

export async function completeWithFake(request: CompletionRequest): Promise<string> {
  const task = request.task ?? "";

  const derive = DERIVED[task];
  if (derive) return derive(request.messages.at(-1)?.content ?? "");

  const canned = CANNED[task];
  if (canned) return canned;

  // Unknown task: echo something obviously synthetic rather than pretending.
  return `[offline draft — no OPENROUTER_API_KEY set]\n\n${request.messages.at(-1)?.content.slice(0, 280) ?? ""}`;
}
