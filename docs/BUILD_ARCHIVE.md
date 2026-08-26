# GENEVIEVE Budget — Build Archive

## Current authoritative checkpoint

Date: 26 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Cloudflare production URL: `https://my-budget.positivity864.workers.dev`

**Phase 1 — COMPLETE / CONTRACT LOCKED**

**Phase 2 — COMPLETE / GREEN / ARCHIVED**

**Phase 3 — COMPLETE / LIVE / GREEN / ARCHIVED**

**Phase 4 — COMPLETE / LIVE / GREEN / ARCHIVED**

**Phase 5 — DATABASE SAFETY — COMPLETE / LIVE / GREEN / ARCHIVED.**

Phase 5 implementation PR: #28
Phase 5 implementation merge commit: `66933f63e4cee767ad25afa8a4ae491f6272f92e`
Phase 5 completion archive PR: #29
Phase 5 archive merge commit: `1a513223a407e05986c520d493543fa0c1f1eb50`
Phase 5 readiness migration: `007`
Detailed Phase 5 completion archive: `docs/PHASE5_COMPLETION_ARCHIVE.md`
Detailed Phase 5 engineering evidence: `docs/PHASE5_DATABASE_SAFETY.md`
Current checkpoint: `docs/PHASE5_CURRENT_CHECKPOINT.md`
Database migration/runbook: `database/README.md`

## Locked chronology

Do not start a later phase until the immediately preceding phase is built, linked to all earlier stages, verified with the appropriate stage-specific gate, GREEN and archived.

The authoritative sequence through the current checkpoint is:

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare deployment → Phase 4 Hyperdrive/Neon connection → Phase 5 database safety`

The executable production chain is:

`index.html → phase2-data-runtime.js → phase2-subscriptions-savings-runtime.js → preserved app.js → Cloudflare ASSETS → Worker /health + /ready → HYPERDRIVE → Neon neondb → schema_migrations 007 → RLS/ownership/archive/audit controls`

Verification remains nested rather than bypassed:

`Phase 2 preservation → Phase 3 Cloudflare verification → Phase 4 database/readiness verification → Phase 5 database-safety verification`

Phase 1 remains the governing locked product contract.

The donor `app.js` remains preserved.

## Phase 5 — Database Safety — sealed scope

Phase 5 is permanently defined as the database-safety stage required before identity-dependent app screens or user-owned persistence APIs.

Delivered controls:

- foreign keys preserved and ownership-preserving foreign keys added;
- unique constraints added where required;
- required ownership fields enforced;
- money stored using PostgreSQL `numeric`, never floating point;
- required user ownership on every current financial record;
- RLS prevents one user reading or writing another user's records;
- cross-user financial relationships rejected at database level;
- soft archive rules implemented;
- physical DELETE withheld from the restricted Worker role;
- created timestamps preserved;
- updated timestamps covered, including alerts;
- automatic append-only audit records implemented;
- chronological migrations `005`, `006`, `007` deployed;
- rollback procedure recorded at `database/rollbacks/phase5_to_phase4.sql`;
- rollback tested with an empty schema diff against Phase 4;
- isolated Neon test and production branches kept separate;
- synthetic Phase 5 test records kept out of production;
- Worker `/ready` requires migration `007` and fails closed if it is absent or database connectivity is unavailable.

Phase 5 migrations:

1. `005_phase5_database_safety.sql`
2. `006_phase5_audit_actor_context.sql`
3. `007_phase5_financial_settings_archive.sql`

A test-only audit-actor NULL defect was found after migration 005 on the isolated Neon test branch and corrected by migration 006 before production promotion. Production received migrations 005–007 in one controlled transaction, so that defective intermediate state was never exposed live.

## Phase 5 production audit

Production database:

- project: `genevieve-budget`
- project ID: `icy-morning-93993343`
- database: `neondb`
- PostgreSQL: 18
- production branch: `main` (`br-old-boat-axqvorbe`)
- restricted Worker role: `genevieve_budget_worker`

Phase 5 isolated test branch:

- `phase5-database-safety-test` (`br-withered-fire-axt9yppr`)

Rollback proof branch:

- `phase5-rollback-test` (`br-soft-mountain-axryrrpf`)

Final production audit after promotion:

- migrations `000,001,002,003,004,005,006,007` — PASS;
- RLS-protected tables: 15 — PASS;
- RLS policies: 44 — PASS;
- ownership-preserving foreign keys: 8 — PASS;
- automatic owned-record audit triggers: 14 — PASS;
- floating-point money columns: 0 — PASS;
- required ownership on every current financial record — PASS;
- archive coverage on current mutable financial records — PASS;
- Worker DELETE privilege on Phase 5 application tables: none — PASS;
- test-to-production schema comparison: empty — PASS.

## Phase 5 verification evidence

Implementation merge commit:

`66933f63e4cee767ad25afa8a4ae491f6272f92e`

Post-implementation `main` verification:

- Phase 2 baseline verification #129 (`32924950634`) — GREEN;
- Phase 3 Cloudflare verification #63 (`32924950636`) — GREEN;
- Phase 4 Neon database verification #19 (`32924950663`) — GREEN;
- Phase 5 database safety verification #3 (`32924950629`) — GREEN, including live production `/ready` at migration `007`.

Completion archive PR #29 head `47c6cc1e494d790994922d10327122485b204b24` then passed:

- Phase 2 #130 (`32929273963`) — GREEN;
- Phase 3 #64 (`32929274026`) — GREEN;
- Phase 4 #20 (`32929273975`) — GREEN;
- Phase 5 #4 (`32929273940`) — GREEN.

Archive merge commit:

`1a513223a407e05986c520d493543fa0c1f1eb50`

Post-archive `main` verification:

- Phase 2 baseline verification #131 (`32929321289`) — GREEN;
- Phase 3 Cloudflare verification #65 (`32929321312`) — GREEN;
- Phase 4 Neon database verification #21 (`32929321310`) — GREEN;
- Phase 5 database safety verification #5 (`32929321297`) — GREEN, including live production `/ready` at migration `007`.

## Earlier sealed stages

### Phase 4 — Neon connection

Phase 4 production connection PR: #24
Phase 4 production merge commit: `393143b776541659a200eb05686883964e386c63`
Phase 4 archive merge commit: `97730100088207bdb02a339e8dbcd27a29e14111`
Detailed archive: `docs/PHASE4_COMPLETION_ARCHIVE.md`
Trigger audit correction: `docs/PHASE4_TRIGGER_COUNT_CORRECTION.md`

Phase 4 established the verified Cloudflare Worker → Hyperdrive → Neon `neondb` connection and migrations `000` through `004`.

### Phase 3 — Cloudflare production deployment

Phase 3 re-seal merge commit: `09b773801e0d219ef248181de9e48bf906d72217`
Phase 3 documentation closure: `bb63194af60a4dd7e8be00119f64c6e0ae39a4e3`
Detailed archive: `docs/PHASE3_CLOUDFLARE_RESEAL.md`

### Phase 2 — subscriber/data foundation

Authoritative historical archives:

- `docs/PHASE2_COMPLETION_ARCHIVE.md`
- `docs/PHASE2_DATA_CONTRACT_AMENDMENT.md`
- `docs/PHASE2_SUBSCRIPTIONS_SAVINGS_AMENDMENT.md`

Phase 2 contains the preserved subscriber runtime and financial data contracts on which Phases 3–5 depend.

### Phase 1 — locked product contract

Authoritative contract: `docs/PRODUCT_CONTRACT.md`.

Locked principles include Personal and Professional product doors, one shared financial engine, safe-to-spend, Smooth My Bills / Pay Ahead, Hold My Money / Bill Target, Green → Yellow → Red → Recovery alerts, subscription decisions, verified savings, privacy/authority rules and the GitHub + Cloudflare + Neon architecture.

## Current known governance issue

GitHub `main` branch protection is not currently enabled. This does not break the live application, Cloudflare runtime, Hyperdrive connection or Phase 5 database safety controls, but repository governance remains weaker than the intended production standard until PR/status-check protection is enabled.

The current GitHub connector can read this state but does not expose a branch-protection write operation.

## Remaining build — chronological order

The previous roadmap that called identity work “Phase 5” is superseded. Phase 5 is now permanently Database Safety. All later stages move forward by one number.

### Phase 6 — Identity, user scope and permissions — NEXT

- Authenticated user identity.
- Transaction-local PostgreSQL `app.user_id` established before every user-owned query.
- Personal vs Professional entitlement.
- Trusted-support permission model.
- Separate read authority from financial action authority.
- Preserve and rerun Phase 2, Phase 3, Phase 4 and Phase 5 gates.
- Do not build user-owned financial screens or persistence endpoints until identity scope is proven fail-closed.

### Phase 7 — Core accounts and balances

- Persistent multiple accounts/assets.
- Credit cards, loans, BNPL and debts.
- Internal transfers not counted as spending.
- Spendable vs protected/reserved balances.

### Phase 8 — Transactions and expense intelligence

- Persistent transaction storage/import/manual entry.
- Categories.
- Yes / No / Maybe review.
- Essential / Worth It / Unsure / Waste intelligence.
- Unknown/duplicate/forgotten-charge foundations.

### Phase 9 — Income and payday engine

- Weekly, fortnightly, monthly and irregular income.
- Next-income calculation.
- Income-cycle normalisation.

### Phase 10 — Obligations and bill calendar

- Recurring and irregular bills.
- Due dates.
- Bill calendar.
- Upcoming-obligation protection.

### Phase 11 — Smooth My Bills / Pay Ahead

- Convert annual/quarterly/irregular obligations into income-cycle contributions.
- Physical bills-account or virtual-reserve mode.
- Green / Yellow / Red / Recovery alerting.

### Phase 12 — Hold My Money / Bill Target

- Target amount.
- Due date.
- Amount reserved.
- Remaining required.
- Required contribution.
- Green / Yellow / Red / Recovery alerting.

### Phase 13 — Safe-to-spend engine

- Income minus bills, provisions/targets, debts, emergency buffer and savings commitments.
- Safe this income cycle.
- Safe this week.
- Safe today.
- Protected money excluded from free cash.

### Phase 14 — Forecast and cash-flow warning

- Budget vs actual.
- Projected end-of-month spending.
- Shortfall prediction.
- Recovery actions.

### Phase 15 — Savings and emergency funds

- Savings goals.
- Emergency fund.
- Separate potential savings from verified realised savings.

### Phase 16 — Debt planning

- Debt commitments.
- Interest scenarios.
- Repayment planning.
- Do not misrepresent future savings as realised savings.

### Phase 17 — Subscription and recurring-cost manager

- Keep / Cancel / Maybe / Another month / Pause / Review next charge.
- Price increases.
- Duplicate services.
- Forgotten charges.
- Explicit authority before external action.

### Phase 18 — Household continuity and financial-change controls

- Direct-debit/account-change checklist.
- Fees and interest monitoring.
- Backup/export.

### Phase 19 — Personal accessibility modes

- Simple / low-cognitive-load mode.
- Trusted-support access with restricted permissions.

### Phase 20 — Professional entities and project accounting

- Businesses, divisions, projects, workstreams, cost centres, funding pools and accounts.
- Transaction allocation across the hierarchy.
- Professional schema tables created only at this later professional stage.

### Phase 21 — Professional commitments, invoices and revenue

- Committed vs paid vs owing.
- Revenue expected/received.
- Available uncommitted cash.

### Phase 22 — Professional project forecasting

- Approved budget, actual, committed, forecast, variance, cost-to-complete and projected final cost.
- Green / Yellow / Red / Recovery monitoring.

### Phase 23 — Professional cash-flow forecasting

- 7-day, 30-day, 90-day and 12-month forecasts.
- Wages, contractors, tax, commitments, rent, insurance, debt and reserved funds.

### Phase 24 — Professional contracts and recurring costs

- SaaS, licences, hosting, insurance, rent, vehicles, phones, memberships, suppliers, contractors and leases.
- Keep / Renegotiate / Cancel / Review decisions with explicit authority.

### Phase 25 — Verified Savings Ledger

Baseline → Proposed action → Action completed → Evidence → Later result → Verified saving.

### Phase 26 — Reporting, backup and export

- Personal reports.
- Professional project/business reports.
- Data export and continuity.

### Phase 27 — Security, privacy and abuse-resistance audit

- Access controls.
- Secrets handling.
- Data minimisation.
- Financial-action authorisation.
- Auditability.

### Phase 28 — Subscriber readiness

- Full automated test/build/audit gates.
- Database migration verification.
- Cloudflare production health/readiness.
- Failure/recovery testing.
- Final release checklist and production archive.

## Advancement rule

**Phase 5 — Database Safety is COMPLETE / LIVE / GREEN / ARCHIVED.**

The next permitted functional build is:

**Phase 6 — Identity, user scope and permissions.**

Do not start Phase 7 or any later stage until Phase 6 is built, linked to Phases 1–5, verified, GREEN and archived.
