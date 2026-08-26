BEGIN;

-- Phase 6 / 010 — Professional identity authority only.
-- Business/project accounting entities remain deferred to Phase 20.

CREATE TABLE public.professional_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT professional_workspaces_archive_check CHECK (
    (status = 'archived' AND archived_at IS NOT NULL)
    OR (status <> 'archived' AND archived_at IS NULL)
  )
);

CREATE TABLE public.professional_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.professional_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'owner',
    'administrator',
    'manager',
    'accountant_bookkeeper',
    'project_manager',
    'read_only'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT professional_membership_revocation_check CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  ),
  CONSTRAINT professional_membership_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX professional_memberships_user_idx
  ON public.professional_memberships (user_id, workspace_id);

CREATE TRIGGER professional_workspaces_set_updated_at
BEFORE UPDATE ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER professional_memberships_set_updated_at
BEFORE UPDATE ON public.professional_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.professional_role_can(
  p_workspace_id uuid,
  p_user_id uuid,
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
    JOIN public.professional_workspaces w ON w.id = m.workspace_id
    JOIN public.user_entitlements e ON e.user_id = m.user_id
    WHERE m.workspace_id = p_workspace_id
      AND m.user_id = p_user_id
      AND m.status = 'active'
      AND m.revoked_at IS NULL
      AND w.status = 'active'
      AND w.archived_at IS NULL
      AND e.product_mode = 'professional'
      AND e.status = 'active'
      AND CASE p_capability
        WHEN 'read' THEN m.role IN ('owner','administrator','manager','accountant_bookkeeper','project_manager','read_only')
        WHEN 'financial_action' THEN m.role IN ('owner','administrator','manager','accountant_bookkeeper','project_manager')
        WHEN 'manage_members' THEN m.role IN ('owner','administrator')
        WHEN 'manage_workspace' THEN m.role = 'owner'
        ELSE false
      END
  );
$$;

REVOKE ALL ON FUNCTION public.professional_role_can(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.professional_role_can(uuid, uuid, text) TO genevieve_budget_worker;

ALTER TABLE public.professional_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY professional_workspaces_select_member
ON public.professional_workspaces
FOR SELECT TO genevieve_budget_worker
USING (public.professional_role_can(id, public.current_app_user_id(), 'read'));

CREATE POLICY professional_workspaces_insert_owner
ON public.professional_workspaces
FOR INSERT TO genevieve_budget_worker
WITH CHECK (
  owner_user_id = public.current_app_user_id()
  AND EXISTS (
    SELECT 1 FROM public.user_entitlements e
    WHERE e.user_id = public.current_app_user_id()
      AND e.product_mode = 'professional'
      AND e.status = 'active'
  )
);

CREATE POLICY professional_workspaces_update_owner
ON public.professional_workspaces
FOR UPDATE TO genevieve_budget_worker
USING (public.professional_role_can(id, public.current_app_user_id(), 'manage_workspace'))
WITH CHECK (owner_user_id = public.current_app_user_id());

CREATE POLICY professional_memberships_select_member
ON public.professional_memberships
FOR SELECT TO genevieve_budget_worker
USING (public.professional_role_can(workspace_id, public.current_app_user_id(), 'read'));

CREATE POLICY professional_memberships_insert_admin
ON public.professional_memberships
FOR INSERT TO genevieve_budget_worker
WITH CHECK (
  public.professional_role_can(workspace_id, public.current_app_user_id(), 'manage_members')
  AND role <> 'owner'
);

CREATE POLICY professional_memberships_update_admin
ON public.professional_memberships
FOR UPDATE TO genevieve_budget_worker
USING (public.professional_role_can(workspace_id, public.current_app_user_id(), 'manage_members'))
WITH CHECK (
  public.professional_role_can(workspace_id, public.current_app_user_id(), 'manage_members')
  AND role <> 'owner'
);

GRANT SELECT, INSERT, UPDATE ON public.professional_workspaces TO genevieve_budget_worker;
GRANT SELECT, INSERT, UPDATE ON public.professional_memberships TO genevieve_budget_worker;
REVOKE DELETE ON public.professional_workspaces FROM genevieve_budget_worker;
REVOKE DELETE ON public.professional_memberships FROM genevieve_budget_worker;

CREATE OR REPLACE FUNCTION public.ensure_professional_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.professional_memberships (workspace_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_user_id, 'owner', 'active')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_professional_owner_membership() FROM PUBLIC;

CREATE TRIGGER professional_workspace_create_owner_membership
AFTER INSERT ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.ensure_professional_owner_membership();

CREATE OR REPLACE FUNCTION public.audit_professional_workspace_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb;
  actor text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  actor := current_setting('app.actor_type', true);
  IF actor IS NULL OR actor NOT IN ('user', 'system', 'support') THEN actor := 'system'; END IF;

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    NULLIF(row_data ->> 'owner_user_id', '')::uuid,
    actor,
    'professional_workspace_change',
    'professional_workspaces',
    NULLIF(row_data ->> 'id', '')::uuid,
    lower(TG_OP),
    jsonb_build_object(
      'name', row_data -> 'name',
      'status', row_data -> 'status',
      'archived_at', row_data -> 'archived_at'
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER professional_workspaces_audit_change
AFTER INSERT OR UPDATE OR DELETE ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.audit_professional_workspace_change();

CREATE OR REPLACE FUNCTION public.audit_professional_membership_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb;
  actor text;
  workspace_owner uuid;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  actor := current_setting('app.actor_type', true);
  IF actor IS NULL OR actor NOT IN ('user', 'system', 'support') THEN actor := 'system'; END IF;

  SELECT owner_user_id INTO workspace_owner
  FROM public.professional_workspaces
  WHERE id = NULLIF(row_data ->> 'workspace_id', '')::uuid;

  INSERT INTO public.audit_events (
    user_id, actor_type, event_type, entity_type, entity_id, action, metadata
  ) VALUES (
    workspace_owner,
    actor,
    'professional_membership_change',
    'professional_memberships',
    NULLIF(row_data ->> 'id', '')::uuid,
    lower(TG_OP),
    jsonb_build_object(
      'workspace_id', row_data -> 'workspace_id',
      'member_user_id', row_data -> 'user_id',
      'role', row_data -> 'role',
      'status', row_data -> 'status'
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER professional_memberships_audit_change
AFTER INSERT OR UPDATE OR DELETE ON public.professional_memberships
FOR EACH ROW EXECUTE FUNCTION public.audit_professional_membership_change();

INSERT INTO public.schema_migrations (version, description)
VALUES ('010', 'Phase 6 Professional role and permission authority')
ON CONFLICT (version) DO NOTHING;

COMMIT;