import { checkDbHealth } from "@pod-dex/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getAuth, isGoogleEnabled } from "./auth.js";
import { db } from "./deps.js";
import { NoActiveOrgError, type Variables, requireSession } from "./middleware/session.js";

export function createApp() {
  const app = new Hono<{ Variables: Variables }>();

  app.use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
    }),
  );

  app.get("/health", async (c) => {
    const dbOk = await checkDbHealth(db());
    return c.json({ ok: true, db: dbOk }, dbOk ? 200 : 503);
  });

  // Lets the SPA hide sign-in options the deployment has no credentials for.
  app.get("/config", (c) => c.json({ googleEnabled: isGoogleEnabled() }));

  // Better Auth owns everything under /auth: sign-in, callbacks, sign-out,
  // and the organization plugin's workspace endpoints.
  app.on(["GET", "POST"], "/auth/*", (c) => getAuth().handler(c.req.raw));

  app.get("/me", requireSession, (c) => c.json({ user: c.get("user"), orgId: c.get("orgId") }));

  app.onError((err, c) => {
    if (err instanceof NoActiveOrgError) return c.json({ error: err.message }, 409);
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  return app;
}

export const app = createApp();
