BEGIN;

-- Phase 6 / 014 — final lifecycle/audit hardening found by the Phase 1→6 audit.
-- 1. A locally revoked device/session must never be silently reactivated.
-- 2. Deleting a Professional owner must not leave an active orphaned workspace.
-- 3. Account deletion continues to preserve financial records and immutable audit evidence.

CREATE OR REPLACE FUNCTION public.register_current_session(
  p_session_hash text,
  p_device_label text,
  p_user_agent text,
  p_ip_hint text,
  p_expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid;
  session_id uuid;
BEGIN
  actor_id := public.current_app_user_id();
  IF actor_id IS NULL OR NOT public.application_user_is_active(actor_id) THEN
    RAISE EXCEPTION 'authenticated active application user required';
  END IF;

  INSERT INTO public.user_sessions (
    user_id, auth_session_hash, device_label, user_agent, ip_hint, expires_at
  ) VALUES (
    actor_id, p_session_hash, NULLIF(btrim(p_device_label), ''),
    NULLIF(left(p_user_agent, 500), ''), NULLIF(left(p_ip_hint, 120), ''), p_expires_at
  )
  ON CONFLICT (user_id, auth_session_hash) DO UPDATE
  SET
    device_label = COALESCE(EXCLUDED.device_label, public.user_sessions.device_label),
    user_agent = COALESCE(EXCLUDED.user_agent, public.user_sessions.user_agent),
    ip_hint = COALESCE(EXCLUDED.ip_hint, public.user_sessions.ip_hint),
    last_seen_at = now(),
    expires_at = EXCLUDED.expires_at,
    -- Revocation is one-way for this application session record. A fresh managed
    -- Auth session produces a different hash and therefore a different row.
    revoked_at = public.user_sessions.revoked_at
  RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_current_session(text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_current_session(text, text, text, text, timestamptz)
TO genevieve_budget_worker;

CREATE OR REPLACE FUNCTION public.delete_current_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid;
BEGIN
  actor_id := public.current_app_user_id();
  IF actor_id IS NULL OR NOT public.application_user_is_active(actor_id) THEN
    RETURN false;
  END IF;

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    actor_id, 'user', 'account_deleted', 'users', actor_id, 'delete',
    jsonb_build_object(
      'mode', 'soft_delete',
      'financial_records_preserved', true,
      'owned_professional_workspaces_archived', true
    )
  );

  UPDATE public.trusted_support_grants
  SET revoked_at = COALESCE(revoked_at, now()),
      can_financial_action = false
  WHERE owner_user_id = actor_id OR support_user_id = actor_id;

  -- An owner must not disappear while leaving an active workspace that no
  -- remaining member has authority to manage. Archive owned workspaces first.
  UPDATE public.professional_workspaces
  SET status = 'archived',
      archived_at = COALESCE(archived_at, now())
  WHERE owner_user_id = actor_id
    AND status <> 'archived';

  -- Revoke the user's memberships everywhere and every membership in a
  -- workspace the deleted user owned. Historical rows and their audits remain.
  UPDATE public.professional_memberships
  SET status = 'revoked',
      revoked_at = COALESCE(revoked_at, now())
  WHERE status <> 'revoked'
    AND (
      user_id = actor_id
      OR workspace_id IN (
        SELECT id
        FROM public.professional_workspaces
        WHERE owner_user_id = actor_id
      )
    );

  UPDATE public.user_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = actor_id;

  UPDATE public.user_entitlements
  SET status = 'cancelled'
  WHERE user_id = actor_id;

  UPDATE public.users
  SET status = 'deleted', deleted_at = now()
  WHERE id = actor_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_account() TO genevieve_budget_worker;

INSERT INTO public.schema_migrations (version, description)
VALUES ('014', 'Phase 6 session revocation and account lifecycle audit hardening')
ON CONFLICT (version) DO NOTHING;

COMMIT;
