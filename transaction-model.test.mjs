import test from "node:test";
import assert from "node:assert/strict";
import { computedBalance, monthlyExpenseTotal, normalizeTransactionType } from "./transaction-model.mjs";

test("legacy React transactions remain expenses", () => {
  assert.equal(normalizeTransactionType({ amount: 25 }), "expense");
});

test("income and expenses change an asset account balance", () => {
  const account = { id: "bank", type: "bank", openingBalance: 1000 };
  const transactions = [
    { type: "income", accountId: "bank", amount: 200 },
    { type: "expense", accountId: "bank", amount: 75 },
  ];
  assert.equal(computedBalance(account, transactions), 1125);
});

test("internal transfer moves money without changing combined asset value", () => {
  const everyday = { id: "everyday", type: "bank", openingBalance: 1000 };
  const savings = { id: "savings", type: "savings", openingBalance: 250 };
  const transactions = [
    { type: "transfer", accountId: "everyday", toAccountId: "savings", amount: 300, date: "2026-08-24", month: "2026-08" },
  ];
  assert.equal(computedBalance(everyday, transactions), 700);
  assert.equal(computedBalance(savings, transactions), 550);
  assert.equal(computedBalance(everyday, transactions) + computedBalance(savings, transactions), 1250);
  assert.equal(monthlyExpenseTotal(transactions, "2026-08"), 0);
});

test("transfer payment to a credit card reduces debt and is not spending twice", () => {
  const bank = { id: "bank", type: "bank", openingBalance: 500 };
  const card = { id: "card", type: "credit", openingBalance: 400 };
  const transactions = [
    { type: "transfer", accountId: "bank", toAccountId: "card", amount: 100, date: "2026-08-24", month: "2026-08" },
  ];
  assert.equal(computedBalance(bank, transactions), 400);
  assert.equal(computedBalance(card, transactions), 300);
  assert.equal(monthlyExpenseTotal(transactions, "2026-08"), 0);
});

test("monthly spending includes expenses only", () => {
  const transactions = [
    { type: "expense", amount: 80, date: "2026-08-02", month: "2026-08" },
    { type: "income", amount: 500, date: "2026-08-03", month: "2026-08" },
    { type: "transfer", amount: 200, date: "2026-08-04", month: "2026-08" },
    { amount: 20, date: "2026-08-05", month: "2026-08" },
    { type: "expense", amount: 30, date: "2026-07-31", month: "2026-07" },
  ];
  assert.equal(monthlyExpenseTotal(transactions, "2026-08"), 100);
});
