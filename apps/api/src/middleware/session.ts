import type { Context, MiddlewareHandler } from "hono";
import { getAuth } from "../auth.js";

export type AuthedUser = { id: string; email: string; name: string };

export type ResolvedSession = {
  user: AuthedUser;
  /** Active organization for this request. Null until the user creates or joins one. */
  orgId: string | null;
};

export type Variables = {
  user: AuthedUser;
  orgId: string | null;
};

type SessionResolver = (headers: Headers) => Promise<ResolvedSession | null>;

const defaultResolver: SessionResolver = async (headers) => {
  const result = await getAuth().api.getSession({ headers });
  if (!result?.user) return null;

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
    orgId:
      (result.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null,
  };
};

// Module-level indirection so tests can supply a session without a real cookie,
// a real Better Auth instance or a database. Read at call time.
let resolver: SessionResolver = defaultResolver;

export function setSessionResolver(next: SessionResolver): void {
  resolver = next;
}

export function resetSessionResolver(): void {
  resolver = defaultResolver;
}

/** Rejects unauthenticated requests with 401 and puts the caller on the context. */
export const requireSession: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const session = await resolver(c.req.raw.headers);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  c.set("user", session.user);
  c.set("orgId", session.orgId);
  await next();
};

/**
 * Active org for the request. Routes that own tenant data call this instead of
 * reading the context directly, so a missing org can never silently widen a
 * query to every tenant.
 */
export function requireOrg(c: Context<{ Variables: Variables }>): string {
  const orgId = c.get("orgId");
  if (!orgId) throw new NoActiveOrgError();
  return orgId;
}

export class NoActiveOrgError extends Error {
  constructor() {
    super("no active organization — create or select a workspace first");
  }
}
