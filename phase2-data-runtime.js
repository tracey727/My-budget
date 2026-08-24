(() => {
  'use strict';

  const STORAGE_KEY = 'every-cent-money-tracker-v1';
  const LIABILITY_TYPES = new Set(['credit', 'loan', 'bnpl']);
  const ACCOUNT_LABELS = {
    bank: 'Bank',
    savings: 'Savings',
    cash: 'Cash',
    credit: 'Credit card',
    loan: 'Loan / debt',
    bnpl: 'BNPL',
    investment: 'Investment',
    other: 'Other'
  };
  const USER_RESPONSES = new Set(['yes', 'no', 'maybe']);
  const RECURRING_STATUSES = new Set(['one_off', 'recurring', 'unknown']);
  const BILL_FREQUENCIES = new Set(['weekly', 'fortnightly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'one_off']);
  const ESSENTIAL_STATUSES = new Set(['essential', 'nonessential', 'unsure']);
  const BUDGETING_METHODS = new Set(['smooth', 'target']);
  const ALERT_STATUSES = new Set(['green', 'yellow', 'red', 'recovery']);
  const PAID_STATUSES = new Set(['paid', 'unpaid']);

  const nativeGetItem = Storage.prototype.getItem;
  const nativeSetItem = Storage.prototype.setItem;
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

  function readState() {
    try {
      const raw = nativeGetItem.call(localStorage, STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        version: Number(parsed.version || 1),
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : []
      };
    } catch {
      return { version: 1, accounts: [], transactions: [], subscriptions: [], bills: [] };
    }
  }

  function normalizeTransactionExtras(transaction = {}) {
    return {
      userResponse: USER_RESPONSES.has(transaction.userResponse) ? transaction.userResponse : '',
      recurringStatus: RECURRING_STATUSES.has(transaction.recurringStatus) ? transaction.recurringStatus : 'one_off',
      professionalProjectLink: String(transaction.professionalProjectLink || transaction.projectLink || '').trim()
    };
  }

  function normalizeBill(bill = {}) {
    return {
      id: String(bill.id || bill.billId || uid('bill')),
      billName: String(bill.billName || bill.name || '').trim(),
      amount: parseMoney(bill.amount),
      frequency: BILL_FREQUENCIES.has(bill.frequency) ? bill.frequency : 'monthly',
      nextDueDate: String(bill.nextDueDate || ''),
      accountId: String(bill.accountId || bill.account || ''),
      essentialStatus: ESSENTIAL_STATUSES.has(bill.essentialStatus) ? bill.essentialStatus : 'unsure',
      budgetingMethod: BUDGETING_METHODS.has(bill.budgetingMethod) ? bill.budgetingMethod : 'target',
      amountReserved: parseMoney(bill.amountReserved),
      requiredContribution: parseMoney(bill.requiredContribution),
      targetAmount: parseMoney(bill.targetAmount ?? bill.amount),
      alertStatus: ALERT_STATUSES.has(bill.alertStatus) ? bill.alertStatus : 'green',
      paidStatus: PAID_STATUSES.has(bill.paidStatus) ? bill.paidStatus : 'unpaid',
      notes: String(bill.notes || '').trim(),
      createdAt: String(bill.createdAt || new Date().toISOString())
    };
  }

  function writeState(state) {
    const next = {
      version: Number(state.version || 1),
      accounts: Array.isArray(state.accounts) ? state.accounts : [],
      transactions: Array.isArray(state.transactions) ? state.transactions : [],
      subscriptions: Array.isArray(state.subscriptions) ? state.subscriptions : [],
      bills: Array.isArray(state.bills) ? state.bills.map(normalizeBill) : []
    };
    nativeSetItem.call(localStorage, STORAGE_KEY, JSON.stringify(next));
  }

  function migrateStoredState() {
    const state = readState();
    state.transactions = state.transactions.map(transaction => ({ ...transaction, ...normalizeTransactionExtras(transaction) }));
    state.bills = state.bills.map(normalizeBill);
    writeState(state);
  }

  function transactionFormExtras() {
    const dialog = $('#transactionDialog');
    if (!dialog?.open) return null;
    return {
      id: $('#transactionId')?.value || '',
      userResponse: USER_RESPONSES.has($('#transactionUserResponse')?.value) ? $('#transactionUserResponse').value : '',
      recurringStatus: RECURRING_STATUSES.has($('#transactionRecurringStatus')?.value) ? $('#transactionRecurringStatus').value : 'one_off',
      professionalProjectLink: String($('#transactionProfessionalProjectLink')?.value || '').trim()
    };
  }

  function mergeRuntimeFieldsIntoAppWrite(value) {
    const next = JSON.parse(value);
    const previous = readState();
    const previousTransactions = new Map(previous.transactions.map(transaction => [transaction.id, transaction]));

    next.bills = previous.bills;
    next.transactions = (Array.isArray(next.transactions) ? next.transactions : []).map(transaction => {
      const previousRecord = previousTransactions.get(transaction.id) || {};
      return { ...transaction, ...normalizeTransactionExtras({ ...previousRecord, ...transaction }) };
    });

    const extras = transactionFormExtras();
    if (extras && next.transactions.length) {
      let target = extras.id ? next.transactions.find(transaction => transaction.id === extras.id) : next.transactions[next.transactions.length - 1];
      if (target) Object.assign(target, extras.id ? { ...extras, id: target.id } : { ...extras, id: target.id });
    }

    return JSON.stringify(next);
  }

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (key !== STORAGE_KEY) return nativeSetItem.call(this, key, value);
    let nextValue = value;
    try {
      nextValue = mergeRuntimeFieldsIntoAppWrite(value);
    } catch {
      nextValue = value;
    }
    const result = nativeSetItem.call(this, key, nextValue);
    queueRefresh();
    return result;
  };

  function queueRefresh() {
    if (!runtimeReady || refreshQueued) return;
    refreshQueued = true;
    setTimeout(() => {
      refreshQueued = false;
      refreshExtensionUi();
    }, 0);
  }

  function computedBalance(account, transactions) {
    let balance = Number(account?.openingBalance || 0);
    const liability = LIABILITY_TYPES.has(account?.type);
    for (const transaction of transactions) {
      const amount = Number(transaction.amount || 0);
      const type = ['income', 'expense', 'transfer'].includes(transaction.type) ? transaction.type : 'expense';
      if (type === 'income' && transaction.accountId === account.id) balance += liability ? -amount : amount;
      if (type === 'expense' && transaction.accountId === account.id) balance += liability ? amount : -amount;
      if (type === 'transfer') {
        if (transaction.accountId === account.id) balance += liability ? amount : -amount;
        if (transaction.toAccountId === account.id) balance += liability ? -amount : amount;
      }
    }
    return Math.round(balance * 100) / 100;
  }

  function correctAccountPresentation() {
    const state = readState();
    const balances = new Map(state.accounts.map(account => [account.id, computedBalance(account, state.transactions)]));
    const assets = state.accounts.filter(account => !LIABILITY_TYPES.has(account.type)).reduce((sum, account) => sum + (balances.get(account.id) || 0), 0);
    const debts = state.accounts.filter(account => LIABILITY_TYPES.has(account.type)).reduce((sum, account) => sum + Math.abs(balances.get(account.id) || 0), 0);

    if ($('#assetsTotal')) $('#assetsTotal').textContent = formatMoney(assets);
    if ($('#debtsTotal')) $('#debtsTotal').textContent = formatMoney(debts);
    if ($('#netPositionTotal')) $('#netPositionTotal').textContent = formatMoney(assets - debts);
    if ($('#netWorthValue')) $('#netWorthValue').textContent = formatMoney(assets - debts);

    $$('[data-account-id]').forEach(row => {
      const account = state.accounts.find(item => item.id === row.dataset.accountId);
      if (!account) return;
      const liability = LIABILITY_TYPES.has(account.type);
      const balance = balances.get(account.id) || 0;
      const pill = $('.pill', row);
      const amount = $('.row-amount', row);
      if (pill) pill.textContent = ACCOUNT_LABELS[account.type] || 'Account';
      if (amount) {
        amount.classList.toggle('expense', liability);
        amount.classList.toggle('income', !liability);
        amount.classList.remove('transfer');
        amount.textContent = `${liability ? 'Owe ' : ''}${formatMoney(Math.abs(balance))}`;
      }
    });

    ['transactionAccount', 'transactionToAccount', 'subscriptionAccount', 'billAccount'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      state.accounts.forEach(account => {
        const option = [...select.options].find(item => item.value === account.id);
        if (option) option.textContent = `${account.name} — ${formatMoney(balances.get(account.id) || 0)}`;
      });
    });
  }

  function installAccountSupport() {
    const select = $('#accountType');
    if (select && ![...select.options].some(option => option.value === 'bnpl')) {
      const option = document.createElement('option');
      option.value = 'bnpl';
      option.textContent = 'BNPL / buy now pay later';
      const investment = [...select.options].find(item => item.value === 'investment');
      select.insertBefore(option, investment || null);
    }

    const accountHelp = $('#accountForm .small-copy');
    if (accountHelp) accountHelp.textContent = 'For credit cards, loans or BNPL, enter the amount you currently owe as a positive number. The app treats those account types as debts.';

    const quickCopy = $('#quickAddAccount small');
    if (quickCopy) quickCopy.textContent = 'Bank, cash, card, loan, BNPL';
  }

  function installTransactionSupport() {
    const form = $('#transactionForm');
    const worthFieldset = $('#worthFieldset');
    if (!form || !worthFieldset || $('#transactionExtensionFields')) return;

    const fields = document.createElement('div');
    fields.id = 'transactionExtensionFields';
    fields.className = 'form-grid';
    fields.innerHTML = `
      <label>Your answer
        <select id="transactionUserResponse">
          <option value="">Not answered</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="maybe">Maybe</option>
        </select>
      </label>
      <label>Recurring status
        <select id="transactionRecurringStatus">
          <option value="one_off">One-off</option>
          <option value="recurring">Recurring</option>
          <option value="unknown">Unknown / check</option>
        </select>
      </label>
      <label class="full">Professional project link (optional)
        <input id="transactionProfessionalProjectLink" type="text" maxlength="120" placeholder="Project ID, project name or link" />
      </label>`;
    worthFieldset.insertAdjacentElement('afterend', fields);

    const observer = new MutationObserver(() => {
      if ($('#transactionDialog')?.open) setTimeout(loadTransactionExtras, 0);
    });
    observer.observe($('#transactionDialog'), { attributes: true, attributeFilter: ['open'] });
  }

  function loadTransactionExtras() {
    const id = $('#transactionId')?.value || '';
    const transaction = id ? readState().transactions.find(item => item.id === id) : null;
    const extras = normalizeTransactionExtras(transaction || {});
    if ($('#transactionUserResponse')) $('#transactionUserResponse').value = extras.userResponse;
    if ($('#transactionRecurringStatus')) $('#transactionRecurringStatus').value = extras.recurringStatus;
    if ($('#transactionProfessionalProjectLink')) $('#transactionProfessionalProjectLink').value = extras.professionalProjectLink;
  }

  function installBillsUi() {
    const nav = $('.primary-nav');
    const main = $('main');
    if (!nav || !main || $('#billsView')) return;

    const subscriptionButton = $('.nav-button[data-view="subscriptions"]');
    const billsButton = document.createElement('button');
    billsButton.className = 'nav-button';
    billsButton.dataset.view = 'bills';
    billsButton.textContent = 'Bills';
    nav.insertBefore(billsButton, subscriptionButton || null);
    nav.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
    if (subscriptionButton) {
      subscriptionButton.setAttribute('aria-label', 'Subscriptions');
      subscriptionButton.textContent = 'Subs';
    }

    const billsView = document.createElement('section');
    billsView.className = 'view';
    billsView.id = 'billsView';
    billsView.dataset.view = 'bills';
    billsView.innerHTML = `
      <div class="section-heading sticky-heading">
        <div><p class="eyebrow">BILLS & OBLIGATIONS</p><h2>Bills</h2></div>
        <button class="primary-button" id="addBillButton">+ Add</button>
      </div>
      <section class="stats-grid compact">
        <article class="stat-card"><span>Unpaid targets</span><strong id="billTargetTotal">$0.00</strong></article>
        <article class="stat-card"><span>Already reserved</span><strong id="billReservedTotal">$0.00</strong></article>
        <article class="stat-card"><span>Required contributions</span><strong id="billContributionTotal">$0.00</strong></article>
        <article class="stat-card"><span>Needs attention</span><strong id="billAttentionCount">0</strong></article>
      </section>
      <div id="billList" class="stack-list large-list empty-state">No bills recorded yet.</div>`;
    const subscriptionsView = $('#subscriptionsView');
    main.insertBefore(billsView, subscriptionsView || $('#accountsView') || null);

    const dialog = document.createElement('dialog');
    dialog.id = 'billDialog';
    dialog.className = 'app-dialog';
    dialog.innerHTML = `
      <form method="dialog" id="billForm">
        <div class="dialog-header">
          <div><p class="eyebrow">BILL</p><h2 id="billDialogTitle">Add bill</h2></div>
          <button class="icon-button dialog-close" type="button" aria-label="Close">×</button>
        </div>
        <input type="hidden" id="billId" />
        <div class="form-grid">
          <label class="full">Bill name
            <input id="billName" type="text" maxlength="100" required placeholder="Electricity, registration, insurance…" />
          </label>
          <label>Amount
            <div class="money-input"><span>$</span><input id="billAmount" type="number" min="0" step="0.01" required /></div>
          </label>
          <label>Frequency
            <select id="billFrequency">
              <option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option><option value="half_yearly">Half-yearly</option><option value="yearly">Yearly</option><option value="one_off">One-off</option>
            </select>
          </label>
          <label>Next due date<input id="billNextDueDate" type="date" /></label>
          <label>Account<select id="billAccount"></select></label>
          <label>Essential status
            <select id="billEssentialStatus"><option value="essential">Essential</option><option value="nonessential">Not essential</option><option value="unsure">Unsure</option></select>
          </label>
          <label>Budgeting method
            <select id="billBudgetingMethod"><option value="smooth">Smooth My Bills / Pay Ahead</option><option value="target">Hold My Money / Bill Target</option></select>
          </label>
          <label>Amount already reserved<div class="money-input"><span>$</span><input id="billAmountReserved" type="number" min="0" step="0.01" value="0" /></div></label>
          <label>Required contribution<div class="money-input"><span>$</span><input id="billRequiredContribution" type="number" min="0" step="0.01" value="0" /></div></label>
          <label>Target amount<div class="money-input"><span>$</span><input id="billTargetAmount" type="number" min="0" step="0.01" value="0" /></div></label>
          <label>Alert status
            <select id="billAlertStatus"><option value="green">Green</option><option value="yellow">Yellow</option><option value="red">Red</option><option value="recovery">Recovery</option></select>
          </label>
          <label>Paid status<select id="billPaidStatus"><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
          <label class="full">Notes<textarea id="billNotes" rows="3" maxlength="400" placeholder="Anything useful about this bill"></textarea></label>
        </div>
        <div class="dialog-actions">
          <button type="button" class="text-button danger-text hidden" id="deleteBillButton">Delete</button>
          <span class="spacer"></span>
          <button type="button" class="secondary-button dialog-close">Cancel</button>
          <button type="submit" class="primary-button">Save</button>
        </div>
      </form>`;
    document.body.insertBefore(dialog, $('#subscriptionDialog') || $('#helpDialog') || null);
  }

  function refreshBillAccountOptions() {
    const select = $('#billAccount');
    if (!select) return;
    const state = readState();
    const current = select.value;
    select.innerHTML = '<option value="">Choose account</option>' + state.accounts.map(account => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join('');
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  function alertClass(status) {
    return status === 'red' ? 'danger' : status === 'yellow' ? 'warning' : status === 'recovery' ? 'info' : 'good';
  }

  function renderBills() {
    const state = readState();
    const unpaid = state.bills.filter(bill => bill.paidStatus !== 'paid');
    const targetTotal = unpaid.reduce((sum, bill) => sum + parseMoney(bill.targetAmount), 0);
    const reservedTotal = unpaid.reduce((sum, bill) => sum + parseMoney(bill.amountReserved), 0);
    const contributionTotal = unpaid.reduce((sum, bill) => sum + parseMoney(bill.requiredContribution), 0);
    const attention = unpaid.filter(bill => ['yellow', 'red', 'recovery'].includes(bill.alertStatus)).length;

    if ($('#billTargetTotal')) $('#billTargetTotal').textContent = formatMoney(targetTotal);
    if ($('#billReservedTotal')) $('#billReservedTotal').textContent = formatMoney(reservedTotal);
    if ($('#billContributionTotal')) $('#billContributionTotal').textContent = formatMoney(contributionTotal);
    if ($('#billAttentionCount')) $('#billAttentionCount').textContent = String(attention);

    const list = $('#billList');
    if (!list) return;
    if (!state.bills.length) {
      list.className = 'stack-list large-list empty-state';
      list.textContent = 'No bills recorded yet.';
      return;
    }

    list.className = 'stack-list large-list';
    list.innerHTML = [...state.bills].sort((a, b) => String(a.nextDueDate || '9999').localeCompare(String(b.nextDueDate || '9999'))).map(bill => {
      const account = state.accounts.find(item => item.id === bill.accountId)?.name || 'No account';
      const due = bill.nextDueDate || 'No due date';
      const gap = Math.max(0, parseMoney(bill.targetAmount) - parseMoney(bill.amountReserved));
      return `<button class="list-row clickable" data-bill-id="${escapeHtml(bill.id)}" style="width:100%; text-align:left;">
        <span><span class="row-title">${escapeHtml(bill.billName)} <span class="pill ${alertClass(bill.alertStatus)}">${escapeHtml(bill.alertStatus)}</span> <span class="pill neutral">${escapeHtml(bill.paidStatus)}</span></span>
        <span class="row-meta">${escapeHtml(due)} • ${escapeHtml(account)} • ${escapeHtml(bill.budgetingMethod === 'smooth' ? 'Smooth My Bills' : 'Bill Target')} • still to reserve ${formatMoney(gap)}</span></span>
        <span class="row-amount expense">${formatMoney(bill.amount)}</span>
      </button>`;
    }).join('');
    $$('[data-bill-id]', list).forEach(button => button.addEventListener('click', () => openBillDialog(button.dataset.billId)));
  }

  function openBillDialog(id = '') {
    const form = $('#billForm');
    if (!form) return;
    form.reset();
    refreshBillAccountOptions();
    $('#billId').value = '';
    $('#billAmountReserved').value = '0';
    $('#billRequiredContribution').value = '0';
    $('#billTargetAmount').value = '0';
    $('#billAlertStatus').value = 'green';
    $('#billPaidStatus').value = 'unpaid';
    $('#deleteBillButton').classList.add('hidden');
    $('#billDialogTitle').textContent = 'Add bill';

    if (id) {
      const bill = readState().bills.find(item => item.id === id);
      if (!bill) return;
      $('#billId').value = bill.id;
      $('#billName').value = bill.billName;
      $('#billAmount').value = bill.amount;
      $('#billFrequency').value = bill.frequency;
      $('#billNextDueDate').value = bill.nextDueDate || '';
      $('#billAccount').value = bill.accountId || '';
      $('#billEssentialStatus').value = bill.essentialStatus;
      $('#billBudgetingMethod').value = bill.budgetingMethod;
      $('#billAmountReserved').value = bill.amountReserved;
      $('#billRequiredContribution').value = bill.requiredContribution;
      $('#billTargetAmount').value = bill.targetAmount;
      $('#billAlertStatus').value = bill.alertStatus;
      $('#billPaidStatus').value = bill.paidStatus;
      $('#billNotes').value = bill.notes || '';
      $('#deleteBillButton').classList.remove('hidden');
      $('#billDialogTitle').textContent = 'Edit bill';
    }
    $('#billDialog').showModal();
  }

  function saveBill(event) {
    event.preventDefault();
    const state = readState();
    const id = $('#billId').value;
    const existing = id ? state.bills.find(item => item.id === id) : null;
    const bill = normalizeBill({
      id: id || uid('bill'),
      billName: $('#billName').value,
      amount: $('#billAmount').value,
      frequency: $('#billFrequency').value,
      nextDueDate: $('#billNextDueDate').value,
      accountId: $('#billAccount').value,
      essentialStatus: $('#billEssentialStatus').value,
      budgetingMethod: $('#billBudgetingMethod').value,
      amountReserved: $('#billAmountReserved').value,
      requiredContribution: $('#billRequiredContribution').value,
      targetAmount: $('#billTargetAmount').value || $('#billAmount').value,
      alertStatus: $('#billAlertStatus').value,
      paidStatus: $('#billPaidStatus').value,
      notes: $('#billNotes').value,
      createdAt: existing?.createdAt || new Date().toISOString()
    });
    if (!bill.billName) return showToast('Give the bill a name.');
    if (id) state.bills = state.bills.map(item => item.id === id ? bill : item); else state.bills.push(bill);
    writeState(state);
    $('#billDialog').close();
    renderBills();
    showToast(id ? 'Bill updated.' : 'Bill added.');
  }

  function deleteBill() {
    const id = $('#billId')?.value;
    if (!id || !confirm('Delete this bill record?')) return;
    const state = readState();
    state.bills = state.bills.filter(item => item.id !== id);
    writeState(state);
    $('#billDialog').close();
    renderBills();
    showToast('Bill deleted.');
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

  function todayIso() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function fullBackup(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = readState();
    downloadFile(`every-cent-backup-${todayIso()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2), 'application/json');
    showToast('Backup downloaded.');
  }

  function csvCell(value) {
    return `\"${String(value ?? '').replaceAll('\"', '\"\"')}\"`;
  }

  function exportTransactions(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = readState();
    const headers = ['Transaction ID', 'Account ID', 'Date', 'Amount AUD', 'Merchant / payee', 'Type', 'Category', 'Essential / Worth It / Unsure / Waste', 'User response', 'Recurring status', 'Professional project link', 'Notes'];
    const rows = [...state.transactions].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).map(transaction => [
      transaction.id, transaction.accountId, transaction.date, transaction.amount, transaction.merchant, transaction.type, transaction.category,
      transaction.worth, transaction.userResponse, transaction.recurringStatus, transaction.professionalProjectLink, transaction.notes
    ]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
    downloadFile(`every-cent-transactions-${todayIso()}.csv`, csv, 'text/csv;charset=utf-8');
    showToast('Transactions exported.');
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
      writeState({
        version: parsed.version || 1,
        accounts: parsed.accounts,
        transactions: parsed.transactions.map(transaction => ({ ...transaction, ...normalizeTransactionExtras(transaction) })),
        subscriptions: parsed.subscriptions,
        bills: Array.isArray(parsed.bills) ? parsed.bills : []
      });
      showToast('Backup restored. Reloading…');
      setTimeout(() => location.reload(), 250);
    } catch {
      showToast('That file is not a valid Every Cent backup.');
    } finally {
      event.target.value = '';
    }
  }

  function protectBillAccountLinks(event) {
    const accountId = $('#accountId')?.value;
    if (!accountId) return;
    if (readState().bills.some(bill => bill.accountId === accountId)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast('This account is used by a bill. Change the bill first.');
    }
  }

  function installDataControls() {
    $('#addBillButton')?.addEventListener('click', () => openBillDialog());
    $('#billForm')?.addEventListener('submit', saveBill);
    $('#deleteBillButton')?.addEventListener('click', deleteBill);
    $$('.dialog-close', $('#billDialog')).forEach(button => button.addEventListener('click', () => $('#billDialog').close()));

    $('#backupButton')?.addEventListener('click', fullBackup, true);
    $('#exportCsvButton')?.addEventListener('click', exportTransactions, true);
    $('#restoreButton')?.addEventListener('click', beginRestore, true);
    $('#restoreInput')?.addEventListener('change', restoreFullBackup, true);
    $('#deleteAccountButton')?.addEventListener('click', protectBillAccountLinks, true);
  }

  function refreshExtensionUi() {
    refreshBillAccountOptions();
    renderBills();
    correctAccountPresentation();
  }

  migrateStoredState();

  document.addEventListener('DOMContentLoaded', () => {
    installAccountSupport();
    installTransactionSupport();
    installBillsUi();
    installDataControls();
    runtimeReady = true;
    setTimeout(refreshExtensionUi, 0);
  });
})();
