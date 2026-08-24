import { normalizeTransactionType, parseAmount } from "./transaction-model.mjs";
import { normalizeExpenseWorth } from "./expense-intelligence.mjs";

export const CSV_COLUMNS = Object.freeze([
  "date",
  "type",
  "amount",
  "category",
  "account",
  "to_account",
  "worth",
  "note",
]);

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function lookupName(items, id) {
  if (!id) return "";
  return items.find((item) => item.id === id)?.name || "";
}

export function transactionCsvRows(data = {}, month = null) {
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];

  return transactions
    .filter((transaction) => !month || (transaction.month || transaction.date?.slice(0, 7)) === month)
    .sort((a, b) => `${a.date || ""}${a.createdAt || ""}`.localeCompare(`${b.date || ""}${b.createdAt || ""}`))
    .map((transaction) => {
      const type = normalizeTransactionType(transaction);
      return {
        date: transaction.date || "",
        type,
        amount: parseAmount(transaction.amount).toFixed(2),
        category: type === "expense" ? lookupName(categories, transaction.categoryId) : "",
        account: lookupName(accounts, transaction.accountId),
        to_account: type === "transfer" ? lookupName(accounts, transaction.toAccountId) : "",
        worth: type === "expense" ? normalizeExpenseWorth(transaction) : "",
        note: transaction.note || "",
      };
    });
}

export function transactionsToCsv(data = {}, month = null) {
  const header = CSV_COLUMNS.join(",");
  const rows = transactionCsvRows(data, month).map((row) =>
    CSV_COLUMNS.map((column) => csvCell(row[column])).join(",")
  );
  return [header, ...rows].join("\r\n");
}

export function createJsonBackup(data = {}) {
  return JSON.stringify(data, null, 2);
}

export function parseJsonBackup(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup");
  if (!parsed.months || typeof parsed.months !== "object") throw new Error("Invalid backup months");
  if (!Array.isArray(parsed.categories)) throw new Error("Invalid backup categories");
  if (!Array.isArray(parsed.transactions)) throw new Error("Invalid backup transactions");
  if (parsed.accounts !== undefined && !Array.isArray(parsed.accounts)) throw new Error("Invalid backup accounts");
  return parsed;
}
