# GENEVIEVE Budget — Phase 6 Completion Archive

Date: 27 August 2026, AEST (Queensland)

## Archive rule

This document is the completion archive for Phase 6. It becomes authoritative only when this archive branch passes every protected status check and this document is merged through protected `main`.

When present on protected `main` after that merge, the Phase 6 state is:

**COMPLETE / PRODUCTION-LIVE / AUDITED / ROLLBACK-PROVEN / POST-MERGE GREEN / ARCHIVED.**

Phase 7 is not part of this archive and must not be treated as started by this document.

## Authoritative implementation merge

- repository: `tracey727/My-budget`
- implementation PR: `#34` — `Phase 6 — identity, permissions and lifecycle completion`
- final implementation head: `59df52be1edf7b1b499c58e561e56282770eb267`
- protected implementation merge commit: `e3bd3af42138cc403f212847baefa2a890452e9d`
- previous protected `main`: `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
- implementation merge tree: `ea79ba859cd846b572a84ff6206ec32704ca691f`
- final implementation-head tree: `ea79ba859cd846b572a84ff6206ec32704ca691f`

The identical tree SHA proves that the protected merge introduced no conflict-resolution code changes or accidental content changes between the final approved Phase 6 head and merged `main`.

## Chronological chain preserved

The verified production chain at Phase 6 completion is:

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare deployment → Phase 4 Hyperdrive/Neon → Phase 5 database safety → Phase 6 managed identity, permissions and lifecycle`

The Phase 6 request/authority path is:

`Managed Neon Auth → Cloudflare Worker /auth + /api → server-side session validation → Hyperdrive → BEGIN → transaction-local app.user_id + app.owner_user_id + app.actor_type → active-user validation → hashed application-session revocation check → trusted-support / Professional authority checks → PostgreSQL RLS → user-owned operation → append-only audit → COMMIT`

No hidden-button or browser-only access rule is treated as security. Authority is enforced by the Worker and PostgreSQL policy/functions before protected data operations.

## Completed Phase 6 scope

Phase 6 completed and linked:

1. Individual managed authenticated identity.
2. Server-side managed-session validation.
3. Transaction-local database identity/owner/actor scope.
4. Fail-closed missing, malformed, expired, inactive or unverifiable identities.
5. Personal vs Professional entitlement.
6. Trusted-support authority with read separated from financial action.
7. Cross-user isolation.
8. Professional workspaces.
9. Six Professional roles:
   - Owner;
   - Administrator;
   - Manager;
   - Accountant/bookkeeper;
   - Project manager;
   - Read-only user.
10. Professional capability separation for read, financial action, membership administration and workspace administration.
11. Managed authentication lifecycle proxy paths for sign-up, sign-in, passwordless sign-in, sign-out and password reset/session actions.
12. Application session/device registry storing hashes rather than raw managed-session tokens.
13. Application-level revoked-session enforcement before user-owned work.
14. Soft account deletion preserving financial records.
15. Deletion revocation of trusted support, sessions, entitlement and Professional memberships.
16. Archive of Professional workspaces owned by a deleted account so no active ownerless workspace remains.
17. Self-scoped JSON account export containing user, financial/application, trusted-support, Professional and audit-ledger records.
18. Export and deletion audit evidence.
19. Phase 6 required GitHub status gate nested after the Phase 2→5 gates.
20. Protected Budget engine `app.js` remains byte-for-byte unchanged.

## Database chronology

The sealed Phase 5 boundary was migration `007`.

Phase 6 production migrations were applied in strict chronological order:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

Migration files:

- `008_phase6_auth_identity_entitlement.sql`
- `009_phase6_trusted_support_permissions.sql`
- `010_phase6_professional_roles.sql`
- `011_phase6_account_lifecycle_sessions_export.sql`
- `012_phase6_export_audit_id_type.sql`
- `013_phase6_account_deletion_authority.sql`
- `014_phase6_lifecycle_audit_hardening.sql`

Final production state after implementation merge verification:

- Neon project: `genevieve-budget` (`icy-morning-93993343`)
- production branch: `main` (`br-old-boat-axqvorbe`)
- database: `neondb`
- latest migration: `014`
- production users: `0`
- `user_entitlements`: present
- `trusted_support_grants`: present
- `professional_workspaces`: present
- `professional_memberships`: present
- `user_sessions`: present

## Recovery and rollback evidence

Pre-promotion recovery branch:

- name: `phase6-production-prepromotion-007`
- branch ID: `br-nameless-mode-ax72ghlu`
- verified boundary: migration `007`

Full isolated proof branch:

- name: `phase6-identity-entitlement-clean-test`
- branch ID: `br-super-mouse-axqrxqeb`

Forward proof:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

Reverse proof:

`014 → 013 → 012 → 011 → 010 → 009 → 008 → 007`

Final reverse verification:

- latest migration returned to `007`;
- all Phase 6 tables/functions were absent;
- Neon schema comparison with the Phase 5 parent returned an empty diff.

Therefore the Phase 6 schema is fully linked and reversibly returns to the sealed Phase 5 boundary.

## Material audit defects resolved before production

The final Phase 1→6 audit found and corrected these material lifecycle defects before Phase 6 was promoted:

1. revoked application sessions were not enforced on the next owned API request;
2. session registration could clear an earlier local revocation;
3. account export omitted user/support/audit lifecycle records;
4. deleting a Professional owner could leave an active ownerless workspace.

The fixes were included before production promotion, then migration 014, full rollback, CI and live readiness were re-proven.

Earlier Phase 6 corrections also included the Professional workspace audit linkage, export audit identifier type, account-deletion cleanup authority and correct Worker permission response behavior.

## Production promotion

Before production mutation:

- migration 014 implementation/tests/workflow were green;
- the complete Phase 1→6 gate was green;
- 007→014 applied successfully on an isolated Neon branch;
- 014→007 returned an empty schema diff;
- a production recovery branch was created at migration 007.

Production migrations 008→014 were then applied atomically and verified before Worker readiness was advanced to:

- `CURRENT_PHASE = 6`
- `EXPECTED_MIGRATION = "014"`

## Protected implementation merge proof

Immediately before PR #34 merge:

- protected `main` remained `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`;
- PR head remained `59df52be1edf7b1b499c58e561e56282770eb267`;
- compare state was `ahead_by: 62`, `behind_by: 0`;
- all five required status checks were successful;
- `Protect main` was active with no bypass.

PR #34 was merged using the exact expected head SHA. GitHub returned merge commit:

`e3bd3af42138cc403f212847baefa2a890452e9d`

The merge has exactly two parents:

1. `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
2. `59df52be1edf7b1b499c58e561e56282770eb267`

## Post-merge verification

All five workflows passed on the exact merged `main` commit `e3bd3af42138cc403f212847baefa2a890452e9d`:

- Phase 2 baseline verification #192 — run `33014343891` — SUCCESS
- Phase 3 Cloudflare verification #126 — run `33014343955` — SUCCESS
- Phase 4 Neon database verification #82 — run `33014343908` — SUCCESS
- Phase 5 database safety verification #66 — run `33014343919` — SUCCESS
- Phase 6 verification #48 — run `33014343930` — SUCCESS

The post-merge Phase 6 job specifically passed its live readiness step and its protected-engine check. The preserved Phase 4 job passed its Cloudflare → Hyperdrive → Neon verification. The preserved Phase 5 job passed its safety verification under Phase 6 readiness.

## Main protection at archive creation

Ruleset `Protect main` (`21530843`) remains active for `refs/heads/main` and requires:

- `phase2`
- `cloudflare-phase3`
- `phase4-neon`
- `phase5-database-safety`
- `phase6`

It also:

- requires pull requests;
- requires required-status branches to be up to date;
- blocks deletion;
- blocks force pushes;
- has no bypass actors;
- reports the current user cannot bypass.

## Archive gate

This archive PR is documentation-only. It must not alter runtime code, migrations, Worker behavior, Cloudflare bindings, Hyperdrive configuration, Neon production schema or `app.js`.

Before the archive can be merged:

1. compare against `e3bd3af42138cc403f212847baefa2a890452e9d` must show only the Phase 6 archive/checkpoint documentation changes;
2. the archive branch must be zero commits behind protected `main`;
3. all five required status checks must be GREEN on the exact archive head;
4. the ruleset must still be active;
5. merge must use the exact expected archive-head SHA.

After the archive merge:

1. re-read protected `main` and confirm the archive merge commit;
2. require all five `main` workflows to pass on the archive merge commit;
3. confirm production Neon remains migration `014`;
4. confirm the archive document exists on protected `main`;
5. only then declare Phase 6 **COMPLETE / LIVE / GREEN / ARCHIVED**.

## Chronology lock after archive

The archive closes Phase 6 only. It does not define or start Phase 7.

Only after every archive gate and post-archive verification above is GREEN may the next chronological phase be identified and scoped.
