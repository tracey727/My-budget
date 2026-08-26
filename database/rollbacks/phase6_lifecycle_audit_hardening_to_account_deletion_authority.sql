BEGIN;

DELETE FROM public.schema_migrations WHERE version = '014';

-- Restore migration 011 session-registration semantics at the migration 013 boundary.
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
    revoked_at = NULL
  RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_current_session(text, text, text, text, timestamptz)
TO genevieve_budget_worker;

-- Restore the migration 013 account-deletion definition.
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
    jsonb_build_object('mode', 'soft_delete', 'financial_records_preserved', true)
  );

  UPDATE public.trusted_support_grants
  SET revoked_at = COALESCE(revoked_at, now()),
      can_financial_action = false
  WHERE owner_user_id = actor_id OR support_user_id = actor_id;

  UPDATE public.professional_memberships
  SET status = 'revoked', revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = actor_id AND status <> 'revoked';

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

COMMIT;
