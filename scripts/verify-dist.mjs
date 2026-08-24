import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const required = [
  "index.html",
  "app.js",
  "styles.css",
  "service-worker.js",
  "manifest.webmanifest",
];

const dist = resolve(process.cwd(), "dist");
const entries = await readdir(dist, { withFileTypes: true });
console.log("dist entries:", entries.map((entry) => entry.name).sort().join(", "));

for (const file of required) {
  const target = resolve(dist, file);
  try {
    await access(target, constants.R_OK);
    console.log(`artifact present: ${file}`);
  } catch {
    throw new Error(`required subscriber artifact missing: ${file}`);
  }
}

const [index, app, styles, worker] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "app.js"), "utf8"),
  readFile(resolve(dist, "styles.css"), "utf8"),
  readFile(resolve(dist, "service-worker.js"), "utf8"),
]);

const requiredIndexFragments = [
  "/app.js?v=phase3-full-code-audit",
  "/styles.css?v=phase3-full-code-audit",
  "href=\"/manifest.webmanifest\"",
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
];
for (const fragment of requiredStyleFragments) {
  if (!styles.includes(fragment)) throw new Error(`built styles.css missing mobile containment fragment: ${fragment}`);
}

for (const asset of ["/", "/index.html", "/styles.css", "/app.js", "/manifest.webmanifest"]) {
  if (!worker.includes(`'${asset}'`) && !worker.includes(`\"${asset}\"`)) {
    throw new Error(`service worker no longer covers required subscriber asset: ${asset}`);
  }
}

console.log("Subscriber production artifact verification passed, including Phase 3 runtime linkage and iPhone containment.");
