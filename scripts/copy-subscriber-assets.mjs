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

// Phase 3 iPhone-only overflow repair: Safari may horizontally pan the visual
// viewport to keep a focused fixed-nav button visible after a tap. Keep keyboard
// focus behaviour intact, but blur pointer-tapped nav buttons and reassert x=0
// after Safari completes its focus/scroll anchoring.
const navClickNeedle = "    $$('.nav-button').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));\n";
const navClickReplacement = `    $$('.nav-button').forEach(btn => btn.addEventListener('click', event => {\n      navigate(btn.dataset.view);\n      if (event.detail > 0) btn.blur();\n      const resetHorizontalViewport = () => {\n        document.documentElement.scrollLeft = 0;\n        document.body.scrollLeft = 0;\n        window.scrollTo(0, window.scrollY);\n      };\n      resetHorizontalViewport();\n      requestAnimationFrame(resetHorizontalViewport);\n      setTimeout(resetHorizontalViewport, 80);\n    }));\n`;
if (!deployedApp.includes(navClickNeedle)) throw new Error("Cloudflare iPhone nav-focus patch target not found in app.js");
deployedApp = deployedApp.replace(navClickNeedle, navClickReplacement);

// Keep the previously approved account-creation wording intact after the
// dialog is opened. The source runtime resets this heading dynamically, so the
// deployed runtime must use the same clarified wording as the built HTML.
const accountDialogTitleNeedle = "    $('#accountDialogTitle').textContent = 'Add what you own or owe';\n";
const accountDialogTitleReplacement = "    $('#accountDialogTitle').textContent = 'Add a bank, savings, cash, card or loan account';\n";
if (!deployedApp.includes(accountDialogTitleNeedle)) throw new Error("Cloudflare account-dialog wording patch target not found in app.js");
deployedApp = deployedApp.replace(accountDialogTitleNeedle, accountDialogTitleReplacement);

await writeFile(deployedAppPath, deployedApp, "utf8");
console.log("patched deployed account selector, wording and stable mobile navigation");

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

// Vite rewrites the source stylesheet and manifest links to hashed /assets/
// paths before this script runs. The previous Phase 3 mobile CSS was copied to
// /styles.css but the built page never loaded it. Replace Vite's hashed links
// with the supported subscriber assets so the audited runtime and its cache use
// one consistent file chain.
const builtStyleLinkPattern = /href="\/assets\/[^"]+\.css"/;
const builtManifestLinkPattern = /href="\/assets\/manifest-[^"]+\.webmanifest"/;
if (!builtStyleLinkPattern.test(deployedIndex)) throw new Error("Vite-built stylesheet link not found in dist/index.html");
if (!builtManifestLinkPattern.test(deployedIndex)) throw new Error("Vite-built manifest link not found in dist/index.html");
deployedIndex = deployedIndex
  .replace(builtStyleLinkPattern, 'href="/styles.css?v=phase3-full-code-audit"')
  .replace(builtManifestLinkPattern, 'href="/manifest.webmanifest"')
  .replace('src="/app.js"', 'src="/app.js?v=phase3-full-code-audit"');
await writeFile(deployedIndexPath, deployedIndex, "utf8");
console.log("linked deployed index to audited subscriber CSS, manifest and runtime");
