# GENEVIEVE Budget — Build Archive

## Current checkpoint

Date: 24 August 2026, AEST (Queensland)
Repository: tracey727/My-budget
Branch: main
Current phase: **Phase 2 COMPLETE — Baseline technical audit and preservation**
Final Phase 2 merged-main commit: `bf8d1a1ff742111e765177cf90c8b89f28d5145b`
Final Phase 2 merged-main verification: `Phase 2 baseline verification` run `#39` — GREEN
Next permitted phase: **Phase 3 — Cloudflare production foundation**

### Phase 2 completion state

- Audited the actual subscriber entry path on `main` and confirmed `index.html → /app.js` is the supported subscriber runtime for this phase.
- Preserved `main.jsx → App.jsx` as the React migration destination without prematurely replacing donor functionality.
- Added a committed reproducible `package-lock.json` and changed CI to deterministic `npm ci`.
- Added source syntax verification, automated preservation tests, subscriber production-build verification, production-artifact checks, independent React preservation build and dependency security audit.
- Preserved fixed-path subscriber assets required by the supported runtime and service worker.
- Preserved donor `app.js` functionality; no donor feature was deleted during the Phase 2 baseline repair.
- Archived Phase 2 in `docs/PHASE2_COMPLETION_ARCHIVE.md`.
- Verified the archive commit GREEN in Phase 2 baseline verification run `#38`.
- Merged the completed Phase 2 repair to `main`.
- Verified merged `main` commit `bf8d1a1ff742111e765177cf90c8b89f28d5145b` GREEN in Phase 2 baseline verification run `#39`.
- No Cloudflare or Neon implementation was performed during Phase 2.

### Phase 2 audit result

Phase 2 baseline technical audit and preservation gate: **PASS / GREEN on merged `main`**.

The Phase 2 history contains earlier failed repair runs. Those remain part of the GitHub audit trail. Advancement is authorised by the final stage-specific gate on the completed merged-main state, not by the absence of historical failures.

### Historical Phase 1 checkpoint

Phase 1 locked the product contract before coding:

- Confirmed the active repository.
- Confirmed the current app is a Vite/React project.
- Locked two product doors: Personal and Professional.
- Locked one shared financial engine.
- Locked the rule that bank balance is not safe-to-spend.
- Locked both personal budgeting methods.
- Locked Green → Yellow → Red → Recovery alerts across both personal methods and professional monitoring.
- Locked the safe-to-spend model, conversational expense review, subscription review choices, professional budget controls, verified-savings separation, privacy/authority rules and GitHub + Neon + Cloudflare production target.
- Added `docs/PRODUCT_CONTRACT.md` in commit `6e548d6381b81189548c4edfb3cb720fae83d2a8`.
- Re-fetched the committed file from `main` and verified the content is present.

Phase 1 product-contract audit: PASS.

## Remaining build — chronological order

Do not start a later item until the immediately preceding item is verified.

1. Phase 2 — Baseline technical audit and preservation — **COMPLETE / GREEN**
   - Captured current file/runtime behaviour.
   - Audited duplicate/legacy entry points (`App.jsx` and `app.js`) and preserved the supported subscriber path without deleting functionality.
   - Added reproducible install lockfile.
   - Added stage-specific source/test/build/security gates.
   - Established subscriber-safe production artifact verification.
   - Archived and verified merged `main` GREEN in run `#39`.

2. Phase 3 — Cloudflare production foundation — **NEXT PERMITTED PHASE**
   - Replace legacy deployment assumptions with Cloudflare-compatible build/deploy configuration.
   - Add Wrangler configuration using current Cloudflare best practices.
   - Generate binding types rather than hand-writing them.
   - Add health/readiness endpoints where appropriate.
   - Make the Cloudflare deployment live.
   - Verify the Cloudflare stage-specific deployment/runtime gate GREEN.
   - Archive Phase 3 before Phase 4 begins.

3. Phase 4 — Neon development and production data foundation
   - Create the GENEVIEVE Budget Neon project only when schema work begins.
   - Create isolated development/migration branch workflow.
   - Establish connection method appropriate to Cloudflare; use Hyperdrive for external Postgres connectivity.
   - Add migration ledger and safe migration process.
   - Verify connectivity and readiness before advancing.
   - Archive Phase 4 before later phases begin.

4. Phase 5 — Identity, user scope and permissions
   - User identity.
   - Personal vs Professional product entitlement.
   - Trusted-support permission model.
   - Read authority separated from financial action authority.

5. Phase 6 — Core accounts and balances
   - Multiple assets/accounts.
   - Credit cards, loans, BNPL and debts.
   - Internal transfer handling that does not count transfers as spending.
   - Spendable vs protected/reserved balances.

6. Phase 7 — Transactions and expense intelligence
   - Transaction storage/import/manual entry.
   - Categories.
   - Yes / No / Maybe review.
   - Underlying Essential / Worth It / Unsure / Waste intelligence.
   - Unknown/duplicate/forgotten-charge review foundations.

7. Phase 8 — Income and payday engine
   - Weekly, fortnightly, monthly and irregular income.
   - Next-income calculation.
   - Income-cycle normalization.

8. Phase 9 — Obligations and bill calendar
   - Recurring and irregular bills.
   - Due dates.
   - Bill calendar.
   - Upcoming obligation protection.

9. Phase 10 — Option 1: Smooth My Bills / Pay Ahead
   - Annual/quarterly/irregular obligation conversion to income-cycle contribution.
   - Physical bills-account or virtual-reserve mode.
   - Green / Yellow / Red / Recovery alerting.

10. Phase 11 — Option 2: Hold My Money / Bill Target
    - Target amount, due date, amount reserved, remaining required and required contribution.
    - Green / Yellow / Red / Recovery alerting.

11. Phase 12 — Safe-to-spend engine
    - Income minus bills, provisions/targets, debts, emergency buffer and savings commitments.
    - Safe this income cycle, safe this week and safe today.
    - Protected money excluded from free cash.

12. Phase 13 — Forecast and cash-flow warning
    - Budget vs actual.
    - Projected end-of-month spending.
    - Shortfall prediction.
    - Recovery actions.

13. Phase 14 — Savings and emergency funds
    - Savings goals.
    - Emergency fund.
    - Separate potential savings from verified realised savings.

14. Phase 15 — Debt planning
    - Debt commitments.
    - Interest scenarios.
    - Repayment planning without misrepresenting future savings as realised.

15. Phase 16 — Subscription and recurring-cost manager
    - Keep / Cancel / Maybe / Give it another month / Pause if possible / Review after next charge.
    - Price increases.
    - Duplicate services.
    - Forgotten charges.
    - Explicit authority before any external action.

16. Phase 17 — Household continuity and financial-change controls
    - Direct-debit/account-change checklist.
    - Fees and interest monitoring.
    - Backup/export.

17. Phase 18 — Personal accessibility modes
    - Simple / low-cognitive-load mode.
    - Trusted-support access with restricted permissions.

18. Phase 19 — Professional entities and project accounting
    - Businesses, divisions, projects, workstreams, cost centres, funding pools and accounts.
    - Transaction allocation across the hierarchy.

19. Phase 20 — Professional commitments, invoices and revenue
    - Committed vs paid vs owing.
    - Revenue expected/received.
    - Available uncommitted cash.

20. Phase 21 — Professional project forecasting
    - Approved budget, actual, committed, forecast, variance, cost-to-complete and projected final cost.
    - Green / Yellow / Red / Recovery monitoring.

21. Phase 22 — Professional cash-flow forecasting
    - 7-day, 30-day, 90-day and 12-month forecasts.
    - Wages, contractors, tax, project commitments, rent, insurance, debt and reserved funds.

22. Phase 23 — Professional contracts and recurring costs
    - SaaS, licences, hosting, insurance, rent, vehicles, phones, memberships, suppliers, contractors and leases.
    - Keep / Renegotiate / Cancel / Review decisions with explicit authority.

23. Phase 24 — Verified Savings Ledger
    - Baseline → Proposed action → Action completed → Evidence → Later result → Verified saving.

24. Phase 25 — Reporting, backup and export
    - Personal reports.
    - Professional project/business reports.
    - Data export and continuity.

25. Phase 26 — Security, privacy and abuse-resistance audit
    - Access controls.
    - Secrets handling.
    - Data minimisation.
    - Financial action authorisation.
    - Auditability.

26. Phase 27 — Subscriber readiness
    - Full automated test/build/audit gates.
    - Database migration verification.
    - Cloudflare production health/readiness.
    - Failure/recovery testing.
    - Final release checklist and production archive.

## Advancement rule

Phase 2 is complete, archived and verified GREEN on merged `main` at commit `bf8d1a1ff742111e765177cf90c8b89f28d5145b` via Phase 2 baseline verification run `#39`.

**Current permitted next action: Phase 3 — Cloudflare production foundation only.**

Do not begin Phase 4 Neon until Phase 3 is built, live, stage-specifically GREEN and archived.
