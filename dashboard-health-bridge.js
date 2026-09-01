(() => {
  'use strict';

  // Dashboard-level Green/Yellow/Red/Recovery health indicator, added 1 Sept 2026.
  // Rolls up the existing per-bill alertStatus values (computed by
  // phase7-plan-integrity-bridge.js) into a single overall status shown on the
  // dashboard, per the GENEVIEVE colour alert system in docs/PRODUCT_CONTRACT.md.
  // This file deliberately does not modify the protected app.js runtime; it
  // reads the same shared storage and layers its own DOM updates on top,
  // following the same pattern as the existing phase7-*-bridge.js files.

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const ALERT_PRIORITY = { green: 0, yellow: 1, red: 2, recovery: 3 };
  const ALERT_LABELS = { green: 'On target', yellow: 'Watch', red: 'Falling behind', recovery: 'Recovery' };
  const ALERT_PILL_CLASS = { green: 'good', yellow: 'warning', red: 'danger', recovery: 'info' };

  function readMoneyState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      };
    } catch {
      return { bills: [], transactions: [] };
    }
  }

  function unpaidBills(bills) {
    return bills.filter(bill => bill && bill.paidStatus !== 'paid');
  }

  function overallHealthStatus(bills) {
    const unpaid = unpaidBills(bills);
    let worst = 'green';
    for (const bill of unpaid) {
      const status = Object.hasOwn(ALERT_PRIORITY, bill.alertStatus) ? bill.alertStatus : 'green';
      if (ALERT_PRIORITY[status] > ALERT_PRIORITY[worst]) worst = status;
    }
    return worst;
  }

  function attentionCount(bills) {
    return unpaidBills(bills).filter(bill => ['yellow', 'red', 'recovery'].includes(bill.alertStatus)).length;
  }

  function healthHint(status, count, billCount) {
    if (billCount === 0) return 'Add a bill to start tracking your alerts.';
    if (status === 'green') return 'All bills are on target.';
    const noun = count === 1 ? 'bill needs' : 'bills need';
    if (status === 'recovery') return `${count} ${noun} recovery — see Bills for the exact adjustment.`;
    if (status === 'red') return `${count} ${noun} attention now.`;
    return `${count} ${noun} watching.`;
  }

  function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function annualWasteProjection(transactions) {
    const month = currentMonthKey();
    const monthlyWaste = transactions
      .filter(t => t && t.type === 'expense' && String(t.date || '').slice(0, 7) === month && ['waste', 'unsure'].includes(t.worth))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return Math.round(monthlyWaste * 12 * 100) / 100;
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value) || 0);
  }

  function render() {
    const state = readMoneyState();
    const status = overallHealthStatus(state.bills);
    const count = attentionCount(state.bills);

    const valueEl = document.getElementById('healthStatusValue');
    if (valueEl) {
      valueEl.textContent = ALERT_LABELS[status];
      valueEl.className = `hero-number pill ${ALERT_PILL_CLASS[status]}`;
    }
    const hintEl = document.getElementById('healthStatusHint');
    if (hintEl) hintEl.textContent = healthHint(status, count, state.bills.length);

    const wasteHintEl = document.getElementById('wasteMonthHint');
    if (wasteHintEl) {
      const annual = annualWasteProjection(state.transactions);
      wasteHintEl.textContent = annual > 0
        ? `Items you marked Waste or Unsure. At this rate, about ${money(annual)} a year.`
        : 'Items you marked Waste or Unsure.';
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
    if (key === STORAGE_KEY) queueRender();
    return result;
  };

  render();
  document.addEventListener('DOMContentLoaded', render);
})();
