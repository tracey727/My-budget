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

**PHASE 7 — CORE ACCOUNTS & BALANCES — RECONCILED / SUBSTANTIAL IMPLEMENTATION PRESENT / DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

**DO NOT MERGE PR #36. DO NOT ADD `phase7` TO PROTECT MAIN YET. DO NOT START PHASE 8.**

This file is the current continuation authority for Phase 7. `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md` carries the same compact audit-blocked status and points here for the controlling detail.

Because every documentation correction changes the branch SHA, **never copy a head SHA from this prose and assume it is current. Re-fetch the live branch before every next action.** The final Phase 2→7 merge gate must always be tied to the live exact head after the final corrective commit.

## Chronology repaired before this audit

The old Phase 7 branch was originally based on Phase 6 archive boundary:

`06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`

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

At audited head `cd859dad2830d47298ac57331627d72e27668d36`, the branch was 55 commits ahead and 0 behind current main with 21 changed files. All six Phase 2→7 workflows passed there. Manual audit then found the four material data-integrity defects below. Later commits are documentation-only checkpoint corrections and therefore make `cd859dad…` regression evidence rather than current merge authority.

## Exact implementation paths audited

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

At the implementation audit point:

- no Phase 8 implementation existed;
- no migration `015` existed;
- protected `app.js` was unchanged;
- exact Phase 6 Worker was preserved in a sealed module;
- Phase 7 remained Draft/unmerged.

## Authoritative Phase 7 scope

Protected `docs/BUILD_ARCHIVE.md` defines Phase 7 as:

**Phase 7 — Core accounts and balances**

Required responsibilities:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers between user's own accounts are not spending;
4. spendable balance is separated from protected/reserved balance.

The eight-screen First-Time Setup remains the onboarding entry component. Full `Actually Safe to Spend` remains Phase 13 and must not be pulled forward.

# Complete file audit

## `.github/workflows/phase6-identity.yml`

Acceptable compatibility adaptation:

- still runs `verify:phase6`;
- still proves 008→014 chronology and Phase 6 security roles/lifecycle;
- hash-pins the sealed former Phase 6 Worker;
- hash-pins protected `app.js`;
- verifies live Phase 6 `/ready` at migration 014.

Do not weaken this workflow to make Phase 7 pass.

## `.github/workflows/phase7-first-time-setup.yml`

Good current coverage:

- all eight onboarding screens;
- Smooth/target and plan-integrity fragments;
- backup continuity;
- core-balance UI/API fragments;
- self-scope SQL fragments;
- no migration 015 in current implementation;
- sealed Worker/app hashes;
- four Phase 7 assets live on Cloudflare preview;
- unauthenticated API 401;
- preserved `/ready` Phase 6 / migration 014.

Defect: current gate does not exercise the four failure modes below. It proves unsafe code can run, not that multi-device/recovery semantics are safe.

## `docs/PHASE7_FIRST_TIME_SETUP_CHECKPOINT.md`

Now correctly marked data-integrity audit blocked. It is the compact checkpoint; this audit controls detail.

## `docs/PHASE7_RECONCILIATION_AUDIT.md`

Current durable continuation authority.

## `package.json`

Sound:

- `test:phase7` runs setup + core balances;
- `verify:phase7` is nested after `verify:phase6`;
- no dependency-version change.

## `phase3-cloudflare.test.mjs`

Acceptable: recognises Phase 7 Worker composition while checking sealed Phase 6 health/readiness/static behavior.

## `phase6-identity-entitlement.test.mjs`

Acceptable: behavioral imports pass through composed Worker; static Phase 6 source checks target the sealed Worker.

## `phase6-lifecycle-roles.test.mjs`

Acceptable: lifecycle/static source assertions inspect the exact sealed Worker. Do not weaken.

## `phase7-backup-bridge.js`

Good local setup/legacy backup continuity.

Concern: cloud ownership/mapping metadata does not yet have a safe authenticated-user-bound backup/restore contract. Must be fixed with browser ownership binding.

## `phase7-core-balances-bridge.js`

Good:

- Spendable vs Protected / reserved display;
- asset/debt separation;
- transfer-not-spending wording;
- full Safe-to-Spend deferred;
- same-origin credentialed API;
- incomplete-onboarding sync guard;
- device data retained on cloud failure;
- account recovery path.

Blocked because it:

- treats one device local list as full cloud truth;
- lacks authenticated-user binding of local state/map;
- can recover accounts/emergency while missing bill/protected-savings state and still show spendable;
- sends computed current balances to server code that writes them into `opening_balance`.

## `phase7-core-balances.mjs`

Pure arithmetic is sound for bounded Phase 7:

- reuses sealed transaction model;
- transfers preserve combined asset position;
- monthly spend counts only expense;
- credit/loan/BNPL liabilities;
- liquid bank/savings/cash;
- protected/reserved = emergency + bill reserve + protected savings;
- bounded spendable = liquid minus already-recorded protected/reserved.

Do not rename this full Safe-to-Spend.

## `phase7-core-balances.test.mjs`

Good current tests:

- transfer movement + no spending;
- liabilities;
- protected arithmetic;
- payload validation;
- self-scoped read;
- unauthenticated API fail-closed;
- incomplete onboarding/emergency-recovery source guards.

Missing mandatory tests:

- opening-balance immutability;
- multi-device stale snapshot;
- local reset/restore not remote delete;
- explicit archive only;
- authenticated-user local ownership binding;
- conservative incomplete-protection recovery;
- safe backup/restore of cloud binding/mapping.

## `phase7-first-time-setup-model.mjs`

Sound and preserved. Do not expand into later phases.

## `phase7-first-time-setup.js`

Sound onboarding entry:

- one screen at a time;
- incomplete setup isolated;
- financial commit only Screen 8;
- multiple accounts/liabilities;
- Smooth/target/emergency/savings;
- established-user bypass;
- preserves existing money-store fields.

Not source of current server defects.

## `phase7-first-time-setup.test.mjs`

Good preserved onboarding regression coverage plus core-balance linkage. Keep it.

## `phase7-plan-integrity-bridge.js`

Sound preserved Phase 7 planning support. Do not turn into Phase 11/12/13.

## `scripts/link-phase7-first-time-setup.mjs`

Structurally correct runtime order:

`Phase 2 data → Phase 2 subscriptions/savings → setup → plan integrity → backup → core balances → protected app.js`

All four Phase 7 assets are cached; app.js remains untouched.

## `scripts/verify-phase7-dist.mjs`

Good artifact/hash/order verification. Needs behavioral safety tests elsewhere; static fragments cannot prove safe sync semantics.

## `src/phase7-account-routes.mjs`

Good:

- uses sealed Phase 6 authenticated transaction boundary;
- no caller-authoritative user_id;
- SQL self-scope;
- sealed account types;
- payload validation;
- reads settings/bill reserves/protected savings;
- no physical DELETE;
- RLS/audit inheritance.

Critical defects:

1. current computed `balance` is written into `accounts.opening_balance`;
2. accounts omitted from one local full snapshot are auto-soft-archived.

## `src/worker-phase6-sealed.mjs`

Must remain exact blob:

`670159e8b820f597ed2376c246df04e69a244988`

## `src/worker.mjs`

Acceptable small composition entrypoint:

- Phase 7 account routes first;
- delegates all else to sealed Phase 6;
- re-exports Phase 6 named exports.

Keep bounded.

# Merge blockers

## BLOCKER A — current balance overwrites original opening balance

Sealed Phase 2 contract says opening balance remains the starting point for every account.

Sealed current balance calculation is opening balance plus linked transaction effects.

Phase 7 currently writes current computed balance into `public.accounts.opening_balance`. This will conflict with later transaction persistence and can double-count/corrupt history.

### Required correction

Preserve opening balance semantics. Design the smallest separate owned current-balance snapshot storage. The existing schema lacks a separate snapshot field, so the chosen recovery design likely requires a genuine Phase 7 schema extension.

If final design confirms this:

- migration `015` only;
- numeric snapshot, no floating point;
- timestamp/version as needed;
- preserve ownership/RLS/audit/archive;
- complete 015→014 rollback;
- isolated Neon forward/reverse proof;
- production/readiness boundary only updated after verified promotion.

## BLOCKER B — omission from one device can archive valid cloud accounts

Current full-snapshot sync soft-archives active server accounts missing locally.

Unsafe for stale/second device, reset, older restore or incomplete cloud truth.

### Required correction

Sync must be non-destructive upsert. Remote archive only through explicit owned account-removal action after user confirmation.

Tests: stale device, empty local state, older restore, explicit single archive, existing used-account restrictions.

## BLOCKER C — cloud recovery can overstate spendable

Recovery brings account balances + emergency buffer but not local bill reserves/protected savings. Missing protection can be treated as zero and inflate spendable.

### Required correction

Fail conservative. Either persist/recover minimal verified protected aggregate or withhold spendable until protection is restored/confirmed. Do not drag full later bill/savings persistence forward.

## BLOCKER D — local browser money state is not authenticated-user-bound

Global localStorage money/map can survive sign-out. A different signed-in user can receive inserts derived from the previous user's local state even though RLS correctly blocks cross-user server-row access.

### Required correction

Resolve current authenticated user and bind/namespace local cloud mapping/state before upload. Legacy unbound data adoption must be explicit/safe. Shared-device switching and restore must fail closed against cross-account upload.

# Verified foundations — do not rewrite

- sealed transaction transfer logic;
- Phase 2 account-opening-balance contract;
- existing account/transaction schema ownership constraints;
- Phase 5 RLS/cross-user/soft-archive/audit;
- migration 008 managed-user financial_settings creation;
- exact sealed Phase 6 Worker;
- exact protected `app.js`.

# Directions to self — what build are we doing?

**GENEVIEVE Budget Phase 7 — Core Accounts & Balances.**

Keep the existing First-Time Setup as onboarding entry.

Scope:

- multiple owned asset/liability accounts;
- persistent account/balance state;
- credit/loan/BNPL handling;
- transfers never spending;
- bounded spendable vs protected/reserved.

Not Phase 8 transaction intelligence/persistence, not later payday/bill/forecast/full Safe-to-Spend phases.

# Directions to self — exact point reached

1. Phase 1→6 are protected/live/green/archived.
2. Main at audit: `156a36e9ba1b6a2452012c6915341f0184baa284`.
3. Phase 7 reconciled normally with main; no force push.
4. Substantial Phase 7 implementation exists.
5. At audited exact head `cd859dad2830d47298ac57331627d72e27668d36`, branch was 55 ahead / 0 behind / 21 files and all six Phase 2→7 checks passed.
6. Manual audit found four material defects not caught by those checks.
7. Later commits corrected documentation/checkpoint status only; old green head is regression evidence, not current merge authority.
8. PR #36 stays Draft/unmerged.
9. Protect main still requires Phase 2→6 only; do not add phase7 yet.
10. **Next action must begin by re-fetching the live branch head and main.**

# Directions to self — next chronological work

## Step 7A — persistence-contract hardening

1. re-fetch main/head and stop if concurrent change appears;
2. design separate current-balance snapshot storage preserving opening_balance;
3. add migration 015 only if final design confirms necessity;
4. add complete 015→014 rollback;
5. add failing-first opening-balance test;
6. make sync upsert-only;
7. add explicit owned soft-archive route/action;
8. bind browser/cloud state to authenticated user before upload;
9. make incomplete protection recovery conservative;
10. harden backup/restore for user binding/cloud mapping;
11. run Phase 7 tests before Neon promotion work.

## Step 7B — isolated Neon proof if 015 exists

- fresh isolated branch from exact production 014;
- verify baseline 014;
- apply 015 only;
- test snapshot ownership/RLS/audit/archive;
- prove cross-user denial;
- prove opening balance unchanged;
- rollback 015→014;
- require clean expected schema comparison;
- record Neon branch ID/evidence;
- no production promotion on failure.

## Step 7C — whole-diff re-audit

After isolated proof green, re-audit every Phase 7 changed file and ensure no Phase 8, app.js or sealed-worker drift; verify all four blocker tests.

## Step 7D — production promotion if 015 required

- pre-promotion recovery branch from production 014;
- verify production 014/no synthetic data;
- apply 015;
- verify schema;
- update readiness boundary only after DB promotion is proven;
- verify Cloudflare→Hyperdrive→Neon;
- never claim 015 without direct verification.

## Step 7E — final exact-head merge gate

- docs/PR body to exact final head;
- branch 0 behind main;
- phase2, cloudflare-phase3, phase4-neon, phase5-database-safety, phase6, phase7 all green on one exact head;
- inspect job logs;
- live Cloudflare/API verification;
- direct Neon boundary verification;
- no synthetic data;
- final whole-diff audit;
- only then add phase7 to Protect main;
- verify ruleset no bypass;
- only then mark PR Ready;
- re-read main/head immediately before merge;
- merge only exact expected head.

## Step 7F — post-merge/archive

- post-merge all required checks;
- live Cloudflare;
- Neon production snapshot/migration;
- app.js/sealed worker hashes;
- docs-only Phase 7 archive PR;
- update BUILD_ARCHIVE through Phase 7;
- protected checks on archive;
- merge + post-archive verify;
- only then Phase 8.

# Non-negotiable anti-break rules

- no direct main writes;
- no force push;
- re-fetch head/blob before writes;
- concurrent change = stop/re-audit;
- one bounded correction at a time;
- app.js immutable;
- sealed Phase 6 Worker immutable;
- never weaken earlier gates;
- no parallel transaction/balance engine;
- opening_balance is starting basis, not snapshot;
- omission is not archive permission;
- remote archive requires explicit owned action;
- browser cloud state must be user-bound;
- incomplete protection = conservative, never inflated spendable;
- transfers never spending;
- no physical financial DELETE;
- bounded Phase 7 balance is not full Safe-to-Spend;
- prefer balance snapshot over pulling Phase 8 transactions forward;
- migration only for genuine need;
- if 015, isolated rollback proof mandatory;
- no production/readiness claim without direct verification;
- every head change invalidates old green as merge authority;
- do not require phase7 in Protect main until stable/final green;
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
9. live Neon production/test branches before DB claims

Recorded SHAs are evidence only. Re-fetch live state.

# Audit decision

**Phase 1→6: GREEN / PROTECTED / ARCHIVED.**

**Phase 7 reconciliation: GREEN.**

**First-Time Setup preservation: GREEN.**

**Core-balance arithmetic / transfer-not-spending: GREEN.**

**Sealed Phase 6 Worker preservation: GREEN.**

**Phase 2→7 CI at audited `cd859dad…`: GREEN regression evidence.**

**Phase 7 cloud persistence/data integrity: RED / BLOCKED.**

Blockers:

1. current balance overwrites `opening_balance`;
2. snapshot omission can archive valid cloud accounts;
3. cloud recovery can overstate spendable with incomplete protected data;
4. browser money/cloud-map state is not authenticated-user-bound.

**Merge decision: DO NOT MERGE.**

**Next permitted work: Step 7A persistence-contract hardening.**

**Phase 8 prohibited until Phase 7 is corrected, final exact-head green, merged, post-merge green and archived.**