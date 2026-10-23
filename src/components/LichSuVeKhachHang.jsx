// LichSuVeKhachHang: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/TicketHistory.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Ví Vé Điện Tử & Lịch Sử Đơn Hàng Của Khách Hàng (Customer Ticket Wallet).
 *   - Quản lý 2 trạng thái:
 *     1. ĐƠN ĐANG GIỮ CHỖ (HOLDING/PENDING): Cho phép bấm "Tiếp tục đơn" để quay lại thanh toán trước khi hết 5 phút.
 *     2. VÉ ĐÃ PHÁT HÀNH (PAID): Hiển thị mã QR vé điện tử, thông tin ghế, rạp, phòng chiếu và giờ chiếu.
 *   - Tiện ích xuất vé: Tải mã QR dạng ảnh PNG và Tải file lịch iCalendar (.ics) đồng bộ vào điện thoại.
 *   - Hiển thị trạng thái soát vé thực tế: "Chưa soát vé" hoặc "Đã soát vé".
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Khách hàng đăng nhập và mở tab "Vé của tôi" hoặc "Lịch sử vé".
 *   2. Tự động tải song song danh sách vé (`apiGetMyTickets`) và đơn đặt (`apiGetMyBookings`).
 *   3. Định kỳ 5 giây làm mới một lần để cập nhật ngay khi worker phát hành vé QR xong.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng đã đăng nhập tài khoản C'MEMBER.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tích hợp Apple Wallet (.pkpass) và Google Wallet Pass để lưu vé vào ví điện thoại native.
 *   - Thêm tính năng "Gửi tặng vé cho bạn bè" qua đường link bảo mật.
 * ==============================================================================
 */

import { useCallback, useEffect, useState } from "react";
import { apiGetMyBookings, apiGetMyTickets } from "../api/client.js";
import { useCatalog } from "../catalog.js";
import { money } from "../data.js";
import TicketConfirmation from "./TicketConfirmation.jsx";
import { CalendarDays, Download, Ticket } from "lucide-react";
export default function LichSuVeKhachHang({ member, onResume }) {
  const { contextFor, movies } = useCatalog();
  const [tickets, setTickets] = useState([]),
    [orders, setOrders] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!member) {
      setLoading(false);
      return;
    }
    try {
      const [t, o] = await Promise.all([apiGetMyTickets(), apiGetMyBookings()]);
      setTickets(Array.isArray(t) ? t : []);
      setOrders(Array.isArray(o) ? o : []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [member]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, [load]);
  if (!member) return <p>Vui lòng đăng nhập để tra cứu vé của bạn.</p>;
  return (
    <div className="history-list">
      {loading && <p role="status">Đang tải vé…</p>}
      {error && <p role="alert">{error}</p>}
      {orders
        .filter((o) => ["HOLDING", "PENDING"].includes(o.status))
        .map((o) => (
          <article key={o.id}>
            <div>
              <h3>Đơn đang giữ ghế</h3>
              <p>{o.orderCode}</p>
              <p>
                {money(o.finalAmount)} · Hết hạn{" "}
                {new Date(o.expiredAt).toLocaleTimeString("vi-VN")}
              </p>
            </div>
            {contextFor(o.showtimeId) && (
              <button
                className="button button-glass"
                onClick={() =>
                  onResume({ ...contextFor(o.showtimeId), orderId: o.id })
                }
              >
                Tiếp tục đơn
              </button>
            )}
          </article>
        ))}
      {orders
        .filter(
          (o) =>
            o.status === "PAID" && !tickets.some((t) => t.bookingId === o.id),
        )
        .map((o) => (
          <p role="status" key={o.id}>
            Đơn {o.orderCode}: Đã thanh toán · đang phát hành vé QR.
          </p>
        ))}
      {tickets.map((ticket) => (
        <article className="cinema-ticket" key={ticket.id}>
          <img
            className="ticket-movie-poster"
            src={
              movies.find((movie) => movie.title === ticket.movie)
                ?.localPoster || "/images/cinema-auditorium.jpg"
            }
            alt={ticket.movie}
          />
          <div className="ticket-story">
            <p className="nova-kicker">
              <Ticket size={13} />
              NOVA CINEMA · ADMIT ONE BOOKING
            </p>
            <h3>{ticket.movie}</h3>
            <p>
              {ticket.cinema} · {ticket.room}
            </p>
            <p>
              {new Date(ticket.startTime).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
            <p>
              Ghế: {ticket.seats.map((s) => s.label).join(", ")} ·{" "}
              {money(ticket.amount)}
            </p>
            <small
              className={`ticket-state ${ticket.isCheckedIn ? "used" : ""}`}
            >
              {ticket.isCheckedIn ? "Đã soát vé" : "Chưa soát vé"}
            </small>
            <p className="ticket-order-code">Mã đơn: {ticket.orderCode}</p>
          </div>
          <div className="ticket-stub">
            <img src={ticket.qrCodeBase64} alt={`QR vé ${ticket.orderCode}`} />
            <p>
              <a
                className="text-button"
                href={ticket.qrCodeBase64}
                download={`${ticket.orderCode}.png`}
              >
                <Download size={12} />
                Tải QR
              </a>{" "}
              ·{" "}
              <a
                className="text-button"
                href={`/api/v1/tickets/${ticket.id}/calendar`}
              >
                <CalendarDays size={12} />
                Thêm lịch .ics
              </a>
            </p>
          </div>
          <TicketConfirmation ticketId={ticket.id} />
        </article>
      ))}
      {!loading && !error && !orders.length && <p>Bạn chưa có đơn đặt vé.</p>}
    </div>
  );
}
