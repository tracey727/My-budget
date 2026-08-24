import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const [index, app, styles, worker] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "app.js"), "utf8"),
  readFile(resolve(dist, "styles.css"), "utf8"),
  readFile(resolve(dist, "service-worker.js"), "utf8"),
]);

const appSyntax = spawnSync(process.execPath, ["--check", resolve(dist, "app.js")], { encoding: "utf8" });
if (appSyntax.status !== 0) {
  throw new Error(`built app.js failed JavaScript syntax check:\n${appSyntax.stderr || appSyntax.stdout}`);
}
console.log("built app.js JavaScript syntax check passed");

const requiredIndexFragments = [
  "/app.js?v=phase3-navigation-runtime-v2",
  "/styles.css?v=phase3-navigation-runtime-v2",
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

const requiredStyleFragments = [
  "overflow-x: clip",
  "grid-template-columns: repeat(5, minmax(0, 1fr))",
  "max-width: calc(100% - 20px)",
  "touch-action: manipulation",
];
for (const fragment of requiredStyleFragments) {
  if (!styles.includes(fragment)) throw new Error(`built styles.css missing mobile containment fragment: ${fragment}`);
}

for (const asset of ["/", "/index.html", "/manifest.webmanifest"]) {
  if (!worker.includes(`'${asset}'`) && !worker.includes(`\"${asset}\"`)) {
    throw new Error(`service worker no longer covers required subscriber asset: ${asset}`);
  }
}
for (const asset of ["/styles.css?v=phase3-navigation-runtime-v2", "/app.js?v=phase3-navigation-runtime-v2"]) {
  if (!worker.includes(`'${asset}'`) && !worker.includes(`\"${asset}\"`)) {
    throw new Error(`service worker missing versioned runtime asset: ${asset}`);
  }
}
if (!worker.includes("every-cent-v2-phase3-navigation-runtime-v2")) {
  throw new Error("service worker cache version was not advanced for the navigation runtime repair");
}

console.log("Phase 3 production artifact verification passed: executable app.js, navigation fallback, fresh cache and iPhone containment.");