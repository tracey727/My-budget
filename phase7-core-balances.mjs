import { LIABILITY_TYPES, computedBalance, monthlyExpenseTotal } from './transaction-model.mjs';

export const LIQUID_ASSET_TYPES = new Set(['bank', 'savings', 'cash']);

function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

export function buildAccountBalanceSnapshot(accounts = [], transactions = []) {
  return (Array.isArray(accounts) ? accounts : []).map((account) => ({
    id: String(account?.id || ''),
    serverId: typeof account?.serverId === 'string' ? account.serverId : '',
    name: String(account?.name || '').trim(),
    type: String(account?.type || 'other'),
    balance: roundMoney(computedBalance(account, transactions)),
  }));
}

export function calculateBalanceSummary({
  accounts = [],
  transactions = [],
  bills = [],
  savingsGoals = [],
  emergencyCash = 0,
} = {}) {
  const accountBalances = buildAccountBalanceSnapshot(accounts, transactions);
  const sourceAccounts = Array.isArray(accounts) ? accounts : [];
  const byId = new Map(sourceAccounts.map((account) => [String(account?.id || ''), account]));

  let assetBalance = 0;
  let debtBalance = 0;
  let liquidBalance = 0;

  for (const item of accountBalances) {
    const source = byId.get(item.id) || { type: item.type };
    if (LIABILITY_TYPES.has(source.type)) {
      debtBalance += Math.max(0, item.balance);
      continue;
    }
    assetBalance += item.balance;
    if (LIQUID_ASSET_TYPES.has(source.type)) liquidBalance += item.balance;
  }

  const billReserved = (Array.isArray(bills) ? bills : [])
    .reduce((sum, bill) => sum + Math.max(0, Number(bill?.amountReserved) || 0), 0);
  const protectedSavings = (Array.isArray(savingsGoals) ? savingsGoals : [])
    .filter((goal) => goal?.protected === true)
    .reduce((sum, goal) => sum + Math.max(0, Number(goal?.currentAmount) || 0), 0);
  const emergencyReserved = Math.max(0, Number(emergencyCash) || 0);
  const protectedReserved = roundMoney(emergencyReserved + billReserved + protectedSavings);
  const spendableBalance = roundMoney(Math.max(0, liquidBalance - protectedReserved));

  return {
    assetBalance: roundMoney(assetBalance),
    debtBalance: roundMoney(debtBalance),
    liquidBalance: roundMoney(liquidBalance),
    protectedReserved,
    spendableBalance,
    components: {
      emergencyReserved: roundMoney(emergencyReserved),
      billReserved: roundMoney(billReserved),
      protectedSavings: roundMoney(protectedSavings),
    },
  };
}

export function spendingForMonth(transactions = [], month) {
  return roundMoney(monthlyExpenseTotal(transactions, month));
}
