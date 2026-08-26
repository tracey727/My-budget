# GENEVIEVE Budget — Phase 6 Current Checkpoint — Identity, Permissions & Lifecycle

Date: 26 August 2026, AEST (Queensland)

## Status

**PHASE 6 IMPLEMENTATION — COMPLETE ON FEATURE BRANCH / AUDITED / GREEN / FULL ROLLBACK PROVEN — NOT YET PROMOTED / NOT MERGED / NOT ARCHIVED.**

Authoritative state:
- repository: `tracey727/My-budget`
- protected base branch: `main`
- protected base commit: `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
- Phase 6 branch: `phase6-auth-identity-entitlement`
- verified pre-promotion head: `78c261a7c21f91aa079042e117f68dfd03b4aab5`
- pull request: `#34` — remains draft until production promotion and final green verification
- isolated Neon proof branch: `phase6-identity-entitlement-clean-test` (`br-super-mouse-axqrxqeb`)
- production Neon branch: `main` (`br-old-boat-axqvorbe`)
- production database: `neondb`
- production remains at migration `007`
- production users at final pre-promotion audit: `0`

## Chronological linkage

The sealed chain remains:

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare deployment → Phase 4 Hyperdrive/Neon → Phase 5 database safety at migration 007 → Phase 6 identity/permissions/lifecycle`

The Phase 6 request path is:

`managed Neon Auth session → Cloudflare Worker /auth + /api boundary → server-side Auth session validation → Hyperdrive → BEGIN → transaction-local app.user_id + app.owner_user_id + app.actor_type → active-user check → local hashed-session revocation check/registration → exact support/workspace authority check → Phase 5/6 RLS → user-owned operation → append-only audit path → COMMIT`

Transaction-local PostgreSQL settings are used so pooled Hyperdrive connections cannot carry one user's identity or authority into another request.

## Completed Phase 6 scope

Phase 6 now includes the full authorised identity, user-scope and permission boundary:

1. Managed authenticated individual identity.
2. Transaction-local PostgreSQL `app.user_id` before user-owned database work.
3. Transaction-local owner and actor type for owner/support scoping.
4. Fail-closed handling for missing, malformed, expired, inactive or unverifiable identity.
5. Personal vs Professional entitlement.
6. Trusted-support grants with read authority separate from financial-action authority.
7. Cross-user isolation and explicit capability checks.
8. Professional workspaces and exactly six roles:
   - Owner;
   - Administrator;
   - Manager;
   - Accountant/bookkeeper;
   - Project manager;
   - Read-only user.
9. Professional capability separation for read, financial action, membership administration and workspace administration.
10. Managed Auth lifecycle proxy paths for sign-up, sign-in, passwordless sign-in, sign-out, password reset and managed-session actions.
11. Application session/device registry storing a SHA-256 hash rather than a raw managed session token.
12. Application-level session revocation enforced before any owned operation.
13. Explicit soft account deletion with financial records preserved.
14. Account deletion revokes trusted-support authority, sessions, entitlement and Professional memberships.
15. Account deletion archives Professional workspaces owned by the deleted user so no active ownerless workspace remains.
16. Self-scoped JSON account export including user record, financial/application data, trusted-support relationships, Professional workspace/membership records and the user's audit ledger.
17. Data-export and deletion audit evidence.
18. Protected `app.js` remains byte-for-byte unchanged.
19. Phase 6 GitHub Actions gate nested after Phases 2–5.
20. Full Phase 6 rollback through migration 014 proven back to Phase 5 migration 007.

Phase 7 remains excluded.

## Phase 6 migrations

Production remains sealed at:

`000 → 001 → 002 → 003 → 004 → 005 → 006 → 007`

Phase 6 migration order is:

- `008_phase6_auth_identity_entitlement.sql`
- `009_phase6_trusted_support_permissions.sql`
- `010_phase6_professional_roles.sql`
- `011_phase6_account_lifecycle_sessions_export.sql`
- `012_phase6_export_audit_id_type.sql`
- `013_phase6_account_deletion_authority.sql`
- `014_phase6_lifecycle_audit_hardening.sql`

Migration 014 is the final audit hardening migration. It:
- makes application-session revocation one-way for a given session hash;
- prevents a revoked session from being silently reactivated by session registration;
- archives Professional workspaces owned by a deleted user;
- revokes memberships in those owned workspaces while retaining historical rows and audit evidence.

## Rollbacks

Phase 6 has explicit reverse steps:

- `phase6_lifecycle_audit_hardening_to_account_deletion_authority.sql` — 014 → 013
- `phase6_account_deletion_authority_to_export_type.sql` — 013 → 012
- `phase6_export_audit_type_to_lifecycle.sql` — 012 → 011
- `phase6_lifecycle_to_trusted_support.sql` — 011 → 010
- `phase6_professional_roles_to_trusted_support.sql` — 010 → 009
- `phase6_trusted_support_to_identity.sql` — 009 → 008
- `phase6_identity_to_phase5.sql` — 008 → 007

## Final full rollback proof

Authoritative isolated branch:
`br-super-mouse-axqrxqeb`

Proof sequence completed:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

At 014 the isolated database verified:
- latest migration `014`;
- `record_data_export(text)` returns the audit ledger's `bigint` identifier type;
- `delete_current_account()` is `SECURITY DEFINER`;
- session/device and Professional tables are present;
- the live `register_current_session` definition preserves existing `revoked_at`;
- the live deletion definition archives owned Professional workspaces and revokes their memberships.

The reverse chain then executed successfully:

`014 → 013 → 012 → 011 → 010 → 009 → 008 → 007`

Final proof at 007:
- `public.user_entitlements`: absent;
- `public.trusted_support_grants`: absent;
- `public.professional_workspaces`: absent;
- `public.professional_memberships`: absent;
- `public.user_sessions`: absent;
- Phase 6 functions: absent;
- latest migration: `007`.

Neon schema comparison against production returned:

`diff: ""`

Therefore the full Phase 6 schema is reversibly linked to the Phase 5 boundary.

## Final GitHub gate

Verified pre-promotion head:
`78c261a7c21f91aa079042e117f68dfd03b4aab5`

All five workflows passed on that exact head:
- Phase 2 baseline verification #187 — run `32977030670` — SUCCESS;
- Phase 3 Cloudflare verification #121 — run `32977030620` — SUCCESS;
- Phase 4 Neon database verification #77 — run `32977030643` — SUCCESS;
- Phase 5 database safety verification #61 — run `32977030642` — SUCCESS;
- Phase 6 verification #43 — run `32977030698` — SUCCESS.

The Phase 6 workflow now explicitly requires migration chronology through `014`, the 014 rollback file, one-way session revocation, Professional-owner lifecycle cleanup, complete Phase 6 export coverage, configuration-driven Managed Auth and the protected `app.js` hash.

## GitHub governance

Repository ruleset `Protect main` is ACTIVE for `refs/heads/main`.

Required checks are:
- `phase2`;
- `cloudflare-phase3`;
- `phase4-neon`;
- `phase5-database-safety`;
- `phase6`.

Other verified governance controls:
- pull request required;
- required branches must be up to date;
- branch deletion blocked;
- force pushes blocked;
- bypass list empty;
- current user cannot bypass.

Ruleset ID: `21530843`.

## Phase 1 → 6 final audit

The final pre-promotion audit found no remaining material break in the chronological chain.

Verified:
- Phase 1 product contract remains governing and unchanged;
- Phase 2 remains sealed and archived;
- Phase 3 remains the Cloudflare deployment foundation;
- Phase 4 remains the Hyperdrive/Neon foundation;
- Phase 5 remains the production database-safety boundary at migration 007;
- Phase 6 branch is directly ahead of protected `main` with no divergence (`behind_by: 0`);
- Phase 6 diff contains only Phase 6 migrations/rollbacks, Phase 6 verification/tests, Worker/API authorization changes, required Cloudflare routing compatibility changes, package verification wiring and this checkpoint;
- `app.js` is unchanged;
- production remains migration 007 and contains no Phase 6 tables;
- production users remain 0;
- isolated 014→007 rollback is an empty schema diff.

## Material audit findings fixed before promotion

1. **Application session revocation gap** — a local revoked session could previously authenticate again because the owned-operation path did not enforce the local session registry. Fixed before promotion: every owned database request now checks the hashed current session and returns `401 session_revoked` for a revoked record.
2. **Revoked session reactivation risk** — session registration previously cleared `revoked_at` on conflict. Migration 014 makes that state one-way for the same session hash.
3. **Incomplete account export** — the export omitted the application user row, trusted-support relationship data and the user's audit ledger. The Worker export now includes those Phase 6 lifecycle records.
4. **Professional owner deletion lifecycle** — deleting an owner could leave an active workspace without an owner capable of administering it. Migration 014 archives workspaces owned by the deleted account and revokes their memberships.
5. Earlier Phase 6 test/checkpoint inconsistencies were corrected during development without bypassing the gate.

No Phase 6 production migration was applied while these defects were unresolved.

## Production boundary before promotion

Production Neon `main` (`br-old-boat-axqvorbe`) currently verifies:
- latest migration: `007`;
- production users: `0`;
- Phase 6 entitlement table: absent;
- Phase 6 support table: absent;
- Phase 6 Professional tables: absent;
- Phase 6 session table: absent.

## Chronology lock / next action

Phase 6 is now eligible for the controlled promotion sequence, but it is **not yet complete/live/archived** until that sequence finishes.

Next chronological actions are strictly:

1. promote production Neon from migration `007` through `014` in order;
2. verify production schema, migration ledger and Phase 6 controls;
3. update Worker readiness from the sealed Phase 5 boundary to Phase 6 / migration `014`;
4. rerun all required Phase 2→6 checks on the final PR head;
5. mark PR #34 ready only after those checks are green;
6. merge through protected `main` using the expected final head SHA;
7. verify merged `main`, live Cloudflare `/health` and `/ready`, and production Neon;
8. create and merge the Phase 6 completion archive/checkpoint;
9. only then identify the next chronological phase.

Do not start Phase 7 before Phase 6 is promoted, merged, post-merge verified and archived GREEN.
