(() => {
  'use strict';

  // Expected recurring income tracking, added 1 Sept 2026.
  // Closes part of the Phase 9 gap ("next-income calculation"): the app
  // already knows *when* the user is next paid (payFrequency/nextPayDate,
  // kept rolled forward by phase7-plan-integrity-bridge.js) but not *how
  // much*. This is a required input for the Safe-to-Spend engine
  // (docs/PRODUCT_CONTRACT.md), which starts from Income and must not be
  // built on a guess. Reads/writes the existing setup storage key directly
  // (it has no protective merge patch, unlike the money-tracker key), and
  // does not modify app.js or phase7-first-time-setup.js.

  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const PAY_FREQUENCY_LABELS = {
    weekly: 'Paid weekly',
    fortnightly: 'Paid fortnightly',
    monthly: 'Paid monthly',
    irregular: 'Irregular pay — no fixed cycle',
  };

  function readSetup() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETUP_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeIncomeAmount(amount) {
    const setup = readSetup() || {};
    const next = { ...setup, incomeAmount: amount, updatedAt: new Date().toISOString() };
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(next));
  }

  function parseAmount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100) / 100 : 0;
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
  }

  function render() {
    const amountInput = document.getElementById('incomeAmount');
    const frequencyLabel = document.getElementById('incomeFrequencyLabel');
    const nextPayEl = document.getElementById('incomeNextPay');
    if (!amountInput && !frequencyLabel && !nextPayEl) return;

    const setup = readSetup();
    const incomeAmount = setup ? parseAmount(setup.incomeAmount) : 0;
    const payFrequency = setup?.payFrequency;
    const nextPayDate = setup?.nextPayDate;

    if (amountInput && document.activeElement !== amountInput) {
      amountInput.value = incomeAmount > 0 ? incomeAmount : '';
    }
    if (frequencyLabel) {
      frequencyLabel.textContent = PAY_FREQUENCY_LABELS[payFrequency] || 'Complete first-time setup to set your pay frequency';
    }
    if (nextPayEl) {
      const formattedDate = formatDate(nextPayDate);
      if (incomeAmount > 0 && formattedDate) {
        nextPayEl.textContent = `${money(incomeAmount)} on ${formattedDate}`;
      } else if (formattedDate) {
        nextPayEl.textContent = `Next pay ${formattedDate} — amount not set`;
      } else {
        nextPayEl.textContent = '—';
      }
    }
  }

  function bindSaveButton() {
    const saveButton = document.getElementById('incomeAmountSave');
    const amountInput = document.getElementById('incomeAmount');
    if (!saveButton || !amountInput || saveButton.dataset.incomeBridgeBound === 'true') return;
    saveButton.dataset.incomeBridgeBound = 'true';
    saveButton.addEventListener('click', () => {
      writeIncomeAmount(parseAmount(amountInput.value));
    });
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
    if (key === SETUP_STORAGE_KEY) queueRender();
    return result;
  };

  function init() {
    bindSaveButton();
    render();
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();
