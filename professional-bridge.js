(() => {
  'use strict';

  // Professional entities and project accounting, added 2 Sept 2026 (Phase 20).
  // Businesses, divisions, projects, workstreams, cost centres, funding pools
  // and their own accounts, plus transaction allocation across that
  // hierarchy. This is genuinely new data with no relationship to the
  // personal money-tracker state, so it lives under its own independent
  // storage key -- no chained setItem patch is needed since nothing else
  // reads or writes this key. A brand-new "Professional" nav tab and view
  // were added to index.html; app.js's navigate() is generic over
  // data-view attributes, so no change to app.js was needed there either.
  //
  // This phase builds the structure and allocation only. Committed/paid/
  // owing tracking, invoices and revenue are Phase 21; budget-vs-actual
  // forecasting and Green/Yellow/Red monitoring are Phase 22.

  const STORAGE_KEY = 'every-cent-professional-v1';
  const LIABILITY_TYPES = new Set(['credit', 'loan']);
  const ACCOUNT_TYPES = new Set(['bank', 'credit', 'loan', 'other']);
  const TRANSACTION_TYPES = new Set(['income', 'expense']);

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function parseAmount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[ch]));
  }

  function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        version: Number(parsed.version || 1),
        businesses: Array.isArray(parsed.businesses) ? parsed.businesses : [],
        divisions: Array.isArray(parsed.divisions) ? parsed.divisions : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        workstreams: Array.isArray(parsed.workstreams) ? parsed.workstreams : [],
        costCentres: Array.isArray(parsed.costCentres) ? parsed.costCentres : [],
        fundingPools: Array.isArray(parsed.fundingPools) ? parsed.fundingPools : [],
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      };
    } catch {
      return { version: 1, businesses: [], divisions: [], projects: [], workstreams: [], costCentres: [], fundingPools: [], accounts: [], transactions: [] };
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function nameOf(list, id) {
    return list.find(item => item.id === id)?.name || '';
  }

  function accountBalance(account, transactions) {
    let balance = parseAmount(account.openingBalance);
    const liability = LIABILITY_TYPES.has(account.type);
    for (const t of transactions) {
      if (t.accountId !== account.id) continue;
      const amount = parseAmount(t.amount);
      if (t.type === 'income') balance += liability ? -amount : amount;
      if (t.type === 'expense') balance += liability ? amount : -amount;
    }
    return Math.round(balance * 100) / 100;
  }

  function projectAllocatedTotal(project, state) {
    const costCentreIds = new Set(state.costCentres.filter(c => c.projectId === project.id).map(c => c.id));
    return state.transactions
      .filter(t => t.projectId === project.id || costCentreIds.has(t.costCentreId))
      .reduce((sum, t) => sum + (t.type === 'expense' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);
  }

  function costCentreAllocatedTotal(costCentre, state) {
    return state.transactions
      .filter(t => t.costCentreId === costCentre.id)
      .reduce((sum, t) => sum + (t.type === 'expense' ? parseAmount(t.amount) : -parseAmount(t.amount)), 0);
  }

  function setOptions(select, options, placeholder) {
    if (!select) return;
    const previousValue = select.value;
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + options.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
    if (options.some(o => o.value === previousValue)) select.value = previousValue;
  }

  function renderDropdowns() {
    const state = readState();
    setOptions(document.getElementById('proDivisionBusiness'), state.businesses.map(b => ({ value: b.id, label: b.name })), 'Choose a business');
    setOptions(document.getElementById('proProjectBusiness'), state.businesses.map(b => ({ value: b.id, label: b.name })), 'Choose a business');
    setOptions(document.getElementById('proProjectDivision'), state.divisions.map(d => ({ value: d.id, label: `${nameOf(state.businesses, d.businessId)} — ${d.name}` })), 'No division');
    setOptions(document.getElementById('proWorkstreamProject'), state.projects.map(p => ({ value: p.id, label: `${nameOf(state.businesses, p.businessId)} — ${p.name}` })), 'Choose a project');
    setOptions(document.getElementById('proCostCentreProject'), state.projects.map(p => ({ value: p.id, label: `${nameOf(state.businesses, p.businessId)} — ${p.name}` })), 'Choose a project');
    setOptions(document.getElementById('proCostCentreWorkstream'), state.workstreams.map(w => ({ value: w.id, label: w.name })), 'No workstream');
    setOptions(document.getElementById('proFundingPoolBusiness'), state.businesses.map(b => ({ value: b.id, label: b.name })), 'Choose a business');
    setOptions(document.getElementById('proAccountBusiness'), state.businesses.map(b => ({ value: b.id, label: b.name })), 'Choose a business');
    setOptions(document.getElementById('proTransactionAccount'), state.accounts.map(a => ({ value: a.id, label: `${nameOf(state.businesses, a.businessId)} — ${a.name}` })), 'Choose an account');
    setOptions(document.getElementById('proTransactionProject'), state.projects.map(p => ({ value: p.id, label: `${nameOf(state.businesses, p.businessId)} — ${p.name}` })), 'No project');
    setOptions(document.getElementById('proTransactionCostCentre'), state.costCentres.map(c => ({ value: c.id, label: c.name })), 'No cost centre');
  }

  function renderList(id, items, emptyText, rowHtml) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!items.length) {
      el.className = 'stack-list empty-state';
      el.textContent = emptyText;
      return;
    }
    el.className = 'stack-list';
    el.innerHTML = items.map(rowHtml).join('');
  }

  function bindRemove(listId, attr, onRemove) {
    document.getElementById(listId)?.querySelectorAll(`[${attr}]`).forEach(btn => {
      btn.addEventListener('click', () => onRemove(btn.getAttribute(attr)));
    });
  }

  function render() {
    const state = readState();
    renderDropdowns();

    renderList('proBusinessList', state.businesses, 'No businesses added yet.', b => `
      <div class="list-row">
        <span><span class="row-title">${escapeHtml(b.name)}</span></span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-business="${escapeHtml(b.id)}">Remove</button>
      </div>
    `);
    bindRemove('proBusinessList', 'data-pro-remove-business', id => {
      const next = readState();
      next.businesses = next.businesses.filter(b => b.id !== id);
      writeState(next);
    });

    renderList('proDivisionList', state.divisions, 'No divisions added yet.', d => `
      <div class="list-row">
        <span><span class="row-title">${escapeHtml(d.name)}</span><span class="row-meta">${escapeHtml(nameOf(state.businesses, d.businessId))}</span></span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-division="${escapeHtml(d.id)}">Remove</button>
      </div>
    `);
    bindRemove('proDivisionList', 'data-pro-remove-division', id => {
      const next = readState();
      next.divisions = next.divisions.filter(d => d.id !== id);
      writeState(next);
    });

    renderList('proProjectList', state.projects, 'No projects added yet.', p => {
      const allocated = projectAllocatedTotal(p, state);
      const budget = parseAmount(p.approvedBudget);
      const division = p.divisionId ? nameOf(state.divisions, p.divisionId) : '';
      return `
      <div class="list-row">
        <span>
          <span class="row-title">${escapeHtml(p.name)}</span>
          <span class="row-meta">${escapeHtml(nameOf(state.businesses, p.businessId))}${division ? ` • ${escapeHtml(division)}` : ''} • ${money(allocated)} of ${money(budget)} allocated</span>
        </span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-project="${escapeHtml(p.id)}">Remove</button>
      </div>
    `;
    });
    bindRemove('proProjectList', 'data-pro-remove-project', id => {
      const next = readState();
      next.projects = next.projects.filter(p => p.id !== id);
      writeState(next);
    });

    renderList('proWorkstreamList', state.workstreams, 'No workstreams added yet.', w => `
      <div class="list-row">
        <span><span class="row-title">${escapeHtml(w.name)}</span><span class="row-meta">${escapeHtml(nameOf(state.projects, w.projectId))}</span></span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-workstream="${escapeHtml(w.id)}">Remove</button>
      </div>
    `);
    bindRemove('proWorkstreamList', 'data-pro-remove-workstream', id => {
      const next = readState();
      next.workstreams = next.workstreams.filter(w => w.id !== id);
      writeState(next);
    });

    renderList('proCostCentreList', state.costCentres, 'No cost centres added yet.', c => {
      const allocated = costCentreAllocatedTotal(c, state);
      const workstream = c.workstreamId ? nameOf(state.workstreams, c.workstreamId) : '';
      return `
      <div class="list-row">
        <span>
          <span class="row-title">${escapeHtml(c.name)}</span>
          <span class="row-meta">${escapeHtml(nameOf(state.projects, c.projectId))}${workstream ? ` • ${escapeHtml(workstream)}` : ''} • ${money(allocated)} allocated</span>
        </span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-costcentre="${escapeHtml(c.id)}">Remove</button>
      </div>
    `;
    });
    bindRemove('proCostCentreList', 'data-pro-remove-costcentre', id => {
      const next = readState();
      next.costCentres = next.costCentres.filter(c => c.id !== id);
      writeState(next);
    });

    renderList('proFundingPoolList', state.fundingPools, 'No funding pools added yet.', f => `
      <div class="list-row">
        <span><span class="row-title">${escapeHtml(f.name)}</span><span class="row-meta">${escapeHtml(nameOf(state.businesses, f.businessId))}</span></span>
        <span class="row-amount">${money(f.amount)}</span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-fundingpool="${escapeHtml(f.id)}">Remove</button>
      </div>
    `);
    bindRemove('proFundingPoolList', 'data-pro-remove-fundingpool', id => {
      const next = readState();
      next.fundingPools = next.fundingPools.filter(f => f.id !== id);
      writeState(next);
    });

    renderList('proAccountList', state.accounts, 'No professional accounts added yet.', a => `
      <div class="list-row">
        <span><span class="row-title">${escapeHtml(a.name)}</span><span class="row-meta">${escapeHtml(nameOf(state.businesses, a.businessId))} • ${escapeHtml(a.type)}</span></span>
        <span class="row-amount">${money(accountBalance(a, state.transactions))}</span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-account="${escapeHtml(a.id)}">Remove</button>
      </div>
    `);
    bindRemove('proAccountList', 'data-pro-remove-account', id => {
      const next = readState();
      next.accounts = next.accounts.filter(a => a.id !== id);
      writeState(next);
    });

    renderList('proTransactionList', state.transactions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')), 'No transactions recorded yet.', t => `
      <div class="list-row">
        <span>
          <span class="row-title">${escapeHtml(t.description || nameOf(state.accounts, t.accountId))}</span>
          <span class="row-meta">${escapeHtml(t.date || '')} • ${escapeHtml(nameOf(state.accounts, t.accountId))}${t.projectId ? ` • ${escapeHtml(nameOf(state.projects, t.projectId))}` : ''}${t.costCentreId ? ` • ${escapeHtml(nameOf(state.costCentres, t.costCentreId))}` : ''}</span>
        </span>
        <span class="row-amount ${t.type === 'expense' ? 'expense' : 'income'}">${t.type === 'expense' ? '-' : '+'}${money(t.amount)}</span>
      </div>
      <div style="display:flex; gap:8px; margin: -4px 0 12px;">
        <button type="button" class="secondary-button" data-pro-remove-transaction="${escapeHtml(t.id)}">Remove</button>
      </div>
    `);
    bindRemove('proTransactionList', 'data-pro-remove-transaction', id => {
      const next = readState();
      next.transactions = next.transactions.filter(t => t.id !== id);
      writeState(next);
    });
  }

  function bindSave(buttonId, onSave) {
    const button = document.getElementById(buttonId);
    if (!button || button.dataset.proBound === 'true') return;
    button.dataset.proBound = 'true';
    button.addEventListener('click', onSave);
  }

  function bindForms() {
    bindSave('proBusinessSave', () => {
      const nameInput = document.getElementById('proBusinessName');
      const name = String(nameInput?.value || '').trim();
      if (!name) return;
      const state = readState();
      state.businesses.push({ id: uid('biz'), name, createdAt: new Date().toISOString() });
      writeState(state);
      if (nameInput) nameInput.value = '';
    });

    bindSave('proDivisionSave', () => {
      const businessId = document.getElementById('proDivisionBusiness')?.value || '';
      const nameInput = document.getElementById('proDivisionName');
      const name = String(nameInput?.value || '').trim();
      if (!businessId || !name) return;
      const state = readState();
      state.divisions.push({ id: uid('div'), businessId, name, createdAt: new Date().toISOString() });
      writeState(state);
      if (nameInput) nameInput.value = '';
    });

    bindSave('proProjectSave', () => {
      const businessId = document.getElementById('proProjectBusiness')?.value || '';
      const divisionId = document.getElementById('proProjectDivision')?.value || '';
      const nameInput = document.getElementById('proProjectName');
      const name = String(nameInput?.value || '').trim();
      const approvedBudget = parseAmount(document.getElementById('proProjectBudget')?.value);
      if (!businessId || !name) return;
      const state = readState();
      state.projects.push({ id: uid('proj'), businessId, divisionId, name, approvedBudget, createdAt: new Date().toISOString() });
      writeState(state);
      if (nameInput) nameInput.value = '';
      const budgetInput = document.getElementById('proProjectBudget');
      if (budgetInput) budgetInput.value = '';
    });

    bindSave('proWorkstreamSave', () => {
      const projectId = document.getElementById('proWorkstreamProject')?.value || '';
      const nameInput = document.getElementById('proWorkstreamName');
      const name = String(nameInput?.value || '').trim();
      if (!projectId || !name) return;
      const state = readState();
      state.workstreams.push({ id: uid('ws'), projectId, name, createdAt: new Date().toISOString() });
      writeState(state);
      if (nameInput) nameInput.value = '';
    });

    bindSave('proCostCentreSave', () => {
      const projectId = document.getElementById('proCostCentreProject')?.value || '';
      const workstreamId = document.getElementById('proCostCentreWorkstream')?.value || '';
      const nameInput = document.getElementById('proCostCentreName');
      const name = String(nameInput?.value || '').trim();
      if (!projectId || !name) return;
      const state = readState();
      state.costCentres.push({ id: uid('cc'), projectId, workstreamId, name, createdAt: new Date().toISOString() });
      writeState(state);
      if (nameInput) nameInput.value = '';
    });

    bindSave('proFundingPoolSave', () => {
      const businessId = document.getElementById('proFundingPoolBusiness')?.value || '';
      const nameInput = document.getElementById('proFundingPoolName');
      const name = String(nameInput?.value || '').trim();
      const amount = parseAmount(document.getElementById('proFundingPoolAmount')?.value);
      if (!businessId || !name) return;
      const state = readState();
      state.fundingPools.push({ id: uid('pool'), businessId, name, amount, createdAt: new Date().toISOString() });
      writeState(state);
      if (nameInput) nameInput.value = '';
      const amountInput = document.getElementById('proFundingPoolAmount');
      if (amountInput) amountInput.value = '';
    });

    bindSave('proAccountSave', () => {
      const businessId = document.getElementById('proAccountBusiness')?.value || '';
      const nameInput = document.getElementById('proAccountName');
      const name = String(nameInput?.value || '').trim();
      const typeSelect = document.getElementById('proAccountType');
      const type = ACCOUNT_TYPES.has(typeSelect?.value) ? typeSelect.value : 'bank';
      const openingBalance = parseAmount(document.getElementById('proAccountBalance')?.value);
      if (!businessId || !name) return;
      const state = readState();
      state.accounts.push({ id: uid('acc'), businessId, name, type, openingBalance, createdAt: new Date().toISOString() });
      writeState(state);
      if (nameInput) nameInput.value = '';
      const balanceInput = document.getElementById('proAccountBalance');
      if (balanceInput) balanceInput.value = '';
    });

    bindSave('proTransactionSave', () => {
      const typeSelect = document.getElementById('proTransactionType');
      const type = TRANSACTION_TYPES.has(typeSelect?.value) ? typeSelect.value : 'expense';
      const amount = parseAmount(document.getElementById('proTransactionAmount')?.value);
      const date = document.getElementById('proTransactionDate')?.value || todayIso();
      const accountId = document.getElementById('proTransactionAccount')?.value || '';
      const projectId = document.getElementById('proTransactionProject')?.value || '';
      const costCentreId = document.getElementById('proTransactionCostCentre')?.value || '';
      const descriptionInput = document.getElementById('proTransactionDescription');
      const description = String(descriptionInput?.value || '').trim();
      if (!accountId || amount <= 0) return;
      const state = readState();
      state.transactions.push({ id: uid('tx'), type, amount, date, accountId, projectId, costCentreId, description, createdAt: new Date().toISOString() });
      writeState(state);
      const amountInput = document.getElementById('proTransactionAmount');
      if (amountInput) amountInput.value = '';
      if (descriptionInput) descriptionInput.value = '';
    });
  }

  function ensureDefaultDate() {
    const dateInput = document.getElementById('proTransactionDate');
    if (dateInput && !dateInput.value) dateInput.value = todayIso();
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

  function init() {
    bindForms();
    ensureDefaultDate();
    render();
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();
