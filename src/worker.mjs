import phase6Worker from './worker-phase6-sealed.mjs';
import { handlePhase7AccountRequest } from './phase7-account-routes.mjs';
import { checkPhase7Readiness } from './phase7-readiness.mjs';

export * from './worker-phase6-sealed.mjs';
export * from './phase7-readiness.mjs';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'genevieve-budget', phase: 7, runtime: 'cloudflare-workers' });
    }
    if (url.pathname === '/ready') {
      const readiness = await checkPhase7Readiness(env);
      return json(readiness.payload, readiness.status);
    }
    const phase7Response = await handlePhase7AccountRequest(request, env);
    if (phase7Response) return phase7Response;
    return phase6Worker.fetch(request, env);
  },
};
