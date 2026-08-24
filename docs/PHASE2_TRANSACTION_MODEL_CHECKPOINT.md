# Phase 2 — Transaction Model Checkpoint

Recorded: 24 August 2026, 1:35 PM AEST (Queensland)

Status: verification in progress; do not advance.

Locked migration order:

Accounts → account balance logic → income / expense / transfer transaction model → verify transfers do not count as spending → expense intelligence.

Included in this checkpoint:

- React transactions now have explicit `expense`, `income`, or `transfer` types.
- Existing React transactions without a type are normalised to `expense` so historical spending is preserved.
- Expense transactions can be categorised and optionally linked to an account.
- Income transactions can be recorded and optionally linked to an account.
- Internal transfers require a source account and destination account and cannot transfer to the same account.
- Transfers update source and destination account balances through the existing account-balance engine.
- Monthly spending totals include `expense` transactions only.
- Transfers are explicitly excluded from category spending and total spending.
- Account deletion is blocked while linked transactions exist, preventing orphaned transaction references.
- The current planned-income field remains separate from recorded income until the later payday/income-engine phase.

Automated verification added:

- Legacy untyped React transactions remain expenses.
- Income and expenses change asset balances correctly.
- Internal account transfer preserves combined asset value.
- Internal transfer contributes zero to monthly spending.
- Transfer payment from bank to credit card reduces the debt balance without counting the payment as new spending.
- Monthly spending includes expenses only.

Preservation rules:

- `App.jsx` remains the React destination.
- `app.js` remains the donor and is untouched.
- No expense-intelligence migration occurs yet.
- No subscription, bill, forecasting, Neon or Cloudflare work occurs in this checkpoint.
- Do not merge to `main` until both `npm test` and the React production build pass in GitHub Actions.

Next permitted functional step after this checkpoint is fully green: migrate expense intelligence, then verify before advancing.
