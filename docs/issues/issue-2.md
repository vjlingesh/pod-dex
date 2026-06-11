# Issue #2: S2: LTD checkout — $199 lifetime deal via Stripe

## What to build

Wire Stripe Checkout to the landing page so visitors can purchase the \$199 lifetime deal. At pre-sell stage, fulfillment can be manual (flag the purchase, add buyer to a waitlist or early-access email). The goal is a working payment flow that records revenue and captures the buyer's email.

## Acceptance criteria

- [ ] Stripe Checkout session created on CTA click (one-time payment, \$199)
- [ ] Success and cancel redirect URLs configured
- [ ] Purchase webhook captured (or Stripe dashboard notification) so no sale is missed
- [ ] Buyer email collected and accessible for manual follow-up
- [ ] Test mode end-to-end verified before going live

## Blocked by

- #1 (landing page must be live before checkout can be wired to it)

---
*Type: AFK*
