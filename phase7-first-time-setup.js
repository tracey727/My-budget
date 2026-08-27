(() => {
  'use strict';

  const MONEY_STORAGE_KEY = 'every-cent-money-tracker-v1';
  const SETUP_STORAGE_KEY = 'genevieve-first-time-setup-v1';
  const TOTAL_STEPS = 8;
  const PAY_FREQUENCIES = new Set(['weekly', 'fortnightly', 'monthly', 'irregular']);
  const PAY_PERIODS_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };
  const PAY_FREQUENCY_LABELS = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    irregular: 'Irregular',
  };
  const BILL_FREQUENCIES = new Set(['weekly', 'fortnightly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'one_off']);
  const BILL_CYCLES_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4, half_yearly: 2, yearly: 1, one_off: 1 };
  const BILL_FREQUENCY_LABELS = {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Half-yearly',
    yearly: 'Yearly',
    one_off: 'One-off',
  };
  const ACCOUNT_TYPES = new Set(['bank', 'savings', 'cash', 'credit', 'loan', 'bnpl', 'investment', 'other']);
  const ACCOUNT_TYPE_LABELS = {
    bank: 'Bank / transaction',
    savings: 'Savings',
    cash: 'Cash',
    credit: 'Credit card',
    loan: 'Loan / debt',
    bnpl: 'BNPL / buy now pay later',
    investment: 'Investment',
    other: 'Other',
  };

  let setup = loadSetup();

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function roundMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(Math.max(0, number) * 100) / 100 : 0;
  }

  function money(value) {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(roundMoney(value));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

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

  function dateValue(value) {
    if (!validDate(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function formatDate(value) {
    const date = dateValue(value);
    if (!date) return 'Not set';
    return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function emptySetup() {
    return {
      version: 1,
      completed: false,
      step: 1,
      payFrequency: '',
      nextPayDate: '',
      accounts: [],
      bills: [],
      billMode: '',
      emergencyCash: 0,
      savingsGoals: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeSetup(value) {
    const base = emptySetup();
    const source = value && typeof value === 'object' ? value : {};
    return {
      ...base,
      ...source,
      version: 1,
      completed: source.completed === true,
      step: Math.min(TOTAL_STEPS, Math.max(1, Number(source.step) || 1)),
      payFrequency: PAY_FREQUENCIES.has(source.payFrequency) ? source.payFrequency : '',
      nextPayDate: validDate(source.nextPayDate) ? source.nextPayDate : '',
      accounts: Array.isArray(source.accounts) ? source.accounts : [],
      bills: Array.isArray(source.bills) ? source.bills : [],
      billMode: source.billMode === 'smooth' || source.billMode === 'target' ? source.billMode : '',
      emergencyCash: roundMoney(source.emergencyCash),
      savingsGoals: Array.isArray(source.savingsGoals) ? source.savingsGoals : [],
      updatedAt: new Date().toISOString(),
    };
  }

  function loadSetup() {
    try {
      const raw = localStorage.getItem(SETUP_STORAGE_KEY);
      return normalizeSetup(raw ? JSON.parse(raw) : null);
    } catch {
      return emptySetup();
    }
  }

  function saveSetup() {
    setup.updatedAt = new Date().toISOString();
    localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(setup));
  }

  function readMoneyState() {
    try {
      const raw = localStorage.getItem(MONEY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
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

  function hasMeaningfulFinancialData(state) {
    return ['accounts', 'transactions', 'subscriptions', 'bills', 'savingsGoals']
      .some(key => Array.isArray(state?.[key]) && state[key].length > 0);
  }

  function directWriteMoneyState(state) {
    // Phase 2 deliberately stages Storage.setItem wrappers. The established
    // subscriptions/savings runtime itself uses named-property assignment when
    // it must preserve the complete combined state, so Phase 7 follows that
    // same audited path when committing onboarding atomically.
    localStorage[MONEY_STORAGE_KEY] = JSON.stringify(state);
  }

  function annualBillCost(amount, frequency) {
    return roundMoney(roundMoney(amount) * (BILL_CYCLES_PER_YEAR[frequency] || 0));
  }

  function smoothContribution(amount, billFrequency, payFrequency) {
    if (payFrequency === 'irregular') return null;
    const payPeriods = PAY_PERIODS_PER_YEAR[payFrequency];
    if (!payPeriods) return null;
    return roundMoney(annualBillCost(amount, billFrequency) / payPeriods);
  }

  function targetAlertStatus(bill, now = dateValue(todayIso())) {
    const target = roundMoney(bill.targetAmount ?? bill.amount);
    const reserved = roundMoney(bill.amountReserved);
    if (bill.paidStatus === 'paid' || target <= reserved || target <= 0) return 'green';
    const due = dateValue(bill.nextDueDate);
    if (!due || !now) return 'green';
    if (due.getTime() < now.getTime()) return 'recovery';

    const created = dateValue(String(bill.createdAt || '').slice(0, 10)) || now;
    const total = Math.max(1, due.getTime() - created.getTime());
    const elapsed = Math.min(total, Math.max(0, now.getTime() - created.getTime()));
    const expectedReserved = roundMoney(target * (elapsed / total));
    const nextPay = dateValue(setup.nextPayDate);

    if (nextPay && due.getTime() <= nextPay.getTime() && target > reserved) return 'red';
    if (reserved + 0.01 >= expectedReserved) return 'green';
    if (expectedReserved <= 0) return 'green';
    return reserved / expectedReserved < 0.5 ? 'red' : 'yellow';
  }

  function applyBillPlan(bill) {
    const amount = roundMoney(bill.amount);
    const method = setup.billMode === 'smooth' ? 'smooth' : 'target';
    const planned = {
      ...bill,
      amount,
      budgetingMethod: method,
      targetAmount: amount,
      amountReserved: roundMoney(bill.amountReserved),
      requiredContribution: method === 'smooth'
        ? (smoothContribution(amount, bill.frequency, setup.payFrequency) ?? 0)
        : 0,
      paidStatus: bill.paidStatus === 'paid' ? 'paid' : 'unpaid',
    };
    planned.alertStatus = method === 'target' ? targetAlertStatus(planned) : 'green';
    return planned;
  }

  function requiredSavingsContribution(target, currentAmount, deadline, periodDays) {
    const targetAmount = roundMoney(target);
    const current = roundMoney(currentAmount);
    const gap = Math.max(0, targetAmount - current);
    const due = dateValue(deadline);
    const today = dateValue(todayIso());
    if (!due || !today || gap <= 0) return 0;
    const days = Math.max(0, Math.ceil((due.getTime() - today.getTime()) / 86_400_000));
    const periods = Math.max(1, Math.ceil(days / periodDays));
    return roundMoney(gap / periods);
  }

  function normalizeSavingsGoal(goal) {
    const target = roundMoney(goal.target);
    const currentAmount = roundMoney(goal.currentAmount);
    return {
      id: String(goal.id || uid('goal')),
      goal: String(goal.goal || '').trim(),
      target,
      currentAmount,
      deadline: validDate(goal.deadline) ? goal.deadline : '',
      requiredWeeklyAmount: requiredSavingsContribution(target, currentAmount, goal.deadline, 7),
      requiredFortnightlyAmount: requiredSavingsContribution(target, currentAmount, goal.deadline, 14),
      progress: target > 0 ? Math.round(Math.min(100, (currentAmount / target) * 100) * 100) / 100 : 0,
      protected: goal.protected === true,
      notes: String(goal.notes || '').trim(),
      createdAt: String(goal.createdAt || new Date().toISOString()),
    };
  }

  function buildFirstPlan() {
    const bills = setup.bills.map(applyBillPlan);
    const regularPerPayBills = setup.billMode === 'smooth' && setup.payFrequency !== 'irregular'
      ? roundMoney(bills.reduce((sum, bill) => sum + bill.requiredContribution, 0))
      : null;
    return {
      bills,
      regularPerPayBills,
      totalBillTargets: roundMoney(bills.reduce((sum, bill) => sum + bill.targetAmount, 0)),
      emergencyCash: roundMoney(setup.emergencyCash),
      savingsGoals: setup.savingsGoals.map(normalizeSavingsGoal),
    };
  }

  function refreshCompletedBillPlans() {
    if (!setup.completed || !PAY_FREQUENCIES.has(setup.payFrequency) || !['smooth', 'target'].includes(setup.billMode)) return;
    const state = readMoneyState();
    let changed = false;
    const bills = state.bills.map(bill => {
      if (!bill || !['smooth', 'target'].includes(bill.budgetingMethod)) return bill;
      const next = { ...bill };
      if (bill.budgetingMethod === 'smooth' && setup.payFrequency !== 'irregular') {
        const contribution = smoothContribution(bill.amount, bill.frequency, setup.payFrequency) ?? 0;
        if (roundMoney(bill.requiredContribution) !== contribution) {
          next.requiredContribution = contribution;
          changed = true;
        }
      }
      if (bill.budgetingMethod === 'target') {
        const status = targetAlertStatus(bill);
        if (bill.alertStatus !== status) {
          next.alertStatus = status;
          changed = true;
        }
      }
      return next;
    });
    if (changed) directWriteMoneyState({ ...state, bills });
  }

  function markEstablishedUserCompleteIfNeeded() {
    if (localStorage.getItem(SETUP_STORAGE_KEY)) return;
    const state = readMoneyState();
    if (!hasMeaningfulFinancialData(state)) return;
    setup = {
      ...emptySetup(),
      completed: true,
      migratedEstablishedUser: true,
      completedAt: new Date().toISOString(),
      step: TOTAL_STEPS,
    };
    saveSetup();
  }

  markEstablishedUserCompleteIfNeeded();
  refreshCompletedBillPlans();

  function installStyles() {
    if (document.getElementById('genevievePhase7Styles')) return;
    const style = document.createElement('style');
    style.id = 'genevievePhase7Styles';
    style.textContent = `
      body.phase7-setup-open { overflow: hidden !important; }
      .phase7-shell { position: fixed; inset: 0; z-index: 100000; overflow-y: auto; background: radial-gradient(circle at top, #7a2635 0, #3b0f19 42%, #18080d 100%); color: #fff8ed; padding: max(20px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom)); font-family: inherit; }
      .phase7-card { width: min(680px, 100%); min-height: min(760px, calc(100dvh - 44px)); margin: 0 auto; border: 1px solid rgba(217,184,105,.55); border-radius: 28px; background: rgba(25,9,14,.94); box-shadow: 0 28px 80px rgba(0,0,0,.45); padding: clamp(22px, 5vw, 42px); display: flex; flex-direction: column; }
      .phase7-top { display: flex; justify-content: space-between; gap: 14px; align-items: start; margin-bottom: 28px; }
      .phase7-brand { margin: 0 0 5px; color: #d9b869; font-size: .76rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      .phase7-progress { margin: 0; color: #cdbfc1; font-size: .84rem; }
      .phase7-progress-track { height: 4px; border-radius: 99px; background: rgba(255,255,255,.12); margin: 0 0 34px; overflow: hidden; }
      .phase7-progress-fill { height: 100%; background: #d9b869; border-radius: inherit; transition: width .2s ease; }
      .phase7-screen { display: flex; flex-direction: column; flex: 1; }
      .phase7-kicker { color: #d9b869; font-size: .78rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 8px; }
      .phase7-screen h1 { color: #fff8ed; font-size: clamp(1.8rem, 6vw, 2.7rem); line-height: 1.05; margin: 0 0 12px; overflow-wrap: normal; }
      .phase7-copy { color: #d8cacc; line-height: 1.55; margin: 0 0 24px; }
      .phase7-options { display: grid; gap: 12px; }
      .phase7-choice { width: 100%; text-align: left; color: #fff8ed; background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.14); border-radius: 18px; padding: 18px; font: inherit; cursor: pointer; }
      .phase7-choice:hover, .phase7-choice:focus-visible { border-color: #d9b869; outline: none; }
      .phase7-choice.selected { background: rgba(217,184,105,.14); border-color: #d9b869; box-shadow: inset 0 0 0 1px #d9b869; }
      .phase7-choice b, .phase7-choice span { display: block; }
      .phase7-choice b { font-size: 1.05rem; }
      .phase7-choice span { color: #d7c9cb; margin-top: 5px; line-height: 1.45; }
      .phase7-field { display: grid; gap: 7px; margin: 0 0 16px; color: #eee1df; font-size: .9rem; font-weight: 700; }
      .phase7-field input, .phase7-field select { width: 100%; min-height: 50px; border-radius: 13px; border: 1px solid rgba(255,255,255,.17); background: #fffaf4; color: #271117; padding: 11px 12px; font: inherit; }
      .phase7-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
      .phase7-grid .wide { grid-column: 1 / -1; }
      .phase7-add-panel { border: 1px solid rgba(217,184,105,.26); background: rgba(217,184,105,.05); border-radius: 18px; padding: 16px; margin-bottom: 18px; }
      .phase7-list { display: grid; gap: 9px; margin-bottom: 20px; }
      .phase7-list-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: center; padding: 13px 14px; border-radius: 14px; background: rgba(255,255,255,.055); }
      .phase7-list-row b, .phase7-list-row small { display: block; }
      .phase7-list-row small { color: #cdbfc1; margin-top: 3px; line-height: 1.35; }
      .phase7-remove { border: 0; background: transparent; color: #f3abb4; padding: 8px; cursor: pointer; font: inherit; }
      .phase7-button { border: 0; border-radius: 14px; min-height: 48px; padding: 12px 18px; font: inherit; font-weight: 800; cursor: pointer; }
      .phase7-button.primary { background: #d9b869; color: #2d1520; }
      .phase7-button.secondary { background: rgba(255,255,255,.09); color: #fff8ed; border: 1px solid rgba(255,255,255,.15); }
      .phase7-button.ghost { background: transparent; color: #d9b869; border: 1px solid rgba(217,184,105,.4); }
      .phase7-button:disabled { opacity: .42; cursor: not-allowed; }
      .phase7-actions { display: flex; gap: 10px; margin-top: auto; padding-top: 28px; }
      .phase7-actions .primary { margin-left: auto; min-width: 150px; }
      .phase7-error { min-height: 22px; color: #ffb5bd; margin: 10px 0 0; font-size: .88rem; }
      .phase7-plan { display: grid; gap: 13px; }
      .phase7-plan-card { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); border-radius: 18px; padding: 17px; }
      .phase7-plan-card.gold { border-color: rgba(217,184,105,.5); background: rgba(217,184,105,.09); }
      .phase7-plan-card h2 { color: #fff8ed; font-size: 1rem; margin: 0 0 7px; }
      .phase7-plan-card strong { color: #d9b869; font-size: 1.35rem; }
      .phase7-plan-card p, .phase7-plan-card small { color: #d7c9cb; line-height: 1.45; margin: 6px 0 0; }
      .phase7-note { padding: 12px 14px; border-radius: 13px; background: rgba(255,255,255,.055); color: #d7c9cb; line-height: 1.45; font-size: .9rem; }
      @media (max-width: 600px) { .phase7-card { min-height: calc(100dvh - 32px); border-radius: 22px; } .phase7-grid { grid-template-columns: 1fr; } .phase7-grid .wide { grid-column: auto; } .phase7-actions { position: sticky; bottom: 0; background: linear-gradient(transparent, #19090e 25%); padding-top: 32px; padding-bottom: 2px; } }
    `;
    document.head.appendChild(style);
  }

  function createShell() {
    const shell = document.createElement('div');
    shell.id = 'genevievePhase7Setup';
    shell.className = 'phase7-shell';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-labelledby', 'phase7Question');
    shell.innerHTML = `
      <div class="phase7-card">
        <div class="phase7-top">
          <div><p class="phase7-brand">GENEVIEVE · FIRST-TIME SETUP</p><p class="phase7-progress" id="phase7Progress"></p></div>
        </div>
        <div class="phase7-progress-track" aria-hidden="true"><div class="phase7-progress-fill" id="phase7ProgressFill"></div></div>
        <section class="phase7-screen" id="phase7Screen"></section>
      </div>`;
    document.body.appendChild(shell);
    document.body.classList.add('phase7-setup-open');
    return shell;
  }

  function setError(message = '') {
    const target = document.getElementById('phase7Error');
    if (target) target.textContent = message;
  }

  function updateProgress() {
    const label = document.getElementById('phase7Progress');
    const fill = document.getElementById('phase7ProgressFill');
    if (label) label.textContent = `Step ${setup.step} of ${TOTAL_STEPS}`;
    if (fill) fill.style.width = `${(setup.step / TOTAL_STEPS) * 100}%`;
  }

  function actions({ nextLabel = 'Continue', nextDisabled = false, hideBack = false, onNext }) {
    return `
      <p class="phase7-error" id="phase7Error" role="alert"></p>
      <div class="phase7-actions">
        ${hideBack ? '' : '<button type="button" class="phase7-button secondary" id="phase7Back">Back</button>'}
        <button type="button" class="phase7-button primary" id="phase7Next" ${nextDisabled ? 'disabled' : ''}>${escapeHtml(nextLabel)}</button>
      </div>`;
  }

  function bindActions(onNext) {
    document.getElementById('phase7Back')?.addEventListener('click', () => {
      if (setup.step <= 1) return;
      setup.step -= 1;
      saveSetup();
      renderStep();
    });
    document.getElementById('phase7Next')?.addEventListener('click', onNext);
  }

  function nextStep() {
    setup.step = Math.min(TOTAL_STEPS, setup.step + 1);
    saveSetup();
    renderStep();
  }

  function screen1(container) {
    container.innerHTML = `
      <p class="phase7-kicker">YOUR PAY RHYTHM</p>
      <h1 id="phase7Question">How often do you get paid?</h1>
      <p class="phase7-copy">Choose the rhythm GENEVIEVE should use when it turns bills into a plan for each pay.</p>
      <div class="phase7-options" id="phase7PayOptions">
        ${['weekly','fortnightly','monthly','irregular'].map(value => `<button type="button" class="phase7-choice ${setup.payFrequency === value ? 'selected' : ''}" data-pay-frequency="${value}"><b>${PAY_FREQUENCY_LABELS[value]}</b></button>`).join('')}
      </div>
      ${actions({ hideBack: true, nextDisabled: !setup.payFrequency })}`;
    document.querySelectorAll('[data-pay-frequency]').forEach(button => button.addEventListener('click', () => {
      setup.payFrequency = button.dataset.payFrequency;
      saveSetup();
      document.querySelectorAll('[data-pay-frequency]').forEach(item => item.classList.toggle('selected', item === button));
      document.getElementById('phase7Next').disabled = false;
    }));
    bindActions(() => {
      if (!PAY_FREQUENCIES.has(setup.payFrequency)) return setError('Choose how often you get paid.');
      nextStep();
    });
  }

  function screen2(container) {
    container.innerHTML = `
      <p class="phase7-kicker">NEXT PAY</p>
      <h1 id="phase7Question">When do you get paid next?</h1>
      <p class="phase7-copy">This anchors the first plan to a real date.</p>
      <label class="phase7-field">Next pay date
        <input id="phase7NextPayDate" type="date" value="${escapeHtml(setup.nextPayDate)}" required />
      </label>
      ${actions({ nextDisabled: !setup.nextPayDate })}`;
    const input = document.getElementById('phase7NextPayDate');
    input.addEventListener('input', () => {
      setup.nextPayDate = validDate(input.value) ? input.value : '';
      saveSetup();
      document.getElementById('phase7Next').disabled = !setup.nextPayDate;
      setError('');
    });
    bindActions(() => {
      if (!validDate(setup.nextPayDate)) return setError('Choose your next pay date.');
      nextStep();
    });
  }

  function accountDraftRow(account) {
    return `<div class="phase7-list-row"><span><b>${escapeHtml(account.name)}</b><small>${escapeHtml(ACCOUNT_TYPE_LABELS[account.type] || 'Other')} · ${money(account.openingBalance)}</small></span><button type="button" class="phase7-remove" data-remove-account="${escapeHtml(account.id)}" aria-label="Remove ${escapeHtml(account.name)}">Remove</button></div>`;
  }

  function screen3(container) {
    container.innerHTML = `
      <p class="phase7-kicker">YOUR ACCOUNTS</p>
      <h1 id="phase7Question">Add your accounts</h1>
      <p class="phase7-copy">Add each bank, savings, cash, card or debt account once. You can change them later.</p>
      <div class="phase7-list" id="phase7AccountList">${setup.accounts.map(accountDraftRow).join('')}</div>
      <div class="phase7-add-panel">
        <div class="phase7-grid">
          <label class="phase7-field wide">Account name<input id="phase7AccountName" type="text" maxlength="60" placeholder="Everyday bank" /></label>
          <label class="phase7-field">Type<select id="phase7AccountType">${Object.entries(ACCOUNT_TYPE_LABELS).map(([value,label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('')}</select></label>
          <label class="phase7-field">Balance now<input id="phase7AccountBalance" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" /></label>
        </div>
        <button type="button" class="phase7-button ghost" id="phase7AddAccount">+ Add this account</button>
      </div>
      <div class="phase7-note">For a credit card, loan or BNPL account, enter the amount you currently owe as a positive number.</div>
      ${actions({ nextDisabled: setup.accounts.length === 0 })}`;

    const rerender = () => { saveSetup(); screen3(container); updateProgress(); };
    document.getElementById('phase7AddAccount').addEventListener('click', () => {
      const name = document.getElementById('phase7AccountName').value.trim();
      const type = document.getElementById('phase7AccountType').value;
      const openingBalance = roundMoney(document.getElementById('phase7AccountBalance').value);
      if (!name) return setError('Give this account a name.');
      if (!ACCOUNT_TYPES.has(type)) return setError('Choose a valid account type.');
      setup.accounts.push({ id: uid('acc'), name, type, openingBalance, createdAt: new Date().toISOString() });
      rerender();
    });
    document.querySelectorAll('[data-remove-account]').forEach(button => button.addEventListener('click', () => {
      setup.accounts = setup.accounts.filter(account => account.id !== button.dataset.removeAccount);
      setup.bills = setup.bills.map(bill => bill.accountId === button.dataset.removeAccount ? { ...bill, accountId: '' } : bill);
      rerender();
    }));
    bindActions(() => {
      if (!setup.accounts.length) return setError('Add at least one account so GENEVIEVE knows where your money lives.');
      nextStep();
    });
  }

  function billDraftRow(bill) {
    const account = setup.accounts.find(item => item.id === bill.accountId)?.name || 'No account selected';
    return `<div class="phase7-list-row"><span><b>${escapeHtml(bill.billName)}</b><small>${money(bill.amount)} · ${escapeHtml(BILL_FREQUENCY_LABELS[bill.frequency] || bill.frequency)} · ${bill.nextDueDate ? `due ${escapeHtml(formatDate(bill.nextDueDate))}` : 'no due date'} · ${escapeHtml(account)}</small></span><button type="button" class="phase7-remove" data-remove-bill="${escapeHtml(bill.id)}" aria-label="Remove ${escapeHtml(bill.billName)}">Remove</button></div>`;
  }

  function screen4(container) {
    container.innerHTML = `
      <p class="phase7-kicker">YOUR BILLS</p>
      <h1 id="phase7Question">What bills do you have?</h1>
      <p class="phase7-copy">Add the amount and frequency so GENEVIEVE can turn each bill into a real target. If you do not have one to add now, you can continue.</p>
      <div class="phase7-list">${setup.bills.map(billDraftRow).join('')}</div>
      <div class="phase7-add-panel">
        <div class="phase7-grid">
          <label class="phase7-field wide">Bill name<input id="phase7BillName" type="text" maxlength="100" placeholder="Electricity, registration, insurance…" /></label>
          <label class="phase7-field">Amount<input id="phase7BillAmount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" /></label>
          <label class="phase7-field">How often?<select id="phase7BillFrequency">${Object.entries(BILL_FREQUENCY_LABELS).map(([value,label]) => `<option value="${value}" ${value === 'monthly' ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label>
          <label class="phase7-field">Next due date<input id="phase7BillDue" type="date" /></label>
          <label class="phase7-field">Paid from (optional)<select id="phase7BillAccount"><option value="">Choose later</option>${setup.accounts.map(account => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`).join('')}</select></label>
        </div>
        <button type="button" class="phase7-button ghost" id="phase7AddBill">+ Add this bill</button>
      </div>
      ${actions({ nextLabel: setup.bills.length ? 'Continue' : 'Continue — no bills yet' })}`;
    const rerender = () => { saveSetup(); screen4(container); updateProgress(); };
    document.getElementById('phase7AddBill').addEventListener('click', () => {
      const billName = document.getElementById('phase7BillName').value.trim();
      const amount = roundMoney(document.getElementById('phase7BillAmount').value);
      const frequency = document.getElementById('phase7BillFrequency').value;
      const nextDueDate = document.getElementById('phase7BillDue').value;
      const accountId = document.getElementById('phase7BillAccount').value;
      if (!billName) return setError('Give this bill a name.');
      if (amount <= 0) return setError('Enter the bill amount.');
      if (!BILL_FREQUENCIES.has(frequency)) return setError('Choose how often the bill occurs.');
      if (nextDueDate && !validDate(nextDueDate)) return setError('Choose a valid due date or leave it blank.');
      setup.bills.push({
        id: uid('bill'), billName, amount, frequency, nextDueDate, accountId,
        essentialStatus: 'unsure', budgetingMethod: 'target', amountReserved: 0,
        requiredContribution: 0, targetAmount: amount, alertStatus: 'green', paidStatus: 'unpaid', notes: '', createdAt: new Date().toISOString()
      });
      rerender();
    });
    document.querySelectorAll('[data-remove-bill]').forEach(button => button.addEventListener('click', () => {
      setup.bills = setup.bills.filter(bill => bill.id !== button.dataset.removeBill);
      rerender();
    }));
    bindActions(nextStep);
  }

  function screen5(container) {
    container.innerHTML = `
      <p class="phase7-kicker">BILL METHOD</p>
      <h1 id="phase7Question">How would you like GENEVIEVE to manage your bills?</h1>
      <div class="phase7-options">
        <button type="button" class="phase7-choice ${setup.billMode === 'smooth' ? 'selected' : ''}" data-bill-mode="smooth"><b>Option 1 · Smooth my bills</b><span>GENEVIEVE calculates the amount required from each pay.</span></button>
        <button type="button" class="phase7-choice ${setup.billMode === 'target' ? 'selected' : ''}" data-bill-mode="target"><b>Option 2 · I’ll keep the money</b><span>GENEVIEVE tracks the bill target and warns you if you are falling behind.</span></button>
      </div>
      ${setup.payFrequency === 'irregular' ? '<p class="phase7-note" style="margin-top:16px">With irregular pay, GENEVIEVE will not invent a fixed per-pay amount. Smooth contributions will be recalculated when a regular pay rhythm is available; your bill targets remain visible meanwhile.</p>' : ''}
      ${actions({ nextDisabled: !setup.billMode })}`;
    document.querySelectorAll('[data-bill-mode]').forEach(button => button.addEventListener('click', () => {
      setup.billMode = button.dataset.billMode;
      saveSetup();
      document.querySelectorAll('[data-bill-mode]').forEach(item => item.classList.toggle('selected', item === button));
      document.getElementById('phase7Next').disabled = false;
    }));
    bindActions(() => {
      if (!['smooth', 'target'].includes(setup.billMode)) return setError('Choose how GENEVIEVE should manage your bills.');
      nextStep();
    });
  }

  function screen6(container) {
    container.innerHTML = `
      <p class="phase7-kicker">PROTECTED CASH</p>
      <h1 id="phase7Question">Set protected emergency cash.</h1>
      <p class="phase7-copy">This is money you want GENEVIEVE to treat as protected rather than ordinary spending money.</p>
      <label class="phase7-field">Protected emergency cash
        <input id="phase7EmergencyCash" type="number" min="0" step="0.01" inputmode="decimal" value="${setup.emergencyCash || ''}" placeholder="0.00" />
      </label>
      <div class="phase7-note">You can enter $0 now and change the protected amount later.</div>
      ${actions({})}`;
    const input = document.getElementById('phase7EmergencyCash');
    input.addEventListener('input', () => { setup.emergencyCash = roundMoney(input.value); saveSetup(); });
    bindActions(() => { setup.emergencyCash = roundMoney(input.value); saveSetup(); nextStep(); });
  }

  function savingsDraftRow(goal) {
    return `<div class="phase7-list-row"><span><b>${escapeHtml(goal.goal)}</b><small>Target ${money(goal.target)}${goal.deadline ? ` · by ${escapeHtml(formatDate(goal.deadline))}` : ''}</small></span><button type="button" class="phase7-remove" data-remove-goal="${escapeHtml(goal.id)}" aria-label="Remove ${escapeHtml(goal.goal)}">Remove</button></div>`;
  }

  function screen7(container) {
    container.innerHTML = `
      <p class="phase7-kicker">OPTIONAL GOALS</p>
      <h1 id="phase7Question">Set optional savings goals.</h1>
      <p class="phase7-copy">Add any goal you want GENEVIEVE to keep visible. You can also skip this screen.</p>
      <div class="phase7-list">${setup.savingsGoals.map(savingsDraftRow).join('')}</div>
      <div class="phase7-add-panel">
        <div class="phase7-grid">
          <label class="phase7-field wide">Goal<input id="phase7GoalName" type="text" maxlength="100" placeholder="Holiday, car repairs, Christmas…" /></label>
          <label class="phase7-field">Target amount<input id="phase7GoalTarget" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" /></label>
          <label class="phase7-field">Target date (optional)<input id="phase7GoalDeadline" type="date" /></label>
        </div>
        <button type="button" class="phase7-button ghost" id="phase7AddGoal">+ Add this goal</button>
      </div>
      ${actions({ nextLabel: setup.savingsGoals.length ? 'Show my first money plan' : 'Skip — show my first money plan' })}`;
    const rerender = () => { saveSetup(); screen7(container); updateProgress(); };
    document.getElementById('phase7AddGoal').addEventListener('click', () => {
      const goal = document.getElementById('phase7GoalName').value.trim();
      const target = roundMoney(document.getElementById('phase7GoalTarget').value);
      const deadline = document.getElementById('phase7GoalDeadline').value;
      if (!goal) return setError('Give this savings goal a name.');
      if (target <= 0) return setError('Enter a target amount greater than $0.');
      if (deadline && !validDate(deadline)) return setError('Choose a valid target date or leave it blank.');
      setup.savingsGoals.push({ id: uid('goal'), goal, target, currentAmount: 0, deadline, protected: false, notes: '', createdAt: new Date().toISOString() });
      rerender();
    });
    document.querySelectorAll('[data-remove-goal]').forEach(button => button.addEventListener('click', () => {
      setup.savingsGoals = setup.savingsGoals.filter(goal => goal.id !== button.dataset.removeGoal);
      rerender();
    }));
    bindActions(nextStep);
  }

  function screen8(container) {
    const plan = buildFirstPlan();
    const billDetail = setup.billMode === 'smooth'
      ? (setup.payFrequency === 'irregular'
          ? 'Irregular pay: no fake fixed contribution has been created. Your bill targets remain ready and visible.'
          : `${money(plan.regularPerPayBills)} from each ${PAY_FREQUENCY_LABELS[setup.payFrequency].toLowerCase()} pay across your current bills.`)
      : `${money(plan.totalBillTargets)} in bill targets. GENEVIEVE will refresh warning colours as each target progresses toward its due date.`;
    container.innerHTML = `
      <p class="phase7-kicker">YOUR FIRST MONEY PLAN</p>
      <h1 id="phase7Question">YOUR FIRST MONEY PLAN</h1>
      <p class="phase7-copy">This is the starting map created from the answers you just gave GENEVIEVE.</p>
      <div class="phase7-plan">
        <article class="phase7-plan-card gold"><h2>Next pay</h2><strong>${escapeHtml(formatDate(setup.nextPayDate))}</strong><p>${escapeHtml(PAY_FREQUENCY_LABELS[setup.payFrequency] || setup.payFrequency)} pay rhythm</p></article>
        <article class="phase7-plan-card"><h2>Accounts</h2><strong>${setup.accounts.length}</strong><p>${setup.accounts.map(account => escapeHtml(account.name)).join(' · ') || 'No accounts'}</p></article>
        <article class="phase7-plan-card"><h2>${setup.billMode === 'smooth' ? 'Smooth my bills' : 'I’ll keep the money'}</h2><strong>${setup.bills.length} bill${setup.bills.length === 1 ? '' : 's'}</strong><p>${escapeHtml(billDetail)}</p></article>
        <article class="phase7-plan-card gold"><h2>Protected emergency cash</h2><strong>${money(setup.emergencyCash)}</strong><p>Kept separate in your setup settings as protected cash.</p></article>
        <article class="phase7-plan-card"><h2>Savings goals</h2><strong>${setup.savingsGoals.length}</strong><p>${setup.savingsGoals.length ? setup.savingsGoals.map(goal => `${escapeHtml(goal.goal)} · ${money(goal.target)}`).join('<br>') : 'No optional savings goal yet.'}</p></article>
      </div>
      ${actions({ nextLabel: 'Start using GENEVIEVE' })}`;
    bindActions(commitSetup);
  }

  function commitSetup() {
    if (!PAY_FREQUENCIES.has(setup.payFrequency) || !validDate(setup.nextPayDate) || !setup.accounts.length || !['smooth', 'target'].includes(setup.billMode)) {
      setup.step = 1;
      saveSetup();
      return renderStep();
    }
    const current = readMoneyState();
    const plan = buildFirstPlan();
    const existingAccountIds = new Set(current.accounts.map(item => item.id));
    const existingBillIds = new Set(current.bills.map(item => item.id));
    const existingGoalIds = new Set(current.savingsGoals.map(item => item.id));
    const accounts = [...current.accounts, ...setup.accounts.filter(item => !existingAccountIds.has(item.id))];
    const bills = [...current.bills, ...plan.bills.filter(item => !existingBillIds.has(item.id))];
    const savingsGoals = [...current.savingsGoals, ...plan.savingsGoals.filter(item => !existingGoalIds.has(item.id))];

    directWriteMoneyState({
      ...current,
      accounts,
      bills,
      savingsGoals,
    });

    setup.completed = true;
    setup.step = TOTAL_STEPS;
    setup.completedAt = new Date().toISOString();
    setup.firstMoneyPlan = {
      payFrequency: setup.payFrequency,
      nextPayDate: setup.nextPayDate,
      billMode: setup.billMode,
      emergencyCash: roundMoney(setup.emergencyCash),
      accountCount: accounts.length,
      billCount: plan.bills.length,
      savingsGoalCount: plan.savingsGoals.length,
      regularPerPayBills: plan.regularPerPayBills,
      totalBillTargets: plan.totalBillTargets,
    };
    saveSetup();

    const button = document.getElementById('phase7Next');
    if (button) { button.disabled = true; button.textContent = 'Plan saved'; }
    setTimeout(() => location.reload(), 120);
  }

  function renderStep() {
    const container = document.getElementById('phase7Screen');
    if (!container) return;
    updateProgress();
    container.innerHTML = '';
    const screens = [null, screen1, screen2, screen3, screen4, screen5, screen6, screen7, screen8];
    screens[setup.step](container);
    updateProgress();
    const heading = document.getElementById('phase7Question');
    if (heading) heading.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (setup.completed) return;
    installStyles();
    createShell();
    renderStep();
  });
})();
