(() => {
  'use strict';

  const AUTH_BASE = '/auth';
  const SESSION_CHECK_INTERVAL_MS = 60_000;
  const MAX_TIMEOUT_MS = 2_147_000_000;

  const state = {
    status: 'pending',
    session: null,
    user: null,
    expiryTimer: null,
    intervalTimer: null,
    checking: null,
  };

  const $ = (selector) => document.querySelector(selector);

  function authElements() {
    return {
      gate: $('#phase6AuthGate'),
      shell: $('#budgetAppShell'),
      sessionBar: $('#phase6SessionBar'),
      sessionEmail: $('#phase6SessionEmail'),
      message: $('#phase6AuthMessage'),
      signInForm: $('#phase6SignInForm'),
      signUpForm: $('#phase6SignUpForm'),
      magicForm: $('#phase6MagicLinkForm'),
      signOutButton: $('#phase6SignOutButton'),
      tabs: [...document.querySelectorAll('[data-phase6-auth-mode]')],
      panels: [...document.querySelectorAll('[data-phase6-auth-panel]')],
    };
  }

  function setMessage(message, kind = 'info') {
    const element = $('#phase6AuthMessage');
    if (!element) return;
    element.textContent = message || '';
    element.dataset.kind = kind;
  }

  function setBusy(busy) {
    document.querySelectorAll('#phase6AuthGate button, #phase6AuthGate input').forEach((element) => {
      element.disabled = Boolean(busy);
    });
  }

  function normalisePayload(payload) {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data != null) {
      return payload.data;
    }
    return payload;
  }

  async function authRequest(path, { method = 'GET', body } = {}) {
    const headers = { accept: 'application/json' };
    const options = {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers,
    };

    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${AUTH_BASE}${path}`, options);
    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const error = new Error(
        payload?.message
        || payload?.error?.message
        || (response.status === 401 ? 'Your session has expired. Please sign in again.' : 'Authentication request failed.')
      );
      error.status = response.status;
      throw error;
    }

    return normalisePayload(payload);
  }

  function sessionExpiry(session) {
    const value = session?.expiresAt ?? session?.expires_at ?? null;
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function sessionIsExpired(session) {
    const expiry = sessionExpiry(session);
    return expiry !== null && expiry <= Date.now();
  }

  function clearExpiryTimer() {
    if (state.expiryTimer) clearTimeout(state.expiryTimer);
    state.expiryTimer = null;
  }

  function dispatchAuthChange() {
    window.dispatchEvent(new CustomEvent('genevieve:phase6-auth-change', {
      detail: {
        status: state.status,
        user: state.user ? { id: state.user.id, email: state.user.email, name: state.user.name } : null,
      },
    }));
  }

  function lockBudget(message = 'Sign in to continue to your Budget.') {
    clearExpiryTimer();
    state.status = 'required';
    state.session = null;
    state.user = null;

    const { gate, shell, sessionBar } = authElements();
    document.documentElement.classList.remove('phase6-auth-pending', 'phase6-authenticated');
    document.documentElement.classList.add('phase6-auth-required');

    if (shell) {
      shell.inert = true;
      shell.setAttribute('aria-hidden', 'true');
    }
    if (gate) gate.hidden = false;
    if (sessionBar) sessionBar.hidden = true;
    setMessage(message, 'info');
    dispatchAuthChange();
  }

  function scheduleExpiryCheck(session) {
    clearExpiryTimer();
    const expiry = sessionExpiry(session);
    if (expiry === null) return;

    const delay = expiry - Date.now();
    if (delay <= 0) {
      lockBudget('Your session has expired. Please sign in again.');
      return;
    }

    state.expiryTimer = setTimeout(() => {
      checkSession({ reason: 'expiry', announcePending: false });
    }, Math.min(delay + 250, MAX_TIMEOUT_MS));
  }

  function unlockBudget(session, user) {
    state.status = 'authenticated';
    state.session = session;
    state.user = user;

    const { gate, shell, sessionBar, sessionEmail } = authElements();
    document.documentElement.classList.remove('phase6-auth-pending', 'phase6-auth-required');
    document.documentElement.classList.add('phase6-authenticated');

    if (shell) {
      shell.inert = false;
      shell.removeAttribute('aria-hidden');
    }
    if (gate) gate.hidden = true;
    if (sessionBar) sessionBar.hidden = false;
    if (sessionEmail) sessionEmail.textContent = user?.email || 'Signed in';

    setMessage('', 'info');
    scheduleExpiryCheck(session);
    dispatchAuthChange();
  }

  function extractSession(payload) {
    const data = normalisePayload(payload) || {};
    const session = data.session || null;
    const user = data.user || session?.user || null;
    return { session, user };
  }

  async function performSessionCheck({ reason = 'restore', announcePending = true } = {}) {
    if (announcePending) {
      state.status = 'pending';
      document.documentElement.classList.add('phase6-auth-pending');
      setMessage(reason === 'restore' ? 'Checking your secure session…' : 'Rechecking your secure session…', 'info');
    }

    try {
      const payload = await authRequest('/get-session');
      const { session, user } = extractSession(payload);
      if (!session || !user || sessionIsExpired(session)) {
        lockBudget(reason === 'expiry' ? 'Your session has expired. Please sign in again.' : 'Sign in to continue to your Budget.');
        return false;
      }
      unlockBudget(session, user);
      return true;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        lockBudget('Your session has expired. Please sign in again.');
      } else {
        lockBudget('We could not verify your secure session. Check your connection and try again.');
        setMessage('We could not verify your secure session. Check your connection and try again.', 'error');
      }
      return false;
    }
  }

  function checkSession(options = {}) {
    if (state.checking) return state.checking;
    state.checking = performSessionCheck(options).finally(() => {
      state.checking = null;
    });
    return state.checking;
  }

  function showMode(mode) {
    const { tabs, panels } = authElements();
    tabs.forEach((tab) => {
      const active = tab.dataset.phase6AuthMode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.phase6AuthPanel !== mode;
    });
    setMessage(mode === 'magic' ? 'We will email you a time-limited sign-in link.' : '', 'info');
  }

  async function handleSignIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') || '').trim();
    const password = String(new FormData(form).get('password') || '');
    if (!email || !password) return;

    setBusy(true);
    setMessage('Signing you in…', 'info');
    try {
      await authRequest('/sign-in/email', { method: 'POST', body: { email, password } });
      const authenticated = await checkSession({ reason: 'sign-in', announcePending: false });
      if (!authenticated) setMessage('Sign-in completed but no active session was returned. Please try again.', 'error');
      form.reset();
    } catch (error) {
      lockBudget('Sign in to continue to your Budget.');
      setMessage(error?.message || 'Sign in failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    if (!name || !email || !password) return;

    setBusy(true);
    setMessage('Creating your secure account…', 'info');
    try {
      await authRequest('/sign-up/email', { method: 'POST', body: { name, email, password } });
      const authenticated = await checkSession({ reason: 'sign-up', announcePending: false });
      if (!authenticated) {
        showMode('sign-in');
        setMessage('Your account was created. Sign in to continue.', 'success');
      }
      form.reset();
    } catch (error) {
      lockBudget('Create an account or sign in to continue.');
      setMessage(error?.message || 'Account creation failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') || '').trim();
    if (!email) return;

    setBusy(true);
    setMessage('Sending your secure sign-in link…', 'info');
    try {
      const callbackURL = `${window.location.origin}${window.location.pathname}`;
      await authRequest('/sign-in/magic-link', {
        method: 'POST',
        body: { email, callbackURL },
      });
      setMessage('Check your email for your time-limited sign-in link. You can close this screen and return from the link.', 'success');
      form.reset();
    } catch (error) {
      setMessage(error?.message || 'We could not send the sign-in link.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await authRequest('/sign-out', { method: 'POST' });
    } catch {
      // Fail closed locally even if the upstream sign-out request cannot complete.
    } finally {
      setBusy(false);
      lockBudget('You are signed out. Sign in to continue to your Budget.');
    }
  }

  async function authenticatedFetch(input, init = {}) {
    if (state.status !== 'authenticated' || !state.user || !state.session) {
      throw new Error('Authenticated session required.');
    }

    const response = await fetch(input, { ...init, credentials: 'include' });
    if (response.status === 401 || response.status === 403) {
      await checkSession({ reason: 'api', announcePending: false });
      if (state.status !== 'authenticated') {
        throw new Error('Your session has expired. Please sign in again.');
      }
    }
    return response;
  }

  function bindUi() {
    const { signInForm, signUpForm, magicForm, signOutButton, tabs } = authElements();
    signInForm?.addEventListener('submit', handleSignIn);
    signUpForm?.addEventListener('submit', handleSignUp);
    magicForm?.addEventListener('submit', handleMagicLink);
    signOutButton?.addEventListener('click', signOut);
    tabs.forEach((tab) => tab.addEventListener('click', () => showMode(tab.dataset.phase6AuthMode)));
  }

  function installSessionWatchers() {
    state.intervalTimer = setInterval(() => {
      if (state.status === 'authenticated') checkSession({ reason: 'interval', announcePending: false });
    }, SESSION_CHECK_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.status === 'authenticated') {
        checkSession({ reason: 'visibility', announcePending: false });
      }
    });
    window.addEventListener('focus', () => {
      if (state.status === 'authenticated') checkSession({ reason: 'focus', announcePending: false });
    });
    window.addEventListener('online', () => checkSession({ reason: 'online', announcePending: false }));
  }

  window.GenevievePhase6Auth = Object.freeze({
    getState() {
      return {
        status: state.status,
        session: state.session,
        user: state.user,
      };
    },
    checkSession,
    signOut,
    authenticatedFetch,
  });

  bindUi();
  installSessionWatchers();
  showMode('sign-in');
  checkSession({ reason: 'restore', announcePending: true });
})();
