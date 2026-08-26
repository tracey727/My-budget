import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PAY_FREQUENCIES,
  annualBillCost,
  smoothContribution,
  deriveBillPlan,
  hasMeaningfulFinancialData,
  buildFirstMoneyPlan,
} from './phase7-first-time-setup-model.mjs';

const runtime = await readFile(new URL('./phase7-first-time-setup.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('Phase 7 pay-frequency contract is exact', () => {
  assert.deepEqual(PAY_FREQUENCIES, ['weekly', 'fortnightly', 'monthly', 'irregular']);
});

test('Smooth my bills annualises each bill and divides it by the pay cycle', () => {
  assert.equal(annualBillCost(120, 'monthly'), 1440);
  assert.equal(smoothContribution(120, 'monthly', 'weekly'), 27.69);
  assert.equal(smoothContribution(120, 'monthly', 'fortnightly'), 55.38);
  assert.equal(smoothContribution(120, 'monthly', 'monthly'), 120);
});

test('Irregular pay never fabricates a fixed per-pay contribution', () => {
  assert.equal(smoothContribution(1200, 'yearly', 'irregular'), null);
  const bill = deriveBillPlan({ amount: 1200, frequency: 'yearly' }, 'smooth', 'irregular');
  assert.equal(bill.requiredContribution, 0);
  assert.equal(bill.targetAmount, 1200);
});

test('I will keep the money retains a full bill target with no automatic fixed transfer', () => {
  const bill = deriveBillPlan({ amount: 300, frequency: 'quarterly' }, 'target', 'fortnightly');
  assert.equal(bill.budgetingMethod, 'target');
  assert.equal(bill.targetAmount, 300);
  assert.equal(bill.requiredContribution, 0);
});

test('First money plan sums smooth contributions without treating emergency cash as spendable', () => {
  const plan = buildFirstMoneyPlan({
    payFrequency: 'fortnightly',
    nextPayDate: '2026-09-03',
    billMode: 'smooth',
    emergencyCash: 500,
    accounts: [{ id: 'a1' }],
    bills: [
      { amount: 120, frequency: 'monthly' },
      { amount: 520, frequency: 'yearly' },
    ],
    savingsGoals: [{ goal: 'Holiday', target: 1000 }],
  });
  assert.equal(plan.regularPerPayBills, 75.38);
  assert.equal(plan.emergencyCash, 500);
  assert.equal(plan.bills.length, 2);
  assert.equal(plan.savingsGoals.length, 1);
});

test('Existing real financial data is recognised so established users are not forced through onboarding', () => {
  assert.equal(hasMeaningfulFinancialData({ accounts: [], transactions: [], subscriptions: [], bills: [], savingsGoals: [] }), false);
  assert.equal(hasMeaningfulFinancialData({ accounts: [{ id: 'a1' }] }), true);
  assert.equal(hasMeaningfulFinancialData({ bills: [{ id: 'b1' }] }), true);
  assert.equal(hasMeaningfulFinancialData({ savingsGoals: [{ id: 'g1' }] }), true);
});

test('Runtime contains all eight chronological screens and the exact requested choices', () => {
  for (const fragment of [
    'How often do you get paid?',
    'When do you get paid next?',
    'Add your accounts',
    'What bills do you have?',
    'How would you like GENEVIEVE to manage your bills?',
    'Option 1 · Smooth my bills',
    'GENEVIEVE calculates the amount required from each pay.',
    'Option 2 · I’ll keep the money',
    'GENEVIEVE tracks the bill target and warns you if you are falling behind.',
    'Set protected emergency cash.',
    'Set optional savings goals.',
    'YOUR FIRST MONEY PLAN',
  ]) assert.match(runtime, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const screenDefinitions = [...runtime.matchAll(/function screen([1-8])\(/g)].map(match => Number(match[1]));
  assert.deepEqual(screenDefinitions, [1,2,3,4,5,6,7,8]);
});

test('Runtime uses the existing Phase 2 money store but keeps setup metadata separate', () => {
  assert.match(runtime, /every-cent-money-tracker-v1/);
  assert.match(runtime, /genevieve-first-time-setup-v1/);
  assert.match(runtime, /directWriteMoneyState/);
  assert.match(runtime, /accounts,/);
  assert.match(runtime, /bills,/);
  assert.match(runtime, /savingsGoals,/);
});

test('Target mode has live Green Yellow Red Recovery warning refresh logic', () => {
  assert.match(runtime, /function targetAlertStatus/);
  assert.match(runtime, /return 'recovery'/);
  assert.match(runtime, /return 'red'/);
  assert.match(runtime, /return 'yellow'/);
  assert.match(runtime, /return 'green'/);
  assert.match(runtime, /refreshCompletedBillPlans/);
});

test('Source index links Phase 7 after both Phase 2 extensions and before protected app.js', () => {
  const data = index.indexOf('/phase2-data-runtime.js');
  const extended = index.indexOf('/phase2-subscriptions-savings-runtime.js');
  const phase7 = index.indexOf('/phase7-first-time-setup.js');
  const app = index.indexOf('/app.js');
  assert.ok(data >= 0);
  assert.ok(extended > data);
  assert.ok(phase7 > extended);
  assert.ok(app > phase7);
});
