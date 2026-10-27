/**
 * ==============================================================================
 * TỆP TIN: src/components/FoodArt.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Nghệ Thuật Minh Họa Bắp Nước Rạp Chiếu Phim Dựng Hoàn Toàn Bằng CSS (Pure CSS Cinema Concessions Art).
 *   - Lợi ích thiết kế:
 *     + Không phụ thuộc vào file ảnh PNG/JPG bên ngoài, không lo mạng chậm làm vỡ hình ảnh.
 *     + Hiệu ứng đổ bóng chuyển động, cốc nước với ống hút và hộp bắp vàng giòn rực rỡ mang biểu tượng NOVA.
 *   - Dùng trong màn hình Đặt Combo ẩm thực và màn hình thanh toán.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Tạo cốc nước mát lạnh với logo NOVA Cinema và ống hút.
 *   2. Tạo hộp bắp rang bơ với 26 hạt bắp sắp xếp ngẫu nhiên sinh động.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng khi xem phần ưu đãi combo bắp nước 69K.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm hiệu ứng hạt bắp nổ li ti (CSS particle animation) khi người dùng di chuột qua hộp bắp.
 * ==============================================================================
 */

import NovaLogo from "./NovaLogo.jsx";
// Hình bắp nước dựng bằng CSS để bước combo luôn hiển thị khi mạng ảnh bị chặn.
export default function BapNuocCombo() {
  return (
    <div
      className="combo-visual checkout-food-art"
      aria-label="NOVA popcorn and cold drinks"
    >
      <div className="drink drink-one">
        <div className="drink-straw" />
        <div className="drink-lid" />
        <NovaLogo showText={false} size={24} />
        <b>NOVA</b>
        <small>CINEMA</small>
      </div>
      <div className="popcorn-bucket">
        <div className="popcorn-top">
          {Array.from({ length: 26 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 29) % 94}%`,
                top: `${(i * 17) % 58}%`,
                transform: `rotate(${i * 37}deg)`,
              }}
            />
          ))}
        </div>
        <div className="bucket-body">
          <NovaLogo showText={false} size={39} />
          <strong>NOVA</strong>
          <small>CINEMA</small>
        </div>
      </div>
      <span className="food-caption">FRESH POPCORN / COLD DRINKS</span>
    </div>
  );
}
