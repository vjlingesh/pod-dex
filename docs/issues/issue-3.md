# Issue #3: S3: Pre-sell analytics + kill-criteria tracking

## What to build

Instrument the landing page with enough analytics to evaluate the pre-sell gate. Track visitors and conversions at minimum. Set up a lightweight dashboard or spreadsheet that surfaces the kill criteria: fewer than 10 LTD sales after ~2,000 targeted visitors or 4–6 weeks of outreach means stop and re-evaluate.

## Acceptance criteria

- [ ] Visitor tracking on the landing page (page views, unique visitors, traffic source if possible)
- [ ] Checkout conversion events tracked (CTA click → Stripe Checkout open → purchase complete)
- [ ] Kill-criteria thresholds documented somewhere reviewable: "stop if <10 sales after 2,000 visitors or 6 weeks"
- [ ] Can answer "how many visitors / how many purchases / conversion rate" at any point during pre-sell outreach

## Blocked by

- #1 (needs the landing page to instrument)

---
*Type: AFK*
