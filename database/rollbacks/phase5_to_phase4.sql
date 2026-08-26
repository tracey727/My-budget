BEGIN;

-- Full Phase 5 rollback procedure.
-- Apply only when intentionally returning the database from Phase 5 to the sealed Phase 4 schema.
-- Historical audit rows are preserved; only Phase 5 schema/security objects are removed.

DELETE FROM public.schema_migrations WHERE version IN ('006', '005');

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users','profiles','financial_settings','transaction_categories','accounts','transactions',
    'incomes','bills','bill_provisions','subscriptions','savings_goals','debts','alerts','verified_savings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', table_name || '_audit_owned_change', table_name);
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.audit_owned_record_change();

REVOKE SELECT, INSERT, UPDATE ON
  public.users,public.profiles,public.financial_settings,public.transaction_categories,
  public.accounts,public.transactions,public.incomes,public.bills,public.bill_provisions,
  public.subscriptions,public.savings_goals,public.debts,public.alerts,public.verified_savings
FROM genevieve_budget_worker;
REVOKE SELECT, INSERT ON public.audit_events FROM genevieve_budget_worker;
REVOKE USAGE, SELECT ON SEQUENCE public.audit_events_id_seq FROM genevieve_budget_worker;
GRANT SELECT ON public.schema_migrations TO genevieve_budget_worker;

DROP POLICY IF EXISTS audit_events_select_own ON public.audit_events;
DROP POLICY IF EXISTS audit_events_insert_own ON public.audit_events;
ALTER TABLE public.audit_events DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles','financial_settings','transaction_categories','accounts','transactions','incomes',
    'bills','bill_provisions','subscriptions','savings_goals','debts','alerts','verified_savings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_own', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_own', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_own', table_name);
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.current_app_user_id() FROM genevieve_budget_worker;
DROP FUNCTION IF EXISTS public.current_app_user_id();

DROP TRIGGER IF EXISTS alerts_enforce_source_ownership ON public.alerts;
DROP FUNCTION IF EXISTS public.assert_alert_source_ownership();
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_source_reference_check;

DROP INDEX IF EXISTS public.transaction_categories_user_name_scope_active_unique;

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_account_owner_fk;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_account_owner_fk;
ALTER TABLE public.bill_provisions DROP CONSTRAINT IF EXISTS bill_provisions_bill_owner_fk;
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_account_owner_fk;
ALTER TABLE public.incomes DROP CONSTRAINT IF EXISTS incomes_account_owner_fk;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_owner_fk;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_to_account_owner_fk;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_account_owner_fk;

ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_user_id_id_unique;
ALTER TABLE public.transaction_categories DROP CONSTRAINT IF EXISTS transaction_categories_user_id_id_unique;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_id_unique;

DROP TRIGGER IF EXISTS alerts_set_updated_at ON public.alerts;
ALTER TABLE public.alerts DROP COLUMN IF EXISTS updated_at;

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_archive_state_check;
DROP TRIGGER IF EXISTS accounts_sync_archive_state ON public.accounts;
DROP FUNCTION IF EXISTS public.sync_account_archive_state();

ALTER TABLE public.verified_savings DROP CONSTRAINT IF EXISTS verified_savings_archived_at_check;
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_archived_at_check;
ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_archived_at_check;
ALTER TABLE public.savings_goals DROP CONSTRAINT IF EXISTS savings_goals_archived_at_check;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_archived_at_check;
ALTER TABLE public.bill_provisions DROP CONSTRAINT IF EXISTS bill_provisions_archived_at_check;
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_archived_at_check;
ALTER TABLE public.incomes DROP CONSTRAINT IF EXISTS incomes_archived_at_check;
ALTER TABLE public.transaction_categories DROP CONSTRAINT IF EXISTS transaction_categories_archived_at_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_archived_at_check;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_archived_at_check;

ALTER TABLE public.verified_savings DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.alerts DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.debts DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.savings_goals DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.bill_provisions DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.bills DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.incomes DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.transaction_categories DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS archived_at;
ALTER TABLE public.accounts DROP COLUMN IF EXISTS archived_at;

ALTER TABLE public.transaction_categories ALTER COLUMN user_id DROP NOT NULL;

COMMIT;
