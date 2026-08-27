import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  buildAccountBalanceSnapshot,
  calculateBalanceSummary,
  spendingForMonth,
} from './phase7-core-balances.mjs';
import {
  normalizePhase7SyncPayload,
  normalizePhase7ArchivePayload,
  readPhase7AccountState,
  syncPhase7AccountState,
  archivePhase7Account,
  handlePhase7AccountRequest,
} from './src/phase7-account-routes.mjs';
import {
  checkPhase7Database,
  checkPhase7Readiness,
} from './src/phase7-readiness.mjs';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const balanceBridge = await readFile(new URL('./phase7-core-balances-bridge.js', import.meta.url), 'utf8');
const migration015 = await readFile(new URL('./database/migrations/015_phase7_account_balance_persistence.sql', import.meta.url), 'utf8');
const rollback015 = await readFile(new URL('./database/rollbacks/phase7_account_balance_persistence_to_phase6.sql', import.meta.url), 'utf8');

function browserStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const api = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
  return new Proxy(api, {
    set(target, key, value) {
      if (key in target) target[key] = value;
      else values.set(String(key), String(value));
      return true;
    },
  });
}

async function runBalanceBridgeHarness({ initialStorage, cloudBody, confirmResult = true }) {
  const localStorage = browserStorage(initialStorage);
  const listeners = new Map();
  const fetchCalls = [];
  const status = { textContent: '' };
  const actions = { hidden: true };
  let actionHandler = null;
  let action = {
    textContent: '',
    cloneNode() {
      return {
        textContent: '',
        addEventListener(type, handler) { if (type === 'click') actionHandler = handler; },
      };
    },
  };
  action.parentNode = {
    replaceChild(replacement) {
      action = replacement;
      action.parentNode = this;
    },
  };
  const document = {
    visibilityState: 'visible',
    addEventListener(type, handler) { listeners.set(type, handler); },
    getElementById(id) {
      if (id === 'phase7PersistenceStatus') return status;
      if (id === 'phase7PersistenceActions') return actions;
      if (id === 'phase7PersistenceAction') return action;
      return null;
    },
    querySelector() { return null; },
  };
  let reloads = 0;
  const fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (url === '/api/phase7/accounts') {
      return new Response(JSON.stringify({ ok: true, ...cloudBody }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url === '/api/phase7/accounts/sync') {
      const payload = JSON.parse(options.body);
      return new Response(JSON.stringify({
        ok: true,
        userId: payload.userId,
        revision: payload.baseRevision + 1,
        mappings: payload.accounts.map((account) => ({
          clientId: account.id,
          serverId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          openingBalance: account.openingBalance,
        })),
        protection: { ...payload.protection, snapshotAt: '2026-08-27T00:00:00.000Z' },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
  vm.runInNewContext(balanceBridge, {
    document,
    localStorage,
    fetch,
    Response,
    Intl,
    confirm: () => confirmResult,
    location: { reload() { reloads += 1; } },
    setTimeout(handler) { handler(); return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    console,
  });
  listeners.get('DOMContentLoaded')();
  for (let index = 0; index < 4; index += 1) await new Promise((resolve) => setImmediate(resolve));
  return {
    localStorage,
    fetchCalls,
    status,
    actions,
    reloads: () => reloads,
    clickAction: async () => {
      assert.equal(typeof actionHandler, 'function');
      actionHandler();
      for (let index = 0; index < 4; index += 1) await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

class Phase7ReadyClient {
  async connect() {}
  async query(sql, params) {
    assert.match(sql, /public\.schema_migrations/);
    assert.deepEqual(params, ['015']);
    return { rows: [{ database_name: 'neondb', migration_ready: true }] };
  }
  async end() {}
}

test('Phase 7 readiness advances only to migration 015 while the sealed Phase 6 readiness export remains intact', async () => {
  assert.deepEqual(
    await checkPhase7Database({ HYPERDRIVE: { connectionString: 'postgres://hyperdrive' } }, Phase7ReadyClient),
    { ok: true, migration: '015' },
  );
  const readiness = await checkPhase7Readiness({
    ASSETS: { fetch: async () => new Response('ok') },
    HYPERDRIVE: { connectionString: 'postgres://hyperdrive' },
  }, Phase7ReadyClient);
  assert.deepEqual(readiness, {
    status: 200,
    payload: {
      ok: true,
      service: 'genevieve-budget',
      phase: 7,
      assets: 'ready',
      database: 'ready',
      migration: '015',
    },
  });
});

test('migration 015 and its rollback are chronological, reversible, and preserve opening balance', () => {
  assert.match(migration015, /ADD COLUMN current_balance_snapshot numeric\(14,2\)/);
  assert.match(migration015, /ADD COLUMN phase7_sync_revision bigint NOT NULL DEFAULT 0/);
  assert.match(migration015, /phase7_protection_snapshot_complete boolean NOT NULL DEFAULT false/);
  assert.match(migration015, /CREATE UNIQUE INDEX accounts_user_phase7_client_active_unique/);
  assert.match(migration015, /CREATE TRIGGER accounts_preserve_opening_balance/);
  assert.match(migration015, /account opening balance is immutable/);
  assert.match(migration015, /VALUES \('015'/);
  assert.doesNotMatch(migration015, /SET opening_balance\s*=/);
  assert.match(rollback015, /DELETE FROM public\.schema_migrations WHERE version = '015'/);
  assert.match(rollback015, /DROP COLUMN IF EXISTS current_balance_snapshot/);
  assert.match(rollback015, /DROP COLUMN IF EXISTS phase7_sync_revision/);
  assert.match(rollback015, /DROP TRIGGER IF EXISTS accounts_preserve_opening_balance/);
});

test('internal transfers move balances but are never counted as spending', () => {
  const accounts = [
    { id: 'a', name: 'Everyday', type: 'bank', openingBalance: 1000 },
    { id: 'b', name: 'Savings', type: 'savings', openingBalance: 100 },
  ];
  const transactions = [
    { id: 't1', type: 'transfer', accountId: 'a', toAccountId: 'b', amount: 200, date: '2026-08-10' },
    { id: 't2', type: 'expense', accountId: 'a', amount: 50, date: '2026-08-11' },
  ];

  assert.equal(spendingForMonth(transactions, '2026-08'), 50);
  const snapshot = buildAccountBalanceSnapshot(accounts, transactions);
  assert.deepEqual(snapshot.map(({ id, balance }) => ({ id, balance })), [
    { id: 'a', balance: 750 },
    { id: 'b', balance: 300 },
  ]);
});

test('credit cards loans and BNPL are liabilities while protected money is removed from spendable cash', () => {
  const summary = calculateBalanceSummary({
    accounts: [
      { id: 'bank', type: 'bank', openingBalance: 1000 },
      { id: 'save', type: 'savings', openingBalance: 500 },
      { id: 'card', type: 'credit', openingBalance: 600 },
      { id: 'loan', type: 'loan', openingBalance: 2000 },
      { id: 'bnpl', type: 'bnpl', openingBalance: 250 },
    ],
    transactions: [
      { type: 'transfer', accountId: 'bank', toAccountId: 'card', amount: 200, date: '2026-08-12' },
    ],
    bills: [{ amountReserved: 150 }],
    savingsGoals: [{ protected: true, currentAmount: 100 }, { protected: false, currentAmount: 999 }],
    emergencyCash: 200,
  });

  assert.equal(summary.assetBalance, 1300);
  assert.equal(summary.liquidBalance, 1300);
  assert.equal(summary.debtBalance, 2650);
  assert.equal(summary.protectedReserved, 450);
  assert.equal(summary.spendableBalance, 850);
  assert.deepEqual(summary.components, {
    emergencyReserved: 200,
    billReserved: 150,
    protectedSavings: 100,
  });
});

test('Phase 7 account snapshot validation supports all account types and valid negative asset balances', () => {
  const payload = normalizePhase7SyncPayload({
    syncMode: 'upsert_only',
    userId: USER_ID,
    baseRevision: 3,
    accounts: [
      { id: 'bank-local', name: 'Everyday', type: 'bank', openingBalance: 100, currentBalance: -25.5 },
      { id: 'credit-local', name: 'Card', type: 'credit', openingBalance: 500, currentBalance: 400 },
      { id: 'bnpl-local', name: 'BNPL', type: 'bnpl', openingBalance: 100, currentBalance: 100 },
    ],
    settings: { emergencyBufferAmount: 200, incomeCycle: 'fortnightly', budgetingMethod: 'smooth' },
    protection: { complete: true, billReserved: 80, protectedSavings: 20 },
  });
  assert.ok(payload);
  assert.equal(payload.accounts[0].currentBalance, -25.5);
  assert.equal(payload.accounts[0].openingBalance, 100);
  assert.equal(payload.accounts[2].type, 'bnpl');
  assert.equal(payload.baseRevision, 3);

  assert.equal(normalizePhase7SyncPayload({ syncMode: 'full_snapshot', accounts: [] }), null);
  assert.equal(normalizePhase7SyncPayload({ syncMode: 'upsert_only', userId: USER_ID, baseRevision: -1, accounts: [] }), null);
  assert.equal(normalizePhase7SyncPayload({ syncMode: 'upsert_only', userId: USER_ID, baseRevision: 0, accounts: [{ id: 'x'.repeat(201), name: 'X', type: 'bank', openingBalance: 0, currentBalance: 0 }], settings: {}, protection: { complete: true, billReserved: 0, protectedSavings: 0 } }), null);
  assert.equal(normalizePhase7SyncPayload({ syncMode: 'upsert_only', userId: USER_ID, baseRevision: 0, accounts: [{ id: 'x', name: 'X', type: 'bank', openingBalance: 1e20, currentBalance: 0 }], settings: {}, protection: { complete: true, billReserved: 0, protectedSavings: 0 } }), null);
  assert.equal(normalizePhase7SyncPayload({ syncMode: 'upsert_only', userId: USER_ID, baseRevision: 0, accounts: [{ id: 'x', name: 'X', type: 'invalid', openingBalance: 0, currentBalance: 0 }], settings: {}, protection: { complete: true, billReserved: 0, protectedSavings: 0 } }), null);
  assert.equal(normalizePhase7SyncPayload({ syncMode: 'upsert_only', userId: USER_ID, baseRevision: 0, accounts: [
    { id: 'same', name: 'One', type: 'bank', openingBalance: 0, currentBalance: 0 },
    { id: 'same', name: 'Two', type: 'cash', openingBalance: 0, currentBalance: 0 },
  ] }), null);
});

test('Neon account read is self-scoped and returns spendable versus protected summary', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: compact, params });
      if (compact.startsWith('SELECT id, phase7_client_id')) {
        return { rows: [
          { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', phase7_client_id: 'local-a', name: 'Everyday', account_type: 'bank', currency_code: 'AUD', opening_balance: '700.00', current_balance_snapshot: '900.00' },
          { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', phase7_client_id: 'local-b', name: 'Card', account_type: 'credit', currency_code: 'AUD', opening_balance: '400.00', current_balance_snapshot: '300.00' },
        ] };
      }
      if (compact.startsWith('SELECT income_cycle')) {
        return { rows: [{
          income_cycle: 'fortnightly', budgeting_method: 'smooth', emergency_buffer_amount: '200.00',
          phase7_sync_revision: '4', phase7_bill_reserved_snapshot: '100.00',
          phase7_protected_savings_snapshot: '50.00', phase7_protection_snapshot_complete: true,
        }] };
      }
      return { rows: [] };
    },
  };

  const state = await readPhase7AccountState(client, USER_ID);
  assert.equal(state.accounts.length, 2);
  assert.equal(state.summary.liquidBalance, 900);
  assert.equal(state.summary.debtBalance, 300);
  assert.equal(state.summary.protectedReserved, 350);
  assert.equal(state.summary.spendableBalance, 550);
  assert.equal(state.summary.spendableAvailable, true);
  assert.equal(state.accounts[0].openingBalance, 700);
  assert.equal(state.accounts[0].currentBalance, 900);
  assert.equal(state.revision, 4);
  assert.ok(calls.every((call) => call.params[0] === USER_ID));
  assert.match(calls[0].sql, /user_id = public\.current_app_user_id\(\)/);
  assert.equal(state.persistence, 'neon');
  assert.equal(state.migration, '015');
});

test('Phase 7 account API fails closed without an authenticated managed session', async () => {
  const response = await handlePhase7AccountRequest(new Request('https://budget.example.test/api/phase7/accounts'), {});
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: { code: 'authentication_required' } });
});

test('cloud sync is user-bound, non-destructive and conservative during recovery', () => {
  assert.match(balanceBridge, /function setupAllowsCloudSync\(\)/);
  assert.match(balanceBridge, /readSetup\(\)\.completed === true/);
  assert.match(balanceBridge, /Finish first-time setup before cloud account synchronisation begins\./);
  assert.match(balanceBridge, /function restoreCloudSettingsForEstablishedUser/);
  assert.match(balanceBridge, /emergencyCash: Math\.max\(0, Number\(settings\.emergencyBufferAmount\) \|\| 0\)/);
  assert.match(balanceBridge, /syncMode: 'upsert_only'/);
  assert.match(balanceBridge, /baseRevision: cloudState\.revision/);
  assert.match(balanceBridge, /cloudState\.userId !== activeUserId/);
  assert.match(balanceBridge, /Device financial state was separated safely/);
  assert.match(balanceBridge, /Nothing will upload without your confirmation/);
  assert.match(balanceBridge, /spendableBalance: protection\.complete \?/);
  assert.match(balanceBridge, /spendable money is withheld because protection data is incomplete/);
  assert.match(balanceBridge, /ARCHIVE_ACCOUNT/);
  assert.match(balanceBridge, /The full safe-to-spend forecast is a later chronological phase\./);
});

test('shared-device account switching separates the prior user state before any upload', async () => {
  const priorUser = '11111111-1111-4111-8111-111111111111';
  const nextUser = '22222222-2222-4222-8222-222222222222';
  const oldMoney = JSON.stringify({ version: 1, accounts: [{ id: 'old', name: 'Old', type: 'bank', openingBalance: 50 }], transactions: [], subscriptions: [], bills: [], savingsGoals: [] });
  const harness = await runBalanceBridgeHarness({
    initialStorage: {
      'every-cent-money-tracker-v1': oldMoney,
      'genevieve-phase7-account-cloud-map-v1': JSON.stringify({ version: 2, userId: priorUser, revision: 4, accounts: {} }),
    },
    cloudBody: { userId: nextUser, revision: 0, accounts: [], settings: {}, protection: { complete: false } },
  });
  assert.equal(harness.fetchCalls.filter((call) => call.url.endsWith('/sync')).length, 0);
  assert.equal(harness.localStorage.getItem('every-cent-money-tracker-v1'), null);
  assert.match(harness.localStorage.getItem(`genevieve-phase7-bound-device-state-v1:${priorUser}`), /Old/);
  assert.equal(JSON.parse(harness.localStorage.getItem('genevieve-phase7-account-cloud-map-v1')).userId, nextUser);
  assert.equal(harness.reloads(), 1);
});

test('unbound legacy device money requires explicit confirmation before authenticated upload', async () => {
  const userId = '22222222-2222-4222-8222-222222222222';
  const harness = await runBalanceBridgeHarness({
    initialStorage: {
      'every-cent-money-tracker-v1': JSON.stringify({
        version: 1,
        accounts: [{ id: 'local-a', name: 'Everyday', type: 'bank', openingBalance: 100 }],
        transactions: [], subscriptions: [], bills: [], savingsGoals: [],
      }),
    },
    cloudBody: { userId, revision: 0, accounts: [], settings: {}, protection: { complete: false } },
  });
  assert.equal(harness.fetchCalls.filter((call) => call.url.endsWith('/sync')).length, 0);
  assert.equal(harness.actions.hidden, false);
  await harness.clickAction();
  const sync = harness.fetchCalls.find((call) => call.url.endsWith('/sync'));
  assert.ok(sync);
  const payload = JSON.parse(sync.options.body);
  assert.equal(payload.userId, userId);
  assert.equal(payload.syncMode, 'upsert_only');
  assert.equal(payload.accounts[0].openingBalance, 100);
  assert.equal(JSON.parse(harness.localStorage.getItem('genevieve-phase7-account-cloud-map-v1')).userId, userId);
});

function validSync(overrides = {}) {
  return {
    syncMode: 'upsert_only',
    userId: USER_ID,
    baseRevision: 2,
    accounts: [{
      id: 'local-a',
      serverId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Everyday',
      type: 'bank',
      openingBalance: 100,
      currentBalance: 175,
    }],
    settings: { emergencyBufferAmount: 25, incomeCycle: 'fortnightly', budgetingMethod: 'smooth' },
    protection: { complete: true, billReserved: 40, protectedSavings: 10 },
    ...overrides,
  };
}

function persistenceClient({ protectionComplete = true } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: compact, params });
      if (compact.startsWith('SELECT phase7_sync_revision')) return { rows: [{ phase7_sync_revision: '2' }] };
      if (compact.startsWith('SELECT id, phase7_client_id') && compact.includes('id = ANY')) {
        return { rows: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', phase7_client_id: 'local-a' }] };
      }
      if (compact.startsWith('UPDATE public.accounts') && compact.includes('current_balance_snapshot')) {
        return { rows: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', opening_balance: '100.00' }] };
      }
      if (compact.startsWith('UPDATE public.accounts') && compact.includes('SET archived_at')) {
        return { rows: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }] };
      }
      if (compact.startsWith('SELECT id, phase7_client_id')) {
        return { rows: [{
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', phase7_client_id: 'local-a', name: 'Everyday',
          account_type: 'bank', currency_code: 'AUD', opening_balance: '100.00', current_balance_snapshot: '175.00',
        }] };
      }
      if (compact.startsWith('SELECT income_cycle')) {
        return { rows: [{
          income_cycle: 'fortnightly', budgeting_method: 'smooth', emergency_buffer_amount: '25.00',
          phase7_sync_revision: '3', phase7_bill_reserved_snapshot: '40.00',
          phase7_protected_savings_snapshot: '10.00', phase7_protection_snapshot_complete: protectionComplete,
        }] };
      }
      return { rows: [] };
    },
  };
}

test('opening balance is immutable during current-balance sync and omission never archives', async () => {
  const client = persistenceClient();
  const result = await syncPhase7AccountState(client, USER_ID, validSync());
  assert.equal(result.revision, 3);
  const accountUpdate = client.calls.find((call) => call.sql.startsWith('UPDATE public.accounts') && call.sql.includes('current_balance_snapshot'));
  assert.ok(accountUpdate);
  assert.doesNotMatch(accountUpdate.sql, /opening_balance\s*=/);
  assert.match(accountUpdate.sql, /current_balance_snapshot\s*=\s*\$5/);
  assert.equal(accountUpdate.params[4], 175);
  assert.equal(result.mappings[0].openingBalance, 100);
  assert.equal(client.calls.some((call) => /NOT \(id = ANY|archived_at = COALESCE/.test(call.sql)), false);
});

test('an older device omitting a newer cloud account performs no archive operation', async () => {
  const client = persistenceClient();
  const result = await syncPhase7AccountState(client, USER_ID, validSync({ accounts: [] }));
  assert.equal(result.revision, 3);
  assert.equal(client.calls.some((call) => /archived_at\s*=/.test(call.sql)), false);
  assert.equal(client.calls.some((call) => call.sql.startsWith('UPDATE public.accounts')), false);
});

test('stale revision and wrong authenticated-user binding fail before account writes', async () => {
  const stale = persistenceClient();
  const staleResult = await syncPhase7AccountState(stale, USER_ID, validSync({ baseRevision: 1 }));
  assert.equal(staleResult.syncConflict, true);
  assert.equal(stale.calls.some((call) => call.sql.startsWith('UPDATE public.accounts')), false);

  const wrongUser = persistenceClient();
  const wrongResult = await syncPhase7AccountState(wrongUser, USER_ID, validSync({ userId: '22222222-2222-4222-8222-222222222222' }));
  assert.equal(wrongResult.code, 'phase7_user_binding_mismatch');
  assert.equal(wrongUser.calls.length, 0);
});

test('remote account removal requires explicit owned soft archive and revision', async () => {
  const payload = { confirm: 'ARCHIVE_ACCOUNT', userId: USER_ID, baseRevision: 2 };
  assert.deepEqual(normalizePhase7ArchivePayload(payload), { userId: USER_ID, baseRevision: 2 });
  assert.equal(normalizePhase7ArchivePayload({ ...payload, confirm: 'DELETE' }), null);
  const client = persistenceClient();
  const result = await archivePhase7Account(client, USER_ID, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', payload);
  assert.equal(result.archivedAccountId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const archive = client.calls.find((call) => call.sql.startsWith('UPDATE public.accounts') && call.sql.includes('SET archived_at'));
  assert.ok(archive);
  assert.match(archive.sql, /user_id = public\.current_app_user_id\(\)/);
  assert.doesNotMatch(archive.sql, /DELETE FROM/);
  assert.deepEqual(archive.params, [USER_ID, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
});

test('incomplete recovery protection withholds spendable balance', async () => {
  const client = persistenceClient({ protectionComplete: false });
  const state = await readPhase7AccountState(client, USER_ID);
  assert.equal(state.protection.complete, false);
  assert.equal(state.summary.spendableAvailable, false);
  assert.equal(state.summary.spendableBalance, null);
});
