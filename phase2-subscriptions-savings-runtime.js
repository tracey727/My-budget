(() => {
  'use strict';

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const CYCLE_MULTIPLIERS = { weekly: 52, fortnightly: 26, monthly: 12, yearly: 1 };
  const SUBSCRIPTION_DECISIONS = {
    keep: 'Keep',
    cancel: 'Cancel',
    maybe: 'Maybe',
    another_month: 'Another month',
    pause: 'Pause',
    review_next_charge: 'Review next charge'
  };

  const previousSetItem = Storage.prototype.setItem;
  let runtimeReady = false;
  let refreshQueued = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function parseMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100) / 100 : 0;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function todayIso() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        version: Number(parsed.version || 1),
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : []
      };
    } catch {
      return { version: 1, accounts: [], transactions: [], subscriptions: [], bills: [], savingsGoals: [] };
    }
  }

  function directWriteState(state) {
    const next = {
      version: Number(state.version || 1),
      accounts: Array.isArray(state.accounts) ? state.accounts : [],
      transactions: Array.isArray(state.transactions) ? state.transactions : [],
      subscriptions: Array.isArray(state.subscriptions) ? state.subscriptions.map(normalizeSubscription) : [],
      bills: Array.isArray(state.bills) ? state.bills : [],
      savingsGoals: Array.isArray(state.savingsGoals) ? state.savingsGoals.map(normalizeSavingsGoal) : []
    };
    // Web Storage named-property assignment intentionally bypasses the two
    // staged setItem wrappers while preserving the complete combined state.
    localStorage[STORAGE_KEY] = JSON.stringify(next);
  }

  function annualSubscriptionCost(amount, cycle) {
    const frequency = Object.hasOwn(CYCLE_MULTIPLIERS, cycle) ? cycle : 'monthly';
    return Math.round(parseMoney(amount) * CYCLE_MULTIPLIERS[frequency] * 100) / 100;
  }

  function normalizeSubscription(subscription = {}) {
    const cycle = Object.hasOwn(CYCLE_MULTIPLIERS, subscription.cycle || subscription.frequency) ? (subscription.cycle || subscription.frequency) : 'monthly';
    const decision = Object.hasOwn(SUBSCRIPTION_DECISIONS, subscription.decision) ? subscription.decision : 'maybe';
    const amount = parseMoney(subscription.amount);
    return {
      ...subscription,
      id: String(subscription.id || uid('sub')),
      name: String(subscription.name || subscription.subscription || '').trim(),
      amount,
      cycle,
      frequency: cycle,
      nextDate: String(subscription.nextDate || subscription.nextCharge || ''),
      nextCharge: String(subscription.nextCharge || subscription.nextDate || ''),
      accountId: String(subscription.accountId || subscription.account || ''),
      autoRenew: subscription.autoRenew === true || subscription.autoRenew === 'yes',
      usage: String(subscription.usage || '').trim(),
      annualCost: annualSubscriptionCost(amount, cycle),
      decision,
      createdAt: String(subscription.createdAt || new Date().toISOString())
    };
  }

  function subscriptionFormExtras() {
    const dialog = $('#subscriptionDialog');
    if (!dialog?.open) return null;
    return {
      id: $('#subscriptionId')?.value || '',
      autoRenew: $('#subscriptionAutoRenew')?.value === 'yes',
      usage: String($('#subscriptionUsage')?.value || '').trim(),
      decision: Object.hasOwn(SUBSCRIPTION_DECISIONS, $('#subscriptionDecision')?.value) ? $('#subscriptionDecision').value : 'maybe'
    };
  }

  function mergeSubscriptionAndSavingsFields(value) {
    const next = JSON.parse(value);
    const previous = readState();
    const previousSubscriptions = new Map(previous.subscriptions.map(subscription => [subscription.id, subscription]));

    next.savingsGoals = previous.savingsGoals;
    next.subscriptions = (Array.isArray(next.subscriptions) ? next.subscriptions : []).map(subscription => {
      const previousRecord = previousSubscriptions.get(subscription.id) || {};
      return normalizeSubscription({ ...previousRecord, ...subscription });
    });

    const extras = subscriptionFormExtras();
    if (extras && next.subscriptions.length) {
      const target = extras.id ? next.subscriptions.find(subscription => subscription.id === extras.id) : next.subscriptions[next.subscriptions.length - 1];
      if (target) Object.assign(target, normalizeSubscription({ ...target, ...extras, id: target.id }));
    }

    return JSON.stringify(next);
  }

  Storage.prototype.setItem = function linkedSetItem(key, value) {
    if (key !== STORAGE_KEY) return previousSetItem.call(this, key, value);
    let nextValue = value;
    try {
      nextValue = mergeSubscriptionAndSavingsFields(value);
    } catch {
      nextValue = value;
    }
    const result = previousSetItem.call(this, key, nextValue);
    queueRefresh();
    return result;
  };

  function parseDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function currentDateOnly() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  function savingsProgress(target, currentAmount) {
    const targetAmount = parseMoney(target);
    const current = parseMoney(currentAmount);
    if (targetAmount <= 0) return 0;
    return Math.round(Math.min(100, (current / targetAmount) * 100) * 100) / 100;
  }

  function requiredSavingsContribution(target, currentAmount, deadline, periodDays) {
    const targetAmount = parseMoney(target);
    const current = parseMoney(currentAmount);
    const gap = Math.max(0, targetAmount - current);
    if (gap === 0) return 0;
    const deadlineDate = parseDateOnly(deadline);
    if (!deadlineDate) return 0;
    const daysRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - currentDateOnly().getTime()) / 86_400_000));
    const periodsRemaining = Math.max(1, Math.ceil(daysRemaining / periodDays));
    return Math.round((gap / periodsRemaining) * 100) / 100;
  }

  function normalizeSavingsGoal(goal = {}) {
    const target = parseMoney(goal.target);
    const currentAmount = parseMoney(goal.currentAmount ?? goal.current);
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(goal.deadline || '')) ? String(goal.deadline) : '';
    return {
      ...goal,
      id: String(goal.id || goal.goalId || uid('goal')),
      goal: String(goal.goal || goal.name || '').trim(),
      target,
      currentAmount,
      deadline,
      requiredWeeklyAmount: requiredSavingsContribution(target, currentAmount, deadline, 7),
      requiredFortnightlyAmount: requiredSavingsContribution(target, currentAmount, deadline, 14),
      progress: savingsProgress(target, currentAmount),
      protected: goal.protected === true || goal.protected === 'yes',
      notes: String(goal.notes || '').trim(),
      createdAt: String(goal.createdAt || new Date().toISOString())
    };
  }

  function migrateExtendedState() {
    const state = readState();
    state.subscriptions = state.subscriptions.map(normalizeSubscription);
    state.savingsGoals = state.savingsGoals.map(normalizeSavingsGoal);
    directWriteState(state);
  }

  function installSubscriptionSupport() {
    const form = $('#subscriptionForm');
    const annualPreview = $('.annual-preview', form);
    if (!form || !annualPreview || $('#subscriptionExtensionFields')) return;

    const fields = document.createElement('div');
    fields.id = 'subscriptionExtensionFields';
    fields.className = 'form-grid';
    fields.innerHTML = `
      <label>Auto-renew
        <select id="subscriptionAutoRenew"><option value="no">No</option><option value="yes">Yes</option></select>
      </label>
      <label>Decision
        <select id="subscriptionDecision">
          <option value="keep">Keep</option>
          <option value="cancel">Cancel</option>
          <option value="maybe">Maybe</option>
          <option value="another_month">Another month</option>
          <option value="pause">Pause</option>
          <option value="review_next_charge">Review next charge</option>
        </select>
      </label>
      <label class="full">Usage
        <input id="subscriptionUsage" type="text" maxlength="160" placeholder="How often you actually use it" />
      </label>`;
    annualPreview.insertAdjacentElement('beforebegin', fields);
    const previewLabel = $('span', annualPreview);
    if (previewLabel) previewLabel.textContent = 'Annual cost';

    const observer = new MutationObserver(() => {
      if ($('#subscriptionDialog')?.open) setTimeout(loadSubscriptionExtras, 0);
    });
    observer.observe($('#subscriptionDialog'), { attributes: true, attributeFilter: ['open'] });
  }

  function loadSubscriptionExtras() {
    const id = $('#subscriptionId')?.value || '';
    const subscription = id ? readState().subscriptions.find(item => item.id === id) : null;
    const normalized = normalizeSubscription(subscription || { id: '', decision: 'maybe' });
    if ($('#subscriptionAutoRenew')) $('#subscriptionAutoRenew').value = normalized.autoRenew ? 'yes' : 'no';
    if ($('#subscriptionUsage')) $('#subscriptionUsage').value = normalized.usage || '';
    if ($('#subscriptionDecision')) $('#subscriptionDecision').value = normalized.decision;
  }

  function refreshSubscriptionPresentation() {
    const state = readState();
    $$('[data-subscription-id]').forEach(row => {
      const subscription = state.subscriptions.find(item => item.id === row.dataset.subscriptionId);
      if (!subscription) return;
      const normalized = normalizeSubscription(subscription);
      const account = state.accounts.find(item => item.id === normalized.accountId)?.name || 'Payment source unknown';
      const nextCharge = normalized.nextCharge ? ` • next ${normalized.nextCharge}` : '';
      const usage = normalized.usage ? ` • usage ${normalized.usage}` : '';
      const meta = $('.row-meta', row);
      if (meta) meta.textContent = `${formatMoney(normalized.amount)} ${normalized.frequency} • ${account}${nextCharge} • annual ${formatMoney(normalized.annualCost)} • ${SUBSCRIPTION_DECISIONS[normalized.decision]} • auto-renew ${normalized.autoRenew ? 'Yes' : 'No'}${usage}`;
    });
  }

  function installSavingsUi() {
    const nav = $('.primary-nav');
    const main = $('main');
    if (!nav || !main || $('#savingsView')) return;

    const reviewButton = $('.nav-button[data-view="review"]');
    const savingsButton = document.createElement('button');
    savingsButton.className = 'nav-button';
    savingsButton.dataset.view = 'savings';
    savingsButton.textContent = 'Savings';
    nav.insertBefore(savingsButton, reviewButton || null);
    nav.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';

    const savingsView = document.createElement('section');
    savingsView.className = 'view';
    savingsView.id = 'savingsView';
    savingsView.dataset.view = 'savings';
    savingsView.innerHTML = `
      <div class="section-heading sticky-heading">
        <div><p class="eyebrow">SAVINGS GOALS</p><h2>Savings</h2></div>
        <button class="primary-button" id="addSavingsGoalButton">+ Add</button>
      </div>
      <section class="stats-grid compact">
        <article class="stat-card"><span>Total targets</span><strong id="savingsTargetTotal">$0.00</strong></article>
        <article class="stat-card"><span>Current saved</span><strong id="savingsCurrentTotal">$0.00</strong></article>
        <article class="stat-card"><span>Protected saved</span><strong id="savingsProtectedTotal">$0.00</strong></article>
        <article class="stat-card"><span>Goals</span><strong id="savingsGoalCount">0</strong></article>
      </section>
      <div id="savingsGoalList" class="stack-list large-list empty-state">No savings goals recorded yet.</div>`;
    const reviewView = $('#reviewView');
    main.insertBefore(savingsView, reviewView || null);

    const dialog = document.createElement('dialog');
    dialog.id = 'savingsGoalDialog';
    dialog.className = 'app-dialog';
    dialog.innerHTML = `
      <form method="dialog" id="savingsGoalForm">
        <div class="dialog-header">
          <div><p class="eyebrow">SAVINGS GOAL</p><h2 id="savingsGoalDialogTitle">Add savings goal</h2></div>
          <button class="icon-button dialog-close" type="button" aria-label="Close">×</button>
        </div>
        <input type="hidden" id="savingsGoalId" />
        <div class="form-grid">
          <label class="full">Goal<input id="savingsGoalName" type="text" maxlength="100" required placeholder="Emergency fund, car, holiday…" /></label>
          <label>Target<div class="money-input"><span>$</span><input id="savingsGoalTarget" type="number" min="0" step="0.01" required /></div></label>
          <label>Current amount<div class="money-input"><span>$</span><input id="savingsGoalCurrent" type="number" min="0" step="0.01" value="0" /></div></label>
          <label>Deadline<input id="savingsGoalDeadline" type="date" /></label>
          <label>Protected?<select id="savingsGoalProtected"><option value="no">No</option><option value="yes">Yes</option></select></label>
          <label>Required weekly<div class="money-input"><span>$</span><input id="savingsGoalWeekly" type="number" step="0.01" readonly /></div></label>
          <label>Required fortnightly<div class="money-input"><span>$</span><input id="savingsGoalFortnightly" type="number" step="0.01" readonly /></div></label>
          <label>Progress<input id="savingsGoalProgress" type="text" readonly /></label>
          <label class="full">Notes<textarea id="savingsGoalNotes" rows="3" maxlength="400" placeholder="Anything useful about this goal"></textarea></label>
        </div>
        <div class="dialog-actions">
          <button type="button" class="text-button danger-text hidden" id="deleteSavingsGoalButton">Delete</button>
          <span class="spacer"></span>
          <button type="button" class="secondary-button dialog-close">Cancel</button>
          <button type="submit" class="primary-button">Save</button>
        </div>
      </form>`;
    document.body.insertBefore(dialog, $('#helpDialog') || null);
  }

  function updateSavingsGoalPreview() {
    const normalized = normalizeSavingsGoal({
      goal: $('#savingsGoalName')?.value || '',
      target: $('#savingsGoalTarget')?.value,
      currentAmount: $('#savingsGoalCurrent')?.value,
      deadline: $('#savingsGoalDeadline')?.value,
      protected: $('#savingsGoalProtected')?.value
    });
    if ($('#savingsGoalWeekly')) $('#savingsGoalWeekly').value = normalized.requiredWeeklyAmount.toFixed(2);
    if ($('#savingsGoalFortnightly')) $('#savingsGoalFortnightly').value = normalized.requiredFortnightlyAmount.toFixed(2);
    if ($('#savingsGoalProgress')) $('#savingsGoalProgress').value = `${normalized.progress.toFixed(2)}%`;
  }

  function renderSavingsGoals() {
    const state = readState();
    const goals = state.savingsGoals.map(normalizeSavingsGoal);
    const totalTargets = goals.reduce((sum, goal) => sum + goal.target, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const protectedTotal = goals.filter(goal => goal.protected).reduce((sum, goal) => sum + goal.currentAmount, 0);
    if ($('#savingsTargetTotal')) $('#savingsTargetTotal').textContent = formatMoney(totalTargets);
    if ($('#savingsCurrentTotal')) $('#savingsCurrentTotal').textContent = formatMoney(totalCurrent);
    if ($('#savingsProtectedTotal')) $('#savingsProtectedTotal').textContent = formatMoney(protectedTotal);
    if ($('#savingsGoalCount')) $('#savingsGoalCount').textContent = String(goals.length);

    const list = $('#savingsGoalList');
    if (!list) return;
    if (!goals.length) {
      list.className = 'stack-list large-list empty-state';
      list.textContent = 'No savings goals recorded yet.';
      return;
    }
    list.className = 'stack-list large-list';
    list.innerHTML = goals.map(goal => `<button class="list-row clickable" data-savings-goal-id="${escapeHtml(goal.id)}" style="width:100%; text-align:left;">
      <span><span class="row-title">${escapeHtml(goal.goal)} ${goal.protected ? '<span class="pill good">Protected</span>' : ''}</span>
      <span class="row-meta">${goal.progress.toFixed(2)}% • ${formatMoney(goal.currentAmount)} of ${formatMoney(goal.target)} • weekly ${formatMoney(goal.requiredWeeklyAmount)} • fortnightly ${formatMoney(goal.requiredFortnightlyAmount)}${goal.deadline ? ` • deadline ${escapeHtml(goal.deadline)}` : ''}</span></span>
      <span class="row-amount income">${formatMoney(Math.max(0, goal.target - goal.currentAmount))} left</span>
    </button>`).join('');
    $$('[data-savings-goal-id]', list).forEach(button => button.addEventListener('click', () => openSavingsGoalDialog(button.dataset.savingsGoalId)));
  }

  function openSavingsGoalDialog(id = '') {
    const form = $('#savingsGoalForm');
    if (!form) return;
    form.reset();
    $('#savingsGoalId').value = '';
    $('#savingsGoalCurrent').value = '0';
    $('#savingsGoalProtected').value = 'no';
    $('#deleteSavingsGoalButton').classList.add('hidden');
    $('#savingsGoalDialogTitle').textContent = 'Add savings goal';
    if (id) {
      const goal = readState().savingsGoals.find(item => item.id === id);
      if (!goal) return;
      const normalized = normalizeSavingsGoal(goal);
      $('#savingsGoalId').value = normalized.id;
      $('#savingsGoalName').value = normalized.goal;
      $('#savingsGoalTarget').value = normalized.target;
      $('#savingsGoalCurrent').value = normalized.currentAmount;
      $('#savingsGoalDeadline').value = normalized.deadline;
      $('#savingsGoalProtected').value = normalized.protected ? 'yes' : 'no';
      $('#savingsGoalNotes').value = normalized.notes || '';
      $('#deleteSavingsGoalButton').classList.remove('hidden');
      $('#savingsGoalDialogTitle').textContent = 'Edit savings goal';
    }
    updateSavingsGoalPreview();
    $('#savingsGoalDialog').showModal();
  }

  function saveSavingsGoal(event) {
    event.preventDefault();
    const state = readState();
    const id = $('#savingsGoalId').value;
    const existing = id ? state.savingsGoals.find(item => item.id === id) : null;
    const goal = normalizeSavingsGoal({
      id: id || uid('goal'),
      goal: $('#savingsGoalName').value,
      target: $('#savingsGoalTarget').value,
      currentAmount: $('#savingsGoalCurrent').value,
      deadline: $('#savingsGoalDeadline').value,
      protected: $('#savingsGoalProtected').value,
      notes: $('#savingsGoalNotes').value,
      createdAt: existing?.createdAt || new Date().toISOString()
    });
    if (!goal.goal) return showToast('Give the savings goal a name.');
    if (goal.target <= 0) return showToast('Enter a savings target greater than $0.');
    if (id) state.savingsGoals = state.savingsGoals.map(item => item.id === id ? goal : item); else state.savingsGoals.push(goal);
    directWriteState(state);
    $('#savingsGoalDialog').close();
    renderSavingsGoals();
    showToast(id ? 'Savings goal updated.' : 'Savings goal added.');
  }

  function deleteSavingsGoal() {
    const id = $('#savingsGoalId')?.value;
    if (!id || !confirm('Delete this savings goal?')) return;
    const state = readState();
    state.savingsGoals = state.savingsGoals.filter(item => item.id !== id);
    directWriteState(state);
    $('#savingsGoalDialog').close();
    renderSavingsGoals();
    showToast('Savings goal deleted.');
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fullBackup(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = readState();
    downloadFile(`every-cent-backup-${todayIso()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2), 'application/json');
    showToast('Backup downloaded.');
  }

  function beginRestore(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    $('#restoreInput')?.click();
  }

  async function restoreFullBackup(event) {
    event.stopImmediatePropagation();
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.subscriptions)) throw new Error('Invalid backup');
      directWriteState({
        version: parsed.version || 1,
        accounts: parsed.accounts,
        transactions: parsed.transactions,
        subscriptions: parsed.subscriptions,
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : []
      });
      showToast('Backup restored. Reloading…');
      setTimeout(() => location.reload(), 250);
    } catch {
      showToast('That file is not a valid Genevieve App backup.');
    } finally {
      event.target.value = '';
    }
  }

  function replaceDataControl(id) {
    const current = document.getElementById(id);
    if (!current?.parentNode) return current;
    const replacement = current.cloneNode(true);
    current.parentNode.replaceChild(replacement, current);
    return replacement;
  }

  function installExtendedDataControls() {
    const backupButton = replaceDataControl('backupButton');
    const restoreButton = replaceDataControl('restoreButton');
    const restoreInput = replaceDataControl('restoreInput');
    backupButton?.addEventListener('click', fullBackup, true);
    restoreButton?.addEventListener('click', beginRestore, true);
    restoreInput?.addEventListener('change', restoreFullBackup, true);
  }

  function installSavingsControls() {
    $('#addSavingsGoalButton')?.addEventListener('click', () => openSavingsGoalDialog());
    $('#savingsGoalForm')?.addEventListener('submit', saveSavingsGoal);
    $('#deleteSavingsGoalButton')?.addEventListener('click', deleteSavingsGoal);
    $$('.dialog-close', $('#savingsGoalDialog')).forEach(button => button.addEventListener('click', () => $('#savingsGoalDialog').close()));
    ['savingsGoalTarget', 'savingsGoalCurrent', 'savingsGoalDeadline'].forEach(id => document.getElementById(id)?.addEventListener('input', updateSavingsGoalPreview));
  }

  function queueRefresh() {
    if (!runtimeReady || refreshQueued) return;
    refreshQueued = true;
    setTimeout(() => {
      refreshQueued = false;
      refreshExtensionUi();
    }, 0);
  }

  function refreshExtensionUi() {
    refreshSubscriptionPresentation();
    renderSavingsGoals();
  }

  migrateExtendedState();

  document.addEventListener('DOMContentLoaded', () => {
    installSubscriptionSupport();
    installSavingsUi();
    installExtendedDataControls();
    installSavingsControls();
    runtimeReady = true;
    setTimeout(refreshExtensionUi, 0);
  });
})();
