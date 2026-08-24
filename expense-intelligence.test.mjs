import test from "node:test";
import assert from "node:assert/strict";
import { EXPENSE_WORTH, expenseWorthTotals, normalizeExpenseWorth, reviewExpenseTotal } from "./expense-intelligence.mjs";

test("expense intelligence labels are locked", () => {
  assert.deepEqual(EXPENSE_WORTH, {
    essential: "Essential",
    worth: "Worth It",
    unsure: "Unsure",
    waste: "Waste",
  });
});

test("legacy expense without classification defaults to unsure", () => {
  assert.equal(normalizeExpenseWorth({ type: "expense", amount: 12 }), "unsure");
});

test("income and transfers never receive expense intelligence", () => {
  assert.equal(normalizeExpenseWorth({ type: "income", amount: 100 }), null);
  assert.equal(normalizeExpenseWorth({ type: "transfer", amount: 100 }), null);
});

test("worth totals include expense records only", () => {
  const transactions = [
    { type: "expense", worth: "essential", amount: 100, month: "2026-08" },
    { type: "expense", worth: "worth", amount: 40, month: "2026-08" },
    { type: "expense", worth: "unsure", amount: 25, month: "2026-08" },
    { type: "expense", worth: "waste", amount: 15, month: "2026-08" },
    { type: "transfer", amount: 500, month: "2026-08" },
    { type: "income", amount: 1000, month: "2026-08" },
  ];
  assert.deepEqual(expenseWorthTotals(transactions, "2026-08"), {
    essential: 100,
    worth: 40,
    unsure: 25,
    waste: 15,
  });
  assert.equal(reviewExpenseTotal(transactions, "2026-08"), 40);
});
