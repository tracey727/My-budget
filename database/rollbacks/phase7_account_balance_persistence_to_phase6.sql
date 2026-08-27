BEGIN;

DELETE FROM public.schema_migrations WHERE version = '015';

DROP TRIGGER IF EXISTS accounts_preserve_opening_balance ON public.accounts;
DROP FUNCTION IF EXISTS public.prevent_account_opening_balance_change();

DROP INDEX IF EXISTS public.accounts_user_phase7_client_active_unique;

ALTER TABLE public.financial_settings
  DROP CONSTRAINT IF EXISTS financial_settings_phase7_protection_complete_check,
  DROP CONSTRAINT IF EXISTS financial_settings_phase7_protection_time_check,
  DROP CONSTRAINT IF EXISTS financial_settings_phase7_protected_savings_check,
  DROP CONSTRAINT IF EXISTS financial_settings_phase7_bill_reserved_check,
  DROP CONSTRAINT IF EXISTS financial_settings_phase7_sync_revision_check,
  DROP COLUMN IF EXISTS phase7_protection_snapshot_at,
  DROP COLUMN IF EXISTS phase7_protection_snapshot_complete,
  DROP COLUMN IF EXISTS phase7_protected_savings_snapshot,
  DROP COLUMN IF EXISTS phase7_bill_reserved_snapshot,
  DROP COLUMN IF EXISTS phase7_sync_revision;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_balance_snapshot_time_check,
  DROP CONSTRAINT IF EXISTS accounts_phase7_client_id_check,
  DROP COLUMN IF EXISTS balance_snapshot_at,
  DROP COLUMN IF EXISTS current_balance_snapshot,
  DROP COLUMN IF EXISTS phase7_client_id;

COMMIT;
