(() => {
  'use strict';

  const MONEY_STORAGE_KEY = 'every-cent-money-tracker-v1';
  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const CLOUD_MAP_KEY = 'genevieve-phase7-account-cloud-map-v1';
  const LIABILITY_TYPES = new Set(['credit', 'loan', 'bnpl']);
  const LIQUID_TYPES = new Set(['bank', 'savings', 'cash']);
  const INCOME_CYCLES = new Set(['weekly', 'fortnightly', 'monthly', 'irregular']);
  const BILL_METHODS = new Set(['smooth', 'target']);
  let lastSyncSignature = '';
  let syncTimer = null;
  let syncInFlight = false;

  function roundMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(roundMoney(value));
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

  function hasSetupState() {
    return localStorage.getItem(SETUP_STORAGE_KEY) !== null;
  }

  function readSetup() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETUP_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeSetup(setup) {
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify({
      ...setup,
      version: 1,
      updatedAt: new Date().toISOString(),
    }));
  }

  function readCloudMap() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CLOUD_MAP_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeCloudMap(value) {
    localStorage.setItem(CLOUD_MAP_KEY, JSON.stringify(value || {}));
  }

  function computedBalance(account, transactions) {
    let balance = roundMoney(account?.openingBalance);
    const liability = LIABILITY_TYPES.has(account?.type);
    for (const transaction of transactions) {
      const amount = roundMoney(transaction?.amount);
      const type = ['income', 'expense', 'transfer'].includes(transaction?.type) ? transaction.type : 'expense';
      if (type === 'income' && transaction.accountId === account.id) balance += liability ? -amount : amount;
      if (type === 'expense' && transaction.accountId === account.id) balance += liability ? amount : -amount;
      if (type === 'transfer') {
        if (transaction.accountId === account.id) balance += liability ? amount : -amount;
        if (transaction.toAccountId === account.id) balance += liability ? -amount : amount;
      }
    }
    return roundMoney(balance);
  }

  function localSummary(state, setup) {
    let assetBalance = 0;
    let debtBalance = 0;
    let liquidBalance = 0;
    for (const account of state.accounts) {
      const balance = computedBalance(account, state.transactions);
      if (LIABILITY_TYPES.has(account.type)) debtBalance += Math.max(0, balance);
      else {
        assetBalance += balance;
        if (LIQUID_TYPES.has(account.type)) liquidBalance += balance;
      }
    }
    const emergencyReserved = Math.max(0, Number(setup.emergencyCash) || 0);
    const billReserved = state.bills.reduce((sum, bill) => sum + Math.max(0, Number(bill?.amountReserved) || 0), 0);
    const protectedSavings = state.savingsGoals
      .filter((goal) => goal?.protected === true)
      .reduce((sum, goal) => sum + Math.max(0, Number(goal?.currentAmount) || 0), 0);
    const protectedReserved = roundMoney(emergencyReserved + billReserved + protectedSavings);
    return {
      assetBalance: roundMoney(assetBalance),
      debtBalance: roundMoney(debtBalance),
      liquidBalance: roundMoney(liquidBalance),
      protectedReserved,
      spendableBalance: roundMoney(Math.max(0, liquidBalance - protectedReserved)),
    };
  }

  function ensureSummaryPanel() {
    let panel = document.getElementById('phase7BalanceSummary');
    if (panel) return panel;
    const anchor = document.querySelector('[data-view="dashboard"] .stats-grid') || document.querySelector('#dashboardView .stats-grid');
    if (!anchor) return null;
    panel = document.createElement('section');
    panel.id = 'phase7BalanceSummary';
    panel.setAttribute('aria-label', 'Spendable and protected balances');
    panel.innerHTML = `
      <div class="section-heading"><div><p class="eyebrow">CORE BALANCES</p><h2>What is actually available</h2></div></div>
      <div class="stats-grid compact">
        <article class="stat-card"><span>Spendable balance</span><strong id="phase7SpendableBalance">$0.00</strong></article>
        <article class="stat-card"><span>Protected / reserved</span><strong id="phase7ProtectedBalance">$0.00</strong></article>
        <article class="stat-card"><span>Assets</span><strong id="phase7AssetBalance">$0.00</strong></article>
        <article class="stat-card"><span>Debts owed</span><strong id="phase7DebtBalance">$0.00</strong></article>
      </div>
      <p class="small-copy" id="phase7BalanceNote">Internal transfers move money between your own accounts and are not counted as spending.</p>
      <p class="small-copy" id="phase7BalanceScopeNote">This Phase 7 balance subtracts the protected and reserved amounts currently recorded. The full safe-to-spend forecast is a later chronological phase.</p>
      <p class="small-copy" id="phase7PersistenceStatus">Account balances are stored on this device until an authenticated cloud session is available.</p>`;
    anchor.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function setPersistenceStatus(message) {
    const target = document.getElementById('phase7PersistenceStatus');
    if (target) target.textContent = message;
  }

  function renderSummary() {
    const panel = ensureSummaryPanel();
    if (!panel) return;
    const summary = localSummary(readMoneyState(), readSetup());
    const values = {
      phase7SpendableBalance: summary.spendableBalance,
      phase7ProtectedBalance: summary.protectedReserved,
      phase7AssetBalance: summary.assetBalance,
      phase7DebtBalance: summary.debtBalance,
    };
    for (const [id, value] of Object.entries(values)) {
      const target = document.getElementById(id);
      if (target) target.textContent = money(value);
    }
  }

  function syncPayload() {
    const state = readMoneyState();
    const setup = readSetup();
    const cloudMap = readCloudMap();
    const accounts = state.accounts.map((account) => ({
      id: String(account?.id || ''),
      serverId: typeof cloudMap[account?.id] === 'string' ? cloudMap[account.id] : null,
      name: String(account?.name || '').trim(),
      type: String(account?.type || 'other'),
      balance: computedBalance(account, state.transactions),
    }));
    return {
      fullSnapshot: true,
      accounts,
      settings: {
        emergencyBufferAmount: Math.max(0, Number(setup.emergencyCash) || 0),
        incomeCycle: INCOME_CYCLES.has(setup.payFrequency) ? setup.payFrequency : null,
        budgetingMethod: BILL_METHODS.has(setup.billMode) ? setup.billMode : 'mixed',
      },
    };
  }

  function signatureFor(payload) {
    return JSON.stringify(payload);
  }

  function setupAllowsCloudSync() {
    if (!hasSetupState()) return true;
    return readSetup().completed === true;
  }

  function restoreCloudSettingsForEstablishedUser(body, state) {
    if (hasSetupState()) return;
    if (!state.accounts.length && !Array.isArray(body?.accounts)) return;
    const settings = body?.settings && typeof body.settings === 'object' ? body.settings : {};
    const setup = {
      version: 1,
      completed: state.accounts.length > 0 || (Array.isArray(body?.accounts) && body.accounts.length > 0),
      step: state.accounts.length > 0 || (Array.isArray(body?.accounts) && body.accounts.length > 0) ? 8 : 1,
      emergencyCash: Math.max(0, Number(settings.emergencyBufferAmount) || 0),
      accounts: [],
      bills: [],
      savingsGoals: [],
      migratedCloudAccountUser: true,
      completedAt: new Date().toISOString(),
    };
    if (INCOME_CYCLES.has(settings.incomeCycle)) setup.payFrequency = settings.incomeCycle;
    if (BILL_METHODS.has(settings.budgetingMethod)) setup.billMode = settings.budgetingMethod;
    writeSetup(setup);
  }

  async function fetchCloudAccounts() {
    return fetch('/api/phase7/accounts', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
  }

  async function reconcileInitialCloudState() {
    let response;
    try {
      response = await fetchCloudAccounts();
    } catch {
      setPersistenceStatus('Cloud persistence is temporarily unavailable; device balances remain intact.');
      return;
    }
    if (response.status === 401 || response.status === 403) {
      setPersistenceStatus('Account balances are stored on this device until you sign in.');
      return;
    }
    if (!response.ok) {
      setPersistenceStatus('Cloud persistence is temporarily unavailable; device balances remain intact.');
      return;
    }

    const body = await response.json().catch(() => null);
    const cloudAccounts = Array.isArray(body?.accounts) ? body.accounts : [];
    const state = readMoneyState();
    const hadLocalSetup = hasSetupState();
    restoreCloudSettingsForEstablishedUser(body, state);

    if (hadLocalSetup && readSetup().completed !== true) {
      setPersistenceStatus('Finish first-time setup before cloud account synchronisation begins.');
      return;
    }

    const cloudMap = readCloudMap();
    const hasMappingHistory = Object.keys(cloudMap).length > 0;
    if (!state.accounts.length && !state.transactions.length && !hasMappingHistory && cloudAccounts.length) {
      const accounts = cloudAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        openingBalance: roundMoney(account.balance),
        createdAt: account.createdAt || new Date().toISOString(),
      }));
      directWriteMoneyState({ ...state, accounts });
      writeCloudMap(Object.fromEntries(accounts.map((account) => [account.id, account.id])));
      const restored = readSetup();
      writeSetup({
        ...restored,
        completed: true,
        step: 8,
        emergencyCash: Math.max(0, Number(body?.settings?.emergencyBufferAmount) || Number(restored.emergencyCash) || 0),
        migratedCloudAccountUser: true,
        completedAt: restored.completedAt || new Date().toISOString(),
      });
      setPersistenceStatus('Recovered your account balances and protected emergency amount from Neon. Reloading…');
      setTimeout(() => location.reload(), 80);
      return;
    }

    await syncCloudAccounts(true);
  }

  async function syncCloudAccounts(force = false) {
    if (syncInFlight) return;
    if (!setupAllowsCloudSync()) {
      setPersistenceStatus('Finish first-time setup before cloud account synchronisation begins.');
      return;
    }
    const payload = syncPayload();
    const signature = signatureFor(payload);
    if (!force && signature === lastSyncSignature) return;
    syncInFlight = true;
    try {
      const response = await fetch('/api/phase7/accounts/sync', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.status === 401 || response.status === 403) {
        setPersistenceStatus('Account balances are stored on this device until you sign in.');
        return;
      }
      if (!response.ok) {
        setPersistenceStatus('Cloud persistence is temporarily unavailable; device balances remain intact.');
        return;
      }
      const body = await response.json().catch(() => null);
      const mappings = Array.isArray(body?.mappings) ? body.mappings : [];
      const activeIds = new Set(payload.accounts.map((account) => account.id));
      const nextMap = {};
      for (const mapping of mappings) {
        if (activeIds.has(mapping?.clientId) && typeof mapping?.serverId === 'string') nextMap[mapping.clientId] = mapping.serverId;
      }
      writeCloudMap(nextMap);
      lastSyncSignature = signatureFor(syncPayload());
      setPersistenceStatus('Account balance snapshots are securely persisted through Cloudflare → Hyperdrive → Neon.');
    } catch {
      setPersistenceStatus('Cloud persistence is temporarily unavailable; device balances remain intact.');
    } finally {
      syncInFlight = false;
    }
  }

  function scheduleRefreshAndSync(delay = 180) {
    renderSummary();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncCloudAccounts(false), delay);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    reconcileInitialCloudState();

    document.addEventListener('submit', () => setTimeout(() => scheduleRefreshAndSync(120), 0), true);
    document.addEventListener('click', () => setTimeout(() => scheduleRefreshAndSync(180), 0), true);
    document.addEventListener('change', () => setTimeout(() => scheduleRefreshAndSync(180), 0), true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') syncCloudAccounts(false);
    });
    setInterval(() => scheduleRefreshAndSync(0), 15_000);
  });
})();
