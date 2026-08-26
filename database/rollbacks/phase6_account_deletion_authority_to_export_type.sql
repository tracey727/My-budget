BEGIN;

DELETE FROM public.schema_migrations WHERE version = '013';

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

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    actor_id, 'user', 'account_deleted', 'users', actor_id, 'delete',
    jsonb_build_object('mode', 'soft_delete', 'financial_records_preserved', true)
  );

  UPDATE public.trusted_support_grants
  SET revoked_at = COALESCE(revoked_at, now()), can_financial_action = false
  WHERE owner_user_id = actor_id OR support_user_id = actor_id;

  UPDATE public.professional_memberships
  SET status = 'revoked', revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = actor_id AND status <> 'revoked';

  UPDATE public.user_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = actor_id;
  UPDATE public.user_entitlements SET status = 'cancelled' WHERE user_id = actor_id;
  UPDATE public.users SET status = 'deleted', deleted_at = now() WHERE id = actor_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_current_account() TO genevieve_budget_worker;

COMMIT;