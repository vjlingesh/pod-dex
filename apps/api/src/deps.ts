import { type Database, getDb } from "@pod-dex/db";

// Module-level indirection so tests can substitute a fake database at the boundary
// without a real Postgres connection. Read at call time, never captured in a closure.
let dbProvider: () => Database = getDb;

export function db(): Database {
  return dbProvider();
}

export function setDbProvider(provider: () => Database): void {
  dbProvider = provider;
}

export function resetDbProvider(): void {
  dbProvider = getDb;
}
