import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { withAuthorizedOwnerTransaction } from './src/worker.mjs';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const AUTH_URL = 'https://auth.example.test/neondb/auth';
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SUPPORT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function sessionResponse(userId) {
  return new Response(JSON.stringify({
    session: { id: `session-${userId}`, expiresAt: new Date(Date.now() + 60_000).toISOString() },
    user: { id: userId, email: `${userId.slice(0, 8)}@example.test` },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function request() {
  return new Request('https://budget.example.test/api/example', { headers: { cookie: 'session=opaque' } });
}

function authorityClient(authorityResolver, calls) {
  return class RecordingClient {
    async connect() { calls.push({ kind: 'connect' }); }
    async query(sql, params) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ kind: 'query', sql: compact, params });
      if (compact.includes('application_user_is_active')) {
        return { rows: [{ actor_active: true, owner_active: true }] };
      }
      if (compact.includes('FROM public.user_sessions')) return { rows: [] };
      if (compact.includes('register_current_session')) {
        return { rows: [{ session_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }] };
      }
      if (compact.includes('trusted_support_can')) {
        return { rows: [{ allowed: authorityResolver(params) }] };
      }
      if (compact.includes('FROM public.accounts')) return { rows: [{ id: 'owned-account' }] };
      return { rows: [] };
    }
    async end() { calls.push({ kind: 'end' }); }
  };
}

test('User A cannot read User B data without an explicit trusted-support read grant', async () => {
  const calls = [];
  let operationRan = false;
  const ClientClass = authorityClient(() => false, calls);

  const result = await withAuthorizedOwnerTransaction(
    request(),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    USER_B,
    'read',
    async () => { operationRan = true; },
    { ClientClass, fetchImpl: async () => sessionResponse(USER_A) },
  );

  assert.deepEqual(result, { ok: false, status: 403, code: 'support_authority_required' });
  assert.equal(operationRan, false);
  const queries = calls.filter((entry) => entry.kind === 'query');
  assert.equal(queries[0].sql, 'BEGIN');
  assert.deepEqual(queries[1].params, [USER_A, USER_B, 'support']);
  const sessionQuery = queries.find((entry) => entry.sql.includes('FROM public.user_sessions'));
  assert.equal(sessionQuery.params[0], USER_A);
  const authorityQuery = queries.find((entry) => entry.sql.includes('trusted_support_can'));
  assert.deepEqual(authorityQuery.params, [USER_B, USER_A, 'read']);
  assert.equal(queries.at(-1).sql, 'ROLLBACK');
});

test('User A cannot perform a financial action on User B data without explicit financial authority', async () => {
  const calls = [];
  let operationRan = false;
  const ClientClass = authorityClient(() => false, calls);

  const result = await withAuthorizedOwnerTransaction(
    request(),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    USER_B,
    'financial_action',
    async () => { operationRan = true; },
    { ClientClass, fetchImpl: async () => sessionResponse(USER_A) },
  );

  assert.deepEqual(result, { ok: false, status: 403, code: 'support_authority_required' });
  assert.equal(operationRan, false);
  const authorityQuery = calls.find((entry) => entry.kind === 'query' && entry.sql.includes('trusted_support_can'));
  assert.deepEqual(authorityQuery.params, [USER_B, USER_A, 'financial_action']);
});

test('read-only trusted support can read owner data but cannot perform financial actions', async () => {
  const readCalls = [];
  const ReadClient = authorityClient((params) => params[2] === 'read', readCalls);
  const readResult = await withAuthorizedOwnerTransaction(
    request(),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    USER_B,
    'read',
    async (client, context) => {
      assert.equal(context.actor.id, SUPPORT);
      assert.equal(context.actor.type, 'support');
      assert.equal(context.ownerUserId, USER_B);
      return client.query('SELECT id FROM public.accounts WHERE user_id = $1', [context.ownerUserId]);
    },
    { ClientClass: ReadClient, fetchImpl: async () => sessionResponse(SUPPORT) },
  );

  assert.equal(readResult.ok, true);
  assert.equal(readCalls.filter((entry) => entry.kind === 'query').at(-1).sql, 'COMMIT');

  const writeCalls = [];
  let writeRan = false;
  const WriteClient = authorityClient((params) => params[2] === 'read', writeCalls);
  const writeResult = await withAuthorizedOwnerTransaction(
    request(),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    USER_B,
    'financial_action',
    async () => { writeRan = true; },
    { ClientClass: WriteClient, fetchImpl: async () => sessionResponse(SUPPORT) },
  );

  assert.deepEqual(writeResult, { ok: false, status: 403, code: 'support_authority_required' });
  assert.equal(writeRan, false);
});

test('trusted support can perform financial action only after that exact authority is granted', async () => {
  const calls = [];
  let operationRan = false;
  const ClientClass = authorityClient((params) => params[2] === 'financial_action', calls);

  const result = await withAuthorizedOwnerTransaction(
    request(),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    USER_B,
    'financial_action',
    async (client, context) => {
      operationRan = true;
      assert.equal(context.actor.type, 'support');
      return client.query('UPDATE public.accounts SET updated_at = now() WHERE user_id = $1 RETURNING id', [context.ownerUserId]);
    },
    { ClientClass, fetchImpl: async () => sessionResponse(SUPPORT) },
  );

  assert.equal(result.ok, true);
  assert.equal(operationRan, true);
  assert.equal(calls.filter((entry) => entry.kind === 'query').at(-1).sql, 'COMMIT');
});

test('invalid owner or capability fails closed before opening the database', async () => {
  let constructed = 0;
  class NeverClient { constructor() { constructed += 1; } }

  const invalidOwner = await withAuthorizedOwnerTransaction(
    request(),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    'not-a-uuid',
    'read',
    async () => assert.fail('must not run'),
    { ClientClass: NeverClient, fetchImpl: async () => sessionResponse(USER_A) },
  );
  assert.deepEqual(invalidOwner, { ok: false, status: 400, code: 'invalid_owner_scope' });

  const invalidCapability = await withAuthorizedOwnerTransaction(
    request(),
    { NEON_AUTH_URL: AUTH_URL, HYPERDRIVE: { connectionString: 'postgres://test' } },
    USER_B,
    'delete_everything',
    async () => assert.fail('must not run'),
    { ClientClass: NeverClient, fetchImpl: async () => sessionResponse(USER_A) },
  );
  assert.deepEqual(invalidCapability, { ok: false, status: 400, code: 'invalid_owner_scope' });
  assert.equal(constructed, 0);
});

test('migration 009 separates read from financial-action authority at RLS level', async () => {
  const migration = await read('./database/migrations/009_phase6_trusted_support_permissions.sql');
  const rollback = await read('./database/rollbacks/phase6_trusted_support_to_identity.sql');

  assert.match(migration, /CREATE TABLE public\.trusted_support_grants/);
  assert.match(migration, /can_read boolean NOT NULL DEFAULT true/);
  assert.match(migration, /can_financial_action boolean NOT NULL DEFAULT false/);
  assert.match(migration, /NOT can_financial_action OR can_read/);
  assert.match(migration, /WHEN 'read' THEN g\.can_read/);
  assert.match(migration, /WHEN 'financial_action' THEN g\.can_financial_action/);
  assert.match(migration, /can_access_owned_record\(user_id, ''read''\)/);
  assert.match(migration, /can_access_owned_record\(user_id, ''financial_action''\)/);
  assert.match(migration, /audit_events_select_scoped/);
  assert.match(migration, /audit_events_insert_scoped/);
  assert.match(migration, /REVOKE DELETE ON public\.trusted_support_grants/);
  assert.match(migration, /VALUES \('009', 'Phase 6 trusted support read and financial action authority separation'\)/);
  assert.doesNotMatch(migration, /professional_membership|professional_workspace|delete_current_account/i);

  assert.match(rollback, /DELETE FROM public\.schema_migrations WHERE version = '009'/);
  assert.match(rollback, /table_name \|\| '_select_own'/);
  assert.match(rollback, /DROP TABLE IF EXISTS public\.trusted_support_grants/);
});
