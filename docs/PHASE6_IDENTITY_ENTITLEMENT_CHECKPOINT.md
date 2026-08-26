# GENEVIEVE Budget — Phase 6 Identity / Entitlement Checkpoint

Date: 26 August 2026, AEST (Queensland)

## Status

**PARTIAL PHASE 6 CHECKPOINT — AUTHORISED IDENTITY / ENTITLEMENT ITEMS GREEN — NOT MERGED / NOT ARCHIVED.**

Authoritative base:
- repository: `tracey727/My-budget`
- protected base branch: `main`
- base commit: `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
- clean Phase 6 branch: `phase6-auth-identity-entitlement`
- draft verification PR: `#34`
- isolated Neon test branch: `phase6-identity-entitlement-clean-test` (`br-super-mouse-axqrxqeb`)
- isolated rollback proof branch: `phase6-identity-entitlement-rollback-proof` (`br-lively-waterfall-axowho2i`)
- production remains at migration `007`
- clean test branch is at migration `008`

## Authorised scope in this checkpoint

1. Build authenticated user identity.
2. Establish PostgreSQL transaction-local `app.user_id` before every user-owned database query.
3. Fail closed when identity is missing, expired, invalid, inactive or cannot be verified.
4. Define Personal vs Professional entitlement.

Explicitly excluded from this checkpoint:
- trusted-support permissions;
- professional staff roles/memberships/workspaces;
- account deletion;
- data export;
- device/session management;
- later Phase 6 features.

## Chronological linkage

Existing sealed chain remains:

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare Worker/static assets → Phase 4 Hyperdrive/Neon → Phase 5 RLS database safety at migration 007`

This checkpoint extends that chain only as follows:

`managed Neon Auth session → Cloudflare Worker /auth and /api boundaries → server-side session validation → Hyperdrive → BEGIN → set_config('app.user_id', authenticated UUID, true) → Phase 5 current_app_user_id() RLS → active application user check → user-owned query → COMMIT`

The Worker does not trust a browser identity claim by itself. It independently validates the managed Auth session, opens the PostgreSQL transaction, sets the authenticated UUID transaction-locally, then validates the matching active application user before the owned operation is permitted.

## Personal vs Professional entitlement

Personal/Professional entitlement is stored in `public.user_entitlements`.

Rules:
- default product mode is Personal;
- allowed modes are only `personal` or `professional`;
- entitlement status is independently recorded;
- inactive Professional entitlement resolves to effective Personal access;
- Worker read access is restricted by RLS to `user_id = current_app_user_id()`;
- the Worker cannot directly insert, update or delete entitlement records through the user-data role.

## Migration order

Production remains sealed at:
`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007`

The isolated clean Phase 6 test branch is:
`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008`

Migration `008_phase6_auth_identity_entitlement.sql` contains only identity and entitlement scope. It does not create trusted-support or professional workspace/membership structures and does not add account-deletion logic.

Rollback file:
`database/rollbacks/phase6_identity_to_phase5.sql`

## Fail-closed rules verified

- no session cookie: no Auth network call and no database connection;
- invalid authenticated UUID: no database connection;
- missing Auth configuration: unavailable, never anonymous fallback;
- expired/invalid session: rejected;
- missing Hyperdrive: rejected;
- inactive/deleted application user: transaction rolled back before owned operation;
- `app.user_id` is set with PostgreSQL transaction-local scope before the active-user and user-owned queries;
- after the transaction ends, `current_app_user_id()` returns `NULL`, proving identity does not persist across pooled work;
- Phase 5 account and transaction policies still require their row `user_id` to equal `current_app_user_id()`;
- entitlement SELECT policy requires `user_id = current_app_user_id()`;
- unknown `/api/*` route: JSON 404, never static-asset fallback;
- `NEON_AUTH_URL` is configuration-driven and is not embedded in repository source;
- readiness remains Phase 5 / migration 007 until all Phase 6 work is promoted and archived.

## GitHub verification evidence

Clean PR head before this documentation-only evidence update passed every gate:
- Phase 2 baseline verification #145 — run `32961520792` — success;
- Phase 3 Cloudflare verification #79 — run `32961520777` — success;
- Phase 4 Neon database verification #35 — run `32961520714` — success;
- Phase 5 database safety verification #19 — run `32961520830` — success;
- Phase 6 identity verification #1 — run `32961520893` — success.

The Phase 6 gate executes `npm run verify:phase6-identity`, which nests the existing Phase 2 → Phase 3 → Phase 4 → Phase 5 verification before Phase 6 identity tests.

`app.js` remains byte-for-byte protected by the Phase 6 gate.

## Neon verification evidence

Clean isolated test branch `br-super-mouse-axqrxqeb`:
- migration ledger is exactly `000` through `008`;
- `public.user_entitlements` exists;
- entitlement RLS policy exists;
- Neon Auth → application-user synchronization trigger exists;
- later trusted-support and professional-workspace tables are absent;
- transaction-local `app.user_id` was visible inside its transaction and reset to `NULL` afterward;
- existing Phase 5 `users`, `accounts` and `transactions` RLS policies remain tied to `current_app_user_id()`.

Rollback proof branch `br-lively-waterfall-axowho2i`:
- migration `008` applied successfully in an isolated transaction;
- `phase6_identity_to_phase5.sql` rollback applied successfully;
- Neon schema comparison against the Phase 5 parent returned an empty diff: `{"diff":""}`.

Production was not migrated by this checkpoint and remains at migration `007`.

## Audit note — superseded WIP

The earlier draft branch `phase6-identity-user-scope-permissions` contains later Phase 6 work that was created before the authorised scope was narrowed. It is not authoritative for this checkpoint and must not be merged as the four-item Phase 6 foundation.

## Gate / chronology lock

These four authorised Phase 6 controls are built and verified on the clean branch, but this is **not the end of Phase 6** and therefore it is not archived or merged into production yet.

Do not start later Phase 6 items or Phase 7 without explicit user instruction. Do not merge PR #34 merely because this partial checkpoint is green.
