import { getDb, schema } from "@pod-dex/db";
import { env, optionalEnv } from "@pod-dex/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";

/**
 * The origin the API itself is served on. The SPA reaches it through a Vite
 * proxy at /api, which strips that prefix before Hono sees the request — so
 * baseURL must describe the Node server, not the proxied path. Session cookies
 * still reach the SPA because cookies ignore port: localhost:8787 and
 * localhost:5173 share a cookie jar.
 */
function baseUrl(): string {
  return env("API_URL", "http://localhost:8787");
}

export function isGoogleEnabled(): boolean {
  return Boolean(optionalEnv("GOOGLE_CLIENT_ID") && optionalEnv("GOOGLE_CLIENT_SECRET"));
}

function googleProvider() {
  if (!isGoogleEnabled()) return {};
  return {
    google: {
      clientId: env("GOOGLE_CLIENT_ID"),
      clientSecret: env("GOOGLE_CLIENT_SECRET"),
    },
  };
}

/** Oldest workspace the user belongs to, or null if they have none yet. */
async function firstOrgId(userId: string): Promise<string | null> {
  const rows = await getDb()
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .orderBy(schema.member.createdAt)
    .limit(1);

  return rows[0]?.organizationId ?? null;
}

function buildAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    baseURL: baseUrl(),
    basePath: "/auth",
    secret: env("BETTER_AUTH_SECRET"),
    trustedOrigins: [
      env("APP_URL", "http://localhost:5173"),
      `http://localhost:${env("LANDING_PORT", "4321")}`,
    ],
    // Local-first: password sign-in always works, so the prototype needs no
    // Google credentials. Google is added only when its keys are present.
    emailAndPassword: { enabled: true },
    socialProviders: googleProvider(),
    plugins: [organization()],
    databaseHooks: {
      session: {
        create: {
          // Pin the session to a workspace at sign-in, so org-scoped routes have
          // an active org without the client having to select one first.
          before: async (session) => ({
            data: { ...session, activeOrganizationId: await firstOrgId(session.userId) },
          }),
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof buildAuth>;

let instance: Auth | undefined;

/** Built lazily: constructing it eagerly would open a DB connection at import time. */
export function getAuth(): Auth {
  if (!instance) instance = buildAuth();
  return instance;
}
