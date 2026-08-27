# GENEVIEVE Budget — Phase 7 Reconciliation Audit and Continuation Authority

Date: 27 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Protected base branch: `main`
Authoritative protected `main`: `156a36e9ba1b6a2452012c6915341f0184baa284`
Phase 7 branch: `phase7-first-time-setup`
Phase 7 PR: #36 — DRAFT / NOT MERGED
Protect-main ruleset: `21530843`
Current production migration boundary before Phase 7 promotion: `014`
Protected `app.js` Git blob: `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`
Sealed Phase 6 Worker Git blob: `670159e8b820f597ed2376c246df04e69a244988`

## Current status

**PHASE 7 — CORE ACCOUNTS & BALANCES — RECONCILED / SUBSTANTIAL IMPLEMENTATION PRESENT / REGRESSION CI GREEN ON PRIOR AUDITED HEAD / DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

**DO NOT MERGE PR #36. DO NOT ADD `phase7` TO PROTECT MAIN YET. DO NOT START PHASE 8.**

This file is the current continuation authority for Phase 7. It supersedes any earlier status saying Phase 7 is code-complete or merge-ready.

`docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` has also been corrected to point back to this audit and to carry the same audit-blocked status.

## Chronology repaired before this audit

The old Phase 7 branch was originally based on the Phase 6 archive boundary `06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`.

After the documentation-only Phase 6 build-archive correction merged through protected `main` as PR #38, authoritative `main` became:

`156a36e9ba1b6a2452012c6915341f0184baa284`

The Phase 7 branch was reconciled without rewriting history by normal two-parent merge commit:

`35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`

Parents:

1. previous Phase 7 head `720cd88c8c0a9e4a8ade52aaeb7ba9dd7f28b51b`;
2. authoritative `main` `156a36e9ba1b6a2452012c6915341f0184baa284`.

No force push was used.

A later Phase 7 implementation candidate was recorded at:

`5ae338e2870055575216b7ddba7e5c369f8295f9`

At audited head `cd859dad2830d47298ac57331627d72e27668d36`, the full implementation plus the first audit document was 55 commits ahead and 0 behind current main, with 21 changed files.

Subsequent commits corrected the two Phase 7 checkpoint documents only. Always re-fetch the live branch head before continuing; the SHA of this document's commit is not a permanent branch-head promise.

## Exact implementation diff audited

The code/config implementation audited against authoritative `main` consists of these 21 current PR paths, including the audit/checkpoint docs:

1. `.github/workflows/phase6-identity.yml`
2. `.github/workflows/phase7-first-time-setup.yml`
3. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`
4. `docs/PHASE7_RECONCILIATION_AUDIT.md`
5. `package.json`
6. `phase3-cloudflare.test.mjs`
7. `phase6-identity-entitlement.test.mjs`
8. `phase6-lifecycle-roles.test.mjs`
9. `phase7-backup-bridge.js`
10. `phase7-core-balances-bridge.js`
11. `phase7-core-balances.mjs`
12. `phase7-core-balances.test.mjs`
13. `phase7-first-time-setup-model.mjs`
14. `phase7-first-time-setup.js`
15. `phase7-first-time-setup.test.mjs`
16. `phase7-plan-integrity-bridge.js`
17. `scripts/link-phase7-first-time-setup.mjs`
18. `scripts/verify-phase7-dist.mjs`
19. `src/phase7-account-routes.mjs`
20. `src/worker-phase6-sealed.mjs`
21. `src/worker.mjs`

At `cd859dad…`, no Phase 8 implementation existed, no migration `015` existed, protected `app.js` was unchanged, and the exact Phase 6 Worker was preserved in a sealed module.

## Exact-head CI evidence already obtained

At exact head:

`cd859dad2830d47298ac57331627d72e27668d36`

all six Phase 2→7 pull-request workflows completed successfully:

- `phase2` — GREEN;
- `cloudflare-phase3` — GREEN;
- `phase4-neon` — GREEN;
- `phase5-database-safety` — GREEN;
- `phase6` — GREEN;
- `phase7` — GREEN.

This is regression evidence only. **It is not merge authority.** Manual/data-contract audit found material defects that the present tests do not cover.

Every later commit changes the exact head and therefore requires the complete six-workflow gate again before any future merge consideration.

## Authoritative Phase 7 scope

Protected `docs/BUILD_ARCHIVE.md` defines Phase 7 as:

**Phase 7 — Core accounts and balances**

Required responsibilities:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers between the user's own accounts must not be counted as spending;
4. spendable balance must be separated from protected/reserved balance.

The eight-screen First-Time Setup remains the Phase 7 onboarding entry component. It is not, by itself, the whole phase.

Phase 1 remains binding:

- opening/current bank position is not automatically safe-to-spend;
- internal transfers are money movement, not spending;
- protected bill money, emergency buffers and protected savings are not free cash.

Full `Actually Safe to Spend` remains Phase 13. Phase 7 must not pull later income/obligation/forecast logic forward.

# Complete implementation audit

## 1. `.github/workflows/phase6-identity.yml`

Current change preserves Phase 6 rather than replacing it:

- still runs `npm run verify:phase6`;
- still proves migrations 008→014;
- still proves trusted-support and Professional role separation;
- hashes `src/worker-phase6-sealed.mjs` to the exact former Phase 6 Worker blob;
- requires the Phase 7 composition entrypoint to delegate to that sealed Worker;
- still hashes protected `app.js`;
- still verifies live Phase 6 `/ready` at migration 014.

Audit decision: **acceptable compatibility adaptation**, provided the sealed Worker hash remains exact and the workflow is never weakened to make Phase 7 pass.

## 2. `.github/workflows/phase7-first-time-setup.yml`

Current Phase 7 gate verifies:

- all eight onboarding screens;
- Smooth/target methods;
- due-date plan integrity;
- setup-aware backup;
- core balance UI wording;
- same-origin Phase 7 account APIs;
- self-scope SQL fragments;
- soft-archive SQL fragment;
- no migration 015 in the present implementation;
- sealed Phase 6 Worker hash;
- protected `app.js` hash;
- all four Phase 7 runtime assets live on Cloudflare preview;
- unauthenticated account API returns HTTP 401;
- `/ready` remains Phase 6 / migration 014.

Audit defect: the gate currently proves the presence of the unsafe sync design rather than detecting its failure modes. It must be extended with the behavioral tests listed under the blockers before it can become a merge gate.

## 3. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`

The document records the First-Time Setup and Core Accounts & Balances implementation history. Its status has now been corrected to **data-integrity audit blocked** and points to this file as the continuation authority.

## 4. `docs/PHASE7_RECONCILIATION_AUDIT.md`

This file is the current durable continuation authority and must be updated again after each blocker is resolved or if live branch state materially changes.

## 5. `package.json`

Good:

- `test:phase7` runs both First-Time Setup and Core Balances tests;
- production build links Phase 7 after existing subscriber asset copy;
- `verify:phase7` remains nested after `verify:phase6`;
- no dependency versions changed.

Audit decision: structure is sound. Extend tests only; do not bypass earlier verification.

## 6. `phase3-cloudflare.test.mjs`

The Phase 3 test now recognises that `src/worker.mjs` is a later-phase composition entrypoint and verifies preserved health/readiness/static behavior inside the sealed Phase 6 Worker.

Audit decision: acceptable because deployed routing still delegates non-Phase-7 work to the exact sealed Worker and Phase 3 remains in the nested gate.

## 7. `phase6-identity-entitlement.test.mjs`

Behavioral tests still import the public Phase 6 exports through `src/worker.mjs`, while static source assertions use `src/worker-phase6-sealed.mjs`.

Audit decision: acceptable. Phase 6 authentication, transaction-local ownership scope and revoked-session behavior remain behaviorally exercised.

## 8. `phase6-lifecycle-roles.test.mjs`

Static lifecycle/role checks inspect the exact sealed Phase 6 Worker.

Audit decision: acceptable because the underlying Phase 6 source is independently hash-pinned and the composition module re-exports its public functions.

## 9. `phase7-backup-bridge.js`

Good:

- preserves Phase 7 setup state in local backup;
- supports legacy backups;
- restores local money state and setup metadata without editing sealed Phase 2 source.

Audit concern:

- Phase 7 cloud ownership/mapping metadata is not currently part of a safe user-bound restore contract;
- restoring local data while stale device cloud-map state remains can produce unsafe sync assumptions.

This must be addressed as part of browser ownership binding and explicit archive semantics.

## 10. `phase7-core-balances-bridge.js`

Good:

- displays Spendable balance separately from Protected / reserved;
- keeps assets and debts separate;
- explicitly states transfers are not spending;
- explicitly states full safe-to-spend is later;
- uses same-origin credentialed requests;
- protects incomplete onboarding from immediate full-snapshot sync;
- retains device data when cloud access is unavailable;
- supports account-only recovery from Neon.

Material defects:

- it treats a device-local account list as an authoritative full cloud snapshot;
- it has no authenticated-user binding for the browser money store/cloud map before upload;
- cloud-only recovery does not restore bill reserves/protected-savings amounts yet still enables the local spendable display;
- its current balance snapshot is sent to a server route that stores it in the wrong database field.

## 11. `phase7-core-balances.mjs`

Good:

- reuses sealed `transaction-model.mjs` rather than inventing another balance engine;
- transfer movement preserves combined asset position;
- monthly spending reuses `monthlyExpenseTotal`, which counts only expenses;
- liabilities include credit, loan and BNPL;
- liquid assets are bank/savings/cash;
- protected/reserved is emergency + bill reserves + protected savings;
- bounded Phase 7 spendable is liquid minus already-recorded protected/reserved amounts.

Audit decision: pure arithmetic is sound for the intended bounded Phase 7 display. Keep the wording distinct from full Phase 13 Safe-to-Spend.

## 12. `phase7-core-balances.test.mjs`

Good current coverage:

- transfers change source/destination but not spending total;
- credit/loan/BNPL liability treatment;
- protected/reserved arithmetic;
- payload validation;
- self-scoped account read;
- unauthenticated API fail-closed;
- incomplete onboarding source guard;
- emergency-buffer recovery source guard.

Missing required tests:

- current balance must never overwrite sealed opening balance;
- multi-device stale snapshot must not archive other active accounts;
- local reset/restore must not imply remote delete;
- explicit account removal must be the only route to archive an account;
- one signed-in user's local data must not upload into a different signed-in user's cloud account;
- cloud recovery with incomplete protected/reserved data must not show an overstated spendable amount;
- backup/restore must handle Phase 7 cloud binding/mapping safely.

## 13. `phase7-first-time-setup-model.mjs`

Good:

- pay-frequency contract exact;
- due-date-aware smoothing model available;
- irregular pay does not invent fixed contributions;
- target mode retained;
- account/bill/savings structures reuse established contracts.

Audit decision: preserve. Do not expand it into later phases.

## 14. `phase7-first-time-setup.js`

Good:

- eight screens remain one-at-a-time;
- incomplete setup is isolated;
- financial records commit only at Screen 8;
- multiple accounts, credit, loan and BNPL are supported;
- Smooth/target, emergency and optional savings are retained;
- existing established local users are not forced through onboarding;
- existing money-store fields are preserved on commit.

Audit decision: preserve. It is not the source of the current server data-integrity blockers.

## 15. `phase7-first-time-setup.test.mjs`

Good:

- preserves the full earlier First-Time Setup contract;
- verifies the core-balance bridge is linked and uses authenticated same-origin persistence.

Audit decision: keep. Put new sync/data-safety behavioral tests in the Core Balances test layer.

## 16. `phase7-plan-integrity-bridge.js`

Good:

- rejects past next-pay dates;
- rolls stale regular pay dates;
- computes actual pays available before known due date;
- deducts already-reserved amount;
- retains annual fallback;
- does not fabricate irregular-pay contributions;
- refreshes target alerts.

Audit decision: preserve. Do not turn this into Phase 11/12/13 implementation.

## 17. `scripts/link-phase7-first-time-setup.mjs`

Good:

- copies four Phase 7 assets;
- refuses double-linking;
- order is:
  `Phase 2 data → Phase 2 subscriptions/savings → setup → plan integrity → backup → core balances → protected app.js`;
- all four enter the service-worker cache;
- protected `app.js` remains untouched.

Audit decision: linkage is structurally correct.

## 18. `scripts/verify-phase7-dist.mjs`

Good:

- verifies exact runtime order;
- verifies all Phase 7 assets;
- verifies account-route security fragments;
- independently computes protected `app.js` Git blob;
- independently computes sealed Phase 6 Worker Git blob;
- verifies the new Worker composition.

Audit defect: static fragment verification must be complemented by the missing behavioral data-integrity tests.

## 19. `src/phase7-account-routes.mjs`

Good:

- uses `withAuthenticatedUserTransaction` from sealed Phase 6;
- caller does not supply authoritative `user_id`;
- SQL self-scopes with `public.current_app_user_id()`;
- supports the sealed account types;
- validates account snapshot payloads;
- reads financial settings, bill reserves and protected savings;
- physical DELETE is not used;
- mutations pass through Phase 5 RLS/audit controls.

This file contains two critical blockers:

1. incoming **current computed balance is written into `public.accounts.opening_balance`**;
2. every active server account omitted from one device snapshot is automatically soft-archived.

Both must be corrected before merge.

## 20. `src/worker-phase6-sealed.mjs`

Verified required Git blob:

`670159e8b820f597ed2376c246df04e69a244988`

Audit decision: preserve byte-for-byte.

## 21. `src/worker.mjs`

Current module is a small structural composition entrypoint:

- routes Phase 7 account requests;
- delegates everything else to sealed Phase 6 Worker;
- re-exports Phase 6 named exports.

Audit decision: acceptable architecture if it remains bounded and Phase 6 sealed hash remains exact.

# Merge-blocking findings

## BLOCKER A — current balance overwrites the sealed opening-balance basis

The sealed Phase 2 account contract states:

**Opening balances remain the starting point for every account.**

The sealed transaction engine computes current balance as:

`opening balance + linked income/expense/transfer effects`

Current Phase 7 sync sends the computed current balance and writes that value into `accounts.opening_balance` on insert/update.

This is not forward-compatible with Phase 8 transaction persistence. Once transactions are persisted, the application could start from a current snapshot and apply historical transactions again, double-counting movement and corrupting the ledger basis.

### Required correction

Do not mutate the semantic meaning of `opening_balance`.

The current schema has no separate current-balance snapshot field. This is a genuine schema deficiency for the chosen Phase 7 cloud-recovery design.

Design the smallest Phase 7 schema extension that stores current balance separately, for example a dedicated numeric snapshot field plus snapshot timestamp or an equivalently bounded owned snapshot table.

Requirements:

- preserve `opening_balance` as original starting basis;
- current snapshot must be distinct and clearly named;
- PostgreSQL `numeric`, never floating point;
- retain ownership/RLS/audit/soft-archive guarantees;
- add complete rollback to migration 014;
- prove forward and reverse migrations on isolated Neon before production;
- update readiness boundary chronologically only after production promotion is verified.

Do not lock the example schema name until the design is checked against existing constraints/triggers.

## BLOCKER B — device snapshot omission is being treated as permission to archive cloud accounts

Current sync archives every active server account absent from one device's local account list.

Unsafe cases include:

- second/stale device;
- partially restored backup;
- localStorage reset;
- an old device that never learned about a newly created account;
- any recovery path where local state is not complete cloud truth.

A missing row in one browser snapshot is not an explicit instruction to archive a server record.

### Required correction

Change sync to non-destructive upsert.

Remote soft archive must occur only through an explicit user account-removal action/endpoint after the protected app's explicit delete confirmation succeeds.

Required tests:

- Device A account + Device B stale subset → B sync does not archive A-only account;
- local empty/reset state → does not archive cloud accounts;
- restore older backup → omitted newer cloud account remains active;
- explicit confirmed removal → only intended owned account soft-archives;
- existing used-account restrictions remain respected.

## BLOCKER C — cloud recovery can overstate Phase 7 spendable balance

On a new/empty device, current recovery restores:

- cloud account balance snapshots;
- emergency buffer.

It does not restore local bill-reserve or protected-savings records that the Phase 7 spendable calculation subtracts.

The browser can therefore see full recovered liquid balance while treating missing bill/protected-savings data as zero and display too much as spendable.

### Required correction

Fail conservative when protection data is incomplete.

Bounded options:

- persist/recover only the minimal verified protected/reserved aggregate snapshot Phase 7 needs; or
- mark protection state incomplete and withhold spendable until protected/reserved data is restored or confirmed.

Do not pull full bill/savings feature persistence forward merely to solve this. Never fabricate zero protected money.

Required tests:

- cloud recovery with known protected aggregate does not overstate spendable;
- incomplete protection recovery shows unavailable/conservative state;
- complete local data still computes current bounded Phase 7 summary.

## BLOCKER D — browser money state is not bound to authenticated user before upload

The bridge syncs the global localStorage money store when an authenticated API becomes available. The cloud-map key is also global to the browser origin.

It does not first bind that local money state to the current authenticated application user.

Shared-device risk:

- User A leaves local financial data on device;
- A signs out;
- User B signs in;
- RLS correctly blocks updates to A's server IDs;
- but the same local data can be inserted as new records under B because browser state itself is not user-bound.

The database boundary is working; the browser ownership boundary is missing.

### Required correction

Add the smallest Phase 7 local-user ownership binding before upload.

Requirements:

- safely resolve current authenticated application user ID;
- namespace/bind cloud mapping to that user;
- never auto-upload local state into a different authenticated user;
- legacy unbound local-data adoption must be explicit/safe;
- account switching/sign-out on shared device must fail closed against cross-account upload;
- backup/restore must not carry another user's ownership binding into the current user.

Required tests:

- User A local state + User B authenticated session → no A records uploaded to B;
- switching back to A preserves correct A mapping;
- legacy unbound local state follows explicit/safe adoption path;
- restore does not inherit another user's cloud ownership metadata.

# Verified foundations that should not be rewritten

## Internal transfers

Sealed Phase 2 already defines `income`, `expense`, `transfer`.

Transfers subtract from source, add to destination and are excluded from monthly spending because spending filters strictly to `expense`.

Phase 7 correctly reasserts this. Do not rewrite transaction logic.

## Existing Neon ownership/security

Existing migrations already provide owned accounts/transactions, financial settings, bill provisions, protected savings, debts, RLS, ownership-preserving FKs, cross-user isolation, soft archive and append-only audit.

Migration 008 guarantees managed authenticated users receive a `financial_settings` row, so the current settings UPDATE assumption is valid.

## Phase 6 preservation

`src/worker-phase6-sealed.mjs` must remain exact. Do not edit it to fix Phase 7.

## Protected Budget engine

`app.js` remains immutable. Use Phase 7 bridges/routes and the existing explicit account-delete event boundary rather than modifying it.

# Directions to self — what build are we doing?

Build:

**GENEVIEVE Budget Phase 7 — Core Accounts & Balances.**

Preserve the eight-screen First-Time Setup as its onboarding entry component.

Phase 7 is responsible for:

- multiple asset/liability accounts;
- persistent owned account/balance state;
- credit/loan/BNPL liability handling;
- transfer-not-spending preservation;
- bounded spendable vs protected/reserved classification.

Phase 7 is not Phase 8 transaction/expense intelligence, Phase 9 payday engine, Phase 10 bill calendar, Phase 11/12 full bill engines or Phase 13 full Safe-to-Spend.

# Directions to self — exact point reached

1. Phase 1→6 are protected, production-live, green and archived.
2. Protected `main` at this audit is `156a36e9ba1b6a2452012c6915341f0184baa284`.
3. Phase 7 was reconciled to current main by normal merge; no force push.
4. Substantial Phase 7 implementation exists: First-Time Setup, core-balance model/UI, authenticated account routes and sealed-Phase-6 Worker composition.
5. At audited exact head `cd859dad2830d47298ac57331627d72e27668d36`, the full branch was 55 ahead / 0 behind / 21 files.
6. All six Phase 2→7 checks passed on `cd859dad…`.
7. Manual audit found four material data-integrity blockers not covered by those checks.
8. Two documentation-only commits then corrected the durable Phase 7 audit/checkpoint status. Therefore `cd859dad…` is historical regression evidence only, not the current head and not merge authority.
9. PR #36 remains Draft and must not merge.
10. `Protect main` still requires Phase 2→6 only; do not add Phase 7 until corrections are stable and exact-head green.
11. Re-fetch the live Phase 7 branch head before the next write or verification claim.

# Directions to self — next chronological step

## Step 7A — persistence-contract hardening

Do this next. Do not jump to merge/protection work.

1. re-fetch current protected `main` and Phase 7 branch head;
2. confirm no concurrent changes;
3. design the smallest Phase 7 balance-snapshot schema extension preserving `opening_balance` semantics;
4. add migration `015` only after that design is confirmed — current audit indicates a separate snapshot is necessary for the chosen recovery design;
5. create complete 015→014 rollback;
6. add failing-first tests for opening-balance immutability;
7. change account sync to non-destructive upsert;
8. add explicit owned soft-archive action tied to explicit user removal;
9. add authenticated local-user binding before upload;
10. make cloud recovery conservative when protected data is incomplete;
11. make backup/restore safe for any new user-binding/cloud-map metadata;
12. run Phase 7 tests locally/CI before touching production Neon.

## Step 7B — isolated Neon migration/rollback proof

If migration 015 is implemented:

1. create/use a fresh isolated Neon test branch from exact production boundary 014;
2. verify baseline migration 014;
3. apply 015 only;
4. test owned snapshot insert/update/read, RLS, audit and archive behavior;
5. prove cross-user access fails;
6. prove `opening_balance` remains original starting basis;
7. rollback 015→014;
8. require an empty intended schema diff against the 014 parent;
9. record Neon branch ID/evidence;
10. do not promote production while anything fails.

## Step 7C — final code/data audit before production promotion

After isolated proof is green:

- audit the entire `main...Phase7` diff again;
- confirm no Phase 8 work;
- verify protected `app.js` exact blob;
- verify sealed Phase 6 Worker exact blob;
- verify no omission-based archive remains;
- verify explicit archive behavior;
- verify shared-device/auth-user binding tests;
- verify conservative protection recovery;
- verify backup/restore binding behavior;
- verify all Phase 7 tests.

## Step 7D — production database promotion if 015 is required

Only after isolated rollback proof:

- create pre-promotion Neon recovery branch from production 014;
- verify production still 014 and free of synthetic test data;
- apply 015 in controlled order;
- verify production schema;
- update Worker readiness boundary from 014 to 015 only in the same bounded Phase 7 promotion sequence and only after DB promotion is proven;
- verify Cloudflare → Hyperdrive → Neon live path;
- never claim production 015 before direct verification.

## Step 7E — final exact-head Phase 2→7 gate

After all corrections are complete:

1. update Phase 7 docs and PR #36 body to final exact head;
2. ensure branch is 0 behind protected main;
3. run all six on one exact head: `phase2`, `cloudflare-phase3`, `phase4-neon`, `phase5-database-safety`, `phase6`, `phase7`;
4. inspect job steps/logs, not just labels;
5. verify live Cloudflare preview/API;
6. verify exact Neon production boundary separately;
7. verify no synthetic test data leaked;
8. perform final whole-diff audit;
9. only then add `phase7` as sixth required check in Protect main;
10. confirm ruleset active/no bypass;
11. mark PR #36 Ready only then;
12. re-read current main, PR head and compare immediately before merge;
13. merge only using expected exact head.

## Step 7F — post-merge and archive

After implementation merge:

1. verify all required checks on exact new main;
2. verify live Cloudflare production;
3. verify Neon production migration/snapshot behavior;
4. verify app.js and sealed Phase6 hashes;
5. create documentation-only Phase 7 completion archive PR;
6. update `docs/BUILD_ARCHIVE.md` through Phase 7 only after implementation proof;
7. require protected checks on archive head;
8. merge archive normally;
9. verify post-archive main again;
10. only then scope Phase 8.

# Non-negotiable anti-break rules

- Never write directly to protected `main`.
- Never force-push Phase 7.
- Re-fetch main, branch head and file SHA before each write.
- Treat concurrent branch changes as stop-and-re-audit.
- One bounded correction at a time.
- Do not modify protected `app.js`.
- Do not modify sealed Phase 6 Worker bytes.
- Do not weaken Phase 2→6 workflows/tests to make Phase 7 pass.
- Do not replace sealed transaction engine with a parallel model.
- Preserve `opening_balance` as starting basis; never use it as live snapshot.
- Absence in one device snapshot is never archive permission.
- Remote archive requires explicit owned user action.
- Bind browser/cloud state to authenticated user before upload.
- With incomplete protected data, fail conservative; never overstate spendable.
- Internal transfers never count as spending.
- Physical DELETE remains prohibited for financial records.
- Do not call bounded Phase 7 balance `Actually Safe to Spend`.
- Do not pull Phase 8 transaction persistence/expense intelligence forward unless narrowly unavoidable; current correction should prefer a dedicated balance snapshot, not transaction-history persistence.
- Do not create migration merely for convenience. Migration 015 is justified only by the final separate-snapshot design.
- If 015 exists, isolated forward/rollback proof is mandatory before production.
- Never promote production migration/readiness claims without direct verification.
- Old green workflow runs become regression history after every head change.
- Do not add Phase 7 to Protect main until final Phase 7 check is stable/green.
- Do not merge or start Phase 8 until Phase 7 is corrected, final exact-head green, merged, post-merge green and archived.

# Memory / resume instructions

Treat this file as the durable current Phase 7 project memory.

On resume/new chat read, in order:

1. `docs/PRODUCT_CONTRACT.md`;
2. `docs/BUILD_ARCHIVE.md`;
3. `docs/PHASE6_COMPLETION_ARCHIVE.md`;
4. `docs/PHASE6_IDENTITY_ENTITLEMENT_CHECKPOINT.md`;
5. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` for implementation history;
6. **`docs/PHASE7_RECONCILIATION_AUDIT.md` last — this controls current Phase 7 status/blockers**;
7. PR #36 live metadata and whole diff;
8. ruleset `21530843`;
9. live Neon production migration and any Phase 7 test branch before database claims.

Recorded SHAs are checkpoints, not permission to assume live state did not move. Re-fetch before continuing.

# Audit decision

**Phase 1→6 baseline: GREEN / PROTECTED / ARCHIVED.**

**Phase 7 reconciliation: GREEN.**

**First-Time Setup preservation: GREEN.**

**Core-balance arithmetic and transfer-not-spending logic: GREEN.**

**Phase 6 sealed Worker preservation: GREEN.**

**Phase 2→7 regression CI at audited `cd859dad…`: GREEN.**

**Phase 7 cloud persistence/data-integrity design: RED / BLOCKED.**

Blocking defects:

1. current balance overwrites `opening_balance`;
2. snapshot omission can archive valid cloud accounts;
3. cloud recovery can overstate spendable money when protected data is incomplete;
4. local browser money/cloud-map state is not authenticated-user-bound before upload.

**Merge decision: DO NOT MERGE.**

**Next permitted work: Step 7A persistence-contract hardening.**

**Phase 8: PROHIBITED until Phase 7 is corrected, final exact-head green, merged, post-merge green and archived.**