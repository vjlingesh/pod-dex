# Issue #14: S14: Billing — $49/$99 subscriptions, customer portal, LTD redemption

## What to build

Wire Stripe subscriptions to workspace accounts. Two plans: solo (\$49/mo, 8 episodes/mo) and team (\$99/mo, 20 episodes/mo). LTD buyers (from pre-sell S2) redeem a code that grants the equivalent of the solo plan indefinitely. Self-serve customer portal for plan changes and cancellation.

Billing is scoped to the workspace (org), not the individual user.

## Acceptance criteria

- [ ] Stripe products and prices configured for both plans
- [ ] Checkout flow: workspace owner can subscribe from the billing page
- [ ] Webhook handler processes `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Workspace plan stored in DB and kept in sync with Stripe subscription status
- [ ] Customer portal link available for active subscribers (plan changes, cancellation)
- [ ] LTD redemption flow: pre-sell buyer enters a code → workspace gets solo-equivalent plan with no recurring charge
- [ ] Expired / cancelled subscriptions downgrade the workspace gracefully (not a hard block, but usage limits enforced per S15)

## Blocked by

- #5 (requires auth + org structure to attach billing to a workspace)

---
*Type: AFK*
