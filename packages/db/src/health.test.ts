import { describe, expect, it } from "vitest";
import type { Database } from "./client.js";
import { checkDbHealth } from "./health.js";

const fakeDb = (execute: () => Promise<unknown>) => ({ execute }) as unknown as Database;

describe("checkDbHealth", () => {
  it("reports true when the query succeeds", async () => {
    await expect(checkDbHealth(fakeDb(async () => [{ "?column?": 1 }]))).resolves.toBe(true);
  });

  it("reports false instead of throwing when the connection is down", async () => {
    const db = fakeDb(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(checkDbHealth(db)).resolves.toBe(false);
  });
});
