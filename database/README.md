# GENEVIEVE Budget — PostgreSQL Database

## Environment separation

Production and test must remain separate Neon branches.

### Production

- Neon project: `genevieve-budget`
- Neon project ID: `icy-morning-93993343`
- Database: `neondb`
- PostgreSQL: 18
- production branch: `main`
- production branch ID: `br-old-boat-axqvorbe`
- application role: `genevieve_budget_worker`
- application connection: Cloudflare Worker → Hyperdrive → Neon

### Phase 5 test database

- branch: `phase5-database-safety-test`
- branch ID: `br-withered-fire-axt9yppr`
- parent: production `main`
- purpose: migrations, destructive/failure tests, RLS isolation tests and representative synthetic records only

Synthetic Phase 5 test users and financial records are confined to the test branch. They must never be copied into production.

A second temporary rollback branch was used to prove restoration to the Phase 4 schema boundary. Temporary rollback branches may be deleted after their evidence is archived.

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
   - append-only audit_events
6. `005_phase5_database_safety.sql`
   - required user ownership
   - ownership-preserving foreign keys
   - soft archive fields and constraints
   - alert ownership validation
   - row-level security
   - restricted Worker privileges
   - automatic audit records
7. `006_phase5_audit_actor_context.sql`
   - fail-safe audit actor handling when application actor context is absent
8. `007_phase5_financial_settings_archive.sql`
   - completes soft-archive coverage for financial_settings

The current Phase 5 readiness marker is migration `007`.

## Phase 5 database-safety contract

### Ownership and isolation

Every current financial record is user-owned. `transaction_categories.user_id` is required from Phase 5 onward.

Cross-user references are blocked using ownership-preserving composite foreign keys for account, category and bill relationships. Polymorphic alert references are validated by an ownership trigger.

Row-level security is enabled on the user and user-owned tables. The restricted Worker role can select, insert and update only records belonging to the transaction-scoped application user. Physical DELETE is not granted to the Worker.

Before any future user-data query, application code must establish the authenticated user in the same database transaction using transaction-local PostgreSQL context (`app.user_id`). Queries must fail closed when that context is absent or invalid. Do not use a persistent/session-global identity setting on pooled connections.

### Money

Financial values use PostgreSQL `numeric` types. Floating-point SQL types (`real`, `double precision`, `float`) are prohibited for money and financial calculations.

### Soft archive

Mutable financial records use `archived_at` rather than physical deletion. The existing accounts `archived` boolean is retained for compatibility and synchronized with `archived_at`.

The user record already has the Phase 4 status lifecycle (`active`, `disabled`, `deleted`) and is not physically deleted by the Worker.

### Timestamps

Mutable records retain `created_at` and `updated_at` timestamps. Phase 5 adds `updated_at` to alerts. Append-only audit events use `occurred_at` and deliberately have no mutable `updated_at` field.

### Audit records

`audit_events` remains append-only. Phase 5 adds automatic audit triggers for owned mutable records. A missing or invalid actor context is recorded as `system`, never as NULL.

## Rollback procedure

Authoritative rollback file:

`database/rollbacks/phase5_to_phase4.sql`

Rollback is an explicit maintenance operation, not an application feature. The rollback removes Phase 5 schema/security objects and migration ledger entries `005`, `006`, and `007`, while retaining historical audit rows.

The rollback procedure was tested on an isolated Neon branch and compared against its Phase 4 parent. The schema diff after rollback was empty.

## Safe migration workflow

For every future schema change:

1. Start from the current production schema and verify the expected parent migration.
2. Create or reset an isolated Neon test/migration branch from production.
3. Add bounded, numbered migrations to GitHub in chronological order.
4. Apply the exact migrations to the test branch first.
5. Audit tables, ownership, relationships, required fields, unique constraints, numeric money types, indexes, triggers, policies and privileges.
6. Run representative synthetic tests on the test branch only, including negative cross-user and failure cases.
7. Verify rollback on an isolated branch when the change is reversible by schema rollback.
8. Run `npm run verify:phase5`, which nests Phase 2 → Phase 3 → Phase 4 → Phase 5 verification.
9. Apply the exact tested migrations to production only after all pre-production gates are green.
10. Re-audit production without inserting test records.
11. Compare test and production schemas; after promotion, the expected schema diff is empty.
12. Verify Cloudflare `/health` and `/ready` through Hyperdrive to the expected production migration.
13. Merge through GitHub only after all required gates pass.
14. Re-run all gates on `main` and archive the result before advancing to the next phase.

## Deferred professional tables

These remain deliberately unbuilt until the later professional stage:

`organisations`, `organisation_members`, `projects`, `project_members`, `cost_centres`, `project_budgets`, `project_expenses`, `commitments`, `invoices`, `suppliers`, `forecasts`.

## Current boundary

Phase 4 remains the sealed Cloudflare → Hyperdrive → Neon connection layer. Phase 5 extends that foundation with database safety and user isolation before any identity-dependent application screens or persistence endpoints are built.
