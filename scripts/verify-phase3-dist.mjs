import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const [index, app, dataRuntime, extendedRuntime, styles, worker] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "app.js"), "utf8"),
  readFile(resolve(dist, "phase2-data-runtime.js"), "utf8"),
  readFile(resolve(dist, "phase2-subscriptions-savings-runtime.js"), "utf8"),
  readFile(resolve(dist, "styles.css"), "utf8"),
  readFile(resolve(dist, "service-worker.js"), "utf8"),
]);

for (const file of ["app.js", "phase2-data-runtime.js", "phase2-subscriptions-savings-runtime.js"]) {
  const syntax = spawnSync(process.execPath, ["--check", resolve(dist, file)], { encoding: "utf8" });
  if (syntax.status !== 0) {
    throw new Error(`built ${file} failed JavaScript syntax check:\n${syntax.stderr || syntax.stdout}`);
  }
  console.log(`built ${file} JavaScript syntax check passed`);
}

const requiredIndexFragments = [
  "/phase2-data-runtime.js",
  "/phase2-subscriptions-savings-runtime.js",
  "/app.js?v=phase3-seven-view-runtime-v3",
  "/styles.css?v=phase3-seven-view-runtime-v3",
  "href=\"/manifest.webmanifest\"",
  "data-phase3-navigation-fallback",
  "document.addEventListener('pointerup', activateFromEvent, true)",
  "document.addEventListener('click', activateFromEvent, true)",
  "+ Add account",
  "Add a bank, savings, cash, card or loan account",
  "This creates the account itself.",
  "Starting balance — what is in this account now?",
];
for (const fragment of requiredIndexFragments) {
  if (!index.includes(fragment)) throw new Error(`built index.html missing Phase 3 contract fragment: ${fragment}`);
}
if (/href="\/assets\/[^"]+\.css"/.test(index)) {
  throw new Error("built index.html still points at Vite's hashed CSS instead of the audited subscriber stylesheet");
}

const dataPosition = index.indexOf("/phase2-data-runtime.js");
const extendedPosition = index.indexOf("/phase2-subscriptions-savings-runtime.js");
const appPosition = index.indexOf("/app.js?v=phase3-seven-view-runtime-v3");
if (!(dataPosition >= 0 && dataPosition < extendedPosition && extendedPosition < appPosition)) {
  throw new Error("Cloudflare built runtime order must remain data runtime -> subscriptions/savings runtime -> app.js");
}

const requiredAppFragments = [
  "state.accounts.length === 1 && !transactionAccount.value",
  "Add a bank, savings, cash, card or loan account",
  "if (event.detail > 0) btn.blur()",
  "requestAnimationFrame(resetHorizontalViewport)",
  "setTimeout(resetHorizontalViewport, 80)",
  "Choose the account used.",
  "Choose a different destination account.",
];
for (const fragment of requiredAppFragments) {
  if (!app.includes(fragment)) throw new Error(`built app.js missing Phase 3 runtime fragment: ${fragment}`);
}

for (const fragment of ["dataset.view = 'bills'", "id = 'billsView'", "repeat(6, minmax(0, 1fr))", "fullBackup", "restoreFullBackup"]) {
  if (!dataRuntime.includes(fragment)) throw new Error(`built Phase 2 data runtime missing Cloudflare re-seal fragment: ${fragment}`);
}
for (const fragment of ["dataset.view = 'savings'", "id = 'savingsView'", "repeat(7, minmax(0, 1fr))", "savingsGoals", "subscriptionDecision", "fullBackup", "restoreFullBackup"]) {
  if (!extendedRuntime.includes(fragment)) throw new Error(`built subscriptions/savings runtime missing Cloudflare re-seal fragment: ${fragment}`);
}

const requiredStyleFragments = [
  "overflow-x: clip",
  "max-width: calc(100% - 20px)",
  "touch-action: manipulation",
];
for (const fragment of requiredStyleFragments) {
  if (!styles.includes(fragment)) throw new Error(`built styles.css missing mobile containment fragment: ${fragment}`);
}

for (const asset of ["/", "/index.html", "/manifest.webmanifest", "/phase2-data-runtime.js", "/phase2-subscriptions-savings-runtime.js"]) {
  if (!worker.includes(`'${asset}'`) && !worker.includes(`\"${asset}\"`)) {
    throw new Error(`service worker no longer covers required subscriber asset: ${asset}`);
  }
}
for (const asset of ["/styles.css?v=phase3-seven-view-runtime-v3", "/app.js?v=phase3-seven-view-runtime-v3"]) {
  if (!worker.includes(`'${asset}'`) && !worker.includes(`\"${asset}\"`)) {
    throw new Error(`service worker missing versioned runtime asset: ${asset}`);
  }
}
if (!worker.includes("every-cent-v2-phase3-seven-view-runtime-v3")) {
  throw new Error("service worker cache version was not advanced for the seven-view Cloudflare re-seal");
}

console.log("Phase 3 production artifact verification passed: staged seven-view runtime, executable assets, fresh cache, navigation fallback and iPhone containment.");