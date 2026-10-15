import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, ShieldCheck, UsersRound } from "lucide-react";
import Modal from "./Modal.jsx";
import { useCatalog } from "../catalog.js";
import { money } from "../data.js";
import {
  apiGetShowtimeSeats,
  apiGetMyBookings,
  apiGetBooking,
  apiGetGroupSuggestions,
  apiHoldSeats,
  apiCancelBooking,
  apiCheckout,
  apiPaymentStatus,
  apiGetProfile,
  memberProfile,
} from "../api/client.js";

export default function SeatBooking({
  booking,
  member,
  onClose,
  onMemberUpdate,
}) {
  const { combos } = useCatalog();
  const showtimeId = booking.showtimeId || booking.time.id;
  const [snapshot, setSnapshot] = useState(null);
  const [selected, setSelected] = useState([]);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState("");
  const [comboItems, setComboItems] = useState(() => {
    const combo = booking.combo && combos.find((c) => c.price === "69000.00");
    return combo ? { [combo.id]: 1 } : {};
  });
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(Date.now);
  const [offset, setOffset] = useState(0);
  const requestKey = useRef(null);
  const mounted = useRef(true);
  const activeOrderId = useRef(booking.orderId);
  const refresh = useCallback(async () => {
    const map = await apiGetShowtimeSeats(showtimeId);
    if (!mounted.current) return;
    setSnapshot(map);
    setOffset(new Date(map.asOf).getTime() - Date.now());
  }, [showtimeId]);
  useEffect(() => {
    mounted.current = true;
    let running = false;
    async function update() {
      if (running) return;
      running = true;
      try {
        await refresh();
        const orders = await apiGetMyBookings();
        if (!mounted.current) return;
        const current =
          orders.find((o) => o.id === activeOrderId.current) ||
          orders.find(
            (o) =>
              o.showtimeId === showtimeId &&
              ["HOLDING", "PENDING"].includes(o.status),
          );
        if (current) {
          activeOrderId.current = current.id;
          setOrder(current);
          if (!["HOLDING", "PENDING", "PAID"].includes(current.status)) {
            activeOrderId.current = undefined;
            requestKey.current = null;
            setSelected([]);
          } else
            setSelected(
              current.seats
                .filter((s) => s.status !== "AVAILABLE")
                .map((s) => s.seatId),
            );
        }
        setInitialized(true);
      } catch (err) {
        if (mounted.current) setNotice(err.message);
      } finally {
        running = false;
      }
    }
    void update();
    const poll = setInterval(update, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("focus", update);
    return () => {
      mounted.current = false;
      clearInterval(poll);
      clearInterval(clock);
      window.removeEventListener("focus", update);
    };
  }, [showtimeId, booking.orderId, refresh]);
  useEffect(() => {
    const stream = new EventSource(`/api/seat-events/${showtimeId}`);
    stream.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLive(data.type === "resync");
      if (data.type === "resync")
        void refresh().catch((err) => setNotice(err.message));
    };
    stream.onerror = () => setLive(false);
    return () => stream.close();
  }, [showtimeId, refresh]);
  const seats = snapshot?.seats || [];
  const rows = [...new Set(seats.map((s) => s.row))].sort();
  const holding = order && ["PENDING", "HOLDING"].includes(order.status);
  const remaining = holding
    ? Math.max(
        0,
        Math.ceil((new Date(order.expiredAt).getTime() - now - offset) / 1000),
      )
    : 0;
  function toggle(seat) {
    if (holding || busy) return;
    // Pair identity follows the server's documented same-row odd/even columns.
    const pair =
      seat.type === "SWEETBOX"
        ? seats.filter(
            (s) =>
              s.row === seat.row &&
              s.type === "SWEETBOX" &&
              Math.floor((s.column - 1) / 2) ===
                Math.floor((seat.column - 1) / 2),
          )
        : [seat];
    if (pair.some((s) => s.status !== "AVAILABLE")) return;
    const ids = pair.map((s) => s.seatId);
    const next = selected.includes(seat.seatId)
      ? selected.filter((id) => !ids.includes(id))
      : [...new Set([...selected, ...ids])];
    if (next.length > 20) {
      setNotice("Mỗi đơn tối đa 20 ghế, bao gồm ghế đôi.");
      return;
    }
    setSelected(next);
    setNotice("");
  }
  async function suggest(quantity) {
    setBusy(true);
    try {
      const result = await apiGetGroupSuggestions(showtimeId, quantity);
      setSelected(result.seatIds);
      setNotice(
        result.seatIds.length
          ? "Đã chọn dải ghế. Bấm Giữ ghế để xác nhận với máy chủ."
          : "Không còn dải ghế phù hợp.",
      );
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function hold() {
    setBusy(true);
    setNotice("");
    const payload = {
      showtimeId,
      seatIds: [...selected].sort(),
      comboItems: Object.entries(comboItems)
        .filter(([, q]) => q > 0)
        .map(([comboId, quantity]) => ({ comboId, quantity })),
    };
    const canonical = JSON.stringify(payload);
    if (requestKey.current?.body !== canonical)
      requestKey.current = { body: canonical, key: crypto.randomUUID() };
    try {
      const result = await apiHoldSeats(payload, requestKey.current.key);
      activeOrderId.current = result.id;
      setOrder(result);
      setSelected(result.seats.map((s) => s.seatId));
      await refresh();
    } catch (err) {
      setNotice(
        err.status === 409
          ? "Ghế vừa được người khác giữ hoặc suất đã đóng. Vui lòng chọn lại."
          : err.message,
      );
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      const result = await apiCancelBooking(order.id);
      setOrder(result);
      activeOrderId.current = undefined;
      setSelected([]);
      requestKey.current = null;
      await refresh();
      setNotice("Đã hủy đơn và trả ghế.");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function checkout() {
    setBusy(true);
    setNotice("");
    try {
      const state = await apiPaymentStatus(order.id);
      if (!state.canPay) {
        setOrder(await apiGetBooking(order.id));
        setNotice(
          "Đơn đã kết thúc hoặc hết hạn. Vui lòng kiểm tra lại trạng thái.",
        );
        return;
      }
      const result = await apiCheckout(order.id);
      const url = new URL(result.url);
      // Signed payload is preserved; the BFF proxies the internal Sandbox on our origin.
      window.location.assign(url.pathname + url.search);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (order?.status === "PAID")
      apiGetProfile()
        .then((u) => onMemberUpdate(memberProfile(u)))
        .catch(() => {});
  }, [order?.status, onMemberUpdate]);
  return (
    <Modal title="Chọn ghế & đặt vé" wide onClose={onClose}>
      <div className="booking-context">
        <div>
          <h3>{booking.movie.title}</h3>
          <p>
            {booking.cinema.name} · {booking.time.label}
          </p>
          <span>
            {booking.date.label} · {booking.movie.age}
          </span>
        </div>
        {holding && (
          <div className={`hold-timer ${remaining < 60 ? "urgent" : ""}`}>
            <Clock3 size={18} />
            <div>
              <small>Giữ ghế còn lại</small>
              <strong data-testid="hold-timer">
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                {String(remaining % 60).padStart(2, "0")}
              </strong>
            </div>
          </div>
        )}
      </div>
      <p className="sandbox-note">
        <ShieldCheck size={15} />
        {live ? "Đồng bộ ghế trực tiếp" : "Cập nhật ghế mỗi 5 giây"} · Thanh
        toán Sandbox không thu tiền thật. Đóng cửa sổ vẫn giữ đơn đến thời hạn
        đã xác nhận.
      </p>
      {notice && (
        <p role="alert" className="auth-notice">
          {notice}
        </p>
      )}
      {order?.status === "PAID" ? (
        <div className="ticket-success">
          <h3>Thanh toán đã được xác nhận</h3>
          <p>Vé QR đang được phát hành và có trong mục Vé của bạn.</p>
          <button className="button button-primary" onClick={onClose}>
            Xem vé trong tài khoản
          </button>
        </div>
      ) : (
        <div className="checkout-layout">
          <div className="seat-area">
            {!initialized && <p role="status">Đang tải trạng thái ghế…</p>}
            {!holding && (
              <div className="group-picker">
                <UsersRound size={20} />
                <label htmlFor="group-count">Số người trong nhóm</label>
                <select
                  id="group-count"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <button
                  className="button button-glass"
                  disabled={busy || !initialized}
                  onClick={() => suggest(count)}
                >
                  Xếp ghế
                </button>
                <button
                  className="text-button"
                  disabled={busy || !initialized}
                  onClick={() => suggest(3)}
                >
                  Chọn nhanh 3 ghế liền nhau
                </button>
              </div>
            )}
            <div className="seat-map-scroll">
              <div className="seat-map">
                <div className="curved-screen" />
                <p className="screen-label">INFINITY / CINEMA SCREEN</p>
                {rows.map((row) => (
                  <div className="seat-row" key={row}>
                    <span className="row-label">{row}</span>
                    {seats
                      .filter((s) => s.row === row)
                      .sort((a, b) => a.column - b.column)
                      .map((seat) => {
                        const chosen = selected.includes(seat.seatId);
                        const state = chosen
                          ? "selected"
                          : seat.status === "SOLD"
                            ? "sold"
                            : seat.status === "HOLDING"
                              ? "held"
                              : seat.type === "VIP"
                                ? "vip"
                                : seat.type === "SWEETBOX"
                                  ? "sweet"
                                  : "standard";
                        return (
                          <button
                            key={seat.seatId}
                            className={`seat ${state}`}
                            disabled={
                              busy ||
                              Boolean(holding) ||
                              seat.status !== "AVAILABLE"
                            }
                            aria-label={`Ghế ${seat.row}${seat.column}, ${chosen ? "đang chọn" : seat.status === "AVAILABLE" ? "còn trống" : seat.status === "SOLD" ? "đã bán" : "đang giữ"}`}
                            aria-pressed={chosen}
                            onClick={() => toggle(seat)}
                            title={`${seat.row}${seat.column} · ${money(seat.price)}`}
                          >
                            {seat.column}
                          </button>
                        );
                      })}
                    <span className="row-label">{row}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="seat-legend">
              {[
                ["standard", "Thường"],
                ["vip", "VIP"],
                ["sweet", "Sweetbox đôi"],
                ["selected", "Bạn chọn"],
                ["held", "Đang giữ"],
                ["sold", "Đã bán"],
              ].map(([c, label]) => (
                <span key={c}>
                  <i className={c} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <aside className="booking-summary live-summary">
            <h3>Đơn của {member.name}</h3>
            <p>
              Ghế:{" "}
              {selected
                .map((id) => {
                  const s = seats.find((s) => s.seatId === id);
                  return s ? `${s.row}${s.column}` : "";
                })
                .join(", ") || "Chưa chọn"}
            </p>
            {!holding && (
              <div className="live-combos">
                {combos.map((combo) => (
                  <label key={combo.id}>
                    {combo.name} · {money(combo.price)}
                    <input
                      aria-label={`Số lượng ${combo.name}`}
                      type="number"
                      min="0"
                      max="20"
                      value={comboItems[combo.id] || 0}
                      onChange={(e) =>
                        setComboItems({
                          ...comboItems,
                          [combo.id]: Math.min(
                            20,
                            Math.max(0, Math.trunc(Number(e.target.value))),
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            {holding ? (
              <>
                <p>
                  Mã đơn: <small>{order.orderCode}</small>
                </p>
                <p>
                  Tiền vé <b>{money(order.totalTicketAmount)}</b>
                </p>
                <p>
                  Combo <b>{money(order.totalComboAmount)}</b>
                </p>
                <p>
                  Ưu đãi {order.membershipTier}{" "}
                  <b>−{money(order.discountAmount)}</b>
                </p>
                <p className="summary-total">
                  Tổng thanh toán{" "}
                  <strong data-testid="server-total">
                    {money(order.finalAmount)}
                  </strong>
                </p>
                <div className="holding-step-banner">
                  <span>⚠️ Đang giữ chỗ ({String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")})</span>
                  <small>Vui lòng bấm nút <b>"Thanh toán Sandbox"</b> bên dưới để hoàn tất đơn và nhận vé!</small>
                </div>
                <button
                  className="button button-primary checkout-btn-pulse"
                  disabled={busy || !remaining}
                  onClick={checkout}
                >
                  Thanh toán Sandbox
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={cancel}
                >
                  Hủy đơn & trả ghế
                </button>
              </>
            ) : (
              <>
                <p className="muted">
                  Chưa giữ chỗ. Máy chủ sẽ xác nhận giá, ưu đãi thành viên và
                  thời hạn khi giữ ghế.
                </p>
                {order && <p>Trạng thái đơn trước: {order.status}</p>}
                <button
                  className="button button-primary"
                  disabled={
                    busy ||
                    !initialized ||
                    !selected.length ||
                    !snapshot?.canBook
                  }
                  onClick={hold}
                >
                  {busy ? "Đang xử lý…" : "Giữ ghế 5 phút"}
                </button>
              </>
            )}
          </aside>
        </div>
      )}
    </Modal>
  );
}
