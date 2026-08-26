import phase6Worker from './worker-phase6-sealed.mjs';
import { handlePhase7AccountRequest } from './phase7-account-routes.mjs';

export * from './worker-phase6-sealed.mjs';

export default {
  async fetch(request, env) {
    const phase7Response = await handlePhase7AccountRequest(request, env);
    if (phase7Response) return phase7Response;
    return phase6Worker.fetch(request, env);
  },
};
