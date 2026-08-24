import { normalizeTransactionType, parseAmount } from "./transaction-model.mjs";

export const EXPENSE_WORTH = Object.freeze({
  essential: "Essential",
  worth: "Worth It",
  unsure: "Unsure",
  waste: "Waste",
});

export function normalizeExpenseWorth(transaction) {
  if (normalizeTransactionType(transaction) !== "expense") return null;
  return Object.hasOwn(EXPENSE_WORTH, transaction?.worth) ? transaction.worth : "unsure";
}

export function expenseWorthTotals(transactions = [], month) {
  const totals = { essential: 0, worth: 0, unsure: 0, waste: 0 };
  for (const transaction of transactions) {
    const transactionMonth = transaction.month || transaction.date?.slice(0, 7);
    if (transactionMonth !== month || normalizeTransactionType(transaction) !== "expense") continue;
    totals[normalizeExpenseWorth(transaction)] += parseAmount(transaction.amount);
  }
  return totals;
}

export function reviewExpenseTotal(transactions = [], month) {
  const totals = expenseWorthTotals(transactions, month);
  return Math.round((totals.unsure + totals.waste) * 100) / 100;
}
