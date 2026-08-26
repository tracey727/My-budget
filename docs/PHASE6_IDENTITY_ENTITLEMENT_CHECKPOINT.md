# GENEVIEVE Budget — Phase 6 Current Checkpoint — Identity, Entitlement & Trusted Support

Date: 26 August 2026, AEST (Queensland)

## Status

**PARTIAL PHASE 6 CHECKPOINT — AUTHORISED WORK THROUGH TRUSTED-SUPPORT VERIFICATION IS GREEN — NOT MERGED / NOT ARCHIVED.**

Authoritative base:
- repository: `tracey727/My-budget`
- protected base branch: `main`
- base commit: `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
- clean Phase 6 branch: `phase6-auth-identity-entitlement`
- draft verification PR: `#34`
- isolated Neon test branch: `phase6-identity-entitlement-clean-test` (`br-super-mouse-axqrxqeb`)
- isolated identity rollback proof branch: `phase6-identity-entitlement-rollback-proof` (`br-lively-waterfall-axowho2i`)
- production remains at migration `007`
- isolated Phase 6 test branch is at migration `009`

## Authorised Phase 6 scope completed to this checkpoint

1. Build authenticated user identity.
2. Establish PostgreSQL transaction-local `app.user_id` before every user-owned database query.
3. Fail closed when identity is missing, expired, invalid, inactive or cannot be verified.
4. Define Personal vs Professional entitlement.
5. Define trusted-support permissions with read authority separate from financial-action authority.
6. Prove User A cannot read/write User B data and read-only support cannot perform financial actions without explicit authority.
7. Add the Phase 6 GitHub Actions verification gate while preserving and rerunning Phase 2, Phase 3, Phase 4 and Phase 5 gates.

Still explicitly excluded / not yet built in this checkpoint:
- Professional staff role model: Owner, Administrator, Manager, Accountant/bookkeeper, Project manager, Read-only user;
- account deletion;
- data export;
- device/session management;
- later Phase 6 authentication lifecycle work;
- Phase 7.

## Chronological linkage

Existing sealed chain remains:

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare Worker/static assets → Phase 4 Hyperdrive/Neon → Phase 5 RLS database safety at migration 007`

Phase 6 extends that chain in strict order:

`managed Neon Auth session → Cloudflare Worker /auth and /api boundaries → server-side session validation → Hyperdrive → BEGIN → transaction-local app.user_id + app.owner_user_id + app.actor_type → active actor/owner validation → exact capability check when actor != owner → Phase 5/6 RLS → user-owned query → append-only audit path → COMMIT`

The Worker does not trust a browser identity or a requested owner by itself. It independently validates the managed Auth session, places both actor and owner identity into transaction-local PostgreSQL settings, validates both application users, and requires the exact trusted-support capability before another user's owned operation may run.

Transaction-local scope prevents Hyperdrive connection pooling from carrying one user's actor/owner authority into another request.

## Personal vs Professional entitlement — migration 008

Personal/Professional entitlement is stored in `public.user_entitlements`.

Rules:
- default product mode is Personal;
- allowed modes are only `personal` or `professional`;
- entitlement status is independently recorded;
- inactive Professional entitlement resolves to effective Personal access;
- Worker read access is restricted by RLS to `user_id = current_app_user_id()`;
- the Worker cannot directly insert, update or delete entitlement records through the user-data role.

Migration:
`database/migrations/008_phase6_auth_identity_entitlement.sql`

Rollback:
`database/rollbacks/phase6_identity_to_phase5.sql`

## Trusted-support authority — migration 009

Trusted-support authority is stored in `public.trusted_support_grants`.

Authority is deliberately split:
- `can_read` controls read authority;
- `can_financial_action` controls financial-action authority;
- financial-action authority requires read authority;
- read-only support cannot insert or update financial records;
- expired or revoked grants fail closed;
- owner and support user must be different;
- only the owner may create or update a support grant through the Worker role;
- support and owner may view a grant they participate in;
- physical DELETE is withheld from the Worker;
- grant changes create append-only audit evidence.

Financial-table RLS is linked to the capability model:
- SELECT → `can_access_owned_record(user_id, 'read')`;
- INSERT → `can_access_owned_record(user_id, 'financial_action')`;
- UPDATE → `can_access_owned_record(user_id, 'financial_action')`;
- audit-event SELECT → read authority;
- audit-event INSERT → financial-action authority.

Migration:
`database/migrations/009_phase6_trusted_support_permissions.sql`

Rollback:
`database/rollbacks/phase6_trusted_support_to_identity.sql`

## Migration order

Production remains sealed at:
`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007`

The isolated Phase 6 test branch is now:
`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009`

No migration was applied to production during this checkpoint.

## Fail-closed and authority tests verified

Identity foundation:
- no session cookie: no Auth network call and no database connection;
- invalid authenticated UUID: no database connection;
- missing Auth configuration: unavailable, never anonymous fallback;
- expired/invalid session: rejected;
- missing Hyperdrive: rejected;
- inactive actor or owner: transaction rolled back before owned operation;
- invalid owner UUID or capability: rejected before DB construction;
- actor, owner and actor type are transaction-local;
- after test transactions, `current_app_user_id()` and `current_data_owner_id()` return `NULL`.

Cross-user and support authority live database proof on isolated Neon branch `br-super-mouse-axqrxqeb`:
- User A → User B read: `false`;
- User A → User B financial action: `false`;
- support with read-only grant → User B read: `true`;
- support with read-only grant → User B financial action: `false`;
- after explicit `can_financial_action` authority → support financial action: `true`;
- User B on own data → read: `true`;
- User B on own data → financial action: `true`.

The synthetic test authority was retired after verification:
- active synthetic test users: `0`;
- active trusted-support grants: `0`;
- append-only audit evidence was preserved rather than deleted.

## Rollback proof

Migration 008 rollback proof:
- migration `008` applied to isolated branch;
- `phase6_identity_to_phase5.sql` returned it to Phase 5;
- Neon schema comparison against the Phase 5 parent returned an empty diff.

Migration 009 rollback proof:
- migration `009` applied to isolated branch at 008;
- `phase6_trusted_support_to_identity.sql` returned the branch to migration `008`;
- `public.user_entitlements` remained present;
- `public.trusted_support_grants` was removed;
- original Phase 5 account ownership policies were restored;
- Phase 6 scoped account policies were removed;
- migration `009` was then reapplied successfully so the test branch finishes at `009`.

## GitHub verification gate

The Phase 6 workflow is:
`.github/workflows/phase6-identity.yml`

Workflow name:
`Phase 6 verification`

Required job/check name created by this workflow:
`phase6`

The Phase 6 verification command is:
`npm run verify:phase6`

The nested gate is:
`verify:phase2 → test:phase3 / Cloudflare checks → test:phase4 → test:phase5 → Phase 6 identity tests → Phase 6 trusted-support tests`

Green code-head evidence on `675c18563f26dcfc22d57c6a572d3ab43785ad42`:
- Phase 2 baseline verification #155 — run `32963355147` — success;
- Phase 3 Cloudflare verification #89 — run `32963355179` — success;
- Phase 4 Neon database verification #45 — run `32963355172` — success;
- Phase 5 database safety verification #29 — run `32963355140` — success;
- Phase 6 verification #11 — run `32963355155` — success.

The Phase 6 job also verifies:
- migration 008 exists before migration 009;
- later Professional workspace/membership and account-deletion implementation has not been introduced;
- read and financial-action authority remain distinct;
- the managed Auth endpoint is configuration-driven;
- protected `app.js` remains byte-for-byte unchanged.

## Audit issues found and resolved

1. The first Phase 6 support CI run failed because a test regex interpreted the explanatory comment `account deletion is excluded` as if account-deletion code had been built. The assertion was corrected to test implementation identifiers only. No runtime/database code change was required for this issue.
2. An isolated Neon test cleanup attempted to delete append-only audit evidence. The database correctly rejected the deletion and rolled the whole transaction back. The test was rerun without violating append-only audit rules.
3. A synthetic read-only support grant remained on the isolated test branch after migration reapplication. It was identified as test data, revoked, its financial authority was disabled, and all three synthetic test users were disabled. There are now zero active synthetic users and zero active support grants on that test branch.

## Production audit

Production Neon branch `main` (`br-old-boat-axqvorbe`) remains unchanged:
- latest migration: `007`;
- production users: `0`;
- `public.user_entitlements`: absent;
- `public.trusted_support_grants`: absent.

The GitHub diff from protected `main` contains only Phase 6 identity/support migrations and rollbacks, Phase 6 tests, the Phase 6 workflow, Worker/Cloudflare routing needed for the authorization boundary, package verification scripts, the Phase 3 compatibility test extension, and this checkpoint.

`app.js` is not changed by the Phase 6 diff.

## Audit note — superseded WIP

The earlier draft branch `phase6-identity-user-scope-permissions` contains later Phase 6 work that was created before scope was corrected. It remains non-authoritative and must not be merged into this chronological build.

## Current build position / chronology lock

The authorised Phase 6 work through trusted-support permissions, cross-user/support tests and the Phase 6 verification gate is built and verified on the clean branch.

This is **still not the end of Phase 6**. PR #34 remains draft and must not be merged or archived yet. Production remains at Phase 5/migration 007 until the full Phase 6 scope has been completed, audited and explicitly approved for promotion.

The next chronological Phase 6 build step is the Professional role/permission model (Owner, Administrator, Manager, Accountant/bookkeeper, Project manager, Read-only user), unless the user explicitly directs a different remaining Phase 6 authentication item first.

Do not start that next step or Phase 7 without explicit user instruction.
