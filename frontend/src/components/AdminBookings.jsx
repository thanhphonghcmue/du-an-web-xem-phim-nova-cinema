import { useEffect, useState } from "react";
import { read } from "@/api/client.js";
import { money } from "@/data.js";
import TicketConfirmation from "./TicketConfirmation.jsx";
const statuses = {
  HOLDING: "Đang giữ ghế",
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "FAILED - Thanh toán thất bại",
  CANCELLED: "CANCELLED - Đã hủy giao dịch",
  EXPIRED: "Đã hết hạn",
};
export default function AdminBookings() {
  const [keyword, setKeyword] = useState(""),
    [status, setStatus] = useState("");
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null),
    [selected, setSelected] = useState("");
  const [detail, setDetail] = useState(null),
    [map, setMap] = useState(null);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const data = await read(
          `/admin/bookings?${new URLSearchParams({ page, limit: 25, ...(keyword.trim() ? { keyword: keyword.trim() } : {}), ...(status ? { status } : {}) })}`,
        );
        if (active) setResult(data);
      } catch (cause) {
        if (active) setError(cause.message);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [keyword, status, page, revision]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    async function load() {
      try {
        const order = await read(`/admin/bookings/${selected}`);
        const seats = await read(`/showtimes/${order.showtimeId}/seats`);
        if (active) {
          setDetail(order);
          setMap(seats);
        }
      } catch (cause) {
        if (active) setError(cause.message);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selected, revision]);
  return (
    <section
      className="admin-tab-pane admin-bookings"
      aria-label="Quản lý đơn đặt vé và trạng thái ghế"
    >
      <h2>📋 Quản lý Đơn đặt vé &amp; Trạng thái ghế</h2>
      <div className="admin-filter-bar">
        <label>
          Tìm mã đơn / mã vé / email
          <input
            type="search"
            aria-label="Tìm đơn đặt vé"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Trạng thái đơn
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(statuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button button-glass"
          disabled={loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          Làm mới đơn và ghế
        </button>
      </div>
      {error && (
        <p role="alert" className="workspace-error">
          {error}
        </p>
      )}
      {loading && <p role="status">Đang đọc đơn từ hệ thống…</p>}
      {result && (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Đơn / Khách hàng</th>
                  <th>Suất chiếu</th>
                  <th>Trạng thái</th>
                  <th>Tổng tiền</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      {order.orderCode}
                      <br />
                      {order.user.fullName} · {order.user.email}
                    </td>
                    <td>
                      {order.showtime.movie.title}
                      <br />
                      {order.showtime.room.name} ·{" "}
                      {new Date(order.showtime.startTime).toLocaleString(
                        "vi-VN",
                        { timeZone: "Asia/Ho_Chi_Minh" },
                      )}
                    </td>
                    <td>
                      <span
                        className={`order-status order-${order.status.toLowerCase()}`}
                      >
                        {statuses[order.status]}
                      </span>
                    </td>
                    <td>{money(order.finalAmount)}đ</td>
                    <td>
                      <button
                        className="button button-glass"
                        onClick={() => {
                          setDetail(null);
                          setMap(null);
                          setError("");
                          setSelected(order.id);
                        }}
                      >
                        Xem đơn &amp; ghế
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.items.length && <p>Không có đơn phù hợp với bộ lọc.</p>}
          <div className="admin-filter-bar">
            <button
              className="button button-glass"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              Trang trước
            </button>
            <span>
              Trang {page} / {Math.max(1, result.meta.totalPages)} ·{" "}
              {result.meta.total} đơn
            </span>
            <button
              className="button button-glass"
              disabled={page >= result.meta.totalPages || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
      {detail && (
        <section
          className="confirmation-panel"
          aria-label="Chi tiết đơn quản trị"
        >
          <h3>
            {detail.orderCode} · {statuses[detail.status]}
          </h3>
          <p>
            {detail.showtime.movie.title} · {detail.showtime.room.cinema.name} ·{" "}
            {detail.showtime.room.name}
          </p>
          <p>
            Ghế trong đơn:{" "}
            {detail.seats
              .map((s) => `${s.seat.seatRow}${s.seat.seatColumn} (${s.status})`)
              .join(", ")}
          </p>
          <p>
            Bắp nước:{" "}
            {detail.combos
              .map((c) => `${c.combo.name} ×${c.quantity}`)
              .join(", ") || "Không có combo"}
          </p>
          <p>
            Vé: {money(detail.totalTicketAmount)}đ · Combo:{" "}
            {money(detail.totalComboAmount)}đ · Ưu đãi:{" "}
            {money(detail.discountAmount)}đ · Tổng: {money(detail.finalAmount)}đ
          </p>
          {map && (
            <>
              <p role="status">
                Ghế suất chiếu: {map.capacity.available} trống ·{" "}
                {map.capacity.holding} đang giữ · {map.capacity.sold} đã bán
              </p>
              <div className="layout-preview-scroll">
                <div className="layout-preview">
                  {Object.entries(Object.groupBy(map.seats, (s) => s.row)).map(
                    ([row, seats]) => (
                      <div className="layout-row" key={row}>
                        <strong>{row}</strong>
                        <div>
                          {seats.map((s) => (
                            <span
                              key={s.seatId}
                              className={`layout-seat layout-${s.type.toLowerCase()}`}
                              title={`${row}${s.column}: ${s.status}`}
                              aria-label={`${row}${s.column}: ${s.status}`}
                            >
                              {s.status === "SOLD"
                                ? "✕"
                                : s.status === "HOLDING"
                                  ? "◷"
                                  : s.column}
                            </span>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
          <h3>Vé đã phát hành &amp; Email Log</h3>
          {!detail.tickets.length && <p>Đơn chưa phát hành vé điện tử.</p>}
          {detail.tickets.map((ticket) => (
            <div key={ticket.id}>
              <p>
                {ticket.ticketCode}{" "}
                {ticket.shortCode && `(${ticket.shortCode})`} ·{" "}
                {ticket.isCheckedIn
                  ? `Đã check-in ${new Date(ticket.checkedInAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
                  : "Chưa sử dụng"}
              </p>
              {ticket.emailLogs.map((log) => (
                <TicketConfirmation
                  key={log.id}
                  ticketId={ticket.id}
                  confirmationPath={`/admin/email-logs/${log.id}`}
                />
              ))}
              {!ticket.emailLogs.length && (
                <p>
                  Vé cũ chưa có bản lưu email; trạng thái gửi xem trong đối
                  soát.
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
