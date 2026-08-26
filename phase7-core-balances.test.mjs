import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccountBalanceSnapshot,
  calculateBalanceSummary,
  spendingForMonth,
} from './phase7-core-balances.mjs';
import {
  normalizePhase7SyncPayload,
  readPhase7AccountState,
  handlePhase7AccountRequest,
} from './src/phase7-account-routes.mjs';

const USER_ID = '11111111-1111-4111-8111-111111111111';

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
    fullSnapshot: true,
    accounts: [
      { id: 'bank-local', name: 'Everyday', type: 'bank', balance: -25.5 },
      { id: 'credit-local', name: 'Card', type: 'credit', balance: 400 },
      { id: 'bnpl-local', name: 'BNPL', type: 'bnpl', balance: 100 },
    ],
    settings: { emergencyBufferAmount: 200, incomeCycle: 'fortnightly', budgetingMethod: 'smooth' },
  });
  assert.ok(payload);
  assert.equal(payload.accounts[0].balance, -25.5);
  assert.equal(payload.accounts[2].type, 'bnpl');

  assert.equal(normalizePhase7SyncPayload({ fullSnapshot: false, accounts: [] }), null);
  assert.equal(normalizePhase7SyncPayload({ fullSnapshot: true, accounts: [{ id: 'x', name: 'X', type: 'invalid', balance: 0 }] }), null);
  assert.equal(normalizePhase7SyncPayload({ fullSnapshot: true, accounts: [
    { id: 'same', name: 'One', type: 'bank', balance: 0 },
    { id: 'same', name: 'Two', type: 'cash', balance: 0 },
  ] }), null);
});

test('Neon account read is self-scoped and returns spendable versus protected summary', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const compact = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ sql: compact, params });
      if (compact.startsWith('SELECT id, name, account_type')) {
        return { rows: [
          { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Everyday', account_type: 'bank', currency_code: 'AUD', opening_balance: '900.00' },
          { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Card', account_type: 'credit', currency_code: 'AUD', opening_balance: '300.00' },
        ] };
      }
      if (compact.startsWith('SELECT income_cycle')) {
        return { rows: [{ income_cycle: 'fortnightly', budgeting_method: 'smooth', emergency_buffer_amount: '200.00' }] };
      }
      return { rows: [{ emergency_buffer_amount: '200.00', bill_reserved: '100.00', protected_savings: '50.00' }] };
    },
  };

  const state = await readPhase7AccountState(client, USER_ID);
  assert.equal(state.accounts.length, 2);
  assert.equal(state.summary.liquidBalance, 900);
  assert.equal(state.summary.debtBalance, 300);
  assert.equal(state.summary.protectedReserved, 350);
  assert.equal(state.summary.spendableBalance, 550);
  assert.ok(calls.every((call) => call.params[0] === USER_ID));
  assert.match(calls[0].sql, /user_id = public\.current_app_user_id\(\)/);
  assert.equal(state.persistence, 'neon');
  assert.equal(state.migration, '014');
});

test('Phase 7 account API fails closed without an authenticated managed session', async () => {
  const response = await handlePhase7AccountRequest(new Request('https://budget.example.test/api/phase7/accounts'), {});
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: { code: 'authentication_required' } });
});
