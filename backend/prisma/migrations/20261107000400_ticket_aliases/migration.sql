-- Giữ mã 8 ký tự/QR cũ; bổ sung alias chính xác, không LIKE hậu tố gây nhận nhầm vé.
ALTER TABLE e_tickets ALTER COLUMN ticket_code TYPE varchar(96);
ALTER TABLE e_tickets ADD COLUMN short_code varchar(32), ADD COLUMN aliases text[] NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX e_tickets_short_code_key ON e_tickets(short_code);
CREATE INDEX e_tickets_aliases_idx ON e_tickets USING GIN(aliases);
ALTER TABLE e_tickets ADD COLUMN qr_payload text, ADD COLUMN hmac_signature varchar(64), ADD COLUMN demo_only boolean NOT NULL DEFAULT false;
