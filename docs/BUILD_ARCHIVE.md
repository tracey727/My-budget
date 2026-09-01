# GENEVIEVE Budget — Build Archive

## Current authoritative checkpoint

Date: 27 August 2026, AEST (Queensland)
Repository: `tracey727/My-budget`
Cloudflare production URL: `https://my-budget.positivity864.workers.dev`

**Phase 1 — COMPLETE / CONTRACT LOCKED**

**Phase 2 — COMPLETE / GREEN / ARCHIVED**

**Phase 3 — COMPLETE / LIVE / GREEN / ARCHIVED**

**Phase 4 — COMPLETE / LIVE / GREEN / ARCHIVED**

**Phase 5 — DATABASE SAFETY — COMPLETE / LIVE / GREEN / ARCHIVED**

**Phase 6 — IDENTITY, PERMISSIONS & LIFECYCLE — COMPLETE / PRODUCTION-LIVE / AUDITED / ROLLBACK-PROVEN / POST-MERGE GREEN / ARCHIVED**

Current protected `main` before this documentation correction: `06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`.

Phase 6 implementation PR: #34
Phase 6 implementation merge commit: `e3bd3af42138cc403f212847baefa2a890452e9d`
Phase 6 completion archive PR: #35
Phase 6 archive merge commit: `06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`
Phase 6 final migration: `014`
Detailed Phase 6 completion archive: `docs/PHASE6_COMPLETION_ARCHIVE.md`
Current Phase 6 checkpoint: `docs/PHASE6_IDENTITY_ENTITLEMENT_CHECKPOINT.md`
Database migration/runbook: `database/README.md`

Phase 5 implementation PR: #28
Phase 5 implementation merge commit: `66933f63e4cee767ad25afa8a4ae491f6272f92e`
Phase 5 completion archive PR: #29
Phase 5 archive merge commit: `1a513223a407e05986c520d493543fa0c1f1eb50`
Phase 5 sealed migration boundary: `007`
Detailed Phase 5 completion archive: `docs/PHASE5_COMPLETION_ARCHIVE.md`
Detailed Phase 5 engineering evidence: `docs/PHASE5_DATABASE_SAFETY.md`

## Locked chronology

Do not start a later phase until the immediately preceding phase is built, linked to all earlier stages, verified with the appropriate stage-specific gate, GREEN and archived.

The authoritative sequence through the current checkpoint is:

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare deployment → Phase 4 Hyperdrive/Neon connection → Phase 5 database safety → Phase 6 managed identity, permissions and lifecycle`

The executable production chain is:

`index.html → phase2-data-runtime.js → phase2-subscriptions-savings-runtime.js → preserved app.js → Cloudflare ASSETS → Worker /health + /ready + /auth + /api → managed Neon Auth session validation → HYPERDRIVE → Neon neondb → schema_migrations 014 → transaction-local user/owner/actor scope → active-user/session-revocation checks → trusted-support / Professional authority → PostgreSQL RLS/ownership/archive/audit controls`

Verification remains nested rather than bypassed:

`Phase 2 preservation → Phase 3 Cloudflare verification → Phase 4 database/readiness verification → Phase 5 database-safety verification → Phase 6 identity/permissions/lifecycle verification`

Phase 1 remains the governing locked product contract.

The protected `app.js` remains byte-for-byte preserved at blob SHA `a86381a76c4676b9d14cbcb1a6b9de842c1cd24c`.

## Phase 6 — Identity, permissions and lifecycle — sealed scope

Phase 6 is permanently defined as the identity, user-scope, permission and account-lifecycle stage built on top of the sealed Phase 5 database-safety boundary.

Delivered controls include:

- individual managed authenticated identity;
- server-side managed-session validation;
- transaction-local PostgreSQL `app.user_id`, owner and actor scope before protected work;
- fail-closed missing, malformed, expired, inactive, revoked or unverifiable identities/sessions;
- Personal vs Professional entitlement;
- trusted-support read authority separated from financial-action authority;
- cross-user isolation;
- Professional workspaces;
- exactly six Professional roles: Owner, Administrator, Manager, Accountant/bookkeeper, Project manager and Read-only user;
- separate Professional read, financial-action, member-management and workspace-management capabilities;
- managed sign-up, sign-in, passwordless sign-in, sign-out, password-reset and session lifecycle proxy paths;
- hashed application session/device registry without raw session-token storage;
- one-way local session revocation enforced before user-owned work;
- self-scoped JSON account export including application, financial, trusted-support, Professional and audit records;
- export audit evidence using the audit ledger's `bigint` identifier type;
- soft account deletion preserving financial records;
- deletion revocation of trusted support, sessions, entitlement and Professional memberships;
- automatic archive of Professional workspaces owned by a deleted account so no active ownerless workspace remains;
- explicit permission failures returned as HTTP 403 rather than being misreported as database outages;
- protected Budget engine unchanged;
- complete Phase 6 status gate nested after Phases 2–5.

Phase 6 production migrations were applied in strict chronological order:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

Phase 6 migration files:

1. `008_phase6_auth_identity_entitlement.sql`
2. `009_phase6_trusted_support_permissions.sql`
3. `010_phase6_professional_roles.sql`
4. `011_phase6_account_lifecycle_sessions_export.sql`
5. `012_phase6_export_audit_id_type.sql`
6. `013_phase6_account_deletion_authority.sql`
7. `014_phase6_lifecycle_audit_hardening.sql`

The complete reverse sequence was proven on the isolated rollback branch:

`014 → 013 → 012 → 011 → 010 → 009 → 008 → 007`

The rollback proof returned to migration `007`, removed all Phase 6 tables/functions and produced an empty Neon schema diff against the sealed Phase 5 boundary.

Production Neon state at the Phase 6 seal:

- project: `genevieve-budget` (`icy-morning-93993343`)
- branch: `main` (`br-old-boat-axqvorbe`)
- database: `neondb`
- PostgreSQL: 18
- latest migration: `014`
- `user_entitlements`: present
- `trusted_support_grants`: present
- `professional_workspaces`: present
- `professional_memberships`: present
- `user_sessions`: present
- production application users at final seal: `0`

Production Worker readiness is sealed to:

- `CURRENT_PHASE = 6`
- `EXPECTED_MIGRATION = "014"`

Live `/ready` verification after the Phase 6 archive merge returned HTTP 200 with:

`{"ok":true,"service":"genevieve-budget","phase":6,"assets":"ready","database":"ready","migration":"014"}`

Material Phase 6 defects found during audit and fixed before production included:

- incorrect Professional workspace audit linkage;
- export audit identifier type mismatch;
- insufficient account-deletion cleanup authority;
- Professional permission errors being misreported as 503 instead of 403;
- locally revoked sessions not being enforced on later owned requests;
- session registration being able to reactivate a revoked session hash;
- incomplete account-export lifecycle coverage;
- Professional owner deletion leaving an active ownerless workspace.

All were corrected before the production seal and re-proven by CI, live readiness and rollback verification.

## Phase 6 merge and archive evidence

Final implementation head:

`59df52be1edf7b1b499c58e561e56282770eb267`

Protected implementation merge:

`e3bd3af42138cc403f212847baefa2a890452e9d`

The final implementation-head tree and protected merge tree were identical, proving the merge introduced no conflict-resolution or accidental content changes.

Post-implementation merge, all five required workflows were GREEN on the exact merge commit.

Phase 6 archive PR #35 then changed documentation only and merged as:

`06ec1c00e618c2a0a0a59f0bc9324a02d3a045e0`

All five workflows passed again on that exact protected `main` archive merge, including live Phase 6 readiness.

## Phase 5 — Database Safety — sealed historical scope

Phase 5 is permanently defined as the database-safety stage required before identity-dependent app screens or user-owned persistence APIs.

Delivered controls:

- foreign keys preserved and ownership-preserving foreign keys added;
- unique constraints added where required;
- required ownership fields enforced;
- money stored using PostgreSQL `numeric`, never floating point;
- required user ownership on every current financial record;
- RLS prevents one user reading or writing another user's records;
- cross-user financial relationships rejected at database level;
- soft archive rules implemented;
- physical DELETE withheld from the restricted Worker role;
- created timestamps preserved;
- updated timestamps covered, including alerts;
- automatic append-only audit records implemented;
- chronological migrations `005`, `006`, `007` deployed;
- rollback procedure recorded at `database/rollbacks/phase5_to_phase4.sql`;
- rollback tested with an empty schema diff against Phase 4;
- isolated Neon test and production branches kept separate;
- synthetic Phase 5 test records kept out of production.

Phase 5 migrations:

1. `005_phase5_database_safety.sql`
2. `006_phase5_audit_actor_context.sql`
3. `007_phase5_financial_settings_archive.sql`

A test-only audit-actor NULL defect was found after migration 005 on the isolated Neon test branch and corrected by migration 006 before production promotion. Production received migrations 005–007 in one controlled transaction, so that defective intermediate state was never exposed live.

Phase 5 historical completion evidence remains authoritative in:

- `docs/PHASE5_COMPLETION_ARCHIVE.md`
- `docs/PHASE5_DATABASE_SAFETY.md`
- `docs/PHASE5_CURRENT_CHECKPOINT.md`

The migration `007` references in those historical Phase 5 records describe the sealed Phase 5 boundary; they do not represent the current production migration, which is now `014` after Phase 6.

## Earlier sealed stages

### Phase 4 — Neon connection

Phase 4 production connection PR: #24
Phase 4 production merge commit: `393143b776541659a200eb05686883964e386c63`
Phase 4 archive merge commit: `97730100088207bdb02a339e8dbcd27a29e14111`
Detailed archive: `docs/PHASE4_COMPLETION_ARCHIVE.md`
Trigger audit correction: `docs/PHASE4_TRIGGER_COUNT_CORRECTION.md`

Phase 4 established the verified Cloudflare Worker → Hyperdrive → Neon `neondb` connection and migrations `000` through `004`. The Phase 4 responsibility remains live under the current Phase 6/migration-014 boundary.

### Phase 3 — Cloudflare production deployment

Phase 3 re-seal merge commit: `09b773801e0d219ef248181de9e48bf906d72217`
Phase 3 documentation closure: `bb63194af60a4dd7e8be00119f64c6e0ae39a4e3`
Detailed archive: `docs/PHASE3_CLOUDFLARE_RESEAL.md`

### Phase 2 — subscriber/data foundation

Authoritative historical archives:

- `docs/PHASE2_COMPLETION_ARCHIVE.md`
- `docs/PHASE2_DATA_CONTRACT_AMENDMENT.md`
- `docs/PHASE2_SUBSCRIPTIONS_SAVINGS_AMENDMENT.md`

Phase 2 contains the preserved subscriber runtime and financial data contracts on which Phases 3–6 depend.

### Phase 1 — locked product contract

Authoritative contract: `docs/PRODUCT_CONTRACT.md`.

Locked principles include Personal and Professional product doors, one shared financial engine, safe-to-spend, Smooth My Bills / Pay Ahead, Hold My Money / Bill Target, Green → Yellow → Red → Recovery alerts, subscription decisions, verified savings, privacy/authority rules and the GitHub + Cloudflare + Neon architecture.

## Current repository governance

GitHub `main` protection is enabled through active repository ruleset `Protect main` (`21530843`).

The ruleset applies to `refs/heads/main` and:

- requires pull requests;
- requires branches to be up to date before protected merge;
- requires `phase2`;
- requires `cloudflare-phase3`;
- requires `phase4-neon`;
- requires `phase5-database-safety`;
- requires `phase6`;
- blocks branch deletion;
- blocks force pushes;
- has no bypass actors;
- reports that the current user cannot bypass it.

The previous statement that `main` protection was not enabled is superseded and must not be relied on.

## Remaining build — chronological order

Phase 6 is complete and archived. Phase 7 has not been started by this archive correction.

### Phase 7 — Core accounts and balances — NEXT FUNCTIONAL PHASE

- Persistent multiple accounts/assets.
- Credit cards, loans, BNPL and debts.
- Internal transfers not counted as spending.
- Spendable vs protected/reserved balances.

### Phase 8 — Transactions and expense intelligence

- Persistent transaction storage/import/manual entry.
- Categories.
- Yes / No / Maybe review.
- Essential / Worth It / Unsure / Waste intelligence.
- Unknown/duplicate/forgotten-charge foundations.

### Phase 9 — Income and payday engine

- Weekly, fortnightly, monthly and irregular income.
- Next-income calculation.
- Income-cycle normalisation.

### Phase 10 — Obligations and bill calendar

- Recurring and irregular bills.
- Due dates.
- Bill calendar.
- Upcoming-obligation protection.

### Phase 11 — Smooth My Bills / Pay Ahead

- Convert annual/quarterly/irregular obligations into income-cycle contributions.
- Physical bills-account or virtual-reserve mode.
- Green / Yellow / Red / Recovery alerting.

### Phase 12 — Hold My Money / Bill Target

- Target amount.
- Due date.
- Amount reserved.
- Remaining required.
- Required contribution.
- Green / Yellow / Red / Recovery alerting.

### Phase 13 — Safe-to-spend engine

- Income minus bills, provisions/targets, debts, emergency buffer and savings commitments.
- Safe this income cycle.
- Safe this week.
- Safe today.
- Protected money excluded from free cash.

### Phase 14 — Forecast and cash-flow warning

- Budget vs actual.
- Projected end-of-month spending.
- Shortfall prediction.
- Recovery actions.

### Phase 15 — Savings and emergency funds

- Savings goals.
- Emergency fund.
- Separate potential savings from verified realised savings.

### Phase 16 — Debt planning

- Debt commitments.
- Interest scenarios.
- Repayment planning.
- Do not misrepresent future savings as realised savings.

### Phase 17 — Subscription and recurring-cost manager

- Keep / Cancel / Maybe / Another month / Pause / Review next charge.
- Price increases.
- Duplicate services.
- Forgotten charges.
- Explicit authority before external action.

### Phase 18 — Household continuity and financial-change controls

- Direct-debit/account-change checklist.
- Fees and interest monitoring.
- Backup/export.

### Phase 19 — Personal accessibility modes

- Simple / low-cognitive-load mode.
- Trusted-support access with restricted permissions.

### Phase 20 — Professional entities and project accounting

- Businesses, divisions, projects, workstreams, cost centres, funding pools and accounts.
- Transaction allocation across the hierarchy.
- Professional schema tables created only at this later professional stage.

### Phase 21 — Professional commitments, invoices and revenue

- Committed vs paid vs owing.
- Revenue expected/received.
- Available uncommitted cash.

### Phase 22 — Professional project forecasting

- Approved budget, actual, committed, forecast, variance, cost-to-complete and projected final cost.
- Green / Yellow / Red / Recovery monitoring.

### Phase 23 — Professional cash-flow forecasting

- 7-day, 30-day, 90-day and 12-month forecasts.
- Wages, contractors, tax, commitments, rent, insurance, debt and reserved funds.

### Phase 24 — Professional contracts and recurring costs

- SaaS, licences, hosting, insurance, rent, vehicles, phones, memberships, suppliers, contractors and leases.
- Keep / Renegotiate / Cancel / Review decisions with explicit authority.

### Phase 25 — Verified Savings Ledger

Baseline → Proposed action → Action completed → Evidence → Later result → Verified saving.

### Phase 26 — Reporting, backup and export

- Personal reports.
- Professional project/business reports.
- Data export and continuity.

### Phase 27 — Security, privacy and abuse-resistance audit

- Access controls.
- Secrets handling.
- Data minimisation.
- Financial-action authorisation.
- Auditability.

### Phase 28 — Subscriber readiness

- Full automated test/build/audit gates.
- Database migration verification.
- Cloudflare production health/readiness.
- Failure/recovery testing.
- Final release checklist and production archive.

## Advancement rule

**Phase 6 — Identity, Permissions & Lifecycle is COMPLETE / PRODUCTION-LIVE / GREEN / AUDITED / ROLLBACK-PROVEN / ARCHIVED.**

This `docs/BUILD_ARCHIVE.md` chronology correction is documentation-only and must itself pass all five protected checks and merge through protected `main` before the next functional phase is scoped.

After that documentation correction is merged and post-merge verification is GREEN, the next permitted functional phase is:

**Phase 7 — Core accounts and balances.**

Phase 7 is not started by this document.

## Addendum — 1 September 2026

Note for whoever next reconciles this archive: the repository's git history (`Merge Phase 7 — core accounts and balances`, migration 015) shows Phase 7 has already been merged to `main`, and the local test/build/verify-phase7-dist gates all pass. This archive was not updated at that time and still reads as if Phase 7 were future work above. That reconciliation is out of scope for the change below and is left for a dedicated documentation-correction pass, per the project's own advancement rule.

**Change recorded (documentation-only impact, no financial logic touched):**

- Renamed the product from "Every Cent" to "Genevieve App" (trademark pending) in all user-visible text: `index.html` (title, meta description, `<h1>`, help-dialog heading), `manifest.webmanifest` (`name`/`short_name`), the "invalid backup" toast message in `app.js`, `phase2-data-runtime.js`, `phase2-subscriptions-savings-runtime.js`, and `phase7-backup-bridge.js`, the live-deployment smoke-test string in `.github/workflows/cloudflare-phase3.yml`, and `README.md`.
- Deliberately left all internal `localStorage`/service-worker cache key strings (e.g. `every-cent-money-tracker-v1`) unchanged, to avoid any silent data-loss risk for existing local user data. These are internal identifiers never shown to a user.
- Updated the two hash pins protecting `app.js` (`phase6-identity-entitlement.test.mjs`, `scripts/verify-phase7-dist.mjs`) to match the new blob hash, since the change was intentional and user-authorised.
- Fixed a pre-existing, Windows-only path bug in `scripts/check-source.mjs` (`new URL(...).pathname` producing a doubled drive letter); switched to `fileURLToPath`. Unrelated to the rename; found while verifying this change locally on Windows.
- Verified: `npm test` (138/138 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green.

## Addendum — 1 September 2026 (2)

**Change recorded: dashboard-level overall health indicator.**

Closes a gap in the existing Green/Yellow/Red/Recovery alert system (see docs/PRODUCT_CONTRACT.md): the four-state logic already existed per-bill (`targetAlertStatus` in `phase7-plan-integrity-bridge.js`) but was never rolled up into a single overall indicator on the dashboard itself.

- Added `dashboard-health-bridge.js`, a new bridge file following the exact same pattern as the existing `phase7-*-bridge.js` files: it reads the shared `every-cent-money-tracker-v1` storage key and layers its own DOM updates on top, without modifying `app.js`. This was a deliberate choice — `scripts/copy-subscriber-assets.mjs` applies several targeted build-time patches directly to the deployed copy of `app.js` (Cloudflare/iPhone-specific fixes), so new dashboard logic was added as an independent, loaded-last script instead of touching that file a second time.
- Rolls up all unpaid bills' `alertStatus` (worst-wins: recovery > red > yellow > green) into a new "Overall status" card on the dashboard, with explanatory, non-shaming copy per the product contract's tone requirement.
- Also extends the existing "Potential waste this month" card's hint text with a simple annualised projection (current month's Waste + Unsure total × 12), so a user can see roughly what a habit costs per year, not just per month.
- `app.js`'s protected hash is untouched by this change (verified via `verify-phase7-dist.mjs`).
- Wired into `scripts/copy-subscriber-assets.mjs`, `service-worker.js`'s cache list, and `scripts/verify-dist.mjs`'s required-artifact and reference-order checks.
- New test file `dashboard-health-bridge.test.mjs`, matching the project's existing source-pattern-matching test style.
- Verified: `npm test` (141/141 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green.

**Not yet built (separate, larger pieces of work, tracked for follow-up):** the 30-day scheduled re-check for transactions marked "Maybe"/Unsure, and the "back to zero" professional-side clarification.

## Addendum — 1 September 2026 (3)

**Change recorded: 30-day follow-up review for transactions marked Unsure.**

Closes the second gap noted in the code map: the app previously showed a monthly Unsure/Waste total but never scheduled a follow-up decision, so an "Unsure" judgement could sit forever without being resolved. Per docs/PRODUCT_CONTRACT.md's expense-review flow (Yes / No / Maybe), a Maybe/Unsure item is meant to sit for about a month before the user is asked to make a real decision.

- Added `review-followup-bridge.js`, a third bridge file (same pattern as `dashboard-health-bridge.js` and the existing `phase7-*-bridge.js` files). The review window is derived purely from each transaction's own date -- no new field is written to storage until the user actually acts, keeping the bridge read-mostly and app.js untouched.
- Adds two new panels to the existing "Money review" tab: "Ready for a second look" (Unsure transactions 30+ days old, each with two one-tap actions -- "Yes, keep it" sets worth to `worth`, "No, it was a waste" sets it to `waste`) and "Still thinking it over" (Unsure transactions under 30 days old, showing days remaining, no actions yet).
- Manually verified end-to-end in a local dist preview: seeded a 45-day-old Unsure transaction and a 3-day-old one, confirmed the due/pending split and day-count math, clicked "Yes, keep it", and confirmed the transaction's `worth` field updated correctly in storage with every other field intact and the item correctly disappearing from the due list.
- Wired into `scripts/copy-subscriber-assets.mjs`, `service-worker.js`'s cache list, and `scripts/verify-dist.mjs`'s required-artifact and reference-order checks.
- New test file `review-followup-bridge.test.mjs`, matching the project's existing source-pattern-matching test style.
- Verified: `npm test` (145/145 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green. `app.js` hash pin untouched.

**Still not yet built:** the "back to zero" professional-side clarification (awaiting the user's answer on what that phrase means), and full end-to-end confirmation that bill kitties are wired all the way through the setup flow.

## Addendum — 1 September 2026 (4)

**Change recorded: expected recurring income tracking.**

Full gap audit against the archive's own Phases 8-28 roadmap (requested by the user) found that most of Phases 7-8, 11, 12 and 17 are already substantially built, but the roadmap text was never updated to reflect it. Genuinely missing: the full Safe-to-Spend engine (Phase 13), forecasting (14), debt planning (16), household continuity (18), accessibility modes (19), the entire Professional suite (20-24, not started at all), the Verified Savings Ledger (25), deeper reporting (26), and a formal security audit (27).

User chose to build personal-side depth first, in roadmap order. Before Safe-to-Spend (Phase 13) can be built honestly, it needs two missing inputs it depends on: an expected income amount (Phase 9's "next-income calculation" was only half-built -- the app knew *when* the user is paid but not *how much*) and debt-repayment commitment tracking (part of Phase 16, not yet started). This change closes the income gap.

- Extended `phase7-first-time-setup-model.mjs`'s `buildFirstMoneyPlan` with a new `incomeAmount` field (defaults safely to 0 when unset; existing tests unaffected). This file is not hash-protected, so it was extended directly rather than via a bridge.
- Added `income-plan-bridge.js`, a fourth bridge file following the established pattern. Reads and writes the existing `genevieve-first-time-setup-v1` key directly (unlike the money-tracker key, it has no protective merge patch to work around).
- New "Your regular income" panel on the dashboard: an editable amount-per-pay input, a read-only pay-frequency label sourced from the existing setup data, and a combined "next pay: $X on [date]" readout.
- Manually verified end-to-end in a local dist preview: entered an amount, saved, confirmed the readout updated to "$1,450.00 on 10 Sept", and confirmed the storage write added only the `incomeAmount` field with every other setup field (`payFrequency`, `nextPayDate`, `payAnchorDay`, `billMode`, `completed`, `step`) intact.
- New test file `income-plan-bridge.test.mjs`, plus one new test added to the existing `phase7-first-time-setup.test.mjs` covering the model change.
- Verified: `npm test` (150/150 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green. `app.js` hash pin untouched.

**Next up:** debt-repayment commitment tracking (the second Safe-to-Spend input), then the Safe-to-Spend engine itself.

## Addendum — 1 September 2026 (5)

**Change recorded: debt-repayment commitment tracking.**

Closes the second and final input gap for the Safe-to-Spend engine (Phase 13). Debt accounts (credit/loan/BNPL) already existed as static balance trackers, but nothing recorded what the user is actually committed to repaying each pay cycle.

This is genuinely new persistent data (`debtCommitments`), not a derived view -- so, following the exact same architecture already used to protect `bills` (owned/preserved by `phase2-data-runtime.js`'s chained `setItem` patch) and `savingsGoals` (owned/preserved by `phase2-subscriptions-savings-runtime.js`'s chained patch), `debt-commitments-bridge.js` adds a fourth chained patch, loaded after all the others, that restores the field whenever a write doesn't know it exists. `app.js` is not modified.

- Added `debt-commitments-bridge.js` with its own account-scoped form (liability accounts only: credit, loan, BNPL) on the existing Accounts view: required payment, frequency (weekly/fortnightly/monthly), next due date. Converts between frequencies via annual-cost math (same technique bills already use) to show one combined "required this pay cycle" total.
- Manually verified end-to-end in a local dist preview, including the specific failure mode this session already found once for bills: seeded a debt account and a repayment commitment, confirmed the form, total and list rendered correctly, then **simulated exactly what app.js's `saveState()` does** (a raw write containing only `{version, accounts, transactions, subscriptions}`, no knowledge of `debtCommitments`) and confirmed the commitment survived that write untouched -- proving the new chained-patch protection actually works, not just that it looks right on paper.
- New test file `debt-commitments-bridge.test.mjs`, matching the project's existing source-pattern-matching test style.
- Verified: `npm test` (154/154 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green. `app.js` hash pin untouched.

## Addendum — 1 September 2026 (6)

**Change recorded: the Safe-to-Spend engine (Phase 13), plus three data-integrity bugs it exposed and fixed.**

Added `safe-to-spend-bridge.js`, a sixth bridge, and a new "Actually Safe to Spend" panel above the dashboard's hero cards. Deducts Smooth-method bill contributions, debt commitments and savings commitments from expected income (all normalised to the user's own pay cycle via annual-cost conversion); deliberately excludes Hold-My-Money bill targets and the emergency buffer, per `docs/PRODUCT_CONTRACT.md`. Refuses to show a figure for irregular pay or unset income rather than guessing. Read-only: writes nothing to storage.

Manual end-to-end browser verification (seeding realistic income/bill/debt/savings data into a local dist preview and reloading) found three pre-existing bugs, all now fixed:

- **`$$` collapsed to `$` in the built `app.js`.** `scripts/copy-subscriber-assets.mjs` patches the nav-button click handler via `deployedApp.replace(navClickNeedle, navClickReplacementString)`. Because the second argument was a *string*, not a function, and that string begins with `$$('.nav-button')`, `String.prototype.replace`'s own `$$` → `$` pattern-escape rule silently collapsed it to a single `$` in `dist/app.js` — a selector-all call turning into a selector-one call with no `.forEach`. This threw `TypeError: $(...).forEach is not a function` partway through `app.js`'s `init()` on every single page load, and had nothing to do with `$$` vs `$` in any source file, which is why prior source-text-based tests never caught it. Fixed by passing a replacer function instead (`() => navClickReplacement`), which bypasses `$`-pattern substitution entirely. Added a regression test in `phase3-runtime-chain.test.mjs` that actually executes the real needle/replacement strings through `String.replace` and asserts the `$$` selector survives.
- **`debtCommitments`/`savingsGoals` silently dropped on every page load**, independent of the above crash. Two *load-time* migration functions — `phase2-data-runtime.js`'s `migrateStoredState()` (writes via the raw native `setItem`, bypassing every later-loaded protection layer) and `phase2-subscriptions-savings-runtime.js`'s `migrateExtendedState()` (writes via bracket-notation, bypassing `debt-commitments-bridge.js`'s protection specifically) — both run unconditionally at script load, before any user action, and both predate one or both of these fields. Each rebuilds the stored state from an explicit field list that never got updated when `savingsGoals` and `debtCommitments` were added in earlier sessions. The existing debt-commitments-bridge test only simulated a *user-triggered save* (`app.js`'s `saveState()` shape); it never tested these two always-runs-on-load migrations, which is why this got past that verification and only surfaced now under a real page load. Fixed by adding the missing fields to both files' `readState()`/`writeState()` (or `directWriteState()`) functions, matching the pattern each file already used for the fields it did know about.
- **`phase7-backup-bridge.js`'s `restoreFullBackup()`** rebuilt state from a similar explicit field list that also predates `debtCommitments`, so restoring any backup file silently dropped it even when present in the restored file. Fixed the same way.
- New test file `safe-to-spend-bridge.test.mjs`, plus regression tests added to `phase2-data-runtime.test.mjs`, `phase2-subscriptions-savings-runtime.test.mjs` and `phase7-first-time-setup.test.mjs` covering the three fixes above.
- Verified: `npm test` (164/164 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green, plus manual browser verification confirming the exact formula (`income − smooth bills − debt commitments − savings commitments`) against hand-seeded data with no crash and no data loss on reload. `app.js` hash pin untouched.

**Personal-side depth remaining:** forecasting / cash-flow warnings (Phase 14), deeper debt planning — interest scenarios and repayment planning (Phase 16), household continuity (Phase 18), accessibility modes (Phase 19).

## Addendum — 1 September 2026 (7)

**Change recorded: forecast and cash-flow warning engine (Phase 14).**

Added `forecast-bridge.js` and a new "This month's forecast" dashboard panel, directly below Safe-to-Spend. Derives a monthly-equivalent budget using the same `amountPerFrequency` conversion technique Safe-to-Spend and debt-commitments-bridge already use (targeting `'monthly'` instead of the user's own pay cycle), then compares it against month-to-date spending and linearly projects end-of-month spending from the current daily rate (`spent / dayOfMonth * daysInMonth`). Matches the roadmap's four bullets for this phase: budget vs actual, projected end-of-month spending, shortfall prediction, and recovery actions.

- When the projection exceeds budget, shows concrete recovery actions rather than just a warning: a suggested daily spending pace for the remaining days of the month to get back on budget, plus the month's Waste and Unsure transaction totals (surfaced from the existing `worth` tagging, same field `review-followup-bridge.js` already uses) as places to look for room.
- Read-only bridge; writes nothing to storage. `app.js` is not modified.
- Manually verified end-to-end in a local dist preview across all three states: no income set, on track (low month-to-date spend), and a shortfall scenario (seeded a large day-one spend, confirmed the projected total, the daily-pace suggestion and the Waste/Unsure totals all matched hand-computed expected values, and confirmed the panel live-updates when transactions change).
- New test file `forecast-bridge.test.mjs`, matching the project's existing source-pattern-matching test style.
- Verified: `npm test` (170/170 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green. `app.js` hash pin untouched.

**Next up:** Phase 16 — deeper debt planning (interest scenarios, repayment planning; commitment tracking itself already shipped).

## Addendum — 1 September 2026 (8)

**Change recorded: debt payoff planning — interest rates and amortization projections (Phase 16).**

Extended `debt-commitments-bridge.js` rather than adding a new bridge file: `interestRate` is just a new field on the `debtCommitments` array this bridge already owns and protects, not a new top-level storage key, so no new chained `setItem` patch was needed.

- Each debt commitment can now record an annual interest rate (optional, defaults to 0%).
- The list shows a month-by-month amortization projection per commitment: months to payoff, projected payoff month, and total interest at the current payment. Uses the linked liability account's actual balance, computed by replicating `app.js`'s own `computedBalance()` logic locally (`accountBalance()`) — this bridge is a separate script with no access to `app.js`'s internal state.
- Detects and warns when a payment doesn't cover the interest accruing (the loop runs to a 600-month cap without the balance clearing), rather than showing a nonsensical payoff date.
- Shows a "pay $50/month more" scenario alongside the current projection, matching the roadmap's "interest scenarios" and "repayment planning" bullets. Every line uses "projected"/"would"/explicitly says "a possibility, not money already saved" — the roadmap's fourth bullet for this phase warns against misrepresenting future savings as realised, so the wording was checked deliberately, not left to whatever fell out of the calculation.
- Manually verified all four states in a local dist preview against a hand-computed Node cross-check of the same amortization loop: normal payoff (24 months, $395.65 interest at 18% APR on a $2,000 balance with $100/month payments, matching exactly), the "pay more" scenario (9 months sooner, $147.51 saved, also exact), a payment too low to ever clear the balance ($20/month against 30% APR on $2,000), and zero balance owed.
- Extended `debt-commitments-bridge.test.mjs` with coverage for the interest field, the amortization function, the replicated account-balance logic, and the "pay more" scenario wording.
- Verified: `npm test` (174/174 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green. `app.js` hash pin untouched.

While reviewing app.js's own liability handling for the account-balance replication above, found that `app.js`'s `LIABILITY_TYPES` set (line 13) only includes `credit` and `loan`, omitting `bnpl` — unlike `debt-commitments-bridge.js` and `transaction-model.mjs`, which both correctly treat BNPL as a liability. This means a BNPL account's balance is currently counted as an asset, not a debt, in the Accounts view's own Assets/Debts/Net position summary. Flagged as a separate follow-up rather than fixed here, since correcting it requires touching the hash-pinned `app.js` (four locations must be updated together: the two test/verify hash checks plus two GitHub Actions workflow files).

**Personal-side depth remaining:** household continuity (Phase 18), accessibility modes (Phase 19).

## Addendum — 1 September 2026 (9)

**Change recorded: household continuity — fee/interest monitoring and account-change checklist (Phase 18).**

Added `household-continuity-bridge.js` covering two of Phase 18's three bullets (backup/export already shipped via `phase7-backup-bridge.js`):

- **Fee and interest monitoring**: flags expense transactions whose merchant/category text matches common fee/interest wording (fee, interest, overdraft, surcharge, penalty, late payment, dishonour), totals them for the current calendar year, and lists them for review. There is no existing UI-exposed "fee" category or tag in the transaction model to key off precisely, and adding one would mean extending `app.js`'s `CATEGORIES` list — hash-protected, avoided per the established rule — so this uses a keyword heuristic over the free text the user already types, and is worded as "possible" throughout rather than presented as a confirmed classification.
- **Direct-debit/account-change checklist**: pick any account from a dropdown and see everything currently linked to it — bills, subscriptions, debt repayment commitments, and transactions marked recurring (reusing the existing `recurringStatus` field) — so nothing gets missed before switching banks or closing an account.
- Read-only bridge; writes nothing to storage. `app.js` is not modified.
- Manually verified end-to-end in a local dist preview: seeded an account-keeping-fee transaction, an overdraft charge, a recurring Netflix payment and an unrelated grocery expense, confirmed the fee monitor totaled only the two fee-like transactions ($23.50) and correctly excluded the rest, and confirmed switching the account selector showed the linked bill/subscription/recurring-transaction for one account and the debt commitment for another.
- New test file `household-continuity-bridge.test.mjs`, matching the project's existing source-pattern-matching test style.
- Verified: `npm test` (180/180 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green. `app.js` hash pin untouched.

**Personal-side depth remaining:** accessibility modes (Phase 19) — the last item before moving to the Professional suite (Phases 20-24, not started).

## Addendum — 2 September 2026 (10)

**Change recorded: Simple mode — a low-cognitive-load accessibility toggle (Phase 19).**

Added `accessibility-bridge.js` and a toggle button in the topbar (next to Help). Covers this phase's first roadmap bullet ("Simple / low-cognitive-load mode"). The second bullet, trusted-support access with restricted permissions, is already enforced server-side by the Phase 6 authority checks in `src/worker.mjs` (`trusted_support_can`, `withAuthorizedOwnerTransaction`) — confirmed by reading `phase6-trusted-support.test.mjs` before starting this phase, so no client-side duplication was needed there.

- Toggling Simple mode adds a `simple-mode` class to `<body>`, which hides every element marked `data-simple-hide="true"` in `index.html` (the Forecast panel, the Fees & Interest panel, the account-change checklist panel, the "Spending by category" panel, and the Safe-to-Spend detail line) and increases text/button size for what remains.
- Preference is stored under its own independent key (`genevieve-accessibility-v1`), not the money-tracker key — nothing else needs to read it and there's no field to protect against being dropped by an unrelated write, so no chained `setItem` patch was needed.
- Manually verified in a local dist preview: toggling on hides the forecast panel and the safe-to-spend detail line, the preference survives a full page reload, and toggling back off restores the normal view, with no console errors in either state.
- New test file `accessibility-bridge.test.mjs`, matching the project's existing source-pattern-matching test style.
- Verified: `npm test` (185/185 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green. `app.js` hash pin untouched.

**This completes the personal-side depth roadmap the user asked for (Phases 13-19).** Remaining roadmap items are the Professional suite (Phases 20-24, not started at all), the Verified Savings Ledger (25), deeper reporting (26), and a formal security audit (27) — plus two outstanding follow-ups flagged along the way: the BNPL liability-type gap in `app.js` (Addendum 8), and never getting the user's clarification on what "back to zero" means for the professional side (asked once early in this project, never answered).

## Addendum — 2 September 2026 (11)

**Change recorded: fix BNPL accounts being counted as assets instead of debts in `app.js` (follow-up from Addendum 8).**

Flagged during the debt payoff planning work (Addendum 8) rather than fixed on the spot, since it required touching the hash-pinned `app.js`. The user picked it up as a standalone task.

`app.js`'s own `LIABILITY_TYPES` set only included `'credit'` and `'loan'`, omitting `'bnpl'` — unlike `transaction-model.mjs` and `debt-commitments-bridge.js`, which both already treat BNPL correctly. Because `app.js` is a plain browser script rather than a built module, it keeps its own separate copy of this set instead of importing `transaction-model.mjs`'s, and the two had drifted out of sync. This meant a BNPL account's balance was added to "Assets" instead of "Debts" in `computedBalance()`/`accountPosition()` and the Accounts view's own assets/debts/net-position summary.

- Added `'bnpl'` to `app.js`'s `LIABILITY_TYPES` (line 13) and a regression test in `phase3-runtime-chain.test.mjs`.
- Updated the git-blob-SHA hash pin in all four locations that move together for any `app.js` change: `phase6-identity-entitlement.test.mjs`, `scripts/verify-phase7-dist.mjs`, and the embedded `git hash-object app.js` checks in `.github/workflows/phase6-identity.yml` and `phase7-first-time-setup.yml`. New hash: `9e26d57dba3196821b39305f12021feadba5dbe1`.
- Manually verified in a local dist preview: seeded a checking account ($1,000) and a BNPL account ($300 owed), confirmed Assets shows $1,000, Debts shows $300, and Net position shows $700 (previously would have shown Assets $1,300, Debts $0, Net position $1,300).
- Verified: `npm test` (186/186 pass), `npm run check:source`, `npm run build`, `node scripts/verify-dist.mjs`, `node scripts/verify-phase7-dist.mjs` — all green, including both hash-pin checks against the new hash.

**Remaining follow-up:** the user's clarification on what "back to zero" means for the professional side has now been given (a control that resets a project/cost-centre's running numbers to $0 for a new period) — see the memory note saved alongside this session. The Professional suite itself (Phases 20-24) has not been started.

**Both Safe-to-Spend inputs are now in place. Next up: the Safe-to-Spend engine itself** (Income minus essential bills minus bill provisions/targets minus debt commitments minus protected emergency amount minus savings commitments, expressed per pay cycle / week / day, per docs/PRODUCT_CONTRACT.md).