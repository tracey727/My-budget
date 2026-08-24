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

const deployedAppPath = resolve(dist, "app.js");
let deployedApp = await readFile(deployedAppPath, "utf8");
const accountRefreshNeedle = "    ['#transactionAccount', '#transactionToAccount', '#subscriptionAccount'].forEach(sel => setSelectOptions($(sel), options, 'Choose account'));\n";
const accountRefreshReplacement = `${accountRefreshNeedle}    const transactionAccount = $('#transactionAccount');\n    if (state.accounts.length === 1 && !transactionAccount.value) transactionAccount.value = state.accounts[0].id;\n`;
if (!deployedApp.includes(accountRefreshNeedle)) throw new Error("Cloudflare account-selector patch target not found in app.js");
deployedApp = deployedApp.replace(accountRefreshNeedle, accountRefreshReplacement);

const navigateNeedle = "    window.scrollTo({ top: 0, behavior: 'smooth' });\n";
const navigateReplacement = "    document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0; window.scrollTo(0, 0);\n";
if (!deployedApp.includes(navigateNeedle)) throw new Error("Cloudflare navigation patch target not found in app.js");
deployedApp = deployedApp.replace(navigateNeedle, navigateReplacement);
await writeFile(deployedAppPath, deployedApp, "utf8");
console.log("patched deployed account selector and stable mobile navigation");

const deployedStylesPath = resolve(dist, "styles.css");
const deployedStyles = await readFile(deployedStylesPath, "utf8");
const mobileOverflowPatch = `

/* Phase 3 Cloudflare iPhone layout final */
html, body { margin: 0; width: 100%; max-width: 100%; overflow-x: clip; -webkit-text-size-adjust: 100%; }
body { min-width: 0; }
.app-shell { width: 100%; max-width: 1080px; min-width: 0; margin-left: auto; margin-right: auto; overflow-x: clip; }
main, .view, .panel, .stack-list, .list-row, .section-heading, .topbar, .hero-grid, .stats-grid, .filters-panel, .form-grid, .quick-actions { min-width: 0; max-width: 100%; }
.section-heading > *, .topbar > *, .list-row > *, .hero-grid > *, .stats-grid > * { min-width: 0; }
.row-title, .row-meta, .eyebrow, h1, h2, h3, p { overflow-wrap: anywhere; }
@media (max-width: 760px) {
  .app-shell { width: 100%; max-width: 100%; margin: 0; padding-left: 12px; padding-right: 12px; }
  .primary-nav { position: fixed; left: 10px; right: 10px; width: auto; max-width: calc(100% - 20px); grid-template-columns: repeat(5, minmax(0, 1fr)); overflow: hidden; }
  .nav-button { width: 100%; min-width: 0; max-width: 100%; padding-left: 1px; padding-right: 1px; font-size: clamp(.58rem, 2.75vw, .74rem); line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .section-heading { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 92px; gap: 8px; align-items: start; }
  .section-heading .primary-button { width: 92px; max-width: 92px; min-width: 0; padding-left: 8px; padding-right: 8px; justify-self: end; }
  .list-row { width: 100%; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; overflow: hidden; }
  .row-amount { max-width: 30vw; min-width: 0; font-size: clamp(.9rem, 4.8vw, 1.15rem); overflow: hidden; text-overflow: clip; }
}
@media (max-width: 390px) {
  .section-heading { grid-template-columns: minmax(0, 1fr) 82px; }
  .section-heading .primary-button { width: 82px; max-width: 82px; }
  .nav-button { font-size: .6rem; }
  .list-row { grid-template-columns: minmax(0, 1fr) minmax(70px, auto); }
  .row-amount { max-width: 27vw; font-size: .95rem; }
}
`;
await writeFile(deployedStylesPath, `${deployedStyles}${mobileOverflowPatch}`, "utf8");
console.log("patched deployed mobile layout: fixed-width action column and stable nav");

const deployedIndexPath = resolve(dist, "index.html");
let deployedIndex = await readFile(deployedIndexPath, "utf8");
const wordingChanges = [
  ['id="addAccountButton">+ Add</button>', 'id="addAccountButton">+ Add account</button>'],
  ['<div><p class="eyebrow">ACCOUNT</p><h2 id="accountDialogTitle">Add what you own or owe</h2></div>', '<div><p class="eyebrow">NEW ACCOUNT</p><h2 id="accountDialogTitle">Add a bank, savings, cash, card or loan account</h2></div>'],
  ['<input type="hidden" id="accountId" />\n      <div class="form-grid">', '<input type="hidden" id="accountId" />\n      <p class="muted small-copy"><strong>This creates the account itself.</strong> To add money, record income or record spending, use Money.</p>\n      <div class="form-grid">'],
  ['<label>Starting balance\n          <div class="money-input">', '<label>Starting balance — what is in this account now?\n          <div class="money-input">']
];
for (const [from, to] of wordingChanges) {
  if (!deployedIndex.includes(from)) throw new Error(`Account wording patch target not found: ${from}`);
  deployedIndex = deployedIndex.replace(from, to);
}
deployedIndex = deployedIndex
  .replace('href="/styles.css"', 'href="/styles.css?v=phase3-account-wording"')
  .replace('src="/app.js"', 'src="/app.js?v=phase3-account-wording"');
await writeFile(deployedIndexPath, deployedIndex, "utf8");
console.log("patched deployed account wording without changing account logic");
