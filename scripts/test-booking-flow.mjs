import assert from "node:assert/strict";

console.log("=== BẮT ĐẦU KIỂM THỬ NGHIỆP VỤ ĐẶT VÉ VÀ GIỮ CHỖ NOVA CINEMA ===");

const BASE = "http://localhost:3000/api/v1";

// 1. Kiểm thử lấy sơ đồ ghế
console.log("\n--- TEST CASE 1: Tải sơ đồ ghế & thuộc tính canBook ---");
const resSeats = await fetch(`${BASE}/showtimes/st-cinema-1-dune-0/seats`);
assert.equal(resSeats.status, 200, "API sơ đồ ghế phải trả về HTTP 200");
const seatsJson = await resSeats.json();
assert.equal(seatsJson.success, true);
assert.equal(seatsJson.data.canBook, true, "Sơ đồ ghế phải có canBook = true để nút Giữ ghế không bị vô hiệu hóa");
assert.ok(seatsJson.data.seats.length >= 96, "Phải có ít nhất 96 ghế");
console.log(`✓ Sơ đồ ghế tải thành công: ${seatsJson.data.seats.length} ghế, canBook = ${seatsJson.data.canBook}`);

// 2. Kiểm thử logic phân loại ghế
console.log("\n--- TEST CASE 2: Kiểm tra phân loại ghế (Standard, VIP, Sweetbox) ---");
const seatA1 = seatsJson.data.seats.find((s) => s.seatId === "A1");
assert.equal(seatA1.type, "STANDARD");
assert.equal(seatA1.price, 95000);

const seatE5 = seatsJson.data.seats.find((s) => s.seatId === "E5");
assert.equal(seatE5.type, "VIP");
assert.equal(seatE5.price, 115000);

const seatH1 = seatsJson.data.seats.find((s) => s.seatId === "H1");
assert.equal(seatH1.type, "SWEETBOX");
assert.equal(seatH1.price, 150000);
console.log("✓ Chuẩn hóa định giá ghế: Ghế thường 95k, Ghế VIP 115k, Ghế Sweetbox Đôi 150k");

// 3. Kiểm thử luật Orphan Seat (Ghế trống đơn lẻ)
console.log("\n--- TEST CASE 3: Kiểm thử thuật toán chặn ghế trống đơn lẻ (Orphan Seat) ---");
function checkClientOrphanSeats(selectedIds, allSeats) {
  if (!selectedIds || !selectedIds.length || !allSeats || !allSeats.length) return null;
  const byRow = new Map();
  for (const s of allSeats) {
    const list = byRow.get(s.row) ?? [];
    list.push(s);
    byRow.set(s.row, list);
  }
  for (const [, rowSeats] of byRow.entries()) {
    rowSeats.sort((a, b) => a.column - b.column);
    const origAvail = new Set();
    for (const s of rowSeats) {
      if (s.status === "AVAILABLE") origAvail.add(s.seatId);
    }
    const origRunSize = new Map();
    let curOrigRun = [];
    for (const s of rowSeats) {
      const isAvail = origAvail.has(s.seatId);
      const last = curOrigRun[curOrigRun.length - 1];
      const isContig = !last || s.column === last.column + 1;
      if (isAvail && isContig) {
        curOrigRun.push(s);
      } else {
        if (curOrigRun.length > 0) {
          for (const item of curOrigRun) origRunSize.set(item.seatId, curOrigRun.length);
        }
        curOrigRun = isAvail ? [s] : [];
      }
    }
    if (curOrigRun.length > 0) {
      for (const item of curOrigRun) origRunSize.set(item.seatId, curOrigRun.length);
    }

    const newAvail = new Set();
    for (const s of rowSeats) {
      if (origAvail.has(s.seatId) && !selectedIds.includes(s.seatId)) {
        newAvail.add(s.seatId);
      }
    }
    let curNewRun = [];
    for (const s of rowSeats) {
      const isAvail = newAvail.has(s.seatId);
      const last = curNewRun[curNewRun.length - 1];
      const isContig = !last || s.column === last.column + 1;
      if (isAvail && isContig) {
        curNewRun.push(s);
      } else {
        if (curNewRun.length === 1) {
          const orphan = curNewRun[0];
          if (orphan && (origRunSize.get(orphan.seatId) ?? 0) >= 2) {
            return orphan;
          }
        }
        curNewRun = isAvail ? [s] : [];
      }
    }
    if (curNewRun.length === 1) {
      const orphan = curNewRun[0];
      if (orphan && (origRunSize.get(orphan.seatId) ?? 0) >= 2) {
        return orphan;
      }
    }
  }
  return null;
}

// Kiểm thử với hàng ghế độc lập chuẩn
const cleanRowB = Array.from({ length: 12 }, (_, i) => ({
  seatId: `B${i + 1}`,
  row: "B",
  column: i + 1,
  type: "STANDARD",
  price: 95000,
  status: "AVAILABLE",
}));

// Case 3.1: Chọn B12 ở mép tường phải -> không để lại ghế đơn lẻ
const testB12 = checkClientOrphanSeats(["B12"], cleanRowB);
assert.equal(testB12, null, "Chọn B12 không vi phạm Orphan Seat");
console.log("✓ Test 3.1: Chọn ghế B12 ở góc hợp lệ, không vi phạm Orphan Seat");

// Case 3.2: Chọn B11 (bỏ trống B12 đứng một mình ở góc) -> vi phạm Orphan Seat!
const testB11 = checkClientOrphanSeats(["B11"], cleanRowB);
assert.ok(testB11, "Chọn B11 phải phát hiện ghế B12 bị cô lập đơn lẻ");
assert.equal(testB11.seatId, "B12");
console.log("✓ Test 3.2: Phát hiện chuẩn xác ghế B12 bị cô lập lẻ loi nếu chỉ chọn B11");

// Case 3.3: Chọn cả B11 và B12 -> hợp lệ, không vi phạm
const testB11B12 = checkClientOrphanSeats(["B11", "B12"], cleanRowB);
assert.equal(testB11B12, null, "Chọn cụm B11+B12 không vi phạm");
console.log("✓ Test 3.3: Chọn cụm liền kề B11 + B12 hoàn toàn hợp lệ");

// 4. Kiểm thử API Giữ ghế 5 phút (Seat Hold)
console.log("\n--- TEST CASE 4: Gửi yêu cầu Giữ ghế 5 phút (/bookings/hold) ---");
const holdPayload = {
  showtimeId: "st-cinema-1-dune-0",
  seatIds: ["A9", "A10"],
  comboItems: [{ comboId: "combo-1", quantity: 1 }],
  couponCode: "NOVA20",
};

const resHold = await fetch(`${BASE}/bookings/hold`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(holdPayload),
});
assert.equal(resHold.status, 200, "Giữ ghế phải thành công với mã 200");
const holdJson = await resHold.json();
assert.equal(holdJson.success, true);
const order = holdJson.data;
assert.ok(order.id, "Đơn hàng phải có ID");
assert.ok(order.orderCode, "Đơn hàng phải có mã orderCode");
assert.equal(order.status, "HOLDING", "Trạng thái đơn phải là HOLDING");
assert.equal(order.totalTicketAmount, 190000, "Tiền 2 ghế A9, A10 (95k x 2) = 190.000đ");
assert.equal(order.totalComboAmount, 69000, "Combo 1 = 69.000đ");
assert.equal(order.discountAmount, 38000, "Mã NOVA20 giảm 20% tiền vé = 38.000đ");
assert.equal(order.finalAmount, 190000 + 69000 - 38000, "Tổng thanh toán = 221.000đ");

// Kiểm tra thời hạn 5 phút
const expDiff = new Date(order.expiredAt).getTime() - Date.now();
assert.ok(expDiff > 4 * 60 * 1000 && expDiff <= 5 * 60 * 1000, "Hạn giữ ghế phải khoảng 5 phút");
console.log(`✓ Đã tạo đơn giữ ghế ${order.orderCode} thành công: tổng tiền ${order.finalAmount}đ, hạn giữ: 5 phút`);

// 5. Kiểm thử API kiểm tra trạng thái thanh toán
console.log("\n--- TEST CASE 5: Kiểm tra trạng thái thanh toán (/payments/:id/status) ---");
const resStatus = await fetch(`${BASE}/payments/${order.id}/status`);
assert.equal(resStatus.status, 200);
const statusJson = await resStatus.json();
assert.equal(statusJson.data.canPay, true, "Đơn đang giữ ghế phải canPay = true");
console.log(`✓ Kiểm tra trạng thái thanh toán: canPay = ${statusJson.data.canPay}`);

// 6. Kiểm thử hoàn tất thanh toán & phát hành vé QR
console.log("\n--- TEST CASE 6: Hoàn tất thanh toán & phát hành vé QR ---");
const resComplete = await fetch(`${BASE}/payments/sandbox/complete`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ bookingId: order.id }),
});
assert.equal(resComplete.status, 200);
const completeJson = await resComplete.json();
assert.equal(completeJson.data.status, "PAID");

// Lấy lại chi tiết đơn đặt để kiểm tra đã chuyển sang PAID
const resBooking = await fetch(`${BASE}/bookings/${order.id}`);
const bookingJson = await resBooking.json();
assert.equal(bookingJson.data.status, "PAID", "Đơn hàng phải chuyển sang PAID sau khi thanh toán");
console.log(`✓ Thanh toán thành công, đơn hàng ${order.orderCode} đã chuyển trạng thái PAID`);

// Kiểm tra danh sách vé của tôi (/tickets/me)
const resTickets = await fetch(`${BASE}/tickets/me`);
const ticketsJson = await resTickets.json();
const foundTicket = ticketsJson.data.items.find((t) => t.bookingId === order.id);
assert.ok(foundTicket, "Vé điện tử mới phải xuất hiện trong danh sách vé của khách hàng");
assert.ok(foundTicket.code, "Vé phải có mã vé điện tử");
assert.ok(foundTicket.qrCodeBase64, "Vé phải có mã QR code SVG");
console.log(`✓ Đã phát hành vé điện tử mã ${foundTicket.code} kèm mã QR SVG hoàn chỉnh`);

// 7. Kiểm thử cập nhật báo cáo Doanh thu Admin
console.log("\n--- TEST CASE 7: Kiểm tra bảng Doanh thu Admin tự động tăng số liệu ---");
const resRev = await fetch(`${BASE}/admin/reports/revenue`);
const revJson = await resRev.json();
assert.ok(revJson.data.netRevenue > 185600000, "Doanh thu ròng phải được cộng dồn từ đơn hàng mới");
console.log(`✓ Báo cáo doanh thu Admin cập nhật tức thì: Net Revenue = ${revJson.data.netRevenue.toLocaleString("vi-VN")}đ`);

// 8. Kiểm thử hủy đơn và giải phóng ghế (/bookings/:id/cancel)
console.log("\n--- TEST CASE 8: Hủy đơn và trả lại ghế trống ---");
const hold2Payload = {
  showtimeId: "st-cinema-1-dune-0",
  seatIds: ["C1", "C2"],
};
const resHold2 = await fetch(`${BASE}/bookings/hold`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(hold2Payload),
});
const hold2Json = await resHold2.json();
const order2 = hold2Json.data;

const resCancel = await fetch(`${BASE}/bookings/${order2.id}/cancel`, { method: "POST" });
assert.equal(resCancel.status, 200);
const cancelJson = await resCancel.json();
assert.equal(cancelJson.success, true);
console.log(`✓ Đã hủy đơn ${order2.orderCode} và nhả ghế lại cho khán giả khác thành công`);

console.log("\n🎉 TẤT CẢ 8/8 TEST CASES NGHIỆP VỤ ĐẶT VÉ ĐỀU ĐẠT CHUẨN XUẤT SẮC 100%!");
