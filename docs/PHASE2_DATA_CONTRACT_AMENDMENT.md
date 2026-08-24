# Phase 2 — Data Contract Amendment Archive

Archived: 24 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Amendment branch: `phase2-data-contract-amendment`
Pull request: `#18`
Base before amendment: `main` at `57e97fe9d95b3469b799c5074d798bd06568f048`
Original Phase 2 archive: `docs/PHASE2_COMPLETION_ARCHIVE.md` — preserved unchanged as historical evidence
Final pre-archive implementation commit: `e029cadb02c18a4037f6e28dd985f1cbce85df8b`
Final pre-archive Phase 2 verification: `Phase 2 baseline verification` run `#85` — GREEN
Existing Phase 3 compatibility verification on the same implementation: run `#21` — GREEN, but Phase 3 is not re-sealed by this archive

## Why Phase 2 was reopened

After the original Phase 2 completion, the user supplied explicit data/runtime requirements that logically belong before deployment infrastructure:

- Accounts must support Bank, Savings, Cash, Credit card, Loan, BNPL, Investment and Other.
- Transactions must store transaction ID, account ID, date, amount, merchant/payee, income/expense/transfer type, category, Essential/Worth It/Unsure/Waste classification, Yes/No/Maybe response, recurring status, notes and an optional Professional project link.
- Bills must store bill name, amount, frequency, next due date, account, essential status, budgeting method, amount already reserved, required contribution, target amount, Green/Yellow/Red/Recovery alert status and paid/unpaid status.

Because these are application/data-contract responsibilities rather than Cloudflare responsibilities, Phase 2 was amended before Phase 3 could be considered final. No Neon, database provisioning, authentication, Stripe or later-phase implementation was started.

## Chronological implementation and linkage

### 1. Account model amendment

Before: `transaction-model.mjs` treated only credit cards and loans as liabilities.

After: BNPL is also a liability. Existing Bank, Savings, Cash, Credit card, Loan, Investment and Other support remains preserved; the browser runtime adds BNPL to the account selector and debt presentation.

Link chain: account selector/runtime → account state → transaction balance model → account/net-position rendering.

Verification: BNPL repayment and BNPL spending tests were added before the next bounded change.

### 2. Transaction data contract

Before: the runtime stored the existing transaction fields but did not explicitly preserve Yes/No/Maybe, recurring status or an optional Professional project link.

After: `normalizeTransactionRecord()` defines the expanded transaction contract and legacy-safe defaults. The browser extension adds and preserves the three newly required fields without replacing the existing `app.js` transaction engine.

Link chain: transaction dialog → `phase2-data-runtime.js` → existing `app.js` save → local-storage interception/preservation → backup/CSV output.

### 3. Bills data contract

Before: there was no dedicated Bills data model.

After: `bill-model.mjs` defines normalized Bills records, permitted frequencies, essential status, Smooth/Target budgeting method, reserved/required/target amounts, Green/Yellow/Red/Recovery alert state and paid/unpaid state. Funding-gap helpers are tested.

Link chain: Bills UI → normalized Bills state → linked account → storage → backup/restore → bill summaries.

### 4. Browser runtime preservation layer

`phase2-data-runtime.js` was added as an extension rather than rewriting the donor runtime.

Production execution order is:

`index.html` → `/phase2-data-runtime.js` → `/app.js`

The extension:

- preserves the original storage key and existing accounts/transactions/subscriptions;
- migrates legacy records safely;
- adds BNPL UI/debt handling;
- adds transaction Yes/No/Maybe, recurring status and optional project-link controls;
- adds Bills navigation, view, add/edit/delete dialog and required fields;
- preserves Bills and new transaction fields when existing `app.js` writes state;
- extends backup/restore and transaction CSV export;
- prevents deletion of an account still referenced by a bill;
- leaves existing `app.js` source intact.

### 5. Production and offline linkage

`scripts/copy-subscriber-assets.mjs` copies `/phase2-data-runtime.js` into `dist`.

`service-worker.js` caches `/phase2-data-runtime.js` alongside the existing subscriber assets.

`scripts/verify-dist.mjs` now fails if the extension is missing from `dist`, missing from the service-worker chain, or loaded after `app.js`.

### 6. Regression and gate coverage

Phase 2 tests now cover:

- BNPL as a liability;
- complete transaction storage fields and legacy defaults;
- complete Bills storage fields and funding gap;
- runtime-before-`app.js` ordering;
- account/transaction/Bills runtime contract presence;
- backup/restore/CSV/offline linkage;
- dynamic HTML quote/apostrophe escaping;
- production artifact linkage.

The full Phase 2 gate remains: source syntax → Phase 2 tests → subscriber production build → production-artifact verification → React preservation build → dependency audit.

## Audit result before archive

Implementation commit `e029cadb02c18a4037f6e28dd985f1cbce85df8b` passed:

- Phase 2 baseline verification run `#85` — SUCCESS.
- Phase 3 compatibility verification run `#21` — SUCCESS.

The Phase 3 result proves the existing Cloudflare tooling still compiles against the amended branch; it does not replace the required chronological Phase 3 re-audit, re-link and live production verification after this amendment is merged to `main`.

## Advancement gate

This archive records the Phase 2 data-contract amendment. The amendment is not considered merged-main complete until:

1. this archive commit passes the Phase 2 gate;
2. PR #18 is merged;
3. the merged `main` state passes the Phase 2 gate again.

Only then may Phase 3 be re-audited and re-sealed against the amended Phase 2 baseline.

Phase 4 Neon remains prohibited until Phase 3 is live, runtime-verified, GREEN and archived.