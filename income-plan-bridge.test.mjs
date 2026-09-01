import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./income-plan-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Income plan bridge stores expected income on the existing setup key without touching protected app.js', () => {
  assert.match(runtime, /const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1'/);
  assert.match(runtime, /function writeIncomeAmount/);
  assert.match(runtime, /incomeAmount: amount/);
  assert.match(runtime, /required input for the Safe-to-Spend engine/i);
});

test('Income plan bridge shows the next pay date and amount together', () => {
  assert.match(runtime, /function formatDate/);
  assert.match(runtime, /incomeNextPay/);
  assert.match(runtime, /PAY_FREQUENCY_LABELS/);
});

test('Dashboard exposes an income amount input wired to the bridge', () => {
  assert.match(index, /id="incomeAmount"/);
  assert.match(index, /id="incomeAmountSave"/);
  assert.match(index, /id="incomeFrequencyLabel"/);
  assert.match(index, /id="incomeNextPay"/);
  assert.match(index, /<script src="\/review-followup-bridge\.js" defer><\/script>\s*<script src="\/income-plan-bridge\.js" defer><\/script>/);
});

test('Income plan bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"income-plan-bridge\.js"/);
  assert.match(serviceWorker, /\/income-plan-bridge\.js/);
  assert.match(verifyDist, /"income-plan-bridge\.js"/);
  assert.match(verifyDist, /reviewFollowupRuntime < incomePlanRuntime/);
});
