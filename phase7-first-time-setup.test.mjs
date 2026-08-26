import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PAY_FREQUENCIES,
  annualBillCost,
  paysAvailableByDueDate,
  smoothContribution,
  deriveBillPlan,
  hasMeaningfulFinancialData,
  buildFirstMoneyPlan,
} from './phase7-first-time-setup-model.mjs';

const runtime = await readFile(new URL('./phase7-first-time-setup.js', import.meta.url), 'utf8');
const planBridge = await readFile(new URL('./phase7-plan-integrity-bridge.js', import.meta.url), 'utf8');
const backupBridge = await readFile(new URL('./phase7-backup-bridge.js', import.meta.url), 'utf8');
const balanceBridge = await readFile(new URL('./phase7-core-balances-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const linker = await readFile(new URL('./scripts/link-phase7-first-time-setup.mjs', import.meta.url), 'utf8');

test('Phase 7 pay-frequency contract is exact', () => {
  assert.deepEqual(PAY_FREQUENCIES, ['weekly', 'fortnightly', 'monthly', 'irregular']);
});

test('Smooth my bills annualises each bill when no due date is known', () => {
  assert.equal(annualBillCost(120, 'monthly'), 1440);
  assert.equal(smoothContribution(120, 'monthly', 'weekly'), 27.69);
  assert.equal(smoothContribution(120, 'monthly', 'fortnightly'), 55.38);
  assert.equal(smoothContribution(120, 'monthly', 'monthly'), 120);
});

test('Smooth my bills uses the pays actually available before the first due date', () => {
  assert.equal(paysAvailableByDueDate('2026-09-03', '2026-11-25', 'fortnightly'), 6);
  assert.equal(smoothContribution(1200, 'yearly', 'fortnightly', '2026-11-25', '2026-09-03'), 200);
  assert.equal(smoothContribution(1200, 'yearly', 'fortnightly', '2026-09-01', '2026-09-03'), 1200);
  assert.equal(smoothContribution(1200, 'yearly', 'fortnightly', '2026-11-25', '2026-09-03', 300), 150);
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

test('First money plan is due-date aware when dated bills are supplied', () => {
  const plan = buildFirstMoneyPlan({
    payFrequency: 'fortnightly',
    nextPayDate: '2026-09-03',
    billMode: 'smooth',
    emergencyCash: 0,
    accounts: [{ id: 'a1' }],
    bills: [{ amount: 1200, frequency: 'yearly', nextDueDate: '2026-11-25' }],
    savingsGoals: [],
  });
  assert.equal(plan.regularPerPayBills, 200);
  assert.equal(plan.bills[0].requiredContribution, 200);
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
  ]) assert.ok(runtime.includes(fragment), `missing Phase 7 wording: ${fragment}`);

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
  assert.match(runtime, /\? 'red' : 'yellow'/);
  assert.match(runtime, /return 'green'/);
  assert.match(runtime, /refreshCompletedBillPlans/);
});

test('Plan-integrity bridge corrects due-date funding, stale pay dates and first-plan presentation', () => {
  assert.match(planBridge, /function paysAvailableByDueDate/);
  assert.match(planBridge, /function rollNextPayDate/);
  assert.match(planBridge, /function smoothContribution/);
  assert.match(planBridge, /function refreshCommittedPlan/);
  assert.match(planBridge, /function correctFirstPlanPresentation/);
  assert.match(planBridge, /adjusted to have each dated bill ready by its next due date/);
  assert.match(planBridge, /Choose today or a future date for your next pay/);
  assert.match(planBridge, /setTimeout\(refreshCommittedPlan, 0\)/);
});

test('Backup and restore preserve Phase 7 setup settings and remain compatible with legacy backups', () => {
  assert.match(backupBridge, /const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1'/);
  assert.match(backupBridge, /const phase7Setup = readSetupState\(\)/);
  assert.match(backupBridge, /phase7Setup,/);
  assert.match(backupBridge, /Object\.prototype\.hasOwnProperty\.call\(parsed, 'phase7Setup'\)/);
  assert.match(backupBridge, /sanitizeSetupState\(parsed\.phase7Setup\)/);
  assert.match(backupBridge, /localStorage\.setItem\(SETUP_STORAGE_KEY/);
  assert.match(backupBridge, /localStorage\.removeItem\(SETUP_STORAGE_KEY\)/);
  assert.match(backupBridge, /Legacy backups pre-date Phase 7/);
});

test('Core-balance bridge keeps transfers as money movement and uses authenticated same-origin persistence', () => {
  assert.match(balanceBridge, /Internal transfers move money between your own accounts and are not counted as spending\./);
  assert.match(balanceBridge, /\/api\/phase7\/accounts/);
  assert.match(balanceBridge, /\/api\/phase7\/accounts\/sync/);
  assert.match(balanceBridge, /credentials: 'same-origin'/);
  assert.match(balanceBridge, /Protected \/ reserved/);
});

test('Production linker preserves source lineage and inserts all reconciled Phase 7 runtimes before app.js', () => {
  const data = index.indexOf('/phase2-data-runtime.js');
  const extended = index.indexOf('/phase2-subscriptions-savings-runtime.js');
  const app = index.indexOf('/app.js');
  assert.ok(data >= 0 && extended > data && app > extended);
  assert.match(linker, /phase7-first-time-setup\.js/);
  assert.match(linker, /phase7-plan-integrity-bridge\.js/);
  assert.match(linker, /phase7-backup-bridge\.js/);
  assert.match(linker, /phase7-core-balances-bridge\.js/);
  assert.match(linker, /protectedAppPattern/);
  assert.match(linker, /linked Phase 7 setup, plan-integrity, backup and core-balance runtimes after Phase 2 and immediately before protected app\.js/);
});
