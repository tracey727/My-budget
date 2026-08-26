import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const runtimeName = 'phase7-first-time-setup.js';
const runtimeVersion = 'phase7-first-time-setup-v1';
const phase3CachePredecessor = 'every-cent-v2-phase3-seven-view-runtime-v3';

await copyFile(resolve(root, runtimeName), resolve(dist, runtimeName));
console.log(`copied Phase 7 subscriber asset: ${runtimeName}`);

const indexPath = resolve(dist, 'index.html');
let index = await readFile(indexPath, 'utf8');
if (index.includes('/phase7-first-time-setup.js')) {
  throw new Error('Phase 7 runtime was already linked before the Phase 7 linker ran');
}

const protectedAppPattern = /<script src="\/app\.js(?:\?[^\"]*)?" defer><\/script>/;
const protectedAppMatch = index.match(protectedAppPattern);
if (!protectedAppMatch) throw new Error('Protected app.js script tag not found in built subscriber index');
const phase7Tag = `<script src="/phase7-first-time-setup.js?v=${runtimeVersion}" defer></script>`;
index = index.replace(protectedAppPattern, `${phase7Tag}\n  ${protectedAppMatch[0]}`);
await writeFile(indexPath, index, 'utf8');
console.log('linked Phase 7 after Phase 2 runtimes and immediately before protected app.js');

const serviceWorkerPath = resolve(dist, 'service-worker.js');
let serviceWorker = await readFile(serviceWorkerPath, 'utf8');
if (serviceWorker.includes('/phase7-first-time-setup.js')) {
  throw new Error('Phase 7 service-worker asset was already linked before the Phase 7 linker ran');
}
const phase2Asset = "  '/phase2-subscriptions-savings-runtime.js',";
if (!serviceWorker.includes(phase2Asset)) throw new Error('Phase 2 subscriptions/savings cache anchor not found');
serviceWorker = serviceWorker.replace(
  phase2Asset,
  `${phase2Asset}\n  '/phase7-first-time-setup.js',`,
);
serviceWorker = serviceWorker.replace(
  /const CACHE = '[^']+';/,
  `const CACHE = 'every-cent-v2-${runtimeVersion}'; // Phase 3 cache predecessor: ${phase3CachePredecessor}`,
);
await writeFile(serviceWorkerPath, serviceWorker, 'utf8');
console.log('linked Phase 7 subscriber asset into the deployed service-worker cache');
