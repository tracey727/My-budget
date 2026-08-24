# Phase 3 — Cloudflare Re-seal Archive

Archived: 25 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Branch: `phase3-cloudflare-reseal-seven-view`
Pull request: `#20`
Base: merged Phase 2 subscriptions/savings baseline `e539bb6ea1ab61550a100389315f3c94483f37db`
Final implementation head before archive evidence update: `cb745cd888f1f44d1a1eefebbac7c615a760e1bb`
Phase 2 preservation verification: run `#106` — GREEN
Phase 3 Cloudflare verification: run `#40` — GREEN
Phase 4 Neon: **NOT STARTED / NOT AUTHORISED BY THIS RE-SEAL**

## Purpose

Re-seal Cloudflare Phase 3 after the Phase 2 runtime expanded from the original five static views to the staged seven-view subscriber chain:

`Home → Money → Bills → Subs → Accounts → Savings → Review`

The re-seal preserves the current Phase 2 data/runtime contract and does not introduce Neon or any Phase 4 database binding.

## Runtime chain re-verified

The source and Cloudflare production execution order is:

`index.html → phase2-data-runtime.js → phase2-subscriptions-savings-runtime.js → app.js`

The first Phase 2 runtime injects Bills and advances navigation to six destinations. The subscriptions/savings runtime injects Savings and advances navigation to seven destinations before the preserved donor `app.js` initialises.

`app.js` remains preserved. The Cloudflare re-seal is infrastructure/runtime verification and cache-version work, not a donor feature rewrite.

## Cloudflare production artifact changes

- Advanced the subscriber runtime/cache token from `phase3-navigation-runtime-v2` to `phase3-seven-view-runtime-v3`.
- Advanced the service-worker cache to `every-cent-v2-phase3-seven-view-runtime-v3`.
- Preserved the existing iPhone horizontal-containment and pointer-focus repair.
- Preserved the account-selector and account-dialog deployment patches.
- Preserved the navigation fallback and re-described it against the staged Bills/Savings runtime.
- Kept both Phase 2 runtime assets in the production build copy and service-worker cache.

## Strengthened Phase 3 gate

`phase3-runtime-chain.test.mjs` now verifies:

1. the five base HTML destinations remain one button + one view each;
2. Bills is injected by `phase2-data-runtime.js`;
3. Savings is injected by `phase2-subscriptions-savings-runtime.js`;
4. staged navigation advances through six then seven columns;
5. production copy includes the subscriptions/savings runtime;
6. the Phase 3 cache token is the seven-view v3 token;
7. backup/restore remains present across the staged runtime chain.

`scripts/verify-phase3-dist.mjs` now verifies the built Cloudflare artifact contains and syntax-checks:

- `app.js`
- `phase2-data-runtime.js`
- `phase2-subscriptions-savings-runtime.js`

It also verifies runtime order, Bills injection, Savings injection, subscription decision support, Savings Goals support, backup/restore presence, mobile containment, versioned app/style assets and service-worker coverage.

## Wrangler / Cloudflare boundary

`wrangler.jsonc` remains a Phase 3-only Workers Static Assets configuration:

- worker name: `genevieve-budget`
- entry: `./src/worker.mjs`
- static assets: `./dist`
- binding: `ASSETS`
- worker-first routes: `/health`, `/ready`

No Hyperdrive, D1, `DATABASE_URL`, Neon or other Phase 4 database binding is introduced by this re-seal.

The worker continues to expose `/health` and `/ready` while explicitly reporting the database as `not-configured-phase-4` until Phase 4.

## Automated gate evidence

### Phase 2 preservation — run #106

GREEN:

1. reproducible install
2. source syntax
3. Phase 2 model and preservation tests
4. subscriber production build
5. Phase 2 production artifact verification
6. preserved React migration build
7. dependency security audit

### Phase 3 Cloudflare — run #40

GREEN:

1. reproducible install
2. complete Phase 2 gate preserved
3. Phase 3 runtime/configuration tests
4. Cloudflare binding-type generation
5. generated type drift check
6. Cloudflare deploy dry-run
7. explicit no-Phase-4-database-binding check
8. live Cloudflare Git deployment verification

The dry-run confirmed the Worker has only the `ASSETS` binding and no database binding.

## Live Cloudflare branch gate

The Cloudflare Git-integrated branch deployment was verified directly by GitHub Actions at:

`https://phase3-cloudflare-reseal-seven-view-my-budget.positivity864.workers.dev`

Run #40 verified on the first attempt:

- `/` — HTTP 200 and contains `Every Cent`
- `/health` — HTTP 200 and contains `"phase":3`
- `/ready` — HTTP 200 and contains `"database":"not-configured-phase-4"`

This proves the re-sealed seven-view build reached Cloudflare and the Phase 3 health/readiness boundary is live before merge.

## Production-main live gate added

`.github/workflows/cloudflare-phase3.yml` now runs on both:

- pull requests targeting `main`; and
- pushes to `main`.

For pull requests it verifies the Cloudflare branch preview. After merge it verifies the production endpoint:

`https://my-budget.positivity864.workers.dev`

The workflow retries while Cloudflare Git deployment catches up, then requires the root app, `/health`, and `/ready` to pass before the pushed `main` Phase 3 gate can be GREEN.

## Final advancement rule

PR #20 may be merged only after this archive commit is GREEN under both Phase 2 and Phase 3 gates.

After merge, the `push` Phase 3 workflow must verify the production `main` Cloudflare endpoint GREEN. Only then is this Phase 3 re-seal production-complete and archived.

Do not start Neon Phase 4 before that merged-main production gate passes.