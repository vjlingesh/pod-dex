import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/** Walks up from this file until it finds the repo root (the dir holding pnpm-workspace.yaml). */
function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}

let loaded = false;

/**
 * Loads the repo-root .env once per process. Existing environment variables win,
 * so Docker/CI/shell overrides are never clobbered.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  config({ path: join(repoRoot(), ".env") });
}

export function env(name: string, fallback?: string): string {
  loadEnv();
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Optional variable — empty string is treated as unset so blank .env lines mean "off". */
export function optionalEnv(name: string): string | undefined {
  loadEnv();
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

export function numberEnv(name: string, fallback: number): number {
  const raw = optionalEnv(name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) throw new Error(`Env var ${name} must be a number, got: ${raw}`);
  return parsed;
}
