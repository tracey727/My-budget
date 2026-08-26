BEGIN;

-- Phase 6 / 011 — application session/device registry, account deletion state,
-- and export audit controls. Managed Neon Auth remains responsible for primary
-- sign-up/sign-in/sign-out/password-reset/passwordless authentication flows.

CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  auth_session_hash text NOT NULL,
  device_label text,
  user_agent text,
  ip_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT user_sessions_hash_nonempty CHECK (length(btrim(auth_session_hash)) >= 32),
  CONSTRAINT user_sessions_revocation_check CHECK (revoked_at IS NULL OR revoked_at >= created_at),
  CONSTRAINT user_sessions_unique UNIQUE (user_id, auth_session_hash)
);

CREATE INDEX user_sessions_active_user_idx
  ON public.user_sessions (user_id, last_seen_at DESC)
  WHERE revoked_at IS NULL;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_select_own
ON public.user_sessions
FOR SELECT TO genevieve_budget_worker
USING (user_id = public.current_app_user_id());

CREATE POLICY user_sessions_insert_own
ON public.user_sessions
FOR INSERT TO genevieve_budget_worker
WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY user_sessions_update_own
ON public.user_sessions
FOR UPDATE TO genevieve_budget_worker
USING (user_id = public.current_app_user_id())
WITH CHECK (user_id = public.current_app_user_id());

GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO genevieve_budget_worker;
REVOKE DELETE ON public.user_sessions FROM genevieve_budget_worker;

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

CREATE OR REPLACE FUNCTION public.revoke_current_session(p_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed integer;
BEGIN
  UPDATE public.user_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE id = p_session_id
    AND user_id = public.current_app_user_id();
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_current_session(uuid) TO genevieve_budget_worker;

CREATE OR REPLACE FUNCTION public.delete_current_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid;
BEGIN
  actor_id := public.current_app_user_id();
  IF actor_id IS NULL OR NOT public.application_user_is_active(actor_id) THEN
    RETURN false;
  END IF;

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

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    actor_id, 'user', 'account_deleted', 'users', actor_id, 'delete',
    jsonb_build_object('mode', 'soft_delete', 'financial_records_preserved', true)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_current_account() TO genevieve_budget_worker;

CREATE OR REPLACE FUNCTION public.record_data_export(p_format text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid;
  audit_id uuid;
BEGIN
  actor_id := public.current_app_user_id();
  IF actor_id IS NULL OR NOT public.application_user_is_active(actor_id) THEN
    RAISE EXCEPTION 'authenticated active application user required';
  END IF;
  IF p_format NOT IN ('json') THEN
    RAISE EXCEPTION 'unsupported export format';
  END IF;

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    actor_id, 'user', 'data_export', 'users', actor_id, 'export',
    jsonb_build_object('format', p_format)
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_data_export(text) TO genevieve_budget_worker;

CREATE TRIGGER user_sessions_audit_owned_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_sessions
FOR EACH ROW EXECUTE FUNCTION public.audit_owned_record_change();

INSERT INTO public.schema_migrations (version, description)
VALUES ('011', 'Phase 6 session device account deletion and export controls')
ON CONFLICT (version) DO NOTHING;

COMMIT;