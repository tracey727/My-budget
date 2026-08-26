# GENEVIEVE Budget — Phase 7 Current Checkpoint — Core Accounts & Balances

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 AUTHORITATIVE SCOPE IMPLEMENTED ON ISOLATED BRANCH / RECONCILED WITH CURRENT PROTECTED MAIN / FINAL EXACT-HEAD PHASE 2→7 GATE PENDING / DRAFT / NOT MERGED / NOT ARCHIVED.**

This checkpoint supersedes the earlier audit-blocked checkpoint.

The existing First-Time Setup work is preserved as the onboarding entry into Phase 7, but the phase is now governed by the corrected authoritative `docs/BUILD_ARCHIVE.md`: **Core accounts and balances**.

No Phase 8 work has started.

## Authoritative repository position

- repository: `tracey727/My-budget`
- protected base branch: `main`
- authoritative protected `main`: `156a36e9ba1b6a2452012c6915341f0184baa284`
- Phase 7 branch: `phase7-first-time-setup`
- draft implementation PR: `#36`
- original pre-reconciliation Phase 7 head: `720cd88c8c0a9e4a8ade52aaeb7ba9dd7f28b51b`
- reconciliation merge commit: `35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`
- reconciliation used a normal two-parent merge commit; no force push or history rewrite was used
- production Neon migration remains: `014`
- protected source `app.js` must remain Git blob `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`
- sealed Phase 6 Worker copy must remain Git blob `670159e8b820f597ed2376c246df04e69a244988`

The three commits that advanced protected `main` after the old Phase 7 base changed only `docs/BUILD_ARCHIVE.md`. The current authoritative archive was carried into this branch during reconciliation without runtime conflict resolution.

## Authoritative Phase 7 scope

Phase 7 is **Core accounts and balances** and must prove:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers between the user's own accounts are not spending;
4. spendable balances are separated from protected/reserved balances.

Phase 1 remains binding: raw bank balance is not safe-to-spend, protected money is not free cash, and an internal transfer is money movement rather than expenditure.

## Delivered Phase 7 responsibilities

### 1. Multiple accounts/assets and liabilities

The preserved account model supports:

- bank;
- savings;
- cash;
- credit card;
- loan/debt;
- BNPL;
- investment;
- other.

The First-Time Setup flow can create the first account set, and the protected application continues to support later account additions and edits without modifying `app.js`.

### 2. Persistent account balance snapshots through the locked production architecture

New subscriber runtime:

- `phase7-core-balances-bridge.js`

New authenticated Worker route module:

- `src/phase7-account-routes.mjs`

New same-origin endpoints:

- `GET /api/phase7/accounts`
- `POST /api/phase7/accounts/sync`

The path is:

`subscriber account state → same-origin Phase 7 client → Cloudflare Worker → Phase 6 managed-session validation → transaction-local user scope → Hyperdrive → Neon accounts / financial_settings → RLS + audit controls`

The sync endpoint is a full active-account snapshot. Each browser account receives a server mapping, active account balances are upserted into the existing Neon `accounts` table, and accounts removed from the active device snapshot are soft-archived rather than physically deleted.

No raw database credential is exposed to the browser.

### 3. Sealed Phase 6 security/runtime composition

Phase 7 does not rewrite the completed Phase 6 security engine.

The exact former `src/worker.mjs` bytes are preserved as:

- `src/worker-phase6-sealed.mjs`

Its required Git blob is:

`670159e8b820f597ed2376c246df04e69a244988`

The new `src/worker.mjs` is a composition entrypoint: it handles the two Phase 7 account routes first and delegates every other route to the sealed Phase 6 module. Named Phase 6 exports are re-exported so the existing Phase 2→6 tests continue to exercise the original implementation.

Phase 7 production verification independently hashes the sealed copy, so the source-level compatibility anchors in the composition entrypoint do not substitute for byte-level preservation evidence.

### 4. Internal transfers are not spending

The sealed transaction engine already treats `transfer` as a distinct transaction type and changes both source and destination account positions.

The reconciled Phase 7 core-balance tests now make this a Phase 7 gate:

- a transfer reduces one owned account and increases the other;
- the combined asset position is unchanged by the transfer itself;
- monthly spending totals include only `expense` transactions;
- a transfer is therefore never counted as spending.

Phase 7 deliberately does **not** add new transaction persistence or expense-intelligence APIs. Those remain Phase 8 responsibilities. Phase 7 persists the resulting account balance snapshot while preserving the existing transaction semantics.

### 5. Spendable versus protected/reserved balances

New pure model:

- `phase7-core-balances.mjs`

The Phase 7 balance summary separates:

- asset balance;
- debt balance;
- liquid balance;
- protected emergency cash;
- bill amount already reserved;
- protected savings already held;
- protected/reserved total;
- remaining spendable balance after those protected amounts.

The subscriber bridge displays:

- **Spendable balance**;
- **Protected / reserved**;
- **Assets**;
- **Debts owed**.

The displayed Phase 7 spendable balance is intentionally a bounded account-balance responsibility. It is **not** labelled as the later full safe-to-spend engine, which will incorporate the complete income/obligation/debt/savings-commitment forecast in its later chronological phase.

### 6. Authenticated cloud recovery behavior

If there is no authenticated managed session, the Phase 7 account API fails closed and the browser keeps the current device data intact.

When an authenticated session exists:

- the device account balance snapshot is persisted through Cloudflare → Hyperdrive → Neon;
- server IDs are mapped separately from protected local account IDs, so editing the preserved app does not break persistence identity;
- if a new device has no local accounts or transaction history and Neon has active account snapshots, Phase 7 can restore those account balances into the established money store;
- transaction history is not fabricated during account-only recovery and remains Phase 8 scope.

## Preserved First-Time Setup scope

The eight-screen onboarding flow remains:

1. How often do you get paid?
2. When do you get paid next?
3. Add your accounts.
4. What bills do you have?
5. Choose Smooth my bills or I'll keep the money.
6. Set protected emergency cash.
7. Set optional savings goals.
8. YOUR FIRST MONEY PLAN.

Preserved supporting responsibilities include due-date-aware Smooth calculations, target warning refresh, established-user detection and setup-aware backup/restore.

## Production runtime linkage

The subscriber runtime order is now:

`Phase 2 data → Phase 2 subscriptions/savings → Phase 7 first-time setup → Phase 7 plan integrity → Phase 7 backup continuity → Phase 7 core balances/cloud account sync → protected app.js`

The production linker copies all four Phase 7 runtimes, inserts them in this exact order before protected `app.js`, and reseals the service-worker cache as `phase7-first-time-setup-v2`.

## Database decision

**No migration `015` is required.**

Migration `014` already contains the required sealed database responsibilities through earlier migrations:

- owned accounts and supported account types;
- financial settings and emergency buffer;
- bill provisions;
- protected savings;
- user ownership constraints;
- cross-user foreign-key protection;
- RLS;
- soft archive controls;
- append-only audit evidence.

The Phase 7 Worker routes use those existing tables and the Phase 6 transaction-local authenticated identity boundary.

Production backend readiness therefore remains the sealed Phase 6 / migration `014` boundary during this pre-merge gate. Phase 7 is independently proven by its static/runtime/API gate rather than weakening or rewriting Phase 6 readiness assertions.

## Verification architecture

`verify:phase7` remains nested after `verify:phase6`, which remains nested after the earlier stages.

The final Phase 7 gate now verifies:

- all eight onboarding screens;
- Smooth and target modes;
- due-date-aware plan integrity;
- setup-aware backup/restore;
- multiple account and liability types;
- internal transfer balance effects;
- transfers excluded from spending;
- protected/reserved balance arithmetic;
- valid negative asset balances such as an overdrawn bank account;
- authenticated account persistence routes;
- RLS-scoped database queries;
- soft archive behavior;
- unauthenticated Phase 7 API requests fail closed with HTTP 401;
- no migration `015` exists;
- protected `app.js` hash is unchanged;
- sealed Phase 6 Worker hash is unchanged;
- all four Phase 7 runtime assets are in the production artifact and service-worker cache;
- live branch preview serves all four Phase 7 runtimes;
- live unauthenticated `/api/phase7/accounts` returns authentication-required rather than exposing data;
- `/ready` still proves the preserved Phase 6 / migration `014` backend boundary.

## Implementation-history note

During the sealed-worker copy step, two transient connector placeholder commits were created and immediately superseded before any verification gate. No force push was used. The final branch file is independently verified to be the exact original Phase 6 Worker blob `670159e8...`, and no green/merge claim is based on either transient head.

## Final pre-merge gate still required

This checkpoint does **not** approve a merge.

Before PR #36 may even be considered for merge:

1. the branch must remain zero commits behind protected `main`;
2. one exact final Phase 7 head must run all six workflows;
3. `phase2` must be GREEN;
4. `cloudflare-phase3` must be GREEN;
5. `phase4-neon` must be GREEN;
6. `phase5-database-safety` must be GREEN;
7. `phase6` must be GREEN;
8. `phase7` must be GREEN;
9. the complete diff must be re-audited after the final checks;
10. only then may `Protect main` be considered for addition of `phase7` as the sixth required check;
11. PR #36 must remain Draft until those conditions are satisfied.

No Phase 8 work may begin during this gate.

## Current chronological lock

**Phase 1→6 remain protected, GREEN and archived. Phase 7 authoritative Core Accounts & Balances implementation is now reconciled and code-complete on the isolated draft branch, but its final exact-head Phase 2→7 verification is still pending.**

No merge is permitted until that exact-head gate is GREEN and the final re-audit finds no material defect.
