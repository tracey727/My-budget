BEGIN;

DELETE FROM public.schema_migrations WHERE version = '012';

DROP FUNCTION IF EXISTS public.record_data_export(text);

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

COMMIT;