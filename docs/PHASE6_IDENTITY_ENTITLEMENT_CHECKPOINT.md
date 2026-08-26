# GENEVIEVE Budget — Phase 6 Current Checkpoint — Identity, Permissions & Lifecycle

Date: 26 August 2026, AEST (Queensland)

## Status

**PHASE 6 — PRODUCTION DATABASE PROMOTED / FEATURE BRANCH LIVE-GREEN / FULL AUDIT AND ROLLBACK GREEN / NOT YET MERGED / NOT YET ARCHIVED.**

This checkpoint records the final state immediately before PR #34 is made ready for protected merge.

## Authoritative state

- repository: `tracey727/My-budget`
- protected base branch: `main`
- protected base commit before Phase 6 merge: `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
- Phase 6 branch: `phase6-auth-identity-entitlement`
- pull request: `#34` — `Phase 6 — identity, permissions and lifecycle completion`
- final promoted runtime head before this documentation-only sync: `17e78ab36d296a665ab663965a4fe91002282ba8`
- production Neon project: `genevieve-budget` (`icy-morning-93993343`)
- production Neon branch: `main` (`br-old-boat-axqvorbe`)
- production database: `neondb`
- production migration: `014`
- production users: `0`
- pre-promotion recovery branch: `phase6-production-prepromotion-007` (`br-nameless-mode-ax72ghlu`), verified at migration `007`
- isolated full rollback branch: `phase6-identity-entitlement-clean-test` (`br-super-mouse-axqrxqeb`)

## Chronological chain

The verified build chain is:

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare deployment → Phase 4 Hyperdrive/Neon → Phase 5 database safety at migration 007 → Phase 6 identity, permissions and lifecycle at migration 014`

The Phase 6 request path is:

`Managed Neon Auth → Cloudflare Worker /auth + /api → independent server-side session validation → Hyperdrive → BEGIN → transaction-local app.user_id + app.owner_user_id + app.actor_type → active-user check → hashed application-session revocation check → exact trusted-support / Professional authority check → RLS → user-owned operation → append-only audit → COMMIT`

The browser is never trusted to establish database identity by itself. Transaction-local PostgreSQL settings prevent pooled Hyperdrive connections from carrying another user's authority across requests.

## Completed Phase 6 scope

Phase 6 implements:

- individual managed authenticated identity;
- transaction-local PostgreSQL user, owner and actor scope;
- fail-closed missing, malformed, expired, inactive or unverifiable identity handling;
- Personal vs Professional entitlement;
- trusted-support permissions with read authority separate from financial-action authority;
- cross-user isolation and explicit capability checks;
- Professional workspaces;
- six Professional roles: Owner, Administrator, Manager, Accountant/bookkeeper, Project manager and Read-only user;
- separate Professional read, financial-action, member-management and workspace-management capabilities;
- same-origin managed Auth proxy routes for sign-up, sign-in, passwordless sign-in, sign-out, password reset and managed session actions;
- hashed application session/device registry, never raw session-token storage;
- application-level revoked-session enforcement before user-owned work;
- explicit soft account deletion preserving financial records;
- deletion revocation of trusted support, sessions, entitlement and Professional memberships;
- automatic archive of Professional workspaces owned by a deleted account so no active ownerless workspace remains;
- self-scoped JSON account export including user, financial/application, trusted-support, Professional and audit-ledger records;
- export and deletion audit evidence;
- full Phase 6 GitHub Actions gate nested after the Phase 2→5 gates;
- protected `app.js` remains byte-for-byte unchanged.

Phase 7 is excluded.

## Migration chronology

Production Phase 6 migrations were promoted in strict order:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

Files:

- `008_phase6_auth_identity_entitlement.sql`
- `009_phase6_trusted_support_permissions.sql`
- `010_phase6_professional_roles.sql`
- `011_phase6_account_lifecycle_sessions_export.sql`
- `012_phase6_export_audit_id_type.sql`
- `013_phase6_account_deletion_authority.sql`
- `014_phase6_lifecycle_audit_hardening.sql`

The production promotion was executed as one atomic transaction after the full pre-promotion source/CI gate and isolated rollback proof were green. No partial Phase 6 production schema was exposed.

## Migration 014 final audit hardening

The full Phase 1→6 audit found and fixed four material lifecycle issues before production promotion:

1. a locally revoked application session was not enforced on the next owned API request;
2. session registration could clear a previous local revocation;
3. account export omitted the application user row, trusted-support relationship data and the user's audit ledger;
4. deleting a Professional owner could leave an active workspace without an owner able to administer it.

Migration 014 and the final Worker changes close those issues:

- the same session hash cannot silently reactivate after revocation;
- a revoked session returns `401 session_revoked` before user-owned work;
- owned Professional workspaces are archived when their owner account is deleted;
- memberships in those workspaces are revoked while historical rows and audits are retained;
- the account export includes the complete Phase 6 user/support/Professional/audit lifecycle record.

## Full rollback proof

On isolated branch `br-super-mouse-axqrxqeb`, the complete forward chain was applied:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

At migration 014, verification confirmed:

- `record_data_export(text)` returns `bigint`;
- `delete_current_account()` is `SECURITY DEFINER`;
- session/device and Professional tables exist;
- `register_current_session` preserves an existing `revoked_at` value;
- deletion includes owned-workspace archive and membership revocation cleanup.

The exact reverse chain then executed with no SQL errors:

`014 → 013 → 012 → 011 → 010 → 009 → 008 → 007`

Final rollback verification showed:

- latest migration `007`;
- no Phase 6 entitlement, support, Professional or session tables;
- no Phase 6 functions;
- Neon parent-schema comparison: `diff: ""`.

Therefore Phase 6 is fully reversible to the sealed Phase 5 boundary.

## Production promotion verification

Production `br-old-boat-axqvorbe` now verifies:

- latest migration: `014`;
- migrations `008,009,010,011,012,013,014`: all present;
- production users: `0`;
- `user_entitlements`: present;
- `trusted_support_grants`: present;
- `professional_workspaces`: present;
- `professional_memberships`: present;
- `user_sessions`: present;
- export audit result type: `bigint`;
- account deletion function: `SECURITY DEFINER`;
- one-way application-session revocation: present;
- Professional-owner archive cleanup: present.

Recovery branch `br-nameless-mode-ax72ghlu` preserves the exact production migration-007 boundary that existed immediately before promotion.

## Worker readiness seal

After production migration 014 was verified, the feature-branch Worker readiness seal was advanced to:

- `CURRENT_PHASE = 6`;
- `EXPECTED_MIGRATION = "014"`.

The preserved Phase 4 and Phase 5 live-path gates were updated to continue proving their responsibilities through the current Phase 6/014 boundary; they were not removed or bypassed.

The Phase 6 required check now also contains a live branch-preview `/ready` test and cannot pass unless it receives:

- HTTP 200;
- `phase: 6`;
- `assets: "ready"`;
- `database: "ready"`;
- `migration: "014"`.

## Final promoted runtime gate

On runtime head `17e78ab36d296a665ab663965a4fe91002282ba8`, all five required workflows completed successfully:

- Phase 2 baseline verification #190 — run `32978827959` — SUCCESS;
- Phase 3 Cloudflare verification #124 — run `32978827871` — SUCCESS;
- Phase 4 Neon database verification #80 — run `32978828055` — SUCCESS;
- Phase 5 database safety verification #64 — run `32978828050` — SUCCESS;
- Phase 6 verification #46 — run `32978828047` — SUCCESS, including live Phase 6/014 readiness.

## GitHub governance

`Protect main` ruleset ID `21530843` is active for `refs/heads/main` and requires:

- `phase2`;
- `cloudflare-phase3`;
- `phase4-neon`;
- `phase5-database-safety`;
- `phase6`.

It also requires a pull request, requires the branch to be up to date, blocks branch deletion and force pushes, has no bypass actors, and the current user cannot bypass it.

## Final Phase 1 → 6 audit result

**GREEN — no remaining material break found before protected merge.**

Verified:

- Phase 1 contract preserved;
- Phase 2 sealed and preserved;
- Phase 3 Cloudflare surface preserved;
- Phase 4 Hyperdrive→Neon path preserved;
- Phase 5 RLS/ownership/archive/audit protections preserved;
- Phase 6 identity and permission boundaries linked server-side;
- migration chronology 008→014 complete;
- full 014→007 rollback empty-diff proof complete;
- production database promoted and verified at 014;
- recovery branch exists at the pre-promotion 007 state;
- feature-branch Cloudflare readiness is live and green at Phase 6/014;
- `app.js` remains protected and unchanged;
- `main` remains protected by all five required checks.

## Chronology lock / immediate next action

This documentation-only checkpoint synchronization is the final change before protected merge. It must itself pass all five required status checks.

Only after those checks are GREEN:

1. mark PR #34 ready for review;
2. re-read protected `main` and PR head to ensure neither moved unexpectedly;
3. merge PR #34 using the exact expected head SHA;
4. verify all five required checks on merged `main`;
5. verify live production Cloudflare `/health` and `/ready` and production Neon migration 014;
6. create the Phase 6 completion archive on a new archive branch;
7. pass all five checks and merge the archive PR;
8. verify the archive merge on `main`;
9. only then mark Phase 6 COMPLETE / LIVE / GREEN / ARCHIVED and identify the next chronological phase.

Do not start Phase 7 before the archive is complete.
