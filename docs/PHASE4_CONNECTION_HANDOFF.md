# GENEVIEVE Budget — Phase 4 Hyperdrive Connection Handoff

Date: 26 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Current branch: `phase4-cloudflare-neon-connection`
Open pull request: `#24`
Base `main`: `1319a0b9ae921b520d7043e05df58f9127fa4120`
Latest preview-green implementation head before this documentation commit: `e4d4ae9aefb7df68e6f608e3c4438daee8894ac3`

## What we are building

GENEVIEVE Budget / Every Cent is being built as a production-ready financial management application with a protected chronological delivery process. The present work is Phase 4: connecting the already-built Cloudflare Worker to the already-built Neon PostgreSQL production database without breaking the sealed Phase 2 runtime or sealed Phase 3 Cloudflare deployment.

The immediate Phase 4 connection chain is:

`Cloudflare Worker → Hyperdrive → Neon PostgreSQL production → schema_migrations version 004`

The Worker must remain fail-closed: `/health` proves the Worker runtime is alive, while `/ready` may return HTTP 200 only when both Cloudflare static assets and the real database are ready.

## Why this is being built

The application needs a real production database before later phases can add identity, user scope, persistent accounts, transaction APIs, safe-to-spend calculations, forecasting, savings, debt, subscriptions and professional accounting. Phase 4 establishes a tested, auditable database connection boundary first so later financial features do not build on an unverified or insecure data path.

Key delivery principle: do not skip chronology. A later phase may not begin until the current phase is built, linked, tested, live, archived and GREEN.

## Preserved earlier stages

### Phase 2

Phase 2 remains the sealed application/data-contract baseline. The donor `app.js` remains preserved. The supported subscriber runtime remains:

`index.html → phase2-data-runtime.js → phase2-subscriptions-savings-runtime.js → app.js`

The current data contract includes accounts, transactions, Bills, Subscriptions and Savings Goals with backup/restore continuity.

### Phase 3

Phase 3 remains the sealed Cloudflare deployment layer. Its seven-view subscriber navigation remains:

`Home → Money → Bills → Subs → Accounts → Savings → Review`

Phase 3 was previously closed as COMPLETE / LIVE / GREEN / ARCHIVED. Phase 4 is allowed to add Hyperdrive without reopening or weakening the sealed Phase 3 static-assets/runtime contract.

## Phase 4 database foundation already completed before this branch

Dedicated Neon project:

- project: `genevieve-budget`
- project ID: `icy-morning-93993343`
- database: `neondb`
- PostgreSQL: 18
- production branch: `main` (`br-old-boat-axqvorbe`)
- verified development branch: `phase4-schema-dev` (`br-wandering-rice-ax2oofpd`)

Production contains all 15 required Phase 4 core tables and zero deferred professional tables. Migrations `000,001,002,003,004` are present. The previous production schema audit returned 22 foreign keys, 15 triggers and 40 indexes. Development and production schema comparison returned an empty diff.

Required Phase 4 tables:

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

Deferred professional tables remain intentionally unbuilt until the later professional stage:

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

## Manual infrastructure completed in this connection substage

### Restricted Neon Worker role

Role: `genevieve_budget_worker`

Verified permissions:

- CONNECT to `neondb` — true
- USAGE on schema `public` — true
- SELECT on `public.schema_migrations` — true

The role does not have superuser, create-role, create-database, replication or bypass-RLS privileges.

The password is secret and must never be placed in GitHub, documentation, ZIP handoff text or chat.

### Hyperdrive

Cloudflare Hyperdrive configuration:

- name: `genevieve-budget-prod-fresh`
- configuration ID: `40061acf4dd74d808860c06fe9c2f075`
- database: PostgreSQL
- database name: `neondb`
- database user: `genevieve_budget_worker`
- port: 5432
- Neon host is direct/unpooled; Hyperdrive provides pooling
- query caching: disabled

No raw Neon connection string or password is committed to the repository.

## Code built in the Phase 4 connection branch

### `wrangler.jsonc`

Adds:

- `nodejs_compat`
- Hyperdrive binding named `HYPERDRIVE`
- Hyperdrive ID `40061acf4dd74d808860c06fe9c2f075`

Preserves:

- Worker main: `./src/worker.mjs`
- assets directory: `./dist`
- assets binding: `ASSETS`
- Worker-first routes: `/health`, `/ready`

### PostgreSQL driver

`pg` is pinned exactly at `8.23.0` in both `package.json` and `package-lock.json`.

The lock was generated using a real npm install, then verified with `npm ci` and `npm audit --audit-level=high`.

### `src/worker.mjs`

The Worker now imports `Client` from `pg`.

`/health` remains a Worker-liveness endpoint and does not depend on database readiness.

`/ready` now checks:

1. `ASSETS` binding exists and can fetch.
2. `HYPERDRIVE.connectionString` exists.
3. A PostgreSQL connection can be opened.
4. `current_database()` equals `neondb`.
5. `public.schema_migrations` contains version `004`.

Success response:

```json
{"ok":true,"service":"genevieve-budget","phase":4,"assets":"ready","database":"ready","migration":"004"}
```

Failure behaviour is fail-closed. Missing Hyperdrive, connection failure, wrong database, missing migration or missing assets must return HTTP 503 and must not expose connection strings, passwords, driver errors or stack traces.

### Phase 4 readiness tests

`phase4-cloudflare-neon.test.mjs` tests:

- successful `neondb` + migration 004 readiness
- missing Hyperdrive binding
- wrong database
- missing migration 004
- simulated connection failure
- no error/secret leakage
- both assets and database required before HTTP 200

### Phase 3 preservation repair

The old Phase 3 test previously forbade any Hyperdrive binding because Phase 3 ended before Phase 4 existed. On this branch it was repaired so it continues to preserve:

- Worker identity
- static-assets binding
- `/health`
- `/ready`
- seven-view subscriber runtime
- no D1
- no raw database URL/secret

but it no longer treats the authorized Phase 4 Hyperdrive binding as a Phase 3 regression.

### Generated Worker types

`worker-configuration.d.ts` was regenerated from Wrangler and now contains:

`HYPERDRIVE: Hyperdrive;`

The one-use type-generation helper removed itself after the generated types were committed.

## Audit trail

### Dependency checkpoint

GitHub Actions run `32920785139` — GREEN.

Passed:

- exact `pg@8.23.0` install
- reproducible `npm ci`
- Phase 2 tests
- Phase 4 migration-contract tests
- dependency security audit

### Worker readiness checkpoint

GitHub Actions run `32921073003` — GREEN.

Passed:

- reproducible install
- Worker syntax
- Phase 4 migration and readiness tests
- dependency security audit

### Expanded pre-PR checkpoint

GitHub Actions run `32921154182` — GREEN.

Passed:

- reproducible install
- Worker syntax
- complete Phase 2 preservation gate
- Phase 3 tests
- Cloudflare deployment dry-run
- Phase 4 readiness tests

### Type-generation checkpoint

GitHub Actions run `32921231082` — GREEN.

Passed:

- reproducible install
- Wrangler type generation
- Hyperdrive type verification
- generated type commit
- helper cleanup

### PR #24 first permanent Phase 4 gate

Phase 2 run #118 was GREEN.

Phase 4 run #8 (`32921358153`) went RED only at the new raw-secret assertion after the entire code/build/test gate had passed. The assertion scanned `.github` and matched the literal regex text inside its own workflow definition. Live readiness was correctly skipped.

No application code or database code was changed to fix this. Only the scanner scope was corrected so it scans deployable source/config rather than its own rule text.

### Corrected PR #24 permanent gates

Implementation head: `e4d4ae9aefb7df68e6f608e3c4438daee8894ac3`

- Phase 2 baseline verification run #119 (`32921433521`) — GREEN
- Phase 3 Cloudflare verification run #53 (`32921433607`) — GREEN
- Phase 4 Neon database verification run #9 (`32921433629`) — GREEN

Phase 4 run #9 passed:

- `npm ci`
- complete `verify:phase4`
- all Phase 2 tests: 52/52
- all Phase 3 tests: 8/8
- all Phase 4 tests: 12/12
- production subscriber build
- React preservation build
- `npm audit`: 0 vulnerabilities
- current generated Cloudflare types
- Hyperdrive binding verification
- raw secret scan
- Wrangler dry-run with `HYPERDRIVE` + `ASSETS`
- live preview database readiness

Live preview readiness URL:

`https://phase4-cloudflare-neon-connection-my-budget.positivity864.workers.dev/ready`

The live preview passed on attempt 1 and returned:

```json
{"ok":true,"service":"genevieve-budget","phase":4,"assets":"ready","database":"ready","migration":"004"}
```

This proves the real preview chain:

`Cloudflare preview Worker → Hyperdrive → Neon production → schema_migrations 004`

## Current status / exact stopping point

**PHASE 4 CONNECTION IMPLEMENTATION: BUILT / PREVIEW LIVE / GREEN / NOT MERGED / NOT ARCHIVED**

PR #24 is OPEN and mergeable.

Do not call Phase 4 complete yet.

Do not start Phase 5.

Production `main` remains at `1319a0b9ae921b520d7043e05df58f9127fa4120` until PR #24 is explicitly merged.

## Last completed implementation step

The last completed implementation step was the corrected permanent PR audit proving the real preview `/ready` endpoint reaches Neon successfully through Hyperdrive and confirms migration `004`.

A documentation-only handoff commit is being added after that preview-green implementation head. Because the PR head changes when this document is committed, permanent gates should be allowed to rerun before merge.

## Next chronological steps

1. Allow the permanent Phase 2, Phase 3 and Phase 4 PR gates to rerun after this handoff documentation commit; require all GREEN.
2. Perform the controlled failure-behaviour proof before production merge. Preferred method: local or isolated preview-only invalid database connection/binding so `/ready` returns 503 while `/health` stays 200. Do not alter the production Hyperdrive configuration to create the failure test.
3. Reconfirm the successful preview `/ready` after the failure test is removed/reverted.
4. Merge PR #24 only when the branch is GREEN and expected head SHA is confirmed.
5. Wait for the existing Cloudflare Git integration to deploy merged `main`; do not use an uncontrolled first manual `wrangler deploy`.
6. Verify production root:
   - `https://my-budget.positivity864.workers.dev/` → 200 / Every Cent
7. Verify production `/health`:
   - HTTP 200
   - service `genevieve-budget`
   - phase 4
8. Verify production `/ready`:
   - HTTP 200
   - `ok:true`
   - `assets:"ready"`
   - `database:"ready"`
   - `migration:"004"`
9. Verify the post-merge Phase 2, Phase 3 and Phase 4 GitHub workflows all GREEN on the resulting `main` commit.
10. Run one final read-only Neon production audit:
    - required Phase 4 tables: 15/15
    - deferred professional tables: 0
    - migrations: 000,001,002,003,004
    - no unexpected schema drift
11. Confirm no raw database credential or connection URI exists in repository source.
12. Create `docs/PHASE4_COMPLETION_ARCHIVE.md` with final merge SHA, workflow run IDs, Hyperdrive non-secret ID, failure-test evidence, production root/health/ready evidence and final Neon audit.
13. Update `docs/BUILD_ARCHIVE.md` to:
    - `Phase 4 — COMPLETE / LIVE / GREEN / ARCHIVED`
    - `Next permitted phase: Phase 5 — Identity, user scope and permissions`
14. Put the documentation-only Phase 4 closure through the normal gates and merge it.
15. Verify the documentation closure on `main` one final time.
16. STOP Phase 4.
17. Only then begin Phase 5.

## Remaining program roadmap after Phase 4

Follow the authoritative `docs/BUILD_ARCHIVE.md`. High-level remaining chronology:

- Phase 5 — Identity, user scope and permissions
- Phase 6 — Core accounts and balances
- Phase 7 — Transactions and expense intelligence
- Phase 8 — Income and payday engine
- Phase 9 — Obligations and bill calendar
- Phase 10 — Smooth My Bills / Pay Ahead
- Phase 11 — Hold My Money / Bill Target
- Phase 12 — Safe-to-spend engine
- Phase 13 — Forecast and cash-flow warning
- Phase 14 — Savings and emergency funds
- Phase 15 — Debt planning
- Phase 16 — Subscription and recurring-cost manager
- Phase 17 — Household continuity and financial-change controls
- Phase 18 — Personal accessibility modes
- Phase 19 — Professional entities and project accounting
- Phase 20 — Professional commitments, invoices and revenue
- Phase 21 — Professional project forecasting
- Phase 22 — Professional cash-flow forecasting
- Phase 23 — Professional contracts and recurring costs
- Phase 24 — Verified Savings Ledger
- Phase 25 — Reporting, backup and export
- Phase 26 — Security, privacy and abuse-resistance audit
- Phase 27 — Subscriber readiness / final production release

Each phase must be built, linked, audited, live where applicable, archived and GREEN before the next begins.

## Rules for the next chat / next assistant

1. Read this file first.
2. Read `docs/BUILD_ARCHIVE.md`, `docs/PHASE4_DATABASE_CHECKPOINT.md`, `database/README.md`, `wrangler.jsonc`, `src/worker.mjs`, `phase4-cloudflare-neon.test.mjs`, `.github/workflows/phase4-neon.yml`, `.github/workflows/cloudflare-phase3.yml` and `package.json` from branch `phase4-cloudflare-neon-connection` or PR #24.
3. Confirm the current PR head before doing any work. Do not assume `e4d4ae9...` is still the head after this documentation commit.
4. Never place the Neon password or raw connection string in chat, GitHub, documentation or a ZIP.
5. Never reuse another GENEVIEVE app's database or Hyperdrive configuration.
6. Do not change the Hyperdrive configuration ID unless the user explicitly authorizes a replacement.
7. Preserve the Phase 2 runtime and donor `app.js`.
8. Preserve the sealed Phase 3 Cloudflare surface.
9. Do not merge while any gate is red.
10. If a test goes red, stop later actions, diagnose the exact failure, make the smallest bounded correction, rerun the gate and record the red→fix→green evidence.
11. Do not begin Phase 5 until Phase 4 is production-live, fully archived and GREEN.
12. Do not claim production readiness from the preview alone. PR #24 is currently preview-green, not production-merged.

## Security notes

- The Neon Worker role password was intentionally not recorded here.
- The raw Neon connection URI was intentionally not recorded here.
- Hyperdrive ID is non-secret and may be recorded.
- Hyperdrive caching is disabled for fresh financial readiness reads.
- Current Worker database access is intentionally limited to readiness proof through `schema_migrations`; later application read/write authority belongs to later chronological phases.

## Non-blocking maintenance warnings observed

Wrangler type generation prints a recommendation to install `@types/node` because `nodejs_compat` is enabled. The current project Worker is JavaScript and the generated Worker types are current and pass the gate; this warning did not block the build.

GitHub Actions also warns that older action internals targeting Node 20 are being forced to Node 24. Current workflow runs complete successfully. Treat this as future workflow-maintenance work, not a reason to bypass the current chronological gate.
