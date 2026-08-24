# Phase 2 — Completion Archive

Archived: 24 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Phase 2 repair branch: `phase2-baseline-repair`
Base audited: `main` at `2946f7dd214faf18e3a7555d87ea119ac2481754`
First complete green repair commit: `f74f67fc3943bc2563d9421bfba8db391fe2bd1b`
First complete green workflow: `Phase 2 baseline verification` run `#37` / run id `32691183877`
Status: PHASE 2 COMPLETE ON REPAIR BRANCH; archive commit must re-pass before merge.

## Chronology repaired

The controlling order remains:

STOP → audit `main` → repair Phase 2 → verify complete Phase 2 green → archive Phase 2 → re-verify archive commit → merge → verify merged `main` → only then Phase 3 Cloudflare.

No Cloudflare or Neon work was performed in Phase 2.

## What the audit established

- `index.html → /app.js` is the actual subscriber runtime on the audited `main` branch.
- `main.jsx → App.jsx` exists as a React migration destination but is not the subscriber entry point.
- Switching the root to React during Phase 2 would have removed donor functionality, so the subscriber runtime was preserved rather than prematurely replaced.
- The previous CI label implied React verification while the normal Vite build did not prove that `App.jsx` compiled.
- The previous production build did not include fixed-path subscriber assets required by the legacy runtime and service worker.
- The repository lacked a reproducible dependency lock and used `npm install` in CI.
- The old Vite toolchain resolved a high-severity dependency vulnerability.

## Repairs completed

- Added a committed npm lockfile and changed CI to deterministic `npm ci`.
- Pinned direct package versions used by the repository.
- Updated Vite to `8.2.2` and `@vitejs/plugin-react` to `6.1.0`; the verified dependency tree reports zero vulnerabilities.
- Added a source syntax gate.
- Added Phase 2 runtime-preservation tests.
- Preserved `index.html → app.js` as the single supported subscriber runtime for this phase.
- Added an explicit subscriber-asset copy step so `app.js`, `styles.css`, `service-worker.js` and `manifest.webmanifest` are present at the fixed paths the runtime expects after production build.
- Added a diagnostic production-artifact verification gate.
- Added a separate React preservation build using `react-preview.html` and `vite.react.config.mjs`, proving `main.jsx → App.jsx` remains compilable without changing subscriber behaviour.
- Replaced compile-only CI with a stage-specific Phase 2 baseline workflow.
- Preserved `app.js` functionality; no donor feature was deleted.

## Complete Phase 2 green gate

The first complete green run passed all of the following:

1. Reproducible install with `npm ci`.
2. JavaScript source syntax verification.
3. All 27 automated tests.
4. Supported subscriber Vite production build.
5. Production artifact verification for `index.html`, `app.js`, `styles.css`, `service-worker.js` and `manifest.webmanifest`, including confirmation that the built index still references `/app.js`.
6. Independent React preservation production build.
7. Dependency audit with zero reported vulnerabilities and a high-severity failure threshold.

## Preservation decision

Phase 2 does not claim that the React UI has replaced the donor application. It explicitly prevents that false assumption. The donor runtime remains supported while React source and the already-migrated pure models are preserved and independently verified for later chronological work.

## Advancement gate

This archive does not itself authorise Phase 3. The archive commit must pass the same Phase 2 workflow, then the PR must be merged, and the merged `main` commit must pass its push-triggered Phase 2 workflow. Only after that merged-main green is confirmed may Phase 3 Cloudflare begin.
