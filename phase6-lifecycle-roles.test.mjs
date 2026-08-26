import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  AUTH_LIFECYCLE_PATHS,
  authenticateRequest,
  proxyAuthRequest,
} from './src/worker.mjs';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const AUTH_URL = 'https://auth.example.test/neondb/auth';
const USER_ID = '11111111-1111-4111-8111-111111111111';

function sessionResponse(expiresAt) {
  return new Response(JSON.stringify({
    session: { id: 'session-one', expiresAt },
    user: { id: USER_ID, email: 'user@example.test' },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('managed auth lifecycle exposes sign-up sign-in sign-out reset password passwordless and session actions', () => {
  for (const required of [
    '/auth/sign-up/email', '/auth/sign-in/email', '/auth/sign-in/magic-link', '/auth/sign-out',
    '/auth/forget-password', '/auth/reset-password', '/auth/get-session', '/auth/list-sessions',
    '/auth/revoke-session', '/auth/revoke-other-sessions', '/auth/delete-user',
  ]) assert.ok(AUTH_LIFECYCLE_PATHS.includes(required), `missing auth lifecycle path ${required}`);
});

test('auth lifecycle requests stay same-origin at the app and proxy to configured Neon Auth', async () => {
  const seen = [];
  for (const path of ['/auth/sign-up/email', '/auth/sign-in/email', '/auth/sign-out', '/auth/reset-password', '/auth/sign-in/magic-link']) {
    const response = await proxyAuthRequest(
      new Request(`https://budget.example.test${path}`, { method: 'POST', body: '{}' }),
      { NEON_AUTH_URL: AUTH_URL },
      async (url, init) => {
        seen.push({ path, url: String(url), method: init.method });
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    );
    assert.equal(response.status, 200);
  }
  assert.deepEqual(seen.map((entry) => entry.url), [
    `${AUTH_URL}/sign-up/email`, `${AUTH_URL}/sign-in/email`, `${AUTH_URL}/sign-out`,
    `${AUTH_URL}/reset-password`, `${AUTH_URL}/sign-in/magic-link`,
  ]);
  assert.ok(seen.every((entry) => entry.method === 'POST'));
});

test('expired managed session fails closed', async () => {
  const request = new Request('https://budget.example.test/api/identity', { headers: { cookie: 'session=opaque' } });
  const result = await authenticateRequest(request, { NEON_AUTH_URL: AUTH_URL }, async () =>
    sessionResponse(new Date(Date.now() - 1000).toISOString()));
  assert.deepEqual(result, { ok: false, status: 401, code: 'session_expired' });
});

test('professional role migration defines exactly the six authorised roles and separates capabilities', async () => {
  const migration = await read('./database/migrations/010_phase6_professional_roles.sql');
  for (const role of ['owner', 'administrator', 'manager', 'accountant_bookkeeper', 'project_manager', 'read_only']) {
    assert.match(migration, new RegExp(`'${role}'`));
  }
  assert.match(migration, /WHEN 'read' THEN m\.role IN \('owner','administrator','manager','accountant_bookkeeper','project_manager','read_only'\)/);
  assert.match(migration, /WHEN 'financial_action' THEN m\.role IN \('owner','administrator','manager','accountant_bookkeeper','project_manager'\)/);
  assert.match(migration, /WHEN 'manage_members' THEN m\.role IN \('owner','administrator'\)/);
  assert.match(migration, /WHEN 'manage_workspace' THEN m\.role = 'owner'/);
  assert.match(migration, /e\.product_mode = 'professional'/);
  assert.match(migration, /e\.status = 'active'/);
  assert.match(migration, /audit_professional_workspace_change/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.(projects|cost_centres|invoices|commitments)/i);
});

test('professional permission failures remain explicit 403 outcomes instead of database outages', async () => {
  const worker = await read('./src/worker.mjs');
  assert.match(worker, /EXPLICIT_PERMISSION_FAILURES/);
  assert.match(worker, /professional_authority_required/);
  assert.match(worker, /professional_entitlement_required/);
  assert.match(worker, /return failure\(403, error\.code\)/);
});

test('professional roles remain fail-closed and non-destructive', async () => {
  const migration = await read('./database/migrations/010_phase6_professional_roles.sql');
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(migration, /REVOKE DELETE ON public\.professional_workspaces/);
  assert.match(migration, /REVOKE DELETE ON public\.professional_memberships/);
  assert.match(migration, /role <> 'owner'/);
  assert.match(migration, /professional_memberships_audit_change/);
});

test('session/device registry stores a hash and migration 014 makes revocation one-way', async () => {
  const lifecycle = await read('./database/migrations/011_phase6_account_lifecycle_sessions_export.sql');
  const hardening = await read('./database/migrations/014_phase6_lifecycle_audit_hardening.sql');
  const worker = await read('./src/worker.mjs');
  assert.match(lifecycle, /auth_session_hash text NOT NULL/);
  assert.doesNotMatch(lifecycle, /auth_session_token|raw_session/i);
  assert.match(worker, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(worker, /FROM public\.user_sessions/);
  assert.match(worker, /session_revoked/);
  assert.match(worker, /register_current_session/);
  assert.match(worker, /revoke_current_session/);
  assert.match(lifecycle, /user_sessions_select_own/);
  assert.match(lifecycle, /user_id = public\.current_app_user_id\(\)/);
  assert.match(hardening, /revoked_at = public\.user_sessions\.revoked_at/);
  assert.doesNotMatch(hardening, /revoked_at = NULL/);
});

test('account deletion is soft, archives owned Professional workspaces and revokes their memberships', async () => {
  const lifecycle = await read('./database/migrations/011_phase6_account_lifecycle_sessions_export.sql');
  const authority = await read('./database/migrations/013_phase6_account_deletion_authority.sql');
  const hardening = await read('./database/migrations/014_phase6_lifecycle_audit_hardening.sql');
  const worker = await read('./src/worker.mjs');
  assert.match(worker, /body\?\.confirm !== "DELETE"/);
  assert.match(lifecycle, /CREATE OR REPLACE FUNCTION public\.delete_current_account/);
  assert.match(authority, /SECURITY DEFINER/);
  assert.match(hardening, /SECURITY DEFINER/);
  assert.match(hardening, /REVOKE ALL ON FUNCTION public\.delete_current_account\(\) FROM PUBLIC/);
  assert.match(hardening, /UPDATE public\.trusted_support_grants/);
  assert.match(hardening, /UPDATE public\.professional_workspaces/);
  assert.match(hardening, /SET status = 'archived'/);
  assert.match(hardening, /archived_at = COALESCE\(archived_at, now\(\)\)/);
  assert.match(hardening, /UPDATE public\.professional_memberships/);
  assert.match(hardening, /workspace_id IN/);
  assert.match(hardening, /UPDATE public\.user_sessions/);
  assert.match(hardening, /UPDATE public\.user_entitlements/);
  assert.match(hardening, /SET status = 'deleted', deleted_at = now\(\)/);
  assert.match(hardening, /'financial_records_preserved', true/);
  assert.match(hardening, /'owned_professional_workspaces_archived', true/);
  assert.doesNotMatch(hardening, /DELETE FROM public\.(accounts|transactions|bills|subscriptions|savings_goals|debts|professional_workspaces|professional_memberships)/i);
});

test('data export is self-scoped, complete for Phase 6 lifecycle data, audited, and uses bigint audit ids', async () => {
  const lifecycle = await read('./database/migrations/011_phase6_account_lifecycle_sessions_export.sql');
  const correction = await read('./database/migrations/012_phase6_export_audit_id_type.sql');
  const worker = await read('./src/worker.mjs');
  assert.match(worker, /\/api\/account\/export/);
  assert.match(worker, /SELECT \* FROM public\.users/);
  assert.match(worker, /trusted_support_grants/);
  assert.match(worker, /professional_workspaces/);
  assert.match(worker, /professional_memberships/);
  assert.match(worker, /record_data_export\('json'\)/);
  assert.match(worker, /SELECT \* FROM public\.audit_events/);
  assert.match(worker, /WHERE user_id = \$1/);
  assert.match(lifecycle, /'data_export'/);
  assert.match(correction, /RETURNS bigint/);
  assert.match(correction, /audit_id bigint/);
  assert.ok(worker.indexOf("record_data_export('json')") < worker.indexOf('SELECT * FROM public.audit_events'));
});

test('migrations and rollbacks are chronological through 014', async () => {
  const files = [
    ['./database/migrations/010_phase6_professional_roles.sql', '010'],
    ['./database/migrations/011_phase6_account_lifecycle_sessions_export.sql', '011'],
    ['./database/migrations/012_phase6_export_audit_id_type.sql', '012'],
    ['./database/migrations/013_phase6_account_deletion_authority.sql', '013'],
    ['./database/migrations/014_phase6_lifecycle_audit_hardening.sql', '014'],
  ];
  for (const [path, version] of files) assert.match(await read(path), new RegExp(`VALUES \\('${version}'`));
  assert.match(await read('./database/rollbacks/phase6_lifecycle_to_trusted_support.sql'), /WHERE version = '011'/);
  assert.match(await read('./database/rollbacks/phase6_export_audit_type_to_lifecycle.sql'), /WHERE version = '012'/);
  assert.match(await read('./database/rollbacks/phase6_account_deletion_authority_to_export_type.sql'), /WHERE version = '013'/);
  assert.match(await read('./database/rollbacks/phase6_lifecycle_audit_hardening_to_account_deletion_authority.sql'), /WHERE version = '014'/);
  assert.match(await read('./database/rollbacks/phase6_professional_roles_to_trusted_support.sql'), /WHERE version = '010'/);
});
