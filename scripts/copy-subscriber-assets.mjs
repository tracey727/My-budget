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
const deployedApp = await readFile(deployedAppPath, "utf8");
const accountRefreshNeedle = "    ['#transactionAccount', '#transactionToAccount', '#subscriptionAccount'].forEach(sel => setSelectOptions($(sel), options, 'Choose account'));\n";
const accountRefreshReplacement = `${accountRefreshNeedle}    const transactionAccount = $('#transactionAccount');\n    if (state.accounts.length === 1 && !transactionAccount.value) transactionAccount.value = state.accounts[0].id;\n`;

if (!deployedApp.includes(accountRefreshNeedle)) {
  throw new Error("Cloudflare account-selector patch target not found in app.js");
}

await writeFile(deployedAppPath, deployedApp.replace(accountRefreshNeedle, accountRefreshReplacement), "utf8");
console.log("patched deployed account selector: single saved account auto-selected");

// Phase 3 mobile-layout gate: constrain intrinsic grid/flex widths on narrow
// iPhone viewports so long navigation labels, account amounts and action
// headings cannot widen the page beyond the visual viewport.
const deployedStylesPath = resolve(dist, "styles.css");
const deployedStyles = await readFile(deployedStylesPath, "utf8");
const mobileOverflowPatch = `

/* Phase 3 Cloudflare mobile overflow repair */
html, body { max-width: 100%; overflow-x: hidden; -webkit-text-size-adjust: 100%; }
.app-shell, main, .view, .panel, .stack-list, .list-row, .section-heading, .topbar { min-width: 0; max-width: 100%; }
.section-heading > *, .topbar > *, .list-row > * { min-width: 0; }
.row-title, .row-meta { overflow-wrap: anywhere; }
@media (max-width: 760px) {
  .primary-nav { grid-template-columns: repeat(5, minmax(0, 1fr)); max-width: calc(100vw - 20px); overflow: hidden; }
  .nav-button { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .section-heading .primary-button { flex: 0 0 auto; max-width: 42%; }
  .list-row { grid-template-columns: minmax(0, 1fr) minmax(0, auto); }
  .row-amount { max-width: 38vw; overflow: hidden; text-overflow: ellipsis; }
}
`;

await writeFile(deployedStylesPath, `${deployedStyles}${mobileOverflowPatch}`, "utf8");
console.log("patched deployed mobile layout: horizontal overflow constrained");
