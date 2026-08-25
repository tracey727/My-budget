# Phase 4 — PostgreSQL Database Foundation Checkpoint

Date: 25 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Pull request: `#22`
Base: sealed Phase 3 closure `bb63194af60a4dd7e8be00119f64c6e0ae39a4e3`
Phase 4 database-foundation merge commit: `4b7de179ebd180b4dfefd91bf1c253a486aed46a`

## Status

**DATABASE FOUNDATION BUILT / PRODUCTION MIGRATED / GREEN / MERGED**

This checkpoint completes the PostgreSQL schema-build portion of Phase 4. It does not claim that the Cloudflare Worker is connected to Neon yet.

The next chronological Phase 4 substage is Cloudflare → Neon connection and production readiness verification. Phase 5 remains blocked until that connection substage is green and Phase 4 is finally archived.

## Neon production database

- Project: `genevieve-budget`
- Project ID: `icy-morning-93993343`
- PostgreSQL: 18
- Database: `neondb`
- Production branch: `main`
- Production branch ID: `br-old-boat-axqvorbe`
- Development branch: `phase4-schema-dev`
- Development branch ID: `br-wandering-rice-ax2oofpd`
- Provisioned region: AWS US East (Ohio)

No database password or connection string is stored in GitHub.

## Chronological migration chain

1. `000_phase4_migration_ledger.sql`
   - migration ledger
   - shared updated-at trigger helper
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

Each migration was applied first to the isolated Neon development branch and audited before the next migration was allowed.

## Required Phase 4 tables — production result

All 15 required tables are present in production:

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

The internal `schema_migrations` table is also present.

## Professional tables — intentionally not built

Production contains zero of the deferred professional tables:

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

## Development audit

The development branch was built migration-by-migration and audited after each step.

Final development audit:

- 15/15 required Phase 4 tables — PASS
- 0 professional tables — PASS
- migrations `000,001,002,003,004` — PASS
- representative data path through users, profiles/settings, account/category, transaction, income, bill/provision, subscription, savings goal, debt, alert and verified savings — PASS
- development smoke data cleanup — PASS

## Production audit

The exact tested migrations were applied to Neon production `main`, one at a time, with an audit after each migration.

Final production schema audit:

- required tables: 15/15 — PASS
- professional tables: 0 — PASS
- foreign keys: 22
- triggers: 15
- indexes: 40
- migration ledger: `000,001,002,003,004` — PASS

The development branch was compared against production after promotion. Neon returned an empty schema diff, proving production and the verified development schema match exactly.

## Repository gate

Phase 4 added:

- `phase4-database-contract.test.mjs`
- `npm run test:phase4`
- `npm run verify:phase4`
- `.github/workflows/phase4-neon.yml`

`verify:phase4` preserves the complete Phase 2 and Phase 3 gates before running the Phase 4 migration-contract tests.

Pre-merge archive head `420041138b43467eb0e0c71efef0e00ae6c34510` passed:

- Phase 2 baseline verification run #114 — GREEN
- Phase 3 Cloudflare verification run #48 — GREEN
- Phase 4 Neon database verification run #4 — GREEN

Post-merge `main` commit `4b7de179ebd180b4dfefd91bf1c253a486aed46a` passed:

- Phase 2 baseline verification run #115 (`32841639057`) — GREEN
- Phase 3 Cloudflare verification run #49 (`32841638984`) — GREEN, including live Cloudflare verification
- Phase 4 Neon database verification run #5 (`32841638986`) — GREEN

A final read-only production Neon audit again returned 15 required tables, 0 professional tables, migrations `000,001,002,003,004`, 22 foreign keys, 15 triggers and 40 indexes. A final development-to-production schema comparison again returned an empty diff.

## Linkage before and after

Before this substage:

`sealed browser/runtime data contract → Cloudflare Phase 3 → database not configured`

After this substage:

`sealed browser/runtime data contract → numbered PostgreSQL migration contract → verified Neon development schema → identical Neon production schema`

The Cloudflare Worker remains deliberately unchanged at this point. Its `/ready` endpoint must continue to report the Phase 4 database as not connected until the next substage proves the actual Cloudflare-to-Neon connection.

## Next chronological step

**Phase 4 connection substage:** connect the Cloudflare Worker to the production Neon PostgreSQL database using the approved Workers/PostgreSQL connection method, verify real database connectivity and failure behaviour, update `/ready` only after that proof is green, then archive Phase 4 completely.

Do not begin Phase 5 identity/user-scope work before that Phase 4 connection gate is complete.