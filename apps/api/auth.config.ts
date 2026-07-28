// Entry point for the Better Auth CLI only (`pnpm auth:generate`).
// The CLI requires an eagerly-exported `auth` instance; the application itself
// builds it lazily via getAuth(). postgres.js connects on first query, so
// constructing it here does not open a connection.
import { getAuth } from "./src/auth.js";

export const auth = getAuth();
