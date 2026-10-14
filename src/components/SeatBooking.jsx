import { useEffect, useState } from "react";
import {
  Crown,
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
import FoodArt from "./FoodArt.jsx";
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
import { useI18n } from "../i18n.js";

export default function SeatBooking({
  booking,
  member,
  onClose,
  onTicket,
  onMemberUpdate,
}) {
  const { language, t } = useI18n();
  const { movie, cinema, date, time, group, combo: initialCombo } = booking;
  const [reward, setReward] = useState(member ? "member" : "none");
  const [voucherInput, setVoucherInput] = useState(""),
    [voucherValid, setVoucherValid] = useState(false),
    [voucherNotice, setVoucherNotice] = useState("");
  const showId = [cinema.id, movie.id, date.id, time.id].join("|");
  const [owner] = useState(() => crypto.randomUUID());
  const [data, setData] = useState(() => readSeats(showId));
  const [now, setNow] = useState(Date.now);
  const [combo, setCombo] = useState(initialCombo ? 1 : 0);
  const [count, setCount] = useState(3);
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
  // Chỉ áp dụng một ưu đãi mỗi đơn: tránh cộng chồng điểm, voucher và giảm giá hội viên.
  const usedPoints =
    reward === "points"
      ? Math.min(member?.points || 0, Math.floor(seatTotal / 100))
      : 0;
  const discount =
    reward === "member" && member
      ? Math.round(seatTotal * 0.05)
      : reward === "points"
        ? usedPoints * 100
        : reward === "voucher" && voucherValid
          ? Math.min(30000, Math.round(seatTotal * 0.1))
          : 0;
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
  async function selectGroup(groupCount = count) {
    setBusy(true);
    setNotice("");
    try {
      await updateSeats(showId, (current) => {
        const emptyOwn = Object.fromEntries(
          Object.entries(current).filter(([, s]) => s.owner !== owner),
        );
        const ids = findGroup(emptyOwn, groupCount);
        if (!ids)
          throw Error(
            `Không có ${groupCount} ghế liền nhau. Hãy giảm số người hoặc chọn suất khác.`,
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
      if (member)
        onMemberUpdate?.({
          ...member,
          points: (member.points || 0) - usedPoints + Math.floor(total / 1000),
        });
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
          ? t("Hẹn gặp bạn tại rạp!")
          : stage === "payment"
            ? t("Hoàn tất trải nghiệm")
            : stage === "combo"
              ? t("Combo & Ưu đãi")
              : t("Chọn vị trí của bạn")
      }
      onClose={close}
      wide
    >
      {stage !== "success" && (
        <div className="flow-stepper">
          {["Chọn Rạp & Suất", "Chọn Ghế", "Combo & Ưu đãi", "Thanh toán"].map(
            (label, i) => {
              const current = stage === "seats" ? 1 : stage === "combo" ? 2 : 3;
              return (
                <button
                  key={label}
                  disabled={busy || i > current}
                  className={
                    i === current ? "active" : i < current ? "done" : ""
                  }
                  onClick={() =>
                    i === 0
                      ? close()
                      : setStage(["", "seats", "combo", "payment"][i])
                  }
                >
                  <span>{i < current ? <Check size={13} /> : i + 1}</span>
                  {t(label)}
                </button>
              );
            },
          )}
        </div>
      )}
      {stage === "success" ? (
        <div className="ticket-success">
          <div className="success-mark">
            <Check size={30} />
          </div>
          <span className="eyebrow">
            {language === "en"
              ? "DEMO BOOKING CONFIRMED"
              : "ĐẶT VÉ MÔ PHỎNG THÀNH CÔNG"}
          </span>
          <h3>{ticket.movie}</h3>
          <p>
            {ticket.cinema} · {ticket.date} · {ticket.time}
          </p>
          <img
            className="ticket-qr"
            src={ticket.qr}
            alt={`QR ${ticket.code}`}
          />
          <p className="ticket-seats">
            {language === "en" ? "SEATS" : "GHẾ"} {ticket.seats.join(", ")} ·{" "}
            {money(ticket.total)}
          </p>
          <code>{ticket.code}</code>
          <p className="muted small">
            {language === "en"
              ? "Demo ticket only. Not valid for entry to a real cinema."
              : "Vé demo dùng cho đồ án, không có giá trị check-in tại rạp thật."}
          </p>
          <a
            className="button button-primary"
            href={ticket.qr}
            download={`${ticket.code}.png`}
          >
            <Download size={17} />
            {t("Tải QR")}
          </a>
        </div>
      ) : (
        <>
          <div className="booking-context">
            <div>
              <h3>{language === "en" ? movie.original : movie.title}</h3>
              <p>
                {cinema.name} · {time.room || "INFINITY HALL 01"}
              </p>
              <span>
                {date.label} · {time.label} · {movie.age}
              </span>
            </div>
            <div className={`hold-timer ${remaining < 60 ? "urgent" : ""}`}>
              <Clock3 size={18} />
              <div>
                <small>
                  {language === "en"
                    ? "Your seats are held safely"
                    : "Giữ ghế an toàn trong"}
                </small>
                <strong>
                  {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                  {String(remaining % 60).padStart(2, "0")}
                </strong>
              </div>
            </div>
          </div>
          <p className="sandbox-note">
            <ShieldCheck size={15} />
            {language === "en"
              ? "Sandbox demo · Seat status syncs across tabs on this device."
              : "Mô phỏng Sandbox · Trạng thái ghế đồng bộ giữa các tab trên thiết bị này."}
          </p>
          <div className="checkout-layout">
            <div className="seat-area">
              {stage === "seats" ? (
                <>
                  <div className="seat-helper">
                    <div>
                      <UsersRound size={20} />
                      <span>
                        {language === "en"
                          ? "Good company. Great seats."
                          : "Cùng bạn bè. Cùng hàng ghế."}
                      </span>
                    </div>
                    <button
                      className="button button-glass"
                      onClick={() => selectGroup(3)}
                      disabled={busy}
                    >
                      {t("Chọn nhanh 3 ghế liền nhau")}
                    </button>
                  </div>
                  {group && (
                    <div className="group-picker">
                      <UsersRound size={20} />
                      <div>
                        <strong>
                          {language === "en"
                            ? "Everyone, together."
                            : "Cả nhóm, ngồi cùng nhau."}
                        </strong>
                        <small>
                          {language === "en"
                            ? "One continuous row, up to 20 people."
                            : "Tự động chọn một dải ghế liền kề, tối đa 20 ghế."}
                        </small>
                      </div>
                      <label className="sr-only" htmlFor="group-count">
                        {t("Số người trong nhóm")}
                      </label>
                      <select
                        id="group-count"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                      >
                        {Array.from({ length: 19 }, (_, i) => (
                          <option value={i + 2} key={i}>
                            {i + 2} {language === "en" ? "people" : "người"}
                          </option>
                        ))}
                      </select>
                      <button
                        className="button button-primary"
                        onClick={() => selectGroup()}
                        disabled={busy}
                      >
                        {t("Xếp ghế")}
                      </button>
                    </div>
                  )}
                  <div className="seat-map-scroll">
                    <div className="seat-map">
                      <div className="curved-screen" />
                      <p className="screen-label">INFINITY / IMAX SCREEN</p>
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
                              const stateText =
                                state === "selected"
                                  ? language === "en"
                                    ? "selected"
                                    : "đang chọn"
                                  : state === "sold"
                                    ? language === "en"
                                      ? "sold"
                                      : "đã bán"
                                    : state === "held"
                                      ? language === "en"
                                        ? "held"
                                        : "đang giữ"
                                      : seat.type === "vip"
                                        ? "VIP"
                                        : seat.type === "sweet"
                                          ? language === "en"
                                            ? "Sweetbox pair"
                                            : "Sweetbox đôi"
                                          : language === "en"
                                            ? "standard"
                                            : "thường";
                              return (
                                <button
                                  key={seat.id}
                                  className={`seat ${state} ${seat.type === "sweet" ? "sweet-shape" : ""}`}
                                  disabled={
                                    (!!record && record.owner !== owner) || busy
                                  }
                                  onClick={() => toggleSeat(seat)}
                                  aria-label={`${language === "en" ? "Seat" : "Ghế"} ${seat.id}, ${stateText}`}
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
                      [
                        "standard",
                        language === "en" ? "Standard · 90K" : "Thường · 90K",
                      ],
                      ["vip", "VIP · 120K"],
                      [
                        "sweet",
                        language === "en"
                          ? "Sweetbox · 220K/pair"
                          : "Sweetbox · 220K/đôi",
                      ],
                      [
                        "available",
                        language === "en" ? "Available" : "Còn trống",
                      ],
                      [
                        "selected",
                        language === "en" ? "Selected" : "Bạn đang chọn",
                      ],
                      [
                        "held",
                        language === "en"
                          ? "Held by others"
                          : "Người khác đang giữ",
                      ],
                      ["sold", language === "en" ? "Sold" : "Đã bán"],
                    ].map(([c, l]) => (
                      <span key={c}>
                        <i className={c} />
                        {l}
                      </span>
                    ))}
                  </div>
                </>
              ) : stage === "combo" ? (
                <div className="addons-step">
                  <p className="eyebrow">THE PERFECT MOVIE PAIRING</p>
                  <h3>
                    {language === "en"
                      ? "Make a great film even better."
                      : "Thêm chút ngon. Trọn niềm vui."}
                  </h3>
                  <div className="checkout-combo-card">
                    <FoodArt />
                    <div>
                      <span className="coral-tag">PARTY COMBO 69K</span>
                      <h4>
                        {language === "en"
                          ? "Share the good times."
                          : "Chia sẻ vị ngon."}
                      </h4>
                      <p>
                        {language === "en"
                          ? "1 large popcorn + 2 ice-cold drinks"
                          : "1 bắp lớn + 2 ly mát lạnh"}
                      </p>
                      <strong>{money(69000)}</strong>
                      <button
                        className="button button-primary"
                        disabled={combo >= 10}
                        onClick={() => setCombo(Math.min(10, combo + 1))}
                      >
                        <Plus size={16} />
                        {language === "en"
                          ? "Add combo to tickets"
                          : "Thêm Combo vào vé"}
                      </button>
                    </div>
                  </div>
                  <div className="reward-options">
                    <div>
                      <Crown size={22} />
                      <h4>
                        C’MEMBER /{" "}
                        {language === "en"
                          ? "YOUR REWARDS"
                          : "ĐẶC QUYỀN CỦA BẠN"}
                      </h4>
                    </div>
                    <p>
                      {language === "en"
                        ? "Choose one reward. Your total updates instantly."
                        : "Chọn một ưu đãi. Tổng tiền cập nhật ngay."}
                    </p>
                    {[
                      [
                        "none",
                        language === "en"
                          ? "No discount"
                          : "Không áp dụng ưu đãi",
                        false,
                      ],
                      [
                        "member",
                        language === "en"
                          ? "C’MEMBER · 5% off tickets"
                          : "C’MEMBER · Giảm 5% tiền vé",
                        !member,
                      ],
                      [
                        "points",
                        language === "en"
                          ? `Use ${member?.points || 0} demo points`
                          : `Dùng ${member?.points || 0} điểm demo`,
                        !member?.points,
                      ],
                      [
                        "voucher",
                        language === "en"
                          ? "Apply a promotion code"
                          : "Áp dụng mã ưu đãi",
                        false,
                      ],
                    ].map(([id, label, disabled]) => (
                      <label key={id} className={reward === id ? "active" : ""}>
                        <input
                          type="radio"
                          name="reward"
                          value={id}
                          checked={reward === id}
                          disabled={disabled}
                          onChange={() => setReward(id)}
                        />
                        <span>{label}</span>
                        {disabled && (
                          <small>
                            {language === "en"
                              ? "Not available"
                              : "Chưa đủ điều kiện"}
                          </small>
                        )}
                      </label>
                    ))}
                    {reward === "voucher" && (
                      <div className="voucher-input">
                        <label className="sr-only" htmlFor="voucher-code">
                          {language === "en" ? "Voucher code" : "Mã ưu đãi"}
                        </label>
                        <input
                          id="voucher-code"
                          value={voucherInput}
                          onChange={(e) => {
                            setVoucherInput(e.target.value.toUpperCase());
                            setVoucherValid(false);
                            setVoucherNotice("");
                          }}
                          placeholder="NOVA10"
                        />
                        <button
                          className="button button-glass"
                          onClick={() => {
                            const valid = voucherInput.trim() === "NOVA10";
                            setVoucherValid(valid);
                            setVoucherNotice(
                              valid
                                ? language === "en"
                                  ? "10% off tickets, up to 30,000đ."
                                  : "Giảm 10% tiền vé, tối đa 30.000đ."
                                : language === "en"
                                  ? "This demo accepts NOVA10 only."
                                  : "Mã chưa hợp lệ. Dùng mã demo NOVA10.",
                            );
                          }}
                        >
                          {language === "en" ? "Apply" : "Áp dụng"}
                        </button>
                        <p role="status">{voucherNotice}</p>
                      </div>
                    )}
                    <small>
                      {language === "en"
                        ? "Demo: 1 point = 100đ; points and discounts apply to tickets only."
                        : "Demo: 1 điểm = 100đ; điểm và giảm giá chỉ áp dụng tiền vé."}
                    </small>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setStage("seats")}
                  >
                    ← {t("Quay lại chọn ghế")}
                  </button>
                </div>
              ) : (
                <div className="payment-section">
                  <span className="eyebrow">
                    {language === "en"
                      ? "PAYMENT METHOD"
                      : "PHƯƠNG THỨC THANH TOÁN"}
                  </span>
                  <h3>
                    {language === "en"
                      ? "One step from the big screen."
                      : "Một bước nữa đến màn ảnh lớn."}
                  </h3>
                  <p className="muted">
                    {language === "en"
                      ? "Choose a Sandbox method. No money is charged."
                      : "Chọn phương thức để thử luồng thanh toán. Không thu tiền thật."}
                  </p>
                  <div className="payment-methods">
                    {["MoMo", "ZaloPay", "Visa / Mastercard"].map((m) => (
                      <button
                        key={m}
                        className={method === m ? "active" : ""}
                        onClick={() => setMethod(m)}
                      >
                        <ShieldCheck size={20} />
                        {m}
                        <small>Sandbox</small>
                        {method === m && <Check size={17} />}
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setStage("combo")}
                  >
                    ← {t("Combo & Ưu đãi")}
                  </button>
                  <button
                    className="payment-failure"
                    onClick={() =>
                      release(
                        language === "en"
                          ? "Demo payment failed. Your seats have been released."
                          : "Thanh toán mô phỏng thất bại. Các ghế đã được giải phóng.",
                      )
                    }
                    disabled={busy}
                  >
                    {language === "en"
                      ? "Test payment failure"
                      : "Thử trường hợp thanh toán thất bại"}
                  </button>
                </div>
              )}
              {(notice || (stage !== "seats" && blockedPayment)) && (
                <p role="alert" className="form-notice">
                  {notice ||
                    (language === "en"
                      ? "Your seat hold expired. Please select seats again."
                      : "Thời gian giữ ghế đã hết. Vui lòng quay lại chọn ghế.")}
                </p>
              )}
            </div>
            <aside className="order-summary">
              <div className="summary-film">
                <img src={movie.localPoster || movie.poster} alt="" />
                <div>
                  <span className="eyebrow">YOUR MOVIE NIGHT</span>
                  <h3>{language === "en" ? movie.original : movie.title}</h3>
                  <p>{cinema.name}</p>
                  <small>
                    {time.room || "INFINITY HALL 01"} · {movie.age}
                  </small>
                </div>
              </div>
              <p className="summary-show">
                {date.label}
                <br />
                <b>{time.label}</b>
              </p>
              <div className="selected-seats">
                <Ticket size={17} />
                <span>
                  {chosen.length ? chosen.join(", ") : t("Chưa chọn ghế")}
                </span>
              </div>
              <div className="summary-line">
                <span>
                  {chosen.length}{" "}
                  {language === "en" ? "movie tickets" : "vé xem phim"}
                </span>
                <b>{money(seatTotal)}</b>
              </div>
              <div className="combo-picker">
                <Popcorn size={28} />
                <div>
                  <b>Party Combo</b>
                  <small>69K / combo</small>
                </div>
                <button
                  aria-label={t("Giảm combo")}
                  className="icon-button"
                  onClick={() => setCombo(Math.max(0, combo - 1))}
                  disabled={!combo}
                >
                  <Minus size={14} />
                </button>
                <span>{combo}</span>
                <button
                  aria-label={t("Tăng combo")}
                  className="icon-button"
                  onClick={() => setCombo(Math.min(10, combo + 1))}
                  disabled={combo >= 10}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="summary-line">
                <span>{t("Bắp nước")}</span>
                <b>{money(combo * 69000)}</b>
              </div>
              <div className="summary-line">
                <span>
                  {reward === "member"
                    ? "C’MEMBER −5%"
                    : reward === "points"
                      ? language === "en"
                        ? "Reward points"
                        : "Điểm thưởng"
                      : reward === "voucher"
                        ? "NOVA10"
                        : language === "en"
                          ? "Discount"
                          : "Ưu đãi"}
                </span>
                <b>−{money(discount)}</b>
              </div>
              <div className="summary-total">
                <span>{t("TỔNG THANH TOÁN")}</span>
                <strong>{money(total)}</strong>
              </div>
              <button
                className="button button-primary w-full"
                disabled={blockedPayment || busy}
                onClick={
                  stage === "seats"
                    ? () => setStage("combo")
                    : stage === "combo"
                      ? () => setStage("payment")
                      : pay
                }
              >
                {busy
                  ? t("Đang xử lý…")
                  : stage === "seats"
                    ? t("Tiếp tục chọn combo")
                    : stage === "combo"
                      ? t("Tiếp tục thanh toán")
                      : t("Thanh toán mô phỏng")}
                <Ticket size={17} />
              </button>
              <button
                className="text-button w-full"
                disabled={busy}
                onClick={close}
              >
                {t("Hủy đặt vé & giải phóng ghế")}
              </button>
              <p className="secure-caption">
                <ShieldCheck size={13} />
                {language === "en"
                  ? "Secure 5-minute hold · Demo QR ticket"
                  : "Giữ ghế 5 phút · Vé QR mô phỏng"}
              </p>
            </aside>
          </div>
        </>
      )}
    </Modal>
  );
}
