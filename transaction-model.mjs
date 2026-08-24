export const LIABILITY_TYPES = new Set(["credit", "loan", "bnpl"]);

export function parseAmount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

export function normalizeTransactionType(transaction) {
  if (transaction?.type === "income" || transaction?.type === "expense" || transaction?.type === "transfer") {
    return transaction.type;
  }
  return "expense";
}

export function computedBalance(account, transactions = []) {
  if (!account) return 0;
  let balance = parseAmount(account.openingBalance);
  const liability = LIABILITY_TYPES.has(account.type);

  for (const transaction of transactions) {
    const amount = parseAmount(transaction.amount);
    const type = normalizeTransactionType(transaction);

    if (type === "income" && transaction.accountId === account.id) {
      balance += liability ? -amount : amount;
    }
    if (type === "expense" && transaction.accountId === account.id) {
      balance += liability ? amount : -amount;
    }
    if (type === "transfer") {
      if (transaction.accountId === account.id) balance += liability ? amount : -amount;
      if (transaction.toAccountId === account.id) balance += liability ? -amount : amount;
    }
  }

  return Math.round(balance * 100) / 100;
}

export function accountPosition(account, transactions = []) {
  const balance = computedBalance(account, transactions);
  return LIABILITY_TYPES.has(account?.type) ? -balance : balance;
}

export function monthlyExpenseTotal(transactions = [], month) {
  return transactions
    .filter((transaction) => {
      const transactionMonth = transaction.month || transaction.date?.slice(0, 7);
      return transactionMonth === month && normalizeTransactionType(transaction) === "expense";
    })
    .reduce((sum, transaction) => sum + parseAmount(transaction.amount), 0);
}
