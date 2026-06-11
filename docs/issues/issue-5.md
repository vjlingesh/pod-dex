# Issue #5: S5: Auth + multitenancy — Better Auth, Google OAuth, orgs, org_id scoping

## What to build

Add authentication and multi-tenant workspace support. Every resource in the system belongs to an org; `org_id` is on every table from the start to avoid a painful retrofit. Users sign in with Google OAuth, create or join an org, and all subsequent API calls are scoped to their active org.

Auth provider: Better Auth (self-hosted), organization plugin for workspaces and roles.

## Acceptance criteria

- [ ] Google OAuth sign-in flow works end-to-end (sign in, callback, session cookie)
- [ ] User can create a new workspace (org) after first sign-in
- [ ] `orgs`, `org_members`, and `users` tables exist with appropriate schema
- [ ] All API routes require a valid session; unauthenticated requests return 401
- [ ] Active org derived from session on every request; `org_id` injected into all DB queries
- [ ] Sign-out clears session
- [ ] Member role stored on `org_members` (admin / member at minimum)

## Blocked by

- #4 (skeleton must exist before auth can be layered on)

---
*Type: AFK*
