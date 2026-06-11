# Issue #15: S15: Usage limits — episode caps, 3h duration cap, upgrade prompts

## What to build

Enforce the per-plan usage limits defined in billing. Solo: 8 episodes/mo. Team: 20 episodes/mo. All plans: 3h episode duration cap, 500MB upload cap (upload cap already enforced in S6). When a workspace hits a limit, surface a clear upgrade prompt rather than silently failing.

Limits reset on the billing cycle date.

## Acceptance criteria

- [ ] Episode count tracked per workspace per billing cycle
- [ ] Upload and transcription jobs rejected with a clear error when monthly episode cap is reached
- [ ] Episode duration checked before or immediately after upload; jobs >3h rejected with clear error
- [ ] Upgrade prompt shown in the SPA when any limit is hit (links to billing page)
- [ ] Usage summary visible on the billing/settings page (X of Y episodes used this month)
- [ ] Limits reset automatically at the start of each billing cycle
- [ ] LTD workspaces subject to the same limits as their equivalent plan (solo limits for LTD solo)

## Blocked by

- #7 (episode processing must exist before processing limits can be enforced)
- #14 (plan-based limits require billing to know which plan applies)

---
*Type: AFK*
