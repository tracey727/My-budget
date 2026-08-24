export const BILL_FREQUENCIES = new Set([
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
  "one_off",
]);

export const ESSENTIAL_STATUSES = new Set(["essential", "nonessential", "unsure"]);
export const BUDGETING_METHODS = new Set(["smooth", "target"]);
export const ALERT_STATUSES = new Set(["green", "yellow", "red", "recovery"]);
export const PAID_STATUSES = new Set(["paid", "unpaid"]);

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100) / 100 : 0;
}

export function normalizeBillRecord(bill = {}) {
  const targetAmount = money(bill.targetAmount ?? bill.amount);
  const amountReserved = money(bill.amountReserved);

  return {
    id: String(bill.id || bill.billId || ""),
    billName: String(bill.billName || bill.name || "").trim(),
    amount: money(bill.amount),
    frequency: BILL_FREQUENCIES.has(bill.frequency) ? bill.frequency : "monthly",
    nextDueDate: String(bill.nextDueDate || ""),
    accountId: String(bill.accountId || bill.account || ""),
    essentialStatus: ESSENTIAL_STATUSES.has(bill.essentialStatus) ? bill.essentialStatus : "unsure",
    budgetingMethod: BUDGETING_METHODS.has(bill.budgetingMethod) ? bill.budgetingMethod : "target",
    amountReserved,
    requiredContribution: money(bill.requiredContribution),
    targetAmount,
    alertStatus: ALERT_STATUSES.has(bill.alertStatus) ? bill.alertStatus : "green",
    paidStatus: PAID_STATUSES.has(bill.paidStatus) ? bill.paidStatus : "unpaid",
    notes: String(bill.notes || "").trim(),
    createdAt: String(bill.createdAt || ""),
  };
}

export function billFundingGap(bill = {}) {
  const normalized = normalizeBillRecord(bill);
  return Math.round(Math.max(0, normalized.targetAmount - normalized.amountReserved) * 100) / 100;
}

export function billIsFunded(bill = {}) {
  return billFundingGap(bill) === 0;
}
