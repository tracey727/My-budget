BEGIN;

DELETE FROM public.schema_migrations WHERE version = '010';

DROP TRIGGER IF EXISTS professional_memberships_audit_change ON public.professional_memberships;
DROP FUNCTION IF EXISTS public.audit_professional_membership_change();
DROP TRIGGER IF EXISTS professional_workspaces_audit_change ON public.professional_workspaces;
DROP FUNCTION IF EXISTS public.audit_professional_workspace_change();
DROP TRIGGER IF EXISTS professional_workspace_create_owner_membership ON public.professional_workspaces;
DROP FUNCTION IF EXISTS public.ensure_professional_owner_membership();

DROP POLICY IF EXISTS professional_memberships_select_member ON public.professional_memberships;
DROP POLICY IF EXISTS professional_memberships_insert_admin ON public.professional_memberships;
DROP POLICY IF EXISTS professional_memberships_update_admin ON public.professional_memberships;
DROP POLICY IF EXISTS professional_workspaces_select_member ON public.professional_workspaces;
DROP POLICY IF EXISTS professional_workspaces_insert_owner ON public.professional_workspaces;
DROP POLICY IF EXISTS professional_workspaces_update_owner ON public.professional_workspaces;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.professional_memberships FROM genevieve_budget_worker;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.professional_workspaces FROM genevieve_budget_worker;

DROP FUNCTION IF EXISTS public.professional_role_can(uuid, uuid, text);
DROP TABLE IF EXISTS public.professional_memberships;
DROP TABLE IF EXISTS public.professional_workspaces;

COMMIT;