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
  assert.match(index, /id="debtCommitmentSave"/);
  assert.match(index, /id="debtCommitmentTotal"/);
  assert.match(index, /id="debtCommitmentList"/);
  assert.match(index, /<script src="\/income-plan-bridge\.js" defer><\/script>\s*<script src="\/debt-commitments-bridge\.js" defer><\/script>/);
});

test('Debt commitments bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"debt-commitments-bridge\.js"/);
  assert.match(serviceWorker, /\/debt-commitments-bridge\.js/);
  assert.match(verifyDist, /"debt-commitments-bridge\.js"/);
  assert.match(verifyDist, /incomePlanRuntime < debtCommitmentsRuntime/);
});
