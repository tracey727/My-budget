(() => {
  'use strict';

  // Forecast and cash-flow warning, added 1 Sept 2026 (Phase 14).
  // Builds on the Safe-to-Spend engine's monthly-equivalent budget figure
  // (same amountPerFrequency conversion technique, targeting 'monthly'
  // instead of the user's own pay cycle) and compares it against actual
  // month-to-date spending to project whether the user is on track to run
  // out of safe-to-spend money before the month ends. Read-only; writes
  // nothing. app.js is not modified.

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const PAY_PERIODS_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };

  function readMoneyState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        debtCommitments: Array.isArray(parsed.debtCommitments) ? parsed.debtCommitments : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      };
    } catch {
      return { transactions: [], bills: [], debtCommitments: [], savingsGoals: [] };
    }
  }

  function readSetup() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETUP_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value) || 0);
  }

  function parseAmount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // Same technique used by safe-to-spend-bridge.js and debt-commitments-bridge.js:
  // converts an amount at one regular frequency into the equivalent amount at a
  // different regular frequency, via annual cost.
  function amountPerFrequency(amount, fromFrequency, toFrequency) {
    const fromPeriods = PAY_PERIODS_PER_YEAR[fromFrequency];
    const toPeriods = PAY_PERIODS_PER_YEAR[toFrequency];
    if (!fromPeriods || !toPeriods) return 0;
    return (amount * fromPeriods) / toPeriods;
  }

  function smoothBillsTotal(bills) {
    return bills
      .filter(b => b && b.budgetingMethod === 'smooth' && b.paidStatus !== 'paid')
      .reduce((sum, b) => sum + (Number(b.requiredContribution) || 0), 0);
  }

  function debtTotal(debtCommitments, toFrequency) {
    return debtCommitments.reduce((sum, c) => sum + amountPerFrequency(Number(c.requiredPayment) || 0, c.frequency, toFrequency), 0);
  }

  function savingsTotal(savingsGoals, toFrequency) {
    return savingsGoals.reduce((sum, goal) => {
      const weekly = Number(goal.requiredWeeklyAmount) || 0;
      return sum + amountPerFrequency(weekly, 'weekly', toFrequency);
    }, 0);
  }

  // Monthly-equivalent Safe-to-Spend figure: what the user can actually spend
  // this month after Smooth bills, debt repayments and savings commitments,
  // regardless of how often they're actually paid.
  function monthlyBudget(state, setup) {
    const payFrequency = setup?.payFrequency;
    const incomeAmount = Number(setup?.incomeAmount) || 0;
    if (!payFrequency || payFrequency === 'irregular' || incomeAmount <= 0) return null;
    const incomeMonthly = amountPerFrequency(incomeAmount, payFrequency, 'monthly');
    const billsPerCycle = smoothBillsTotal(state.bills);
    const billsMonthly = amountPerFrequency(billsPerCycle, payFrequency, 'monthly');
    const debtsMonthly = debtTotal(state.debtCommitments, 'monthly');
    const savingsMonthly = savingsTotal(state.savingsGoals, 'monthly');
    return incomeMonthly - billsMonthly - debtsMonthly - savingsMonthly;
  }

  function monthToDateTotals(transactions, now) {
    const thisMonth = monthKey(now);
    const monthTx = transactions.filter(t => t && t.type === 'expense' && typeof t.date === 'string' && t.date.slice(0, 7) === thisMonth);
    const spent = monthTx.reduce((sum, t) => sum + parseAmount(t.amount), 0);
    const waste = monthTx.filter(t => t.worth === 'waste').reduce((sum, t) => sum + parseAmount(t.amount), 0);
    const unsure = monthTx.filter(t => t.worth === 'unsure').reduce((sum, t) => sum + parseAmount(t.amount), 0);
    return { spent, waste, unsure };
  }

  function render() {
    const headlineEl = document.getElementById('forecastHeadline');
    const subtextEl = document.getElementById('forecastSubtext');
    const breakdownEl = document.getElementById('forecastBreakdown');
    const budgetEl = document.getElementById('forecastBudget');
    const actualEl = document.getElementById('forecastActual');
    const projectedEl = document.getElementById('forecastProjected');
    const recoveryEl = document.getElementById('forecastRecovery');
    if (!headlineEl) return;

    const setup = readSetup();
    const state = readMoneyState();
    const budget = monthlyBudget(state, setup);

    if (budget === null) {
      headlineEl.textContent = 'Set your income to see this';
      subtextEl.textContent = 'Once your income and pay frequency are set, this shows whether you are on track to stay within budget this month.';
      breakdownEl.style.display = 'none';
      recoveryEl.innerHTML = '';
      return;
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const { spent, waste, unsure } = monthToDateTotals(state.transactions, now);
    const projected = dayOfMonth > 0 ? (spent / dayOfMonth) * daysInMonth : spent;
    const shortfall = Math.round((projected - budget) * 100) / 100;

    breakdownEl.style.display = '';
    budgetEl.textContent = money(budget);
    actualEl.textContent = money(spent);
    projectedEl.textContent = money(projected);

    if (shortfall > 0) {
      headlineEl.textContent = `Projected to go ${money(shortfall)} over budget this month`;
      subtextEl.textContent = `At your current spending rate, day ${dayOfMonth} of ${daysInMonth}, you're projected to spend ${money(projected)} against a ${money(budget)} budget.`;

      const remainingDays = Math.max(0, daysInMonth - dayOfMonth);
      const remainingBudget = Math.round((budget - spent) * 100) / 100;
      const actions = [];
      if (remainingDays > 0) {
        const dailyPace = Math.round((remainingBudget / remainingDays) * 100) / 100;
        actions.push(dailyPace >= 0
          ? `Keep spending under ${money(dailyPace)} a day for the rest of the month to get back on budget.`
          : `Even spending nothing for the rest of the month won't close the gap — you're already ${money(-remainingBudget)} over.`);
      }
      if (waste > 0) actions.push(`You've marked ${money(waste)} as Waste this month — cutting that closes part of the gap.`);
      if (unsure > 0) actions.push(`${money(unsure)} is still marked Unsure this month — deciding on those in Review may free up budget.`);
      recoveryEl.innerHTML = `<p class="eyebrow">RECOVERY ACTIONS</p><ul>${actions.map(a => `<li>${a}</li>`).join('')}</ul>`;
    } else {
      headlineEl.textContent = 'On track to stay within budget this month';
      subtextEl.textContent = `At your current spending rate, day ${dayOfMonth} of ${daysInMonth}, you're projected to spend ${money(projected)} against a ${money(budget)} budget.`;
      recoveryEl.innerHTML = '';
    }
  }

  let renderQueued = false;
  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(() => {
      renderQueued = false;
      render();
    }, 0);
  }

  const previousSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const result = previousSetItem.call(this, key, value);
    if (key === STORAGE_KEY || key === SETUP_STORAGE_KEY) queueRender();
    return result;
  };

  render();
  document.addEventListener('DOMContentLoaded', render);
})();
