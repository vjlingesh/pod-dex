import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Same-origin base path — Vite proxies /api to the Hono server, so the session
 * cookie stays first-party and no CORS preflight is involved in development.
 */
export const authClient = createAuthClient({
  baseURL: `${window.location.origin}/api`,
  basePath: "/auth",
  plugins: [organizationClient()],
});

export const { useSession, signIn, signOut, organization } = authClient;
