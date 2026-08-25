BEGIN;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('000', 'Phase 4 migration ledger and updated_at trigger helper')
ON CONFLICT (version) DO NOTHING;

COMMIT;
