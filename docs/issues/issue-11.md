# Issue #11: S11: Episode highlights — ranked pull-quotes with speaker + timestamp

## What to build

Extract the most quotable moments from each episode as ranked pull-quotes, each tagged with the speaker label and a timestamp link. A Haiku-class model does the extraction pass over the diarized transcript. Highlights are displayed on the episode outputs page alongside the written outputs from S8/S10.

This is the "Readwise for podcasts" feature — surfacing the best moments without the user having to read the full transcript.

## Acceptance criteria

- [ ] Highlight extraction job runs as part of the episode generation pipeline (after S8)
- [ ] 5–10 pull-quotes extracted per episode, each with speaker label and timestamp (MM:SS format)
- [ ] Quotes ranked by estimated shareability (Haiku-class scoring pass)
- [ ] Highlights stored in Postgres and rendered in their own section on the episode outputs page
- [ ] Each highlight has a copy button (copies the quote + attribution)
- [ ] Highlight extraction uses the diarized transcript (speaker labels preserved)

## Blocked by

- #8 (needs the generation pipeline and outputs page structure established in S8)

---
*Type: AFK*
