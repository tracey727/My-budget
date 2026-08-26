(() => {
  'use strict';

  const MONEY_STORAGE_KEY = 'every-cent-money-tracker-v1';
  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const REGULAR_PAY_FREQUENCIES = new Set(['weekly', 'fortnightly', 'monthly']);
  const PAY_PERIODS_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };
  const BILL_CYCLES_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, half_yearly: 2, yearly: 1, one_off: 1 };

  function roundMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100) / 100 : 0;
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(roundMoney(value));
  }

  function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function dateValue(value) {
    if (!validDate(value)) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function isoDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function readSetup() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETUP_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeSetup(setup) {
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify({ ...setup, updatedAt: new Date().toISOString() }));
  }

  function readMoneyState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MONEY_STORAGE_KEY) || '{}');
      return {
        ...parsed,
        version: Number(parsed.version || 1),
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      };
    } catch {
      return { version: 1, accounts: [], transactions: [], subscriptions: [], bills: [], savingsGoals: [] };
    }
  }

  function directWriteMoneyState(state) {
    localStorage[MONEY_STORAGE_KEY] = JSON.stringify(state);
  }

  function monthlyPayDate(anchor, offset, anchorDay = anchor.getUTCDate()) {
    const absoluteMonth = anchor.getUTCMonth() + offset;
    const targetYear = anchor.getUTCFullYear() + Math.floor(absoluteMonth / 12);
    const targetMonth = ((absoluteMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    return new Date(Date.UTC(targetYear, targetMonth, Math.min(anchorDay, lastDay)));
  }

  function payDateAt(anchor, payFrequency, offset, anchorDay = anchor.getUTCDate()) {
    if (payFrequency === 'weekly' || payFrequency === 'fortnightly') {
      const days = payFrequency === 'weekly' ? 7 : 14;
      return new Date(anchor.getTime() + (offset * days * 86_400_000));
    }
    if (payFrequency === 'monthly') return monthlyPayDate(anchor, offset, anchorDay);
    return null;
  }

  function rollNextPayDate(nextPayDate, payFrequency, anchorDay) {
    const anchor = dateValue(nextPayDate);
    const today = dateValue(todayIso());
    if (!anchor || !today || !REGULAR_PAY_FREQUENCIES.has(payFrequency)) return nextPayDate;
    if (anchor.getTime() >= today.getTime()) return nextPayDate;
    const day = Number(anchorDay) || anchor.getUTCDate();
    for (let offset = 1; offset < 600; offset += 1) {
      const candidate = payDateAt(anchor, payFrequency, offset, day);
      if (candidate && candidate.getTime() >= today.getTime()) return isoDate(candidate);
    }
    return nextPayDate;
  }

  function paysAvailableByDueDate(nextPayDate, dueDate, payFrequency, anchorDay) {
    const start = dateValue(nextPayDate);
    const due = dateValue(dueDate);
    if (!start || !due || !REGULAR_PAY_FREQUENCIES.has(payFrequency)) return null;
    if (due.getTime() < start.getTime()) return 0;
    const day = Number(anchorDay) || start.getUTCDate();
    let count = 0;
    for (let offset = 0; offset < 600; offset += 1) {
      const candidate = payDateAt(start, payFrequency, offset, day);
      if (!candidate || candidate.getTime() > due.getTime()) break;
      count += 1;
    }
    return count;
  }

  function annualBillCost(amount, frequency) {
    return roundMoney(roundMoney(amount) * (BILL_CYCLES_PER_YEAR[frequency] || 0));
  }

  function smoothContribution(bill, setup) {
    if (setup.payFrequency === 'irregular') return null;
    if (!REGULAR_PAY_FREQUENCIES.has(setup.payFrequency)) return null;
    const amount = roundMoney(bill.amount);
    const reserved = roundMoney(bill.amountReserved);
    const availablePays = paysAvailableByDueDate(setup.nextPayDate, bill.nextDueDate, setup.payFrequency, setup.payAnchorDay);
    if (availablePays !== null) {
      const remaining = roundMoney(Math.max(0, amount - reserved));
      if (remaining === 0) return 0;
      if (availablePays <= 0) return remaining;
      return roundMoney(remaining / availablePays);
    }
    return roundMoney(annualBillCost(amount, bill.frequency) / PAY_PERIODS_PER_YEAR[setup.payFrequency]);
  }

  function targetAlertStatus(bill, setup) {
    const target = roundMoney(bill.targetAmount ?? bill.amount);
    const reserved = roundMoney(bill.amountReserved);
    if (bill.paidStatus === 'paid' || target <= reserved || target <= 0) return 'green';
    const due = dateValue(bill.nextDueDate);
    const now = dateValue(todayIso());
    if (!due || !now) return 'green';
    if (due.getTime() < now.getTime()) return 'recovery';

    const created = dateValue(String(bill.createdAt || '').slice(0, 10)) || now;
    const total = Math.max(1, due.getTime() - created.getTime());
    const elapsed = Math.min(total, Math.max(0, now.getTime() - created.getTime()));
    const expectedReserved = roundMoney(target * (elapsed / total));
    const nextPay = dateValue(setup.nextPayDate);
    if (nextPay && due.getTime() <= nextPay.getTime() && target > reserved) return 'red';
    if (reserved + 0.01 >= expectedReserved || expectedReserved <= 0) return 'green';
    return reserved / expectedReserved < 0.5 ? 'red' : 'yellow';
  }

  function normalizePayAnchor(setup) {
    if (!setup || !REGULAR_PAY_FREQUENCIES.has(setup.payFrequency) || !validDate(setup.nextPayDate)) return setup;
    const original = dateValue(setup.nextPayDate);
    const anchorDay = Number(setup.payAnchorDay) || original.getUTCDate();
    const nextPayDate = rollNextPayDate(setup.nextPayDate, setup.payFrequency, anchorDay);
    if (anchorDay === Number(setup.payAnchorDay) && nextPayDate === setup.nextPayDate) return setup;
    const next = { ...setup, payAnchorDay: anchorDay, nextPayDate };
    if (next.firstMoneyPlan && typeof next.firstMoneyPlan === 'object') {
      next.firstMoneyPlan = { ...next.firstMoneyPlan, nextPayDate };
    }
    writeSetup(next);
    return next;
  }

  function refreshCommittedPlan() {
    let setup = readSetup();
    if (!setup?.completed || !['smooth', 'target'].includes(setup.billMode)) return;
    setup = normalizePayAnchor(setup);
    const state = readMoneyState();
    let changed = false;
    const bills = state.bills.map(bill => {
      if (!bill || !['smooth', 'target'].includes(bill.budgetingMethod)) return bill;
      const next = { ...bill };
      if (bill.budgetingMethod === 'smooth') {
        const contribution = smoothContribution(bill, setup) ?? 0;
        if (roundMoney(bill.requiredContribution) !== contribution) {
          next.requiredContribution = contribution;
          changed = true;
        }
      } else {
        const alertStatus = targetAlertStatus(bill, setup);
        if (bill.alertStatus !== alertStatus) {
          next.alertStatus = alertStatus;
          changed = true;
        }
      }
      return next;
    });
    if (changed) directWriteMoneyState({ ...state, bills });

    if (setup.firstMoneyPlan && setup.billMode === 'smooth') {
      const setupBillIds = new Set((Array.isArray(setup.bills) ? setup.bills : []).map(bill => bill.id));
      const firstPlanBills = bills.filter(bill => setupBillIds.has(bill.id));
      const regularPerPayBills = setup.payFrequency === 'irregular'
        ? null
        : roundMoney(firstPlanBills.reduce((sum, bill) => sum + roundMoney(bill.requiredContribution), 0));
      if (setup.firstMoneyPlan.regularPerPayBills !== regularPerPayBills) {
        writeSetup({ ...setup, firstMoneyPlan: { ...setup.firstMoneyPlan, regularPerPayBills } });
      }
    }
  }

  function dueAwareDraftPlan(setup) {
    const bills = Array.isArray(setup?.bills) ? setup.bills : [];
    return roundMoney(bills.reduce((sum, bill) => sum + (smoothContribution(bill, setup) ?? 0), 0));
  }

  function correctFirstPlanPresentation() {
    const setup = readSetup();
    if (!setup || setup.completed || Number(setup.step) !== 8 || setup.billMode !== 'smooth') return;
    const heading = [...document.querySelectorAll('.phase7-plan-card h2')].find(node => node.textContent.trim() === 'Smooth my bills');
    const card = heading?.closest('.phase7-plan-card');
    const copy = card?.querySelector('p');
    if (!copy) return;
    if (setup.payFrequency === 'irregular') {
      copy.textContent = 'Irregular pay: no fake fixed contribution has been created. Your bill targets remain ready and visible.';
      return;
    }
    copy.textContent = `${money(dueAwareDraftPlan(setup))} from each ${String(setup.payFrequency).toLowerCase()} pay across your current bills, adjusted to have each dated bill ready by its next due date.`;
  }

  function enforceNextPayInput() {
    const input = document.getElementById('phase7NextPayDate');
    if (!input || input.dataset.phase7DateGuard === 'true') return;
    input.dataset.phase7DateGuard = 'true';
    input.min = todayIso();
    const rejectPast = () => {
      if (input.value && validDate(input.value) && input.value < todayIso()) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const error = document.getElementById('phase7Error');
        if (error) error.textContent = 'Choose today or a future date for your next pay.';
      }
    };
    input.addEventListener('input', rejectPast);
    rejectPast();
  }

  function refreshSetupScreenIntegrity() {
    enforceNextPayInput();
    correctFirstPlanPresentation();
  }

  refreshCommittedPlan();

  document.addEventListener('DOMContentLoaded', () => {
    refreshSetupScreenIntegrity();
    const screen = document.getElementById('phase7Screen');
    if (screen) {
      new MutationObserver(refreshSetupScreenIntegrity).observe(screen, { childList: true, subtree: true });
    }

    document.addEventListener('click', event => {
      if (event.target?.id !== 'phase7Next') return;
      const setup = readSetup();
      if (!setup || Number(setup.step) !== 8 || setup.completed) return;
      // The setup runtime commits on the target/bubble phase and schedules its
      // reload after 120 ms. Correct the committed contribution/alert values in
      // the next task, before that reload occurs.
      setTimeout(refreshCommittedPlan, 0);
    }, true);
  });
})();
