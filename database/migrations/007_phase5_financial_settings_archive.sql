BEGIN;

-- Complete the Phase 5 soft-archive contract for the user-owned financial settings record.
ALTER TABLE public.financial_settings
  ADD COLUMN archived_at timestamptz;

ALTER TABLE public.financial_settings
  ADD CONSTRAINT financial_settings_archived_at_check
  CHECK (archived_at IS NULL OR archived_at >= created_at);

INSERT INTO public.schema_migrations (version, description)
VALUES ('007', 'Phase 5 financial settings soft archive completion')
ON CONFLICT (version) DO NOTHING;

COMMIT;
