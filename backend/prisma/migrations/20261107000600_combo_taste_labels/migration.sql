-- Chấp nhận nhãn khẩu vị mới, đồng thời giữ các mã enum cũ cho client hiện hữu.
ALTER TABLE combos DROP CONSTRAINT combo_taste_valid;
ALTER TABLE combos ADD CONSTRAINT combo_taste_valid CHECK (taste_tag IN ('NGỌT','MẶN','PHÔ_MAI','CARAMEL','MIX','Ngọt Caramel','Phô Mai Hoàng Kim','Mix 2 Vị (Ngọt & Phô Mai)'));
UPDATE combos SET taste_tag='Ngọt Caramel', updated_at=NOW() WHERE id='1f5296e1-2c81-4354-9d39-d0bdf8700001' AND name='Single / Solo Combo' AND price=49000 AND taste_tag='CARAMEL' AND items_summary='1 bắp nhỏ + 1 nước';
UPDATE combos SET taste_tag='Phô Mai Hoàng Kim', updated_at=NOW() WHERE id='1f5296e1-2c81-4354-9d39-d0bdf8700002' AND name='Couple Combo' AND price=89000 AND taste_tag='PHÔ_MAI' AND items_summary='1 bắp lớn + 2 nước';
UPDATE combos SET taste_tag='Mix 2 Vị (Ngọt & Phô Mai)', updated_at=NOW() WHERE id='1f5296e1-2c81-4354-9d39-d0bdf8700003' AND name='Party Combo 69K' AND price=69000 AND taste_tag='MIX' AND items_summary='2 bắp lớn + 4 nước + snack đi kèm';
