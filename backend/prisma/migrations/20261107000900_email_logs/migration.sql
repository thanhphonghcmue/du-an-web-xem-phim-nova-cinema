CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE,
  ticket_id UUID NOT NULL REFERENCES e_tickets(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  booking_id UUID NOT NULL,
  recipient VARCHAR(254) NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  accepted_at TIMESTAMPTZ(3),
  last_error_code VARCHAR(64),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT email_log_status_valid CHECK (delivery_status IN ('QUEUED','RETRYING','SMTP_ACCEPTED'))
);
CREATE INDEX email_logs_booking_id_created_at_idx ON email_logs(booking_id, created_at);
CREATE INDEX email_logs_ticket_id_idx ON email_logs(ticket_id);
