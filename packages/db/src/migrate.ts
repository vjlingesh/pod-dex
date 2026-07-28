import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { databaseUrl } from "./client.js";

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../drizzle");

async function main() {
  if (!existsSync(migrationsFolder)) {
    console.log("no migrations yet — nothing to apply");
    return;
  }

  // A dedicated single connection: the migrator must not share the pool.
  const sql = postgres(databaseUrl(), { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    console.log("migrations applied");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
