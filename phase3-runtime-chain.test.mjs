import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("subscriber runtime DOM ids are unique and every direct runtime id reference exists", async () => {
  const [index, app] = await Promise.all([text("./index.html"), text("./app.js")]);
  const htmlIds = [...index.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(htmlIds.filter((id, position) => htmlIds.indexOf(id) !== position))];
  assert.deepEqual(duplicates, [], `duplicate HTML ids: ${duplicates.join(", ")}`);

  const htmlIdSet = new Set(htmlIds);
  const runtimeIds = [...app.matchAll(/\$\(\s*["']#([A-Za-z][\w-]*)["']\s*\)/g)].map((match) => match[1]);
  const missing = [...new Set(runtimeIds.filter((id) => !htmlIdSet.has(id)))].sort();
  assert.deepEqual(missing, [], `runtime references missing HTML ids: ${missing.join(", ")}`);
});

test("all five navigation destinations have one button and one subscriber view", async () => {
  const index = await text("./index.html");
  for (const view of ["dashboard", "transactions", "subscriptions", "accounts", "review"]) {
    const occurrences = [...index.matchAll(new RegExp(`data-view=["']${view}["']`, "g"))].length;
    assert.equal(occurrences, 2, `${view} must have exactly one navigation button and one view`);
  }
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

test("production build applies every Phase 3 subscriber patch before deployment", async () => {
  const copyScript = await text("./scripts/copy-subscriber-assets.mjs");
  assert.match(copyScript, /accountRefreshNeedle/);
  assert.match(copyScript, /state\.accounts\.length === 1/);
  assert.match(copyScript, /accountDialogTitleNeedle/);
  assert.match(copyScript, /Add a bank, savings, cash, card or loan account/);
  assert.match(copyScript, /if \(event\.detail > 0\) btn\.blur\(\)/);
  assert.match(copyScript, /requestAnimationFrame\(resetHorizontalViewport\)/);
  assert.match(copyScript, /setTimeout\(resetHorizontalViewport, 80\)/);
  assert.match(copyScript, /overflow-x: clip/);
  assert.match(copyScript, /repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(copyScript, /phase3-full-code-audit/);
});

test("production backup, restore and CSV paths remain wired to visible controls", async () => {
  const [index, app] = await Promise.all([text("./index.html"), text("./app.js")]);
  for (const id of ["backupButton", "restoreButton", "restoreInput", "exportCsvButton"]) {
    assert.match(index, new RegExp(`id=["']${id}["']`));
  }
  assert.match(app, /#backupButton['"]\)\.addEventListener\(['"]click['"],\s*backup\)/);
  assert.match(app, /#exportCsvButton['"]\)\.addEventListener\(['"]click['"],\s*exportCsv\)/);
  assert.match(app, /#restoreInput['"]\)\.addEventListener\(['"]change['"]/);
});
