# GENEVIEVE Budget — Phase 7 Current Checkpoint — Core Accounts & Balances

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 — RECONCILED WITH CURRENT PROTECTED MAIN / SUBSTANTIAL IMPLEMENTATION PRESENT / DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

**Do not merge PR #36. Do not start Phase 8.**

The previous status in this file that described Phase 7 as code-complete is superseded by the full audit in:

`docs/PHASE7_RECONCILIATION_AUDIT.md`

That audit is the current authority for blockers, exact continuation instructions and final merge conditions.

## Authoritative repository position

- repository: `tracey727/My-budget`
- protected base branch: `main`
- authoritative protected `main` at this checkpoint: `156a36e9ba1b6a2452012c6915341f0184baa284`
- Phase 7 branch: `phase7-first-time-setup`
- draft implementation PR: `#36`
- original pre-reconciliation Phase 7 head: `720cd88c8c0a9e4a8ade52aaeb7ba9dd7f28b51b`
- reconciliation merge commit: `35bbda5b575cb5c8e7bf65f4b5c0b767f714db5f`
- production boundary before any later Phase 7 migration promotion: `014`
- protected source `app.js` Git blob: `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`
- sealed Phase 6 Worker Git blob: `670159e8b820f597ed2376c246df04e69a244988`

Always re-fetch current branch/main SHAs before continuing. Do not assume the SHA that committed this file is still current.

## Authoritative Phase 7 scope

Phase 7 is **Core accounts and balances**:

1. persistent multiple accounts/assets;
2. credit cards, loans, BNPL and debts;
3. internal transfers between the user's own accounts are not spending;
4. spendable balance is separated from protected/reserved balance.

The existing eight-screen First-Time Setup remains the Phase 7 onboarding entry component.

Full Safe-to-Spend forecasting is not Phase 7 and remains a later chronological phase.

## Preserved First-Time Setup implementation

The eight-screen flow remains:

1. How often do you get paid?
2. When do you get paid next?
3. Add your accounts.
4. What bills do you have?
5. Choose Smooth my bills or I'll keep the money.
6. Set protected emergency cash.
7. Set optional savings goals.
8. YOUR FIRST MONEY PLAN.

Preserved components include:

- `phase7-first-time-setup.js`;
- `phase7-first-time-setup-model.mjs`;
- `phase7-plan-integrity-bridge.js`;
- `phase7-backup-bridge.js`;
- setup-aware backup/restore;
- due-date-aware bill planning;
- Green / Yellow / Red / Recovery target refresh;
- existing-user onboarding bypass;
- protected `app.js` unchanged.

## Current Core Accounts & Balances implementation

Additional Phase 7 components currently present include:

- `phase7-core-balances.mjs`;
- `phase7-core-balances-bridge.js`;
- `phase7-core-balances.test.mjs`;
- `src/phase7-account-routes.mjs`;
- `src/worker-phase6-sealed.mjs`;
- composed `src/worker.mjs`;
- expanded Phase 7 workflow and artifact verifier.

The current implementation correctly demonstrates:

- bank, savings, cash, credit, loan, BNPL, investment and other account categories;
- transfer-not-spending arithmetic by reusing the sealed transaction engine;
- asset/debt/liquid balance classification;
- separation of emergency/bill/protected-savings amounts from the bounded Phase 7 spendable figure;
- authenticated same-origin account API boundary;
- Phase 6 managed-session and RLS ownership boundary reuse;
- Phase 6 Worker preserved as an exact hash-pinned sealed module;
- no direct modification of protected `app.js`.

## Exact-head regression evidence already obtained

At audited branch head:

`cd859dad2830d47298ac57331627d72e27668d36`

all six Phase 2→7 workflows completed successfully on the same exact head.

That result is regression evidence only. It is **not** merge authority because the complete manual/data-contract audit found material defects that the tests did not cover.

Any later corrective commit invalidates that head as merge authority and requires the full gate again.

## Current merge blockers

The controlling detail and repair sequence are in `docs/PHASE7_RECONCILIATION_AUDIT.md`.

The four current blockers are:

1. **Current balance is being persisted into the sealed `opening_balance` field.** Opening balance is the original starting basis used by the transaction engine and must not be repurposed as a live snapshot.
2. **A device's missing accounts can soft-archive valid cloud accounts.** Omission from one local snapshot is not explicit delete authority; remote archive must be an explicit owned user action.
3. **Cloud-only account recovery can overstate spendable money when bill-reserve/protected-savings data is incomplete.** Recovery must fail conservative rather than represent missing protection as zero.
4. **Local browser money/cloud-map state is not bound to the authenticated user before upload.** Shared-device/account-switch scenarios must not upload one user's local financial state into another user's cloud account.

## Next chronological step

**Step 7A — persistence-contract hardening.**

Do not run toward merge first. Correct the data model and sync semantics first.

The next implementation must:

- preserve `opening_balance` as the original account basis;
- design the smallest separate current-balance snapshot persistence mechanism;
- add migration `015` only if the final schema design confirms it is genuinely required for that separate snapshot — the current audit says it is required for the chosen recovery design;
- include a complete 015→014 rollback and isolated Neon proof before production;
- change account snapshot sync to non-destructive upsert;
- add an explicit owned soft-archive action instead of omission-based archive;
- bind local/cloud metadata to the authenticated user before upload;
- make incomplete protected-data recovery conservative;
- add behavioral tests for all four defects before the final Phase 2→7 gate.

## Final merge rule

PR #36 must remain Draft until:

1. all audit blockers are corrected;
2. any required migration/rollback is isolated-test green;
3. production database promotion, if needed, is verified chronologically;
4. branch is 0 behind protected `main`;
5. all six checks pass on one exact final head;
6. full job logs/live Cloudflare/Neon are audited;
7. a final whole-diff audit is green;
8. `phase7` is then added to Protect main as the sixth required check;
9. ruleset remains active with no bypass;
10. exact head/main are reread immediately before merge.

After implementation merge, verify again, then archive Phase 7 through a documentation-only protected PR. Only after Phase 7 is merged, post-merge green and archived may Phase 8 be scoped.