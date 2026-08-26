BEGIN;

-- Phase 6 / 012 — corrections found by pre-promotion linkage audit.
-- Preserve sealed Phase 5 audit behavior and correct Phase 6-specific ownership shapes.

DROP TRIGGER IF EXISTS professional_workspaces_audit_owned_change ON public.professional_workspaces;

CREATE OR REPLACE FUNCTION public.audit_professional_workspace_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb;
  actor text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  actor := current_setting('app.actor_type', true);
  IF actor IS NULL OR actor NOT IN ('user', 'system', 'support') THEN actor := 'system'; END IF;

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    NULLIF(row_data ->> 'owner_user_id', '')::uuid,
    actor,
    'professional_workspace_change',
    'professional_workspaces',
    NULLIF(row_data ->> 'id', '')::uuid,
    lower(TG_OP),
    jsonb_build_object(
      'name', row_data -> 'name',
      'status', row_data -> 'status',
      'archived_at', row_data -> 'archived_at'
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER professional_workspaces_audit_change
AFTER INSERT OR UPDATE OR DELETE ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.audit_professional_workspace_change();

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

  -- Write the immutable account-deletion event while the user is still active,
  -- because Phase 6 audit RLS correctly rejects writes by inactive/deleted users.
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

INSERT INTO public.schema_migrations (version, description)
VALUES ('012', 'Phase 6 workspace audit and account deletion audit ordering corrections')
ON CONFLICT (version) DO NOTHING;

COMMIT;