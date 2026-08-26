import test from 'node:test';
import assert from 'node:assert/strict';
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

function validSessionResponse(userId = USER_ID) {
  return new Response(JSON.stringify({
    session: {
      id: 'session-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    user: {
      id: userId,
      email: 'user@example.test',
      name: 'Budget User',
    },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('Phase 6 auth base must be configured as a credential-free HTTPS URL', () => {
  assert.equal(resolveAuthBaseUrl({}), null);
  assert.equal(resolveAuthBaseUrl({ NEON_AUTH_URL: 'http://auth.example.test/auth' }), null);
  assert.equal(resolveAuthBaseUrl({ NEON_AUTH_URL: 'https://user:pass@auth.example.test/auth' }), null);
  assert.equal(resolveAuthBaseUrl({ NEON_AUTH_URL: `${AUTH_URL}/` }).toString(), AUTH_URL);
});

test('missing authentication cookie fails closed before any auth network or database work', async () => {
  let authFetches = 0;
  let dbConstructed = 0;
  class NeverDatabaseClient {
    constructor() { dbConstructed += 1; }
  }

  const result = await withAuthenticatedUserTransaction(
    new Request('https://budget.example.test/api/identity'),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    async () => assert.fail('owned operation must not run'),
    {
      ClientClass: NeverDatabaseClient,
      fetchImpl: async () => { authFetches += 1; return validSessionResponse(); },
    },
  );

  assert.deepEqual(result, { ok: false, status: 401, code: 'authentication_required' });
  assert.equal(authFetches, 0);
  assert.equal(dbConstructed, 0);
});

test('invalid managed-auth user id fails closed before the database is opened', async () => {
  let dbConstructed = 0;
  class NeverDatabaseClient {
    constructor() { dbConstructed += 1; }
  }

  const request = new Request('https://budget.example.test/api/identity', {
    headers: { cookie: 'session=opaque' },
  });
  const result = await withAuthenticatedUserTransaction(
    request,
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    async () => assert.fail('owned operation must not run'),
    {
      ClientClass: NeverDatabaseClient,
      fetchImpl: async () => validSessionResponse('not-a-uuid'),
    },
  );

  assert.deepEqual(result, { ok: false, status: 401, code: 'authentication_required' });
  assert.equal(dbConstructed, 0);
});

test('server validates the same-origin session against managed Neon Auth', async () => {
  const seen = [];
  const request = new Request('https://budget.example.test/api/identity', {
    headers: { cookie: 'session=opaque', 'user-agent': 'phase6-test' },
  });

  const result = await authenticateRequest(request, { NEON_AUTH_URL: AUTH_URL }, async (url, init) => {
    seen.push({ url: String(url), init });
    return validSessionResponse();
  });

  assert.equal(result.ok, true);
  assert.equal(result.user.id, USER_ID);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, `${AUTH_URL}/get-session`);
  assert.equal(seen[0].init.headers.cookie, 'session=opaque');
  assert.equal(seen[0].init.headers['cache-control'], 'no-store');
});

test('auth proxy maps same-origin /auth paths to managed auth without embedding its URL in browser code', async () => {
  const seen = [];
  const request = new Request('https://budget.example.test/auth/sign-out?all=true', {
    method: 'POST',
    headers: { cookie: 'session=opaque', 'content-type': 'application/json' },
    body: '{}',
  });

  const response = await proxyAuthRequest(request, { NEON_AUTH_URL: AUTH_URL }, async (url, init) => {
    seen.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': 'session=; Path=/; HttpOnly; Secure' },
    });
  });

  assert.equal(response.status, 200);
  assert.equal(seen[0].url, `${AUTH_URL}/sign-out?all=true`);
  assert.equal(seen[0].init.method, 'POST');
  assert.match(seen[0].init.headers.get('cookie'), /session=opaque/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('authenticated owned query order is BEGIN -> transaction-local app.user_id -> active user -> owned query -> COMMIT', async () => {
  const calls = [];
  class RecordingClient {
    constructor(config) {
      calls.push({ type: 'construct', config });
    }
    async connect() { calls.push({ type: 'connect' }); }
    async query(sql, params) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ type: 'query', sql: compact, params });
      if (compact.includes('FROM public.users') && compact.includes("status = 'active'")) {
        return { rows: [{ id: USER_ID, email: 'user@example.test' }] };
      }
      if (compact.includes('FROM public.accounts')) {
        return { rows: [{ id: 'account-1' }] };
      }
      return { rows: [] };
    }
    async end() { calls.push({ type: 'end' }); }
  }

  const request = new Request('https://budget.example.test/api/example', {
    headers: { cookie: 'session=opaque' },
  });
  const result = await withAuthenticatedUserTransaction(
    request,
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://hyperdrive-test' } },
    async (client, identity) => {
      assert.equal(identity.user.id, USER_ID);
      return client.query('SELECT id FROM public.accounts WHERE user_id = $1', [identity.user.id]);
    },
    {
      ClientClass: RecordingClient,
      fetchImpl: async () => validSessionResponse(),
    },
  );

  assert.equal(result.ok, true);
  const queries = calls.filter((entry) => entry.type === 'query');
  assert.equal(queries[0].sql, 'BEGIN');
  assert.match(queries[1].sql, /set_config\('app\.user_id', \$1, true\)/);
  assert.match(queries[1].sql, /set_config\('app\.owner_user_id', \$1, true\)/);
  assert.match(queries[1].sql, /set_config\('app\.actor_type', 'user', true\)/);
  assert.deepEqual(queries[1].params, [USER_ID]);
  assert.match(queries[2].sql, /id = public\.current_app_user_id\(\)/);
  assert.deepEqual(queries[2].params, [USER_ID]);
  assert.match(queries[3].sql, /FROM public\.accounts/);
  assert.deepEqual(queries[3].params, [USER_ID]);
  assert.equal(queries[4].sql, 'COMMIT');
});

test('inactive or missing application identity rolls back and never reaches an owned query', async () => {
  const calls = [];
  let ownedOperationRan = false;
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

  const request = new Request('https://budget.example.test/api/example', {
    headers: { cookie: 'session=opaque' },
  });
  const result = await withAuthenticatedUserTransaction(
    request,
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    async () => { ownedOperationRan = true; },
    { ClientClass: InactiveClient, fetchImpl: async () => validSessionResponse() },
  );

  assert.deepEqual(result, { ok: false, status: 403, code: 'application_user_unavailable' });
  assert.equal(ownedOperationRan, false);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
});

test('Cloudflare worker-first routing covers auth and API boundaries before static assets', async () => {
  const wrangler = JSON.parse(await read('./wrangler.jsonc'));
  const routes = wrangler.assets.run_worker_first;
  for (const route of ['/health', '/ready', '/auth', '/auth/*', '/api', '/api/*']) {
    assert.ok(routes.includes(route), `Worker-first route missing: ${route}`);
  }
});

test('Phase 5 RLS identity reader links to Phase 6 transaction scope and Personal/Professional entitlement', async () => {
  const phase5 = await read('./database/migrations/005_phase5_database_safety.sql');
  const phase6Identity = await read('./database/migrations/008_phase6_auth_identity_foundation.sql');
  const phase6Scope = await read('./database/migrations/010_phase6_rls_identity_scope.sql');
  const worker = await read('./src/worker.mjs');
  const browserRuntime = await read('./phase6-auth-runtime.js');
  const wrangler = await read('./wrangler.jsonc');

  assert.match(phase5, /current_setting\('app\.user_id', true\)/);
  assert.match(phase6Identity, /CREATE TABLE public\.user_entitlements/);
  assert.match(phase6Identity, /product_mode IN \('personal', 'professional'\)/);
  assert.match(phase6Scope, /public\.current_app_user_id\(\)/);
  assert.match(phase6Scope, /public\.user_has_professional_entitlement/);
  assert.match(worker, /set_config\('app\.user_id', \$1, true\)/);
  assert.match(worker, /set_config\('app\.owner_user_id', \$1, true\)/);
  assert.doesNotMatch(browserRuntime, /neonauth\.|postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(worker, /ep-[a-z0-9-]+\.neonauth\./i);
  assert.doesNotMatch(wrangler, /ep-[a-z0-9-]+\.neonauth\./i);
});
