# GENEVIEVE Budget — Phase 7 Reconciliation Audit and Continuation Authority

Date: 27 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Protected base branch: `main`
Authoritative protected `main` at this audit: `156a36e9ba1b6a2452012c6915341f0184baa284`
Phase 7 branch: `phase7-first-time-setup`
Phase 7 PR: #36 — DRAFT / NOT MERGED
Protect-main ruleset: `21530843`
Current production migration boundary before Phase 7 promotion: `014`
Protected `app.js` Git blob: `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`
Sealed Phase 6 Worker Git blob: `670159e8b820f597ed2376c246df04e69a244988`

## Current status

**PHASE 7 — CORE ACCOUNTS & BALANCES — RECONCILED / SUBSTANTIAL IMPLEMENTATION PRESENT / DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

**DO NOT MERGE PR #36. DO NOT ADD `phase7` TO PROTECT MAIN YET. DO NOT START PHASE 8.**

This file is the durable current continuation authority. The compact `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` points here and carries the same blocked status.

Do not assume any recorded branch-head SHA remains current. Re-fetch live state before every next action.

## Chronology and reconciliation

The old Phase 7 branch began from the Phase 6 archive boundary `06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`.

After the Phase 6 build-archive correction merged through protected main as PR #38, authoritative main became `156a36e9ba1b6a2452012c6915341f0184baa284`.

Phase 7 was reconciled without history rewrite by normal two-parent merge commit `35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`, with parents old Phase 7 head `720cd88c8c0a9e4a8ade52aaeb7ba9dd7f28b51b` and current main `156a36e9ba1b6a2452012c6915341f0184baa284`.

No force push was used.

A substantial implementation candidate existed at `5ae338e2870055575216b7ddba7e5c369f8295f9`.

At audited exact head `cd859dad2830d47298ac57331627d72e27668d36`, the branch was 55 commits ahead / 0 behind main / 21 changed files and all six Phase 2→7 workflows passed. Manual audit then found four material data-integrity defects not covered by the tests. Later commits only correct documentation/checkpoint status, so `cd859dad…` is regression evidence, not merge authority.

## Authoritative Phase 7 scope

Protected `docs/BUILD_ARCHIVE.md` defines Phase 7 as **Core accounts and balances**:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers between the user's own accounts are not spending;
4. spendable balance is separated from protected/reserved balance.

The eight-screen First-Time Setup remains the onboarding entry component.

Full `Actually Safe to Spend` remains Phase 13. Do not pull later income/obligation/forecast logic forward.

## Complete audited path list

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

## File-by-file audit decisions

### `.github/workflows/phase6-identity.yml`

Acceptable compatibility adaptation. It still runs `verify:phase6`, proves migrations 008→014, trusted-support/Professional separation, exact sealed Phase 6 Worker hash, exact `app.js` hash and live Phase 6 `/ready` at migration 014. Do not weaken it.

### `.github/workflows/phase7-first-time-setup.yml`

Good regression gate for onboarding, plan integrity, backup, core-balance UI/API fragments, self-scope SQL fragments, hashes, Cloudflare assets, unauthenticated 401 and preserved readiness. Defect: it does not behaviorally test the four unsafe sync/recovery cases below.

### `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`

Now compact and correctly audit-blocked. It points to this file.

### `docs/PHASE7_RECONCILIATION_AUDIT.md`

Current durable continuation authority.

### `package.json`

Sound nested verification structure. `test:phase7` runs setup + core balances and `verify:phase7` remains after `verify:phase6`. No dependency-version change.

### `phase3-cloudflare.test.mjs`

Acceptable: adapts source assertions to Phase 7 Worker composition while preserving sealed Phase 6 health/readiness/static behavior.

### `phase6-identity-entitlement.test.mjs`

Acceptable: behavior still goes through composed Worker exports; static Phase 6 source assertions target the sealed Worker.

### `phase6-lifecycle-roles.test.mjs`

Acceptable: lifecycle/static checks target exact sealed Phase 6 source. Do not weaken.

### `phase7-backup-bridge.js`

Good setup/legacy local backup continuity. Concern: cloud ownership/mapping metadata has no safe authenticated-user-bound restore contract yet.

### `phase7-core-balances-bridge.js`

Good bounded UI and same-origin persistence bridge, but blocked because it treats local device state as full cloud truth, lacks authenticated-user binding, can show spendable after incomplete protection recovery, and sends computed current balance to the server field problem below.

### `phase7-core-balances.mjs`

Pure arithmetic is sound for bounded Phase 7: sealed transaction model reuse, transfer-not-spending, liabilities, liquid assets, protected aggregate and spendable classification. Do not label it full Safe-to-Spend.

### `phase7-core-balances.test.mjs`

Good existing tests for transfer movement, spending exclusion, liabilities, protected arithmetic, payload validation, self-scoped read and unauthenticated fail-closed. Missing behavioral tests for opening-balance immutability, multi-device omission, reset/restore, explicit archive, authenticated-user local binding and incomplete-protection recovery.

### `phase7-first-time-setup-model.mjs`

Sound. Preserve exact bounded onboarding/planning role.

### `phase7-first-time-setup.js`

Sound onboarding entry: eight screens, incomplete state isolation, Screen-8 financial commit, multiple liabilities, bill methods, emergency/savings and established-user bypass. Not source of current server defects.

### `phase7-first-time-setup.test.mjs`

Good preserved onboarding regression coverage plus Phase 7 linkage. Keep it.

### `phase7-plan-integrity-bridge.js`

Sound preserved due-date/pay-date/target support. Do not expand into later phases.

### `scripts/link-phase7-first-time-setup.mjs`

Structurally correct order: `Phase 2 data → Phase 2 subscriptions/savings → setup → plan integrity → backup → core balances → protected app.js`. Four Phase 7 assets cached; app.js untouched.

### `scripts/verify-phase7-dist.mjs`

Good static artifact/hash/order verification. It cannot replace behavioral sync safety tests.

### `src/phase7-account-routes.mjs`

Good authenticated transaction boundary, self-scope, validation, sealed account types, protected-data reads, RLS/audit inheritance and no physical DELETE. Critical defects: current computed balance is written into `accounts.opening_balance`; omitted local accounts are auto-soft-archived.

### `src/worker-phase6-sealed.mjs`

Must remain exact blob `670159e8b820f597ed2376c246df04e69a244988`.

### `src/worker.mjs`

Acceptable small composition entrypoint: Phase 7 account routes first, delegate all else to sealed Phase 6, re-export Phase 6 named exports. Keep bounded.

# Four merge blockers

## BLOCKER A — current balance overwrites original opening balance

Sealed Phase 2 says opening balance remains the starting point. Current Phase 7 sync writes computed current balance into `public.accounts.opening_balance`. This conflicts with later transaction persistence and can double-count/corrupt history.

**Correction:** preserve opening balance and design a separate owned current-balance snapshot. Current schema lacks such a field, so the chosen cloud-recovery design likely needs a genuine Phase 7 migration 015. If confirmed: numeric snapshot, appropriate timestamp/version, preserve RLS/audit/archive, complete 015→014 rollback, isolated Neon forward/reverse proof, production/readiness update only after verified promotion.

## BLOCKER B — one device omission can archive valid cloud accounts

Current full-snapshot sync archives active server accounts absent locally. Unsafe for stale/second device, local reset, older restore or incomplete local truth.

**Correction:** make sync non-destructive upsert. Remote archive only through explicit owned account-removal action after user confirmation. Add stale-device/reset/restore/explicit-archive tests.

## BLOCKER C — cloud recovery can overstate spendable

Recovery restores account balances + emergency buffer but not local bill-reserve/protected-savings records. Missing protection can be treated as zero and inflate spendable.

**Correction:** fail conservative. Either persist/recover minimal verified protected aggregate or withhold spendable until protection is restored/confirmed. Do not pull full later bill/savings persistence forward.

## BLOCKER D — browser money state is not authenticated-user-bound before upload

Global localStorage money/map can survive sign-out. A different authenticated user can receive new records derived from the previous user's local device state even though RLS correctly blocks cross-user server-row access.

**Correction:** resolve current application user, bind/namespace cloud mapping/state before upload, make legacy local adoption explicit/safe, and fail closed on shared-device account switching/restore. Add cross-account device tests.

# Verified foundations — do not rewrite

- sealed Phase 2 transfer logic;
- opening-balance semantic contract;
- existing account/transaction ownership constraints;
- Phase 5 RLS/cross-user/soft-archive/audit;
- migration 008 managed-user `financial_settings` creation;
- exact sealed Phase 6 Worker;
- exact protected `app.js`.

# Directions to self — build and exact point

Build: **GENEVIEVE Budget Phase 7 — Core Accounts & Balances**, preserving First-Time Setup as onboarding entry.

Current point:

1. Phase 1→6 protected/live/green/archived.
2. Main at audit `156a36e9ba1b6a2452012c6915341f0184baa284`.
3. Phase 7 reconciled normally; no force push.
4. Substantial implementation present.
5. Audited head `cd859dad…` was 55 ahead/0 behind/21 files and all six Phase 2→7 workflows passed.
6. Manual audit found four material defects not caught by CI.
7. Later commits are documentation checkpoint corrections only, so old green is regression history.
8. PR #36 stays Draft/unmerged.
9. Protect main remains Phase 2→6 only; do not add Phase 7 yet.
10. Next action begins by re-fetching live branch head/main.

# Directions to self — next chronological sequence

## Step 7A — persistence-contract hardening

1. re-fetch main/head and stop on concurrent change;
2. design separate current-balance snapshot preserving `opening_balance`;
3. add migration 015 only if final design confirms need;
4. add complete 015→014 rollback;
5. add failing-first opening-balance test;
6. make sync upsert-only;
7. add explicit owned soft-archive action;
8. bind browser/cloud state to authenticated user;
9. make incomplete protection recovery conservative;
10. harden backup/restore for user binding/cloud map;
11. run Phase 7 tests before Neon promotion work.

## Step 7B — isolated Neon proof if 015 exists

- fresh isolated branch from exact production 014;
- verify baseline 014;
- apply 015 only;
- test snapshot ownership/RLS/audit/archive;
- prove cross-user denial;
- prove opening balance unchanged;
- rollback 015→014;
- require clean intended schema comparison;
- record branch ID/evidence;
- no production promotion on failure.

## Step 7C — whole-diff re-audit

After isolated proof: audit entire diff; confirm no Phase 8; verify app.js/sealed worker; verify all four blocker tests and no omission-based archive.

## Step 7D — production promotion if 015 required

Pre-promotion recovery branch from production 014; verify production/no synthetic data; apply 015; verify schema; update readiness only after DB proof; verify Cloudflare→Hyperdrive→Neon; never claim 015 before direct verification.

## Step 7E — final exact-head Phase 2→7 gate

Update docs/PR to exact final head; ensure 0 behind; run `phase2`, `cloudflare-phase3`, `phase4-neon`, `phase5-database-safety`, `phase6`, `phase7` on one exact head; inspect logs; verify live Cloudflare/API and Neon boundary; no synthetic data; final whole-diff audit; only then add `phase7` to Protect main; verify no bypass; only then mark PR Ready; re-read main/head immediately before exact-head merge.

## Step 7F — post-merge/archive

Post-merge required checks, Cloudflare, Neon and hashes; docs-only Phase 7 archive PR; update BUILD_ARCHIVE through Phase 7; protected archive checks; merge + post-archive verification; only then scope Phase 8.

# Non-negotiable anti-break rules

- no direct main writes;
- no force push;
- re-fetch head/blob before writes;
- concurrent change = stop/re-audit;
- one bounded correction at a time;
- app.js immutable;
- sealed Phase 6 Worker immutable;
- do not weaken earlier gates;
- no parallel transaction/balance engine;
- opening_balance stays starting basis;
- omission is not archive authority;
- remote archive requires explicit owned action;
- browser cloud state must be user-bound;
- incomplete protected data = conservative, never inflated spendable;
- transfers never spending;
- no physical financial DELETE;
- bounded Phase 7 balance is not full Safe-to-Spend;
- prefer balance snapshot over pulling Phase 8 transaction history forward;
- migration only for genuine need;
- if 015, isolated rollback proof mandatory;
- no production/readiness claim without direct verification;
- any head change invalidates prior green as merge authority;
- do not add phase7 to Protect main until stable final green;
- no merge/Phase 8 until Phase 7 corrected, final green, merged, post-merge green and archived.

# Memory / resume order

1. `docs/PRODUCT_CONTRACT.md`
2. `docs/BUILD_ARCHIVE.md`
3. `docs/PHASE6_COMPLETION_ARCHIVE.md`
4. `docs/PHASE6_IDENTITY_ENTITLEMENT_CHECKPOINT.md`
5. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`
6. **`docs/PHASE7_RECONCILIATION_AUDIT.md` last — current authority**
7. live PR #36 whole diff
8. ruleset `21530843`
9. live Neon production/test branches before database claims

# Audit decision

**Phase 1→6: GREEN / PROTECTED / ARCHIVED.**

**Phase 7 reconciliation: GREEN.**

**First-Time Setup preservation: GREEN.**

**Core-balance arithmetic / transfer-not-spending: GREEN.**

**Sealed Phase 6 Worker preservation: GREEN.**

**Phase 2→7 CI at audited `cd859dad…`: GREEN regression evidence.**

**Phase 7 cloud persistence/data integrity: RED / BLOCKED.**

Blockers: opening-balance corruption risk; omission-based cloud archive; incomplete-protection spendable overstatement; missing authenticated-user binding of browser cloud state.

**Merge decision: DO NOT MERGE.**

**Next permitted work: Step 7A persistence-contract hardening.**

**Phase 8 prohibited until Phase 7 is corrected, final exact-head green, merged, post-merge green and archived.**