# GENEVIEVE Budget — Phase 7 Current Checkpoint — Core Accounts & Balances Reconciliation

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 — RECONCILED WITH CURRENT PROTECTED MAIN / FULL-DIFF RE-AUDIT BLOCKED / DRAFT / NOT MERGE-READY / NOT ARCHIVED.**

This checkpoint supersedes the earlier statement that the isolated First-Time Setup implementation was a final pre-merge Phase 7 candidate.

The existing onboarding work remains preserved on the Phase 7 branch, but the corrected authoritative `docs/BUILD_ARCHIVE.md` on protected `main` defines Phase 7 more broadly as **Core accounts and balances**. The current draft does not yet satisfy that complete scope and must not merge as Phase 7.

No Phase 8 work has started.

## Authoritative repository position

- repository: `tracey727/My-budget`
- protected base branch: `main`
- authoritative protected `main` after the Phase 6 Build Archive correction: `156a36e9ba1b6a2452012c6915341f0184baa284`
- Phase 7 branch: `phase7-first-time-setup`
- draft implementation PR: `#36`
- original Phase 7 pre-reconciliation head: `720cd88c8c0a9e4a8ade52aaeb7ba9dd7f28b51b`
- reconciliation merge commit: `35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`
- reconciliation used a normal two-parent merge commit; no force push or history rewrite was used
- immediately after reconciliation the branch compared as 27 commits ahead and 0 behind protected `main`
- production Neon migration remains: `014`
- protected source `app.js` must remain Git blob `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`

The three commits that advanced protected `main` after the old Phase 7 base changed only `docs/BUILD_ARCHIVE.md`. That authoritative document was carried into the Phase 7 branch during reconciliation; no runtime conflict resolution was required.

## Authoritative Phase 7 scope

Protected `main` now defines Phase 7 as **Core accounts and balances** with these required responsibilities:

1. Persistent multiple accounts/assets.
2. Credit cards, loans, BNPL and debts.
3. Internal transfers between the user's own accounts must not be counted as spending.
4. Spendable balances must be separated from protected/reserved balances.

Phase 1 also remains binding: a raw bank balance must never be represented as safe-to-spend; protected bill money, emergency buffers, reserved funds and protected savings must not be represented as free cash; internal transfers between the user's own accounts are not spending.

## What the preserved First-Time Setup draft already delivers

The existing Phase 7 branch contains a useful eight-screen onboarding flow:

1. pay frequency;
2. next pay date;
3. add accounts;
4. add bills;
5. choose Smooth my bills or target mode;
6. set protected emergency cash;
7. add optional savings goals;
8. show a first money plan.

It also contains:

- due-date-aware Smooth calculations;
- target warning refresh;
- established-user onboarding detection;
- Phase 7 setup-aware backup/restore;
- a production linker for the onboarding, plan-integrity and backup runtimes;
- a dedicated Phase 7 workflow;
- preservation of the protected `app.js` source.

This work is preserved and may be reused inside the complete Phase 7 build. It is not discarded.

## Full-diff re-audit result — material blockers

### 1. Persistent accounts are not yet connected to the production database

The subscriber app and the preserved onboarding draft write account state to the established browser money store. The current Cloudflare Worker does not yet expose user-owned account CRUD, transfer or balance-summary endpoints.

Therefore the current draft cannot yet prove **persistent multiple accounts/assets through the locked Cloudflare → Hyperdrive → Neon production path**.

### 2. There is no browser-side authenticated account client yet

Phase 6 completed server-side managed-auth proxying, server-side session validation, transaction-local database identity, user/session revocation, trusted-support authority, Professional authority, account export and lifecycle controls.

The subscriber app does not yet contain a browser-side Phase 6 identity/session client that can authenticate and then persist account changes through the Worker. Phase 7 must reuse the Phase 6 managed-auth boundary rather than invent a parallel identity mechanism.

### 3. Internal-transfer exclusion exists in sealed foundations but is not a complete Phase 7 persistence gate

The sealed transaction model and PostgreSQL schema already support `transfer` transactions and exclude transfers from expense totals. The database also requires a distinct destination account and prevents cross-user account references.

However the current Phase 7 workflow does not prove a complete authenticated persistence path in which a transfer is written between two owned accounts, updates both account positions, remains cross-user isolated and is excluded from spending.

### 4. Spendable versus protected/reserved balance is not yet a complete Phase 7 production responsibility

The sealed schema already contains:

- `financial_settings.emergency_buffer_amount`;
- `bill_provisions.amount_reserved`;
- protected savings goals;
- accounts and liabilities.

The current Phase 7 draft does not yet expose and verify an owned production balance summary that separates:

- gross asset/account position;
- liabilities/debts;
- protected emergency amount;
- reserved bill provisions;
- protected savings;
- remaining amount after protected/reserved funds.

This Phase 7 figure must not be mislabelled as the later full **safe-to-spend** engine, which remains a later phase and also requires income, debt commitments, obligations and savings commitments.

### 5. The old Phase 7 readiness gate is stale

The old Phase 7 workflow deliberately required Worker readiness to remain `CURRENT_PHASE = 6` and `/ready` to report Phase 6 / migration `014`.

That was valid for the isolated onboarding experiment but is not sufficient evidence for the authoritative Phase 7 production stage.

At the same time, the protected Phase 6 workflow currently hard-checks `CURRENT_PHASE = 6` and live `"phase":6`. Phase 7 must therefore advance production readiness without destroying the historical Phase 6 preservation gate. That coupling must be repaired deliberately before Phase 7 can be declared production-live.

## Database decision after re-audit

**No migration `015` is currently required for the authoritative Phase 7 account/balance responsibilities.**

The sealed migration-014 schema already provides the required primitives:

- owned accounts with `bank`, `savings`, `cash`, `credit`, `loan`, `bnpl`, `investment` and `other` account types;
- owned transactions with `income`, `expense` and `transfer` types;
- transfer destination integrity;
- user ownership and cross-user foreign-key protection;
- Row Level Security;
- append-only audit evidence;
- bill provisions and reserved amounts;
- protected savings goals;
- debts;
- financial settings including emergency buffer amount.

Phase 7 should use these existing sealed tables through the Phase 6 authenticated Worker transaction boundary. Production remains migration `014` unless a later audited implementation proves a genuinely missing database invariant.

## Gate decision

The reconciled branch is **not merge-ready**.

Do not:

- mark PR #36 Ready for review;
- merge PR #36;
- add `phase7` to `Protect main` as a final required production gate yet;
- call the current onboarding-only workflow a complete Phase 7 proof;
- start Phase 8.

The old exact-head green evidence on `720cd88…` remains useful regression evidence for the onboarding components, but it is no longer sufficient merge authority after the corrected Phase 7 scope and branch reconciliation.

## Next chronological Phase 7 implementation work

Before a final Phase 2→7 gate may be treated as authoritative, Phase 7 must add and verify, in this order:

1. a browser-side authenticated client path that reuses the existing Phase 6 managed-auth/session boundary;
2. user-owned account persistence through Cloudflare Worker → Hyperdrive → Neon for multiple assets and liabilities;
3. internal transfer persistence between two owned accounts with transfer exclusion from spending and cross-user denial;
4. an owned balance-summary responsibility separating asset position, liabilities and protected/reserved amounts without claiming the later full safe-to-spend calculation;
5. linkage to the existing account/onboarding UI without modifying protected `app.js`;
6. behavioral tests for account persistence, liability types, internal transfer balance effects, transfer exclusion from spending, protected/reserved balance calculation, authentication failure and cross-user denial;
7. a Phase 7 workflow that verifies the complete authoritative scope and a production readiness seal without breaking Phase 6 preservation;
8. an updated current checkpoint and PR body for one exact final Phase 7 head.

Only after those responsibilities are complete should the branch be manually retriggered if necessary and the exact-head Phase 2→7 GitHub Actions suite be used as the final pre-merge gate.

## Final chronological lock

**Current decision: Phase 7 reconciliation complete; Phase 7 implementation audit RED because authoritative Core Accounts & Balances scope is incomplete.**

No merge is permitted while this material gap remains. No Phase 8 work may begin before Phase 7 is scope-complete, exact-head GREEN, protected-merge verified and archived.
