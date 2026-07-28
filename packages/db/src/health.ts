import { sql } from "drizzle-orm";
import type { Database } from "./client.js";

/** True when the database answers a trivial query. Never throws. */
export async function checkDbHealth(db: Database): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
