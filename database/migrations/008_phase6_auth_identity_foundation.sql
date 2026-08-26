BEGIN;

-- Phase 6 / 008 — bridge managed Neon Auth identity into the sealed Phase 5 application-user model.

ALTER TABLE public.users
  ADD COLUMN auth_provider text NOT NULL DEFAULT 'neon_auth',
  ADD COLUMN deleted_at timestamptz;

ALTER TABLE public.users
  ADD CONSTRAINT users_auth_provider_check CHECK (auth_provider = 'neon_auth'),
  ADD CONSTRAINT users_deleted_at_check CHECK (
    (status = 'deleted' AND deleted_at IS NOT NULL)
    OR (status <> 'deleted' AND deleted_at IS NULL)
  );

CREATE TABLE public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  product_mode text NOT NULL DEFAULT 'personal'
    CHECK (product_mode IN ('personal', 'professional')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_entitlements_set_updated_at
BEFORE UPDATE ON public.user_entitlements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_neon_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, neon_auth, pg_temp
AS $$
DECLARE
  next_status text;
BEGIN
  next_status := CASE WHEN COALESCE(NEW.banned, false) THEN 'disabled' ELSE 'active' END;

  INSERT INTO public.users (id, email, status, auth_provider)
  VALUES (NEW.id, NEW.email, next_status, 'neon_auth')
  ON CONFLICT (id) DO UPDATE
  SET
    email = CASE WHEN public.users.status = 'deleted' THEN public.users.email ELSE EXCLUDED.email END,
    status = CASE WHEN public.users.status = 'deleted' THEN 'deleted' ELSE EXCLUDED.status END,
    deleted_at = CASE WHEN public.users.status = 'deleted' THEN public.users.deleted_at ELSE NULL END,
    auth_provider = 'neon_auth';

  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NULLIF(btrim(NEW.name), ''))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.financial_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_entitlements (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_neon_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS neon_auth_user_sync_application_identity ON neon_auth."user";
CREATE TRIGGER neon_auth_user_sync_application_identity
AFTER INSERT OR UPDATE OF email, name, banned ON neon_auth."user"
FOR EACH ROW EXECUTE FUNCTION public.sync_neon_auth_user();

DO $$
DECLARE
  auth_user neon_auth."user"%ROWTYPE;
BEGIN
  FOR auth_user IN SELECT * FROM neon_auth."user"
  LOOP
    INSERT INTO public.users (id, email, status, auth_provider)
    VALUES (
      auth_user.id,
      auth_user.email,
      CASE WHEN COALESCE(auth_user.banned, false) THEN 'disabled' ELSE 'active' END,
      'neon_auth'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = CASE WHEN public.users.status = 'deleted' THEN public.users.email ELSE EXCLUDED.email END,
      status = CASE WHEN public.users.status = 'deleted' THEN 'deleted' ELSE EXCLUDED.status END,
      deleted_at = CASE WHEN public.users.status = 'deleted' THEN public.users.deleted_at ELSE NULL END,
      auth_provider = 'neon_auth';

    INSERT INTO public.profiles (user_id, display_name)
    VALUES (auth_user.id, NULLIF(btrim(auth_user.name), ''))
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.financial_settings (user_id)
    VALUES (auth_user.id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_entitlements (user_id)
    VALUES (auth_user.id)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('008', 'Phase 6 Neon Auth identity bridge and Personal Professional entitlement foundation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
