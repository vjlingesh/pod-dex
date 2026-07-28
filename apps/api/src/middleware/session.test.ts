import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import {
  NoActiveOrgError,
  type Variables,
  requireOrg,
  requireSession,
  resetSessionResolver,
  setSessionResolver,
} from "./session.js";

const user = { id: "user_1", email: "host@example.com", name: "Host" };

function appWithOrgScopedRoute() {
  const app = new Hono<{ Variables: Variables }>();
  app.get("/scoped", requireSession, (c) => c.json({ orgId: requireOrg(c) }));
  app.onError((err, c) =>
    err instanceof NoActiveOrgError ? c.json({ error: err.message }, 409) : c.json({}, 500),
  );
  return app;
}

afterEach(() => resetSessionResolver());

describe("requireSession", () => {
  it("rejects unauthenticated requests with 401", async () => {
    setSessionResolver(async () => null);

    const res = await appWithOrgScopedRoute().request("/scoped");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("passes the active org through to the route", async () => {
    setSessionResolver(async () => ({ user, orgId: "org_1" }));

    const res = await appWithOrgScopedRoute().request("/scoped");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orgId: "org_1" });
  });
});

describe("requireOrg", () => {
  it("refuses to run an org-scoped route when the session has no active org", async () => {
    setSessionResolver(async () => ({ user, orgId: null }));

    const res = await appWithOrgScopedRoute().request("/scoped");

    // 409 rather than 500: the caller is authenticated but has no workspace yet.
    expect(res.status).toBe(409);
  });
});
