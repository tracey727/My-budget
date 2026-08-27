import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const setupRuntimeName = 'phase7-first-time-setup.js';
const planRuntimeName = 'phase7-plan-integrity-bridge.js';
const backupRuntimeName = 'phase7-backup-bridge.js';
const balanceRuntimeName = 'phase7-core-balances-bridge.js';
const runtimeVersion = 'phase7-first-time-setup-v2';
const phase3CachePredecessor = 'every-cent-v2-phase3-seven-view-runtime-v3';
const phase7RuntimeNames = [setupRuntimeName, planRuntimeName, backupRuntimeName, balanceRuntimeName];

for (const runtimeName of phase7RuntimeNames) {
  await copyFile(resolve(root, runtimeName), resolve(dist, runtimeName));
  console.log(`copied Phase 7 subscriber asset: ${runtimeName}`);
}

const indexPath = resolve(dist, 'index.html');
let index = await readFile(indexPath, 'utf8');
if (phase7RuntimeNames.some((runtimeName) => index.includes(`/${runtimeName}`))) {
  throw new Error('Phase 7 runtimes were already linked before the Phase 7 linker ran');
}

const protectedAppPattern = /<script src="\/app\.js(?:\?[^\"]*)?" defer><\/script>/;
const protectedAppMatch = index.match(protectedAppPattern);
if (!protectedAppMatch) throw new Error('Protected app.js script tag not found in built subscriber index');
const phase7Tags = phase7RuntimeNames
  .map((runtimeName) => `<script src="/${runtimeName}?v=${runtimeVersion}" defer></script>`)
  .join('\n  ');
index = index.replace(protectedAppPattern, `${phase7Tags}\n  ${protectedAppMatch[0]}`);
await writeFile(indexPath, index, 'utf8');
console.log('linked Phase 7 setup, plan-integrity, backup and core-balance runtimes after Phase 2 and immediately before protected app.js');

const serviceWorkerPath = resolve(dist, 'service-worker.js');
let serviceWorker = await readFile(serviceWorkerPath, 'utf8');
if (phase7RuntimeNames.some((runtimeName) => serviceWorker.includes(`/${runtimeName}`))) {
  throw new Error('Phase 7 service-worker assets were already linked before the Phase 7 linker ran');
}
const phase2Asset = "  '/phase2-subscriptions-savings-runtime.js',";
if (!serviceWorker.includes(phase2Asset)) throw new Error('Phase 2 subscriptions/savings cache anchor not found');
serviceWorker = serviceWorker.replace(
  phase2Asset,
  `${phase2Asset}\n${phase7RuntimeNames.map((runtimeName) => `  '/${runtimeName}',`).join('\n')}`,
);
serviceWorker = serviceWorker.replace(
  /const CACHE = '[^']+';/,
  `const CACHE = 'every-cent-v2-${runtimeVersion}'; // Phase 3 cache predecessor: ${phase3CachePredecessor}`,
);
await writeFile(serviceWorkerPath, serviceWorker, 'utf8');
console.log('linked all Phase 7 subscriber assets into the deployed service-worker cache');
