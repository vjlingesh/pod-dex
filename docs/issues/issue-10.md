# Issue #10: S10: Remaining outputs — LinkedIn posts, newsletter blurb, blog post + case-study angles

## What to build

Extend the outputs pipeline to produce all remaining written content formats: 3–5 LinkedIn posts (varied angles, not just rephrases), a newsletter blurb (200–300 words), and a long-form blog post with 2–3 case-study angles extracted from the interview. All outputs use the workspace voice profile (from S9) and follow the same copy/mark-used UX established in S8.

## Acceptance criteria

- [ ] LLM generation produces LinkedIn posts (3–5 per episode, distinct angles)
- [ ] LLM generation produces newsletter blurb (~200–300 words)
- [ ] LLM generation produces blog post with case-study angles (2–3 angles surfaced from the interview)
- [ ] All new output types stored in Postgres and rendered on the episode outputs page
- [ ] Each output type has its own copy button and mark-used toggle
- [ ] Voice profile (S9 samples) injected into prompts for all new output types
- [ ] Regenerate button (from S9) triggers regeneration of all output types

## Blocked by

- #9 (voice profile must exist for outputs to be generated with the correct prompt structure)

---
*Type: AFK*
