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

export function smoothContribution(amount, billFrequency, payFrequency) {
  if (payFrequency === 'irregular') return null;
  const payPeriods = PAY_PERIODS_PER_YEAR[payFrequency];
  if (!payPeriods) return null;
  return roundMoney(annualBillCost(amount, billFrequency) / payPeriods);
}

export function deriveBillPlan(bill, billMode, payFrequency) {
  const amount = roundMoney(bill?.amount);
  const method = billMode === 'smooth' ? 'smooth' : 'target';
  return {
    ...bill,
    amount,
    budgetingMethod: method,
    targetAmount: amount,
    amountReserved: roundMoney(bill?.amountReserved),
    requiredContribution: method === 'smooth'
      ? (smoothContribution(amount, bill?.frequency, payFrequency) ?? 0)
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
  const bills = (Array.isArray(setup?.bills) ? setup.bills : [])
    .map((bill) => deriveBillPlan(bill, billMode, payFrequency));
  const savingsGoals = Array.isArray(setup?.savingsGoals) ? setup.savingsGoals : [];
  const emergencyCash = roundMoney(setup?.emergencyCash);
  const regularPerPayBills = billMode === 'smooth' && payFrequency !== 'irregular'
    ? roundMoney(bills.reduce((sum, bill) => sum + bill.requiredContribution, 0))
    : null;
  const billTargets = roundMoney(bills.reduce((sum, bill) => sum + bill.targetAmount, 0));

  return {
    payFrequency,
    nextPayDate: String(setup?.nextPayDate || ''),
    billMode,
    accounts,
    bills,
    savingsGoals,
    emergencyCash,
    regularPerPayBills,
    billTargets,
  };
}
