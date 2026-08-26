BEGIN;

-- Phase 5 — database safety, ownership isolation and audit hardening.

-- Every financial record must belong to a user.
ALTER TABLE public.transaction_categories
  ALTER COLUMN user_id SET NOT NULL;

-- Soft-delete/archive timestamps. Accounts already have the sealed `archived` flag;
-- Phase 5 adds an archive timestamp and keeps both representations synchronized.
ALTER TABLE public.accounts ADD COLUMN archived_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN archived_at timestamptz;
ALTER TABLE public.transaction_categories ADD COLUMN archived_at timestamptz;
ALTER TABLE public.incomes ADD COLUMN archived_at timestamptz;
ALTER TABLE public.bills ADD COLUMN archived_at timestamptz;
ALTER TABLE public.bill_provisions ADD COLUMN archived_at timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN archived_at timestamptz;
ALTER TABLE public.savings_goals ADD COLUMN archived_at timestamptz;
ALTER TABLE public.debts ADD COLUMN archived_at timestamptz;
ALTER TABLE public.alerts ADD COLUMN archived_at timestamptz;
ALTER TABLE public.verified_savings ADD COLUMN archived_at timestamptz;

ALTER TABLE public.accounts ADD CONSTRAINT accounts_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.transaction_categories ADD CONSTRAINT transaction_categories_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.incomes ADD CONSTRAINT incomes_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.bills ADD CONSTRAINT bills_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.bill_provisions ADD CONSTRAINT bill_provisions_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.debts ADD CONSTRAINT debts_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.alerts ADD CONSTRAINT alerts_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);
ALTER TABLE public.verified_savings ADD CONSTRAINT verified_savings_archived_at_check CHECK (archived_at IS NULL OR archived_at >= created_at);

CREATE OR REPLACE FUNCTION public.sync_account_archive_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.archived_at IS NOT NULL THEN
      NEW.archived := true;
    ELSIF NEW.archived THEN
      NEW.archived_at := now();
    END IF;
  ELSE
    IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
      NEW.archived := NEW.archived_at IS NOT NULL;
    ELSIF NEW.archived IS DISTINCT FROM OLD.archived THEN
      NEW.archived_at := CASE WHEN NEW.archived THEN COALESCE(OLD.archived_at, now()) ELSE NULL END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_sync_archive_state
BEFORE INSERT OR UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_account_archive_state();

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_archive_state_check
  CHECK ((archived AND archived_at IS NOT NULL) OR (NOT archived AND archived_at IS NULL));

-- Alerts are mutable records, so they also require updated_at coverage.
ALTER TABLE public.alerts
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER alerts_set_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Composite uniqueness enables ownership-preserving foreign keys.
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.transaction_categories
  ADD CONSTRAINT transaction_categories_user_id_id_unique UNIQUE (user_id, id);
ALTER TABLE public.bills
  ADD CONSTRAINT bills_user_id_id_unique UNIQUE (user_id, id);

-- Cross-user references are prohibited at the database layer.
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_owner_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT transactions_to_account_owner_fk
  FOREIGN KEY (user_id, to_account_id) REFERENCES public.accounts(user_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT transactions_category_owner_fk
  FOREIGN KEY (user_id, category_id) REFERENCES public.transaction_categories(user_id, id) ON DELETE RESTRICT;

ALTER TABLE public.incomes
  ADD CONSTRAINT incomes_account_owner_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE RESTRICT;

ALTER TABLE public.bills
  ADD CONSTRAINT bills_account_owner_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE RESTRICT;

ALTER TABLE public.bill_provisions
  ADD CONSTRAINT bill_provisions_bill_owner_fk
  FOREIGN KEY (user_id, bill_id) REFERENCES public.bills(user_id, id) ON DELETE RESTRICT;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_account_owner_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE RESTRICT;

ALTER TABLE public.debts
  ADD CONSTRAINT debts_account_owner_fk
  FOREIGN KEY (user_id, account_id) REFERENCES public.accounts(user_id, id) ON DELETE RESTRICT;

-- User categories must be unique while active, while archived categories may be recreated.
CREATE UNIQUE INDEX transaction_categories_user_name_scope_active_unique
  ON public.transaction_categories (user_id, lower(name), transaction_scope)
  WHERE archived_at IS NULL;

-- Polymorphic alert references must point to a record owned by the same user.
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_source_reference_check CHECK (
    (source_type = 'general' AND source_id IS NULL)
    OR (source_type <> 'general' AND source_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.assert_alert_source_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owns_source boolean := false;
BEGIN
  IF NEW.source_type = 'general' THEN
    RETURN NEW;
  END IF;

  CASE NEW.source_type
    WHEN 'bill' THEN
      SELECT EXISTS (SELECT 1 FROM public.bills WHERE id = NEW.source_id AND user_id = NEW.user_id) INTO owns_source;
    WHEN 'savings_goal' THEN
      SELECT EXISTS (SELECT 1 FROM public.savings_goals WHERE id = NEW.source_id AND user_id = NEW.user_id) INTO owns_source;
    WHEN 'debt' THEN
      SELECT EXISTS (SELECT 1 FROM public.debts WHERE id = NEW.source_id AND user_id = NEW.user_id) INTO owns_source;
    WHEN 'subscription' THEN
      SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE id = NEW.source_id AND user_id = NEW.user_id) INTO owns_source;
    WHEN 'account' THEN
      SELECT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.source_id AND user_id = NEW.user_id) INTO owns_source;
    WHEN 'transaction' THEN
      SELECT EXISTS (SELECT 1 FROM public.transactions WHERE id = NEW.source_id AND user_id = NEW.user_id) INTO owns_source;
    WHEN 'income' THEN
      SELECT EXISTS (SELECT 1 FROM public.incomes WHERE id = NEW.source_id AND user_id = NEW.user_id) INTO owns_source;
    ELSE
      owns_source := false;
  END CASE;

  IF NOT owns_source THEN
    RAISE EXCEPTION 'alert source must belong to the same user';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER alerts_enforce_source_ownership
BEFORE INSERT OR UPDATE OF user_id, source_type, source_id ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.assert_alert_source_ownership();

-- RLS identity is supplied transaction-locally by the application before financial queries.
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_user_id text;
BEGIN
  raw_user_id := current_setting('app.user_id', true);
  IF raw_user_id IS NULL OR btrim(raw_user_id) = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN raw_user_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO genevieve_budget_worker;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON public.users
  FOR SELECT TO genevieve_budget_worker
  USING (id = public.current_app_user_id());
CREATE POLICY users_insert_own ON public.users
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (id = public.current_app_user_id());
CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO genevieve_budget_worker
  USING (id = public.current_app_user_id())
  WITH CHECK (id = public.current_app_user_id());

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles',
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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
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

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_events_select_own ON public.audit_events
  FOR SELECT TO genevieve_budget_worker
  USING (user_id = public.current_app_user_id());
CREATE POLICY audit_events_insert_own ON public.audit_events
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (user_id = public.current_app_user_id());

-- Worker may read/write only through RLS and may never physically delete financial records.
GRANT SELECT, INSERT, UPDATE ON
  public.users,
  public.profiles,
  public.financial_settings,
  public.transaction_categories,
  public.accounts,
  public.transactions,
  public.incomes,
  public.bills,
  public.bill_provisions,
  public.subscriptions,
  public.savings_goals,
  public.debts,
  public.alerts,
  public.verified_savings
TO genevieve_budget_worker;

GRANT SELECT, INSERT ON public.audit_events TO genevieve_budget_worker;
GRANT USAGE, SELECT ON SEQUENCE public.audit_events_id_seq TO genevieve_budget_worker;

REVOKE DELETE ON
  public.users,
  public.profiles,
  public.financial_settings,
  public.transaction_categories,
  public.accounts,
  public.transactions,
  public.incomes,
  public.bills,
  public.bill_provisions,
  public.subscriptions,
  public.savings_goals,
  public.debts,
  public.alerts,
  public.verified_savings,
  public.audit_events
FROM genevieve_budget_worker;

REVOKE UPDATE, DELETE ON public.audit_events FROM genevieve_budget_worker;
REVOKE INSERT, UPDATE, DELETE ON public.schema_migrations FROM genevieve_budget_worker;

-- Minimal append-only audit record for every mutable owned record change.
CREATE OR REPLACE FUNCTION public.audit_owned_record_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb;
  owner_id uuid;
  entity_uuid uuid;
  actor text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  IF TG_TABLE_NAME = 'users' THEN
    owner_id := NULLIF(row_data ->> 'id', '')::uuid;
  ELSE
    owner_id := NULLIF(row_data ->> 'user_id', '')::uuid;
  END IF;

  entity_uuid := COALESCE(NULLIF(row_data ->> 'id', '')::uuid, owner_id);
  actor := current_setting('app.actor_type', true);
  IF actor NOT IN ('user', 'system', 'support') THEN
    actor := 'system';
  END IF;

  INSERT INTO public.audit_events (
    user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    action,
    metadata
  ) VALUES (
    owner_id,
    actor,
    'owned_record_change',
    TG_TABLE_NAME,
    entity_uuid,
    lower(TG_OP),
    jsonb_build_object('archived_at', row_data -> 'archived_at')
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'profiles',
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
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_owned_record_change()',
      table_name || '_audit_owned_change', table_name
    );
  END LOOP;
END;
$$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('005', 'Phase 5 database safety ownership isolation soft archive RLS and audit hardening')
ON CONFLICT (version) DO NOTHING;

COMMIT;
