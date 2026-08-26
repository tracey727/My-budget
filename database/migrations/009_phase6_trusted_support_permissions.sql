BEGIN;

-- Phase 6 / 009 — trusted-support permissions only.
-- Read authority and financial-action authority are separate.
-- This migration deliberately excludes professional staff roles/workspaces,
-- account deletion, exports, device/session management and later Phase 6 scope.

CREATE TABLE public.trusted_support_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  support_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  can_read boolean NOT NULL DEFAULT true,
  can_financial_action boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trusted_support_distinct_users_check CHECK (owner_user_id <> support_user_id),
  CONSTRAINT trusted_support_action_requires_read_check CHECK (NOT can_financial_action OR can_read),
  CONSTRAINT trusted_support_expiry_check CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT trusted_support_revocation_check CHECK (revoked_at IS NULL OR revoked_at >= created_at),
  CONSTRAINT trusted_support_pair_unique UNIQUE (owner_user_id, support_user_id)
);

CREATE INDEX trusted_support_grants_support_idx
  ON public.trusted_support_grants (support_user_id, owner_user_id);

CREATE TRIGGER trusted_support_grants_set_updated_at
BEFORE UPDATE ON public.trusted_support_grants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_data_owner_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw_owner_id text;
BEGIN
  raw_owner_id := current_setting('app.owner_user_id', true);
  IF raw_owner_id IS NULL OR btrim(raw_owner_id) = '' THEN
    RETURN public.current_app_user_id();
  END IF;

  BEGIN
    RETURN raw_owner_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.application_user_is_active(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = p_user_id
      AND status = 'active'
      AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.trusted_support_can(
  p_owner_user_id uuid,
  p_support_user_id uuid,
  p_capability text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trusted_support_grants g
    WHERE g.owner_user_id = p_owner_user_id
      AND g.support_user_id = p_support_user_id
      AND g.revoked_at IS NULL
      AND (g.expires_at IS NULL OR g.expires_at > now())
      AND CASE p_capability
        WHEN 'read' THEN g.can_read
        WHEN 'financial_action' THEN g.can_financial_action
        ELSE false
      END
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_owned_record(
  p_record_owner_id uuid,
  p_capability text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid;
  scoped_owner_id uuid;
BEGIN
  actor_id := public.current_app_user_id();
  scoped_owner_id := public.current_data_owner_id();

  IF actor_id IS NULL OR scoped_owner_id IS NULL OR p_record_owner_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_capability NOT IN ('read', 'financial_action') THEN
    RETURN false;
  END IF;

  IF p_record_owner_id <> scoped_owner_id THEN
    RETURN false;
  END IF;

  IF NOT public.application_user_is_active(actor_id)
     OR NOT public.application_user_is_active(scoped_owner_id) THEN
    RETURN false;
  END IF;

  IF actor_id = scoped_owner_id THEN
    RETURN true;
  END IF;

  RETURN public.trusted_support_can(scoped_owner_id, actor_id, p_capability);
END;
$$;

REVOKE ALL ON FUNCTION public.current_data_owner_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.application_user_is_active(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trusted_support_can(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_owned_record(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_data_owner_id() TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.application_user_is_active(uuid) TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.trusted_support_can(uuid, uuid, text) TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.can_access_owned_record(uuid, text) TO genevieve_budget_worker;

ALTER TABLE public.trusted_support_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY trusted_support_grants_select_participant ON public.trusted_support_grants
  FOR SELECT TO genevieve_budget_worker
  USING (
    owner_user_id = public.current_app_user_id()
    OR support_user_id = public.current_app_user_id()
  );

CREATE POLICY trusted_support_grants_insert_owner ON public.trusted_support_grants
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (
    owner_user_id = public.current_app_user_id()
    AND support_user_id <> public.current_app_user_id()
  );

CREATE POLICY trusted_support_grants_update_owner ON public.trusted_support_grants
  FOR UPDATE TO genevieve_budget_worker
  USING (owner_user_id = public.current_app_user_id())
  WITH CHECK (
    owner_user_id = public.current_app_user_id()
    AND support_user_id <> public.current_app_user_id()
  );

GRANT SELECT, INSERT, UPDATE ON public.trusted_support_grants TO genevieve_budget_worker;
REVOKE DELETE ON public.trusted_support_grants FROM genevieve_budget_worker;

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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_own', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_own', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_own', table_name);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO genevieve_budget_worker USING (public.can_access_owned_record(user_id, ''read''))',
      table_name || '_select_scoped', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO genevieve_budget_worker WITH CHECK (public.can_access_owned_record(user_id, ''financial_action''))',
      table_name || '_insert_scoped', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO genevieve_budget_worker USING (public.can_access_owned_record(user_id, ''financial_action'')) WITH CHECK (public.can_access_owned_record(user_id, ''financial_action''))',
      table_name || '_update_scoped', table_name
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS audit_events_select_own ON public.audit_events;
DROP POLICY IF EXISTS audit_events_insert_own ON public.audit_events;

CREATE POLICY audit_events_select_scoped ON public.audit_events
  FOR SELECT TO genevieve_budget_worker
  USING (public.can_access_owned_record(user_id, 'read'));

CREATE POLICY audit_events_insert_scoped ON public.audit_events
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (public.can_access_owned_record(user_id, 'financial_action'));

CREATE OR REPLACE FUNCTION public.audit_trusted_support_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb;
  actor text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  actor := current_setting('app.actor_type', true);
  IF actor IS NULL OR actor NOT IN ('user', 'system', 'support') THEN
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
    NULLIF(row_data ->> 'owner_user_id', '')::uuid,
    actor,
    'trusted_support_permission_change',
    'trusted_support_grants',
    NULLIF(row_data ->> 'id', '')::uuid,
    lower(TG_OP),
    jsonb_build_object(
      'support_user_id', row_data -> 'support_user_id',
      'can_read', row_data -> 'can_read',
      'can_financial_action', row_data -> 'can_financial_action',
      'expires_at', row_data -> 'expires_at',
      'revoked_at', row_data -> 'revoked_at'
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trusted_support_grants_audit_change
AFTER INSERT OR UPDATE OR DELETE ON public.trusted_support_grants
FOR EACH ROW EXECUTE FUNCTION public.audit_trusted_support_change();

INSERT INTO public.schema_migrations (version, description)
VALUES ('009', 'Phase 6 trusted support read and financial action authority separation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
