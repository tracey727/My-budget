(() => {
  'use strict';

  // Safe-to-Spend engine, added 1 Sept 2026.
  // Implements the core financial rule in docs/PRODUCT_CONTRACT.md:
  // "A displayed bank balance must never be treated as the user's
  // safe-to-spend amount." Formula (per pay cycle):
  //   Income
  //   minus Smooth-My-Bills contributions (actively reserved each pay)
  //   minus debt-repayment commitments
  //   minus savings-goal required contributions
  //   = Actually Safe to Spend
  // Deliberately excludes: Hold-My-Money bill targets (the contract says
  // that money stays the user's until the bill is due -- the alert system
  // already communicates catch-up separately) and the emergency buffer
  // (shown as "protected" in Core Balances, not treated as a recurring
  // cost here, to avoid double-counting). This bridge only reads existing
  // state; it writes nothing. app.js is not modified.

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const PAY_PERIODS_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };
  const PAY_CYCLE_DAYS = { weekly: 7, fortnightly: 14, monthly: 30.436875 };
  const PAY_FREQUENCY_LABELS = { weekly: 'week', fortnightly: 'fortnight', monthly: 'month' };

  function readMoneyState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        debtCommitments: Array.isArray(parsed.debtCommitments) ? parsed.debtCommitments : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      };
    } catch {
      return { bills: [], debtCommitments: [], savingsGoals: [] };
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

  // Converts an amount at one regular frequency into the equivalent amount
  // at a different regular frequency, via annual cost. Same technique used
  // by debt-commitments-bridge.js and the existing bill-smoothing logic.
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

  function debtTotal(debtCommitments, payFrequency) {
    return debtCommitments.reduce((sum, c) => sum + amountPerFrequency(Number(c.requiredPayment) || 0, c.frequency, payFrequency), 0);
  }

  function savingsTotal(savingsGoals, payFrequency) {
    return savingsGoals.reduce((sum, goal) => {
      const weekly = Number(goal.requiredWeeklyAmount) || 0;
      return sum + amountPerFrequency(weekly, 'weekly', payFrequency);
    }, 0);
  }

  function render() {
    const headlineEl = document.getElementById('safeToSpendHeadline');
    const subtextEl = document.getElementById('safeToSpendSubtext');
    const breakdownEl = document.getElementById('safeToSpendBreakdown');
    const weekEl = document.getElementById('safeToSpendWeek');
    const todayEl = document.getElementById('safeToSpendToday');
    const detailEl = document.getElementById('safeToSpendDetail');
    if (!headlineEl) return;

    const setup = readSetup();
    const payFrequency = setup?.payFrequency;
    const incomeAmount = Number(setup?.incomeAmount) || 0;

    if (!setup || !payFrequency) {
      headlineEl.textContent = 'Set your income to see this';
      subtextEl.textContent = 'Complete first-time setup, then enter your income below, to see what is actually safe to spend.';
      breakdownEl.style.display = 'none';
      detailEl.textContent = '';
      return;
    }

    if (payFrequency === 'irregular') {
      headlineEl.textContent = 'Irregular pay: no single safe-to-spend figure yet';
      subtextEl.textContent = 'With irregular pay there is no fixed cycle to calculate against. This will need its own approach in a later update.';
      breakdownEl.style.display = 'none';
      detailEl.textContent = '';
      return;
    }

    if (incomeAmount <= 0) {
      headlineEl.textContent = 'Set your income to see this';
      subtextEl.textContent = 'Enter what you expect to be paid in the "Your regular income" section below.';
      breakdownEl.style.display = 'none';
      detailEl.textContent = '';
      return;
    }

    const state = readMoneyState();
    const bills = smoothBillsTotal(state.bills);
    const debts = debtTotal(state.debtCommitments, payFrequency);
    const savings = savingsTotal(state.savingsGoals, payFrequency);
    const safeThisCycle = Math.round((incomeAmount - bills - debts - savings) * 100) / 100;
    const cycleLabel = PAY_FREQUENCY_LABELS[payFrequency];
    const cycleDays = PAY_CYCLE_DAYS[payFrequency];
    const safeThisWeek = Math.round((safeThisCycle / cycleDays) * 7 * 100) / 100;
    const safeToday = Math.round((safeThisWeek / 7) * 100) / 100;

    if (safeThisCycle < 0) {
      headlineEl.textContent = `${money(safeThisCycle)} this ${cycleLabel} — commitments exceed income`;
      subtextEl.textContent = 'Your bills, debts and savings commitments currently add up to more than your income this cycle. Worth reviewing them — this isn\'t a verdict, just what the numbers show.';
    } else {
      headlineEl.textContent = `${money(safeThisCycle)} this ${cycleLabel}`;
      subtextEl.textContent = 'Income minus your Smooth-bill contributions, debt repayments and savings commitments.';
    }
    breakdownEl.style.display = '';
    weekEl.textContent = money(safeThisWeek);
    todayEl.textContent = money(safeToday);
    detailEl.textContent = `From ${money(incomeAmount)} income: ${money(bills)} to bills, ${money(debts)} to debt repayments, ${money(savings)} to savings goals. Bill targets you're holding money for (not Smooth) and your emergency buffer are kept separate, shown in Core Balances.`;
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
