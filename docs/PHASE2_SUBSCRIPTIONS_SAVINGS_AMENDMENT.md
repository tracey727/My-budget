# Phase 2 — Subscriptions and Savings Goals Amendment Archive

Archived: 24 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Branch: `phase2-subscriptions-savings-amendment`
Pull request: `#19`
Base: merged Phase 2 data-contract baseline `61ca5e3c72e6890294b7c3803adc2610a39fa0c2`
Final implementation commit before archive: `0bde7dafd31e5e199e9b222ac2fbe908a855ad74`
Final implementation Phase 2 verification: `Phase 2 baseline verification` run `#101` — GREEN
User advancement directive: **STOP after this stage. Do not move forward to Phase 3.**

## Scope supplied by the user

### Subscriptions must store

- Subscription
- Amount
- Frequency
- Next charge
- Account
- Auto-renew
- Usage
- Annual cost
- Decision

Decision values:

- Keep
- Cancel
- Maybe
- Another month
- Pause
- Review next charge

### Savings Goals must store

- Goal
- Target
- Current amount
- Deadline
- Required weekly amount
- Required fortnightly amount
- Progress
- Protected Yes/No

## Before and after linkage

### Subscriptions — before

The existing donor subscription flow already had name, amount, cycle/frequency, next date, account, legacy status/value and an annual-cost calculation. `subscription-record.mjs` had an `autoRenew` field, but the browser form did not expose or preserve the complete required subscription contract. Usage and the exact six-way decision model were absent from the live runtime record.

Existing chain:

`index.html subscription dialog → app.js saveSubscription() → local storage → subscription list`

### Subscriptions — after

`subscription-model.mjs` now locks the six decision values. `subscription-record.mjs` normalizes both donor and required naming aliases and stores frequency, next charge, auto-renew, usage, calculated annual cost and decision while preserving the existing legacy status/value fields.

The new `phase2-subscriptions-savings-runtime.js` is linked between the existing Phase 2 extension and preserved donor runtime:

`index.html → phase2-data-runtime.js → phase2-subscriptions-savings-runtime.js → app.js`

The extension adds Auto-renew, Usage and Decision controls to the existing subscription form. When preserved `app.js` saves a subscription, the extension merges those fields into the same record before the earlier Phase 2 storage layer commits it. Annual cost is recalculated from amount and frequency and stored with the record.

The Decision field is a planning decision only. It does not perform an external cancellation, pause or payment-account action.

### Savings Goals — before

There was no dedicated Savings Goals storage model or subscriber runtime screen.

### Savings Goals — after

`savings-goal-model.mjs` now normalizes the required goal record. Progress is derived from current amount divided by target and capped at 100%. Required weekly and fortnightly contributions are derived from the remaining target amount and the number of remaining weekly/fortnightly periods to the deadline.

The runtime adds a Savings subscriber view and add/edit/delete dialog. The navigation runtime becomes:

`Home → Money → Bills → Subs → Accounts → Savings → Review`

Savings Goals are stored in `savingsGoals` alongside the existing account, transaction, subscription and Bills arrays. Protected goals are stored as a boolean and shown as Protected in the Savings view.

## Storage and continuity linkage

The combined browser state is now:

`accounts + transactions + subscriptions + bills + savingsGoals`

Existing `app.js` remains unchanged. The new extension preserves `savingsGoals` whenever `app.js` writes its legacy state shape, and preserves/normalizes the additional subscription fields whenever subscriptions are created or edited.

The backup/restore controls are safely replaced during the staged runtime initialization so the final backup includes all five data groups. Restore accepts legacy backups without Savings Goals and newer backups containing both Bills and Savings Goals.

Production linkage:

- `scripts/copy-subscriber-assets.mjs` copies `phase2-subscriptions-savings-runtime.js` to `dist`.
- `service-worker.js` caches the new runtime asset.
- `scripts/verify-dist.mjs` requires the file to exist in `dist`, requires the runtime order to be base Phase 2 → subscriptions/savings → app.js, verifies the required contract fragments, and requires service-worker coverage.

## Code preservation

The donor `app.js` was not changed in this amendment.

Existing Accounts, Transactions, Bills, Subscription Rescue, Review, backup/export and React preservation paths remain in place. The amendment is additive and layered before `app.js` to avoid breaking the existing subscriber engine.

## Audit trail

### Subscription model checkpoint

The subscription model/record changes passed the complete Phase 2 gate in run `#89`.

### Savings Goals model checkpoint

The Savings Goals model and tests passed the complete Phase 2 gate in run `#92`.

### Unlinked runtime checkpoint

The new subscriptions/savings runtime file passed syntax, existing tests, production build, artifact verification, React preservation and dependency audit while still unlinked in run `#93`.

### Source linkage checkpoint

After linking the runtime in `index.html` before `app.js`, the complete Phase 2 gate passed in run `#94`.

### Production/offline linkage checkpoint

After adding the runtime to the production copy and service-worker asset lists, the full Phase 2 gate passed in run `#96`.

### Strengthened regression gate

The first strengthened regression run, `#99`, correctly went RED because one new assertion looked for `subscriptionAccount` inside the extension file even though that existing Account control lives in `index.html`. Source syntax passed; only that assertion failed. No production build or later audit step was allowed to continue in that failed run.

The assertion was corrected to verify `accountId` in the extension storage code and `subscriptionAccount` in the existing HTML form. No application functionality was changed by that correction.

The corrected complete Phase 2 gate passed in run `#100`.

### Product-contract lock

The product contract was updated to record the exact six subscription decisions and required Savings Goals fields. The complete Phase 2 gate passed again in run `#101`.

## Final stage result before archive

Implementation commit `0bde7dafd31e5e199e9b222ac2fbe908a855ad74` is GREEN under the full Phase 2 stage gate:

1. reproducible install — PASS
2. source syntax — PASS
3. Phase 2 models and runtime regression tests — PASS
4. subscriber production build — PASS
5. production artifact verification — PASS
6. preserved React migration build — PASS
7. dependency security audit — PASS

## Stop gate

After this archive is itself verified and PR #19 is merged and verified on `main`, **stop**.

Do not re-seal Cloudflare Phase 3 in this stage.
Do not create or connect Neon Phase 4.
Do not begin identity, payment, forecasting or any later feature work.

A future Phase 3 re-seal will need to account for the now seven-view subscriber runtime, but that work is deliberately outside this stage.