# GENEVIEVE Budget — Phase 7 Reconciliation Audit and Continuation Authority

Date: 27 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Protected base branch: `main`
Authoritative protected `main` at audit: `156a36e9ba1b6a2452012c6915341f0184baa284`
Phase 7 branch: `phase7-first-time-setup`
Phase 7 PR: #36 — DRAFT / NOT MERGED
Protect-main ruleset: `21530843`
Production boundary before Phase 7 promotion: migration `014`
Protected `app.js` blob: `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`
Sealed Phase 6 Worker blob: `670159e8b820f597ed2376c246df04e69a244988`

## Status

**PHASE 7 — CORE ACCOUNTS & BALANCES — DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

**Do not merge PR #36. Do not add `phase7` to Protect main. Do not start Phase 8.**

This file is the current durable continuation authority. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` is the compact checkpoint and points here.

Always re-fetch live GitHub/Neon state before continuing. Recorded SHAs are evidence, not an assumption that the branch is unchanged.

## Chronology

Phase 1→6 are protected, production-live, green and archived.

After the Phase 6 build-archive correction merged through protected main as PR #38, authoritative main became `156a36e9ba1b6a2452012c6915341f0184baa284`.

Phase 7 was reconciled with that main by normal two-parent merge commit `35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`; no force push/history rewrite.

A substantial Phase 7 implementation candidate existed at `5ae338e2870055575216b7ddba7e5c369f8295f9`.

At audited exact head `cd859dad2830d47298ac57331627d72e27668d36`, the branch was 55 ahead / 0 behind main / 21 changed files. All six Phase 2→7 workflows passed on that exact head. Manual audit then found four material data-integrity defects not covered by those tests. Later commits only correct documentation/checkpoint state; therefore the green `cd859dad…` result is regression evidence, not merge authority.

## Authoritative Phase 7 scope

Phase 7 = **Core Accounts & Balances**:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers are not spending;
4. spendable balance separated from protected/reserved balance.

The eight-screen First-Time Setup remains the Phase 7 onboarding entry.

Full `Actually Safe to Spend` remains Phase 13.

## Audited implementation files

- `.github/workflows/phase6-identity.yml` — acceptable sealed-Phase-6 preservation adaptation; do not weaken.
- `.github/workflows/phase7-first-time-setup.yml` — good regression/static/live gate but missing four required behavioral safety tests.
- `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` — compact audit-blocked checkpoint.
- `docs/PHASE7_RECONCILIATION_AUDIT.md` — current authority.
- `package.json` — nested Phase 7 after Phase 6; sound.
- `phase3-cloudflare.test.mjs` — acceptable compatibility adaptation.
- `phase6-identity-entitlement.test.mjs` — preserves behavioral auth checks through composed Worker and sealed source assertions.
- `phase6-lifecycle-roles.test.mjs` — preserves sealed lifecycle/source checks.
- `phase7-backup-bridge.js` — good local backup continuity; needs safe user-bound cloud metadata restore contract.
- `phase7-core-balances-bridge.js` — good bounded UI/API bridge but contains/participates in the four persistence blockers.
- `phase7-core-balances.mjs` — sound bounded arithmetic; reuses sealed transaction model.
- `phase7-core-balances.test.mjs` — useful but missing blocker-specific behavioral tests.
- `phase7-first-time-setup-model.mjs` — sound; preserve.
- `phase7-first-time-setup.js` — sound eight-screen onboarding; preserve.
- `phase7-first-time-setup.test.mjs` — good preserved regression coverage.
- `phase7-plan-integrity-bridge.js` — sound bounded due-date/pay-date support; preserve.
- `scripts/link-phase7-first-time-setup.mjs` — correct Phase 2 → four Phase 7 runtimes → protected app.js order.
- `scripts/verify-phase7-dist.mjs` — good static artifact/order/hash proof; not a substitute for behavioral data-integrity tests.
- `src/phase7-account-routes.mjs` — authenticated/self-scoped/RLS-aware but contains opening-balance and omission-archive defects.
- `src/worker-phase6-sealed.mjs` — exact sealed Phase 6 Worker; immutable.
- `src/worker.mjs` — acceptable small composition entrypoint; keep bounded.

## Verified foundations

- sealed Phase 2 transaction model handles income/expense/transfer;
- transfers subtract source/add destination and are excluded from spending totals;
- Phase 2 contract says opening balance remains the account starting point;
- existing Neon schema provides owned accounts/transactions, financial settings, bill provisions, savings, debts, RLS, ownership FKs, soft archive and audit;
- migration 008 guarantees managed users receive `financial_settings`;
- Phase 6 Worker preserved exact;
- protected `app.js` preserved exact.

# Merge blockers

## A — current balance overwrites `opening_balance`

Current Phase 7 sync writes computed current balance into `public.accounts.opening_balance`.

This violates the sealed meaning of opening balance and is not forward-compatible with later transaction persistence.

**Fix:** preserve opening balance and design the smallest separate owned current-balance snapshot mechanism. Current schema has no such field, so the chosen recovery design likely requires genuine Phase 7 migration 015. If confirmed: numeric snapshot + appropriate timestamp/version, retain ownership/RLS/audit/archive, complete 015→014 rollback, isolated Neon forward/reverse proof, production/readiness update only after verified promotion.

## B — one device omission can archive valid cloud accounts

Current full-snapshot sync soft-archives active server accounts absent from one local device.

Unsafe for stale/second device, reset, older restore or incomplete local truth.

**Fix:** sync becomes non-destructive upsert. Remote soft archive only through explicit owned user account-removal action after confirmation. Add stale-device/reset/restore/explicit-archive tests.

## C — cloud recovery can overstate spendable

Account recovery restores account balances + emergency buffer, but not local bill-reserve/protected-savings data. Missing protection can be treated as zero.

**Fix:** fail conservative. Either recover minimal verified protected aggregate or withhold spendable until protection is restored/confirmed. Do not pull full later bill/savings persistence forward.

## D — local browser money state is not authenticated-user-bound

Global localStorage money/cloud map can survive sign-out. A different authenticated user can receive inserts derived from previous local device data even though server RLS correctly blocks direct cross-user rows.

**Fix:** resolve current app user, bind/namespace local cloud metadata/state before upload, make legacy local adoption explicit/safe, fail closed on shared-device account switching/restore. Add cross-account device tests.

# Directions to self — exact build and point

Build: **GENEVIEVE Budget Phase 7 — Core Accounts & Balances**, preserving First-Time Setup as onboarding entry.

Current point:

1. Phase 1→6 protected/live/green/archived.
2. Phase 7 reconciled to current main normally.
3. Substantial implementation present.
4. Prior audited exact head `cd859dad…` passed all six Phase 2→7 workflows.
5. Manual audit found four material data-integrity blockers.
6. Later commits are docs-only checkpoint corrections; prior green is regression history.
7. PR #36 stays Draft/unmerged.
8. Protect main remains Phase 2→6 only.
9. **Next work is Step 7A; not merge work.**

# Directions to self — next chronological sequence

## Step 7A — persistence-contract hardening

1. re-fetch current main/head; stop/re-audit on concurrent change;
2. design separate current-balance snapshot preserving opening balance;
3. add migration 015 only if final design confirms necessity;
4. add complete 015→014 rollback;
5. add failing-first opening-balance test;
6. make sync upsert-only;
7. add explicit owned soft-archive action;
8. bind browser/cloud state to authenticated user;
9. make incomplete protection recovery conservative;
10. harden backup/restore for user binding/cloud map;
11. run Phase 7 tests before Neon promotion work.

## Step 7B — isolated Neon proof if migration 015 exists

- fresh isolated branch from exact production 014;
- verify 014 baseline;
- apply 015 only;
- test snapshot ownership/RLS/audit/archive;
- cross-user denial;
- opening balance unchanged;
- rollback 015→014;
- clean intended schema comparison;
- record branch ID/evidence;
- no production promotion on any failure.

## Step 7C — whole-diff re-audit

Audit entire branch again after fixes. Confirm no Phase 8, app.js drift, sealed Worker drift or omitted blocker test.

## Step 7D — production promotion if 015 required

Create pre-promotion recovery branch from production 014; verify production/no synthetic data; apply 015; verify schema; update readiness only after database proof; verify Cloudflare→Hyperdrive→Neon; never claim 015 without direct evidence.

## Step 7E — final exact-head Phase 2→7 gate

- update docs/PR to final exact head;
- 0 behind main;
- all six checks on same exact head: phase2, cloudflare-phase3, phase4-neon, phase5-database-safety, phase6, phase7;
- inspect logs/live Cloudflare/API;
- direct Neon boundary verification;
- no synthetic test data;
- final whole-diff audit;
- only then add phase7 to Protect main;
- verify no bypass;
- only then mark PR Ready;
- re-read main/head immediately before exact-head merge.

## Step 7F — post-merge/archive

Post-merge all checks/live Cloudflare/Neon/hashes; docs-only Phase 7 archive PR; BUILD_ARCHIVE through Phase 7; protected archive checks; merge + post-archive verification; only then Phase 8.

# Anti-break rules

- no direct main writes;
- no force push;
- re-fetch head/blob before every write;
- concurrent change = stop/re-audit;
- one bounded correction at a time;
- app.js immutable;
- sealed Phase 6 Worker immutable;
- never weaken earlier gates;
- no parallel transaction/balance engine;
- opening_balance is starting basis, not live snapshot;
- omission is not archive authority;
- remote archive requires explicit owned action;
- browser cloud state must be authenticated-user-bound;
- incomplete protected data = conservative, never inflated spendable;
- transfers never spending;
- no physical financial DELETE;
- bounded Phase 7 balance is not full Safe-to-Spend;
- prefer balance snapshot over pulling Phase 8 transaction history forward;
- migration only for genuine need;
- if 015, isolated rollback proof mandatory;
- no production/readiness claim without direct verification;
- every head change invalidates old green as merge authority;
- do not add phase7 to Protect main until stable final green;
- no merge/Phase 8 until Phase 7 corrected, final exact-head green, merged, post-merge green and archived.

# Memory / resume order

1. `docs/PRODUCT_CONTRACT.md`
2. `docs/BUILD_ARCHIVE.md`
3. `docs/PHASE6_COMPLETION_ARCHIVE.md`
4. `docs/PHASE6_IDENTITY_ENTITLEMENT_CHECKPOINT.md`
5. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`
6. **`docs/PHASE7_RECONCILIATION_AUDIT.md` last — current authority**
7. live PR #36 whole diff
8. ruleset 21530843
9. live Neon production/test state before database claims

# Audit decision

**Phase 1→6: GREEN / PROTECTED / ARCHIVED.**

**Phase 7 reconciliation: GREEN.**

**First-Time Setup preservation: GREEN.**

**Core-balance arithmetic / transfer-not-spending: GREEN.**

**Sealed Phase 6 Worker preservation: GREEN.**

**Phase 2→7 CI at audited `cd859dad…`: GREEN regression evidence.**

**Phase 7 cloud persistence/data integrity: RED / BLOCKED.**

**Merge decision: DO NOT MERGE.**

**Next permitted work: Step 7A persistence-contract hardening.**

**Phase 8 prohibited until Phase 7 is corrected, final exact-head green, merged, post-merge green and archived.**