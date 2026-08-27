# GENEVIEVE Budget — Phase 7 Reconciliation Audit and Continuation Checkpoint

Date: 27 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Protected base branch: `main`
Authoritative `main` at audit: `156a36e9ba1b6a2452012c6915341f0184baa284`
Phase 7 branch: `phase7-first-time-setup`
Phase 7 PR: #36 (draft)
Reconciled Phase 7 head before this checkpoint commit: `35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`
Protect-main ruleset: `21530843`
Production migration boundary: `014`
Protected `app.js` Git blob: `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`

## Status

**PHASE 7 IS RECONCILED WITH CURRENT PROTECTED MAIN BUT IS NOT YET SCOPE-COMPLETE, NOT READY FOR MERGE, NOT ARCHIVED.**

Do not merge PR #36 and do not start Phase 8.

The earlier Phase 7 branch was created from the Phase 6 archive boundary `06ec1c00...`. After the Phase 6 build archive chronology correction merged as PR #38, authoritative `main` moved to `156a36e9...`.

The Phase 7 branch was reconciled without rewriting history by creating a normal two-parent merge commit:

`35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`

Parents:

1. previous Phase 7 head `720cd88c8c0a9e4a8ade52aaeb7ba9dd7f28b51b`;
2. authoritative protected `main` `156a36e9ba1b6a2452012c6915341f0184baa284`.

No force push or destructive history rewrite was used.

Immediately after reconciliation, the branch compared as:

- 27 commits ahead of current `main`;
- 0 commits behind current `main`;
- 10 changed files;
- +1951 / -1;
- no protected `app.js` change;
- no database migration change;
- no sealed Phase 2 source modification;
- no Worker change at that point.

This checkpoint commit adds documentation only and therefore changes the exact Phase 7 head. All pre-merge verification must use the new exact head after this file is committed, never an older SHA.

## Authoritative Phase 7 scope

The current `docs/BUILD_ARCHIVE.md` on protected `main` defines Phase 7 as:

**Phase 7 — Core accounts and balances**

Required responsibilities:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers must not be counted as spending;
4. spendable vs protected/reserved balances.

The existing Phase 7 First-Time Setup is valid Phase 7 entry work, but it is only one component of the Phase 7 scope. It must not be treated as the whole phase.

## Complete audit of the current Phase 7 diff

### 1. `.github/workflows/phase7-first-time-setup.yml`

What is good:

- adds a dedicated `phase7` job;
- runs `npm ci`;
- nests `verify:phase7` after the existing Phase 2→6 chain;
- checks all eight onboarding screens;
- checks Smooth and target logic;
- checks due-date plan integrity;
- checks Phase 7 backup continuity;
- verifies no migration `015` exists in the current draft;
- verifies Worker remains Phase 6 / migration `014`;
- verifies protected `app.js` hash;
- verifies Cloudflare branch preview serves all three Phase 7 subscriber runtimes;
- verifies `/ready` still returns database ready at migration `014`.

Audit finding:

- the workflow verifies the First-Time Setup implementation but does not yet prove the full authoritative Phase 7 account/balance scope;
- it does not yet require an authenticated Neon-backed account/transaction persistence gate;
- it does not yet explicitly prove Phase 7 spendable vs protected/reserved balance calculations;
- it should explicitly preserve/verify internal-transfer exclusion from spending as a Phase 7 requirement even though the sealed Phase 2 engine already implements it.

### 2. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`

What is good:

- records the eight-screen setup design;
- records the runtime chain;
- records due-date-aware bill smoothing;
- records backup continuity;
- records the protected `app.js` hash;
- records no migration `015` for the existing draft;
- records exact earlier green evidence.

Audit finding:

- its authoritative base/head wording is now historical after reconciliation;
- it describes Phase 7 primarily as First-Time Setup, which no longer matches the authoritative `BUILD_ARCHIVE.md` scope;
- this new reconciliation audit supersedes it for current Phase 7 continuation status.

### 3. `package.json`

What is good:

- adds `test:phase7`;
- changes production build so the Phase 7 linker runs after the existing subscriber asset copy;
- adds `verify:phase7` nested after `verify:phase6`.

Audit finding:

- Phase 2→6 verification remains nested rather than bypassed;
- no dependency versions changed;
- package-lock does not require a dependency update because only scripts changed;
- the gate must be extended when the missing persistence/balance work is added.

### 4. `phase7-first-time-setup-model.mjs`

What is good:

- exact pay frequencies: weekly, fortnightly, monthly, irregular;
- exact account types include bank, savings, cash, credit, loan, BNPL, investment and other through the runtime;
- bill smoothing supports due-date-aware funding when dates are supplied;
- irregular pay deliberately returns no fabricated fixed contribution;
- target mode retains the full target;
- emergency cash is kept distinct in the first-money-plan object;
- established users can be detected from meaningful financial data.

Audit finding:

- this is a planning/onboarding model, not a server persistence model;
- it cannot by itself satisfy the word `persistent` in the authoritative Phase 7 production architecture;
- it does not compute the required spendable/unreserved vs protected/reserved account balance view.

### 5. `phase7-first-time-setup.js`

What is good:

- eight screens are implemented in exact sequence;
- incomplete setup is isolated in `genevieve-first-time-setup-v1`;
- financial records are not written to the established money store until Screen 8;
- multiple account setup is supported;
- credit, loan and BNPL accounts are supported and described as positive amounts owed;
- bills support account linkage, due dates and frequency;
- Smooth and target modes are available;
- emergency cash and optional savings goals are included;
- established local users are not forced through onboarding;
- completed setup reuses the existing Phase 2 local money store rather than creating a parallel local model;
- unknown money-store fields are preserved on the Screen 8 write by spreading the current state.

Audit finding:

- completed accounts/bills/savings are written only to browser localStorage;
- there is no authenticated Worker call here to persist user-owned records into Neon;
- therefore the current runtime does not yet satisfy production persistence through the locked Cloudflare → Hyperdrive → Neon architecture;
- the base setup runtime contains annualised Smooth calculations and relies on the later plan-integrity bridge to correct dated calculations before/after commit; that design is currently intentional but must continue to be tested as one linked runtime chain.

### 6. `phase7-plan-integrity-bridge.js`

What is good:

- prevents past next-pay dates;
- rolls stale weekly/fortnightly/monthly pay dates forward;
- counts actual pays available before a known bill due date;
- deducts amounts already reserved before calculating the required contribution;
- retains annualised fallback when no bill due date is known;
- keeps irregular pay from fabricating a fixed contribution;
- refreshes target Green / Yellow / Red / Recovery status;
- corrects the Screen 8 plan presentation;
- refreshes committed plan values after the setup runtime commits.

Audit finding:

- the bridge still operates only on local browser state;
- it should not be expanded into later Phase 11/12/13 feature scope beyond what is required to preserve the already-approved onboarding behaviour;
- full Safe-to-Spend remains a later phase and must not be pulled forward accidentally.

### 7. `phase7-backup-bridge.js`

What is good:

- preserves Phase 7 setup metadata in new local backup files;
- remains compatible with legacy backups without a Phase 7 marker;
- sanitises pay frequency, bill mode, dates and emergency cash;
- reuses the existing money-store shape;
- takes final ownership of the local backup controls without modifying sealed Phase 2 source.

Audit finding:

- this is local backup continuity, not Neon persistence;
- later Phase 7 API work must not remove or break this offline/local continuity;
- any new Phase 7 server-backed records must be reconciled carefully with backup/export rules so later Phase 26 remains the full reporting/export phase.

### 8. `phase7-first-time-setup.test.mjs`

What is good:

- verifies exact pay-frequency contract;
- verifies annualised and due-date-aware smoothing;
- verifies reserved amounts reduce first-due funding requirement;
- verifies irregular pay behaviour;
- verifies target mode;
- verifies emergency cash is not treated as the regular bill contribution;
- verifies established-user detection;
- verifies exact eight-screen wording/order;
- verifies storage-key separation;
- verifies target warning logic;
- verifies plan-integrity bridge hooks;
- verifies setup-aware backup compatibility;
- verifies linker includes all three Phase 7 runtimes.

Audit finding:

- tests are substantially string/contract based for the browser bridges;
- current tests do not exercise authenticated Worker account/transaction CRUD because those endpoints do not yet exist;
- current tests do not prove Neon-backed persistence;
- current tests do not yet prove the authoritative Phase 7 spendable vs protected/reserved balance boundary;
- internal transfer exclusion is already proven by sealed Phase 2 transaction tests but must be reasserted in the Phase 7 gate because it is now explicitly within Phase 7 scope.

### 9. `scripts/link-phase7-first-time-setup.mjs`

What is good:

- copies all three Phase 7 runtimes into `dist`;
- refuses to double-link them;
- inserts them after Phase 2 subscriber runtimes and immediately before protected `app.js`;
- adds all three to the service-worker cache;
- reseals the cache name while recording the Phase 3 predecessor.

Audit finding:

- ordering is correct for the existing Phase 7 runtimes;
- any new Phase 7 persistence/balance runtime must be inserted deliberately without changing `app.js` and must be added to the verifier/cache in a controlled order.

### 10. `scripts/verify-phase7-dist.mjs`

What is good:

- proves all three Phase 7 runtime files exist in `dist`;
- proves exact Phase 2 → Phase 7 → protected `app.js` order;
- proves Phase 7 contract fragments;
- proves service-worker cache linkage;
- independently computes and verifies the protected `app.js` Git blob hash.

Audit finding:

- must be extended after the persistence/balance runtime is added;
- must continue to treat protected `app.js` as immutable.

## Earlier-phase preservation audit

The reconciled Phase 7 diff confirms:

- `app.js` is not changed;
- no Phase 2 source runtime is changed;
- no Phase 3 Cloudflare configuration is changed by the current draft;
- no Phase 4/5/6 migration is changed;
- no migration `015` exists in the current draft;
- no Worker change exists in the current draft yet;
- only `package.json` plus Phase 7 files/docs/workflow are changed.

This structural diff audit is necessary but not sufficient. The complete Phase 2→7 CI gate must be rerun on the final exact Phase 7 head after all Phase 7 scope work is complete.

## Existing sealed capabilities Phase 7 may reuse

### Internal transfers

The sealed Phase 2 transaction model already recognises exactly three transaction types: income, expense and transfer.

Transfer records contain both `accountId` and `toAccountId`.

Account balances correctly subtract from the source and add to the destination.

Monthly expense totals filter strictly to transaction type `expense`, so internal transfers are not counted as spending.

The protected `app.js` transaction form also requires a different destination account for a transfer and the dashboard spent figure filters strictly to expenses.

**Direction:** do not rewrite this engine. Reuse it and add Phase 7 verification that the preserved behaviour remains intact.

### Existing Neon schema

No new account/transaction schema needs to be invented to finish Phase 7.

Existing sealed tables already include:

- `accounts` with user ownership, account type, currency and opening balance;
- account types bank, savings, cash, credit, loan, BNPL, investment and other;
- `transactions` with source account, optional destination account, income/expense/transfer type and ownership-preserving transfer constraints;
- `bills`;
- `bill_provisions.amount_reserved`;
- `bill_provisions.required_contribution`;
- `savings_goals.current_amount`;
- `savings_goals.protected`;
- `debts` including credit card, loan and BNPL;
- `financial_settings.emergency_buffer_amount` from the sealed user foundation.

Phase 5 already applies:

- user ownership;
- ownership-preserving foreign keys;
- RLS;
- cross-user isolation;
- soft archive;
- append-only audit;
- no physical DELETE authority for the Worker role.

**Direction:** reuse these tables. Do not duplicate account, transaction, debt, bill reserve or savings-protection tables.

## Material blockers found by this audit

### BLOCKER 1 — Phase 7 scope mismatch

The draft is titled and documented as First-Time Setup, but authoritative Phase 7 is Core accounts and balances.

**Required correction:** keep First-Time Setup as the Phase 7 entry component, then complete the remaining account/balance responsibilities on the same Phase 7 branch before any merge.

### BLOCKER 2 — production persistence is missing

The locked production architecture is GitHub → Cloudflare → Hyperdrive → Neon, with Phase 6 authenticated user scope.

Current Phase 7 financial writes are localStorage only.

The Phase 6 Worker currently has identity/session/export/account-deletion/Professional endpoints but no user-owned account or transaction persistence routes.

**Required correction:** add Phase 7 authenticated Worker account/transaction persistence using the existing RLS-protected tables and existing `withAuthenticatedUserTransaction` boundary.

### BLOCKER 3 — no subscriber identity/persistence bridge yet

Repository search confirms `/api/identity` is currently implemented/tested server-side but there is no existing subscriber runtime using it.

**Required correction:** Phase 7 must add the smallest client-side authenticated persistence connector necessary to sync Phase 7 account/balance records. Do not build unrelated identity UI if it belongs outside this bounded step.

### BLOCKER 4 — spendable vs protected/reserved balance boundary is incomplete

Current Phase 7 stores emergency cash and can carry bill reserves/savings records, but does not expose a verified balance boundary showing ordinary account position separately from protected/reserved amounts.

**Required correction:** implement a Phase 7 balance summary using existing sealed fields. Keep this bounded to balance classification, not the later full Phase 13 Safe-to-Spend engine.

The Phase 7 balance language should distinguish, at minimum:

- account/ledger position;
- liabilities/debts;
- protected emergency amount;
- bill amounts actually reserved;
- protected savings current amounts;
- unreserved/spendable balance after those protected/reserved amounts.

Do not call this `Actually Safe to Spend` and do not pull future obligations/forecasting logic forward from Phases 10–14.

### BLOCKER 5 — exact-head CI has not been rerun after reconciliation

The old `720cd...` green evidence is historical only.

The reconciliation merge changed the exact branch head to `35bbda...`, and this checkpoint commit changes it again.

**Required correction:** after all Phase 7 scope work and documentation updates are complete, obtain the new exact head and run all six checks on that exact SHA:

- `phase2`;
- `cloudflare-phase3`;
- `phase4-neon`;
- `phase5-database-safety`;
- `phase6`;
- `phase7`.

Do not reuse an older green result.

### BLOCKER 6 — Protect main does not yet require Phase 7

Ruleset `21530843` is active and currently requires only:

- `phase2`;
- `cloudflare-phase3`;
- `phase4-neon`;
- `phase5-database-safety`;
- `phase6`.

It has no bypass actors and current user cannot bypass.

**Required correction:** only after the final Phase 7 check is stable and green, add `phase7` as the sixth required status check before marking PR #36 Ready and before merge consideration.

## Directions to self — what build are we doing?

You are building **GENEVIEVE Budget Phase 7 — Core accounts and balances** on branch `phase7-first-time-setup`, PR #36.

The existing First-Time Setup implementation stays as the Phase 7 onboarding/entry component. The remaining Phase 7 work must complete persistent account/balance responsibilities without starting Phase 8.

Do not rename or reinterpret Phase 7 back to only First-Time Setup.

Do not start transaction expense-intelligence features, income/payday engine, bill calendar, full Smooth/Hold engines, Safe-to-Spend forecasting or later Professional accounting features. Those remain later phases.

## Directions to self — exact point reached

Current authoritative base is protected `main`:

`156a36e9ba1b6a2452012c6915341f0184baa284`

The old Phase 7 branch was reconciled with that main by normal two-parent merge commit:

`35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`

Immediately after reconciliation it was 27 ahead / 0 behind with exactly 10 Phase 7 changed files.

This audit has determined that the branch is **not merge-ready** because the First-Time Setup draft is not the whole authoritative Phase 7 scope and does not yet provide authenticated Neon persistence or the required balance classification.

This checkpoint is the new continuation authority for Phase 7 status. After committing it, re-read the branch head before any next write.

## Directions to self — next chronological step

### Step 7A — seal the Phase 7 account/balance API contract before code

Do this next, on the same Phase 7 branch:

1. re-fetch current Phase 7 branch head and current protected `main`;
2. confirm branch remains based on current `main` and has no unexpected concurrent changes;
3. define the minimal authenticated API contract for Phase 7 only;
4. map browser/local account fields to existing Neon account columns;
5. map transaction fields to existing Neon transaction columns;
6. define transfer validation so source and destination are different and same-user ownership remains database-enforced;
7. define soft-archive behaviour rather than physical delete;
8. define the Phase 7 balance summary from existing sealed fields;
9. document explicitly that full Safe-to-Spend is deferred to Phase 13;
10. add tests for this contract before wiring UI persistence.

### Step 7B — implement authenticated Worker persistence

After Step 7A is green:

- add bounded Phase 7 account list/create/update/archive endpoints;
- add bounded Phase 7 transaction list/create/update/archive endpoints required for account balances and transfers;
- use `withAuthenticatedUserTransaction` for user-owned scope;
- never accept a caller-supplied `user_id` as authority;
- let RLS and ownership-preserving foreign keys deny cross-user references;
- return explicit 400/403/404 errors for invalid/request/permission conditions rather than hiding them as 503;
- preserve Phase 6 session revocation and managed identity checks;
- do not weaken existing Worker readiness or auth routes.

Prefer no migration `015` if the existing schema is sufficient. If a genuine schema deficiency is discovered, STOP, document why, add a strictly Phase 7 migration plus rollback proof, and update the production boundary chronologically. Do not create a migration merely to make coding easier.

### Step 7C — add the Phase 7 subscriber persistence/balance bridge

After Worker API tests are green:

- add the smallest new Phase 7 runtime required to load/sync the authenticated user's accounts/transactions;
- preserve local setup/offline continuity;
- prevent duplicate records during first authenticated sync;
- preserve existing local IDs carefully when mapping to server UUIDs; do not silently pretend a browser-generated ID is a Postgres UUID;
- never overwrite another user's records;
- surface sync failures without losing local data;
- show ledger/account position separately from protected/reserved and unreserved/spendable balance;
- preserve transfer exclusion from spending;
- keep protected `app.js` unchanged.

### Step 7D — extend Phase 7 verification

The final `phase7` gate must prove at least:

- current authoritative First-Time Setup behaviour;
- multiple accounts including credit/loan/BNPL;
- authenticated account persistence through Worker → Hyperdrive → Neon;
- authenticated transaction persistence where needed for account balances;
- transfer source/destination same-user enforcement;
- internal transfers do not count as spending;
- account balance math remains correct for assets and liabilities;
- protected emergency cash is not shown as ordinary free cash;
- bill reserves are separated from unreserved balance;
- protected savings current amounts are separated from unreserved balance;
- no cross-user read/write succeeds;
- archive is soft, not physical delete;
- audit evidence is produced for mutations;
- existing Phase 2→6 checks remain green;
- `app.js` blob remains exact;
- production artifact/runtime order is exact;
- Cloudflare preview serves every Phase 7 runtime;
- live readiness remains correct for whatever verified migration boundary is authoritative.

### Step 7E — final pre-merge gate

Only after all Phase 7 implementation is complete:

1. update this audit/checkpoint and PR #36 body to the final exact head and full Phase 7 scope;
2. ensure branch is 0 behind protected `main`;
3. rerun `phase2`, `cloudflare-phase3`, `phase4-neon`, `phase5-database-safety`, `phase6`, `phase7` on one exact head;
4. inspect the full job logs, not only status labels;
5. verify live Cloudflare branch preview;
6. verify production Neon boundary separately and ensure no test data leaked to production;
7. update `Protect main` to require `phase7` as a sixth check;
8. re-read ruleset, current main, PR head and compare immediately before merge;
9. mark PR #36 Ready only after the complete gate is satisfied;
10. merge using expected exact head only;
11. post-merge verify all required checks again on exact new `main`;
12. verify live Cloudflare and Neon again;
13. create a documentation-only Phase 7 completion archive PR;
14. merge the archive only after required checks are green;
15. only then scope Phase 8.

## Directions to self — non-negotiable anti-break rules

- Never write directly to protected `main`.
- Never force-update the Phase 7 branch.
- Re-fetch `main`, branch head and file blob SHA immediately before writes.
- One bounded change at a time.
- Verify each bounded change before the next.
- Do not modify protected `app.js`.
- Do not replace the sealed Phase 2 financial engine with a parallel model.
- Do not duplicate existing Neon tables.
- Do not weaken RLS, ownership constraints, soft archive, audit, managed Auth or session revocation.
- Do not treat browser-hidden controls as security; Worker + database must enforce access.
- Do not use raw bank balance as Safe-to-Spend.
- Do not call Phase 7 unreserved balance `Actually Safe to Spend`; full Safe-to-Spend remains Phase 13.
- Do not count internal transfers as spending.
- Do not physically delete financial records.
- Do not introduce Phase 8 work while any Phase 7 blocker remains.
- Do not merge using old green checks after the head changes.
- Do not update `Protect main` to require a broken/unstable Phase 7 check; stabilise it first, then require it before merge.
- After any documentation-only finalization PR, rerun the protected checks on the resulting exact `main`.

## Directions to self — memory/update instruction

Treat this file as the durable project memory/checkpoint for the current Phase 7 continuation.

When opening a new chat or resuming later, read in this order:

1. `docs/PRODUCT_CONTRACT.md`;
2. `docs/BUILD_ARCHIVE.md`;
3. `docs/PHASE6_COMPLETION_ARCHIVE.md`;
4. `docs/PHASE6_IDENTITY_ENTITLEMENT_CHECKPOINT.md`;
5. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` for historical First-Time Setup implementation detail;
6. **this file `docs/PHASE7_RECONCILIATION_AUDIT.md` for the current authoritative Phase 7 continuation point**;
7. PR #36 current head/diff;
8. ruleset `21530843`.

Always re-fetch live GitHub state after reading these files. SHA values in documents are evidence/checkpoints, not permission to assume the branch has not moved.

## Final audit decision at this checkpoint

**Phases 1→6 remain the protected, archived production baseline.**

**Phase 7 branch reconciliation: GREEN.**

**Existing First-Time Setup implementation quality: structurally sound and worth preserving.**

**Phase 7 full authoritative scope: NOT YET COMPLETE.**

**Merge decision: BLOCKED.**

**Next permitted work: Step 7A — define and test the minimal authenticated Core Accounts & Balances API/balance contract using the existing sealed schema.**

**Phase 8: PROHIBITED until Phase 7 is fully implemented, exact-head green, merged, post-merge green and archived.**