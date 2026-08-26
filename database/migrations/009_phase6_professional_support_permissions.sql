BEGIN;

-- Phase 6 / 009 — professional roles and trusted-support authority.
-- This is identity/permission infrastructure only; project, invoice and forecast tables remain deferred.

CREATE TABLE public.professional_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT professional_workspaces_archive_check CHECK (
    (status = 'active' AND archived_at IS NULL)
    OR (status = 'archived' AND archived_at IS NOT NULL)
  )
);

CREATE TABLE public.professional_role_permissions (
  role text PRIMARY KEY CHECK (role IN (
    'owner',
    'administrator',
    'manager',
    'accountant_bookkeeper',
    'project_manager',
    'read_only'
  )),
  can_read_financial boolean NOT NULL,
  can_write_financial boolean NOT NULL,
  can_export boolean NOT NULL,
  can_manage_members boolean NOT NULL,
  can_manage_settings boolean NOT NULL,
  can_manage_projects boolean NOT NULL,
  can_transfer_ownership boolean NOT NULL
);

INSERT INTO public.professional_role_permissions (
  role,
  can_read_financial,
  can_write_financial,
  can_export,
  can_manage_members,
  can_manage_settings,
  can_manage_projects,
  can_transfer_ownership
) VALUES
  ('owner', true, true, true, true, true, true, true),
  ('administrator', true, true, true, true, true, true, false),
  ('manager', true, true, true, false, false, true, false),
  ('accountant_bookkeeper', true, true, true, false, false, false, false),
  ('project_manager', true, false, false, false, false, true, false),
  ('read_only', true, false, false, false, false, false, false);

CREATE TABLE public.professional_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.professional_workspaces(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  role text NOT NULL REFERENCES public.professional_role_permissions(role) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'revoked')),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT professional_memberships_revoked_check CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked' AND revoked_at IS NULL)
  ),
  CONSTRAINT professional_memberships_workspace_user_unique UNIQUE (workspace_id, user_id)
);

CREATE UNIQUE INDEX professional_memberships_active_owner_unique
  ON public.professional_memberships(workspace_id)
  WHERE role = 'owner' AND status = 'active';

CREATE INDEX professional_memberships_user_active_idx
  ON public.professional_memberships(user_id, workspace_id)
  WHERE status = 'active';

CREATE TABLE public.trusted_support_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  support_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  can_read boolean NOT NULL DEFAULT true,
  can_export boolean NOT NULL DEFAULT false,
  can_financial_action boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trusted_support_different_users_check CHECK (owner_user_id <> support_user_id),
  CONSTRAINT trusted_support_authority_check CHECK (
    can_read OR (NOT can_export AND NOT can_financial_action)
  ),
  CONSTRAINT trusted_support_expiry_check CHECK (
    expires_at IS NULL OR expires_at > created_at
  )
);

CREATE UNIQUE INDEX trusted_support_active_unique
  ON public.trusted_support_grants(owner_user_id, support_user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX trusted_support_support_active_idx
  ON public.trusted_support_grants(support_user_id, owner_user_id)
  WHERE revoked_at IS NULL;

CREATE TRIGGER professional_workspaces_set_updated_at
BEFORE UPDATE ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER professional_memberships_set_updated_at
BEFORE UPDATE ON public.professional_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trusted_support_grants_set_updated_at
BEFORE UPDATE ON public.trusted_support_grants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_professional_workspace_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.professional_memberships (workspace_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_user_id, 'owner', 'active')
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'owner', status = 'active', revoked_at = NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_professional_workspace_owner() FROM PUBLIC;

CREATE TRIGGER professional_workspaces_ensure_owner
AFTER INSERT ON public.professional_workspaces
FOR EACH ROW EXECUTE FUNCTION public.ensure_professional_workspace_owner();

INSERT INTO public.schema_migrations (version, description)
VALUES ('009', 'Phase 6 professional roles memberships and trusted support authority')
ON CONFLICT (version) DO NOTHING;

COMMIT;
