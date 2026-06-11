# Issue #6: S6: Episode upload — presigned R2, 500 MB cap, 30-day audio lifecycle

## What to build

Let a signed-in user upload an audio file directly to Cloudflare R2 via a presigned URL. The API generates the presigned URL, the client uploads directly to R2 (no proxying through the API), and the episode record is created in Postgres once the upload completes.

R2 keys are namespaced per org. A lifecycle rule deletes the audio object after 30 days (transcripts are kept indefinitely). 500 MB hard cap enforced at the presigned URL level.

## Acceptance criteria

- [ ] `POST /episodes/upload-url` returns a presigned R2 PUT URL scoped to the caller's org
- [ ] Client uploads audio directly to R2 using the presigned URL
- [ ] `POST /episodes/:id/upload-complete` confirms upload and creates the episode record in Postgres
- [ ] 500 MB cap enforced (presigned URL conditions or API validation)
- [ ] R2 object key includes `org_id` prefix for namespace isolation
- [ ] R2 lifecycle rule configured: delete audio objects after 30 days
- [ ] Episode record in DB has status `pending` after upload completes

## Blocked by

- #5 (requires auth + org_id scoping to be in place)

---
*Type: AFK*
