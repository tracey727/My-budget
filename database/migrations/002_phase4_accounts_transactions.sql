BEGIN;

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  account_type text NOT NULL CHECK (account_type IN ('bank', 'savings', 'cash', 'credit', 'loan', 'bnpl', 'investment', 'other')),
  currency_code text NOT NULL DEFAULT 'AUD' CHECK (currency_code ~ '^[A-Z]{3}$'),
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX accounts_user_id_idx ON public.accounts(user_id);
CREATE INDEX accounts_user_active_idx ON public.accounts(user_id, account_type) WHERE NOT archived;

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  to_account_id uuid REFERENCES public.accounts(id) ON DELETE RESTRICT,
  transaction_date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  merchant_payee text NOT NULL CHECK (length(trim(merchant_payee)) > 0),
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  category_id uuid REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  worth_classification text CHECK (worth_classification IN ('essential', 'worth', 'unsure', 'waste')),
  user_response text CHECK (user_response IN ('yes', 'no', 'maybe')),
  recurring_status text NOT NULL DEFAULT 'none' CHECK (recurring_status IN ('none', 'recurring', 'possible_recurring')),
  notes text NOT NULL DEFAULT '',
  professional_project_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_transfer_destination_check CHECK (
    (transaction_type = 'transfer' AND to_account_id IS NOT NULL AND to_account_id <> account_id)
    OR (transaction_type <> 'transfer' AND to_account_id IS NULL)
  )
);

CREATE INDEX transactions_user_date_idx ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX transactions_account_date_idx ON public.transactions(account_id, transaction_date DESC);
CREATE INDEX transactions_to_account_date_idx ON public.transactions(to_account_id, transaction_date DESC) WHERE to_account_id IS NOT NULL;
CREATE INDEX transactions_category_idx ON public.transactions(category_id) WHERE category_id IS NOT NULL;

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER transactions_set_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.schema_migrations (version, description)
VALUES ('002', 'Phase 4 accounts and transactions')
ON CONFLICT (version) DO NOTHING;

COMMIT;
