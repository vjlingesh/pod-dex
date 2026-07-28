import { env } from "@pod-dex/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDb>;

/** Reads DATABASE_URL at call time so tests can patch the environment. */
export function databaseUrl(): string {
  return env("DATABASE_URL");
}

export function createDb(url: string = databaseUrl()) {
  const sql = postgres(url, { max: 10 });
  return drizzle(sql, { schema });
}

let cached: Database | undefined;

/** Process-wide connection, created lazily on first use. */
export function getDb(): Database {
  if (!cached) cached = createDb();
  return cached;
}
