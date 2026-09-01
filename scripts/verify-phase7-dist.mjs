import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const setupRuntimeName = 'phase7-first-time-setup.js';
const planRuntimeName = 'phase7-plan-integrity-bridge.js';
const backupRuntimeName = 'phase7-backup-bridge.js';
const balanceRuntimeName = 'phase7-core-balances-bridge.js';
const phase7RuntimeNames = [setupRuntimeName, planRuntimeName, backupRuntimeName, balanceRuntimeName];

await Promise.all(phase7RuntimeNames.map((runtimeName) => access(resolve(dist, runtimeName), constants.R_OK)));

const [index, setupRuntime, planRuntime, backupRuntime, balanceRuntime, serviceWorker, sourceApp, sealedWorker, workerEntry, accountRoutes, readiness, migration015, rollback015] = await Promise.all([
  readFile(resolve(dist, 'index.html'), 'utf8'),
  readFile(resolve(dist, setupRuntimeName), 'utf8'),
  readFile(resolve(dist, planRuntimeName), 'utf8'),
  readFile(resolve(dist, backupRuntimeName), 'utf8'),
  readFile(resolve(dist, balanceRuntimeName), 'utf8'),
  readFile(resolve(dist, 'service-worker.js'), 'utf8'),
  readFile(resolve(root, 'app.js'), 'utf8'),
  readFile(resolve(root, 'src/worker-phase6-sealed.mjs'), 'utf8'),
  readFile(resolve(root, 'src/worker.mjs'), 'utf8'),
  readFile(resolve(root, 'src/phase7-account-routes.mjs'), 'utf8'),
  readFile(resolve(root, 'src/phase7-readiness.mjs'), 'utf8'),
  readFile(resolve(root, 'database/migrations/015_phase7_account_balance_persistence.sql'), 'utf8'),
  readFile(resolve(root, 'database/rollbacks/phase7_account_balance_persistence_to_phase6.sql'), 'utf8'),
]);

const dataRuntime = index.indexOf('/phase2-data-runtime.js');
const extendedRuntime = index.indexOf('/phase2-subscriptions-savings-runtime.js');
const phase7Setup = index.indexOf('/phase7-first-time-setup.js');
const phase7Plan = index.indexOf('/phase7-plan-integrity-bridge.js');
const phase7Backup = index.indexOf('/phase7-backup-bridge.js');
const phase7Balances = index.indexOf('/phase7-core-balances-bridge.js');
const protectedApp = index.indexOf('/app.js');
if (!(dataRuntime >= 0 && dataRuntime < extendedRuntime && extendedRuntime < phase7Setup && phase7Setup < phase7Plan && phase7Plan < phase7Backup && phase7Backup < phase7Balances && phase7Balances < protectedApp)) {
  throw new Error('Production runtime order must be Phase 2 data -> Phase 2 subscriptions/savings -> Phase 7 setup -> Phase 7 plan integrity -> Phase 7 backup -> Phase 7 core balances -> protected app.js');
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
  'paysAvailableByDueDate',
  'rollNextPayDate',
  'correctFirstPlanPresentation',
  'Choose today or a future date for your next pay.',
  'adjusted to have each dated bill ready by its next due date.',
  'setTimeout(refreshCommittedPlan, 0)',
]) {
  if (!planRuntime.includes(fragment)) throw new Error(`deployed Phase 7 plan-integrity bridge missing contract fragment: ${fragment}`);
}

for (const fragment of [
  'phase7Setup',
  'genevieve-first-time-setup-v1',
  'fullBackup',
  'restoreFullBackup',
  'phase7CloudBinding',
  "Object.prototype.hasOwnProperty.call(parsed, 'phase7Setup')",
  'localStorage.removeItem(SETUP_STORAGE_KEY)',
]) {
  if (!backupRuntime.includes(fragment)) throw new Error(`deployed Phase 7 backup bridge missing contract fragment: ${fragment}`);
}

for (const fragment of [
  '/api/phase7/accounts',
  '/api/phase7/accounts/sync',
  'syncMode: \'upsert_only\'',
  'Nothing will upload without your confirmation.',
  'ARCHIVE_ACCOUNT',
  'Spendable balance',
  'Protected / reserved',
  'Internal transfers move money between your own accounts and are not counted as spending.',
  'Cloudflare → Hyperdrive → Neon',
]) {
  if (!balanceRuntime.includes(fragment)) throw new Error(`deployed Phase 7 core-balance bridge missing contract fragment: ${fragment}`);
}

for (const fragment of [
  '/api/phase7/accounts',
  '/api/phase7/accounts/sync',
  'public.current_app_user_id()',
  'public.financial_settings',
  'current_balance_snapshot',
  'phase7_user_binding_mismatch',
  "value.confirm !== 'ARCHIVE_ACCOUNT'",
]) {
  if (!accountRoutes.includes(fragment)) throw new Error(`Phase 7 account route module missing security/persistence fragment: ${fragment}`);
}

for (const asset of phase7RuntimeNames.map((runtimeName) => `/${runtimeName}`)) {
  if (!serviceWorker.includes(asset)) throw new Error(`deployed service worker does not cache ${asset}`);
}
if (!serviceWorker.includes('phase7-first-time-setup-v2')) {
  throw new Error('deployed service-worker cache was not resealed for reconciled Phase 7');
}

function gitBlobHash(text) {
  const header = Buffer.from(`blob ${Buffer.byteLength(text, 'utf8')}\0`, 'utf8');
  return createHash('sha1').update(header).update(text, 'utf8').digest('hex');
}

// Pin updated 1 Sept 2026: intentional brand-name text change (Every Cent -> Genevieve App),
// recorded in docs/BUILD_ARCHIVE.md. No behavioural logic in this file was touched.
const expectedProtectedAppHash = 'b46943dff98ecededc4a65f65837e29acb0ff1f5';
const sourceHash = gitBlobHash(sourceApp);
if (sourceHash !== expectedProtectedAppHash) {
  throw new Error(`protected app.js changed: expected Git blob ${expectedProtectedAppHash}, got ${sourceHash}`);
}

const expectedSealedWorkerHash = '670159e8b820f597ed2376c246df04e69a244988';
const sealedWorkerHash = gitBlobHash(sealedWorker);
if (sealedWorkerHash !== expectedSealedWorkerHash) {
  throw new Error(`sealed Phase 6 worker changed: expected Git blob ${expectedSealedWorkerHash}, got ${sealedWorkerHash}`);
}
if (!workerEntry.includes("export * from './worker-phase6-sealed.mjs'")) throw new Error('Phase 7 Worker entry does not re-export the sealed Phase 6 module');
if (!workerEntry.includes('handlePhase7AccountRequest')) throw new Error('Phase 7 Worker entry does not compose the account persistence routes');
if (!workerEntry.includes('checkPhase7Readiness')) throw new Error('Phase 7 Worker entry does not advance the composed readiness boundary');
if (!readiness.includes("const EXPECTED_MIGRATION = '015'")) throw new Error('Phase 7 readiness is not sealed to migration 015');
if (!migration015.includes("VALUES ('015'")) throw new Error('Phase 7 migration 015 is not recorded chronologically');
if (!migration015.includes('current_balance_snapshot numeric(14,2)')) throw new Error('Phase 7 migration lacks the separate current-balance snapshot');
if (!migration015.includes('CREATE TRIGGER accounts_preserve_opening_balance')) throw new Error('Phase 7 migration does not enforce immutable opening balances');
if (/SET opening_balance\s*=/.test(migration015)) throw new Error('Phase 7 migration mutates immutable opening balances');
if (!rollback015.includes("version = '015'")) throw new Error('Phase 7 rollback does not remove migration 015');

console.log('Phase 7 production artifact verification passed: first-time setup, due-date plan integrity, backup continuity, core account balances and authenticated Neon account persistence are linked after Phase 2 while protected app.js and the sealed Phase 6 Worker remain hash-pinned.');
