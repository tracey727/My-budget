# GENEVIEVE Budget — Phase 5 Database Safety

Date: 26 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Phase 5 branch: `phase5-database-safety`
Phase 5 PR: #28
Phase 4 parent checkpoint: `63a8c7e288473cb102bf8a9dccd67650682f8c93`

## Scope

Phase 5 is a database-safety stage performed before building identity-dependent application screens.

Required scope:

- foreign keys;
- unique constraints;
- required-field constraints;
- decimal/numeric money types only;
- user ownership on every financial record;
- cross-user isolation;
- soft-delete/archive rules;
- created timestamps;
- updated timestamps;
- audit records;
- chronological database migrations;
- tested rollback procedure;
- separate test and production databases.

No Phase 6 features or professional tables are included.

## Environments

Production:

- project: `genevieve-budget`
- project ID: `icy-morning-93993343`
- database: `neondb`
- branch: `main`
- branch ID: `br-old-boat-axqvorbe`

Phase 5 test:

- branch: `phase5-database-safety-test`
- branch ID: `br-withered-fire-axt9yppr`
- parent: production `main`
- contains synthetic test records only

Rollback proof:

- temporary branch: `phase5-rollback-test`
- branch ID: `br-soft-mountain-axryrrpf`
- parent: production `main`

Production received no Phase 5 synthetic test records during development testing or promotion.

## Pre-change production audit

Before Phase 5 migrations were developed:

- production subscriber tables contained no user financial data;
- `schema_migrations` contained `000` through `004`;
- the restricted Worker role was not superuser and did not bypass RLS;
- the Worker held only the Phase 4 readiness SELECT privilege on `schema_migrations`;
- all inspected monetary fields already used PostgreSQL `numeric` rather than floating-point types;
- all financial records had required `user_id` except `transaction_categories.user_id`, which was nullable;
- RLS was not yet enabled;
- alerts had `created_at` but lacked `updated_at`.

## Phase 5 migrations

### Migration 005

`database/migrations/005_phase5_database_safety.sql`

Adds the main database-safety contract:

- requires `transaction_categories.user_id`;
- adds soft-archive timestamps and archive consistency checks;
- retains and synchronizes the existing accounts `archived` flag;
- adds `alerts.updated_at` and update trigger;
- adds composite ownership uniqueness and ownership-preserving foreign keys;
- blocks cross-user account/category/bill references;
- validates polymorphic alert ownership;
- enables RLS for users, owned financial tables and audit events;
- limits the Worker to own-row SELECT/INSERT/UPDATE;
- denies physical DELETE to the Worker;
- preserves append-only audit events;
- adds automatic owned-record audit triggers.

### Migration 006

`database/migrations/006_phase5_audit_actor_context.sql`

A real test on the isolated Phase 5 database exposed a defect in the first audit function: when no `app.actor_type` setting existed, SQL NULL semantics allowed a NULL actor to reach the not-null audit column.

The production database was still untouched when the defect was discovered.

Migration 006 corrects this fail-safe rule so a missing or invalid actor context becomes `system`. The test was rerun and passed.

### Migration 007

`database/migrations/007_phase5_financial_settings_archive.sql`

Completes the archive contract by adding `archived_at` and its timestamp constraint to the user-owned `financial_settings` record.

Current Phase 5 readiness marker: `007`.

## Test-database schema audit

After Phase 5 migrations on the isolated test branch:

- RLS-protected tables: 15;
- RLS policies: 44;
- ownership-preserving foreign keys: 8;
- automatic owned-record audit triggers: 14;
- floating-point money columns: 0;
- inspected numeric money/financial columns: 20;
- every current financial table has required user ownership;
- alerts now have both created and updated timestamps;
- mutable financial records have the defined archive mechanism;
- the Worker has no DELETE privilege on any Phase 5 application table;
- audit events remain append-only.

## Behavioural isolation tests

Synthetic users A and B were created only on the Phase 5 test branch.

As `genevieve_budget_worker` with User A established as the transaction-local application user:

1. Reading accounts returned only User A's account — PASS.
2. Reading audit events returned only User A's events — PASS.
3. Attempting to insert a User B-owned account was rejected by RLS — PASS.
4. Attempting to create a User A transaction linked to User B's account was rejected by `transactions_account_owner_fk` — PASS.
5. Attempting physical DELETE of User A's account was denied by privileges — PASS.
6. Archiving User A's account set `archived_at`, synchronized the existing archive flag, updated `updated_at`, and generated an audit event — PASS.
7. Creating an alert for User A's own bill succeeded — PASS.
8. Creating a User A alert pointing at User B's bill was rejected by the alert ownership trigger — PASS.

For the RLS proof only, the database owner was temporarily granted membership in `genevieve_budget_worker` on the isolated test branch so the connection could execute `SET ROLE`. That temporary membership was revoked after the tests. Production was never changed for this test technique.

## Rollback proof

Authoritative rollback:

`database/rollbacks/phase5_to_phase4.sql`

The isolated rollback branch was migrated to the Phase 5 safety schema and rolled back to the sealed Phase 4 boundary. Neon schema comparison against its Phase 4 parent returned an empty diff after rollback.

The rollback preserves historical audit rows while removing Phase 5 schema/security objects and Phase 5 migration ledger entries `005`, `006`, and `007`.

## Repository/build gate before production

PR #28 first executed the repository and build verification while production was still at Phase 4.

The Phase 5 workflow completed these steps successfully before the live readiness step:

- reproducible `npm ci` — PASS;
- `npm run verify:phase5` — PASS;
- generated Cloudflare types current — PASS;
- Hyperdrive binding and raw-secret scan — PASS.

`npm run verify:phase5` nests the gates chronologically:

`Phase 2 → Phase 3 → Phase 4 → Phase 5`

## Production promotion

After the source/build gate passed and the production preflight reconfirmed migrations `000` through `004` with zero production subscriber users/accounts/transactions, the exact tested Phase 5 migrations were promoted.

Migrations `005`, `006`, and `007` were applied to Neon production in one database transaction. This prevented migration 005's test-discovered audit-context defect from existing as an exposed intermediate production state.

No Phase 5 synthetic test data was inserted into production.

## Production read-only audit after promotion

Production returned:

- database: `neondb`;
- migrations: `000,001,002,003,004,005,006,007`;
- RLS-protected tables: 15;
- RLS policies: 44;
- ownership-preserving foreign keys: 8;
- automatic owned-record audit triggers: 14;
- floating-point money columns: 0;
- inspected numeric money/financial columns: 20;
- every current financial table has required `user_id`;
- every current financial table has `created_at` and `updated_at` coverage appropriate to mutability;
- all current mutable financial records have archive coverage;
- Worker DELETE privilege: false on all Phase 5 application tables;
- production users: 0;
- production accounts: 0;
- production transactions: 0.

Neon test-to-production schema comparison returned an empty diff after promotion.

## Worker linkage

Phase 5 does not replace the Phase 4 Cloudflare/Hyperdrive connection. It extends it.

The linked chain is:

`sealed Phase 2 subscriber runtime → Cloudflare Worker → Hyperdrive → Neon neondb → migration 007 → RLS/ownership safety`

Worker readiness fails closed unless database `neondb` contains migration `007`.

`/health` remains liveness and does not depend on database readiness.

`/ready` requires assets, database connectivity and migration `007`.

The endpoint-level controlled failure test is permanent in the repository: missing database connectivity keeps `/health` live while `/ready` returns HTTP 503 without connection details.

## Green PR evidence before final documentation refresh

On PR head `73408ee4223381e7f18426e320ba15c5fa77157a`, after production promotion:

- Phase 2 baseline verification run #127 (`32924700532`) — GREEN;
- Phase 3 Cloudflare verification run #61 (`32924700511`) — GREEN;
- Phase 4 Neon database verification run #17 (`32924700515`) — GREEN;
- Phase 5 database safety verification run #1 (`32924700574`) — GREEN.

Because this evidence file is now refreshed, the same four gates must pass again on the final PR head before merge.

## Merge and closure rule

Do not merge unless:

1. the final PR head passes Phase 2, Phase 3, Phase 4 and Phase 5 gates;
2. PR #28 is merged using the exact expected head SHA;
3. all four workflows pass again on the resulting `main` merge commit;
4. the final completion/archive documentation is merged before Phase 6 work begins.

## Current status

**PHASE 5 — BUILT / TEST DATABASE GREEN / ROLLBACK PROVEN / PRODUCTION MIGRATED AND AUDITED / PR GATES GREEN ON PRIOR HEAD / FINAL HEAD RE-VERIFICATION REQUIRED BEFORE MERGE.**
