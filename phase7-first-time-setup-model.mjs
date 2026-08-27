export const PAY_FREQUENCIES = Object.freeze(['weekly', 'fortnightly', 'monthly', 'irregular']);

export const PAY_PERIODS_PER_YEAR = Object.freeze({
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
});

export const BILL_FREQUENCIES = Object.freeze([
  'weekly',
  'fortnightly',
  'monthly',
  'quarterly',
  'half_yearly',
  'yearly',
  'one_off',
]);

export const BILL_CYCLES_PER_YEAR = Object.freeze({
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  half_yearly: 2,
  yearly: 1,
  one_off: 1,
});

export function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(Math.max(0, number) * 100) / 100;
}

export function annualBillCost(amount, frequency) {
  const cycles = BILL_CYCLES_PER_YEAR[frequency] ?? 0;
  return roundMoney(roundMoney(amount) * cycles);
}

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function monthlyPayDate(anchor, offset) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + offset;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(anchor.getUTCDate(), lastDay)));
}

export function paysAvailableByDueDate(nextPayDate, dueDate, payFrequency) {
  if (payFrequency === 'irregular') return null;
  const start = parseDateOnly(nextPayDate);
  const due = parseDateOnly(dueDate);
  if (!start || !due) return null;
  if (due.getTime() < start.getTime()) return 0;

  let count = 0;
  for (let index = 0; index < 600; index += 1) {
    let payDate;
    if (payFrequency === 'weekly' || payFrequency === 'fortnightly') {
      const days = payFrequency === 'weekly' ? 7 : 14;
      payDate = new Date(start.getTime() + (index * days * 86_400_000));
    } else if (payFrequency === 'monthly') {
      payDate = monthlyPayDate(start, index);
    } else {
      return null;
    }
    if (payDate.getTime() > due.getTime()) break;
    count += 1;
  }
  return count;
}

export function smoothContribution(amount, billFrequency, payFrequency, nextDueDate = '', nextPayDate = '', amountReserved = 0) {
  if (payFrequency === 'irregular') return null;
  const amountDue = roundMoney(amount);
  const reserved = roundMoney(amountReserved);
  const paysBeforeDue = paysAvailableByDueDate(nextPayDate, nextDueDate, payFrequency);
  if (paysBeforeDue !== null) {
    const remainingForFirstDue = roundMoney(Math.max(0, amountDue - reserved));
    if (remainingForFirstDue === 0) return 0;
    if (paysBeforeDue <= 0) return remainingForFirstDue;
    return roundMoney(remainingForFirstDue / paysBeforeDue);
  }

  const payPeriods = PAY_PERIODS_PER_YEAR[payFrequency];
  if (!payPeriods) return null;
  return roundMoney(annualBillCost(amountDue, billFrequency) / payPeriods);
}

export function deriveBillPlan(bill, billMode, payFrequency, nextPayDate = '') {
  const amount = roundMoney(bill?.amount);
  const amountReserved = roundMoney(bill?.amountReserved);
  const method = billMode === 'smooth' ? 'smooth' : 'target';
  return {
    ...bill,
    amount,
    budgetingMethod: method,
    targetAmount: amount,
    amountReserved,
    requiredContribution: method === 'smooth'
      ? (smoothContribution(amount, bill?.frequency, payFrequency, bill?.nextDueDate, nextPayDate, amountReserved) ?? 0)
      : 0,
    alertStatus: ['green', 'yellow', 'red', 'recovery'].includes(bill?.alertStatus)
      ? bill.alertStatus
      : 'green',
    paidStatus: bill?.paidStatus === 'paid' ? 'paid' : 'unpaid',
  };
}

export function hasMeaningfulFinancialData(state) {
  if (!state || typeof state !== 'object') return false;
  return ['accounts', 'transactions', 'subscriptions', 'bills', 'savingsGoals']
    .some((key) => Array.isArray(state[key]) && state[key].length > 0);
}

export function buildFirstMoneyPlan(setup) {
  const payFrequency = PAY_FREQUENCIES.includes(setup?.payFrequency)
    ? setup.payFrequency
    : 'fortnightly';
  const billMode = setup?.billMode === 'smooth' ? 'smooth' : 'target';
  const accounts = Array.isArray(setup?.accounts) ? setup.accounts : [];
  const nextPayDate = String(setup?.nextPayDate || '');
  const bills = (Array.isArray(setup?.bills) ? setup.bills : [])
    .map((bill) => deriveBillPlan(bill, billMode, payFrequency, nextPayDate));
  const savingsGoals = Array.isArray(setup?.savingsGoals) ? setup.savingsGoals : [];
  const emergencyCash = roundMoney(setup?.emergencyCash);
  const regularPerPayBills = billMode === 'smooth' && payFrequency !== 'irregular'
    ? roundMoney(bills.reduce((sum, bill) => sum + bill.requiredContribution, 0))
    : null;
  const billTargets = roundMoney(bills.reduce((sum, bill) => sum + bill.targetAmount, 0));

  return {
    payFrequency,
    nextPayDate,
    billMode,
    accounts,
    bills,
    savingsGoals,
    emergencyCash,
    regularPerPayBills,
    billTargets,
  };
}
