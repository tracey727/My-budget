# GENEVIEVE Budget — Phase 7 Current Checkpoint — First-Time Setup

Date: 27 August 2026, AEST (Queensland)

## Status

**PHASE 7 IMPLEMENTATION COMPLETE ON ISOLATED BRANCH / PRE-MERGE GREEN GATE PENDING / NOT MERGED / NOT ARCHIVED.**

Phase 7 began only after Phase 6 was fully merged, post-merge GREEN and archived. No Phase 8 work has started.

## Authoritative base and branch

- repository: `tracey727/My-budget`
- protected base branch: `main`
- Phase 6 archive/main boundary: `06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`
- Phase 7 branch: `phase7-first-time-setup`
- draft implementation PR: `#36`
- immediately before this checkpoint update the branch compared as 25 commits ahead and 0 behind `main`
- production Neon migration remains: `014`
- Worker readiness remains: Phase 6 / migration 014
- protected source `app.js` must remain Git blob `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`

The branch head containing this checkpoint is the final pre-merge candidate and must pass the complete Phase 2→7 gate before any merge action.

## Phase 7 user flow

First use is an eight-screen, one-screen-at-a-time flow:

1. **How often do you get paid?** Weekly / Fortnightly / Monthly / Irregular.
2. **When do you get paid next?** A past date is rejected; today or a future date is required.
3. **Add your accounts.**
4. **What bills do you have?**
5. **How would you like GENEVIEVE to manage your bills?**
   - **Smooth my bills** — calculate the amount required from each regular pay.
   - **I’ll keep the money** — retain the bill target and refresh Green / Yellow / Red / Recovery warnings as funding progress approaches the due date.
6. **Set protected emergency cash.**
7. **Set optional savings goals.**
8. **YOUR FIRST MONEY PLAN.**

Setup progress is saved separately while onboarding is incomplete. Financial records are committed into the established money store only at Screen 8, so a refresh halfway through setup does not expose partial accounts/bills/goals as completed financial data.

Existing users who already have meaningful financial data are classified as established and are not forced through first-time onboarding.

## Production runtime linkage

The deployed subscriber chain is intentionally:

`Phase 2 data runtime → Phase 2 subscriptions/savings runtime → Phase 7 first-time setup → Phase 7 plan-integrity bridge → Phase 7 backup bridge → protected app.js`

Responsibilities are separated:

- `phase7-first-time-setup.js` — eight-screen onboarding and Screen 8 commit.
- `phase7-plan-integrity-bridge.js` — future-date guard, due-date-aware Smooth calculations, regular next-pay advancement, committed-plan refresh, target-alert refresh and corrected Screen 8 plan presentation.
- `phase7-backup-bridge.js` — backup/restore continuity for Phase 7 setup metadata while remaining compatible with pre-Phase-7 backups.
- `app.js` — remains byte-for-byte protected and unchanged.

The production linker copies all three Phase 7 subscriber runtimes into `dist`, orders them before protected `app.js`, and reseals the deployed service-worker cache with all three assets.

## Data linkage

Phase 7 does not create a parallel financial model. It reuses the established account, bill and savings structures already used by Phase 2 and represented by the sealed database contract.

Onboarding progress/completion metadata uses the separate key:

`genevieve-first-time-setup-v1`

Completed setup writes accounts, bills and savings goals into the established money store:

`every-cent-money-tracker-v1`

The backup bridge includes the Phase 7 setup record in new full backups. A legacy backup without a Phase 7 setup record remains supported: on reload, a non-empty restored money store is treated as established; an empty legacy restore correctly returns to first-time setup.

## Smooth My Bills calculation

For regular pay frequencies:

- weekly = 52 pays/year;
- fortnightly = 26 pays/year;
- monthly = 12 pays/year.

When a bill has a valid next due date and a valid next pay date, Phase 7 counts the actual pays available on or before that due date and calculates:

`remaining amount required for first due date ÷ pays available before that due date`

Existing amount already reserved is deducted before calculating the remaining first-due requirement.

If the dated bill is already due before the next pay, the remaining first-due amount is exposed rather than being diluted across a future annual cycle.

When no due date is known, Phase 7 falls back to annualised smoothing:

`annual bill cost ÷ pays per year`

Annual bill cycles remain:

- weekly = 52;
- fortnightly = 26;
- monthly = 12;
- quarterly = 4;
- half-yearly = 2;
- yearly = 1;
- one-off = 1.

Irregular pay deliberately does not fabricate a fixed per-pay amount.

After onboarding, weekly, fortnightly and monthly next-pay dates roll forward when an old pay date has passed, and Smooth contributions are refreshed against the current next-pay/due-date position.

## Target mode and protected money

Target mode preserves the full bill target and refreshes Green / Yellow / Red / Recovery status from reserved progress and due-date timing.

Protected emergency cash remains setup/protected money and is not represented as ordinary spendable cash.

Savings-goal protection and the existing Phase 1 safe-to-spend contract remain unchanged.

## Schema decision

Phase 7 requires **no migration 015**.

It reuses the sealed schema responsibilities already available through:

- `financial_settings.income_cycle`;
- `financial_settings.budgeting_method`;
- `financial_settings.emergency_buffer_amount`;
- existing `bills` / `bill_provisions` semantics;
- existing `savings_goals` semantics.

Therefore the production backend boundary remains Phase 6 / migration 014 during Phase 7.

## Phase 7 implementation files

- `phase7-first-time-setup.js`
- `phase7-first-time-setup-model.mjs`
- `phase7-plan-integrity-bridge.js`
- `phase7-backup-bridge.js`
- `phase7-first-time-setup.test.mjs`
- `scripts/link-phase7-first-time-setup.mjs`
- `scripts/verify-phase7-dist.mjs`
- `.github/workflows/phase7-first-time-setup.yml`
- `package.json` — nested Phase 7 build/test gate only

## Verification architecture

`verify:phase7` is nested after `verify:phase6`, which itself preserves the complete earlier Phase 2→6 gate.

The Phase 7 verifier proves:

- all eight screens and exact choices remain present;
- due-date-aware Smooth calculations work;
- irregular pay does not invent a fixed contribution;
- target mode remains available;
- Green / Yellow / Red / Recovery refresh exists;
- established users are not trapped in onboarding;
- backup/restore preserves Phase 7 setup and supports legacy backups;
- production artifact order is exact;
- all three Phase 7 assets are in the deployed service-worker cache;
- `app.js` retains its protected Git blob hash;
- no migration 015 exists;
- Worker readiness remains Phase 6 / migration 014.

The dedicated Phase 7 GitHub Actions live gate additionally fetches the Cloudflare branch preview and must independently prove that the live index serves:

1. `phase7-first-time-setup.js`;
2. `phase7-plan-integrity-bridge.js`;
3. `phase7-backup-bridge.js`;
4. `/ready` with database ready at migration 014.

## Evidence before final checkpoint head

The immediately preceding implementation head `b8435783fe79563598605d8928a7c12aa5a267ef` passed all six Phase 2→7 GitHub workflows and the Phase 7 nested tests reported 14/14 passing. Its build log proved all three Phase 7 assets were copied and ordered correctly before protected `app.js`.

That head is **not** the merge authority because the Phase 7 live workflow was subsequently strengthened to fetch the plan-integrity asset independently. The final authority is the head containing this checkpoint after the complete six-workflow gate passes again.

## Final green gate before implementation merge

Phase 7 must not merge until all of the following are true on one exact final branch head:

1. `phase2` GREEN;
2. `cloudflare-phase3` GREEN;
3. `phase4-neon` GREEN;
4. `phase5-database-safety` GREEN;
5. `phase6` GREEN;
6. `phase7` GREEN;
7. live Cloudflare branch preview serves setup + plan-integrity + backup runtimes;
8. `/ready` proves database ready at Phase 6 / migration 014;
9. protected `app.js` is unchanged;
10. no migration 015 exists;
11. branch is zero commits behind protected `main`;
12. `Protect main` is updated to require `phase7` in addition to the existing required checks;
13. PR #36 is no longer draft and its exact head has not changed after the green gate.

After the implementation merge, all required checks and the production Cloudflare deployment must be verified again on the merged `main` head. Only then may a documentation-only Phase 7 archive PR be created and merged.

No Phase 8 work may begin before Phase 7 is merged, post-merge verified and archived.
