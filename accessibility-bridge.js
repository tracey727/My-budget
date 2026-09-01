(() => {
  'use strict';

  // Personal accessibility modes, added 2 Sept 2026 (Phase 19).
  // Adds a Simple mode toggle: a low-cognitive-load view that hides
  // secondary detail panels (forecast, fee monitor, account-change
  // checklist, category breakdown, the Safe-to-Spend explanatory detail
  // line) and increases text size, keeping only the core numbers and
  // actions visible. Trusted-support access with restricted permissions
  // (this phase's other roadmap bullet) is already enforced server-side
  // by the Phase 6 authority checks in src/worker.mjs -- this bridge only
  // adds the client-side display mode.
  //
  // Preference is stored under its own key, independent of the
  // money-tracker state, since nothing else needs to know about it and it
  // has no field to protect against being dropped by an unrelated write.

  const STORAGE_KEY = 'genevieve-accessibility-v1';

  function readPreference() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { simpleMode: parsed.simpleMode === true };
    } catch {
      return { simpleMode: false };
    }
  }

  function writePreference(preference) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  }

  function applyMode(simpleMode) {
    document.body.classList.toggle('simple-mode', simpleMode);
    const toggle = document.getElementById('simpleModeToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(simpleMode));
      toggle.classList.toggle('active', simpleMode);
      toggle.title = simpleMode ? 'Simple mode is on -- tap to switch back to the full view' : 'Turn on simple mode for a larger-text, fewer-detail view';
    }
  }

  function bindToggle() {
    const toggle = document.getElementById('simpleModeToggle');
    if (!toggle || toggle.dataset.accessibilityBound === 'true') return;
    toggle.dataset.accessibilityBound = 'true';
    toggle.addEventListener('click', () => {
      const preference = readPreference();
      const next = { simpleMode: !preference.simpleMode };
      writePreference(next);
      applyMode(next.simpleMode);
    });
  }

  function init() {
    applyMode(readPreference().simpleMode);
    bindToggle();
  }

  init();
  document.addEventListener('DOMContentLoaded', init);
})();
