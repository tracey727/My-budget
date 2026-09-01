import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./forecast-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Forecast derives a monthly budget the same way Safe-to-Spend derives a per-cycle figure', () => {
  assert.match(runtime, /function monthlyBudget/);
  assert.match(runtime, /amountPerFrequency\(incomeAmount, payFrequency, 'monthly'\)/);
  assert.match(runtime, /b\.budgetingMethod === 'smooth'/);
  assert.match(runtime, /function debtTotal/);
  assert.match(runtime, /function savingsTotal/);
  assert.match(runtime, /payFrequency === 'irregular'/);
});

test('Forecast projects end-of-month spending from month-to-date spending', () => {
  assert.match(runtime, /function monthToDateTotals/);
  assert.match(runtime, /const projected = dayOfMonth > 0 \? \(spent \/ dayOfMonth\) \* daysInMonth : spent/);
  assert.match(runtime, /const shortfall = Math\.round\(\(projected - budget\) \* 100\) \/ 100/);
});

test('Forecast is read-only and writes nothing to storage', () => {
  assert.doesNotMatch(runtime, /localStorage\.setItem/);
});

test('A predicted shortfall surfaces concrete recovery actions, including waste and unsure totals', () => {
  assert.match(runtime, /if \(shortfall > 0\)/);
  assert.match(runtime, /RECOVERY ACTIONS/);
  assert.match(runtime, /t\.worth === 'waste'/);
  assert.match(runtime, /t\.worth === 'unsure'/);
  assert.match(runtime, /dailyPace/);
});

test('Dashboard exposes a Forecast panel wired to the bridge, after Safe-to-Spend', () => {
  assert.match(index, /id="forecastPanel"/);
  assert.match(index, /id="forecastHeadline"/);
  assert.match(index, /id="forecastBudget"/);
  assert.match(index, /id="forecastActual"/);
  assert.match(index, /id="forecastProjected"/);
  assert.match(index, /id="safeToSpendPanel"[\s\S]*id="forecastPanel"/);
  assert.match(index, /<script src="\/safe-to-spend-bridge\.js" defer><\/script>\s*<script src="\/forecast-bridge\.js" defer><\/script>/);
});

test('Forecast bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"forecast-bridge\.js"/);
  assert.match(serviceWorker, /\/forecast-bridge\.js/);
  assert.match(verifyDist, /"forecast-bridge\.js"/);
  assert.match(verifyDist, /safeToSpendRuntime < forecastRuntime/);
});
