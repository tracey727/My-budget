import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./review-followup-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('30-day review bridge schedules Unsure transactions without touching protected app.js', () => {
  assert.match(runtime, /const REVIEW_WINDOW_DAYS = 30/);
  assert.match(runtime, /t\.worth === 'unsure'/);
  assert.match(runtime, /function unsureTransactionsWithAge/);
  assert.match(runtime, /age >= REVIEW_WINDOW_DAYS/);
  assert.match(runtime, /this file stays a read-mostly bridge/i);
});

test('Review decisions only ever set worth to worth or waste, never invent new categories', () => {
  assert.match(runtime, /writeTransactionWorth\(btn\.dataset\.reviewKeep, 'worth'\)/);
  assert.match(runtime, /writeTransactionWorth\(btn\.dataset\.reviewWaste, 'waste'\)/);
});

test('Review view exposes a due list and a pending/watching list wired to the bridge', () => {
  assert.match(index, /id="thirtyDayReviewDueList"/);
  assert.match(index, /id="thirtyDayReviewPendingList"/);
  assert.match(index, /READY FOR A SECOND LOOK/);
  assert.match(index, /STILL THINKING IT OVER/);
  assert.match(index, /<script src="\/dashboard-health-bridge\.js" defer><\/script>\s*<script src="\/review-followup-bridge\.js" defer><\/script>/);
});

test('30-day review bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"review-followup-bridge\.js"/);
  assert.match(serviceWorker, /\/review-followup-bridge\.js/);
  assert.match(verifyDist, /"review-followup-bridge\.js"/);
  assert.match(verifyDist, /healthBridgeRuntime < reviewFollowupRuntime/);
});
