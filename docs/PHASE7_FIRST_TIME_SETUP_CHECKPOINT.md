# GENEVIEVE Budget — Phase 7 Current Checkpoint — Core Accounts & Balances

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 — DATA-INTEGRITY AUDIT BLOCKED / DRAFT / NOT MERGED / NOT ARCHIVED.**

Do not merge PR #36. Do not start Phase 8.

The controlling current audit, blockers, repair order, merge gate and resume instructions are in:

`docs/PHASE7_RECONCILIATION_AUDIT.md`

Read that file after this one and treat it as the current authority.

## Preserved build scope

Phase 7 is **Core Accounts & Balances** and keeps the eight-screen First-Time Setup as its onboarding entry.

Already present and worth preserving:

- First-Time Setup;
- due-date plan integrity;
- setup-aware backup;
- multiple asset/liability account types;
- transfer-not-spending arithmetic;
- bounded Spendable vs Protected / reserved model/UI;
- authenticated account-route composition;
- exact sealed Phase 6 Worker preservation;
- exact protected `app.js` preservation;
- nested Phase 2→7 verification.

## Current blockers

1. current balance is being stored in sealed `opening_balance`;
2. omission from one device snapshot can archive valid cloud accounts;
3. cloud recovery can overstate spendable when protection data is incomplete;
4. browser money/cloud-map state is not authenticated-user-bound before upload.

## Next chronological step

**Step 7A — persistence-contract hardening.**

Do not jump to merge. Re-fetch live main/head, then follow `docs/PHASE7_RECONCILIATION_AUDIT.md` exactly.

PR #36 remains Draft until the blockers are corrected, any required migration/rollback is proven, the final exact-head Phase 2→7 gate is green, the whole diff is audited, and `phase7` is added to Protect main with no bypass. Phase 8 begins only after Phase 7 is merged, post-merge green and archived.