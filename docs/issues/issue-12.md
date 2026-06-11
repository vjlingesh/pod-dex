# Issue #12: S12: Quote card PNGs — satori renderer, fixed templates

## What to build

Generate a downloadable quote card PNG for each highlight extracted in S11. Rendering happens in the worker using satori (HTML/CSS → SVG → PNG). Fixed templates at MVP — no custom branding. Cards are stored in R2 and served via a signed URL. A "Download" button appears next to each highlight on the episode outputs page.

## Acceptance criteria

- [ ] satori-based renderer in the worker generates a PNG for each highlight quote
- [ ] PNG dimensions suitable for social media (1:1 and 16:9 templates at minimum)
- [ ] Quote text, speaker attribution, and episode title rendered on the card
- [ ] Generated PNGs stored in R2 (org-namespaced key)
- [ ] Download button on the highlights UI fetches a short-lived signed URL and triggers browser download
- [ ] Cards generated automatically when highlights are extracted (no manual trigger needed)

## Blocked by

- #11 (needs highlights extracted before cards can be generated)

---
*Type: AFK*
