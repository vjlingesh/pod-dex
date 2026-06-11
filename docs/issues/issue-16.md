# Issue #16: S16: Processing-done emails

## What to build

Send a transactional email to the workspace owner (and any members who uploaded the episode) when an episode finishes processing. Email includes the episode title, a link to the outputs page, and a brief summary of what was generated. Provider TBD (Resend vs Postmark — pick one before implementing).

Better Auth's email paths are available for delivery; the email template and trigger live in the worker pipeline.

## Acceptance criteria

- [ ] Email provider selected and configured (Resend or Postmark; add API key to Railway env)
- [ ] Email sent when episode status transitions to `ready` (all outputs generated)
- [ ] Email includes: episode title, workspace name, link to outputs page
- [ ] Email sent to the user who uploaded/added the episode (fallback: workspace owner)
- [ ] Failed email sends do not fail the episode processing job (fire-and-forget)
- [ ] Email sending skipped if user has no email address or has opted out

## Blocked by

- #8 (episode must reach `ready` state before there is anything to notify about)

---
*Type: AFK*
