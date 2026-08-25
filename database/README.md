# GENEVIEVE Budget — Phase 4 PostgreSQL Database

## Production database

- Neon project: `genevieve-budget`
- Neon project ID: `icy-morning-93993343`
- Database: `neondb`
- PostgreSQL: 18
- Production branch: `main`
- Production branch ID: `br-old-boat-axqvorbe`
- Development schema branch: `phase4-schema-dev`
- Development branch ID: `br-wandering-rice-ax2oofpd`

Database credentials and connection strings must never be committed to this repository.

## Chronological migrations

1. `000_phase4_migration_ledger.sql`
   - migration ledger
   - shared `updated_at` trigger helper
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

## Required Phase 4 core tables

`users`, `profiles`, `accounts`, `transactions`, `transaction_categories`, `incomes`, `bills`, `bill_provisions`, `subscriptions`, `savings_goals`, `debts`, `alerts`, `financial_settings`, `verified_savings`, `audit_events`.

The internal `schema_migrations` table is additional infrastructure and is not a product table.

## Professional tables are deliberately deferred

The following tables must not be added during this database-foundation substage:

`organisations`, `organisation_members`, `projects`, `project_members`, `cost_centres`, `project_budgets`, `project_expenses`, `commitments`, `invoices`, `suppliers`, `forecasts`.

## Safe migration workflow

For every future schema change:

1. Start from the current production schema.
2. Create an isolated Neon development/migration branch.
3. Add one bounded, numbered migration to GitHub.
4. Apply that migration to the Neon development branch.
5. Audit tables, relationships, constraints, indexes and triggers.
6. Run representative development-only data tests where appropriate.
7. Run `npm run verify:phase4` so Phase 2 and Phase 3 remain preserved and the database migration contract remains green.
8. Apply the exact tested migration to production only after the development gate is green.
9. Re-audit production.
10. Compare development and production schemas; the expected diff after promotion is empty.
11. Archive the result before advancing.

## Current boundary

The PostgreSQL schema is production-built and verified.

The Cloudflare Worker is not yet connected to Neon in this database-foundation substage. The next chronological Phase 4 substage is to establish the Cloudflare-to-Neon production connection using the approved Workers/PostgreSQL connection method, prove connectivity, and change `/ready` away from `not-configured-phase-4` only after the real database connection is green.
