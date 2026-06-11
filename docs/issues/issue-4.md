# Issue #4: S4: Walking skeleton — SPA + Hono API + Postgres (Railway) + CI

## What to build

Stand up the end-to-end project skeleton so every subsequent slice has a real deployment target and passing CI to merge into. This is not a feature — it is the delivery infrastructure.

Stack: React + Vite SPA deployed to Cloudflare Pages, Hono API on Railway, Postgres on Railway. CI pipeline (GitHub Actions) runs on every PR: lint, typecheck, test, deploy preview.

The skeleton must be deployable and return a health check end-to-end (browser → API → DB) before this slice is done.

## Acceptance criteria

- [ ] React + Vite SPA deployed to Cloudflare Pages (staging environment)
- [ ] Hono API running on Railway, reachable from the SPA
- [ ] Postgres provisioned on Railway; API connects and runs migrations on deploy
- [ ] `GET /health` returns `{ ok: true, db: true }` (verifies DB connection is live)
- [ ] GitHub Actions CI runs on every PR: lint, typecheck, test, build
- [ ] PR preview deployments working (Cloudflare Pages preview URL per PR)
- [ ] Main branch deploys to staging automatically on merge

## Blocked by

None — can start immediately.

---
*Type: AFK*
