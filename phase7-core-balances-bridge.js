(() => {
  'use strict';

  const MONEY_STORAGE_KEY = 'every-cent-money-tracker-v1';
  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const CLOUD_STATE_KEY = 'genevieve-phase7-account-cloud-map-v1';
  const DEVICE_STATE_PREFIX = 'genevieve-phase7-bound-device-state-v1:';
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const LIABILITY_TYPES = new Set(['credit', 'loan', 'bnpl']);
  const LIQUID_TYPES = new Set(['bank', 'savings', 'cash']);
  const INCOME_CYCLES = new Set(['weekly', 'fortnightly', 'monthly', 'irregular']);
  const BILL_METHODS = new Set(['smooth', 'target']);
  let activeUserId = null;
  let cloudWriteBlocked = false;
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

  function sanitizeCloudAccounts(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    for (const [clientId, raw] of Object.entries(value)) {
      const serverId = typeof raw?.serverId === 'string' && UUID_PATTERN.test(raw.serverId) ? raw.serverId : null;
      if (!clientId || !serverId) continue;
      result[clientId] = { serverId, openingBalance: roundMoney(raw.openingBalance) };
    }
    return result;
  }

  function readCloudState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CLOUD_STATE_KEY) || 'null');
      if (!parsed || parsed.version !== 2 || !UUID_PATTERN.test(String(parsed.userId || ''))) return null;
      if (!Number.isSafeInteger(parsed.revision) || parsed.revision < 0) return null;
      return {
        version: 2,
        userId: parsed.userId,
        revision: parsed.revision,
        accounts: sanitizeCloudAccounts(parsed.accounts),
      };
    } catch {
      return null;
    }
  }

  function writeCloudState(value) {
    localStorage.setItem(CLOUD_STATE_KEY, JSON.stringify({
      version: 2,
      userId: value.userId,
      revision: value.revision,
      accounts: sanitizeCloudAccounts(value.accounts),
    }));
  }

  function hasMeaningfulLocalData(state = readMoneyState()) {
    return ['accounts', 'transactions', 'subscriptions', 'bills', 'savingsGoals']
      .some((key) => Array.isArray(state[key]) && state[key].length > 0);
  }

  function storeBoundDeviceState() {
    const cloudState = readCloudState();
    if (!cloudState) return;
    const snapshot = {
      money: localStorage.getItem(MONEY_STORAGE_KEY),
      setup: localStorage.getItem(SETUP_STORAGE_KEY),
      cloud: localStorage.getItem(CLOUD_STATE_KEY),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${DEVICE_STATE_PREFIX}${cloudState.userId}`, JSON.stringify(snapshot));
  }

  function restoreBoundDeviceState(userId, revision) {
    const key = `${DEVICE_STATE_PREFIX}${userId}`;
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {}
    if (saved?.money) localStorage.setItem(MONEY_STORAGE_KEY, saved.money);
    else localStorage.removeItem(MONEY_STORAGE_KEY);
    if (saved?.setup) localStorage.setItem(SETUP_STORAGE_KEY, saved.setup);
    else localStorage.removeItem(SETUP_STORAGE_KEY);
    if (saved?.cloud) localStorage.setItem(CLOUD_STATE_KEY, saved.cloud);
    else writeCloudState({ userId, revision, accounts: {} });
  }

  function switchBoundUser(userId, revision) {
    storeBoundDeviceState();
    restoreBoundDeviceState(userId, revision);
    setPersistenceStatus('Signed-in user changed. Device financial state was separated safely. Reloading…');
    setTimeout(() => location.reload(), 80);
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

  function protectionSnapshot(state, setup) {
    const localBillReserved = state.bills.reduce((sum, bill) => sum + Math.max(0, Number(bill?.amountReserved) || 0), 0);
    const localProtectedSavings = state.savingsGoals
      .filter((goal) => goal?.protected === true)
      .reduce((sum, goal) => sum + Math.max(0, Number(goal?.currentAmount) || 0), 0);
    const recovery = setup?.cloudRecoveryProtection && typeof setup.cloudRecoveryProtection === 'object'
      ? setup.cloudRecoveryProtection
      : null;
    if (recovery?.complete === false) {
      return { complete: false, billReserved: 0, protectedSavings: 0 };
    }
    return {
      complete: true,
      billReserved: roundMoney(Math.max(localBillReserved, Number(recovery?.billReserved) || 0)),
      protectedSavings: roundMoney(Math.max(localProtectedSavings, Number(recovery?.protectedSavings) || 0)),
    };
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
    const protection = protectionSnapshot(state, setup);
    const protectedReserved = roundMoney(emergencyReserved + protection.billReserved + protection.protectedSavings);
    return {
      assetBalance: roundMoney(assetBalance),
      debtBalance: roundMoney(debtBalance),
      liquidBalance: roundMoney(liquidBalance),
      protectedReserved,
      spendableBalance: protection.complete ? roundMoney(Math.max(0, liquidBalance - protectedReserved)) : null,
      spendableAvailable: protection.complete,
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
      <p class="small-copy" id="phase7PersistenceStatus">Account balances are stored on this device until an authenticated cloud session is available.</p>
      <div id="phase7PersistenceActions" hidden><button type="button" class="button secondary" id="phase7PersistenceAction"></button></div>`;
    anchor.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function setPersistenceStatus(message) {
    ensureSummaryPanel();
    const target = document.getElementById('phase7PersistenceStatus');
    if (target) target.textContent = message;
  }

  function setPersistenceAction(label, handler) {
    const wrapper = document.getElementById('phase7PersistenceActions');
    const current = document.getElementById('phase7PersistenceAction');
    if (!wrapper || !current) return;
    const replacement = current.cloneNode(true);
    replacement.textContent = label;
    current.parentNode.replaceChild(replacement, current);
    replacement.addEventListener('click', handler);
    wrapper.hidden = false;
  }

  function clearPersistenceAction() {
    const wrapper = document.getElementById('phase7PersistenceActions');
    if (wrapper) wrapper.hidden = true;
  }

  function renderSummary() {
    const panel = ensureSummaryPanel();
    if (!panel) return;
    const summary = localSummary(readMoneyState(), readSetup());
    const values = {
      phase7ProtectedBalance: summary.protectedReserved,
      phase7AssetBalance: summary.assetBalance,
      phase7DebtBalance: summary.debtBalance,
    };
    const spendable = document.getElementById('phase7SpendableBalance');
    if (spendable) spendable.textContent = summary.spendableAvailable ? money(summary.spendableBalance) : 'Unavailable';
    for (const [id, value] of Object.entries(values)) {
      const target = document.getElementById(id);
      if (target) target.textContent = money(value);
    }
    if (!summary.spendableAvailable) {
      setPersistenceStatus('Spendable balance is withheld because the recovered protected-reserve snapshot is incomplete.');
    }
  }

  function syncPayload() {
    const cloudState = readCloudState();
    if (!cloudState || cloudState.userId !== activeUserId) return null;
    const state = readMoneyState();
    const setup = readSetup();
    const protection = protectionSnapshot(state, setup);
    if (!protection.complete) return null;
    const accounts = state.accounts.map((account) => {
      const mapping = cloudState.accounts[account?.id] || null;
      return {
        id: String(account?.id || ''),
        serverId: mapping?.serverId || null,
        name: String(account?.name || '').trim(),
        type: String(account?.type || 'other'),
        openingBalance: mapping ? mapping.openingBalance : roundMoney(account?.openingBalance),
        currentBalance: computedBalance(account, state.transactions),
      };
    });
    return {
      syncMode: 'upsert_only',
      userId: cloudState.userId,
      baseRevision: cloudState.revision,
      accounts,
      settings: {
        emergencyBufferAmount: Math.max(0, Number(setup.emergencyCash) || 0),
        incomeCycle: INCOME_CYCLES.has(setup.payFrequency) ? setup.payFrequency : null,
        budgetingMethod: BILL_METHODS.has(setup.billMode) ? setup.billMode : 'mixed',
      },
      protection,
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
    const protection = body?.protection && typeof body.protection === 'object' ? body.protection : { complete: false };
    const established = state.accounts.length > 0 || (Array.isArray(body?.accounts) && body.accounts.length > 0);
    const setup = {
      version: 1,
      completed: established,
      step: established ? 8 : 1,
      emergencyCash: Math.max(0, Number(settings.emergencyBufferAmount) || 0),
      accounts: [],
      bills: [],
      savingsGoals: [],
      cloudRecoveryProtection: {
        complete: protection.complete === true,
        billReserved: Math.max(0, Number(protection.billReserved) || 0),
        protectedSavings: Math.max(0, Number(protection.protectedSavings) || 0),
        snapshotAt: protection.snapshotAt || null,
      },
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

  function restoreCloudAccounts(body, state) {
    const cloudAccounts = Array.isArray(body.accounts) ? body.accounts : [];
    const accounts = cloudAccounts.map((account) => {
      const clientId = String(account.clientId || account.id);
      return {
        id: clientId,
        name: account.name,
        type: account.type,
        // Cloud recovery has no Phase 8 transaction history. Use the current
        // snapshot as the new device baseline while retaining the immutable
        // original basis separately in the user-bound cloud map.
        openingBalance: roundMoney(account.currentBalance),
        createdAt: account.createdAt || new Date().toISOString(),
      };
    });
    directWriteMoneyState({ ...state, accounts });
    writeCloudState({
      userId: body.userId,
      revision: body.revision,
      accounts: Object.fromEntries(cloudAccounts.map((account) => [
        String(account.clientId || account.id),
        { serverId: account.id, openingBalance: roundMoney(account.openingBalance) },
      ])),
    });
    const restored = readSetup();
    const protection = body.protection && typeof body.protection === 'object' ? body.protection : { complete: false };
    writeSetup({
      ...restored,
      completed: true,
      step: 8,
      emergencyCash: Math.max(0, Number(body?.settings?.emergencyBufferAmount) || Number(restored.emergencyCash) || 0),
      cloudRecoveryProtection: {
        complete: protection.complete === true,
        billReserved: Math.max(0, Number(protection.billReserved) || 0),
        protectedSavings: Math.max(0, Number(protection.protectedSavings) || 0),
        snapshotAt: protection.snapshotAt || null,
      },
      migratedCloudAccountUser: true,
      completedAt: restored.completedAt || new Date().toISOString(),
    });
    storeBoundDeviceState();
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
    if (!UUID_PATTERN.test(String(body?.userId || '')) || !Number.isSafeInteger(body?.revision)) {
      setPersistenceStatus('Cloud identity could not be verified. No device data was uploaded.');
      return;
    }
    activeUserId = body.userId;
    const cloudAccounts = Array.isArray(body.accounts) ? body.accounts : [];
    const state = readMoneyState();
    const cloudState = readCloudState();

    if (cloudState && cloudState.userId !== activeUserId) {
      cloudWriteBlocked = true;
      switchBoundUser(activeUserId, body.revision);
      return;
    }

    if (!cloudState) {
      if (hasMeaningfulLocalData(state)) {
        cloudWriteBlocked = true;
        if (cloudAccounts.length || body.revision > 0) {
          setPersistenceStatus('This device data is not linked to the signed-in user, and cloud data already exists. Nothing was uploaded.');
          return;
        }
        setPersistenceStatus('This device data is not yet linked to the signed-in user. Nothing will upload without your confirmation.');
        setPersistenceAction('Link this device data', () => {
          if (!confirm('Link the financial data currently on this device to the signed-in account?')) return;
          writeCloudState({ userId: activeUserId, revision: body.revision, accounts: {} });
          cloudWriteBlocked = false;
          clearPersistenceAction();
          storeBoundDeviceState();
          void syncCloudAccounts(true);
        });
        return;
      }
      writeCloudState({ userId: activeUserId, revision: body.revision, accounts: {} });
    }

    const currentCloudState = readCloudState();
    if (!currentCloudState || currentCloudState.userId !== activeUserId) return;
    if (currentCloudState.revision !== body.revision) {
      cloudWriteBlocked = true;
      setPersistenceStatus('Another device has newer cloud data. This device was blocked from overwriting it.');
      return;
    }

    const hadLocalSetup = hasSetupState();
    restoreCloudSettingsForEstablishedUser(body, state);
    if (hadLocalSetup && readSetup().completed !== true) {
      setPersistenceStatus('Finish first-time setup before cloud account synchronisation begins.');
      return;
    }

    if (!state.accounts.length && !state.transactions.length && cloudAccounts.length) {
      restoreCloudAccounts(body, state);
      setPersistenceStatus(body?.protection?.complete === true
        ? 'Recovered account balances and the complete protected-reserve snapshot from Neon. Reloading…'
        : 'Recovered account balances, but spendable money is withheld because protection data is incomplete. Reloading…');
      setTimeout(() => location.reload(), 80);
      return;
    }

    await syncCloudAccounts(true);
  }

  async function syncCloudAccounts(force = false) {
    if (syncInFlight || cloudWriteBlocked || !activeUserId) return;
    if (!setupAllowsCloudSync()) {
      setPersistenceStatus('Finish first-time setup before cloud account synchronisation begins.');
      return;
    }
    const payload = syncPayload();
    if (!payload) {
      setPersistenceStatus('Cloud sync is blocked until user binding and protected-reserve data are complete.');
      return;
    }
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
        setPersistenceStatus('Account balances are stored on this device until you sign in with the linked account.');
        return;
      }
      if (response.status === 409) {
        cloudWriteBlocked = true;
        setPersistenceStatus('Another device changed cloud data. This device was blocked from overwriting it.');
        return;
      }
      if (!response.ok) {
        setPersistenceStatus('Cloud persistence is temporarily unavailable; device balances remain intact.');
        return;
      }
      const body = await response.json().catch(() => null);
      if (body?.userId !== activeUserId || !Number.isSafeInteger(body?.revision)) {
        cloudWriteBlocked = true;
        setPersistenceStatus('Cloud identity confirmation failed. No further device data will upload.');
        return;
      }
      const mappings = Array.isArray(body.mappings) ? body.mappings : [];
      const nextMap = {};
      for (const mapping of mappings) {
        if (typeof mapping?.clientId !== 'string' || !UUID_PATTERN.test(String(mapping?.serverId || ''))) continue;
        nextMap[mapping.clientId] = {
          serverId: mapping.serverId,
          openingBalance: roundMoney(mapping.openingBalance),
        };
      }
      writeCloudState({ userId: activeUserId, revision: body.revision, accounts: nextMap });
      const setup = readSetup();
      writeSetup({
        ...setup,
        cloudRecoveryProtection: {
          complete: true,
          billReserved: payload.protection.billReserved,
          protectedSavings: payload.protection.protectedSavings,
          snapshotAt: body?.protection?.snapshotAt || new Date().toISOString(),
        },
      });
      storeBoundDeviceState();
      lastSyncSignature = signatureFor(syncPayload());
      setPersistenceStatus('Revisioned account snapshots are persisted through Cloudflare → Hyperdrive → Neon.');
    } catch {
      setPersistenceStatus('Cloud persistence is temporarily unavailable; device balances remain intact.');
    } finally {
      syncInFlight = false;
    }
  }

  async function archiveSelectedAccount() {
    const state = readMoneyState();
    const accountId = document.getElementById('accountId')?.value || '';
    if (!accountId) return;
    const used = state.transactions.some((item) => item.accountId === accountId || item.toAccountId === accountId)
      || state.subscriptions.some((item) => item.accountId === accountId)
      || state.bills.some((item) => item.accountId === accountId);
    if (used) {
      setPersistenceStatus('This account is linked to transactions, subscriptions or bills. Change those first.');
      return;
    }
    if (!confirm('Archive this account? Its financial history will be preserved.')) return;

    const cloudState = readCloudState();
    const mapping = cloudState?.accounts?.[accountId] || null;
    if (mapping) {
      if (cloudWriteBlocked || !activeUserId || cloudState.userId !== activeUserId) {
        setPersistenceStatus('Cloud archive was blocked because the signed-in user or device revision is not verified.');
        return;
      }
      const response = await fetch(`/api/phase7/accounts/${encodeURIComponent(mapping.serverId)}/archive`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          confirm: 'ARCHIVE_ACCOUNT',
          userId: cloudState.userId,
          baseRevision: cloudState.revision,
        }),
      }).catch(() => null);
      if (!response?.ok) {
        if (response?.status === 409) cloudWriteBlocked = true;
        setPersistenceStatus('The account was not removed because its owned cloud archive could not be confirmed.');
        return;
      }
      const body = await response.json().catch(() => null);
      if (body?.userId !== activeUserId || !Number.isSafeInteger(body?.revision)) {
        cloudWriteBlocked = true;
        setPersistenceStatus('The account archive response could not be tied to the signed-in user.');
        return;
      }
      const nextAccounts = { ...cloudState.accounts };
      delete nextAccounts[accountId];
      writeCloudState({ userId: activeUserId, revision: body.revision, accounts: nextAccounts });
    }

    directWriteMoneyState({ ...state, accounts: state.accounts.filter((account) => account.id !== accountId) });
    storeBoundDeviceState();
    document.getElementById('accountDialog')?.close();
    setPersistenceStatus('Account archived. Financial history was preserved. Reloading…');
    setTimeout(() => location.reload(), 80);
  }

  function scheduleRefreshAndSync(delay = 180) {
    renderSummary();
    storeBoundDeviceState();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { void syncCloudAccounts(false); }, delay);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    void reconcileInitialCloudState();

    document.addEventListener('click', (event) => {
      if (event.target?.id === 'deleteAccountButton') {
        event.preventDefault();
        event.stopImmediatePropagation();
        void archiveSelectedAccount();
        return;
      }
      setTimeout(() => scheduleRefreshAndSync(180), 0);
    }, true);
    document.addEventListener('submit', () => setTimeout(() => scheduleRefreshAndSync(120), 0), true);
    document.addEventListener('change', () => setTimeout(() => scheduleRefreshAndSync(180), 0), true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        storeBoundDeviceState();
        void syncCloudAccounts(false);
      }
    });
    setInterval(() => scheduleRefreshAndSync(0), 15_000);
  });
})();
