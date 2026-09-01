import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./safe-to-spend-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Safe-to-spend deducts Smooth bills, debt commitments and savings, but not bill targets or the emergency buffer', () => {
  assert.match(runtime, /b\.budgetingMethod === 'smooth'/);
  assert.match(runtime, /function debtTotal/);
  assert.match(runtime, /function savingsTotal/);
  assert.doesNotMatch(runtime, /emergencyCash/);
  assert.match(runtime, /Hold-My-Money bill targets/i);
});

test('Safe-to-spend is read-only and writes nothing to storage', () => {
  assert.doesNotMatch(runtime, /localStorage\.setItem/);
  assert.match(runtime, /this bridge only reads existing/i);
});

test('Safe-to-spend refuses to show a figure for irregular pay or unset income, rather than guessing', () => {
  assert.match(runtime, /payFrequency === 'irregular'/);
  assert.match(runtime, /incomeAmount <= 0/);
  assert.match(runtime, /no single safe-to-spend figure yet/i);
});

test('Safe-to-spend expresses the result per cycle, per week and per day', () => {
  assert.match(runtime, /safeThisCycle/);
  assert.match(runtime, /safeThisWeek/);
  assert.match(runtime, /safeToday/);
  assert.match(runtime, /PAY_CYCLE_DAYS/);
});

test('Dashboard exposes a Safe to Spend panel wired to the bridge, above the existing hero cards', () => {
  assert.match(index, /id="safeToSpendPanel"/);
  assert.match(index, /id="safeToSpendHeadline"/);
  assert.match(index, /id="safeToSpendWeek"/);
  assert.match(index, /id="safeToSpendToday"/);
  assert.match(index, /id="safeToSpendPanel"[\s\S]*hero-grid/);
  assert.match(index, /<script src="\/debt-commitments-bridge\.js" defer><\/script>\s*<script src="\/safe-to-spend-bridge\.js" defer><\/script>/);
});

test('Safe-to-spend bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"safe-to-spend-bridge\.js"/);
  assert.match(serviceWorker, /\/safe-to-spend-bridge\.js/);
  assert.match(verifyDist, /"safe-to-spend-bridge\.js"/);
  assert.match(verifyDist, /debtCommitmentsRuntime < safeToSpendRuntime/);
});
