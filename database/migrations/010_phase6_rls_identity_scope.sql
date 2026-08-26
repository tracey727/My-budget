BEGIN;

-- Phase 6 / 010 — transaction-local identity scope, support/professional authorization,
-- account-deletion enforcement and the Phase 6 readiness marker.

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
        WHEN 'export' THEN g.can_export
        WHEN 'write' THEN g.can_financial_action
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

  IF p_record_owner_id <> scoped_owner_id THEN
    RETURN false;
  END IF;

  IF NOT public.application_user_is_active(actor_id)
     OR NOT public.application_user_is_active(scoped_owner_id) THEN
    RETURN false;
  END IF;

  IF actor_id = scoped_owner_id THEN
    RETURN p_capability IN ('read', 'export', 'write');
  END IF;

  RETURN public.trusted_support_can(scoped_owner_id, actor_id, p_capability);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_professional_entitlement(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_entitlements
    WHERE user_id = p_user_id
      AND product_mode = 'professional'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.professional_member_can(
  p_workspace_id uuid,
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
    FROM public.professional_memberships m
    JOIN public.professional_role_permissions p ON p.role = m.role
    JOIN public.professional_workspaces w ON w.id = m.workspace_id
    WHERE m.workspace_id = p_workspace_id
      AND m.user_id = public.current_app_user_id()
      AND m.status = 'active'
      AND w.status = 'active'
      AND CASE p_capability
        WHEN 'read_financial' THEN p.can_read_financial
        WHEN 'write_financial' THEN p.can_write_financial
        WHEN 'export' THEN p.can_export
        WHEN 'manage_members' THEN p.can_manage_members
        WHEN 'manage_settings' THEN p.can_manage_settings
        WHEN 'manage_projects' THEN p.can_manage_projects
        WHEN 'transfer_ownership' THEN p.can_transfer_ownership
        ELSE false
      END
  );
$$;

REVOKE ALL ON FUNCTION public.current_data_owner_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.application_user_is_active(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trusted_support_can(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_owned_record(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_professional_entitlement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.professional_member_can(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_data_owner_id() TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.application_user_is_active(uuid) TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.trusted_support_can(uuid, uuid, text) TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.can_access_owned_record(uuid, text) TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.user_has_professional_entitlement(uuid) TO genevieve_budget_worker;
GRANT EXECUTE ON FUNCTION public.professional_member_can(uuid, text) TO genevieve_budget_worker;

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
      'CREATE POLICY %I ON public.%I FOR INSERT TO genevieve_budget_worker WITH CHECK (public.can_access_owned_record(user_id, ''write''))',
      table_name || '_insert_scoped', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO genevieve_budget_worker USING (public.can_access_owned_record(user_id, ''write'')) WITH CHECK (public.can_access_owned_record(user_id, ''write''))',
      table_name || '_update_scoped', table_name
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS audit_events_select_own ON public.audit_events;
CREATE POLICY audit_events_select_scoped ON public.audit_events
  FOR SELECT TO genevieve_budget_worker
  USING (public.can_access_owned_record(user_id, 'read'));

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_entitlements_select_own ON public.user_entitlements
  FOR SELECT TO genevieve_budget_worker
  USING (user_id = public.current_app_user_id());

ALTER TABLE public.professional_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_workspaces_select_member ON public.professional_workspaces
  FOR SELECT TO genevieve_budget_worker
  USING (
    owner_user_id = public.current_app_user_id()
    OR public.professional_member_can(id, 'read_financial')
  );
CREATE POLICY professional_workspaces_insert_owner ON public.professional_workspaces
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (
    owner_user_id = public.current_app_user_id()
    AND public.user_has_professional_entitlement(public.current_app_user_id())
  );
CREATE POLICY professional_workspaces_update_manager ON public.professional_workspaces
  FOR UPDATE TO genevieve_budget_worker
  USING (
    owner_user_id = public.current_app_user_id()
    OR public.professional_member_can(id, 'manage_settings')
  )
  WITH CHECK (
    owner_user_id = public.current_app_user_id()
    OR public.professional_member_can(id, 'manage_settings')
  );

ALTER TABLE public.professional_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_memberships_select_member ON public.professional_memberships
  FOR SELECT TO genevieve_budget_worker
  USING (
    user_id = public.current_app_user_id()
    OR public.professional_member_can(workspace_id, 'manage_members')
  );
CREATE POLICY professional_memberships_insert_manager ON public.professional_memberships
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (public.professional_member_can(workspace_id, 'manage_members'));
CREATE POLICY professional_memberships_update_manager ON public.professional_memberships
  FOR UPDATE TO genevieve_budget_worker
  USING (public.professional_member_can(workspace_id, 'manage_members'))
  WITH CHECK (public.professional_member_can(workspace_id, 'manage_members'));

ALTER TABLE public.trusted_support_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_support_grants_select_participant ON public.trusted_support_grants
  FOR SELECT TO genevieve_budget_worker
  USING (
    owner_user_id = public.current_app_user_id()
    OR support_user_id = public.current_app_user_id()
  );
CREATE POLICY trusted_support_grants_insert_owner ON public.trusted_support_grants
  FOR INSERT TO genevieve_budget_worker
  WITH CHECK (owner_user_id = public.current_app_user_id());
CREATE POLICY trusted_support_grants_update_owner ON public.trusted_support_grants
  FOR UPDATE TO genevieve_budget_worker
  USING (owner_user_id = public.current_app_user_id())
  WITH CHECK (owner_user_id = public.current_app_user_id());

GRANT SELECT ON public.user_entitlements TO genevieve_budget_worker;
REVOKE INSERT, UPDATE, DELETE ON public.user_entitlements FROM genevieve_budget_worker;

GRANT SELECT ON public.professional_role_permissions TO genevieve_budget_worker;
GRANT SELECT, INSERT, UPDATE ON
  public.professional_workspaces,
  public.professional_memberships,
  public.trusted_support_grants
TO genevieve_budget_worker;

REVOKE DELETE ON
  public.professional_workspaces,
  public.professional_memberships,
  public.trusted_support_grants
FROM genevieve_budget_worker;

CREATE OR REPLACE FUNCTION public.audit_phase6_access_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  row_data jsonb;
  owner_id uuid;
  entity_uuid uuid;
  actor text;
  workspace_uuid uuid;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  IF TG_TABLE_NAME = 'user_entitlements' THEN
    owner_id := NULLIF(row_data ->> 'user_id', '')::uuid;
    entity_uuid := owner_id;
  ELSIF TG_TABLE_NAME = 'professional_workspaces' THEN
    owner_id := NULLIF(row_data ->> 'owner_user_id', '')::uuid;
    entity_uuid := NULLIF(row_data ->> 'id', '')::uuid;
  ELSIF TG_TABLE_NAME = 'professional_memberships' THEN
    workspace_uuid := NULLIF(row_data ->> 'workspace_id', '')::uuid;
    SELECT owner_user_id INTO owner_id
    FROM public.professional_workspaces
    WHERE id = workspace_uuid;
    entity_uuid := NULLIF(row_data ->> 'id', '')::uuid;
  ELSIF TG_TABLE_NAME = 'trusted_support_grants' THEN
    owner_id := NULLIF(row_data ->> 'owner_user_id', '')::uuid;
    entity_uuid := NULLIF(row_data ->> 'id', '')::uuid;
  END IF;

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
    owner_id,
    actor,
    'phase6_access_change',
    TG_TABLE_NAME,
    entity_uuid,
    lower(TG_OP),
    jsonb_build_object(
      'role', row_data -> 'role',
      'status', row_data -> 'status',
      'can_read', row_data -> 'can_read',
      'can_export', row_data -> 'can_export',
      'can_financial_action', row_data -> 'can_financial_action'
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_phase6_access_change() FROM PUBLIC;

CREATE TRIGGER user_entitlements_audit_phase6
AFTER INSERT OR UPDATE OR DELETE ON public.user_entitlements
FOR EACH ROW EXECUTE FUNCTION public.audit_phase6_access_change();

CREATE TRIGGER professional_workspaces_audit_phase6
AFTER INSERT OR UPDATE OR DELETE ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.audit_phase6_access_change();

CREATE TRIGGER professional_memberships_audit_phase6
AFTER INSERT OR UPDATE OR DELETE ON public.professional_memberships
FOR EACH ROW EXECUTE FUNCTION public.audit_phase6_access_change();

CREATE TRIGGER trusted_support_grants_audit_phase6
AFTER INSERT OR UPDATE OR DELETE ON public.trusted_support_grants
FOR EACH ROW EXECUTE FUNCTION public.audit_phase6_access_change();

CREATE OR REPLACE FUNCTION public.archive_application_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.accounts SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.transactions SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.transaction_categories SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.incomes SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.bills SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.bill_provisions SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.subscriptions SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.savings_goals SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.debts SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.alerts SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.verified_savings SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;
  UPDATE public.financial_settings SET archived_at = COALESCE(archived_at, now())
    WHERE user_id = p_user_id AND archived_at IS NULL;

  UPDATE public.profiles
    SET display_name = NULL
    WHERE user_id = p_user_id AND display_name IS NOT NULL;

  UPDATE public.user_entitlements
    SET status = 'cancelled'
    WHERE user_id = p_user_id AND status <> 'cancelled';

  UPDATE public.professional_workspaces
    SET status = 'archived', archived_at = COALESCE(archived_at, now())
    WHERE owner_user_id = p_user_id AND status <> 'archived';

  UPDATE public.professional_memberships
    SET status = 'revoked', revoked_at = COALESCE(revoked_at, now())
    WHERE user_id = p_user_id AND status <> 'revoked';

  UPDATE public.trusted_support_grants
    SET revoked_at = COALESCE(revoked_at, now())
    WHERE (owner_user_id = p_user_id OR support_user_id = p_user_id)
      AND revoked_at IS NULL;

  UPDATE public.users
    SET email = NULL, status = 'deleted', deleted_at = COALESCE(deleted_at, now())
    WHERE id = p_user_id AND status <> 'deleted';
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_neon_auth_user_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, neon_auth, pg_temp
AS $$
BEGIN
  PERFORM public.archive_application_user(OLD.id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS neon_auth_user_archive_application_before_delete ON neon_auth."user";
CREATE TRIGGER neon_auth_user_archive_application_before_delete
BEFORE DELETE ON neon_auth."user"
FOR EACH ROW EXECUTE FUNCTION public.archive_neon_auth_user_before_delete();

CREATE OR REPLACE FUNCTION public.delete_current_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, neon_auth, pg_temp
AS $$
DECLARE
  actor_id uuid;
  raw_session_created text;
  session_created timestamptz;
BEGIN
  actor_id := public.current_app_user_id();
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'authenticated application user required';
  END IF;

  raw_session_created := current_setting('app.session_created_at', true);
  IF raw_session_created IS NULL OR btrim(raw_session_created) = '' THEN
    RAISE EXCEPTION 'fresh authenticated session required';
  END IF;

  BEGIN
    session_created := raw_session_created::timestamptz;
  EXCEPTION WHEN invalid_datetime_format THEN
    RAISE EXCEPTION 'fresh authenticated session required';
  END;

  IF session_created < now() - interval '15 minutes'
     OR session_created > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'fresh authenticated session required';
  END IF;

  IF NOT public.application_user_is_active(actor_id) THEN
    RAISE EXCEPTION 'active application user required';
  END IF;

  PERFORM public.archive_application_user(actor_id);

  DELETE FROM neon_auth."user"
  WHERE id = actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'authentication identity not found';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_application_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_neon_auth_user_before_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_current_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_account() TO genevieve_budget_worker;

INSERT INTO public.schema_migrations (version, description)
VALUES ('010', 'Phase 6 transaction scoped identity professional support RLS and account deletion')
ON CONFLICT (version) DO NOTHING;

COMMIT;
