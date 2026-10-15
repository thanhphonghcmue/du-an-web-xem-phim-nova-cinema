BEGIN;

-- Nullable for legacy bookings: never invent historical tier/rate/base prices.
ALTER TABLE bookings
  ADD COLUMN base_ticket_price NUMERIC(14,2),
  ADD COLUMN membership_tier "CMemberTier",
  ADD COLUMN discount_rate NUMERIC(4,3),
  ADD COLUMN idempotency_key UUID,
  ADD COLUMN request_hash VARCHAR(64);

CREATE UNIQUE INDEX bookings_user_id_idempotency_key_key ON bookings(user_id, idempotency_key);

ALTER TABLE bookings ADD CONSTRAINT bookings_snapshot_complete CHECK (
  (base_ticket_price IS NULL AND membership_tier IS NULL AND discount_rate IS NULL)
  OR (base_ticket_price IS NOT NULL AND base_ticket_price > 0
      AND membership_tier IS NOT NULL AND discount_rate IS NOT NULL
      AND ((membership_tier = 'SILVER' AND discount_rate = 0.050)
        OR (membership_tier = 'GOLD' AND discount_rate = 0.070)
        OR (membership_tier = 'DIAMOND' AND discount_rate = 0.100)))
);
ALTER TABLE bookings ADD CONSTRAINT bookings_idempotency_complete CHECK (
  (idempotency_key IS NULL AND request_hash IS NULL)
  OR (idempotency_key IS NOT NULL AND request_hash IS NOT NULL
      AND request_hash ~ '^[0-9a-f]{64}$')
);

-- Keep Phase 1 FK, GiST exclusion, partial active-seat uniqueness and all checks intact.
COMMIT;
