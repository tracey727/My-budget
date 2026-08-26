# GENEVIEVE Budget — Phase 7 Current Checkpoint — First-Time Setup

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 — IMPLEMENTATION IN PROGRESS / ISOLATED BRANCH / NOT MERGED / NOT ARCHIVED.**

Phase 7 started only after Phase 6 was fully merged, post-merge GREEN and archived.

## Authoritative base

- repository: `tracey727/My-budget`
- protected base branch: `main`
- Phase 6 archive/main boundary: `06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`
- Phase 7 branch: `phase7-first-time-setup`
- production Neon migration remains: `014`
- Worker readiness remains: Phase 6 / migration 014
- protected source `app.js` must remain blob/hash `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`

## Phase 7 scope

First use is an eight-screen, one-screen-at-a-time flow:

1. How often do you get paid? Weekly / Fortnightly / Monthly / Irregular.
2. When do you get paid next?
3. Add your accounts.
4. What bills do you have?
5. Choose bill management:
   - Smooth my bills — GENEVIEVE calculates the amount required from each regular pay.
   - I’ll keep the money — GENEVIEVE tracks the bill target and refreshes warning status as progress approaches the due date.
6. Set protected emergency cash.
7. Set optional savings goals.
8. Show YOUR FIRST MONEY PLAN.

## Linkage to earlier phases

Production subscriber order is intentionally:

`Phase 2 data runtime → Phase 2 subscriptions/savings runtime → Phase 7 first-time setup runtime → protected app.js`

Phase 7 does not duplicate existing account, bill or savings models. It writes completed setup records into the already-established Phase 2 money store and uses the existing bill/savings field names that match the sealed database contract.

Onboarding progress/completion metadata uses a separate key (`genevieve-first-time-setup-v1`) so the Phase 2 migration wrappers do not strip new setup metadata.

Existing users who already have meaningful financial data are marked as established and are not forced through first-time setup.

## Bill calculation rules

For regular pay:

- weekly pay = 52 pays/year;
- fortnightly pay = 26 pays/year;
- monthly pay = 12 pays/year.

Bill annual cycles:

- weekly = 52;
- fortnightly = 26;
- monthly = 12;
- quarterly = 4;
- half-yearly = 2;
- yearly = 1;
- one-off = 1.

Smooth contribution is:

`annual bill cost ÷ pays per year`

Irregular pay deliberately does not fabricate a fixed per-pay amount.

Target mode preserves the bill target and uses Green / Yellow / Red / Recovery status based on funding progress and due-date timing.

## Schema decision

Phase 7 requires no migration 015.

It reuses:

- `financial_settings.income_cycle`;
- `financial_settings.budgeting_method`;
- `financial_settings.emergency_buffer_amount`;
- existing `bills` / `bill_provisions` semantics;
- existing `savings_goals` semantics.

Therefore production Neon must remain migration 014 while Phase 7 is developed and verified.

## Build and verification

New Phase 7 components:

- `phase7-first-time-setup.js`
- `phase7-first-time-setup-model.mjs`
- `phase7-first-time-setup.test.mjs`
- `scripts/link-phase7-first-time-setup.mjs`
- `scripts/verify-phase7-dist.mjs`
- `.github/workflows/phase7-first-time-setup.yml`

`verify:phase7` is nested after `verify:phase6`, then verifies the deployed Phase 7 artifact and Phase 7-specific behavior.

The production linker copies the Phase 7 runtime into `dist`, places it immediately before the protected subscriber `app.js`, and adds it to the deployed service-worker cache without altering source `app.js`.

## Green gate before merge

Phase 7 must not merge until:

1. all existing Phase 2→6 checks remain GREEN;
2. the new `phase7` check is GREEN on the exact Phase 7 head;
3. production artifact order is proven;
4. the live branch preview serves the Phase 7 setup runtime;
5. `/ready` still proves the preserved Phase 6 / migration 014 backend boundary;
6. `app.js` remains unchanged;
7. there is no migration 015;
8. `Protect main` is updated to require `phase7` in addition to the existing five checks;
9. the branch is zero commits behind protected `main` immediately before merge.

No Phase 8 work may begin during this gate.
