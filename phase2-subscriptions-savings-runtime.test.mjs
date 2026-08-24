import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("subscriptions and savings runtime is linked between Phase 2 data runtime and app.js", async () => {
  const index = await text("./index.html");
  const baseRuntime = index.indexOf('/phase2-data-runtime.js');
  const extendedRuntime = index.indexOf('/phase2-subscriptions-savings-runtime.js');
  const appRuntime = index.indexOf('/app.js');
  assert.ok(baseRuntime >= 0);
  assert.ok(extendedRuntime >= 0);
  assert.ok(appRuntime >= 0);
  assert.ok(baseRuntime < extendedRuntime, "base Phase 2 runtime must load first");
  assert.ok(extendedRuntime < appRuntime, "subscriptions/savings runtime must load before app.js");
});

test("subscription runtime contains every required stored field and decision", async () => {
  const [runtime, index] = await Promise.all([
    text("./phase2-subscriptions-savings-runtime.js"),
    text("./index.html"),
  ]);
  for (const fragment of [
    "autoRenew",
    "usage",
    "annualCost",
    "decision",
    "nextCharge",
    "frequency",
    "accountId",
  ]) assert.ok(runtime.includes(fragment), `missing subscription field: ${fragment}`);
  assert.match(index, /id=["']subscriptionAccount["']/);

  for (const decision of ["keep", "cancel", "maybe", "another_month", "pause", "review_next_charge"]) {
    assert.ok(runtime.includes(decision), `missing subscription decision: ${decision}`);
  }
});

test("savings runtime contains every required goal field and protected state", async () => {
  const runtime = await text("./phase2-subscriptions-savings-runtime.js");
  for (const fragment of [
    "savingsGoals",
    "goal",
    "target",
    "currentAmount",
    "deadline",
    "requiredWeeklyAmount",
    "requiredFortnightlyAmount",
    "progress",
    "protected",
    "savingsGoalDialog",
  ]) assert.ok(runtime.includes(fragment), `missing savings field: ${fragment}`);
  assert.match(runtime, /dataset\.view = 'savings'/);
  assert.match(runtime, /repeat\(7, minmax\(0, 1fr\)\)/);
});

test("extended backup and restore preserve subscriptions bills and savings goals", async () => {
  const runtime = await text("./phase2-subscriptions-savings-runtime.js");
  assert.match(runtime, /fullBackup/);
  assert.match(runtime, /restoreFullBackup/);
  assert.match(runtime, /bills: Array\.isArray\(parsed\.bills\)/);
  assert.match(runtime, /savingsGoals: Array\.isArray\(parsed\.savingsGoals\)/);
  assert.match(runtime, /replaceDataControl\('backupButton'\)/);
  assert.match(runtime, /replaceDataControl\('restoreButton'\)/);
  assert.match(runtime, /replaceDataControl\('restoreInput'\)/);
});

test("production copy and service worker both include the extended runtime", async () => {
  const [copyScript, worker] = await Promise.all([
    text("./scripts/copy-subscriber-assets.mjs"),
    text("./service-worker.js"),
  ]);
  assert.match(copyScript, /"phase2-subscriptions-savings-runtime\.js"/);
  assert.match(worker, /\/phase2-subscriptions-savings-runtime\.js/);
});
