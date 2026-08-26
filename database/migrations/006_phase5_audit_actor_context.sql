BEGIN;

-- Phase 5 test correction: a missing application actor context must fail safe to `system`
-- rather than producing a NULL audit actor.
CREATE OR REPLACE FUNCTION public.audit_owned_record_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb;
  owner_id uuid;
  entity_uuid uuid;
  actor text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  IF TG_TABLE_NAME = 'users' THEN
    owner_id := NULLIF(row_data ->> 'id', '')::uuid;
  ELSE
    owner_id := NULLIF(row_data ->> 'user_id', '')::uuid;
  END IF;

  entity_uuid := COALESCE(NULLIF(row_data ->> 'id', '')::uuid, owner_id);
  actor := current_setting('app.actor_type', true);
  IF actor IS NULL OR actor NOT IN ('user', 'system', 'support') THEN
    actor := 'system';
  END IF;

  INSERT INTO public.audit_events (
    user_id,
    actor_type,
    event_type,
    entity_type,
    entity_id,
    action,
    metadata
  ) VALUES (
    owner_id,
    actor,
    'owned_record_change',
    TG_TABLE_NAME,
    entity_uuid,
    lower(TG_OP),
    jsonb_build_object('archived_at', row_data -> 'archived_at')
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

INSERT INTO public.schema_migrations (version, description)
VALUES ('006', 'Phase 5 audit actor context fail-safe correction')
ON CONFLICT (version) DO NOTHING;

COMMIT;
