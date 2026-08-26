BEGIN;

DELETE FROM public.schema_migrations WHERE version = '009';

DROP TRIGGER IF EXISTS trusted_support_grants_audit_change ON public.trusted_support_grants;
DROP FUNCTION IF EXISTS public.audit_trusted_support_change();

DROP POLICY IF EXISTS audit_events_select_scoped ON public.audit_events;
DROP POLICY IF EXISTS audit_events_insert_scoped ON public.audit_events;

CREATE POLICY audit_events_select_own ON public.audit_events
  FOR SELECT TO genevieve_budget_worker
  USING (user_id = public.current_app_user_id());

CREATE POLICY audit_events_insert_own ON public.audit_events
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (user_id = public.current_app_user_id());

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'financial_settings',
    'transaction_categories',
    'accounts',
    'transactions',
    'incomes',
    'bills',
    'bill_provisions',
    'subscriptions',
    'savings_goals',
    'debts',
    'alerts',
    'verified_savings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_scoped', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_scoped', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_scoped', table_name);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO genevieve_budget_worker USING (user_id = public.current_app_user_id())',
      table_name || '_select_own', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO genevieve_budget_worker WITH CHECK (user_id = public.current_app_user_id())',
      table_name || '_insert_own', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO genevieve_budget_worker USING (user_id = public.current_app_user_id()) WITH CHECK (user_id = public.current_app_user_id())',
      table_name || '_update_own', table_name
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS trusted_support_grants_select_participant ON public.trusted_support_grants;
DROP POLICY IF EXISTS trusted_support_grants_insert_owner ON public.trusted_support_grants;
DROP POLICY IF EXISTS trusted_support_grants_update_owner ON public.trusted_support_grants;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.trusted_support_grants FROM genevieve_budget_worker;

DROP TRIGGER IF EXISTS trusted_support_grants_set_updated_at ON public.trusted_support_grants;
DROP TABLE IF EXISTS public.trusted_support_grants;

DROP FUNCTION IF EXISTS public.can_access_owned_record(uuid, text);
DROP FUNCTION IF EXISTS public.trusted_support_can(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.application_user_is_active(uuid);
DROP FUNCTION IF EXISTS public.current_data_owner_id();

COMMIT;
