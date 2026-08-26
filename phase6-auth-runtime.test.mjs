import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

function gitBlobSha(text) {
  const header = `blob ${Buffer.byteLength(text)}\0`;
  return createHash('sha1').update(header).update(text).digest('hex');
}

test('Phase 6 authentication runtime is syntactically valid and uses only the same-origin auth boundary', async () => {
  const runtime = await read('./phase6-auth-runtime.js');
  assert.doesNotThrow(() => new vm.Script(runtime));
  assert.match(runtime, /const AUTH_BASE = '\/auth'/);
  assert.match(runtime, /credentials: 'include'/);
  assert.match(runtime, /cache: 'no-store'/);
  assert.doesNotMatch(runtime, /neonauth\.|postgres(?:ql)?:\/\//i);
});

test('Phase 6 runtime implements sign up, sign in, passwordless Magic Link and sign out', async () => {
  const runtime = await read('./phase6-auth-runtime.js');
  for (const endpoint of [
    '/sign-up/email',
    '/sign-in/email',
    '/sign-in/magic-link',
    '/sign-out',
    '/get-session',
  ]) {
    assert.ok(runtime.includes(endpoint), `missing Phase 6 auth endpoint ${endpoint}`);
  }
  assert.match(runtime, /callbackURL/);
  assert.match(runtime, /handleSignUp/);
  assert.match(runtime, /handleSignIn/);
  assert.match(runtime, /handleMagicLink/);
  assert.match(runtime, /async function signOut/);
});

test('Phase 6 authentication is fail closed and restores or expires sessions safely', async () => {
  const runtime = await read('./phase6-auth-runtime.js');
  assert.match(runtime, /function lockBudget/);
  assert.match(runtime, /shell\.inert = true/);
  assert.match(runtime, /shell\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(runtime, /function unlockBudget/);
  assert.match(runtime, /shell\.inert = false/);
  assert.match(runtime, /shell\.removeAttribute\('aria-hidden'\)/);
  assert.match(runtime, /sessionIsExpired/);
  assert.match(runtime, /scheduleExpiryCheck/);
  assert.match(runtime, /SESSION_CHECK_INTERVAL_MS = 60_000/);
  assert.match(runtime, /visibilitychange/);
  assert.match(runtime, /window\.addEventListener\('focus'/);
  assert.match(runtime, /window\.addEventListener\('online'/);
  assert.match(runtime, /checkSession\(\{ reason: 'restore'/);
  assert.match(runtime, /response\.status === 401 \|\| response\.status === 403/);
});

test('Vite injects the authentication screen before releasing the existing Budget shell', async () => {
  const config = await read('./vite.config.mjs');
  assert.match(config, /genevieve-phase6-auth-gate/);
  assert.match(config, /phase6-auth-pending/);
  assert.match(config, /id=\"phase6AuthGate\"/);
  assert.match(config, /id=\"phase6SignInForm\"/);
  assert.match(config, /id=\"phase6SignUpForm\"/);
  assert.match(config, /id=\"phase6MagicLinkForm\"/);
  assert.match(config, /id=\"phase6SignOutButton\"/);
  assert.match(config, /id=\"budgetAppShell\" inert aria-hidden=\"true\"/);
  assert.match(config, /data-phase6-auth-runtime/);
});

test('built Cloudflare artifact contains the Phase 6 gate before the preserved Budget runtime chain', async () => {
  const index = await read('./dist/index.html');
  assert.match(index, /data-phase6-auth-gate/);
  assert.match(index, /data-phase6-auth-runtime/);
  assert.match(index, /id="budgetAppShell" inert aria-hidden="true"/);
  assert.match(index, /id="phase6SignInForm"/);
  assert.match(index, /id="phase6SignUpForm"/);
  assert.match(index, /id="phase6MagicLinkForm"/);
  assert.match(index, /\/auth\/get-session/);
  assert.match(index, /\/auth\/sign-in\/magic-link/);

  const authPosition = index.indexOf('data-phase6-auth-runtime');
  const dataPosition = index.indexOf('/phase2-data-runtime.js');
  const extendedPosition = index.indexOf('/phase2-subscriptions-savings-runtime.js');
  const appPosition = index.indexOf('/app.js?v=phase3-seven-view-runtime-v3');
  assert.ok(authPosition >= 0, 'Phase 6 auth runtime missing from built index');
  assert.ok(authPosition < dataPosition, 'Phase 6 auth runtime must precede Phase 2 data runtime');
  assert.ok(dataPosition < extendedPosition && extendedPosition < appPosition, 'preserved runtime order must remain Phase 2 data -> subscriptions/savings -> app.js');
});

test('Phase 6 service worker cannot fall back to a cached pre-authentication index', async () => {
  const worker = await read('./service-worker.js');
  const builtWorker = await read('./dist/service-worker.js');
  const staticStart = worker.indexOf('const STATIC_ASSETS = [');
  const staticEnd = worker.indexOf('];', staticStart);
  const staticBlock = worker.slice(staticStart, staticEnd);

  assert.ok(staticStart >= 0 && staticEnd > staticStart);
  assert.doesNotMatch(staticBlock, /['"]\/['"]/);
  assert.doesNotMatch(staticBlock, /['"]\/index\.html['"]/);
  assert.match(worker, /url\.pathname\.startsWith\('\/auth\/'\)/);
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(worker, /event\.request\.mode === 'navigate'/);
  assert.match(worker, /fetch\(event\.request, \{ cache: 'no-store' \}\)/);
  assert.doesNotMatch(worker, /caches\.match\(['"]\/index\.html['"]\)/);
  assert.match(worker, /every-cent-v2-phase6-auth-runtime-v1/);
  assert.equal(builtWorker, worker, 'deployed service worker must match the audited Phase 6 source');
});

test('the preserved Budget app.js is byte-for-byte unchanged from protected main', async () => {
  const app = await read('./app.js');
  assert.equal(gitBlobSha(app), 'a86381a76c4676b9d14cbcb1a6b9de842c1cd24c');
  assert.doesNotMatch(app, /phase6|GenevievePhase6Auth|phase6AuthGate/i);
});
