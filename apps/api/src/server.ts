import { serve } from "@hono/node-server";
import { loadEnv, numberEnv } from "@pod-dex/env";
import { app } from "./app.js";

loadEnv();

const port = numberEnv("API_PORT", 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
});
