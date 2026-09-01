(() => {
  'use strict';

  // Debt-repayment commitment tracking, added 1 Sept 2026.
  // Closes the second missing input for the Safe-to-Spend engine
  // (docs/PRODUCT_CONTRACT.md): debt accounts (credit/loan/BNPL) already
  // exist, but nothing tracked what the user is actually committed to
  // repaying each pay cycle. This is genuine new data (debtCommitments),
  // not a derived view, so -- following the exact same pattern already
  // used to protect `bills` (phase2-data-runtime.js) and `savingsGoals`
  // (phase2-subscriptions-savings-runtime.js) -- this bridge chains its
  // own Storage.prototype.setItem patch, loaded after both of those, to
  // stop debtCommitments being silently dropped whenever app.js or the
  // other runtimes save a write that doesn't know the field exists.
  // app.js itself is not modified.

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const LIABILITY_TYPES = new Set(['credit', 'loan', 'bnpl']);
  const REPAYMENT_FREQUENCIES = new Set(['weekly', 'fortnightly', 'monthly']);
  const PAY_PERIODS_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function parseAmount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100) / 100 : 0;
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[ch]));
  }

  function normalizeDebtCommitment(commitment = {}) {
    return {
      id: String(commitment.id || uid('debt')),
      accountId: String(commitment.accountId || ''),
      requiredPayment: parseAmount(commitment.requiredPayment),
      frequency: REPAYMENT_FREQUENCIES.has(commitment.frequency) ? commitment.frequency : 'fortnightly',
      nextDueDate: String(commitment.nextDueDate || ''),
      createdAt: String(commitment.createdAt || new Date().toISOString()),
    };
  }

  // Converts a repayment's own frequency into the equivalent amount per
  // occurrence of a *different* target frequency (e.g. a monthly card
  // minimum expressed as a fortnightly figure), by going via its annual cost.
  function amountPerFrequency(amount, fromFrequency, toFrequency) {
    const fromPeriods = PAY_PERIODS_PER_YEAR[fromFrequency];
    const toPeriods = PAY_PERIODS_PER_YEAR[toFrequency];
    if (!fromPeriods || !toPeriods) return amount;
    const annual = amount * fromPeriods;
    return Math.round((annual / toPeriods) * 100) / 100;
  }

  function readFullState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        version: Number(parsed.version || 1),
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
        debtCommitments: Array.isArray(parsed.debtCommitments) ? parsed.debtCommitments.map(normalizeDebtCommitment) : [],
      };
    } catch {
      return { version: 1, accounts: [], transactions: [], subscriptions: [], bills: [], savingsGoals: [], debtCommitments: [] };
    }
  }

  function writeDebtCommitments(commitments) {
    const state = readFullState();
    state.debtCommitments = commitments.map(normalizeDebtCommitment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function liabilityAccounts(accounts) {
    return accounts.filter(a => a && LIABILITY_TYPES.has(a.type));
  }

  function renderAccountOptions() {
    const select = document.getElementById('debtCommitmentAccount');
    if (!select) return;
    const state = readFullState();
    const accounts = liabilityAccounts(state.accounts);
    const previousValue = select.value;
    select.innerHTML = accounts.length
      ? accounts.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('')
      : '<option value="">Add a credit card, loan or BNPL account first</option>';
    if (accounts.some(a => a.id === previousValue)) select.value = previousValue;
  }

  function accountName(accounts, accountId) {
    return accounts.find(a => a.id === accountId)?.name || 'Unknown account';
  }

  function render() {
    const listEl = document.getElementById('debtCommitmentList');
    const totalEl = document.getElementById('debtCommitmentTotal');
    if (!listEl && !totalEl) return;

    renderAccountOptions();
    const state = readFullState();
    const commitments = state.debtCommitments;

    if (totalEl) {
      const referenceFrequency = 'fortnightly';
      const total = commitments.reduce((sum, c) => sum + amountPerFrequency(c.requiredPayment, c.frequency, referenceFrequency), 0);
      totalEl.textContent = `${money(total)} / fortnight`;
    }

    if (listEl) {
      if (!commitments.length) {
        listEl.className = 'stack-list empty-state';
        listEl.textContent = 'No debt repayments recorded yet.';
        return;
      }
      listEl.className = 'stack-list';
      listEl.innerHTML = commitments.map(c => `
        <div class="list-row">
          <span>
            <span class="row-title">${escapeHtml(accountName(state.accounts, c.accountId))}</span>
            <span class="row-meta">${escapeHtml(c.frequency)}${c.nextDueDate ? ` • next due ${escapeHtml(c.nextDueDate)}` : ''}</span>
          </span>
          <span class="row-amount expense">${money(c.requiredPayment)}</span>
        </div>
        <div style="display:flex; gap:8px; margin: -4px 0 12px;">
          <button type="button" class="secondary-button" data-debt-remove="${escapeHtml(c.id)}">Remove</button>
        </div>
      `).join('');
      listEl.querySelectorAll('[data-debt-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          const remaining = readFullState().debtCommitments.filter(c => c.id !== btn.dataset.debtRemove);
          writeDebtCommitments(remaining);
        });
      });
    }
  }

  function bindSaveButton() {
    const saveButton = document.getElementById('debtCommitmentSave');
    if (!saveButton || saveButton.dataset.debtBridgeBound === 'true') return;
    saveButton.dataset.debtBridgeBound = 'true';
    saveButton.addEventListener('click', () => {
      const accountId = document.getElementById('debtCommitmentAccount')?.value || '';
      const amount = parseAmount(document.getElementById('debtCommitmentAmount')?.value);
      const frequency = document.getElementById('debtCommitmentFrequency')?.value || 'fortnightly';
      const nextDueDate = document.getElementById('debtCommitmentDueDate')?.value || '';
      if (!accountId) return;
      if (amount <= 0) return;
      const commitments = readFullState().debtCommitments;
      commitments.push(normalizeDebtCommitment({ accountId, requiredPayment: amount, frequency, nextDueDate }));
      writeDebtCommitments(commitments);
      const amountInput = document.getElementById('debtCommitmentAmount');
      if (amountInput) amountInput.value = '';
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
    if (key !== STORAGE_KEY) return previousSetItem.call(this, key, value);
    let nextValue = value;
    try {
      const next = JSON.parse(value);
      if (!Array.isArray(next.debtCommitments)) {
        const previous = readFullState();
        next.debtCommitments = previous.debtCommitments;
      }
      nextValue = JSON.stringify(next);
    } catch {
      nextValue = value;
    }
    const result = previousSetItem.call(this, key, nextValue);
    queueRender();
    return result;
  };

  function init() {
    bindSaveButton();
    render();
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();
