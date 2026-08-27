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

**PHASE 7 — CORE ACCOUNTS & BALANCES — RECONCILED / SUBSTANTIAL IMPLEMENTATION PRESENT / EXACT-HEAD REGRESSION CHECKS GREEN / DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

**DO NOT MERGE PR #36. DO NOT ADD `phase7` TO PROTECT MAIN YET. DO NOT START PHASE 8.**

This file is the current continuation authority for Phase 7. It supersedes any more optimistic status wording in `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` until the blockers in this audit are corrected and the final exact-head gate is rerun.

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

The next commit `cd859dad2830d47298ac57331627d72e27668d36` added the first reconciliation-audit document only. The full audit below was performed against that actual code/content state after catching concurrent branch activity.

## Exact diff audited at `cd859dad…`

Against authoritative `main` the branch was:

- 55 commits ahead;
- 0 commits behind;
- 21 changed files;
- +4072 / -641;
- PR #36 remained Draft;
- no Phase 8 implementation file;
- no database migration `015` yet;
- protected `app.js` unchanged;
- Phase 6 Worker preserved byte-for-byte in a sealed module.

Changed files audited:

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

## Exact-head CI evidence at `cd859dad…`

All six Phase 2→7 pull-request workflows were emitted against the same exact head and completed successfully:

- `phase2` — GREEN;
- `cloudflare-phase3` — GREEN;
- `phase4-neon` — GREEN;
- `phase5-database-safety` — GREEN;
- `phase6` — GREEN;
- `phase7` — GREEN.

This is useful regression evidence. **It is not merge authority.** Manual/data-contract audit found material defects that the current tests do not cover. Any corrective commit changes the exact head, so the complete six-workflow gate must be rerun after all blockers are fixed.

## Authoritative Phase 7 scope

Protected `docs/BUILD_ARCHIVE.md` defines Phase 7 as:

**Phase 7 — Core accounts and balances**

Required responsibilities:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers between the user's own accounts must not be counted as spending;
4. spendable balance must be separated from protected/reserved balance.

The eight-screen First-Time Setup is retained as the Phase 7 onboarding entry component. It is not, by itself, the whole Phase 7 gate.

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
- still proves support/Professional role separation;
- now hashes `src/worker-phase6-sealed.mjs` to the exact former Phase 6 Worker blob;
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

Audit defect: the gate currently proves the presence of the unsafe sync design rather than detecting its failure modes. It needs new behavioral tests for the blockers below before it can be a merge gate.

## 3. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`

This document now describes Core Accounts & Balances and the new persistence implementation in detail.

Audit defect: its status says the authoritative scope is implemented/code-complete. That is now superseded by this audit. Do not use that status as merge authority until this audit is cleared.

## 4. `docs/PHASE7_RECONCILIATION_AUDIT.md`

This file is the current authoritative continuation checkpoint after this correction.

## 5. `package.json`

Good:

- `test:phase7` runs both First-Time Setup and Core Balances tests;
- production build links Phase 7 after existing subscriber asset copy;
- `verify:phase7` remains nested after `verify:phase6`;
- no dependency versions changed.

Audit decision: structure is sound. Extend tests only; do not bypass earlier verification.

## 6. `phase3-cloudflare.test.mjs`

The Phase 3 test now recognises that `src/worker.mjs` is a later-phase composition entrypoint and verifies preserved health/readiness/static behavior inside the sealed Phase 6 Worker.

Audit decision: acceptable because the deployed entry still delegates non-Phase-7 routes to the exact sealed Worker and the live Phase 3 gate remains present.

## 7. `phase6-identity-entitlement.test.mjs`

Behavioral tests still import the public Phase 6 exports through `src/worker.mjs`, while static source assertions use `src/worker-phase6-sealed.mjs`.

Audit decision: acceptable. Phase 6 authentication, transaction-local ownership scope and revoked-session behavior remain behaviorally exercised.

## 8. `phase6-lifecycle-roles.test.mjs`

Static lifecycle/role checks now inspect the exact sealed Phase 6 Worker.

Audit decision: acceptable because the underlying Phase 6 source is independently hash-pinned and the composition module re-exports its public functions.

## 9. `phase7-backup-bridge.js`

Good:

- preserves Phase 7 setup state in local backup;
- supports legacy backups;
- restores local money state and setup metadata without editing sealed Phase 2 source.

Audit concern:

- the Phase 7 cloud mapping/ownership metadata is not currently part of this backup contract;
- restoring local data while stale device cloud-map state remains can produce unsafe sync assumptions.

This becomes part of the explicit sync/restore correction below.

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
- a local store must not upload one signed-in user's device data into a different signed-in user's cloud account;
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
- now verifies the core-balance bridge is linked and uses authenticated same-origin persistence.

Audit decision: keep. Add the missing safety tests in the Core Balances test layer rather than weakening this coverage.

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

Audit defect: needs to be complemented by behavioral data-integrity tests; static fragments cannot prove safe sync semantics.

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

This file contains two of the most important blockers in the build:

1. incoming **current computed balance is written into `public.accounts.opening_balance`**;
2. every active server account omitted from one device snapshot is automatically soft-archived.

Both must be corrected before merge.

## 20. `src/worker-phase6-sealed.mjs`

Verified exact Git blob:

`670159e8b820f597ed2376c246df04e69a244988`

Audit decision: preserve byte-for-byte.

## 21. `src/worker.mjs`

Current module is only a structural composition entrypoint:

- routes Phase 7 account requests;
- delegates everything else to sealed Phase 6 Worker;
- re-exports Phase 6 named exports.

Audit decision: acceptable architecture if it remains small and Phase 6 sealed hash remains exact.

# Merge-blocking findings

## BLOCKER A — current balance overwrites the sealed opening-balance basis

The sealed Phase 2 account contract states:

**Opening balances remain the starting point for every account.**

The sealed transaction engine computes current balance as:

`opening balance + linked income/expense/transfer effects`

Current Phase 7 sync sends the computed current balance and writes that value into `accounts.opening_balance` on insert/update.

That is not forward-compatible with Phase 8 transaction persistence. Once transactions are persisted, the application could start from a current snapshot and apply historical transactions again, double-counting movement and corrupting the ledger basis.

### Required correction

Do not mutate the semantic meaning of `opening_balance`.

The current schema has no separate current-balance snapshot field. This is a genuine schema deficiency for the chosen Phase 7 recovery design, not a convenience issue.

**Next implementation should introduce the smallest Phase 7 migration needed for a current balance snapshot**, for example a dedicated numeric snapshot field plus snapshot timestamp, or an equivalently bounded owned snapshot table.

Requirements:

- preserve `opening_balance` as the original starting basis;
- current snapshot must be distinct and clearly named;
- use PostgreSQL `numeric`, never floating point;
- ownership/RLS/audit/soft-archive expectations must remain intact;
- add a rollback back to migration 014;
- prove forward migration and reverse rollback on an isolated Neon branch before any production promotion;
- update readiness boundary chronologically only after verified production promotion.

Do not hard-code the example schema shape until the migration is designed against all existing account constraints/triggers.

## BLOCKER B — device snapshot omission is being treated as permission to archive cloud accounts

Current sync archives every active server account that is absent from one device's local account list.

That is unsafe for:

- a second/stale device;
- a partially restored local backup;
- a localStorage reset;
- an old device that never learned about a newly created account;
- any recovery path where the local store is not complete cloud truth.

A missing row in one browser snapshot is **not an explicit user instruction to delete/archive a server record**.

### Required correction

Change the sync contract to upsert only.

Remote soft archive must occur only through an explicit user account-removal action/endpoint, after the existing protected app's explicit delete confirmation succeeds.

Required tests:

- Device A account + Device B stale subset → Device B sync does not archive Device A account;
- local empty/reset state → sync does not archive cloud accounts;
- restore older backup → omitted newer cloud account remains active;
- explicit confirmed removal → only the intended owned account soft-archives;
- used-account restrictions from the protected app remain respected.

## BLOCKER C — cloud recovery can overstate the Phase 7 spendable balance

On a new/empty device, current recovery restores:

- cloud account balance snapshots;
- emergency buffer.

It does **not** restore the local bill-reserve records or protected-savings records that the Phase 7 spendable calculation subtracts.

The local summary can therefore see:

- full recovered liquid balance;
- emergency reserve;
- zero local bill reserve;
- zero local protected savings;

and show a spendable figure that is too high.

This violates the core rule that protected/reserved money must not be represented as free cash.

### Required correction

Fail conservative when protection data is incomplete.

Preferred bounded Phase 7 options are:

- persist/recover only the minimal verified protected/reserved aggregate snapshot required by Phase 7; or
- mark recovered protection data as incomplete and withhold the spendable figure until the user/device has restored or confirmed protected/reserved data.

Do not pull full bill/savings feature persistence forward simply to solve this. Do not fabricate zero protected money.

Required tests:

- cloud account recovery with known protected aggregate never overstates spendable;
- incomplete protection recovery displays an unavailable/conservative state rather than a false free-cash figure;
- full local data continues to compute the same bounded Phase 7 summary.

## BLOCKER D — browser money state is not bound to the authenticated user before cloud upload

The new bridge syncs the existing global localStorage money store after an authenticated API becomes available. The cloud-map key is also global to the browser origin.

The bridge does not first bind the local money store to the current authenticated application user.

On a shared browser/device, this creates a contamination risk:

- User A's local money data remains on the device;
- User A signs out;
- User B signs in;
- RLS correctly blocks updating User A's server IDs;
- but the same local account data can then be inserted as new records under User B because the local data itself is not user-bound.

Database isolation is working; the browser ownership boundary is missing.

### Required correction

Add the smallest Phase 7 local-user ownership binding before any upload.

Requirements:

- authenticated account read/identity must provide or resolve the current application user ID safely;
- cloud mapping must be namespaced/bound to that user;
- local money state must never auto-upload into a different authenticated user;
- first legacy local-data adoption into an authenticated account must be explicit/safe, not silently assumed;
- account switching/sign-out on a shared device must fail closed against cross-account upload;
- local backup/restore must not silently preserve a stale ownership binding into another user.

Required tests:

- User A local state + User B authenticated session → no User A local records uploaded to User B;
- switching back to User A does not lose User A cloud mapping;
- legacy unbound local data requires an explicit/safe adoption path;
- restore does not inherit another user's cloud ownership metadata.

# Important non-blockers / verified foundations

## Internal transfers

The sealed Phase 2 transaction model already has exact `income`, `expense`, `transfer` types.

Transfers:

- subtract from source;
- add to destination;
- do not enter `monthlyExpenseTotal` because that filters strictly to `expense`.

Phase 7 core-balance tests correctly reassert this. Do not rewrite the transaction engine.

## Existing Neon ownership/security

Existing migrations already provide:

- owned `accounts`;
- owned `transactions` with source/destination transfer constraints;
- financial settings;
- bill provisions;
- protected savings;
- debts;
- RLS;
- ownership-preserving foreign keys;
- cross-user isolation;
- soft archive;
- append-only audit.

Migration 008 guarantees an authenticated application user receives `financial_settings`, so the current settings UPDATE assumption is valid for managed identities.

## Phase 6 preservation

The exact former Phase 6 Worker is preserved as `src/worker-phase6-sealed.mjs` and hash-pinned. Keep it byte-for-byte unchanged.

## Protected Budget engine

`app.js` remains hash-pinned and must not be edited to fix these issues. Use Phase 7 bridges/routes and the existing explicit account-delete event boundary.

# Directions to self — what build are we doing?

Build:

**GENEVIEVE Budget Phase 7 — Core Accounts & Balances.**

Preserve the existing Phase 7 First-Time Setup as its onboarding entry component.

Phase 7 is responsible for:

- multiple asset/liability accounts;
- persistent owned account/balance state;
- credit/loan/BNPL liability handling;
- transfer-not-spending preservation;
- bounded spendable vs protected/reserved classification.

Phase 7 is **not** Phase 8 transaction/expense intelligence, Phase 9 payday engine, Phase 10 bill calendar, Phase 11/12 full bill engines, or Phase 13 full Safe-to-Spend.

# Directions to self — exact point reached

1. Phase 1→6 are protected, production-live, green and archived.
2. Protected `main` is `156a36e9ba1b6a2452012c6915341f0184baa284` at this audit.
3. Phase 7 branch was reconciled to current main by normal merge; no force push.
4. Substantial Phase 7 implementation exists, including First-Time Setup, core-balance model/UI, authenticated account routes and Phase 6 Worker composition.
5. At audited head `cd859dad2830d47298ac57331627d72e27668d36`, branch was 55 ahead / 0 behind / 21 files.
6. All six Phase 2→7 checks passed on that exact head.
7. Manual audit then found four material data-integrity blockers not covered by those checks.
8. PR #36 must remain Draft and unmerged.
9. `Protect main` still requires Phase 2→6 only; do not add Phase 7 until corrections are stable and exact-head green.
10. This corrected audit checkpoint changes the branch head again; re-fetch the new exact SHA before any next write or verification claim.

# Directions to self — next chronological step

## Step 7A — harden the persistence contract before any merge work

Do this next and do not skip ahead:

1. re-fetch current protected `main` and Phase 7 branch head;
2. confirm no concurrent changes appeared;
3. design the smallest Phase 7 balance-snapshot schema extension that preserves original `opening_balance` semantics;
4. create migration `015` only if the final design confirms that separate snapshot persistence is required — current audit says it is required for the chosen cloud-recovery design;
5. create a complete rollback from 015 back to 014;
6. add tests that fail on current-balance-to-opening-balance overwrite;
7. change account sync from destructive full-snapshot omission semantics to non-destructive upsert semantics;
8. add an explicit owned-account soft-archive route tied to explicit user removal rather than omission;
9. bind local account/cloud mapping to authenticated user before any upload;
10. make cloud recovery fail conservative when protected/reserved data is incomplete;
11. extend backup/restore handling for any new Phase 7 binding/snapshot metadata without exposing another user's binding;
12. rerun local/static Phase 7 tests before touching Neon.

## Step 7B — isolated Neon migration/rollback proof

If migration 015 is implemented:

1. create/use a fresh isolated Neon test branch from current production boundary 014;
2. verify baseline is exactly 014 before applying anything;
3. apply 015 only;
4. test owned snapshot insert/update/read, RLS, audit and archive behavior;
5. prove cross-user access fails;
6. verify `opening_balance` remains the starting basis and snapshot data is separate;
7. rollback 015→014;
8. compare resulting schema with the 014 parent and require an empty intended diff;
9. record branch ID and all evidence;
10. do not promote to production while any test fails.

## Step 7C — final code/data audit before production promotion

After Step 7B is green:

- audit the entire `main...Phase7` diff again;
- verify no Phase 8 work entered;
- verify `app.js` exact blob;
- verify sealed Phase 6 Worker exact blob;
- verify no destructive snapshot omission remains;
- verify local user binding and account switch tests;
- verify conservative protection recovery;
- verify all Phase 7 unit/behavior tests.

## Step 7D — production database promotion if 015 is required

Only after isolated rollback proof:

- create a pre-promotion Neon recovery branch from production 014;
- verify production still 014 and contains no synthetic test data;
- apply 015 in controlled chronological order;
- verify production schema and readiness expectations;
- update Worker readiness boundary from 014 to 015 only in the same bounded Phase 7 promotion sequence and only after database promotion is proven;
- verify Cloudflare → Hyperdrive → Neon live path;
- never report production 015 until directly verified.

## Step 7E — final exact-head Phase 2→7 merge gate

After all code/database corrections are complete:

1. update Phase 7 checkpoint/docs and PR #36 body to the final exact head;
2. confirm Phase 7 branch is 0 behind protected `main`;
3. run all six on one exact head:
   - `phase2`;
   - `cloudflare-phase3`;
   - `phase4-neon`;
   - `phase5-database-safety`;
   - `phase6`;
   - `phase7`;
4. inspect Phase 7 job steps/logs, not only green labels;
5. verify live Cloudflare preview and authenticated/fail-closed API behavior;
6. verify exact Neon production migration/boundary separately;
7. verify no synthetic test data leaked to production;
8. perform one final whole-diff audit;
9. only then add `phase7` to ruleset `Protect main` as the sixth required check;
10. re-read ruleset and confirm no bypass;
11. mark PR #36 Ready only after all above are green;
12. re-read current `main`, exact PR head and compare immediately before merge;
13. merge only with the expected exact head SHA.

## Step 7F — post-merge and archive gate

After implementation merge:

1. verify all required checks again on exact new `main`;
2. verify live Cloudflare production;
3. verify Neon production migration and owned-account snapshot behavior;
4. verify app.js/sealed Phase6 hashes;
5. create a documentation-only Phase 7 completion archive PR;
6. update `docs/BUILD_ARCHIVE.md` through Phase 7 only after implementation is proven;
7. require protected checks again on archive head;
8. merge archive normally;
9. verify post-archive main again;
10. only then scope Phase 8.

# Non-negotiable anti-break rules

- Never write directly to protected `main`.
- Never force-push Phase 7.
- Re-fetch `main`, branch head and current file blob SHA immediately before each write.
- Treat concurrent branch changes as a stop-and-re-audit event.
- One bounded correction at a time.
- Do not modify protected `app.js`.
- Do not modify the sealed Phase 6 Worker bytes.
- Do not weaken Phase 2→6 tests/workflows to make Phase 7 pass.
- Do not replace the sealed transaction engine with a parallel balance engine.
- Preserve `opening_balance` as the starting basis; never reuse it as a live snapshot.
- Absence in one device snapshot is never permission to archive a remote account.
- Remote archive requires explicit owned user action.
- Bind browser/cloud state to authenticated user before upload.
- On incomplete protection data, fail conservative and never overstate spendable money.
- Internal transfers must never count as spending.
- Physical DELETE of financial records remains prohibited.
- Do not call bounded Phase 7 unreserved balance `Actually Safe to Spend`.
- Do not pull Phase 8 transaction persistence/expense intelligence forward unless a narrowly documented dependency is unavoidable; current correction should use a balance snapshot, not transaction history.
- Do not create a database migration merely for convenience; migration 015 is justified only if the separate current-balance snapshot design remains necessary after final schema design.
- If migration 015 exists, it requires isolated forward/rollback proof before production.
- Do not promote production migration or readiness claims without direct verification.
- Old green workflow runs are regression history only after any head change.
- Do not add `phase7` to Protect main until the final Phase 7 check is stable and green.
- Do not merge or start Phase 8 until Phase 7 is implementation-green, post-merge green and archived.

# Memory / resume instructions

Treat this file as the durable current Phase 7 project memory.

On resume or in a new chat, read in this order:

1. `docs/PRODUCT_CONTRACT.md`;
2. `docs/BUILD_ARCHIVE.md`;
3. `docs/PHASE6_COMPLETION_ARCHIVE.md`;
4. `docs/PHASE6_IDENTITY_ENTITLEMENT_CHECKPOINT.md`;
5. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` for implementation history/detail;
6. **`docs/PHASE7_RECONCILIATION_AUDIT.md` last — this file controls current Phase 7 status and blockers**;
7. PR #36 live metadata and whole diff;
8. ruleset `21530843`;
9. live Neon production migration and any Phase 7 test branch before database claims.

Never assume a recorded SHA is still current. Always re-fetch live state before continuing.

# Audit decision

**Phase 1→6 baseline: GREEN / PROTECTED / ARCHIVED.**

**Phase 7 reconciliation with current main: GREEN.**

**First-Time Setup preservation: GREEN.**

**Core-balance pure arithmetic and transfer-not-spending logic: GREEN.**

**Phase 6 sealed Worker preservation: GREEN.**

**Exact-head Phase 2→7 regression CI at `cd859dad…`: GREEN.**

**Phase 7 cloud persistence/data-integrity design: RED / BLOCKED.**

Blockers:

1. current balance overwrites `opening_balance`;
2. device snapshot omission can archive valid cloud accounts;
3. cloud recovery can overstate spendable money when protected data is incomplete;
4. local browser money/cloud-map state is not bound to authenticated user before upload.

**Merge decision: DO NOT MERGE.**

**Next permitted work: Step 7A persistence-contract hardening.**

**Phase 8: PROHIBITED until Phase 7 is corrected, final exact-head green, merged, post-merge green and archived.**