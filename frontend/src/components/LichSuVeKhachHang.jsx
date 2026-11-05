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

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { uniqueRecords } from "@/uniqueRecords.js";
import { apiGetMyBookings, apiGetMyTickets } from "@/api/client.js";
import { useCatalog } from "@/catalog.js";
import { money } from "@/data.js";
import TicketConfirmation from "./TicketConfirmation.jsx";
import ETicketQr from "./ETicketQr.jsx";
import { ticketPng } from "@/ticketQr.js";
import {
  CalendarDays,
  Download,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
export default function LichSuVeKhachHang({ member, onResume }) {
  const { contextFor } = useCatalog();
  const [filter, setFilter] = useState("all");
  const memberId = member?.id;
  const generation = useRef(0);
  const inFlight = useRef(null);
  const firstQr = useRef(null);
  const wallet = useRef(null);
  const didScrollToQr = useRef(false);
  const invalidate = useCallback(() => {
    generation.current++;
    inFlight.current = null;
  }, []);
  const [ticketRows, setTickets] = useState([]),
    [orderRows, setOrders] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const tickets = useMemo(() => uniqueRecords(ticketRows), [ticketRows]);
  const orders = useMemo(() => uniqueRecords(orderRows), [orderRows]);
  const load = useCallback(() => {
    if (!memberId) return;
    if (inFlight.current) return inFlight.current;
    const version = generation.current;
    const task = (async () => {
      setLoading(true);
      try {
        const [t, o] = await Promise.allSettled([
          apiGetMyTickets(),
          apiGetMyBookings(),
        ]);
        if (version !== generation.current) return;
        if (t.status === "fulfilled") setTickets(t.value);
        if (o.status === "fulfilled") setOrders(o.value);
        setError(
          [t, o]
            .filter((result) => result.status === "rejected")
            .map((result) => result.reason.message)
            .join(" · "),
        );
      } finally {
        if (version === generation.current) setLoading(false);
      }
    })();
    inFlight.current = task;
    void task.finally(() => {
      if (inFlight.current === task) inFlight.current = null;
    });
    return task;
  }, [memberId]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setTickets([]);
      setOrders([]);
      setError("");
      didScrollToQr.current = false;
      return load();
    });
    const poll = setInterval(load, 5000);
    return () => {
      active = false;
      invalidate();
      clearInterval(poll);
    };
  }, [load, invalidate]);
  useEffect(() => {
    if (didScrollToQr.current || window.location.hash !== "#ve-cua-toi") return;
    const requestedBooking = new URLSearchParams(window.location.search).get(
      "ve",
    );
    const target = requestedBooking
      ? [...(wallet.current?.querySelectorAll(".cinema-ticket") || [])].find(
          (card) => card.dataset.bookingId === requestedBooking,
        )
      : firstQr.current;
    const qr = target?.querySelector(".ticket-qr-svg");
    if (!qr) return;
    const frame = requestAnimationFrame(() => {
      qr.scrollIntoView({ block: "center", behavior: "instant" });
      didScrollToQr.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [tickets]);
  if (!member) return <p>Vui lòng đăng nhập để tra cứu vé của bạn.</p>;
  return (
    <div className="history-list" ref={wallet}>
      <div className="history-tabs" role="group" aria-label="Lọc lịch sử vé">
        {[
          ["all", "Tất cả vé"],
          ["holding", "Đang giữ ghế"],
          ["unused", "Chưa soát vé"],
          ["used", "Đã sử dụng"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> Làm mới vé
        </button>
      </div>
      {loading && <p role="status">Đang tải vé…</p>}
      {error && <p role="alert">{error}</p>}
      {orders
        .filter(
          (o) =>
            ["all", "holding"].includes(filter) &&
            ["HOLDING", "PENDING"].includes(o.status),
        )
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
          <div role="status" key={o.id}>
            <p>Đơn {o.orderCode}: Đã thanh toán · đang phát hành vé QR.</p>
            <ETicketQr loading />
          </div>
        ))}
      {tickets
        .filter(
          (ticket) =>
            filter === "all" ||
            (filter === "used"
              ? ticket.isCheckedIn
              : filter === "unused"
                ? !ticket.isCheckedIn
                : false),
        )
        .map((ticket, index) => (
          <article
            className="cinema-ticket cinema-ticket-paid"
            key={`${ticket.id}-${index}`}
            data-booking-id={ticket.bookingId}
          >
            <header className="paid-ticket-header">
              <div className="paid-ticket-reference">
                <span className="paid-ticket-status">
                  <CheckCircle2 size={13} />
                  {ticket.isCheckedIn ? "VÉ ĐÃ SỬ DỤNG" : "VÉ HỢP LỆ (PAID)"}
                </span>
                <span className="paid-ticket-order">Mã đơn: {ticket.orderCode}</span>
              </div>
              <a
                className="paid-ticket-calendar"
                href={`/api/v1/tickets/${ticket.id}/calendar`}
              >
                <CalendarDays size={14} /> Tải lịch nhắc (.ics)
              </a>
            </header>
            <div className="paid-ticket-body">
              <div
                className="ticket-stub paid-ticket-qr"
                ref={index === 0 ? firstQr : undefined}
              >
                <ETicketQr ticket={ticket} />
                {ticketPng(ticket) && (
                  <a
                    className="text-button paid-ticket-download"
                    href={ticketPng(ticket)}
                    download={`${ticket.orderCode}.png`}
                  >
                    <Download size={13} /> Tải ảnh QR
                  </a>
                )}
              </div>
              <div className="ticket-story paid-ticket-details">
                <p className="nova-kicker">{ticket.cinema}</p>
                <h3>{ticket.movie}</h3>
                <div className="paid-ticket-facts">
                  <p><span>Phòng chiếu</span><strong>{ticket.room}</strong></p>
                  <p><span>Suất chiếu</span><strong>{new Date(ticket.startTime).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric", year: "numeric" })}</strong></p>
                  <p><span>Số ghế</span><strong className="paid-ticket-seats">{ticket.seats.map((s) => s.label).join(", ")}</strong></p>
                  {ticket.combos?.length > 0 && (
                    <p><span>Bắp nước</span><strong>{ticket.combos.map((combo) => `${combo.quantity}x ${combo.name}`).join(", ")}</strong></p>
                  )}
                  <p><span>Tổng thanh toán</span><strong>{money(ticket.amount)}</strong></p>
                </div>
                <small className={`ticket-state ${ticket.isCheckedIn ? "used" : ""}`}>
                  {ticket.isCheckedIn ? "Đã soát vé" : "Chưa soát vé"}
                </small>
                <p className="paid-ticket-note">Xuất trình mã QR này tại quầy soát vé để vào rạp.</p>
              </div>
            </div>
            <TicketConfirmation ticketId={ticket.id} />
          </article>
        ))}
      {filter === "all" &&
        orders.some((order) =>
          ["CANCELLED", "EXPIRED"].includes(order.status),
        ) && (
          <details className="history-archive">
            <summary>
              Đơn đã hủy / hết hạn (
              {
                orders.filter((order) =>
                  ["CANCELLED", "EXPIRED"].includes(order.status),
                ).length
              }
              )
            </summary>
            {orders
              .filter((order) =>
                ["CANCELLED", "EXPIRED"].includes(order.status),
              )
              .map((order) => (
                <article key={order.id}>
                  <strong>{order.orderCode}</strong>
                  <p>
                    {order.status === "EXPIRED"
                      ? "Đã hết hạn giữ ghế"
                      : "Đã hủy"}{" "}
                    · {money(order.finalAmount)}
                  </p>
                </article>
              ))}
          </details>
        )}
      {!loading && !error && !orders.length && <p>Bạn chưa có đơn đặt vé.</p>}
    </div>
  );
}
