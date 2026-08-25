# GENEVIEVE Budget — Build Archive

## Current authoritative checkpoint

Date: 25 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Phase 4 database-foundation merge commit on `main`: `4b7de179ebd180b4dfefd91bf1c253a486aed46a`
Cloudflare production URL: `https://my-budget.positivity864.workers.dev`

**Phase 2 — COMPLETE / GREEN / ARCHIVED**

**Phase 3 — COMPLETE / LIVE / GREEN / ARCHIVED**

**Phase 4 — DATABASE FOUNDATION BUILT / PRODUCTION MIGRATED / GREEN / MERGED; CONNECTION SUBSTAGE NEXT**

Neon production database:

- project: `genevieve-budget`
- project ID: `icy-morning-93993343`
- database: `neondb`
- PostgreSQL: 18
- production branch: `main` (`br-old-boat-axqvorbe`)
- verified development branch: `phase4-schema-dev` (`br-wandering-rice-ax2oofpd`)

Production contains all 15 required Phase 4 core tables and zero deferred professional tables. Migrations `000,001,002,003,004` are recorded. The final production audit returned 22 foreign keys, 15 triggers and 40 indexes. Development-to-production Neon schema comparison returned an empty diff both before and after the GitHub merge.

Post-merge `main` verification for `4b7de179ebd180b4dfefd91bf1c253a486aed46a`:

- Phase 2 baseline verification run #115 (`32841639057`) — **GREEN**
- Phase 3 Cloudflare verification run #49 (`32841638984`) — **GREEN**, including live Cloudflare verification
- Phase 4 Neon database verification run #5 (`32841638986`) — **GREEN**

Detailed database checkpoint: `docs/PHASE4_DATABASE_CHECKPOINT.md`.
Migration workflow: `database/README.md`.

**Next permitted action: Phase 4 Cloudflare → Neon connection and readiness verification.**

Phase 5 remains blocked until the real production database connection is proven GREEN and Phase 4 is finally archived.

---

## Phase 3 — final production closure

Phase 3 Cloudflare was re-sealed after the Phase 2 runtime expanded to the seven-view subscriber chain:

`Home → Money → Bills → Subs → Accounts → Savings → Review`

The sealed production runtime chain is:

`index.html → phase2-data-runtime.js → phase2-subscriptions-savings-runtime.js → app.js`

The existing donor `app.js` remains preserved.

Phase 3 re-seal PR #20 merged as `09b773801e0d219ef248181de9e48bf906d72217`. The documentation closure merged as `bb63194af60a4dd7e8be00119f64c6e0ae39a4e3`.

Phase 3 final production verification established:

- full Phase 2 preservation gate — PASS;
- Phase 3 runtime/configuration tests — PASS;
- Wrangler binding types and drift check — PASS;
- Cloudflare deploy dry-run — PASS;
- live production app — PASS;
- live `/health` — PASS;
- live `/ready` — PASS;
- no Phase 4 database binding at the Phase 3 boundary — PASS.

Detailed archive: `docs/PHASE3_CLOUDFLARE_RESEAL.md`.

**Phase 3 result: COMPLETE / LIVE / GREEN / ARCHIVED.**

---

## Phase 4 — PostgreSQL database foundation

### Dedicated Neon project

A dedicated Neon project was created instead of reusing another GENEVIEVE application's database:

- project: `genevieve-budget`
- project ID: `icy-morning-93993343`
- database: `neondb`
- production branch: `main`
- isolated development branch: `phase4-schema-dev`

Database credentials and connection strings are not committed to GitHub.

### Chronological migrations

1. `000_phase4_migration_ledger.sql`
   - migration ledger
   - shared updated-at helper
2. `001_phase4_user_foundation.sql`
   - users
   - profiles
   - financial_settings
   - transaction_categories
3. `002_phase4_accounts_transactions.sql`
   - accounts
   - transactions
4. `003_phase4_recurring_money.sql`
   - incomes
   - bills
   - bill_provisions
   - subscriptions
   - savings_goals
   - debts
5. `004_phase4_alerts_savings_audit.sql`
   - alerts
   - verified_savings
   - audit_events

Each migration was applied to the isolated Neon development branch and audited before the next migration. The exact tested migrations were then applied to Neon production `main`, one at a time, with another audit after each production migration.

### Required Phase 4 core tables

Production contains all 15 required core tables:

- users
- profiles
- accounts
- transactions
- transaction_categories
- incomes
- bills
- bill_provisions
- subscriptions
- savings_goals
- debts
- alerts
- financial_settings
- verified_savings
- audit_events

Internal migration infrastructure: `schema_migrations`.

### Professional tables intentionally deferred

None of these professional tables has been built in this database-foundation substage:

- organisations
- organisation_members
- projects
- project_members
- cost_centres
- project_budgets
- project_expenses
- commitments
- invoices
- suppliers
- forecasts

### Database audit result

Development audit:

- 15/15 required tables — PASS
- 0 professional tables — PASS
- migrations `000,001,002,003,004` — PASS
- representative data smoke test through the linked financial tables — PASS
- smoke data cleanup — PASS

Production audit:

- 15/15 required tables — PASS
- 0 professional tables — PASS
- migration ledger `000,001,002,003,004` — PASS
- foreign keys: 22
- triggers: 15
- indexes: 40
- verified development-to-production schema diff: empty — PASS

### Repository Phase 4 gate

Phase 4 database foundation added:

- `phase4-database-contract.test.mjs`
- `npm run test:phase4`
- `npm run verify:phase4`
- `.github/workflows/phase4-neon.yml`

`verify:phase4` preserves the complete Phase 2 and Phase 3 gates before verifying the migration contract.

Pre-merge archive head `420041138b43467eb0e0c71efef0e00ae6c34510` passed Phase 2 run #114, Phase 3 run #48 and Phase 4 run #4.

PR #22 then merged the database foundation to `main` as `4b7de179ebd180b4dfefd91bf1c253a486aed46a`.

Post-merge `main` passed Phase 2 run #115, Phase 3 run #49 and Phase 4 run #5. A final read-only Neon audit reconfirmed the complete production schema and a final schema comparison again returned an empty diff.

### Linkage before and after

Before database foundation:

`sealed browser/runtime contract → Cloudflare Phase 3 → database not configured`

After database foundation:

`sealed browser/runtime contract → numbered PostgreSQL migration contract → verified Neon development schema → identical Neon production schema`

The Cloudflare Worker has deliberately not been connected in this substage. `/ready` must not claim database readiness until the next Phase 4 substage proves a real Worker-to-Neon connection.

### Phase 4 remaining work

The database is built. Phase 4 as a whole is not yet closed.

Remaining Phase 4 work, in chronological order:

1. establish the Cloudflare-to-Neon connection method appropriate to Workers;
2. use Hyperdrive where appropriate for external PostgreSQL connectivity;
3. verify development connectivity;
4. verify production connectivity;
5. verify connection-failure behaviour does not falsely report readiness;
6. change `/ready` away from `not-configured-phase-4` only after real connectivity is proven;
7. rerun Phase 2 + Phase 3 + Phase 4 gates;
8. verify live Cloudflare production readiness;
9. archive Phase 4 completely;
10. only then permit Phase 5.

Detailed checkpoint: `docs/PHASE4_DATABASE_CHECKPOINT.md`.

---

## Phase 2 — sealed foundation

Phase 2 is the preserved application/data-contract baseline on which Phase 3 and Phase 4 build.

Phase-specific historical archives remain authoritative for detailed Phase 2 evidence:

- `docs/PHASE2_COMPLETION_ARCHIVE.md`
- `docs/PHASE2_DATA_CONTRACT_AMENDMENT.md`
- `docs/PHASE2_SUBSCRIPTIONS_SAVINGS_AMENDMENT.md`

Phase 2 includes the preserved subscriber runtime, deterministic install/build path, source and artifact verification, donor `app.js` preservation, account types including BNPL, expanded transactions, Bills, Subscriptions, Savings Goals, backup/restore continuity and the associated runtime/data contracts.

Phase 2 remained GREEN through the Phase 3 production re-seal and Phase 4 database foundation.

---

## Historical Phase 1 checkpoint

Phase 1 locked the product contract before coding. The authoritative contract is `docs/PRODUCT_CONTRACT.md`.

Locked principles include:

- Personal and Professional product doors;
- one shared financial engine;
- bank balance is not safe-to-spend;
- Smooth My Bills / Pay Ahead;
- Hold My Money / Bill Target;
- Green → Yellow → Red → Recovery alerts;
- safe-to-spend model;
- conversational expense review;
- subscription decision model;
- professional budget controls;
- verified-savings separation;
- privacy and authority rules;
- GitHub + Cloudflare + Neon production architecture target.

---

# Remaining build — chronological order

Do not start a later phase until the immediately preceding phase is built, linked, verified, archived and GREEN.

## Phase 4 — Neon development and production data foundation — IN PROGRESS

Database foundation — **COMPLETE / PRODUCTION MIGRATED / GREEN / MERGED**.

Connection substage — **NEXT**:

- connect Cloudflare Worker to verified Neon production PostgreSQL;
- use the appropriate Workers/PostgreSQL connection method and Hyperdrive where appropriate;
- verify development and production connectivity;
- verify failure behaviour;
- update `/ready` only after database connectivity is proven;
- rerun all stage gates and live production checks;
- archive Phase 4 completely.

## Phase 5 — Identity, user scope and permissions

- User identity.
- Personal vs Professional entitlement.
- Trusted-support permission model.
- Separate read authority from financial action authority.

## Phase 6 — Core accounts and balances

- Persistent multiple accounts/assets.
- Credit cards, loans, BNPL and debts.
- Internal transfers not counted as spending.
- Spendable vs protected/reserved balances.

## Phase 7 — Transactions and expense intelligence

- Persistent transaction storage/import/manual entry.
- Categories.
- Yes / No / Maybe review.
- Essential / Worth It / Unsure / Waste intelligence.
- Unknown/duplicate/forgotten-charge foundations.

## Phase 8 — Income and payday engine

- Weekly, fortnightly, monthly and irregular income.
- Next-income calculation.
- Income-cycle normalisation.

## Phase 9 — Obligations and bill calendar

- Recurring and irregular bills.
- Due dates.
- Bill calendar.
- Upcoming-obligation protection.

## Phase 10 — Smooth My Bills / Pay Ahead

- Convert annual/quarterly/irregular obligations into income-cycle contributions.
- Physical bills-account or virtual-reserve mode.
- Green / Yellow / Red / Recovery alerting.

## Phase 11 — Hold My Money / Bill Target

- Target amount.
- Due date.
- Amount reserved.
- Remaining required.
- Required contribution.
- Green / Yellow / Red / Recovery alerting.

## Phase 12 — Safe-to-spend engine

- Income minus bills, provisions/targets, debts, emergency buffer and savings commitments.
- Safe this income cycle.
- Safe this week.
- Safe today.
- Protected money excluded from free cash.

## Phase 13 — Forecast and cash-flow warning

- Budget vs actual.
- Projected end-of-month spending.
- Shortfall prediction.
- Recovery actions.

## Phase 14 — Savings and emergency funds

- Savings goals.
- Emergency fund.
- Separate potential savings from verified realised savings.

## Phase 15 — Debt planning

- Debt commitments.
- Interest scenarios.
- Repayment planning.
- Do not misrepresent future savings as realised savings.

## Phase 16 — Subscription and recurring-cost manager

- Keep / Cancel / Maybe / Another month / Pause / Review next charge.
- Price increases.
- Duplicate services.
- Forgotten charges.
- Explicit authority before external action.

## Phase 17 — Household continuity and financial-change controls

- Direct-debit/account-change checklist.
- Fees and interest monitoring.
- Backup/export.

## Phase 18 — Personal accessibility modes

- Simple / low-cognitive-load mode.
- Trusted-support access with restricted permissions.

## Phase 19 — Professional entities and project accounting

- Businesses, divisions, projects, workstreams, cost centres, funding pools and accounts.
- Transaction allocation across the hierarchy.
- Professional schema tables are created at this later professional stage, not during Phase 4 database foundation.

## Phase 20 — Professional commitments, invoices and revenue

- Committed vs paid vs owing.
- Revenue expected/received.
- Available uncommitted cash.

## Phase 21 — Professional project forecasting

- Approved budget, actual, committed, forecast, variance, cost-to-complete and projected final cost.
- Green / Yellow / Red / Recovery monitoring.

## Phase 22 — Professional cash-flow forecasting

- 7-day, 30-day, 90-day and 12-month forecasts.
- Wages, contractors, tax, commitments, rent, insurance, debt and reserved funds.

## Phase 23 — Professional contracts and recurring costs

- SaaS, licences, hosting, insurance, rent, vehicles, phones, memberships, suppliers, contractors and leases.
- Keep / Renegotiate / Cancel / Review decisions with explicit authority.

## Phase 24 — Verified Savings Ledger

Baseline → Proposed action → Action completed → Evidence → Later result → Verified saving.

## Phase 25 — Reporting, backup and export

- Personal reports.
- Professional project/business reports.
- Data export and continuity.

## Phase 26 — Security, privacy and abuse-resistance audit

- Access controls.
- Secrets handling.
- Data minimisation.
- Financial-action authorisation.
- Auditability.

## Phase 27 — Subscriber readiness

- Full automated test/build/audit gates.
- Database migration verification.
- Cloudflare production health/readiness.
- Failure/recovery testing.
- Final release checklist and production archive.

---

# Advancement rule

**Current permitted action: finish Phase 4 by connecting Cloudflare to the verified Neon production database and proving readiness.**

Phase 3 is complete and must not be reopened unless a regression is discovered.

Do not begin Phase 5 or any later phase until the Phase 4 connection substage is fully built, linked, verified, GREEN and archived.