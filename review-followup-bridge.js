(() => {
  'use strict';

  // 30-day follow-up review for transactions marked "Unsure", added 1 Sept 2026.
  // Per docs/PRODUCT_CONTRACT.md's expense-review flow (Yes / No / Maybe), an
  // "Unsure" transaction is meant to sit for about a month before the user
  // decides whether to keep treating it as worthwhile or call it a waste.
  // The review window is derived purely from the transaction's own date --
  // nothing new is written to storage until the user actually makes a
  // decision, so this file stays a read-mostly bridge like
  // dashboard-health-bridge.js, and does not modify app.js.

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const REVIEW_WINDOW_DAYS = 30;
  const DAY_MS = 86_400_000;

  function readMoneyState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      };
    } catch {
      return { transactions: [] };
    }
  }

  function writeTransactionWorth(transactionId, worth) {
    let state;
    try {
      state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return;
    }
    if (!Array.isArray(state.transactions)) return;
    const target = state.transactions.find(t => t && t.id === transactionId);
    if (!target) return;
    target.worth = worth;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function daysSince(date) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    return Math.floor((today.getTime() - date.getTime()) / DAY_MS);
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[ch]));
  }

  function unsureTransactionsWithAge(transactions) {
    return transactions
      .filter(t => t && t.type === 'expense' && t.worth === 'unsure')
      .map(t => {
        const date = parseDate(t.date);
        const age = date ? daysSince(date) : 0;
        return { transaction: t, age, daysRemaining: Math.max(0, REVIEW_WINDOW_DAYS - age) };
      })
      .sort((a, b) => b.age - a.age);
  }

  function renderList(container, items, options) {
    if (!items.length) {
      container.className = 'stack-list empty-state';
      container.textContent = options.emptyText;
      return;
    }
    container.className = 'stack-list';
    container.innerHTML = items.map(({ transaction, age, daysRemaining }) => `
      <div class="list-row" data-review-transaction="${escapeHtml(transaction.id)}">
        <span>
          <span class="row-title">${escapeHtml(transaction.merchant || transaction.category || 'Unsure spend')}</span>
          <span class="row-meta">${escapeHtml(options.metaFor(age, daysRemaining))}</span>
        </span>
        <span class="row-amount expense">${money(transaction.amount)}</span>
      </div>
      ${options.dueNow ? `
      <div class="review-actions" style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-review-keep="${escapeHtml(transaction.id)}">Yes, keep it</button>
        <button type="button" class="secondary-button" data-review-waste="${escapeHtml(transaction.id)}">No, it was a waste</button>
      </div>` : ''}
    `).join('');

    if (options.dueNow) {
      container.querySelectorAll('[data-review-keep]').forEach(btn => {
        btn.addEventListener('click', () => {
          writeTransactionWorth(btn.dataset.reviewKeep, 'worth');
        });
      });
      container.querySelectorAll('[data-review-waste]').forEach(btn => {
        btn.addEventListener('click', () => {
          writeTransactionWorth(btn.dataset.reviewWaste, 'waste');
        });
      });
    }
  }

  function render() {
    const dueContainer = document.getElementById('thirtyDayReviewDueList');
    const pendingContainer = document.getElementById('thirtyDayReviewPendingList');
    if (!dueContainer && !pendingContainer) return;

    const state = readMoneyState();
    const withAge = unsureTransactionsWithAge(state.transactions);
    const due = withAge.filter(item => item.age >= REVIEW_WINDOW_DAYS);
    const pending = withAge.filter(item => item.age < REVIEW_WINDOW_DAYS);

    if (dueContainer) {
      renderList(dueContainer, due, {
        emptyText: 'Nothing is ready for a second look yet.',
        metaFor: (age) => `Marked Unsure ${age} day${age === 1 ? '' : 's'} ago`,
        dueNow: true,
      });
    }
    if (pendingContainer) {
      renderList(pendingContainer, pending, {
        emptyText: 'No Unsure items are currently being watched.',
        metaFor: (age, daysRemaining) => `Review in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
        dueNow: false,
      });
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
