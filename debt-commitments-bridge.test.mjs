import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./debt-commitments-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Debt commitments bridge protects its own field the same way bills and savingsGoals are protected', () => {
  assert.match(runtime, /const LIABILITY_TYPES = new Set\(\['credit', 'loan', 'bnpl'\]\)/);
  assert.match(runtime, /if \(!Array\.isArray\(next\.debtCommitments\)\)/);
  assert.match(runtime, /next\.debtCommitments = previous\.debtCommitments/);
  assert.match(runtime, /following the exact same pattern already\s*\/\/ used to protect `bills`/);
});

test('Debt commitments only ever attach to liability accounts and convert frequencies via annual cost', () => {
  assert.match(runtime, /function liabilityAccounts/);
  assert.match(runtime, /function amountPerFrequency/);
  assert.match(runtime, /REPAYMENT_FREQUENCIES = new Set\(\['weekly', 'fortnightly', 'monthly'\]\)/);
});

test('Accounts view exposes a debt-repayment form and list wired to the bridge', () => {
  assert.match(index, /id="debtCommitmentAccount"/);
  assert.match(index, /id="debtCommitmentAmount"/);
  assert.match(index, /id="debtCommitmentFrequency"/);
  assert.match(index, /id="debtCommitmentDueDate"/);
  assert.match(index, /id="debtCommitmentInterestRate"/);
  assert.match(index, /id="debtCommitmentSave"/);
  assert.match(index, /id="debtCommitmentTotal"/);
  assert.match(index, /id="debtCommitmentList"/);
  assert.match(index, /<script src="\/income-plan-bridge\.js" defer><\/script>\s*<script src="\/debt-commitments-bridge\.js" defer><\/script>/);
});

test('Debt commitments record an interest rate and normalize it safely', () => {
  assert.match(runtime, /interestRate: parseAmount\(commitment\.interestRate \?\? 0\)/);
  assert.match(runtime, /const interestRate = parseAmount\(document\.getElementById\('debtCommitmentInterestRate'\)\?\.value\)/);
});

test('Payoff projection amortizes month by month and detects a payment too low to ever clear the balance', () => {
  assert.match(runtime, /function amortize/);
  assert.match(runtime, /const monthlyRate = \(Number\(annualRatePercent\) \|\| 0\) \/ 100 \/ 12/);
  assert.match(runtime, /if \(monthlyPayment <= 0\) return \{ months: null, totalInterest: null, payoffPossible: false \}/);
  assert.match(runtime, /MAX_AMORTIZATION_MONTHS/);
  assert.match(runtime, /never clear/);
});

test('Payoff projection replicates account balance from opening balance and transactions, mirroring app.js', () => {
  assert.match(runtime, /function accountBalance/);
  assert.match(runtime, /if \(t\?\.type === 'income' && t\.accountId === account\.id\) balance -= amount/);
  assert.match(runtime, /if \(t\?\.type === 'expense' && t\.accountId === account\.id\) balance \+= amount/);
});

test('A "pay more" scenario is projected, not presented as money already saved', () => {
  assert.match(runtime, /EXTRA_MONTHLY_PAYMENT_SCENARIO/);
  assert.match(runtime, /a possibility, not money already saved/);
});

test('Debt commitments bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"debt-commitments-bridge\.js"/);
  assert.match(serviceWorker, /\/debt-commitments-bridge\.js/);
  assert.match(verifyDist, /"debt-commitments-bridge\.js"/);
  assert.match(verifyDist, /incomePlanRuntime < debtCommitmentsRuntime/);
});
