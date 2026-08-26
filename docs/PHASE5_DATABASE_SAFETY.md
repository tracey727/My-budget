# GENEVIEVE Budget — Phase 5 Database Safety

Date: 26 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Phase 5 branch: `phase5-database-safety`
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

Production received no Phase 5 synthetic test records during development testing.

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

The production database was still untouched.

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

The rollback preserves historical audit rows while removing Phase 5 schema/security objects and Phase 5 migration ledger entries.

## Worker linkage

Phase 5 does not replace the Phase 4 Cloudflare/Hyperdrive connection. It extends it.

The linked chain becomes:

`sealed Phase 2 subscriber runtime → Cloudflare Worker → Hyperdrive → Neon neondb → migration 007 → RLS/ownership safety`

Worker readiness now fails closed unless database `neondb` contains migration `007`.

`/health` remains liveness and does not depend on database readiness.

`/ready` requires assets, database connectivity and migration `007`.

The endpoint-level controlled failure test is permanent in the repository: missing database connectivity keeps `/health` live while `/ready` returns HTTP 503 without connection details.

## Automated gate

`npm run verify:phase5` runs chronologically:

`Phase 2 → Phase 3 → Phase 4 → Phase 5`

The dedicated workflow is:

`.github/workflows/phase5-database-safety.yml`

The existing Phase 4 database workflow remains active and verifies that the original Cloudflare → Hyperdrive → Neon connection path is still intact through the current Phase 5 schema.

## Promotion rule

Do not promote Phase 5 to production unless:

1. repository verification through Phase 5 passes;
2. the test branch remains green;
3. production is still at the expected Phase 4 parent state;
4. migrations 005, 006 and 007 are applied to production atomically/in a controlled sequence with no partial live state;
5. production is re-audited without test records;
6. test and production schemas match;
7. Cloudflare `/ready` reports Phase 5 / migration 007;
8. all GitHub PR gates pass;
9. the PR is merged using the expected head SHA;
10. all post-merge `main` gates pass.

Only after the final Phase 5 archive is merged may the next chronological product stage begin.

## Current status

**PHASE 5 — BUILT ON TEST BRANCH / DATABASE BEHAVIOUR GREEN / ROLLBACK PROVEN / PRODUCTION PROMOTION PENDING REPOSITORY GATES.**
