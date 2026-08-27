(() => {
  'use strict';

  const MONEY_STORAGE_KEY = 'every-cent-money-tracker-v1';
  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const CLOUD_STATE_KEY = 'genevieve-phase7-account-cloud-map-v1';
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PAY_FREQUENCIES = new Set(['weekly', 'fortnightly', 'monthly', 'irregular']);
  const BILL_MODES = new Set(['smooth', 'target']);

  const $ = (selector, root = document) => root.querySelector(selector);

  function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function roundMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100) / 100 : 0;
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

  function readSetupState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETUP_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function sanitizeCloudState(value) {
    if (!value || value.version !== 2 || !UUID_PATTERN.test(String(value.userId || ''))) return null;
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) return null;
    const accounts = {};
    if (value.accounts && typeof value.accounts === 'object' && !Array.isArray(value.accounts)) {
      for (const [clientId, mapping] of Object.entries(value.accounts)) {
        if (!clientId || !UUID_PATTERN.test(String(mapping?.serverId || ''))) continue;
        accounts[clientId] = {
          serverId: mapping.serverId,
          openingBalance: Number.isFinite(Number(mapping.openingBalance))
            ? Math.round(Number(mapping.openingBalance) * 100) / 100
            : 0,
        };
      }
    }
    return { version: 2, userId: value.userId, revision: value.revision, accounts };
  }

  function readCloudState() {
    try {
      return sanitizeCloudState(JSON.parse(localStorage.getItem(CLOUD_STATE_KEY) || 'null'));
    } catch {
      return null;
    }
  }

  function sanitizeSetupState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const step = Math.min(8, Math.max(1, Number(value.step) || 1));
    return {
      ...value,
      version: 1,
      completed: value.completed === true,
      step,
      payFrequency: PAY_FREQUENCIES.has(value.payFrequency) ? value.payFrequency : '',
      nextPayDate: validDate(value.nextPayDate) ? value.nextPayDate : '',
      billMode: BILL_MODES.has(value.billMode) ? value.billMode : '',
      emergencyCash: roundMoney(value.emergencyCash),
      accounts: Array.isArray(value.accounts) ? value.accounts : [],
      bills: Array.isArray(value.bills) ? value.bills : [],
      savingsGoals: Array.isArray(value.savingsGoals) ? value.savingsGoals : [],
      restoredAt: new Date().toISOString(),
    };
  }

  function directWriteMoneyState(state) {
    // Preserve the complete combined Phase 2 state without passing through the
    // staged Storage.setItem migration wrappers.
    localStorage[MONEY_STORAGE_KEY] = JSON.stringify(state);
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

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function fullBackup(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = readMoneyState();
    const phase7Setup = readSetupState();
    const phase7CloudBinding = readCloudState();
    const payload = {
      exportedAt: new Date().toISOString(),
      ...state,
      phase7Setup,
      phase7CloudBinding,
    };
    downloadFile(
      `every-cent-backup-${todayIso()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    showToast('Backup downloaded with first-time setup settings.');
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
      if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.subscriptions)) {
        throw new Error('Invalid backup');
      }

      const currentCloudBinding = readCloudState();
      const hasCloudBinding = Object.prototype.hasOwnProperty.call(parsed, 'phase7CloudBinding');
      const restoredCloudBinding = hasCloudBinding ? sanitizeCloudState(parsed.phase7CloudBinding) : null;
      if (hasCloudBinding && parsed.phase7CloudBinding !== null && !restoredCloudBinding) {
        throw new Error('Invalid cloud binding');
      }
      if (currentCloudBinding && restoredCloudBinding && currentCloudBinding.userId !== restoredCloudBinding.userId) {
        throw new Error('Different signed-in account');
      }
      if (currentCloudBinding && !hasCloudBinding) {
        throw new Error('Legacy backup is not user-bound');
      }

      directWriteMoneyState({
        version: parsed.version || 1,
        accounts: parsed.accounts,
        transactions: parsed.transactions,
        subscriptions: parsed.subscriptions,
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        savingsGoals: Array.isArray(parsed.savingsGoals) ? parsed.savingsGoals : [],
      });

      if (Object.prototype.hasOwnProperty.call(parsed, 'phase7Setup')) {
        const restoredSetup = sanitizeSetupState(parsed.phase7Setup);
        if (restoredSetup) {
          localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(restoredSetup));
        } else {
          localStorage.removeItem(SETUP_STORAGE_KEY);
        }
      } else {
        // Legacy backups pre-date Phase 7. Removing the marker lets the Phase 7
        // runtime classify a restored non-empty money store as an established
        // user on reload, while an empty legacy backup correctly returns to
        // first-time setup.
        localStorage.removeItem(SETUP_STORAGE_KEY);
      }

      if (restoredCloudBinding) {
        localStorage.setItem(CLOUD_STATE_KEY, JSON.stringify(restoredCloudBinding));
      } else {
        localStorage.removeItem(CLOUD_STATE_KEY);
      }

      showToast('Backup restored. Reloading…');
      setTimeout(() => location.reload(), 250);
    } catch (error) {
      if (error?.message === 'Different signed-in account' || error?.message === 'Legacy backup is not user-bound') {
        showToast('Restore blocked: this backup is not bound to the current signed-in account.');
      } else {
        showToast('That file is not a valid Every Cent backup.');
      }
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

  function installPhase7DataControls() {
    // Phase 2 installs its complete-money backup controls first. Clone them once
    // more so this bridge becomes the final owner and can preserve Phase 7 setup
    // metadata without modifying the sealed Phase 2 runtime.
    const backupButton = replaceDataControl('backupButton');
    const restoreButton = replaceDataControl('restoreButton');
    const restoreInput = replaceDataControl('restoreInput');
    backupButton?.addEventListener('click', fullBackup, true);
    restoreButton?.addEventListener('click', beginRestore, true);
    restoreInput?.addEventListener('change', restoreFullBackup, true);
  }

  document.addEventListener('DOMContentLoaded', installPhase7DataControls);
})();
