import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  authenticateRequest,
  proxyAuthRequest,
  resolveAuthBaseUrl,
  withAuthenticatedUserTransaction,
} from './src/worker.mjs';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const AUTH_URL = 'https://auth.example.test/neondb/auth';

function gitBlobSha(text) {
  const header = `blob ${Buffer.byteLength(text)}\0`;
  return createHash('sha1').update(header).update(text).digest('hex');
}

function validSessionResponse(userId = USER_ID) {
  return new Response(JSON.stringify({
    session: { id: 'session-1', expiresAt: new Date(Date.now() + 60_000).toISOString() },
    user: { id: userId, email: 'user@example.test', name: 'Budget User' },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

test('managed auth URL is HTTPS-only, credential-free and configuration-driven', () => {
  assert.equal(resolveAuthBaseUrl({}), null);
  assert.equal(resolveAuthBaseUrl({ NEON_AUTH_URL: 'http://auth.example.test/auth' }), null);
  assert.equal(resolveAuthBaseUrl({ NEON_AUTH_URL: 'https://user:pass@auth.example.test/auth' }), null);
  assert.equal(resolveAuthBaseUrl({ NEON_AUTH_URL: `${AUTH_URL}/` }).toString(), AUTH_URL);
});

test('missing identity fails closed before auth network or database access', async () => {
  let fetches = 0;
  let databaseConstructed = 0;
  class NeverClient { constructor() { databaseConstructed += 1; } }

  const result = await withAuthenticatedUserTransaction(
    new Request('https://budget.example.test/api/identity'),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    async () => assert.fail('owned operation must not run'),
    { ClientClass: NeverClient, fetchImpl: async () => { fetches += 1; return validSessionResponse(); } },
  );

  assert.deepEqual(result, { ok: false, status: 401, code: 'authentication_required' });
  assert.equal(fetches, 0);
  assert.equal(databaseConstructed, 0);
});

test('invalid authenticated user id fails closed before database access', async () => {
  let databaseConstructed = 0;
  class NeverClient { constructor() { databaseConstructed += 1; } }
  const request = new Request('https://budget.example.test/api/identity', { headers: { cookie: 'session=opaque' } });

  const result = await withAuthenticatedUserTransaction(
    request,
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    async () => assert.fail('owned operation must not run'),
    { ClientClass: NeverClient, fetchImpl: async () => validSessionResponse('not-a-uuid') },
  );

  assert.deepEqual(result, { ok: false, status: 401, code: 'authentication_required' });
  assert.equal(databaseConstructed, 0);
});

test('server independently validates the session with managed Auth', async () => {
  const seen = [];
  const request = new Request('https://budget.example.test/api/identity', { headers: { cookie: 'session=opaque' } });
  const result = await authenticateRequest(request, { NEON_AUTH_URL: AUTH_URL }, async (url, init) => {
    seen.push({ url: String(url), init });
    return validSessionResponse();
  });

  assert.equal(result.ok, true);
  assert.equal(result.user.id, USER_ID);
  assert.equal(seen[0].url, `${AUTH_URL}/get-session`);
  assert.equal(seen[0].init.headers.cookie, 'session=opaque');
  assert.equal(seen[0].init.headers['cache-control'], 'no-store');
});

test('same-origin auth boundary proxies to managed Auth and is never cached', async () => {
  const seen = [];
  const request = new Request('https://budget.example.test/auth/get-session', { headers: { cookie: 'session=opaque' } });
  const response = await proxyAuthRequest(request, { NEON_AUTH_URL: AUTH_URL }, async (url, init) => {
    seen.push({ url: String(url), init });
    return validSessionResponse();
  });

  assert.equal(response.status, 200);
  assert.equal(seen[0].url, `${AUTH_URL}/get-session`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('owned database work is ordered BEGIN -> local app.user_id -> active user -> owned query -> COMMIT', async () => {
  const calls = [];
  class RecordingClient {
    constructor(config) { calls.push({ kind: 'construct', config }); }
    async connect() { calls.push({ kind: 'connect' }); }
    async query(sql, params) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ kind: 'query', sql: compact, params });
      if (compact.includes('FROM public.users') && compact.includes("status = 'active'")) {
        return { rows: [{ id: USER_ID, email: 'user@example.test' }] };
      }
      if (compact.includes('FROM public.accounts')) return { rows: [{ id: 'account-1' }] };
      return { rows: [] };
    }
    async end() { calls.push({ kind: 'end' }); }
  }

  const request = new Request('https://budget.example.test/api/example', { headers: { cookie: 'session=opaque' } });
  const result = await withAuthenticatedUserTransaction(
    request,
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://hyperdrive-test' } },
    async (client, identity) => client.query('SELECT id FROM public.accounts WHERE user_id = $1', [identity.user.id]),
    { ClientClass: RecordingClient, fetchImpl: async () => validSessionResponse() },
  );

  assert.equal(result.ok, true);
  const queries = calls.filter((entry) => entry.kind === 'query');
  assert.equal(queries[0].sql, 'BEGIN');
  assert.match(queries[1].sql, /set_config\('app\.user_id', \$1, true\)/);
  assert.match(queries[1].sql, /set_config\('app\.actor_type', 'user', true\)/);
  assert.deepEqual(queries[1].params, [USER_ID]);
  assert.match(queries[2].sql, /id = public\.current_app_user_id\(\)/);
  assert.match(queries[3].sql, /FROM public\.accounts/);
  assert.equal(queries[4].sql, 'COMMIT');
});

test('inactive application user rolls back before any owned operation', async () => {
  const calls = [];
  let operationRan = false;
  class InactiveClient {
    async connect() {}
    async query(sql, params) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: compact, params });
      if (compact.includes('FROM public.users')) return { rows: [] };
      return { rows: [] };
    }
    async end() {}
  }

  const request = new Request('https://budget.example.test/api/example', { headers: { cookie: 'session=opaque' } });
  const result = await withAuthenticatedUserTransaction(
    request,
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    async () => { operationRan = true; },
    { ClientClass: InactiveClient, fetchImpl: async () => validSessionResponse() },
  );

  assert.deepEqual(result, { ok: false, status: 403, code: 'application_user_unavailable' });
  assert.equal(operationRan, false);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
});

test('migration 008 contains only identity and Personal/Professional entitlement scope', async () => {
  const migration = await read('./database/migrations/008_phase6_auth_identity_entitlement.sql');
  const phase5 = await read('./database/migrations/005_phase5_database_safety.sql');
  const worker = await read('./src/worker.mjs');

  assert.match(migration, /CREATE TABLE public\.user_entitlements/);
  assert.match(migration, /product_mode IN \('personal', 'professional'\)/);
  assert.match(migration, /user_entitlements_select_own/);
  assert.match(migration, /user_id = public\.current_app_user_id\(\)/);
  assert.match(migration, /sync_neon_auth_user/);
  assert.match(migration, /VALUES \('008', 'Phase 6 authenticated identity and Personal Professional entitlement'\)/);
  assert.doesNotMatch(migration, /trusted_support|professional_membership|professional_workspace|delete_current_account/i);
  assert.match(phase5, /current_setting\('app\.user_id', true\)/);
  assert.match(worker, /set_config\('app\.user_id', \$1, true\)/);
  assert.doesNotMatch(worker, /app\.owner_user_id|trusted_support|professional_member/i);
});

test('Cloudflare runs auth and identity before static assets while preserving Phase 3 routes first', async () => {
  const config = JSON.parse(await read('./wrangler.jsonc'));
  assert.deepEqual(config.assets.run_worker_first.slice(0, 2), ['/health', '/ready']);
  for (const route of ['/auth', '/auth/*', '/api', '/api/*']) {
    assert.ok(config.assets.run_worker_first.includes(route), `missing Worker-first route ${route}`);
  }
});

test('protected Budget engine remains byte-for-byte unchanged', async () => {
  const app = await read('./app.js');
  assert.equal(gitBlobSha(app), 'a86381a76c4676b9d14cbcb1a6b9de842c1cd24c');
});
