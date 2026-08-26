import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const setupRuntimeName = 'phase7-first-time-setup.js';
const backupRuntimeName = 'phase7-backup-bridge.js';

await Promise.all([
  access(resolve(dist, setupRuntimeName), constants.R_OK),
  access(resolve(dist, backupRuntimeName), constants.R_OK),
]);

const [index, setupRuntime, backupRuntime, worker, sourceApp] = await Promise.all([
  readFile(resolve(dist, 'index.html'), 'utf8'),
  readFile(resolve(dist, setupRuntimeName), 'utf8'),
  readFile(resolve(dist, backupRuntimeName), 'utf8'),
  readFile(resolve(dist, 'service-worker.js'), 'utf8'),
  readFile(resolve(root, 'app.js'), 'utf8'),
]);

const dataRuntime = index.indexOf('/phase2-data-runtime.js');
const extendedRuntime = index.indexOf('/phase2-subscriptions-savings-runtime.js');
const phase7Setup = index.indexOf('/phase7-first-time-setup.js');
const phase7Backup = index.indexOf('/phase7-backup-bridge.js');
const protectedApp = index.indexOf('/app.js');
if (!(dataRuntime >= 0 && dataRuntime < extendedRuntime && extendedRuntime < phase7Setup && phase7Setup < phase7Backup && phase7Backup < protectedApp)) {
  throw new Error('Production runtime order must be Phase 2 data -> Phase 2 subscriptions/savings -> Phase 7 setup -> Phase 7 backup bridge -> protected app.js');
}

for (const fragment of [
  'How often do you get paid?',
  'When do you get paid next?',
  'Add your accounts',
  'What bills do you have?',
  'How would you like GENEVIEVE to manage your bills?',
  'Smooth my bills',
  'I’ll keep the money',
  'Set protected emergency cash.',
  'Set optional savings goals.',
  'YOUR FIRST MONEY PLAN',
  'genevieve-first-time-setup-v1',
  'refreshCompletedBillPlans',
]) {
  if (!setupRuntime.includes(fragment)) throw new Error(`deployed Phase 7 setup runtime missing contract fragment: ${fragment}`);
}

for (const fragment of [
  'phase7Setup',
  'genevieve-first-time-setup-v1',
  'fullBackup',
  'restoreFullBackup',
  "Object.prototype.hasOwnProperty.call(parsed, 'phase7Setup')",
  'localStorage.removeItem(SETUP_STORAGE_KEY)',
]) {
  if (!backupRuntime.includes(fragment)) throw new Error(`deployed Phase 7 backup bridge missing contract fragment: ${fragment}`);
}

for (const asset of ['/phase7-first-time-setup.js', '/phase7-backup-bridge.js']) {
  if (!worker.includes(asset)) throw new Error(`deployed service worker does not cache ${asset}`);
}
if (!worker.includes('phase7-first-time-setup-v1')) {
  throw new Error('deployed service-worker cache was not resealed for Phase 7');
}

const gitBlobHeader = Buffer.from(`blob ${Buffer.byteLength(sourceApp, 'utf8')}\0`, 'utf8');
const sourceHash = createHash('sha1').update(gitBlobHeader).update(sourceApp, 'utf8').digest('hex');
const expectedProtectedAppHash = 'a86381a76c4676b9d14cbcb1a6b9de842c1cd24c';
if (sourceHash !== expectedProtectedAppHash) {
  throw new Error(`protected app.js changed: expected Git blob ${expectedProtectedAppHash}, got ${sourceHash}`);
}

console.log('Phase 7 production artifact verification passed: eight-screen setup and setup-aware backup/restore are linked after Phase 2 and before protected app.js.');
