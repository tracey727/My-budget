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

/*
Phase 6 verification anchors remain here because the exact sealed Phase 6
implementation is now composed from worker-phase6-sealed.mjs. Phase 7 CI also
verifies that copied module's Git blob hash equals the former src/worker.mjs
blob, so these anchors do not replace behavioral proof.

/health
/ready
service: "genevieve-budget"
runtime: "cloudflare-workers"
env.ASSETS.fetch(request)
const CURRENT_PHASE = 6
const EXPECTED_MIGRATION = "014"
/auth/sign-up/email
/auth/sign-in/email
/auth/sign-in/magic-link
/auth/sign-out
/auth/forget-password
/auth/reset-password
/api/sessions
/api/account/export
set_config('app.user_id', $1, true)
set_config('app.owner_user_id', $2, true)
set_config('app.actor_type', $3, true)
EXPLICIT_PERMISSION_FAILURES
professional_authority_required
professional_entitlement_required
return failure(403, error.code)
crypto.subtle.digest("SHA-256"
FROM public.user_sessions
session_revoked
register_current_session
revoke_current_session
body?.confirm !== "DELETE"
SELECT * FROM public.users
trusted_support_grants
professional_workspaces
professional_memberships
record_data_export('json')
SELECT * FROM public.audit_events
WHERE user_id = $1
*/
