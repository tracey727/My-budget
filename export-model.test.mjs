import test from "node:test";
import assert from "node:assert/strict";
import { createJsonBackup, parseJsonBackup, transactionCsvRows, transactionsToCsv } from "./export-model.mjs";

const data = {
  months: { "2026-08": { income: 2000 } },
  categories: [{ id: "food", name: "Groceries" }],
  accounts: [
    { id: "bank", name: "Everyday" },
    { id: "save", name: "Savings" },
  ],
  transactions: [
    { id: "1", type: "expense", date: "2026-08-02", month: "2026-08", amount: 25.5, categoryId: "food", accountId: "bank", worth: "essential", note: "Milk, bread" },
    { id: "2", type: "income", date: "2026-08-03", month: "2026-08", amount: 500, accountId: "bank", note: "Pay" },
    { id: "3", type: "transfer", date: "2026-08-04", month: "2026-08", amount: 100, accountId: "bank", toAccountId: "save", note: "Buffer" },
    { id: "4", type: "expense", date: "2026-07-31", month: "2026-07", amount: 10, categoryId: "food", accountId: "bank" },
  ],
};

test("CSV export includes expense income and transfer records without changing their meaning", () => {
  const rows = transactionCsvRows(data, "2026-08");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    date: "2026-08-02",
    type: "expense",
    amount: "25.50",
    category: "Groceries",
    account: "Everyday",
    to_account: "",
    worth: "essential",
    note: "Milk, bread",
  });
  assert.equal(rows[1].type, "income");
  assert.equal(rows[1].worth, "");
  assert.equal(rows[2].type, "transfer");
  assert.equal(rows[2].account, "Everyday");
  assert.equal(rows[2].to_account, "Savings");
});

test("CSV correctly escapes commas and preserves fixed decimal amounts", () => {
  const csv = transactionsToCsv(data, "2026-08");
  assert.match(csv, /25\.50/);
  assert.match(csv, /"Milk, bread"/);
  assert.match(csv, /transfer,100\.00/);
});

test("CSV month filter does not leak transactions from other months", () => {
  const csv = transactionsToCsv(data, "2026-08");
  assert.doesNotMatch(csv, /2026-07-31/);
});

test("JSON backup round trip preserves the complete data object", () => {
  const backup = createJsonBackup(data);
  assert.deepEqual(parseJsonBackup(backup), data);
});

test("backup parser rejects malformed application backups", () => {
  assert.throws(() => parseJsonBackup('{"transactions":[]}'), /months/);
  assert.throws(() => parseJsonBackup('{"months":{},"categories":{},"transactions":[]}'), /categories/);
  assert.throws(() => parseJsonBackup('{"months":{},"categories":[],"transactions":{},"accounts":[]}'), /transactions/);
});
