# Issue #9: S9: Voice profile — few-shot samples per workspace, regenerate outputs

## What to build

Let workspace owners define a brand voice by pasting 3–5 past LinkedIn posts or newsletter excerpts. These samples are stored per workspace and injected as few-shot examples into every LLM output generation prompt. Add a "Regenerate" button on the outputs page that re-runs generation with the current voice profile applied.

This is the product's primary differentiator: outputs that sound like the host rather than generic AI.

## Acceptance criteria

- [ ] Voice profile page in the SPA: text areas to paste 3–5 writing samples, save button
- [ ] Samples stored in Postgres scoped to `org_id`
- [ ] LLM generation prompts for all existing outputs (show notes) updated to inject voice samples as few-shot examples when a profile exists
- [ ] "Regenerate" button on the episode outputs page re-runs generation with current voice profile
- [ ] New voice profile samples take effect on next generation (or regeneration); old outputs not silently overwritten
- [ ] Empty voice profile (no samples) falls back to generic generation (existing behavior)

## Blocked by

- #8 (needs working outputs pipeline before voice injection makes sense to test)

---
*Type: AFK*
