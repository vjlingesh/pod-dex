import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Listed file by file rather than pointing at the src/schema.ts aggregator:
  // drizzle-kit loads schema modules through CJS and cannot resolve the
  // ESM-style "./x.js" re-exports the aggregator uses. Add each new slice's
  // schema file here.
  schema: ["./src/auth-schema.ts", "./src/app-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://poddex:poddex@localhost:5433/poddex",
  },
});
