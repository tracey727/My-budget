# Phase 2 — React Accounts Migration Checkpoint

Recorded: 24 August 2026, 1:11 PM AEST (Queensland)

Status: verification in progress; do not advance.

Locked migration order:

React current functionality → migrate accounts → verify → migrate account balance logic.

This checkpoint migrates account records only. It does not migrate transaction-linked balance calculations yet.

Preservation rules:

- `App.jsx` remains the React destination.
- `app.js` remains the donor and must not be deleted.
- `index.html` / `app.js` old runtime remains untouched during this checkpoint.
- `main` must not receive the accounts migration until verification is green.

Accounts included in this checkpoint:

- Bank / transaction
- Savings
- Cash
- Credit card
- Loan / debt
- Investment
- Other

Account data is added to the React data model and included in JSON backup/import compatibility. Existing React records without an `accounts` array are normalized safely to an empty account list.

Next permitted functional step after this checkpoint is green: migrate account balance logic. No later migration step is permitted before that verification.
