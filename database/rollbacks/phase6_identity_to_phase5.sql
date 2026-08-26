BEGIN;

DELETE FROM public.schema_migrations WHERE version = '008';

DROP TRIGGER IF EXISTS neon_auth_user_sync_application_identity ON neon_auth."user";
DROP FUNCTION IF EXISTS public.sync_neon_auth_user();

DROP TRIGGER IF EXISTS user_entitlements_audit_owned_change ON public.user_entitlements;
DROP TRIGGER IF EXISTS user_entitlements_set_updated_at ON public.user_entitlements;
DROP TABLE IF EXISTS public.user_entitlements;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_auth_provider_check,
  DROP CONSTRAINT IF EXISTS users_deleted_at_check,
  DROP COLUMN IF EXISTS auth_provider,
  DROP COLUMN IF EXISTS deleted_at;

COMMIT;
