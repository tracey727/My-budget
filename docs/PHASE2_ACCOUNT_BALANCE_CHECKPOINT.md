# Phase 2 — Account Balance Logic Checkpoint

Recorded: 24 August 2026, 1:27 PM AEST (Queensland)

Status: verification in progress; do not advance.

Locked migration order:

Accounts migrated → account balance logic → verify → income/expense/transfer transaction model.

This checkpoint migrates account balance mathematics only.

Included:

- Opening balances remain the starting point for every account.
- Bank, savings, cash, investment and other asset accounts are treated as assets.
- Credit cards and loans are treated as liabilities.
- Current balance calculation understands future transaction types `income`, `expense`, and `transfer` when account linkage exists.
- Transfers use source (`accountId`) and destination (`toAccountId`) semantics from the donor logic.
- Asset total, debt total and net financial position are calculated in React.
- Current React transactions are not changed and are not automatically linked to accounts in this checkpoint.

Preservation rules:

- `App.jsx` remains the React destination.
- `app.js` remains the donor and is untouched.
- No transaction-model migration occurs in this checkpoint.
- No subscription, bill, forecasting, Neon or Cloudflare work occurs in this checkpoint.
- Do not merge to `main` until React build verification is green.

Next permitted functional step after this checkpoint is green: migrate the income / expense / transfer transaction model and verify that internal transfers do not count as spending.
