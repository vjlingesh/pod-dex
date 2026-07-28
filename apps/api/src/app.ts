import { checkDbHealth } from "@pod-dex/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./deps.js";

export function createApp() {
  const app = new Hono();

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

  return app;
}

export const app = createApp();
