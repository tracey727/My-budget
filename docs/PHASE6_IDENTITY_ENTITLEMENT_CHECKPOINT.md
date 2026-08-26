# GENEVIEVE Budget — Phase 6 Final Checkpoint — Identity, Permissions & Lifecycle

Date: 27 August 2026, AEST (Queensland)

## Finalization rule

This checkpoint is part of the Phase 6 completion/archive PR.

While it exists only on `archive-phase6-completion`, Phase 6 is merged and post-merge GREEN but is not yet archived.

When this exact checkpoint and `docs/PHASE6_COMPLETION_ARCHIVE.md` are present on protected `main` after the archive PR passes every required check and merges, the authoritative Phase 6 status is:

**COMPLETE / PRODUCTION-LIVE / AUDITED / ROLLBACK-PROVEN / POST-MERGE GREEN / ARCHIVED.**

Phase 7 remains excluded and must not be treated as started by this checkpoint.

## Authoritative implementation

- repository: `tracey727/My-budget`
- implementation PR: `#34`
- final implementation head: `59df52be1edf7b1b499c58e561e56282770eb267`
- protected implementation merge: `e3bd3af42138cc403f212847baefa2a890452e9d`
- previous protected `main`: `e1fab0e183c5eb2903c10fb5d8fefed0e2fdc16e`
- implementation-head tree: `ea79ba859cd846b572a84ff6206ec32704ca691f`
- merged-main tree: `ea79ba859cd846b572a84ff6206ec32704ca691f`

The identical trees prove the merge added no conflict-resolution or accidental code changes.

## Sealed chronological chain

`Phase 1 product contract → Phase 2 subscriber/data runtime → Phase 3 Cloudflare → Phase 4 Hyperdrive/Neon → Phase 5 database safety → Phase 6 managed identity, permissions and lifecycle`

Current Phase 6 authority chain:

`Managed Neon Auth → Cloudflare Worker → server-side session validation → Hyperdrive → transaction-local user/owner/actor scope → active-user + local session-revocation checks → trusted-support / Professional authority → PostgreSQL RLS → owned operation → append-only audit`

## Phase 6 scope completed

Phase 6 includes:

- individual managed accounts;
- server-side authentication validation;
- Personal and Professional entitlement;
- transaction-local database identity and owner scope;
- trusted-support read vs financial-action separation;
- cross-user isolation;
- Professional workspaces;
- six roles: Owner, Administrator, Manager, Accountant/bookkeeper, Project manager, Read-only user;
- separate Professional read, financial, member-management and workspace-management authority;
- sign-up, sign-in, passwordless sign-in, sign-out and password-reset/session proxy paths;
- hashed application session/device registry;
- application session revocation enforcement;
- soft account deletion preserving financial records;
- trusted-support, session, entitlement and Professional membership revocation during deletion;
- owned Professional-workspace archive during owner deletion;
- self-scoped JSON account export including application, financial, trusted-support, Professional and audit records;
- export/deletion audit evidence;
- complete Phase 6 CI gate nested after Phase 2→5;
- protected `app.js` unchanged.

## Database seal

Production:

- Neon project: `genevieve-budget` (`icy-morning-93993343`)
- branch: `main` (`br-old-boat-axqvorbe`)
- database: `neondb`
- latest migration: `014`
- production users: `0`

Phase 6 migration chronology:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

Phase 6 tables verified present in production include:

- `user_entitlements`
- `trusted_support_grants`
- `professional_workspaces`
- `professional_memberships`
- `user_sessions`

Worker readiness is sealed to:

- `CURRENT_PHASE = 6`
- `EXPECTED_MIGRATION = "014"`

## Recovery and rollback seal

Pre-promotion recovery branch:

- `phase6-production-prepromotion-007`
- `br-nameless-mode-ax72ghlu`
- verified at migration `007`

Full isolated proof branch:

- `phase6-identity-entitlement-clean-test`
- `br-super-mouse-axqrxqeb`

Forward:

`007 → 008 → 009 → 010 → 011 → 012 → 013 → 014`

Reverse:

`014 → 013 → 012 → 011 → 010 → 009 → 008 → 007`

The final reverse schema comparison returned an empty diff against the Phase 5 parent.

## Audit defects fixed before production

Material issues identified during the final Phase 1→6 audit were corrected before production promotion:

- Professional workspace audit linkage;
- export audit identifier type mismatch;
- insufficient account-deletion cleanup authority;
- Worker permission error that could return 503 instead of the correct 403;
- missing enforcement of locally revoked sessions;
- session registration reactivation of revoked hashes;
- incomplete account export lifecycle coverage;
- owner deletion leaving an active ownerless Professional workspace.

No unresolved audit defect was knowingly promoted.

## Protected merge and post-merge gate

PR #34 was merged using exact expected head SHA `59df52be1edf7b1b499c58e561e56282770eb267`.

Protected merge commit:

`e3bd3af42138cc403f212847baefa2a890452e9d`

All five workflows then passed on that exact merged `main` commit:

- Phase 2 baseline verification #192 — `33014343891` — SUCCESS
- Phase 3 Cloudflare verification #126 — `33014343955` — SUCCESS
- Phase 4 Neon database verification #82 — `33014343908` — SUCCESS
- Phase 5 database safety verification #66 — `33014343919` — SUCCESS
- Phase 6 verification #48 — `33014343930` — SUCCESS

The Phase 6 job passed live readiness and the protected-engine check. Phase 4 passed the Cloudflare → Hyperdrive → Neon path. Phase 5 passed database safety under the Phase 6 boundary.

## Governance seal

`Protect main` ruleset `21530843` is active and requires:

- `phase2`
- `cloudflare-phase3`
- `phase4-neon`
- `phase5-database-safety`
- `phase6`

The ruleset also requires a pull request and up-to-date required checks, blocks deletion and force pushes, and has no bypass actors.

## Completion archive

The full immutable completion narrative is in:

`docs/PHASE6_COMPLETION_ARCHIVE.md`

The archive PR is allowed to change documentation only. It must not change:

- runtime code;
- `app.js`;
- migrations or rollbacks;
- Worker behavior;
- Cloudflare routes/bindings;
- Hyperdrive configuration;
- Neon schema/data.

Before archive merge, the exact archive head must be zero commits behind `main`, all five required checks must pass, and the merge must use the exact expected archive-head SHA.

After archive merge, protected `main`, all five workflows, production migration 014, and the presence of the archive file on `main` must be verified again.

Only when those conditions are true is Phase 6 formally **COMPLETE / LIVE / GREEN / ARCHIVED**.

## Chronology after Phase 6

Do not begin Phase 7 during this archive operation.

After the archive is fully merged and post-archive GREEN, the next chronological phase may be identified and scoped as a separate operation.
