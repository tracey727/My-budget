import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./accessibility-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Simple mode preference is stored under its own independent key and toggles a body class', () => {
  assert.match(runtime, /const STORAGE_KEY = 'genevieve-accessibility-v1'/);
  assert.match(runtime, /function readPreference/);
  assert.match(runtime, /function writePreference/);
  assert.match(runtime, /document\.body\.classList\.toggle\('simple-mode', simpleMode\)/);
});

test('Trusted-support access is noted as already enforced server-side, not duplicated here', () => {
  assert.match(runtime, /already enforced server-side/);
  assert.match(runtime, /src\/worker\.mjs/);
});

test('Simple mode hides secondary detail panels and increases text size', () => {
  assert.match(index, /id="forecastPanel" data-simple-hide="true"/);
  assert.match(index, /id="safeToSpendDetail" class="muted small-copy" data-simple-hide="true"/);
  assert.match(styles, /body\.simple-mode \[data-simple-hide\] \{ display: none !important; \}/);
  assert.match(styles, /body\.simple-mode \{ font-size: 1\.15em; \}/);
});

test('Dashboard exposes a simple-mode toggle button wired to the bridge', () => {
  assert.match(index, /id="simpleModeToggle"/);
  assert.match(index, /<script src="\/household-continuity-bridge\.js" defer><\/script>\s*<script src="\/accessibility-bridge\.js" defer><\/script>/);
});

test('Accessibility bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"accessibility-bridge\.js"/);
  assert.match(serviceWorker, /\/accessibility-bridge\.js/);
  assert.match(verifyDist, /"accessibility-bridge\.js"/);
  assert.match(verifyDist, /householdContinuityRuntime < accessibilityRuntime/);
});
