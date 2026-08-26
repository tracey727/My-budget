BEGIN;

-- Phase 6 rollback boundary: restore the sealed Phase 5 public schema and RLS model.
-- Managed neon_auth provisioning is platform state and is deliberately not dropped.

DROP TRIGGER IF EXISTS neon_auth_user_archive_application_before_delete ON neon_auth."user";
DROP TRIGGER IF EXISTS neon_auth_user_sync_application_identity ON neon_auth."user";

DROP FUNCTION IF EXISTS public.delete_current_account();
DROP FUNCTION IF EXISTS public.archive_neon_auth_user_before_delete();
DROP FUNCTION IF EXISTS public.archive_application_user(uuid);

DROP TRIGGER IF EXISTS trusted_support_grants_audit_phase6 ON public.trusted_support_grants;
DROP TRIGGER IF EXISTS professional_memberships_audit_phase6 ON public.professional_memberships;
DROP TRIGGER IF EXISTS professional_workspaces_audit_phase6 ON public.professional_workspaces;
DROP TRIGGER IF EXISTS user_entitlements_audit_phase6 ON public.user_entitlements;
DROP FUNCTION IF EXISTS public.audit_phase6_access_change();

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

DROP POLICY IF EXISTS audit_events_select_scoped ON public.audit_events;
CREATE POLICY audit_events_select_own ON public.audit_events
  FOR SELECT TO genevieve_budget_worker
  USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS user_entitlements_select_own ON public.user_entitlements;
DROP POLICY IF EXISTS professional_workspaces_select_member ON public.professional_workspaces;
DROP POLICY IF EXISTS professional_workspaces_insert_owner ON public.professional_workspaces;
DROP POLICY IF EXISTS professional_workspaces_update_manager ON public.professional_workspaces;
DROP POLICY IF EXISTS professional_memberships_select_member ON public.professional_memberships;
DROP POLICY IF EXISTS professional_memberships_insert_manager ON public.professional_memberships;
DROP POLICY IF EXISTS professional_memberships_update_manager ON public.professional_memberships;
DROP POLICY IF EXISTS trusted_support_grants_select_participant ON public.trusted_support_grants;
DROP POLICY IF EXISTS trusted_support_grants_insert_owner ON public.trusted_support_grants;
DROP POLICY IF EXISTS trusted_support_grants_update_owner ON public.trusted_support_grants;

DROP FUNCTION IF EXISTS public.professional_member_can(uuid, text);
DROP FUNCTION IF EXISTS public.user_has_professional_entitlement(uuid);
DROP FUNCTION IF EXISTS public.can_access_owned_record(uuid, text);
DROP FUNCTION IF EXISTS public.trusted_support_can(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.application_user_is_active(uuid);
DROP FUNCTION IF EXISTS public.current_data_owner_id();

DROP TRIGGER IF EXISTS professional_workspaces_ensure_owner ON public.professional_workspaces;
DROP FUNCTION IF EXISTS public.ensure_professional_workspace_owner();

DROP TABLE IF EXISTS public.trusted_support_grants;
DROP TABLE IF EXISTS public.professional_memberships;
DROP TABLE IF EXISTS public.professional_workspaces;
DROP TABLE IF EXISTS public.professional_role_permissions;

DROP FUNCTION IF EXISTS public.sync_neon_auth_user();

DROP TABLE IF EXISTS public.user_entitlements;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_deleted_at_check,
  DROP CONSTRAINT IF EXISTS users_auth_provider_check,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS auth_provider;

DELETE FROM public.schema_migrations
WHERE version IN ('010', '009', '008');

COMMIT;
