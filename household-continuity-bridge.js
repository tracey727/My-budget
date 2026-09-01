(() => {
  'use strict';

  // Household continuity and financial-change controls, added 1 Sept 2026
  // (Phase 16 -- Phase 18 in docs/BUILD_ARCHIVE.md's roadmap):
  //
  // 1. Fees and interest monitoring: flags transactions that look like an
  //    account fee or interest charge (by matching common wording in the
  //    merchant/category text) and totals them for the current year, so
  //    recurring fees don't just blend into "Other" spending unnoticed.
  //    This is a heuristic over free-text the user typed, not a confirmed
  //    classification -- worded as "possible" throughout for that reason.
  // 2. A direct-debit/account-change checklist: pick any account and see
  //    everything currently linked to it (bills, subscriptions, debt
  //    repayments, and transactions marked recurring) before switching
  //    banks or closing it, so nothing gets missed and left unpaid.
  //
  // Read-only; writes nothing to storage. app.js is not modified.

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const FEE_KEYWORDS = ['fee', 'interest', 'overdraft', 'surcharge', 'penalty', 'late payment', 'dishonour', 'dishonor'];

  function readMoneyState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        debtCommitments: Array.isArray(parsed.debtCommitments) ? parsed.debtCommitments : [],
      };
    } catch {
      return { accounts: [], transactions: [], subscriptions: [], bills: [], debtCommitments: [] };
    }
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value) || 0);
  }

  function parseAmount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[ch]));
  }

  function looksLikeFeeOrInterest(transaction) {
    const text = `${transaction?.merchant || ''} ${transaction?.category || ''}`.toLowerCase();
    return FEE_KEYWORDS.some(keyword => text.includes(keyword));
  }

  function feesThisYear(transactions) {
    const thisYear = String(new Date().getFullYear());
    return transactions.filter(t => t && t.type === 'expense' && typeof t.date === 'string' && t.date.slice(0, 4) === thisYear && looksLikeFeeOrInterest(t));
  }

  function renderFeeMonitor() {
    const totalEl = document.getElementById('feeMonitorTotal');
    const listEl = document.getElementById('feeMonitorList');
    if (!totalEl && !listEl) return;

    const state = readMoneyState();
    const detected = feesThisYear(state.transactions);
    const total = detected.reduce((sum, t) => sum + parseAmount(t.amount), 0);

    if (totalEl) totalEl.textContent = money(total);
    if (!listEl) return;

    if (!detected.length) {
      listEl.className = 'stack-list empty-state';
      listEl.textContent = 'No transactions look like fees or interest so far this year.';
      return;
    }
    listEl.className = 'stack-list';
    listEl.innerHTML = detected
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map(t => `
        <div class="list-row">
          <span>
            <span class="row-title">${escapeHtml(t.merchant || 'Unnamed transaction')}</span>
            <span class="row-meta">${escapeHtml(t.date || '')} • possible fee or interest charge</span>
          </span>
          <span class="row-amount expense">${money(t.amount)}</span>
        </div>
      `).join('');
  }

  function linkedItemsForAccount(state, accountId) {
    return {
      bills: state.bills.filter(b => b && b.accountId === accountId),
      subscriptions: state.subscriptions.filter(s => s && s.accountId === accountId),
      debtCommitments: state.debtCommitments.filter(c => c && c.accountId === accountId),
      recurringTransactions: (() => {
        const seen = new Map();
        for (const t of state.transactions) {
          if (!t || t.accountId !== accountId || t.recurringStatus !== 'recurring') continue;
          const key = (t.merchant || '').trim().toLowerCase() || t.id;
          if (!seen.has(key)) seen.set(key, t);
        }
        return [...seen.values()];
      })(),
    };
  }

  function renderAccountOptions() {
    const select = document.getElementById('continuityAccount');
    if (!select) return;
    const state = readMoneyState();
    const previousValue = select.value;
    select.innerHTML = state.accounts.length
      ? state.accounts.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('')
      : '<option value="">Add an account first</option>';
    if (state.accounts.some(a => a.id === previousValue)) select.value = previousValue;
  }

  function renderChecklist() {
    const select = document.getElementById('continuityAccount');
    const listEl = document.getElementById('continuityChecklist');
    if (!select || !listEl) return;

    renderAccountOptions();
    const state = readMoneyState();
    const accountId = select.value;
    if (!accountId) {
      listEl.className = 'stack-list empty-state';
      listEl.textContent = 'Add an account to see what is linked to it.';
      return;
    }

    const linked = linkedItemsForAccount(state, accountId);
    const rows = [];
    linked.bills.forEach(b => rows.push({ title: b.billName || 'Bill', meta: `Bill • ${b.frequency || ''}` }));
    linked.subscriptions.forEach(s => rows.push({ title: s.name || 'Subscription', meta: `Subscription • ${s.cycle || ''}` }));
    linked.debtCommitments.forEach(() => rows.push({ title: 'Debt repayment', meta: 'Debt repayment commitment' }));
    linked.recurringTransactions.forEach(t => rows.push({ title: t.merchant || 'Recurring payment', meta: 'Marked as recurring' }));

    if (!rows.length) {
      listEl.className = 'stack-list empty-state';
      listEl.textContent = 'Nothing recorded is linked to this account yet.';
      return;
    }
    listEl.className = 'stack-list';
    listEl.innerHTML = rows.map(r => `
      <div class="list-row">
        <span>
          <span class="row-title">${escapeHtml(r.title)}</span>
          <span class="row-meta">${escapeHtml(r.meta)}</span>
        </span>
      </div>
    `).join('');
  }

  function bindAccountSelect() {
    const select = document.getElementById('continuityAccount');
    if (!select || select.dataset.continuityBound === 'true') return;
    select.dataset.continuityBound = 'true';
    select.addEventListener('change', renderChecklist);
  }

  function render() {
    renderFeeMonitor();
    bindAccountSelect();
    renderChecklist();
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
