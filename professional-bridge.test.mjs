import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('./professional-bridge.js', import.meta.url), 'utf8');
const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
const copyScript = await readFile(new URL('./scripts/copy-subscriber-assets.mjs', import.meta.url), 'utf8');
const verifyDist = await readFile(new URL('./scripts/verify-dist.mjs', import.meta.url), 'utf8');

test('Professional state lives under its own independent storage key, unrelated to the personal money tracker', () => {
  assert.match(runtime, /const STORAGE_KEY = 'every-cent-professional-v1'/);
  assert.doesNotMatch(runtime, /every-cent-money-tracker-v1/);
});

test('Professional entity hierarchy covers every structure named in the roadmap: businesses, divisions, projects, workstreams, cost centres, funding pools and accounts', () => {
  for (const field of ['businesses', 'divisions', 'projects', 'workstreams', 'costCentres', 'fundingPools', 'accounts', 'transactions']) {
    assert.match(runtime, new RegExp(`${field}: Array\\.isArray\\(parsed\\.${field}\\)`));
  }
});

test('Transactions allocate across the hierarchy: an account plus an optional project and cost centre', () => {
  assert.match(runtime, /accountId, projectId, costCentreId, description/);
  assert.match(runtime, /function projectAllocatedTotal/);
  assert.match(runtime, /function costCentreAllocatedTotal/);
});

test('app.js did not need to change: navigate() is generic over data-view, so the new Professional tab works without touching the hash-protected file', async () => {
  assert.match(app, /function navigate\(view\)/);
  assert.doesNotMatch(app, /professional/i);
});

test('index.html exposes a Professional nav tab and view wired to the bridge, and does not reuse personal-view element ids', () => {
  assert.match(index, /data-view="professional">Professional<\/button>/);
  assert.match(index, /id="professionalView" data-view="professional"/);
  assert.match(index, /id="proBusinessList"/);
  assert.match(index, /id="proProjectList"/);
  assert.match(index, /id="proTransactionList"/);
  assert.match(index, /<script src="\/accessibility-bridge\.js" defer><\/script>\s*<script src="\/professional-bridge\.js" defer><\/script>/);
});

test('Professional bridge is linked into the build, service worker cache and dist verification', () => {
  assert.match(copyScript, /"professional-bridge\.js"/);
  assert.match(serviceWorker, /\/professional-bridge\.js/);
  assert.match(verifyDist, /"professional-bridge\.js"/);
  assert.match(verifyDist, /accessibilityRuntime < professionalRuntime/);
});
