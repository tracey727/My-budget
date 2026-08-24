# Phase 2 — Expense Intelligence Checkpoint

Recorded: 24 August 2026, AEST (Queensland)

Status: verification in progress; do not advance.

Locked migration order:

Accounts → account balance logic → transaction model → transfer invariant → expense intelligence → verify → subscriptions.

Included in this checkpoint:

- The underlying expense-intelligence vocabulary is locked to:
  - Essential
  - Worth It
  - Unsure
  - Waste
- The stored machine values remain `essential`, `worth`, `unsure`, and `waste`, preserving the useful donor-model semantics.
- Expense records without an existing intelligence value are treated as `unsure`, preventing historical React expenses from being lost or falsely classified.
- Income records are excluded from expense intelligence.
- Internal transfers are excluded from expense intelligence.
- Monthly totals can be calculated separately for Essential, Worth It, Unsure and Waste.
- A review total is calculated from Unsure + Waste for later conversational review features.
- This checkpoint is the underlying intelligence layer only. The later Yes / No / Maybe conversational user experience is not being introduced early.

Automated verification added:

- The four intelligence labels are locked exactly.
- Legacy/unclassified expenses default to Unsure.
- Income and transfers cannot receive an expense-intelligence classification.
- Classification totals ignore income and transfers.
- Unsure + Waste review totals are calculated correctly.
- Existing transaction-model tests remain active, including the rule that internal transfers do not count as spending.

Preservation rules:

- `App.jsx` remains the React destination.
- `app.js` remains the donor and is untouched.
- No subscription migration occurs in this checkpoint.
- No Yes / No / Maybe conversational layer occurs in this checkpoint.
- No bill, forecasting, Neon or Cloudflare work occurs in this checkpoint.
- Do not merge to `main` until all automated tests and the React production build pass.

Next permitted functional step after this checkpoint is fully green: migrate subscriptions and verify annualisation and review logic.
