import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("subscriber runtime DOM ids are unique and every direct app runtime id reference exists", async () => {
  const [index, app] = await Promise.all([text("./index.html"), text("./app.js")]);
  const htmlIds = [...index.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(htmlIds.filter((id, position) => htmlIds.indexOf(id) !== position))];
  assert.deepEqual(duplicates, [], `duplicate HTML ids: ${duplicates.join(", ")}`);

  const htmlIdSet = new Set(htmlIds);
  const runtimeIds = [...app.matchAll(/\$\(\s*["']#([A-Za-z][\w-]*)["']\s*\)/g)].map((match) => match[1]);
  const missing = [...new Set(runtimeIds.filter((id) => !htmlIdSet.has(id)))].sort();
  assert.deepEqual(missing, [], `app.js references missing HTML ids: ${missing.join(", ")}`);
});

test("the Cloudflare subscriber chain resolves seven navigation destinations", async () => {
  const [index, dataRuntime, extendedRuntime] = await Promise.all([
    text("./index.html"),
    text("./phase2-data-runtime.js"),
    text("./phase2-subscriptions-savings-runtime.js"),
  ]);

  for (const view of ["dashboard", "transactions", "subscriptions", "accounts", "review"]) {
    const occurrences = [...index.matchAll(new RegExp(`data-view=["']${view}["']`, "g"))].length;
    assert.equal(occurrences, 2, `${view} must have exactly one base navigation button and one base view`);
  }

  assert.match(dataRuntime, /dataset\.view = 'bills'/);
  assert.match(dataRuntime, /dataset\.view = 'bills'/);
  assert.match(dataRuntime, /id = 'billsView'/);
  assert.match(dataRuntime, /repeat\(6, minmax\(0, 1fr\)\)/);

  assert.match(extendedRuntime, /dataset\.view = 'savings'/);
  assert.match(extendedRuntime, /id = 'savingsView'/);
  assert.match(extendedRuntime, /repeat\(7, minmax\(0, 1fr\)\)/);
});

test("account to transaction chain stays linked and prevents ambiguous saves", async () => {
  const [index, app] = await Promise.all([text("./index.html"), text("./app.js")]);
  assert.match(index, /id=["']transactionAccount["']/);
  assert.match(index, /id=["']transactionToAccount["']/);
  assert.match(app, /state\.accounts\.map\(a\s*=>\s*\(\{\s*value:\s*a\.id,/);
  assert.match(app, /#transactionAccount['"],\s*['"]#transactionToAccount/);
  assert.match(app, /if\s*\(state\.accounts\.length\s*&&\s*!accountId\)\s*return\s+showToast\(['"]Choose the account used\./);
  assert.match(app, /if\s*\(type\s*===\s*['"]transfer['"]\s*&&\s*\(!toAccountId\s*\|\|\s*toAccountId\s*===\s*accountId\)\)/);
});

test("app.js treats BNPL accounts as liabilities, matching transaction-model.mjs and debt-commitments-bridge.js", async () => {
  // app.js keeps its own LIABILITY_TYPES set rather than importing
  // transaction-model.mjs's (it's a plain browser script, not built as a
  // module), so the two sets have to be kept in sync by hand. This
  // previously drifted: app.js omitted 'bnpl', so a BNPL account's balance
  // was added to "Assets" instead of "Debts" in the Accounts view's own
  // computedBalance()/accountPosition() and assets/debts/net-position
  // summary, even though transaction-model.mjs and debt-commitments-bridge.js
  // both already treated BNPL correctly.
  const app = await text("./app.js");
  assert.match(app, /const LIABILITY_TYPES = new Set\(\['credit', 'loan', 'bnpl'\]\)/);
});

test("production build applies every Phase 3 subscriber patch before deployment", async () => {
  const copyScript = await text("./scripts/copy-subscriber-assets.mjs");
  assert.match(copyScript, /phase2-subscriptions-savings-runtime\.js/);
  assert.match(copyScript, /accountRefreshNeedle/);
  assert.match(copyScript, /state\.accounts\.length === 1/);
  assert.match(copyScript, /accountDialogTitleNeedle/);
  assert.match(copyScript, /Add a bank, savings, cash, card or loan account/);
  assert.match(copyScript, /if \(event\.detail > 0\) btn\.blur\(\)/);
  assert.match(copyScript, /requestAnimationFrame\(resetHorizontalViewport\)/);
  assert.match(copyScript, /setTimeout\(resetHorizontalViewport, 80\)/);
  assert.match(copyScript, /overflow-x: clip/);
  assert.match(copyScript, /touch-action: manipulation/);
  assert.match(copyScript, /phase3-seven-view-runtime-v3/);
  assert.match(copyScript, /data-phase3-navigation-fallback/);
  assert.match(copyScript, /document\.addEventListener\('pointerup', activateFromEvent, true\)/);
  assert.match(copyScript, /document\.addEventListener\('click', activateFromEvent, true\)/);
});

test("nav-click build patch uses a replacer function, not a string, to avoid $-pattern collapsing", async () => {
  const copyScript = await text("./scripts/copy-subscriber-assets.mjs");
  // navClickReplacement starts with the literal text "$$('.nav-button')". When the second
  // argument to String.prototype.replace is a STRING (not a function), "$$" is a special
  // pattern token meaning "insert one literal $" -- so a plain string replace silently
  // collapses "$$('.nav-button')" to "$('.nav-button')" in the built dist/app.js, which
  // throws "$(...).forEach is not a function" at runtime. Passing a replacer function
  // bypasses $-pattern substitution entirely.
  assert.match(copyScript, /deployedApp = deployedApp\.replace\(navClickNeedle, \(\) => navClickReplacement\);/);

  const needleMatch = copyScript.match(/const navClickNeedle = "((?:[^"\\]|\\.)*)";/);
  const replacementMatch = copyScript.match(/const navClickReplacement = `((?:[^`\\]|\\.)*)`;/);
  assert.ok(needleMatch && replacementMatch, "could not locate navClickNeedle/navClickReplacement literals");
  const needle = JSON.parse(`"${needleMatch[1]}"`);
  const replacement = replacementMatch[1].replace(/\\`/g, "`").replace(/\\\$/g, "$").replace(/\\n/g, "\n");
  const sample = `before\n${needle}after`;
  const result = sample.replace(needle, () => replacement);
  assert.equal(result, `before\n${replacement}after`);
  assert.match(result, /\$\$\('\.nav-button'\)/);
});

test("Phase 2 and Phase 3 production artifact gates remain separate", async () => {
  const [packageJson, phase2Verifier, phase3Verifier, worker] = await Promise.all([
    text("./package.json"),
    text("./scripts/verify-dist.mjs"),
    text("./scripts/verify-phase3-dist.mjs"),
    text("./service-worker.js"),
  ]);
  const pkg = JSON.parse(packageJson);
  assert.match(pkg.scripts["verify:phase2"], /scripts\/verify-dist\.mjs/);
  assert.doesNotMatch(pkg.scripts["verify:phase2"], /verify-phase3-dist/);
  assert.match(pkg.scripts["cf:dry-run"], /scripts\/verify-phase3-dist\.mjs/);
  assert.doesNotMatch(phase2Verifier, /phase3-seven-view-runtime-v3/);
  assert.match(phase3Verifier, /phase3-seven-view-runtime-v3/);
  assert.match(phase3Verifier, /--check/);
  assert.match(worker, /every-cent-v2-phase3-seven-view-runtime-v3/);
});

test("production backup, restore and CSV paths remain wired across the staged runtimes", async () => {
  const [index, app, dataRuntime, extendedRuntime] = await Promise.all([
    text("./index.html"),
    text("./app.js"),
    text("./phase2-data-runtime.js"),
    text("./phase2-subscriptions-savings-runtime.js"),
  ]);
  for (const id of ["backupButton", "restoreButton", "restoreInput", "exportCsvButton"]) {
    assert.match(index, new RegExp(`id=["']${id}["']`));
  }
  assert.match(app, /#backupButton['"]\)\.addEventListener\(['"]click['"],\s*backup\)/);
  assert.match(app, /#exportCsvButton['"]\)\.addEventListener\(['"]click['"],\s*exportCsv\)/);
  assert.match(dataRuntime, /fullBackup/);
  assert.match(dataRuntime, /restoreFullBackup/);
  assert.match(extendedRuntime, /fullBackup/);
  assert.match(extendedRuntime, /restoreFullBackup/);
  assert.match(extendedRuntime, /savingsGoals/);
});