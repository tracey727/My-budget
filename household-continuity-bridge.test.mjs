import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./household-continuity-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Fee/interest detection matches common wording and is worded as a possibility, not a confirmed classification', () => {
  assert.match(runtime, /FEE_KEYWORDS = \[.*'fee'.*'interest'.*'overdraft'/);
  assert.match(runtime, /function looksLikeFeeOrInterest/);
  assert.match(runtime, /function feesThisYear/);
  assert.match(index, /Based on the wording of your transactions -- not a confirmed classification/);
});

test('Fee monitor totals only the current calendar year and only expenses', () => {
  assert.match(runtime, /t\.type === 'expense'.*t\.date\.slice\(0, 4\) === thisYear/s);
});

test('Account-change checklist gathers bills, subscriptions, debt commitments and recurring transactions linked to an account', () => {
  assert.match(runtime, /function linkedItemsForAccount/);
  assert.match(runtime, /bills: state\.bills\.filter\(b => b && b\.accountId === accountId\)/);
  assert.match(runtime, /subscriptions: state\.subscriptions\.filter\(s => s && s\.accountId === accountId\)/);
  assert.match(runtime, /debtCommitments: state\.debtCommitments\.filter\(c => c && c\.accountId === accountId\)/);
  assert.match(runtime, /t\.recurringStatus !== 'recurring'/);
});

test('Household continuity bridge is read-only', () => {
  assert.doesNotMatch(runtime, /localStorage\.setItem/);
});

test('Accounts view exposes fee-monitor and account-change checklist panels wired to the bridge', () => {
  assert.match(index, /id="feeMonitorTotal"/);
  assert.match(index, /id="feeMonitorList"/);
  assert.match(index, /id="continuityAccount"/);
  assert.match(index, /id="continuityChecklist"/);
  assert.match(index, /<script src="\/forecast-bridge\.js" defer><\/script>\s*<script src="\/household-continuity-bridge\.js" defer><\/script>/);
});

test('Household continuity bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"household-continuity-bridge\.js"/);
  assert.match(serviceWorker, /\/household-continuity-bridge\.js/);
  assert.match(verifyDist, /"household-continuity-bridge\.js"/);
  assert.match(verifyDist, /forecastRuntime < householdContinuityRuntime/);
});
