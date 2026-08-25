BEGIN;

CREATE TABLE public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'irregular', 'one_off')),
  next_income_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  bill_name text NOT NULL CHECK (length(trim(bill_name)) > 0),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'one_off')),
  next_due_date date,
  essential_status text NOT NULL DEFAULT 'unsure' CHECK (essential_status IN ('essential', 'nonessential', 'unsure')),
  budgeting_method text NOT NULL DEFAULT 'target' CHECK (budgeting_method IN ('smooth', 'target')),
  target_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (target_amount >= 0),
  alert_status text NOT NULL DEFAULT 'green' CHECK (alert_status IN ('green', 'yellow', 'red', 'recovery')),
  paid_status text NOT NULL DEFAULT 'unpaid' CHECK (paid_status IN ('paid', 'unpaid')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bill_provisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL UNIQUE REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_reserved numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_reserved >= 0),
  required_contribution numeric(14,2) NOT NULL DEFAULT 0 CHECK (required_contribution >= 0),
  contribution_frequency text NOT NULL DEFAULT 'fortnightly' CHECK (contribution_frequency IN ('weekly', 'fortnightly', 'monthly')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  subscription text NOT NULL CHECK (length(trim(subscription)) > 0),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'yearly')),
  next_charge date,
  auto_renew boolean NOT NULL DEFAULT false,
  usage text NOT NULL DEFAULT '',
  annual_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (annual_cost >= 0),
  decision text NOT NULL DEFAULT 'maybe' CHECK (decision IN ('keep', 'cancel', 'maybe', 'another_month', 'pause', 'review_next_charge')),
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('active', 'unknown', 'cancelled')),
  worth_classification text NOT NULL DEFAULT 'unsure' CHECK (worth_classification IN ('essential', 'worth', 'unsure', 'waste')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal text NOT NULL CHECK (length(trim(goal)) > 0),
  target numeric(14,2) NOT NULL CHECK (target > 0),
  current_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline date,
  required_weekly_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (required_weekly_amount >= 0),
  required_fortnightly_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (required_fortnightly_amount >= 0),
  progress numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  protected boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  debt_name text NOT NULL CHECK (length(trim(debt_name)) > 0),
  debt_type text NOT NULL CHECK (debt_type IN ('credit_card', 'loan', 'bnpl', 'other')),
  balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  interest_rate_apr numeric(7,4) CHECK (interest_rate_apr IS NULL OR interest_rate_apr >= 0),
  minimum_payment numeric(14,2) NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
  payment_frequency text NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('weekly', 'fortnightly', 'monthly', 'irregular')),
  next_payment_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX incomes_user_next_idx ON public.incomes(user_id, next_income_date) WHERE active;
CREATE INDEX bills_user_due_idx ON public.bills(user_id, next_due_date) WHERE active;
CREATE INDEX bills_account_idx ON public.bills(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX bill_provisions_user_idx ON public.bill_provisions(user_id);
CREATE INDEX subscriptions_user_next_idx ON public.subscriptions(user_id, next_charge) WHERE status <> 'cancelled';
CREATE INDEX subscriptions_account_idx ON public.subscriptions(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX savings_goals_user_deadline_idx ON public.savings_goals(user_id, deadline);
CREATE INDEX debts_user_next_idx ON public.debts(user_id, next_payment_date) WHERE active;
CREATE INDEX debts_account_idx ON public.debts(account_id) WHERE account_id IS NOT NULL;

CREATE TRIGGER incomes_set_updated_at BEFORE UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bills_set_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bill_provisions_set_updated_at BEFORE UPDATE ON public.bill_provisions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER savings_goals_set_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER debts_set_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.schema_migrations (version, description)
VALUES ('003', 'Phase 4 incomes bills provisions subscriptions savings goals and debts')
ON CONFLICT (version) DO NOTHING;

COMMIT;
