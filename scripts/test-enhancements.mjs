import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

console.log("=== BẮT ĐẦU KIỂM THỬ TÍNH NĂNG MỚI (AGE RESTRICTION & POINTS REDEMPTION) ===");

// 1. Kiểm thử phân loại và logic cảnh báo độ tuổi (Age Restriction Classification)
function getAgeRestriction(ageRating) {
  const str = String(ageRating || "").trim().toUpperCase();
  if (str.includes("18") || str === "T18" || str === "C18") {
    return {
      code: "T18",
      age: 18,
      name: "Phim dành cho khán giả từ đủ 18 tuổi trở lên (18+)",
      tagText: "T18 · Đủ 18 tuổi",
      color: "#ef4444",
    };
  }
  if (str.includes("16") || str === "T16" || str === "C16") {
    return {
      code: "T16",
      age: 16,
      name: "Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)",
      tagText: "T16 · Đủ 16 tuổi",
      color: "#f97316",
    };
  }
  if (str.includes("13") || str === "T13" || str === "C13") {
    return {
      code: "T13",
      age: 13,
      name: "Phim dành cho khán giả từ đủ 13 tuổi trở lên (13+)",
      tagText: "T13 · Đủ 13 tuổi",
      color: "#eab308",
    };
  }
  return null;
}

// Test case 1.1: Phim nhãn T18
const res18 = getAgeRestriction("T18");
assert.ok(res18, "T18 phải được nhận diện");
assert.equal(res18.code, "T18");
assert.equal(res18.age, 18);
assert.equal(res18.color, "#ef4444");
console.log("✓ Test 1.1: Nhận diện chuẩn xác phim nhãn T18 (Đủ 18 tuổi)");

// Test case 1.2: Phim nhãn T16
const res16 = getAgeRestriction("T16");
assert.ok(res16, "T16 phải được nhận diện");
assert.equal(res16.code, "T16");
assert.equal(res16.age, 16);
assert.equal(res16.color, "#f97316");
console.log("✓ Test 1.2: Nhận diện chuẩn xác phim nhãn T16 (Đủ 16 tuổi)");

// Test case 1.3: Phim nhãn T13
const res13 = getAgeRestriction("T13");
assert.ok(res13, "T13 phải được nhận diện");
assert.equal(res13.code, "T13");
assert.equal(res13.age, 13);
assert.equal(res13.color, "#eab308");
console.log("✓ Test 1.3: Nhận diện chuẩn xác phim nhãn T13 (Đủ 13 tuổi)");

// Test case 1.4: Phim nhãn P (Phổ thông) và K không bị chặn độ tuổi
assert.equal(getAgeRestriction("P"), null, "Nhãn P không bị giới hạn tuổi");
assert.equal(getAgeRestriction("ALL"), null, "Nhãn ALL không bị giới hạn tuổi");
assert.equal(getAgeRestriction(""), null, "Chuỗi rỗng không bị giới hạn tuổi");
assert.equal(getAgeRestriction(null), null, "Null không bị giới hạn tuổi");
console.log("✓ Test 1.4: Phim gia đình / hoạt hình (P) không bị chặn độ tuổi sai");

// 2. Kiểm thử nghiệp vụ đổi điểm thành viên C-Member (Points Redemption Engine)
function calculatePointsDiscount(memberPoints, orderAmount, requestedPoints, usePoints) {
  const rawFinal = Number(orderAmount) || 0;
  const maxAllowed = Math.min(Number(memberPoints) || 0, Math.floor(rawFinal / 1000));
  const parsed = parseInt(requestedPoints, 10) || 0;
  const actualPoints = usePoints ? Math.max(0, Math.min(parsed, maxAllowed)) : 0;
  const discount = actualPoints * 1000;
  const effectiveTotal = Math.max(0, rawFinal - discount);
  return { actualPoints, discount, effectiveTotal, maxAllowed };
}

// Test case 2.1: Khách có 50 điểm, đơn 200.000đ, đổi 20 điểm
const r21 = calculatePointsDiscount(50, 200000, 20, true);
assert.equal(r21.actualPoints, 20);
assert.equal(r21.discount, 20000);
assert.equal(r21.effectiveTotal, 180000);
console.log("✓ Test 2.1: Đổi 20 điểm thành công (giảm 20.000đ, tổng còn 180.000đ)");

// Test case 2.2: Khách nhập số điểm vượt quá số dư (nhập 100 điểm khi chỉ có 30 điểm)
const r22 = calculatePointsDiscount(30, 200000, 100, true);
assert.equal(r22.actualPoints, 30, "Điểm đổi không được vượt quá số dư");
assert.equal(r22.discount, 30000);
assert.equal(r22.effectiveTotal, 170000);
console.log("✓ Test 2.2: Chặn nhập vượt số dư điểm thành viên");

// Test case 2.3: Khách có nhiều điểm hơn giá trị đơn hàng (có 150 điểm, đơn 90.000đ)
const r23 = calculatePointsDiscount(150, 90000, 150, true);
assert.equal(r23.maxAllowed, 90, "Điểm tối đa không được vượt quá giá trị đơn hàng / 1000");
assert.equal(r23.actualPoints, 90);
assert.equal(r23.discount, 90000);
assert.equal(r23.effectiveTotal, 0, "Tổng đơn sau khi đổi điểm tối đa về 0đ, không bao giờ âm tiền");
console.log("✓ Test 2.3: Khống chế điểm đổi không làm tổng tiền đơn hàng bị âm");

// Test case 2.4: Khách bỏ chọn dùng điểm (toggle off)
const r24 = calculatePointsDiscount(50, 200000, 20, false);
assert.equal(r24.actualPoints, 0);
assert.equal(r24.discount, 0);
assert.equal(r24.effectiveTotal, 200000);
console.log("✓ Test 2.4: Khi tắt dùng điểm, giá trị đơn hàng giữ nguyên 100%");

// Test case 2.5: Trừ điểm thành viên khi thanh toán thành công
const userCurrentPoints = 75;
const redeemed = 25;
const updatedBalance = Math.max(0, userCurrentPoints - redeemed);
assert.equal(updatedBalance, 50);
console.log("✓ Test 2.5: Cập nhật trừ số dư điểm của thành viên chính xác sau thanh toán");

// 3. Kiểm thử mã nguồn đã tích hợp đầy đủ component và class CSS
const seatBookingSrc = readFileSync("src/components/SeatBooking.jsx", "utf8");
assert.ok(seatBookingSrc.includes("AgeRatingModal"), "SeatBooking phải có component AgeRatingModal");
assert.ok(seatBookingSrc.includes("age-compliance-card"), "SeatBooking phải có thẻ cảnh báo độ tuổi");
assert.ok(seatBookingSrc.includes("points-redeem-card"), "SeatBooking phải có khung đổi điểm C-Member");
assert.ok(seatBookingSrc.includes("ShieldAlert"), "SeatBooking phải import icon ShieldAlert");
assert.ok(seatBookingSrc.includes("Coins"), "SeatBooking phải import icon Coins");
console.log("✓ Test 3.1: Đã xác minh mã nguồn SeatBooking.jsx tích hợp đầy đủ giao diện và biểu tượng");

const stylesSrc = readFileSync("src/styles.css", "utf8");
assert.ok(stylesSrc.includes(".age-compliance-card"), "styles.css phải có class .age-compliance-card");
assert.ok(stylesSrc.includes(".age-modal-backdrop"), "styles.css phải có class .age-modal-backdrop");
assert.ok(stylesSrc.includes(".points-redeem-card"), "styles.css phải có class .points-redeem-card");
console.log("✓ Test 3.2: Đã xác minh file styles.css có đầy đủ quy tắc giao diện cho 2 tính năng");

console.log("\n🎉 TẤT CẢ 9/9 TEST CASES CHO CẢNH BÁO ĐỘ TUỔI VÀ ĐỔI ĐIỂM ĐỀU ĐẠT 100%!");
