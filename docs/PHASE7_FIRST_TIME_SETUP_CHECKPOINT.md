# GENEVIEVE Budget — Phase 7 Current Checkpoint — Core Accounts & Balances

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 — RECONCILED WITH CURRENT PROTECTED MAIN / SUBSTANTIAL IMPLEMENTATION PRESENT / DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

**Do not merge PR #36. Do not start Phase 8.**

The complete current audit, blockers, exact continuation sequence and anti-break instructions are in:

`docs/PHASE7_RECONCILIATION_AUDIT.md`

That audit is the current Phase 7 continuation authority. This file is the compact checkpoint.

## Authoritative repository position

- repository: `tracey727/My-budget`
- protected base branch: `main`
- authoritative protected `main` at this checkpoint: `156a36e9ba1b6a2452012c6915341f0184baa284`
- Phase 7 branch: `phase7-first-time-setup`
- draft PR: `#36`
- reconciliation merge: `35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`
- production boundary before any later Phase 7 DB promotion: `014`
- protected `app.js` blob: `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`
- sealed Phase 6 Worker blob: `670159e8b820f597ed2376c246df04e69a244988`

Always re-fetch current branch/main SHAs before continuing.

## Authoritative Phase 7 scope

Phase 7 is **Core accounts and balances**:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers are not spending;
4. spendable balance is separate from protected/reserved balance.

The eight-screen First-Time Setup remains the onboarding entry component.

Full Safe-to-Spend forecasting remains later and must not be pulled into Phase 7.

## What is already implemented and should be preserved

- eight-screen First-Time Setup;
- due-date-aware plan-integrity bridge;
- setup-aware backup/restore;
- core account/liability balance model;
- transfer-not-spending reuse of the sealed transaction engine;
- bounded Spendable vs Protected / reserved UI;
- authenticated same-origin Phase 7 account API composition;
- exact sealed Phase 6 Worker copy and delegation;
- protected `app.js` unchanged;
- nested Phase 2→7 verification architecture.

At audited exact head `cd859dad2830d47298ac57331627d72e27668d36`, all six Phase 2→7 workflows passed. That is regression evidence only, not merge authority, because the manual data-integrity audit found defects not covered by the tests.

## Current blockers

1. **Current balance overwrites sealed `opening_balance`.** A separate current-balance snapshot mechanism is needed so future transaction persistence cannot double-count history.
2. **Snapshot omission can archive valid cloud accounts.** Sync must be non-destructive; remote archive needs explicit owned user action.
3. **Cloud recovery can overstate spendable money when protected/reserved data is incomplete.** Recovery must fail conservative.
4. **Browser money/cloud-map state is not authenticated-user-bound before upload.** Shared-device/account-switch contamination must be prevented.

## Next chronological step

**Step 7A — persistence-contract hardening.**

Next work must, in this order:

1. re-fetch current main/head;
2. design separate current-balance snapshot storage while preserving opening balance;
3. add migration `015` only if the final design confirms the separate snapshot requirement;
4. add 015→014 rollback and failing-first tests;
5. change sync to upsert-only;
6. add explicit owned soft-archive route/action;
7. bind local/cloud metadata to authenticated user;
8. make incomplete protection recovery conservative;
9. harden backup/restore for binding/map metadata;
10. prove any migration forward/reverse on isolated Neon;
11. only after all corrections, rerun the complete exact-head Phase 2→7 gate;
12. only after final whole-diff audit may Phase 7 be added to Protect main and PR #36 marked Ready.

## Merge rule

PR #36 stays Draft and unmerged until the four blockers are fixed, any DB migration/rollback is proven, branch is 0 behind main, all six checks are green on one exact final head, live Cloudflare/Neon are verified, final diff audit is green, and `phase7` is added to Protect main with no bypass.

After implementation merge, verify again and archive Phase 7 through a separate documentation-only protected PR. Only then may Phase 8 be scoped.