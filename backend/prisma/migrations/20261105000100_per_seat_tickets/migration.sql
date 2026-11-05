BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Các vé cũ giữ QR/định danh và trạng thái check-in; chỉ vé phát hành mới gắn một ghế.
CREATE FUNCTION nova_short_ticket_code() RETURNS varchar(8) LANGUAGE plpgsql VOLATILE AS $$
DECLARE bytes bytea := gen_random_bytes(8); alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text := ''; i integer;
BEGIN
 FOR i IN 0..7 LOOP code := code || substr(alphabet, (get_byte(bytes,i) & 31)+1,1); END LOOP;
 RETURN code;
END $$;
ALTER TABLE e_tickets ADD COLUMN booking_seat_id uuid, ADD COLUMN ticket_code varchar(8);
CREATE UNIQUE INDEX e_tickets_ticket_code_key ON e_tickets(ticket_code);
DO $$ DECLARE row_id uuid; BEGIN
 FOR row_id IN SELECT id FROM e_tickets LOOP
  LOOP
   BEGIN UPDATE e_tickets SET ticket_code=nova_short_ticket_code() WHERE id=row_id; EXIT;
   EXCEPTION WHEN unique_violation THEN NULL; END;
  END LOOP;
 END LOOP;
END $$;
ALTER TABLE e_tickets ALTER COLUMN ticket_code SET NOT NULL, ALTER COLUMN ticket_code SET DEFAULT nova_short_ticket_code();
DROP INDEX e_tickets_booking_id_key;
CREATE UNIQUE INDEX e_tickets_booking_seat_id_key ON e_tickets(booking_seat_id);
CREATE UNIQUE INDEX booking_seats_booking_id_id_key ON booking_seats(booking_id,id);
ALTER TABLE e_tickets ADD CONSTRAINT e_tickets_booking_id_booking_seat_id_fkey FOREIGN KEY(booking_id,booking_seat_id) REFERENCES booking_seats(booking_id,id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE UNIQUE INDEX e_tickets_legacy_booking_key ON e_tickets(booking_id) WHERE booking_seat_id IS NULL;
CREATE INDEX e_tickets_booking_id_idx ON e_tickets(booking_id);
COMMIT;
