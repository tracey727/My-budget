BEGIN;

DELETE FROM public.schema_migrations WHERE version = '012';

DROP TRIGGER IF EXISTS professional_workspaces_audit_change ON public.professional_workspaces;
DROP FUNCTION IF EXISTS public.audit_professional_workspace_change();

CREATE TRIGGER professional_workspaces_audit_owned_change
AFTER INSERT OR UPDATE OR DELETE ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.audit_owned_record_change();

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
  SET revoked_at = COALESCE(revoked_at, now()), can_financial_action = false
  WHERE owner_user_id = actor_id OR support_user_id = actor_id;

  UPDATE public.professional_memberships
  SET status = 'revoked', revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = actor_id AND status <> 'revoked';

  UPDATE public.user_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = actor_id;

  UPDATE public.user_entitlements SET status = 'cancelled' WHERE user_id = actor_id;
  UPDATE public.users SET status = 'deleted', deleted_at = now() WHERE id = actor_id;

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    actor_id, 'user', 'account_deleted', 'users', actor_id, 'delete',
    jsonb_build_object('mode', 'soft_delete', 'financial_records_preserved', true)
  );

  RETURN true;
END;
$$;

COMMIT;