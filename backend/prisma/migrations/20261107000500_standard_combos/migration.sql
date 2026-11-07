-- Nâng mẫu mặc định một lần; giữ mọi giá/trạng thái/nội dung Admin đã tùy chỉnh.
UPDATE combos SET name='Single / Solo Combo', description='1 bắp nhỏ + 1 nước', items_summary='1 bắp nhỏ + 1 nước', taste_tag='CARAMEL', updated_at=NOW()
WHERE id='1f5296e1-2c81-4354-9d39-d0bdf8700001' AND name='Solo Sweet Combo' AND price=49000 AND items_summary='1 bắp ngọt + 1 nước' AND taste_tag='NGỌT' AND suggested_min_seats=1 AND suggested_max_seats=1;
UPDATE combos SET name='Couple Combo', description='1 bắp lớn + 2 nước', items_summary='1 bắp lớn + 2 nước', updated_at=NOW()
WHERE id='1f5296e1-2c81-4354-9d39-d0bdf8700002' AND name='Couple Phô Mai Combo' AND price=89000 AND items_summary='1 bắp phô mai + 2 nước' AND taste_tag='PHÔ_MAI' AND suggested_min_seats=2 AND suggested_max_seats=2;
UPDATE combos SET name='Party Combo 69K', description='2 bắp lớn + 4 nước + snack đi kèm', items_summary='2 bắp lớn + 4 nước + snack đi kèm', suggested_max_seats=20, updated_at=NOW()
WHERE id='1f5296e1-2c81-4354-9d39-d0bdf8700003' AND name='Party Combo 69K Siêu Tiết Kiệm' AND price=69000 AND items_summary='1 bắp mix + 2 nước' AND taste_tag='MIX' AND suggested_min_seats=3 AND suggested_max_seats IS NULL;
UPDATE combos SET name='Party Combo 69K (Classic)', updated_at=NOW()
WHERE id='9e904eab-6afe-4b3a-9e3c-76c3469e03a8' AND name='Party Combo 69K' AND price=69000 AND items_summary='' AND description='Một bắp và hai nước — giá minh họa đồ án.';
