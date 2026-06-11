# Issue #17: S17: Team members — invites, roles, seat limits

## What to build

Let workspace admins invite team members by email. Invited users accept via a link, sign in, and join the workspace. Roles: admin (can invite/remove, manage billing) and member (can upload and view). Team plan workspaces have no explicit seat cap at MVP; solo plan workspaces are limited to 1 seat (the owner).

Better Auth's organization plugin handles the underlying invite and membership mechanics.

## Acceptance criteria

- [ ] Admin can invite a user by email from the workspace settings page
- [ ] Invite email sent with an accept link
- [ ] Invited user clicks link → signs in (or creates account) → joins workspace
- [ ] Role assigned on invite (admin or member); admin can change roles after the fact
- [ ] Admin can remove a member from the workspace
- [ ] Solo plan workspaces blocked from inviting additional members (1-seat cap enforced)
- [ ] Workspace member list visible in settings with role badges

## Blocked by

- #14 (seat limits depend on the workspace plan; billing must be in place to enforce them)

---
*Type: AFK*
