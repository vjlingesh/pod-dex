# pod-dex

Podcast repurposing SaaS for B2B interview podcast teams. Upload an episode (or connect an RSS feed), get show notes, LinkedIn posts, newsletter blurbs, blog posts, highlights, and quote cards — written in your voice.

## Structure

| Path | What |
|---|---|
| `apps/landing` | Pre-sell landing page (Cloudflare Pages) |
| `apps/web` | React + Vite SPA (Cloudflare Pages) |
| `apps/api` | Hono API (Railway) |
| `apps/worker` | BullMQ worker — transcription + generation (Railway) |
| `packages/db` | Drizzle ORM schema + migrations (Postgres on Railway) |

## Development

```sh
pnpm install
pnpm test        # all workspace tests (vitest)
pnpm lint        # biome
pnpm typecheck
pnpm build
```

Node >= 22, pnpm 10.
