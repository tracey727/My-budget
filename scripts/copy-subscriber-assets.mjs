import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const assets = [
  "app.js",
  "styles.css",
  "service-worker.js",
  "manifest.webmanifest",
];

const dist = resolve(process.cwd(), "dist");
await mkdir(dist, { recursive: true });
for (const asset of assets) {
  await copyFile(resolve(process.cwd(), asset), resolve(dist, asset));
  console.log(`copied subscriber asset: ${asset}`);
}

// Phase 3 Cloudflare repair: keep the locked source app.js untouched, but make
// the deployed build select the only available account automatically. This
// prevents iPhone Safari from leaving "Paid from" on the placeholder when the
// user has exactly one saved account.
const deployedAppPath = resolve(dist, "app.js");
let deployedApp = await readFile(deployedAppPath, "utf8");
const accountRefreshNeedle = "    ['#transactionAccount', '#transactionToAccount', '#subscriptionAccount'].forEach(sel => setSelectOptions($(sel), options, 'Choose account'));\n";
const accountRefreshReplacement = `${accountRefreshNeedle}    const transactionAccount = $('#transactionAccount');\n    if (state.accounts.length === 1 && !transactionAccount.value) transactionAccount.value = state.accounts[0].id;\n`;

if (!deployedApp.includes(accountRefreshNeedle)) {
  throw new Error("Cloudflare account-selector patch target not found in app.js");
}

deployedApp = deployedApp.replace(accountRefreshNeedle, accountRefreshReplacement);

// iPhone Safari can preserve a previous horizontal scroll offset after an
// over-wide build has been replaced. Force navigation back to the left edge so
// the corrected layout is actually shown from x=0.
const navigateNeedle = "    window.scrollTo({ top: 0, behavior: 'smooth' });\n";
const navigateReplacement = "    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });\n";
if (!deployedApp.includes(navigateNeedle)) {
  throw new Error("Cloudflare horizontal-scroll reset target not found in app.js");
}
deployedApp = deployedApp.replace(navigateNeedle, navigateReplacement);

const initNeedle = "    renderAll();\n    navigate(activeView);\n";
const initReplacement = `    renderAll();\n    navigate(activeView);\n    window.scrollTo(0, 0);\n    window.addEventListener('resize', () => window.scrollTo(0, window.scrollY));\n`;
if (!deployedApp.includes(initNeedle)) {
  throw new Error("Cloudflare mobile init patch target not found in app.js");
}
deployedApp = deployedApp.replace(initNeedle, initReplacement);

await writeFile(deployedAppPath, deployedApp, "utf8");
console.log("patched deployed account selector and horizontal scroll reset");

// Phase 3 mobile-layout gate: hard-contain every top-level surface to the
// visual viewport and make intrinsic grid/flex children shrink on iPhone.
const deployedStylesPath = resolve(dist, "styles.css");
const deployedStyles = await readFile(deployedStylesPath, "utf8");
const mobileOverflowPatch = `

/* Phase 3 Cloudflare mobile overflow repair — final containment */
html, body {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  overscroll-behavior-x: none;
  -webkit-text-size-adjust: 100%;
}
body { position: relative; }
.app-shell {
  width: 100%;
  max-width: 1080px;
  min-width: 0;
  overflow-x: hidden;
}
main, .view, .panel, .stack-list, .list-row, .section-heading, .topbar,
.hero-grid, .stats-grid, .filters-panel, .form-grid, .quick-actions {
  min-width: 0;
  max-width: 100%;
}
.section-heading > *, .topbar > *, .list-row > *, .hero-grid > *, .stats-grid > * { min-width: 0; }
.row-title, .row-meta, .eyebrow, h1, h2, h3, p { overflow-wrap: anywhere; }

@media (max-width: 760px) {
  html, body { width: 100vw; max-width: 100vw; }
  .app-shell {
    width: 100vw;
    max-width: 100vw;
    margin: 0;
    padding-left: 12px;
    padding-right: 12px;
  }
  .primary-nav {
    left: 10px;
    right: 10px;
    width: auto;
    max-width: none;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    overflow: hidden;
  }
  .nav-button {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    padding-left: 2px;
    padding-right: 2px;
    font-size: clamp(.64rem, 3vw, .78rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .section-heading {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }
  .section-heading .primary-button {
    width: auto;
    max-width: 112px;
    min-width: 74px;
    justify-self: end;
  }
  .list-row {
    width: 100%;
    grid-template-columns: minmax(0, 1fr) auto;
    overflow: hidden;
  }
  .row-amount {
    max-width: 34vw;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
`;

await writeFile(deployedStylesPath, `${deployedStyles}${mobileOverflowPatch}`, "utf8");
console.log("patched deployed mobile layout: viewport containment and shrink rules applied");
