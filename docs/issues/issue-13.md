# Issue #13: S13: RSS ingestion — connect feed, poll + dedupe, auto-process new episodes

## What to build

Let users connect a podcast RSS feed instead of uploading files manually. Once connected, new episodes appear in the workspace automatically. A polling job (cron or BullMQ repeatable) checks for new items, dedupes against already-processed GUIDs, and enqueues transcription jobs for any new episodes.

## Acceptance criteria

- [ ] "Add show by RSS URL" flow in the SPA: user pastes URL, feed is validated and saved
- [ ] Feed metadata (show title, artwork) fetched from RSS and stored per show
- [ ] Polling job runs on a defined cadence (≤30 min); checks feed for new items
- [ ] New episode GUIDs deduped against existing episodes — no duplicate processing
- [ ] New episodes auto-enqueued for transcription (same pipeline as manual upload)
- [ ] Episode source tracked (`rss` vs `upload`) in the DB
- [ ] Polling handles feeds behind common CDNs; handles etag/If-Modified-Since to avoid unnecessary re-fetches

## Blocked by

- #7 (needs the transcription pipeline to hand off to)

---
*Type: AFK*
