# Phase 2 — Baseline Technical Audit

Recorded: 24 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Base audited: `main` at `2946f7dd214faf18e3a7555d87ea119ac2481754`
Status: repair branch verification in progress; do not advance.

## Chronology rule

STOP → audit `main` → repair Phase 2 only → verify the complete Phase 2 gate → archive Phase 2 → only then permit Phase 3 Cloudflare work.

No Cloudflare or Neon configuration belongs in this Phase 2 repair.

## Audit findings

1. The subscriber entry point on `main` is the legacy static runtime: `index.html` loads `/app.js`.
2. `main.jsx` loads `App.jsx`, but `index.html` does not reference `main.jsx`; therefore the React application is not currently the subscriber runtime.
3. The service worker also confirms the legacy subscriber path by caching `/index.html`, `/styles.css`, `/app.js` and `/manifest.webmanifest`.
4. The previous workflow name and step labels implied that the React application was being built, but the normal Vite build followed `index.html` and therefore did not prove that `App.jsx` compiled.
5. The repository had no committed package lock and CI used `npm install`, so dependency resolution was not reproducible.
6. Existing Phase 2 model tests cover accounts/balances, transaction semantics, transfer invariants, expense intelligence, subscriptions and CSV/JSON backup model behaviour, but the phase lacked a single stage-specific baseline gate.
7. The donor runtime still contains user-facing capability that is not all present in the React UI. Switching the subscriber root to React during this baseline phase would therefore delete behaviour and violate preservation.

## Phase 2 repair decision

For Phase 2 only, preserve `index.html → app.js` as the single supported subscriber runtime. Do not delete `App.jsx`, `main.jsx` or the React-compatible model modules. Instead, compile the React migration destination independently as a preservation gate so later chronological migration can proceed without losing source integrity.

This decision changes verification architecture, not subscriber functionality.

## Required Phase 2 gate

Phase 2 may be marked green only when all of the following pass on the repair PR and then on merged `main`:

- deterministic `npm ci` from committed `package-lock.json`;
- JavaScript source syntax gate;
- all Node automated tests, including runtime-preservation and backup/export model tests;
- supported subscriber Vite production build;
- built-artifact presence check for `index.html`, `app.js`, `styles.css`, `service-worker.js` and `manifest.webmanifest`;
- independent React preservation production build;
- dependency security audit at high severity or above;
- no Phase 3 Cloudflare or Phase 4 Neon work introduced.

## Preservation rules

- `app.js` remains untouched during the Phase 2 baseline repair unless a defect in the supported donor runtime itself is proven.
- The subscriber root is not switched to React in this phase.
- React migration source is retained and compiled independently.
- Existing feature modules are not extended into later feature phases during this repair.
- No database, authentication, Cloudflare, Neon, forecasting, safe-to-spend, bills or later-phase feature work is permitted.

## Archive rule

Do not create the Phase 2 completion archive until the full PR gate above is green. After the archive-only commit is added, re-run the gate. Merge only if it remains green, then verify the merged `main` run before Phase 3 begins.
