import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock3,
  ShieldCheck,
  UsersRound,
  QrCode,
  Smartphone,
  CreditCard,
  Copy,
  Check,
  Tag,
  AlertTriangle,
  X,
  Sparkles,
  Calendar,
} from "lucide-react";
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
  apiInstantPay,
  apiPaymentStatus,
  apiGetProfile,
  memberProfile,
} from "../api/client.js";

const PROMO_COUPONS = [
  { code: "NOVA20", desc: "Giảm 20.000đ mọi đơn", value: 20000, type: "fixed" },
  { code: "CINEMA10", desc: "Giảm 10% tổng vé", value: 10, type: "percent" },
  { code: "U22", desc: "Giảm 25.000đ cho HSSV", value: 25000, type: "fixed", min: 50000 },
  { code: "CHAOBANMOI", desc: "Giảm 30.000đ từ 100k", value: 30000, type: "fixed", min: 100000 },
  { code: "VIP50", desc: "Giảm 50.000đ từ 150k", value: 50000, type: "fixed", min: 150000 },
];

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
  const [orphanWarning, setOrphanWarning] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [payMethod, setPayMethod] = useState("vietqr"); // vietqr | momo | vnpay | sandbox
  const [copiedKey, setCopiedKey] = useState("");
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

  const isWeekend =
    booking.date?.label?.includes("Thứ 7") ||
    booking.date?.label?.includes("Chủ nhật") ||
    booking.date?.label?.includes("CN") ||
    booking.date?.label?.includes("Sat") ||
    booking.date?.label?.includes("Sun") ||
    [0, 6].includes(new Date().getDay());

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

  function copyText(text, key) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 2000);
    }
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    const found = PROMO_COUPONS.find((c) => c.code === code);
    if (!found) {
      setNotice(`Mã voucher "${code}" không hợp lệ. Hãy thử các mã: NOVA20, CINEMA10, U22, CHAOBANMOI.`);
      return;
    }
    setAppliedCoupon(found);
    setNotice(`Đã chọn áp dụng mã ${found.code}: ${found.desc}! Giá ưu đãi sẽ được cập nhật khi giữ ghế.`);
  }

  function toggle(seat) {
    if (holding || busy) return;
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

    // Check orphan seat rule locally
    const orphan = checkClientOrphanSeats(next, seats);
    setOrphanWarning(
      orphan
        ? `Ghế ${orphan.row}${orphan.column} sẽ bị trống đơn lẻ (Orphan seat). Vui lòng chọn ghế liền kề!`
        : null,
    );
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
      const orphan = checkClientOrphanSeats(result.seatIds, seats);
      setOrphanWarning(
        orphan
          ? `Ghế ${orphan.row}${orphan.column} sẽ bị trống đơn lẻ (Orphan seat). Vui lòng chọn ghế liền kề!`
          : null,
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

    const orphan = checkClientOrphanSeats(selected, seats);
    if (orphan) {
      setBusy(false);
      setNotice(
        `Quy tắc rạp chiếu phim: Không được để lại 1 ghế trống đơn lẻ (Orphan Seat) tại vị trí ${orphan.row}${orphan.column}. Vui lòng chọn ghế liền kề!`,
      );
      return;
    }

    const payload = {
      showtimeId,
      seatIds: [...selected].sort(),
      comboItems: Object.entries(comboItems)
        .filter(([, q]) => q > 0)
        .map(([comboId, quantity]) => ({ comboId, quantity })),
      ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
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
      window.location.assign(url.pathname + url.search);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleInstantPay() {
    setBusy(true);
    setNotice("");
    try {
      await apiInstantPay(order.id);
      await refresh();
      const updated = await apiGetBooking(order.id);
      setOrder(updated);
      setNotice("Thanh toán thành công! Vé đã được phát hành và lưu vào mục Vé của bạn.");
    } catch (err) {
      setNotice(err.message || "Xác nhận thanh toán chưa thành công. Vui lòng thử lại!");
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
          <div className="booking-badges-row">
            <span>
              {booking.date.label} · {booking.movie.age}
            </span>
            {isWeekend && (
              <span className="weekend-price-badge">
                <Calendar size={13} /> Suất Cuối Tuần (+15.000đ)
              </span>
            )}
          </div>
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
        {live ? "Đồng bộ ghế trực tiếp" : "Cập nhật ghế mỗi 5 giây"} · Hỗ trợ
        thanh toán VietQR Napas 24/7, Ví MoMo, VNPAY hoặc Cổng Sandbox.
      </p>

      {orphanWarning && !holding && (
        <div className="orphan-warning-banner">
          <AlertTriangle size={16} />
          <span>{orphanWarning}</span>
        </div>
      )}

      {notice && (
        <p role="alert" className="auth-notice">
          {notice}
        </p>
      )}

      {order?.status === "PAID" ? (
        <div className="ticket-success">
          <div className="success-icon-wrap">
            <Check size={36} />
          </div>
          <h3>Thanh toán đã được xác nhận thành công!</h3>
          <p>Mã đơn hàng: <b>{order.orderCode}</b></p>
          <p>Vé điện tử e-Ticket kèm QR Code bảo mật đã sẵn sàng trong tài khoản của bạn.</p>
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

            {/* Voucher / Coupon Section */}
            {!holding && (
              <div className="voucher-box-section">
                <div className="voucher-header">
                  <Tag size={15} />
                  <span>Mã Giảm Giá / Voucher</span>
                </div>
                <div className="voucher-input-row">
                  <input
                    type="text"
                    placeholder="VD: NOVA20, CINEMA10..."
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  />
                  <button
                    type="button"
                    className="button button-glass"
                    onClick={applyCoupon}
                  >
                    Áp dụng
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="applied-voucher-badge">
                    <span>
                      <Sparkles size={14} /> <b>{appliedCoupon.code}</b> ({appliedCoupon.desc})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedCoupon(null)}
                      title="Gỡ mã"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="voucher-quick-tags">
                  <small>Gợi ý mã hot:</small>
                  {PROMO_COUPONS.map((cp) => (
                    <button
                      key={cp.code}
                      type="button"
                      className={`v-tag ${appliedCoupon?.code === cp.code ? "active" : ""}`}
                      onClick={() => {
                        setCouponInput(cp.code);
                        setAppliedCoupon(cp);
                      }}
                    >
                      {cp.code}
                    </button>
                  ))}
                </div>
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

                {/* Real Payment Methods UI */}
                <div className="payment-options-panel">
                  <h4>Chọn Cổng Thanh Toán:</h4>
                  <div className="pay-method-tabs">
                    <button
                      type="button"
                      className={`pay-tab-btn ${payMethod === "vietqr" ? "active" : ""}`}
                      onClick={() => setPayMethod("vietqr")}
                    >
                      <QrCode size={15} /> VietQR (Napas)
                    </button>
                    <button
                      type="button"
                      className={`pay-tab-btn ${payMethod === "momo" ? "active" : ""}`}
                      onClick={() => setPayMethod("momo")}
                    >
                      <Smartphone size={15} /> MoMo
                    </button>
                    <button
                      type="button"
                      className={`pay-tab-btn ${payMethod === "vnpay" ? "active" : ""}`}
                      onClick={() => setPayMethod("vnpay")}
                    >
                      <CreditCard size={15} /> VNPAY
                    </button>
                    <button
                      type="button"
                      className={`pay-tab-btn ${payMethod === "sandbox" ? "active" : ""}`}
                      onClick={() => setPayMethod("sandbox")}
                    >
                      <ShieldCheck size={15} /> Sandbox
                    </button>
                  </div>

                  {payMethod === "vietqr" && (
                    <div className="vietqr-box">
                      <div className="vietqr-preview">
                        <img
                          src={`https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${Math.round(Number(order.finalAmount))}&addInfo=${order.orderCode}&accountName=NOVA%20CINEMA%20VIETNAM`}
                          alt="VietQR Napas 24/7"
                          className="vietqr-img"
                        />
                        <span className="vietqr-scan-label">
                          Quét mã bằng app ngân hàng (MB, VCB, Techcombank...)
                        </span>
                      </div>

                      <div className="vietqr-bank-details">
                        <div className="vq-detail-row">
                          <span>Ngân hàng:</span>
                          <b>MBBank (Ngân Hàng Quân Đội)</b>
                        </div>
                        <div className="vq-detail-row">
                          <span>Số tài khoản:</span>
                          <div className="vq-copy-wrap">
                            <code>0987654321</code>
                            <button
                              type="button"
                              onClick={() => copyText("0987654321", "stk")}
                              title="Sao chép"
                            >
                              {copiedKey === "stk" ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                        <div className="vq-detail-row">
                          <span>Chủ tài khoản:</span>
                          <b>NOVA CINEMA VIETNAM</b>
                        </div>
                        <div className="vq-detail-row">
                          <span>Số tiền:</span>
                          <div className="vq-copy-wrap">
                            <strong className="text-gold">{money(order.finalAmount)}</strong>
                            <button
                              type="button"
                              onClick={() => copyText(String(Math.round(Number(order.finalAmount))), "amt")}
                              title="Sao chép"
                            >
                              {copiedKey === "amt" ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                        <div className="vq-detail-row">
                          <span>Nội dung CK:</span>
                          <div className="vq-copy-wrap">
                            <code>{order.orderCode}</code>
                            <button
                              type="button"
                              onClick={() => copyText(order.orderCode, "memo")}
                              title="Sao chép"
                            >
                              {copiedKey === "memo" ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        className="button button-primary checkout-btn-pulse"
                        disabled={busy || !remaining}
                        onClick={handleInstantPay}
                      >
                        {busy ? "Đang xác thực giao dịch…" : "Xác nhận đã chuyển khoản VietQR"}
                      </button>
                    </div>
                  )}

                  {payMethod === "momo" && (
                    <div className="vietqr-box momo-theme">
                      <div className="vietqr-preview">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=2|99|0987654321|NOVA%20CINEMA||0|0|${Math.round(Number(order.finalAmount))}|${order.orderCode}|transfer_p2p`}
                          alt="MoMo QR"
                          className="vietqr-img"
                        />
                        <span className="vietqr-scan-label">
                          Mở ứng dụng MoMo để quét mã thanh toán
                        </span>
                      </div>
                      <button
                        className="button button-primary momo-theme-btn"
                        disabled={busy || !remaining}
                        onClick={handleInstantPay}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận đã thanh toán MoMo"}
                      </button>
                    </div>
                  )}

                  {payMethod === "vnpay" && (
                    <div className="vietqr-box vnpay-theme">
                      <div className="vietqr-preview">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://vnpay.vn/pay?code=${order.orderCode}%26amount=${Math.round(Number(order.finalAmount))}`}
                          alt="VNPAY QR"
                          className="vietqr-img"
                        />
                        <span className="vietqr-scan-label">
                          Hỗ trợ ví VNPAY và 40+ ứng dụng ngân hàng liên kết
                        </span>
                      </div>
                      <button
                        className="button button-primary vnpay-theme-btn"
                        disabled={busy || !remaining}
                        onClick={handleInstantPay}
                      >
                        {busy ? "Đang xử lý…" : "Xác nhận đã thanh toán VNPAY"}
                      </button>
                    </div>
                  )}

                  {payMethod === "sandbox" && (
                    <div className="sandbox-panel-box">
                      <p className="small muted">
                        Chuyển hướng sang trang kiểm thử Sandbox mô phỏng kết quả đơn hàng.
                      </p>
                      <button
                        className="button button-primary checkout-btn-pulse"
                        disabled={busy || !remaining}
                        onClick={checkout}
                      >
                        Thanh toán Sandbox
                      </button>
                    </div>
                  )}
                </div>

                {/* Keep Sandbox button always accessible for automated test runs */}
                {payMethod !== "sandbox" && (
                  <div className="sandbox-fallback-row">
                    <small>Môi trường kiểm thử:</small>
                    <button
                      className="button button-outline button-small"
                      disabled={busy || !remaining}
                      onClick={checkout}
                    >
                      Thanh toán Sandbox
                    </button>
                  </div>
                )}

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
                    Boolean(orphanWarning) ||
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
