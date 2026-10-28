-- Abort on existing duplicate titles; never rename or delete catalogue data.
CREATE UNIQUE INDEX movies_title_normalized_key ON movies
  (lower(regexp_replace(normalize(btrim(title), NFC), '\s+', ' ', 'g')));

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action VARCHAR(16) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type VARCHAR(32) NOT NULL,
  entity_id UUID NOT NULL,
  summary VARCHAR(300) NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_at_id_idx ON audit_logs(created_at, id);
CREATE INDEX audit_logs_entity_type_entity_id_created_at_idx ON audit_logs(entity_type, entity_id, created_at);
CREATE INDEX audit_logs_actor_id_created_at_idx ON audit_logs(actor_id, created_at);
