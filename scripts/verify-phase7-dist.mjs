import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const runtimeName = 'phase7-first-time-setup.js';

await access(resolve(dist, runtimeName), constants.R_OK);

const [index, runtime, worker, sourceApp] = await Promise.all([
  readFile(resolve(dist, 'index.html'), 'utf8'),
  readFile(resolve(dist, runtimeName), 'utf8'),
  readFile(resolve(dist, 'service-worker.js'), 'utf8'),
  readFile(resolve(root, 'app.js'), 'utf8'),
]);

const dataRuntime = index.indexOf('/phase2-data-runtime.js');
const extendedRuntime = index.indexOf('/phase2-subscriptions-savings-runtime.js');
const phase7Runtime = index.indexOf('/phase7-first-time-setup.js');
const protectedApp = index.indexOf('/app.js');
if (!(dataRuntime >= 0 && dataRuntime < extendedRuntime && extendedRuntime < phase7Runtime && phase7Runtime < protectedApp)) {
  throw new Error('Production runtime order must be Phase 2 data -> Phase 2 subscriptions/savings -> Phase 7 first-time setup -> protected app.js');
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
  if (!runtime.includes(fragment)) throw new Error(`deployed Phase 7 runtime missing contract fragment: ${fragment}`);
}

if (!worker.includes('/phase7-first-time-setup.js')) {
  throw new Error('deployed service worker does not cache the Phase 7 setup runtime');
}
if (!worker.includes('phase7-first-time-setup-v1')) {
  throw new Error('deployed service-worker cache was not resealed for Phase 7');
}

const sourceHash = createHash('sha256').update(sourceApp).digest('hex');
const expectedProtectedAppHash = 'a86381a76c4676b9d14cbcb1a6b9de842c1cd24c';
if (sourceHash !== expectedProtectedAppHash) {
  throw new Error(`protected app.js changed: expected ${expectedProtectedAppHash}, got ${sourceHash}`);
}

console.log('Phase 7 production artifact verification passed: eight-screen first-time setup is linked after Phase 2 and before protected app.js.');
