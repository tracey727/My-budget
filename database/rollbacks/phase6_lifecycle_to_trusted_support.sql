BEGIN;

DELETE FROM public.schema_migrations WHERE version = '011';

DROP TRIGGER IF EXISTS user_sessions_audit_owned_change ON public.user_sessions;
DROP FUNCTION IF EXISTS public.record_data_export(text);
DROP FUNCTION IF EXISTS public.delete_current_account();
DROP FUNCTION IF EXISTS public.revoke_current_session(uuid);
DROP FUNCTION IF EXISTS public.register_current_session(text, text, text, text, timestamptz);

DROP POLICY IF EXISTS user_sessions_select_own ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_insert_own ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_update_own ON public.user_sessions;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.user_sessions FROM genevieve_budget_worker;
DROP TABLE IF EXISTS public.user_sessions;

COMMIT;