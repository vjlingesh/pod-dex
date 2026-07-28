# pod-dex — Agent Notes

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

## Local development
- `make up` — infra + migrations + all dev servers. `make down` stops everything. `make help` lists targets.
- Backing services run on Apple's `container` runtime (`scripts/infra.sh`), **not** Docker. There is no
  compose equivalent, so that script is the orchestrator. All images are stock upstream — no Dockerfiles.
- Ports: api 8787, web 5173, landing 4321, postgres 5433, redis 6380, minio 9000/9001, mailpit 1025/8025.
  Postgres and Redis are offset from their defaults so they never collide with a locally-installed server.
- apple/container named volumes arrive pre-formatted with a `lost+found`, which makes `initdb` refuse to
  run. Postgres therefore sets `PGDATA` to a subdirectory of the mount.
- Cloud services have local stand-ins: R2 → MinIO, Resend/Postmark → Mailpit. Deepgram, the LLM provider
  and Stripe fall back to deterministic fakes when their API key env vars are blank, so the whole pipeline
  runs offline. Set a key to exercise the real vendor.
- Repo-root `.env` is the single source of config; `@pod-dex/env` loads it from any workspace package.

## Architecture rules
- Every tenant-owned table carries `org_id`. Every query is org-scoped. No exceptions.
- API never proxies audio bytes — client uploads direct to R2 via presigned URL.
- Workers communicate via BullMQ queues; job payloads carry IDs, not blobs.
- Transcripts kept indefinitely; audio deleted after 30 days (R2 lifecycle rule).

## Auth notes
- Better Auth owns `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`.
  Regenerate with `pnpm --filter @pod-dex/api auth:generate` — never hand-edit `packages/db/src/auth-schema.ts`.
- `baseURL` is the API's own origin (8787), not the proxied `/api` path: Vite strips the prefix before
  Hono sees the request. Cookies still reach the SPA on 5173 because cookies ignore port.
- Active org lives on `session.activeOrganizationId`. A `databaseHooks.session.create.before` hook pins
  it to the user's oldest membership at sign-in; `organization.setActive` changes it.
- Routes read the org via `requireOrg(c)`, which throws rather than returning null — a missing org must
  never silently widen a query across tenants.
- Email/password sign-in is always enabled so local dev needs no Google credentials. Google appears only
  when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set; the SPA reads `GET /config` to know.
- `drizzle.config.ts` lists schema files explicitly — drizzle-kit loads them through CJS and cannot
  resolve the aggregator's `./x.js` re-exports. Add each new slice's schema file to that list.

## Patterns
- TDD: one test → one implementation (vertical slices). Tests hit public interfaces (Hono `app.request()`, exported functions). No testing private internals.
- Hono apps export the app object; tests call `app.request()` directly — no listening server in tests.
- External services (Stripe, Deepgram, R2, LLM) wrapped in thin client modules so tests can substitute fakes at the module boundary. Functions read module-level config at call time (not closure capture) so tests can patch.

## Active decisions
- Product name "pod-dex" is a placeholder pending final name/domain (issue #1 HITL).
- Issues closed when code-complete; remaining manual infra steps listed in the closing comment.
- Pricing: $199 LTD pre-sell; $49/$99 subscriptions later (issue #14).
