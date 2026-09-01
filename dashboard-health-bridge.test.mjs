import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./dashboard-health-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Dashboard health bridge rolls up the four alert states without touching protected app.js', () => {
  assert.match(runtime, /function overallHealthStatus/);
  assert.match(runtime, /ALERT_PRIORITY = \{ green: 0, yellow: 1, red: 2, recovery: 3 \}/);
  assert.match(runtime, /bill\.paidStatus !== 'paid'/);
  assert.match(runtime, /function annualWasteProjection/);
  assert.match(runtime, /this file deliberately does not modify the protected app\.js runtime/i);
});

test('Dashboard exposes an overall-status card wired to the health bridge', () => {
  assert.match(index, /id="healthStatusValue"/);
  assert.match(index, /id="healthStatusHint"/);
  assert.match(index, /<script src="\/app\.js" defer><\/script>\s*<script src="\/dashboard-health-bridge\.js" defer><\/script>/);
});

test('Dashboard health bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"dashboard-health-bridge\.js"/);
  assert.match(serviceWorker, /\/dashboard-health-bridge\.js/);
  assert.match(verifyDist, /"dashboard-health-bridge\.js"/);
  assert.match(verifyDist, /dashboard-health-bridge\.js no longer|appRuntime < healthBridgeRuntime/);
});
