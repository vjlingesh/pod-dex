# Issue #7: S7: Transcription pipeline — BullMQ worker + Deepgram diarized transcript

## What to build

Implement the async transcription pipeline. When an episode upload completes, a BullMQ job is enqueued. A separate Railway worker service picks it up, fetches the audio from R2, sends it to Deepgram Nova with diarization enabled, and writes the resulting transcript (with speaker labels and timestamps) back to Postgres. Episode status progresses from `pending` → `transcribing` → `transcribed`.

The worker is a separate Railway service so pipeline load never blocks API request handling.

## Acceptance criteria

- [ ] BullMQ job enqueued automatically when episode status becomes `pending`
- [ ] Worker service deployed separately on Railway (not the same process as the API)
- [ ] Worker fetches audio from R2 using a signed URL (not public)
- [ ] Deepgram Nova called with diarization enabled; response stored as structured transcript in Postgres
- [ ] Transcript includes: speaker labels (`Speaker 0`, `Speaker 1`, …), word-level timestamps, full text
- [ ] Episode status updated to `transcribed` on success; `failed` with error details on failure
- [ ] Failed jobs retry with backoff; dead-letter after N attempts
- [ ] Worker can be scaled independently of the API

## Blocked by

- #6 (needs episode records with uploaded audio to process)

---
*Type: AFK*
