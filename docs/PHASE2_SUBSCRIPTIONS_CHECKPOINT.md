# Phase 2 — Subscriptions Checkpoint

Recorded: 24 August 2026, AEST (Queensland)

Status: verification in progress; do not advance.

Locked migration order:

Accounts → account balance logic → transaction model → transfer invariant → expense intelligence → subscriptions → verify annualisation and review logic → CSV/export capability.

Included in this checkpoint:

- Subscription record normalisation for name, amount, frequency, status, value classification, payment account, next-charge date, auto-renewal and notes.
- Supported cycles: weekly, fortnightly, monthly and yearly.
- Annual subscription cost calculation.
- Monthly-equivalent cost calculation.
- Active annual subscription total.
- Unknown subscription review.
- Active Unsure / Waste subscription review.
- Possible annual subscription savings calculation kept explicitly modelled rather than treated as realised savings.
- Cancelled subscriptions are excluded from active cost and possible-savings totals.
- Missing or incomplete subscription records default safely to monthly / unknown / unsure.

Review logic:

- Unknown status → needs checking.
- Active + Unsure → review value.
- Active + Waste → review value / possible saving.
- Active + Essential or Worth It → no automatic review flag.
- Cancelled → retained historically but excluded from active annual cost and modelled possible savings.

Automated verification added:

- Weekly annualisation uses ×52.
- Fortnightly annualisation uses ×26.
- Monthly annualisation uses ×12.
- Yearly annualisation uses ×1.
- Monthly equivalent derives from annual cost.
- Unknown and cancelled records are excluded from active annual cost.
- Unknown, active Unsure and active Waste records are surfaced for review.
- Modelled possible annual savings exclude cancelled and unknown subscriptions.
- Donor subscription fields are normalised safely.
- Existing transaction and expense-intelligence tests remain active.

Preservation rules:

- `App.jsx` remains the React destination.
- `app.js` remains the donor and is untouched.
- This step migrates the subscription engine/data contract only; later explicit user decisions such as Give it another month, Pause if possible and Review after next charge remain later work according to the locked product sequence.
- No automatic cancellation or external financial action is introduced.
- No bill, forecasting, Neon or Cloudflare work occurs in this checkpoint.
- Do not merge to `main` until all automated tests and the React production build pass.

Next permitted functional step after this checkpoint is fully green: migrate CSV/export capabilities and verify backup/export behaviour.
