# GENEVIEVE Budget — Phase 7 Current Checkpoint — Core Accounts & Balances

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 — CORRUPTION REPAIR IMPLEMENTED / ISOLATED MIGRATION PROOF GREEN / DRAFT / NOT MERGED / NOT ARCHIVED.**

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

## Repaired corruption risks

1. original `opening_balance` is database-immutable and live money uses a separate `current_balance_snapshot`;
2. device sync is revisioned, upsert-only and cannot archive by omission; archive is an explicit owned endpoint;
3. recovery restores the bounded protection snapshot or withholds spendable entirely;
4. browser money/cloud metadata is bound and namespaced to the authenticated user, with explicit adoption for legacy unbound device data.

Migration 015 and its exact rollback were proven on isolated Neon branch `br-flat-hat-ax3v0ggd`. Opening-balance mutation, cross-user writes and duplicate client mappings failed as required; explicit archive remained soft and audited; rollback produced an empty schema diff to production migration 014. The temporary proof branch and all synthetic records were then deleted.

## Next chronological step

**Step 7C — whole-diff and final local gate, followed by Step 7D production promotion only if every gate remains green.**

Do not jump to merge. Re-fetch live main/head before each external write and follow `docs/PHASE7_RECONCILIATION_AUDIT.md` exactly.

PR #36 remains Draft until the blockers are corrected, any required migration/rollback is proven, the final exact-head Phase 2→7 gate is green, the whole diff is audited, and `phase7` is added to Protect main with no bypass. Phase 8 begins only after Phase 7 is merged, post-merge green and archived.
