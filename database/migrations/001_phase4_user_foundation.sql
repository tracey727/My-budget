BEGIN;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_unique
  ON public.users (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text,
  currency_code text NOT NULL DEFAULT 'AUD' CHECK (currency_code ~ '^[A-Z]{3}$'),
  locale text NOT NULL DEFAULT 'en-AU',
  timezone text NOT NULL DEFAULT 'Australia/Brisbane',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.financial_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  income_cycle text NOT NULL DEFAULT 'fortnightly' CHECK (income_cycle IN ('weekly', 'fortnightly', 'monthly', 'irregular')),
  budgeting_method text NOT NULL DEFAULT 'mixed' CHECK (budgeting_method IN ('smooth', 'target', 'mixed')),
  emergency_buffer_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (emergency_buffer_amount >= 0),
  currency_code text NOT NULL DEFAULT 'AUD' CHECK (currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  transaction_scope text NOT NULL DEFAULT 'expense' CHECK (transaction_scope IN ('expense', 'income', 'both')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transaction_categories_user_id_idx ON public.transaction_categories(user_id);
CREATE INDEX transaction_categories_scope_idx ON public.transaction_categories(transaction_scope) WHERE active;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER financial_settings_set_updated_at
BEFORE UPDATE ON public.financial_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER transaction_categories_set_updated_at
BEFORE UPDATE ON public.transaction_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.schema_migrations (version, description)
VALUES ('001', 'Phase 4 users profiles financial settings and transaction categories')
ON CONFLICT (version) DO NOTHING;

COMMIT;
