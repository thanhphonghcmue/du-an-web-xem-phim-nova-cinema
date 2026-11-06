ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TABLE bookings ADD COLUMN failure_reason TEXT;
ALTER TABLE combos ADD COLUMN taste_tag TEXT NOT NULL DEFAULT 'MIX', ADD COLUMN items_summary TEXT NOT NULL DEFAULT '', ADD COLUMN suggested_min_seats INTEGER NOT NULL DEFAULT 1, ADD COLUMN suggested_max_seats INTEGER, ADD COLUMN badge_label TEXT NOT NULL DEFAULT 'PARTY';
ALTER TABLE combos ADD CONSTRAINT combo_recommendation_range CHECK (suggested_min_seats >= 1 AND (suggested_max_seats IS NULL OR suggested_max_seats >= suggested_min_seats)), ADD CONSTRAINT combo_taste_valid CHECK (taste_tag IN ('NGỌT','MẶN','PHÔ_MAI','CARAMEL','MIX')), ADD CONSTRAINT combo_badge_valid CHECK (badge_label IN ('SOLO','COUPLE','PARTY'));
INSERT INTO combos (id,name,description,price,taste_tag,items_summary,suggested_min_seats,suggested_max_seats,badge_label,updated_at) VALUES
('1f5296e1-2c81-4354-9d39-d0bdf8700001','Solo Sweet Combo','Bắp ngọt và nước cho một người',49000,'NGỌT','1 bắp ngọt + 1 nước',1,1,'SOLO',NOW()),
('1f5296e1-2c81-4354-9d39-d0bdf8700002','Couple Phô Mai Combo','Combo phô mai cho cặp đôi',89000,'PHÔ_MAI','1 bắp phô mai + 2 nước',2,2,'COUPLE',NOW()),
('1f5296e1-2c81-4354-9d39-d0bdf8700003','Party Combo 69K Siêu Tiết Kiệm','Bắp mix cho nhóm bạn',69000,'MIX','1 bắp mix + 2 nước',3,NULL,'PARTY',NOW()),
('1f5296e1-2c81-4354-9d39-d0bdf8700004','Mega Party All-In Combo','Combo caramel cho nhóm đông',149000,'CARAMEL','2 bắp caramel + 4 nước',4,NULL,'PARTY',NOW()) ON CONFLICT(id) DO NOTHING;
