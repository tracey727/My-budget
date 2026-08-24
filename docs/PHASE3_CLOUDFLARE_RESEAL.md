# Phase 3 — Cloudflare Re-seal Archive

Archived: 25 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Branch: `phase3-cloudflare-reseal-seven-view`
Pull request: `#20`
Base: merged Phase 2 subscriptions/savings baseline `e539bb6ea1ab61550a100389315f3c94483f37db`
Implementation head before archive: `8ace98c677c3711afdee3cc6093d575ee424d3ef`
Phase 2 preservation verification on implementation head: run `#104` — GREEN
Phase 3 Cloudflare verification on implementation head: run `#38` — GREEN
Phase 4 Neon: **NOT STARTED / NOT AUTHORISED BY THIS RE-SEAL**

## Purpose

Re-seal Cloudflare Phase 3 after the Phase 2 runtime expanded from the original five static views to the staged seven-view subscriber chain:

`Home → Money → Bills → Subs → Accounts → Savings → Review`

The re-seal must preserve the current Phase 2 data/runtime contract and must not introduce Neon or any Phase 4 database binding.

## Runtime chain re-verified

The source and production execution order is:

`index.html → phase2-data-runtime.js → phase2-subscriptions-savings-runtime.js → app.js`

The first Phase 2 runtime injects Bills and advances navigation to six destinations. The subscriptions/savings runtime injects Savings and advances navigation to seven destinations before the preserved donor `app.js` initialises.

`app.js` remains preserved. The Cloudflare re-seal is infrastructure/runtime verification and cache-version work, not a donor feature rewrite.

## Cloudflare production artifact changes

- Advanced the subscriber runtime/cache token from `phase3-navigation-runtime-v2` to `phase3-seven-view-runtime-v3`.
- Advanced the service-worker cache to `every-cent-v2-phase3-seven-view-runtime-v3`.
- Preserved the existing iPhone horizontal-containment and pointer-focus repair.
- Preserved the account-selector and account-dialog deployment patches.
- Preserved the navigation fallback, but documented it against the staged Bills/Savings runtime rather than the historical five-view description.
- Kept both Phase 2 runtime assets in the build copy and service-worker cache.

## Strengthened Phase 3 gate

`phase3-runtime-chain.test.mjs` now verifies:

1. the five base HTML destinations remain one button + one view each;
2. Bills is injected by `phase2-data-runtime.js`;
3. Savings is injected by `phase2-subscriptions-savings-runtime.js`;
4. the staged navigation advances through six then seven columns;
5. the production copy includes the subscriptions/savings runtime;
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

The worker continues to expose `/health` and `/ready` while explicitly reporting the database as not configured until Phase 4.

## Automated gate evidence

### Phase 2 preservation — run #104

GREEN:

1. reproducible install
2. source syntax
3. Phase 2 model and preservation tests
4. subscriber production build
5. Phase 2 production artifact verification
6. preserved React migration build
7. dependency security audit

### Phase 3 Cloudflare — run #38

GREEN:

1. reproducible install
2. complete Phase 2 gate preserved
3. Phase 3 runtime/configuration tests
4. Cloudflare binding-type generation
5. generated type drift check
6. Cloudflare deploy dry-run
7. explicit no-Phase-4-database-binding check

## Cloudflare Git deployment gate

This repository is connected to Cloudflare Workers Git integration for the `my-budget` project under the `positivity864.workers.dev` account subdomain.

Before PR #20 may be merged, the Cloudflare Git-integrated branch deployment for the archive head must report successful. After merge, the `main` production deployment must report successful before the re-seal can be treated as production-complete.

The final live gate is:

1. Cloudflare Git deployment successful for the sealed commit;
2. production `main` deployment successful after merge;
3. live root application available;
4. `/health` available;
5. `/ready` available;
6. no Phase 4 database claim or binding;
7. archive preserved on `main`.

## Stop/advancement rule

Do not start Neon Phase 4 from this archive alone.

Phase 4 is permitted only after PR #20 is GREEN, the archive commit is GREEN, the re-seal is merged to `main`, Cloudflare production reports the merged deployment successful, and the Phase 3 live gate is verified.