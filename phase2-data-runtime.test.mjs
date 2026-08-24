import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("data runtime loads before the preserved subscriber app", async () => {
  const index = await text("./index.html");
  const dataRuntime = index.indexOf('/phase2-data-runtime.js');
  const appRuntime = index.indexOf('/app.js');
  assert.ok(dataRuntime >= 0, "index must load the Phase 2 data runtime");
  assert.ok(appRuntime >= 0, "index must preserve app.js");
  assert.ok(dataRuntime < appRuntime, "data runtime must load before app.js");
});

test("required account and transaction fields remain wired into the runtime contract", async () => {
  const [runtime, transactionModel] = await Promise.all([
    text("./phase2-data-runtime.js"),
    text("./transaction-model.mjs"),
  ]);

  for (const fragment of [
    "bnpl",
    "transactionUserResponse",
    "transactionRecurringStatus",
    "transactionProfessionalProjectLink",
    "userResponse",
    "recurringStatus",
    "professionalProjectLink",
  ]) {
    assert.ok(runtime.includes(fragment), `runtime missing required transaction/account fragment: ${fragment}`);
  }

  assert.match(transactionModel, /LIABILITY_TYPES = new Set\(\["credit", "loan", "bnpl"\]\)/);
  assert.match(transactionModel, /normalizeTransactionRecord/);
  assert.match(transactionModel, /userResponse/);
  assert.match(transactionModel, /recurringStatus/);
  assert.match(transactionModel, /professionalProjectLink/);
});

test("Bills runtime stores every required bill field", async () => {
  const [runtime, billModel] = await Promise.all([
    text("./phase2-data-runtime.js"),
    text("./bill-model.mjs"),
  ]);

  const required = [
    "billName",
    "amount",
    "frequency",
    "nextDueDate",
    "accountId",
    "essentialStatus",
    "budgetingMethod",
    "amountReserved",
    "requiredContribution",
    "targetAmount",
    "alertStatus",
    "paidStatus",
  ];

  for (const field of required) {
    assert.ok(runtime.includes(field), `runtime missing bill field: ${field}`);
    assert.ok(billModel.includes(field), `bill model missing field: ${field}`);
  }

  assert.match(runtime, /data-view = 'bills'|dataset\.view = 'bills'/);
  assert.match(runtime, /id = 'billDialog'/);
});

test("dynamic labels escape normal double quotes and apostrophes", async () => {
  const runtime = await text("./phase2-data-runtime.js");
  assert.ok(runtime.includes("'\"': '&quot;'"), "double quotes must map directly to &quot;");
  assert.ok(runtime.includes("\"'\": '&#039;'"), "apostrophes must map directly to &#039;");
});

test("backup restore CSV and offline asset chain include the expanded data contract", async () => {
  const [runtime, worker, copyScript] = await Promise.all([
    text("./phase2-data-runtime.js"),
    text("./service-worker.js"),
    text("./scripts/copy-subscriber-assets.mjs"),
  ]);

  assert.match(runtime, /bills:/);
  assert.match(runtime, /fullBackup/);
  assert.match(runtime, /restoreFullBackup/);
  assert.match(runtime, /exportTransactions/);
  assert.match(worker, /phase2-data-runtime\.js/);
  assert.match(copyScript, /"phase2-data-runtime\.js"/);
});
