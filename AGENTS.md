# pod-dex — Claude Notes

## Stack
- pnpm workspaces monorepo, Node >= 22, TypeScript strict (extend `tsconfig.base.json`)
- `apps/landing` — static landing page, Cloudflare Pages
- `apps/web` — React + Vite SPA, Cloudflare Pages
- `apps/api` — Hono API, Railway
- `apps/worker` — BullMQ (Redis) worker: Deepgram transcription, LLM generation, Railway
- `packages/db` — Drizzle ORM, Postgres (Railway)
- Auth: Better Auth + Google OAuth + organization plugin
- Storage: Cloudflare R2 (presigned PUT, org-prefixed keys, 30-day audio lifecycle)
- Tests: Vitest. DB integration tests use PGlite (in-memory Postgres) with the real Drizzle schema.
- Lint/format: Biome (root `biome.json`). Run `pnpm lint` before commit.

## Architecture rules
- Every tenant-owned table carries `org_id`. Every query is org-scoped. No exceptions.
- API never proxies audio bytes — client uploads direct to R2 via presigned URL.
- Workers communicate via BullMQ queues; job payloads carry IDs, not blobs.
- Transcripts kept indefinitely; audio deleted after 30 days (R2 lifecycle rule).

## Patterns
- TDD: one test → one implementation (vertical slices). Tests hit public interfaces (Hono `app.request()`, exported functions). No testing private internals.
- Hono apps export the app object; tests call `app.request()` directly — no listening server in tests.
- External services (Stripe, Deepgram, R2, LLM) wrapped in thin client modules so tests can substitute fakes at the module boundary. Functions read module-level config at call time (not closure capture) so tests can patch.

## Active decisions
- Product name "pod-dex" is a placeholder pending final name/domain (issue #1 HITL).
- Issues closed when code-complete; remaining manual infra steps listed in the closing comment.
- Pricing: $199 LTD pre-sell; $49/$99 subscriptions later (issue #14).
