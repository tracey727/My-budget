import { readFileSync } from 'node:fs';

const authRuntime = readFileSync(new URL('./phase6-auth-runtime.js', import.meta.url), 'utf8')
  .replace(/<\/script/gi, '<\\/script');

const authBootstrap = `
<style data-phase6-auth-bootstrap>
  html.phase6-auth-pending .app-shell,
  html.phase6-auth-required .app-shell { display: none !important; }
  html.phase6-auth-authenticated #phase6AuthGate { display: none !important; }
  #phase6AuthGate[hidden], #phase6SessionBar[hidden] { display: none !important; }
  #phase6AuthGate { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: #f3f7f4; color: #15231a; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .phase6-auth-card { width: min(100%, 520px); background: #fff; border: 1px solid #d7e1da; border-radius: 20px; box-shadow: 0 20px 60px rgba(20,61,42,.14); padding: 28px; }
  .phase6-auth-eyebrow { margin: 0 0 8px; font-size: .76rem; letter-spacing: .12em; font-weight: 800; color: #496354; }
  .phase6-auth-card h1 { margin: 0; font-size: clamp(1.8rem, 6vw, 2.5rem); line-height: 1.05; color: #143d2a; }
  .phase6-auth-copy { margin: 10px 0 20px; color: #526158; line-height: 1.5; }
  .phase6-auth-tabs { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; margin: 0 0 18px; }
  .phase6-auth-tabs button { border: 1px solid #cbd8d0; border-radius: 12px; background: #f7faf8; padding: 10px 8px; font: inherit; font-weight: 700; color: #294334; cursor: pointer; }
  .phase6-auth-tabs button.active { background: #143d2a; color: #fff; border-color: #143d2a; }
  .phase6-auth-panel { display: grid; gap: 14px; }
  .phase6-auth-panel label { display: grid; gap: 6px; font-weight: 700; color: #294334; }
  .phase6-auth-panel input { width: 100%; box-sizing: border-box; border: 1px solid #b9c9bf; border-radius: 12px; padding: 12px 14px; font: inherit; background: #fff; color: #17241b; }
  .phase6-auth-panel input:focus { outline: 3px solid rgba(20,61,42,.16); border-color: #143d2a; }
  .phase6-auth-primary { border: 0; border-radius: 12px; padding: 12px 16px; background: #143d2a; color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
  .phase6-auth-primary:disabled, .phase6-auth-tabs button:disabled, .phase6-auth-panel input:disabled { opacity: .55; cursor: wait; }
  #phase6AuthMessage { min-height: 1.4em; margin: 14px 0 0; font-size: .92rem; line-height: 1.4; color: #53645a; }
  #phase6AuthMessage[data-kind="error"] { color: #8c2222; }
  #phase6AuthMessage[data-kind="success"] { color: #205f38; }
  .phase6-auth-security { margin: 18px 0 0; padding-top: 14px; border-top: 1px solid #e2e9e4; font-size: .82rem; line-height: 1.45; color: #647168; }
  #phase6SessionBar { position: fixed; top: max(10px, env(safe-area-inset-top)); right: 10px; z-index: 1000; display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 20px); padding: 7px 8px 7px 12px; border: 1px solid #cad7cf; border-radius: 999px; background: rgba(255,255,255,.96); box-shadow: 0 8px 24px rgba(20,61,42,.12); font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: .78rem; color: #294334; }
  #phase6SessionEmail { max-width: 42vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #phase6SignOutButton { border: 1px solid #b8c8be; border-radius: 999px; background: #f5f8f6; padding: 6px 10px; font: inherit; font-weight: 800; color: #143d2a; cursor: pointer; }
  @media (max-width: 520px) {
    #phase6AuthGate { padding: 14px; }
    .phase6-auth-card { padding: 20px; border-radius: 16px; }
    .phase6-auth-tabs { grid-template-columns: 1fr; }
    #phase6SessionBar { left: 10px; right: 10px; justify-content: space-between; }
    #phase6SessionEmail { max-width: 60vw; }
  }
</style>
<section id="phase6AuthGate" aria-labelledby="phase6AuthHeading" data-phase6-auth-gate>
  <div class="phase6-auth-card">
    <p class="phase6-auth-eyebrow">GENEVIEVE BUDGET · SECURE ACCESS</p>
    <h1 id="phase6AuthHeading">Sign in to your Budget</h1>
    <p class="phase6-auth-copy">Your Budget stays locked until your secure session is confirmed.</p>
    <div class="phase6-auth-tabs" role="tablist" aria-label="Secure access options">
      <button type="button" role="tab" data-phase6-auth-mode="sign-in">Sign in</button>
      <button type="button" role="tab" data-phase6-auth-mode="sign-up">Sign up</button>
      <button type="button" role="tab" data-phase6-auth-mode="magic">Email link</button>
    </div>
    <form id="phase6SignInForm" class="phase6-auth-panel" data-phase6-auth-panel="sign-in" autocomplete="on">
      <label>Email
        <input name="email" type="email" autocomplete="email" required inputmode="email" />
      </label>
      <label>Password
        <input name="password" type="password" autocomplete="current-password" required minlength="8" />
      </label>
      <button class="phase6-auth-primary" type="submit">Sign in securely</button>
    </form>
    <form id="phase6SignUpForm" class="phase6-auth-panel" data-phase6-auth-panel="sign-up" autocomplete="on" hidden>
      <label>Name
        <input name="name" type="text" autocomplete="name" required maxlength="100" />
      </label>
      <label>Email
        <input name="email" type="email" autocomplete="email" required inputmode="email" />
      </label>
      <label>Password
        <input name="password" type="password" autocomplete="new-password" required minlength="8" />
      </label>
      <button class="phase6-auth-primary" type="submit">Create secure account</button>
    </form>
    <form id="phase6MagicLinkForm" class="phase6-auth-panel" data-phase6-auth-panel="magic" autocomplete="on" hidden>
      <label>Email
        <input name="email" type="email" autocomplete="email" required inputmode="email" />
      </label>
      <button class="phase6-auth-primary" type="submit">Email me a secure sign-in link</button>
    </form>
    <p id="phase6AuthMessage" role="status" aria-live="polite">Checking your secure session…</p>
    <p class="phase6-auth-security">For your privacy, the money screens remain inaccessible if your session is missing, expired, invalid or cannot be verified.</p>
  </div>
</section>
<aside id="phase6SessionBar" aria-label="Signed in session" hidden>
  <span id="phase6SessionEmail">Signed in</span>
  <button id="phase6SignOutButton" type="button">Sign out</button>
</aside>
<script data-phase6-auth-runtime>${authRuntime}</script>`;

export default {
  plugins: [
    {
      name: 'genevieve-phase6-auth-gate',
      enforce: 'pre',
      transformIndexHtml(html) {
        if (html.includes('data-phase6-auth-gate')) return html;

        let transformed = html.replace(
          '<html lang="en-AU">',
          '<html lang="en-AU" class="phase6-auth-pending">'
        );
        transformed = transformed.replace('<body>', `<body>${authBootstrap}`);
        transformed = transformed.replace(
          '<div class="app-shell">',
          '<div class="app-shell" id="budgetAppShell" inert aria-hidden="true">'
        );
        return transformed;
      },
    },
  ],
};
