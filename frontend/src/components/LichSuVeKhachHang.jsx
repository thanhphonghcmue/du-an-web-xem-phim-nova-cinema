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
import TicketQrZoom from "./TicketQrZoom.jsx";
import { indexTickets, filterTickets } from "@/ticketFilters.js";
import TicketConfirmation from "./TicketConfirmation.jsx";
import ETicketQr from "./ETicketQr.jsx";
import { ticketPng } from "@/ticketQr.js";
import {
  CalendarDays,
  Download,
  Ticket,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
export default function LichSuVeKhachHang({ member, onResume }) {
  const { contextFor, movies } = useCatalog();
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dateBasis, setDateBasis] = useState("viewing");
  const [sort, setSort] = useState("newest");
  const [zoomTicket, setZoomTicket] = useState(null);
  const [copyNotice, setCopyNotice] = useState("");
  function resetFilters() {
    setKeyword("");
    setFrom("");
    setTo("");
    setFilter("all");
    setDateBasis("viewing");
    setSort("newest");
  }
  async function copyCode(value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice("Đã sao chép mã vé.");
    } catch {
      setCopyNotice("Bạn có thể chọn và sao chép mã vé hiển thị trên thẻ.");
    }
  }
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
  const indexedTickets = useMemo(() => indexTickets(tickets), [tickets]);
  const visibleTickets = useMemo(
    () =>
      filterTickets(indexedTickets, {
        keyword,
        from,
        to,
        dateBasis,
        sort,
        status: filter,
      }),
    [indexedTickets, keyword, from, to, dateBasis, sort, filter],
  );
  const visibleOrderIds = useMemo(() => {
    const indexed = indexTickets(
      orders.map((order) => {
        const context = contextFor(order.showtimeId);
        return {
          ...order,
          bookedAt: order.createdAt,
          movie: context?.movie.title,
          cinema: context?.cinema.name,
          startTime: context?.time.startTime,
        };
      }),
    );
    return new Set(
      filterTickets(indexed, { keyword, from, to, dateBasis, sort }).map(
        (order) => order.id,
      ),
    );
  }, [orders, contextFor, keyword, from, to, dateBasis, sort]);
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
      setZoomTicket(null);
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
      <section className="ticket-search-bar" aria-label="Tìm kiếm vé của tôi">
        <label>
          Tìm vé
          <input
            type="search"
            aria-label="Tìm theo mã vé, phim hoặc rạp"
            placeholder="Mã vé, tên phim, rạp hoặc ngày…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
        <label>
          Lọc theo
          <select
            aria-label="Loại ngày tìm vé"
            value={dateBasis}
            onChange={(e) => setDateBasis(e.target.value)}
          >
            <option value="viewing">Ngày xem phim</option>
            <option value="booked">Ngày đặt vé</option>
          </select>
        </label>
        <label>
          Từ ngày
          <input
            type="date"
            aria-label="Vé từ ngày"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            aria-label="Vé đến ngày"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label>
          Sắp xếp
          <select
            aria-label="Sắp xếp vé"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Đặt mới nhất</option>
            <option value="showtime">Ngày chiếu gần nhất</option>
          </select>
        </label>
        <button
          type="button"
          className="button button-glass"
          onClick={resetFilters}
        >
          Xóa bộ lọc
        </button>
      </section>
      {from && to && from > to && (
        <p role="alert">Ngày kết thúc phải từ ngày bắt đầu trở đi.</p>
      )}
      {copyNotice && <p role="status">{copyNotice}</p>}
      <div className="history-tabs" role="group" aria-label="Lọc lịch sử vé">
        {[
          ["all", "Tất cả vé"],
          ["holding", "Đang giữ ghế"],
          ["unused", "Chưa soát vé"],
          ["used", "Đã sử dụng"],
          ["past", "Đã qua suất chiếu"],
          ["cancelled", "Đã hủy / Hết hạn"],
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
        .filter((order) => visibleOrderIds.has(order.id))
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
        .filter((order) => visibleOrderIds.has(order.id))
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
      {visibleTickets.map((ticket, index) => (
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
              <span className="paid-ticket-order">
                Mã vé: {ticket.ticketCode || ticket.orderCode}
              </span>
            </div>
            <a
              className="paid-ticket-calendar"
              href={`/api/v1/tickets/${ticket.id}/calendar`}
            >
              <CalendarDays size={14} />
              Tải lịch nhắc (.ics)
            </a>
          </header>
          <img
            className="ticket-movie-poster"
            src={
              ticket.posterUrl ||
              movies.find((movie) => movie.title === ticket.movie)
                ?.localPoster ||
              "/images/cinema-auditorium.jpg"
            }
            alt={ticket.movie}
            onError={(event) => {
              if (
                event.currentTarget.getAttribute("src") !==
                "/images/cinema-auditorium.jpg"
              )
                event.currentTarget.src = "/images/cinema-auditorium.jpg";
            }}
          />
          <div className="ticket-story">
            <p className="nova-kicker">
              <Ticket size={13} />
              NOVA CINEMA ·{" "}
              {ticket.legacyGroup ? "VÉ NHÓM CŨ" : "MỘT GHẾ · MỘT LƯỢT VÀO"}
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
              Ghế:{" "}
              {ticket.seats
                .map(
                  (s) =>
                    `${s.label} (${s.type === "VIP" ? "VIP" : s.type === "SWEETBOX" ? "Sweetbox" : "Thường"})`,
                )
                .join(", ")}
            </p>
            <small
              className={`ticket-state ${ticket.isCheckedIn ? "used" : ""}`}
            >
              {ticket.isCheckedIn ? "Đã soát vé" : "Chưa soát vé"}
            </small>
            {ticket.bookedAt && (
              <p>
                Ngày đặt vé:{" "}
                {new Date(ticket.bookedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </p>
            )}
            <p>
              Giờ kết thúc:{" "}
              {new Date(ticket.endTime).toLocaleTimeString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              {(ticket.combos || [])
                .map((c) => `${c.name} × ${c.quantity}`)
                .join(" · ") || "Không kèm combo"}
            </p>
            <p>
              Tổng thanh toán đơn ({ticket.ticketCount || ticket.seats.length}{" "}
              ghế): {money(ticket.amount)}
            </p>
            <p className="ticket-order-code">Mã đơn: {ticket.orderCode}</p>
            {ticket.ticketCode && (
              <div className="ticket-code-line">
                <strong className="ticket-readable-code">
                  Mã vé: {ticket.ticketCode}
                </strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => copyCode(ticket.ticketCode)}
                >
                  Sao chép mã vé
                </button>
              </div>
            )}
          </div>
          <div className="ticket-stub" ref={index === 0 ? firstQr : undefined}>
            <button
              type="button"
              className="ticket-zoom-trigger"
              onClick={() => setZoomTicket(ticket)}
              aria-label={`Phóng to QR ghế ${ticket.seats.map((seat) => seat.label).join(", ")}`}
            >
              <ETicketQr ticket={ticket} />
              <span>Phóng to QR</span>
            </button>
            <p>
              {ticketPng(ticket) && (
                <a
                  className="text-button"
                  href={ticketPng(ticket)}
                  download={`${ticket.ticketCode || ticket.orderCode}.png`}
                >
                  <Download size={12} />
                  Tải QR
                </a>
              )}{" "}
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
      {["all", "cancelled"].includes(filter) &&
        orders.some(
          (order) =>
            visibleOrderIds.has(order.id) &&
            ["CANCELLED", "EXPIRED"].includes(order.status),
        ) && (
          <details className="history-archive">
            <summary>
              Đơn đã hủy / hết hạn (
              {
                orders.filter(
                  (order) =>
                    visibleOrderIds.has(order.id) &&
                    ["CANCELLED", "EXPIRED"].includes(order.status),
                ).length
              }
              )
            </summary>
            {orders
              .filter(
                (order) =>
                  visibleOrderIds.has(order.id) &&
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
      {!loading &&
        !error &&
        !visibleTickets.length &&
        !["holding", "cancelled"].includes(filter) && (
          <div role="status">
            <p>Không tìm thấy vé phù hợp</p>
            <button
              type="button"
              className="text-button"
              onClick={resetFilters}
            >
              Xóa bộ lọc tìm vé
            </button>
          </div>
        )}
      {zoomTicket && (
        <TicketQrZoom ticket={zoomTicket} onClose={() => setZoomTicket(null)} />
      )}
      {!loading && !error && !orders.length && <p>Bạn chưa có đơn đặt vé.</p>}
    </div>
  );
}
