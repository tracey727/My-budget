BEGIN;

-- Phase 7 / 015 — preserve original account basis while supporting safe,
-- revisioned current-balance and protected-reserve recovery snapshots.

ALTER TABLE public.accounts
  ADD COLUMN phase7_client_id text,
  ADD COLUMN current_balance_snapshot numeric(14,2),
  ADD COLUMN balance_snapshot_at timestamptz;

UPDATE public.accounts
SET current_balance_snapshot = opening_balance,
    balance_snapshot_at = COALESCE(updated_at, created_at, now())
WHERE current_balance_snapshot IS NULL;

ALTER TABLE public.accounts
  ALTER COLUMN current_balance_snapshot SET NOT NULL,
  ALTER COLUMN balance_snapshot_at SET NOT NULL,
  ADD CONSTRAINT accounts_phase7_client_id_check CHECK (
    phase7_client_id IS NULL OR length(btrim(phase7_client_id)) BETWEEN 1 AND 200
  ),
  ADD CONSTRAINT accounts_balance_snapshot_time_check CHECK (
    balance_snapshot_at >= created_at
  );

CREATE UNIQUE INDEX accounts_user_phase7_client_active_unique
  ON public.accounts (user_id, phase7_client_id)
  WHERE phase7_client_id IS NOT NULL AND archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.prevent_account_opening_balance_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.opening_balance IS DISTINCT FROM OLD.opening_balance THEN
    RAISE EXCEPTION 'account opening balance is immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_account_opening_balance_change() FROM PUBLIC;

CREATE TRIGGER accounts_preserve_opening_balance
BEFORE UPDATE OF opening_balance ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.prevent_account_opening_balance_change();

ALTER TABLE public.financial_settings
  ADD COLUMN phase7_sync_revision bigint NOT NULL DEFAULT 0,
  ADD COLUMN phase7_bill_reserved_snapshot numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN phase7_protected_savings_snapshot numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN phase7_protection_snapshot_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN phase7_protection_snapshot_at timestamptz,
  ADD CONSTRAINT financial_settings_phase7_sync_revision_check CHECK (phase7_sync_revision >= 0),
  ADD CONSTRAINT financial_settings_phase7_bill_reserved_check CHECK (phase7_bill_reserved_snapshot >= 0),
  ADD CONSTRAINT financial_settings_phase7_protected_savings_check CHECK (phase7_protected_savings_snapshot >= 0),
  ADD CONSTRAINT financial_settings_phase7_protection_time_check CHECK (
    phase7_protection_snapshot_at IS NULL OR phase7_protection_snapshot_at >= created_at
  ),
  ADD CONSTRAINT financial_settings_phase7_protection_complete_check CHECK (
    (phase7_protection_snapshot_complete AND phase7_protection_snapshot_at IS NOT NULL)
    OR (NOT phase7_protection_snapshot_complete)
  );

INSERT INTO public.schema_migrations (version, description)
VALUES ('015', 'Phase 7 account balance persistence and recovery safety')
ON CONFLICT (version) DO NOTHING;

COMMIT;
