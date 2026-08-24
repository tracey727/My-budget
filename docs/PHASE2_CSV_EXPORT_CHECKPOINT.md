# Phase 2 — CSV / Export Checkpoint

Recorded: 24 August 2026, AEST (Queensland)

Status: verification in progress; do not advance.

Locked migration order:

Accounts → account balance logic → transaction model → transfer invariant → expense intelligence → subscriptions → CSV/export capabilities → verify backup/export behaviour → confirm donor migration completeness.

Included in this checkpoint:

- A React-compatible transaction CSV export engine.
- CSV columns: date, type, amount, category, account, destination account, expense-intelligence value, note.
- Expense, income and internal-transfer meanings are preserved in exported records.
- Transfer destination accounts are represented separately from source accounts.
- Expense-intelligence values apply to expense rows only.
- Optional month-scoped CSV export is supported.
- CSV special characters, including commas and quotes, are escaped safely.
- Monetary amounts export with two decimal places.
- JSON backup serialization is formalised as a pure export function.
- JSON backup parsing validates months, categories, transactions and optional accounts before accepting a backup.
- The existing React JSON backup/import UI is preserved unchanged during this bounded migration to minimise regression risk.

Automated verification added:

- CSV includes expense, income and transfer records without changing their type.
- CSV transfer rows preserve both source and destination accounts.
- CSV month filtering excludes other months.
- CSV escaping handles notes containing commas.
- Monetary values retain two-decimal representation.
- JSON backup round trip preserves the complete application data object.
- Malformed backups are rejected.
- All previous transaction, transfer, expense-intelligence and subscription tests remain active.

Preservation rules:

- `App.jsx` remains the React destination and its existing JSON backup/import behaviour is not replaced in this step.
- `app.js` remains the donor and is untouched.
- No old runtime is removed in this checkpoint.
- No bill, safe-to-spend, payday, forecasting, Neon or Cloudflare work occurs in this checkpoint.
- Do not merge to `main` until all automated tests and the React production build pass.

Next permitted step after this checkpoint is fully green: perform the donor-migration completeness audit, identify any remaining useful donor capability not yet represented in React-compatible modules, and do not retire `app.js` / `index.html` until that audit is clean.
