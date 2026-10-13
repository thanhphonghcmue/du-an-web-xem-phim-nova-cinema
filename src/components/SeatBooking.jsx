import { useEffect, useState } from "react";
import {
  Check,
  Clock3,
  Download,
  Minus,
  Plus,
  Popcorn,
  ShieldCheck,
  Ticket,
  UsersRound,
} from "lucide-react";
import QRCode from "qrcode";
import Modal from "./Modal.jsx";
import {
  HOLD_MS,
  seats,
  rows,
  readSeats,
  updateSeats,
  ownSeats,
  findGroup,
} from "../bookingStore.js";
import { money } from "../data.js";

export default function SeatBooking({ booking, member, onClose, onTicket }) {
  const { movie, cinema, date, time, group, combo: initialCombo } = booking;
  const showId = [cinema.id, movie.id, date.id, time.id].join("|");
  const [owner] = useState(() => crypto.randomUUID());
  const [data, setData] = useState(() => readSeats(showId));
  const [now, setNow] = useState(Date.now);
  const [combo, setCombo] = useState(initialCombo ? 1 : 0);
  const [count, setCount] = useState(4);
  const [notice, setNotice] = useState("");
  const [stage, setStage] = useState("seats");
  const [method, setMethod] = useState("MoMo");
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState(null);
  const chosen = ownSeats(data, owner);
  const expires = chosen.length ? data[chosen[0]].expires : 0;
  const remaining = expires
    ? Math.max(0, Math.ceil((expires - now) / 1000))
    : 300;
  const seatTotal = seats
    .filter((s) => chosen.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);
  const discount = member ? Math.round(seatTotal * 0.05) : 0;
  const total = seatTotal + combo * 69000 - discount;
  useEffect(() => {
    const refresh = () => {
      setData(readSeats(showId));
      setNow(Date.now());
    };
    const timer = setInterval(refresh, 1000);
    window.addEventListener("storage", refresh);
    window.addEventListener("nova-seats", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("nova-seats", refresh);
    };
  }, [showId]);
  async function release(message = "") {
    await updateSeats(showId, (current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, s]) => s.owner !== owner),
      ),
    );
    setStage("seats");
    setNotice(message);
  }
  async function close() {
    await release();
    onClose();
  }
  async function toggleSeat(seat) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await updateSeats(showId, (current) => {
        const pair =
          seat.type === "sweet"
            ? [
                seat.id,
                `H${seat.number % 2 ? seat.number + 1 : seat.number - 1}`,
              ]
            : [seat.id];
        if (pair.every((id) => current[id]?.owner === owner)) {
          const next = { ...current };
          pair.forEach((id) => delete next[id]);
          return next;
        }
        if (pair.some((id) => current[id]))
          throw Error(
            "Ghế vừa được giữ hoặc đã bán. Vui lòng chọn vị trí khác.",
          );
        const own = ownSeats(current, owner);
        if (own.length + pair.length > 20)
          throw Error("Mỗi đơn đặt tối đa 20 ghế.");
        const deadline = own.length
          ? current[own[0]].expires
          : Date.now() + HOLD_MS;
        const next = { ...current };
        pair.forEach((id) => {
          next[id] = { status: "held", owner, expires: deadline };
        });
        return next;
      });
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function selectGroup() {
    setBusy(true);
    setNotice("");
    try {
      await updateSeats(showId, (current) => {
        const emptyOwn = Object.fromEntries(
          Object.entries(current).filter(([, s]) => s.owner !== owner),
        );
        const ids = findGroup(emptyOwn, count);
        if (!ids)
          throw Error(
            `Không có ${count} ghế liền nhau. Hãy giảm số người hoặc chọn suất khác.`,
          );
        const previous = ownSeats(current, owner);
        const expires = previous.length
          ? current[previous[0]].expires
          : Date.now() + HOLD_MS;
        ids.forEach((id) => {
          emptyOwn[id] = { status: "held", owner, expires };
        });
        return emptyOwn;
      });
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    setNotice("");
    const latest = readSeats(showId);
    const ids = ownSeats(latest, owner);
    if (!ids.length) {
      setBusy(false);
      setStage("seats");
      setNotice("Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.");
      return;
    }
    const code = `NOVA-${crypto.randomUUID()}`;
    try {
      const qr = await QRCode.toDataURL(
        JSON.stringify({ ticket: code, show: showId, seats: ids }),
        { width: 280, margin: 2, color: { dark: "#0B0E14", light: "#FFFFFF" } },
      );
      await updateSeats(showId, (current) => {
        if (
          !ids.every(
            (id) =>
              current[id]?.owner === owner && current[id].expires > Date.now(),
          )
        )
          throw Error("Ghế đã hết thời gian giữ. Vui lòng chọn lại.");
        const next = { ...current };
        ids.forEach((id) => {
          next[id] = { status: "sold", ticket: code };
        });
        return next;
      });
      const result = {
        code,
        qr,
        movie: movie.title,
        cinema: cinema.name,
        date: date.label,
        time: time.label,
        seats: ids,
        total,
        combo,
        method,
        created: new Date().toISOString(),
      };
      const history = JSON.parse(localStorage.getItem("nova-tickets") || "[]");
      localStorage.setItem(
        "nova-tickets",
        JSON.stringify([...history, result]),
      );
      setTicket(result);
      setStage("success");
      onTicket(result);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  const blockedPayment = !chosen.length || (expires && now >= expires);
  return (
    <Modal
      title={
        stage === "success"
          ? "Hẹn gặp bạn tại rạp!"
          : stage === "payment"
            ? "Hoàn tất trải nghiệm"
            : "Chọn vị trí của bạn"
      }
      onClose={close}
      wide
    >
      {stage === "success" ? (
        <div className="ticket-success">
          <div className="success-mark">
            <Check size={30} />
          </div>
          <span className="eyebrow">ĐẶT VÉ MÔ PHỎNG THÀNH CÔNG</span>
          <h3>{ticket.movie}</h3>
          <p>
            {ticket.cinema} · {ticket.date} · {ticket.time}
          </p>
          <img
            className="ticket-qr"
            src={ticket.qr}
            alt={`Mã QR vé ${ticket.code}`}
          />
          <p className="ticket-seats">
            GHẾ {ticket.seats.join(", ")} · {money(ticket.total)}
          </p>
          <code>{ticket.code}</code>
          <p className="muted small">
            Vé demo dùng cho đồ án, không có giá trị check-in tại rạp thật.
          </p>
          <a
            className="button button-gold"
            href={ticket.qr}
            download={`${ticket.code}.png`}
          >
            <Download size={17} /> Tải mã QR
          </a>
        </div>
      ) : (
        <>
          <div className="booking-context">
            <img src={movie.poster} alt="" />
            <div>
              <h3>{movie.title}</h3>
              <p>{cinema.name} · Phòng Infinity 01</p>
              <span>
                {date.label} · {time.label} · {movie.age}
              </span>
            </div>
            <div className={`hold-timer ${remaining < 60 ? "urgent" : ""}`}>
              <Clock3 size={17} />
              <div>
                <small>
                  {chosen.length ? "Ghế được giữ trong" : "Thời gian giữ ghế"}
                </small>
                <strong>
                  {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                  {String(remaining % 60).padStart(2, "0")}
                </strong>
              </div>
            </div>
          </div>
          <p className="sandbox-note">
            <ShieldCheck size={15} /> Mô phỏng Sandbox · Trạng thái ghế đồng bộ
            giữa các tab trên cùng trình duyệt.
          </p>
          <div className="checkout-layout">
            <div className="seat-area">
              {stage === "seats" ? (
                <>
                  {group && (
                    <div className="group-picker">
                      <UsersRound size={20} />
                      <div>
                        <strong>Cả nhóm, ngồi cùng nhau.</strong>
                        <small>
                          Tự động chọn một dải ghế liền kề, tối đa 20 ghế.
                        </small>
                      </div>
                      <label className="sr-only" htmlFor="group-count">
                        Số người trong nhóm
                      </label>
                      <select
                        id="group-count"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                      >
                        {Array.from({ length: 19 }, (_, i) => (
                          <option value={i + 2} key={i}>
                            {i + 2} người
                          </option>
                        ))}
                      </select>
                      <button
                        className="button button-gold"
                        onClick={selectGroup}
                        disabled={busy}
                      >
                        Xếp ghế
                      </button>
                    </div>
                  )}
                  <div className="seat-map-scroll">
                    <div className="seat-map">
                      <div className="curved-screen" />
                      <p className="screen-label">MÀN HÌNH / INFINITY SCREEN</p>
                      {rows.map((row) => (
                        <div className="seat-row" key={row}>
                          <span className="row-label">{row}</span>
                          {seats
                            .filter((s) => s.row === row)
                            .map((seat) => {
                              const record = data[seat.id];
                              const state =
                                record?.owner === owner
                                  ? "selected"
                                  : record?.status || seat.type;
                              return (
                                <button
                                  key={seat.id}
                                  className={`seat ${state} ${seat.type === "sweet" ? "sweet-shape" : ""}`}
                                  disabled={
                                    (!!record && record.owner !== owner) || busy
                                  }
                                  onClick={() => toggleSeat(seat)}
                                  aria-label={`Ghế ${seat.id}, ${state === "selected" ? "đang chọn" : state === "sold" ? "đã bán" : state === "held" ? "đang giữ" : seat.type === "vip" ? "VIP" : seat.type === "sweet" ? "Sweetbox đôi" : "thường"}`}
                                  aria-pressed={state === "selected"}
                                  title={`${seat.id} · ${money(seat.price)}`}
                                >
                                  {seat.number}
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
                      ["standard", "Thường · 90K"],
                      ["vip", "VIP · 120K"],
                      ["sweet", "Sweetbox · 220K/đôi"],
                      ["selected", "Bạn đang chọn"],
                      ["held", "Đang giữ"],
                      ["sold", "Đã bán"],
                    ].map(([c, l]) => (
                      <span key={c}>
                        <i className={c} />
                        {l}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="payment-section">
                  <span className="eyebrow">PHƯƠNG THỨC THANH TOÁN</span>
                  <h3>Một bước nữa đến màn ảnh lớn.</h3>
                  <p className="muted">
                    Chọn phương thức để thử luồng thanh toán. Không thu tiền
                    thật.
                  </p>
                  <div className="payment-methods">
                    {["MoMo", "VNPay", "Thẻ ngân hàng"].map((m) => (
                      <button
                        key={m}
                        className={method === m ? "active" : ""}
                        onClick={() => setMethod(m)}
                      >
                        <ShieldCheck size={20} />
                        {m}
                        {method === m && <Check size={17} />}
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setStage("seats")}
                  >
                    ← Quay lại chọn ghế
                  </button>
                  <button
                    className="payment-failure"
                    onClick={() =>
                      release(
                        "Thanh toán mô phỏng thất bại. Các ghế đã được giải phóng.",
                      )
                    }
                    disabled={busy}
                  >
                    Thử trường hợp thanh toán thất bại
                  </button>
                </div>
              )}
              {(notice || (stage === "payment" && blockedPayment)) && (
                <p role="alert" className="form-notice">
                  {notice ||
                    "Thời gian giữ ghế đã hết. Vui lòng quay lại chọn ghế."}
                </p>
              )}
            </div>
            <aside className="order-summary">
              <span className="eyebrow">TRẢI NGHIỆM CỦA BẠN</span>
              <h3>Tóm tắt đặt vé</h3>
              <div className="selected-seats">
                <Ticket size={17} />
                <span>
                  {chosen.length ? chosen.join(", ") : "Chưa chọn ghế"}
                </span>
              </div>
              <div className="summary-line">
                <span>{chosen.length} vé xem phim</span>
                <b>{money(seatTotal)}</b>
              </div>
              <div className="combo-picker">
                <Popcorn size={28} />
                <div>
                  <b>Party Combo</b>
                  <small>1 bắp + 2 nước · 69K</small>
                </div>
                <button
                  aria-label="Giảm combo"
                  className="icon-button"
                  onClick={() => setCombo(Math.max(0, combo - 1))}
                  disabled={!combo}
                >
                  <Minus size={14} />
                </button>
                <span>{combo}</span>
                <button
                  aria-label="Tăng combo"
                  className="icon-button"
                  onClick={() => setCombo(Math.min(10, combo + 1))}
                  disabled={combo >= 10}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="summary-line">
                <span>Bắp nước</span>
                <b>{money(combo * 69000)}</b>
              </div>
              <div className="summary-line">
                <span>C’MEMBER {member ? "−5% vé" : "(chưa đăng nhập)"}</span>
                <b>−{money(discount)}</b>
              </div>
              <p className="muted small">
                Ưu đãi và giá vé là dữ liệu minh họa của đồ án.
              </p>
              <div className="summary-total">
                <span>TỔNG THANH TOÁN</span>
                <strong>{money(total)}</strong>
              </div>
              <button
                className="button button-gold w-full"
                disabled={blockedPayment || busy}
                onClick={stage === "seats" ? () => setStage("payment") : pay}
              >
                {busy
                  ? "Đang xử lý…"
                  : stage === "seats"
                    ? "Tiếp tục thanh toán"
                    : "Thanh toán mô phỏng"}
                <Ticket size={17} />
              </button>
              <button
                className="text-button w-full"
                disabled={busy}
                onClick={close}
              >
                Hủy đặt vé & giải phóng ghế
              </button>
              <p className="secure-caption">
                <ShieldCheck size={13} /> Vé QR duy nhất sau mỗi giao dịch
              </p>
            </aside>
          </div>
        </>
      )}
    </Modal>
  );
}
