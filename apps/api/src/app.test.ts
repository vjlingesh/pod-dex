import type { Database } from "@pod-dex/db";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { resetDbProvider, setDbProvider } from "./deps.js";

const fakeDb = (execute: () => Promise<unknown>) => () => ({ execute }) as unknown as Database;

afterEach(() => resetDbProvider());

describe("GET /health", () => {
  it("returns ok and db true when the database answers", async () => {
    setDbProvider(fakeDb(async () => []));

    const res = await createApp().request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: true });
  });

  it("returns 503 with db false when the database is unreachable", async () => {
    setDbProvider(
      fakeDb(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const res = await createApp().request("/health");

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: true, db: false });
  });
});
