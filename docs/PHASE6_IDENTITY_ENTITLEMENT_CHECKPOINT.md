# GENEVIEVE Budget — Phase 6 Identity / Entitlement Checkpoint

Date: 26 August 2026, AEST (Queensland)

## Status

**PARTIAL PHASE 6 CHECKPOINT — AUTHORISED ITEMS 1–4 ONLY — NOT MERGED / NOT ARCHIVED.**

Authoritative base:
- repository: `tracey727/My-budget`
- protected base branch: `main`
- base commit: `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
- clean Phase 6 branch: `phase6-auth-identity-entitlement`
- isolated Neon test branch: `phase6-identity-entitlement-clean-test` (`br-super-mouse-axqrxqeb`)
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

Personal/Professional entitlement is stored in `public.user_entitlements`, defaults to Personal, permits only `personal` or `professional`, and is readable by the Worker only for `user_id = current_app_user_id()`.

## Migration order

Production remains sealed at:
`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007`

The isolated clean Phase 6 test branch is:
`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008`

Migration `008_phase6_auth_identity_entitlement.sql` contains only identity and entitlement scope. It does not create trusted-support or professional workspace/membership structures and does not add account-deletion logic.

Rollback file:
`database/rollbacks/phase6_identity_to_phase5.sql`

## Fail-closed rules

- no session cookie: no Auth network call and no database connection;
- invalid authenticated UUID: no database connection;
- missing Auth configuration: unavailable, never anonymous fallback;
- expired/invalid session: rejected;
- missing Hyperdrive: rejected;
- inactive/deleted application user: transaction rolled back before owned operation;
- unknown `/api/*` route: JSON 404, never static-asset fallback;
- `NEON_AUTH_URL` is configuration-driven and is not embedded in repository source;
- readiness remains Phase 5 / migration 007 until all Phase 6 work is promoted and archived.

## Audit note — superseded WIP

The earlier draft branch `phase6-identity-user-scope-permissions` contains later Phase 6 work that was created before the authorised scope was narrowed. It is not authoritative for this checkpoint and must not be merged as the four-item Phase 6 foundation.

## Gate

The new verification command is:
`npm run verify:phase6-identity`

It nests the existing Phase 2 → Phase 3 → Phase 4 → Phase 5 verification before running the Phase 6 identity tests.

Do not merge or archive this checkpoint until the clean draft PR has all nested checks green and the isolated Neon migration/rollback audit is complete.
