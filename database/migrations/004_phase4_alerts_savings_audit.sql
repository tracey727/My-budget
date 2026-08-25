BEGIN;

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('bill', 'savings_goal', 'debt', 'subscription', 'account', 'transaction', 'income', 'general')),
  source_id uuid,
  alert_status text NOT NULL CHECK (alert_status IN ('green', 'yellow', 'red', 'recovery')),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  message text NOT NULL DEFAULT '',
  due_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.verified_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  baseline_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (baseline_amount >= 0),
  proposed_action text NOT NULL CHECK (length(trim(proposed_action)) > 0),
  action_completed_at timestamptz,
  evidence text NOT NULL DEFAULT '',
  result_amount numeric(14,2) CHECK (result_amount IS NULL OR result_amount >= 0),
  verified_saving_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (verified_saving_amount >= 0),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'actioned', 'verified', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verified_savings_verified_at_check CHECK (status <> 'verified' OR verified_at IS NOT NULL)
);

CREATE TABLE public.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('user', 'system', 'support')),
  event_type text NOT NULL CHECK (length(trim(event_type)) > 0),
  entity_type text,
  entity_id uuid,
  action text NOT NULL CHECK (length(trim(action)) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();

CREATE INDEX alerts_user_unresolved_idx ON public.alerts(user_id, created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX alerts_source_idx ON public.alerts(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX verified_savings_user_status_idx ON public.verified_savings(user_id, status, created_at DESC);
CREATE INDEX audit_events_user_time_idx ON public.audit_events(user_id, occurred_at DESC);
CREATE INDEX audit_events_entity_idx ON public.audit_events(entity_type, entity_id, occurred_at DESC) WHERE entity_id IS NOT NULL;

CREATE TRIGGER verified_savings_set_updated_at
BEFORE UPDATE ON public.verified_savings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.schema_migrations (version, description)
VALUES ('004', 'Phase 4 alerts verified savings and append-only audit events')
ON CONFLICT (version) DO NOTHING;

COMMIT;
