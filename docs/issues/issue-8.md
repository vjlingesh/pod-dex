# Issue #8: S8: First output — show notes + timestamps, copy button, mark-used (core tracer)

## What to build

The core tracer bullet. Take a transcribed episode and produce the first content output: show notes with timestamps. This is the end-to-end path that every subsequent output slice builds on — from transcript in DB, through an LLM generation step, to a rendered UI with a copy button and a "mark as used" state.

LLM call: a Haiku-class model extracts chapter structure and timestamps from the transcript; a Sonnet-class pass generates polished show notes. Output stored in Postgres, rendered in the episode outputs page.

## Acceptance criteria

- [ ] LLM generation job enqueued when episode status becomes `transcribed`
- [ ] Show notes generated: timestamped chapters, intro paragraph, key takeaways
- [ ] Output stored in Postgres and associated with the episode + org
- [ ] Episode outputs page in the SPA renders show notes
- [ ] Copy button copies formatted show notes to clipboard
- [ ] "Mark as used" toggle persists to DB and is reflected in the UI on reload
- [ ] Episode status updated to `ready` once outputs are generated

## Blocked by

- #7 (needs a transcribed episode to generate from)

---
*Type: AFK*
