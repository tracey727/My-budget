# GENEVIEVE Budget — Build Archive

## Current checkpoint

Date/time: 24 August 2026, 12:45 PM AEST (Queensland)
Repository: tracey727/My-budget
Branch: main
Current phase: Phase 1 — Lock the Product Before Coding

### Completed in this checkpoint

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

### Audit result

Phase 1 product-contract audit: PASS.

Runtime impact: none. No application source, package, database schema or deployment configuration was modified during Phase 1, so this checkpoint does not alter subscriber-facing behaviour.

Known infrastructure finding: no Neon project matching "budget" currently exists in the connected Neon account. Neon provisioning therefore remains future work and must occur only after the application architecture/schema phase is ready.

Known deployment finding: the repository currently contains legacy `vercel.json`; Cloudflare is the locked production target but Cloudflare deployment configuration has not yet been added. This is intentionally not changed in Phase 1.

Validation limitation: this environment could not clone GitHub over the container network, so no local `npm run build` was executed for this documentation-only checkpoint. The repository itself exposes only `dev`, `build`, and `preview` scripts at present and no automated test script.

## Remaining build — chronological order

Do not start a later item until the immediately preceding item is verified.

1. Phase 2 — Baseline technical audit and preservation
   - Capture current file manifest and current runtime behaviour.
   - Audit duplicate/legacy entry points (`App.jsx` and `app.js`) and determine the single supported application path without deleting functionality prematurely.
   - Add reproducible install lockfile if missing.
   - Add lint/type/test/build gates appropriate to the stack.
   - Establish a subscriber-safe deployment verification gate.

2. Phase 3 — Cloudflare production foundation
   - Replace legacy deployment assumptions with Cloudflare-compatible build/deploy configuration.
   - Add Wrangler configuration using current Cloudflare best practices.
   - Generate binding types rather than hand-writing them.
   - Add health/readiness endpoints where appropriate.
   - Verify a green Cloudflare deployment before any database-backed feature work.

3. Phase 4 — Neon development and production data foundation
   - Create the GENEVIEVE Budget Neon project only when schema work begins.
   - Create isolated development/migration branch workflow.
   - Establish connection method appropriate to Cloudflare; use Hyperdrive for external Postgres connectivity.
   - Add migration ledger and safe migration process.
   - Verify connectivity and readiness before advancing.

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

Current permitted next action: Phase 2 only.

No Phase 3+ work is permitted until Phase 2 is complete and verified green.
