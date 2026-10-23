// ChonGhe_Va_ThanhToan: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/SeatBooking.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Mô-đun Chọn Ghế, Giữ Chỗ & Thanh Toán Toàn Diện (Interactive Seat Booking & Checkout Modal).
 *   - Đây là trái tim của quy trình đặt vé xem phim điện ảnh:
 *     1. SƠ ĐỒ GHẾ VÔ CỰC: Hiển thị trực quan 160 ghế với các loại (Standard, VIP, Sweetbox đôi).
 *     2. THỜI GIAN THỰC (REALTIME SSE): Nhận thông báo khóa/bán ghế từ khán giả khác ngay lập tức.
 *     3. LUẬT BẢO VỆ GHẾ ĐƠN (ORPHAN SEAT CHECK): Ngăn chặn để lại ghế trống đơn lẻ lẻ loi.
 *     4. TUÂN THỦ KIỂM DUYỆT ĐỘ TUỔI (AGE RATING MODAL): Bắt buộc xác nhận độ tuổi T13, T16, T18 theo Thông tư 05/2023/TT-BVHTTDL.
 *     5. ĐỒNG HỒ GIỮ GHẾ 5 PHÚT (HOLD TIMER): Đếm ngược chính xác, tự hủy đơn và nhả ghế khi hết hạn.
 *     6. ĐỘNG CƠ GIẢM GIÁ & TÍCH ĐIỂM: Áp dụng mã Coupon (NOVA20, CINEMA10, U22...) và đổi điểm C'MEMBER (1 điểm = 1.000đ).
 *     7. CỔNG THANH TOÁN ĐA DẠNG: Quét mã VietQR chuyển khoản ngân hàng, Ví MoMo, VNPay, và Sandbox Test 1-chạm.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW STEP-BY-STEP):
 *   - Bước 1: Mở modal -> Kết nối SSE `/api/seat-events/[id]` và tải snapshot sơ đồ ghế từ Backend.
 *   - Bước 2: Khán giả click chọn từng ghế hoặc chọn nhanh cụm 1-20 ghế liền nhau.
 *   - Bước 3: Kiểm tra luật Orphan Seat phía Client ngay khi chọn; cảnh báo nếu vi phạm.
 *   - Bước 4: Khán giả thêm số lượng combo bắp nước nếu có nhu cầu.
 *   - Bước 5: Bấm "Giữ ghế an toàn 5 phút" -> Kiểm tra đăng nhập -> Gửi `apiHoldSeats` lên server với `Idempotency-Key`.
 *   - Bước 6: Nhận mã đơn hàng (orderCode) và hạn hết giờ -> Bắt đầu đếm ngược 5 phút.
 *   - Bước 7: Chọn phương thức thanh toán (VietQR / MoMo / VNPay / Sandbox) -> Áp dụng mã giảm giá / Đổi điểm.
 *   - Bước 8: Bấm "Thanh toán" -> Nếu phim giới hạn tuổi: hiện AgeRatingModal yêu cầu cam kết mang CCCD/VNeID.
 *   - Bước 9: Chuyển sang Sandbox hoặc thanh toán mô phỏng thành công -> Phát hành vé điện tử có mã QR.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng đặt vé xem phim.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tích hợp WebRTC camera quét mã vạch thẻ quà tặng / voucher giấy tại quầy.
 *   - Hỗ trợ thanh toán Apple Pay và Google Pay trực tiếp qua Web Payments API.
 *   - Gửi tin nhắn SMS / Zalo ZNS kèm link vé QR ngay khi thanh toán thành công.
 * ==============================================================================
 */

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
  ShieldAlert,
  Coins,
} from "lucide-react";
import Modal from "./Modal.jsx";
import { useCatalog } from "../catalog.js";
import { money } from "../data.js";
import { menuDetails } from "../commerce.js";
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

function getAgeRestriction(ageRating) {
  const str = String(ageRating || "")
    .trim()
    .toUpperCase();
  if (str.includes("18") || str === "T18" || str === "C18") {
    return {
      code: "T18",
      age: 18,
      name: "Phim dành cho khán giả từ đủ 18 tuổi trở lên (18+)",
      tagText: "T18 · Đủ 18 tuổi",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.35)",
      shortNotice:
        "Phim giới hạn độ tuổi T18 (18+). Bắt buộc xuất trình CCCD/VNeID tại cửa phòng chiếu.",
    };
  }
  if (str.includes("16") || str === "T16" || str === "C16") {
    return {
      code: "T16",
      age: 16,
      name: "Phim dành cho khán giả từ đủ 16 tuổi trở lên (16+)",
      tagText: "T16 · Đủ 16 tuổi",
      color: "#f97316",
      bg: "rgba(249, 115, 22, 0.12)",
      border: "rgba(249, 115, 22, 0.35)",
      shortNotice:
        "Phim giới hạn độ tuổi T16 (16+). Bắt buộc xuất trình CCCD/VNeID tại cửa phòng chiếu.",
    };
  }
  if (str.includes("13") || str === "T13" || str === "C13") {
    return {
      code: "T13",
      age: 13,
      name: "Phim dành cho khán giả từ đủ 13 tuổi trở lên (13+)",
      tagText: "T13 · Đủ 13 tuổi",
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.12)",
      border: "rgba(234, 179, 8, 0.35)",
      shortNotice:
        "Phim giới hạn độ tuổi T13 (13+). Vui lòng mang giấy tờ chứng minh độ tuổi.",
    };
  }
  return null;
}

function AgeRatingModal({ ageInfo, movieTitle, onConfirm, onCancel }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="age-modal-backdrop" onClick={onCancel}>
      <div className="age-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          className="age-modal-header"
          style={{ borderColor: ageInfo.border }}
        >
          <div
            className="age-modal-icon-wrap"
            style={{ background: ageInfo.bg, color: ageInfo.color }}
          >
            <ShieldAlert size={28} />
          </div>
          <div>
            <div
              className="age-modal-tag"
              style={{ background: ageInfo.color }}
            >
              {ageInfo.code}
            </div>
            <h3>Xác Nhận Độ Tuổi Khán Giả</h3>
            <p className="age-modal-sub">
              Quy chuẩn kiểm duyệt Điện ảnh Việt Nam
            </p>
          </div>
        </div>

        <div className="age-modal-body">
          <div className="age-film-box">
            <span>Phim:</span> <b>{movieTitle}</b>
          </div>

          <div className="age-law-quote">
            <p>
              Theo <b>Thông tư 05/2023/TT-BVHTTDL</b> của Bộ Văn hóa, Thể thao
              và Du lịch:
            </p>
            <p className="age-rule-highlight" style={{ color: ageInfo.color }}>
              {ageInfo.name}
            </p>
          </div>

          <ul className="age-checklist">
            <li>
              <b>🪪 Giấy tờ hợp lệ:</b> Khán giả cần mang theo CCCD, Hộ chiếu,
              Thẻ HSSV hoặc tài khoản định danh VNeID mức 2 (có ảnh & ngày
              sinh).
            </li>
            <li>
              <b>👥 Quy định từng khán giả:</b> Toàn bộ khán giả trong đơn vé
              đều phải chứng minh đủ độ tuổi quy định tại cửa kiểm soát rạp.
            </li>
            <li>
              <b>🛑 Quyền từ chối của rạp:</b> Nhân viên soát vé có quyền từ
              chối cho vào phòng chiếu nếu khán giả không xuất trình được giấy
              tờ hợp lệ.
            </li>
            <li>
              <b>💸 Không hoàn tiền:</b> Vé đã thanh toán thành công sẽ không
              được hoàn lại trong trường hợp bị từ chối do không đủ tuổi.
            </li>
          </ul>

          <label className="age-checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              Tôi và tất cả người đi cùng cam kết đã đủ{" "}
              <b>{ageInfo.age} tuổi</b> và hoàn toàn đồng ý xuất trình giấy tờ
              tùy thân tại rạp.
            </span>
          </label>
        </div>

        <div className="age-modal-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={onCancel}
          >
            Quay lại
          </button>
          <button
            type="button"
            className="button button-primary age-confirm-btn"
            disabled={!agreed}
            onClick={onConfirm}
          >
            Tôi Đã Hiểu & Tiếp Tục Thanh Toán
          </button>
        </div>
      </div>
    </div>
  );
}

const PROMO_COUPONS = [
  { code: "NOVA20", desc: "Giảm 20.000đ mọi đơn", value: 20000, type: "fixed" },
  { code: "CINEMA10", desc: "Giảm 10% tổng vé", value: 10, type: "percent" },
  {
    code: "U22",
    desc: "Giảm 25.000đ cho HSSV",
    value: 25000,
    type: "fixed",
    min: 50000,
  },
  {
    code: "CHAOBANMOI",
    desc: "Giảm 30.000đ từ 100k",
    value: 30000,
    type: "fixed",
    min: 100000,
  },
  {
    code: "VIP50",
    desc: "Giảm 50.000đ từ 150k",
    value: 50000,
    type: "fixed",
    min: 150000,
  },
];

function checkClientOrphanSeats(selectedIds, allSeats) {
  if (!selectedIds || !selectedIds.length || !allSeats || !allSeats.length)
    return null;
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
          for (const item of curOrigRun)
            origRunSize.set(item.seatId, curOrigRun.length);
        }
        curOrigRun = isAvail ? [s] : [];
      }
    }
    if (curOrigRun.length > 0) {
      for (const item of curOrigRun)
        origRunSize.set(item.seatId, curOrigRun.length);
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
  const [groupType, setGroupType] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [comboItems, setComboItems] = useState(() => {
    const combo = booking.combo && combos.find((c) => c.price === "69000.00");
    let cart = {};
    try {
      cart = JSON.parse(sessionStorage.getItem("nova-food-cart") || "{}");
    } catch {
      /* Ignore an invalid local draft. */
    }
    const valid = Object.fromEntries(
      combos
        .filter((item) => cart[item.id] > 0)
        .map((item) => [
          item.id,
          Math.min(20, Math.max(0, Math.trunc(cart[item.id]))),
        ]),
    );
    return {
      ...valid,
      ...(combo ? { [combo.id]: Math.max(1, valid[combo.id] || 0) } : {}),
    };
  });
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(Date.now);
  const [offset, setOffset] = useState(0);
  const requestKey = useRef(null);
  const mounted = useRef(true);
  const activeOrderId = useRef(booking.orderId);

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const ageInfo = getAgeRestriction(booking.movie?.age);
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
  // Derive from each fresh snapshot so another viewer's hold cannot leave a stale warning.
  const orphanSeat = !holding ? checkClientOrphanSeats(selected, seats) : null;
  const orphanWarning = orphanSeat
    ? `Không để trống 1 ghế lẻ tại ${orphanSeat.row}${orphanSeat.column}. Hãy chọn ghế này hoặc đổi vị trí để chừa ít nhất 2 ghế liền nhau.`
    : null;
  const remaining = holding
    ? Math.max(
        0,
        Math.ceil((new Date(order.expiredAt).getTime() - now - offset) / 1000),
      )
    : 0;

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    const found = PROMO_COUPONS.find((c) => c.code === code);
    if (!found) {
      setNotice(
        `Mã voucher "${code}" không hợp lệ. Hãy thử các mã: NOVA20, CINEMA10, U22, CHAOBANMOI.`,
      );
      return;
    }
    setAppliedCoupon(found);
    setNotice(
      `Đã chọn áp dụng mã ${found.code}: ${found.desc}! Giá ưu đãi sẽ được cập nhật khi giữ ghế.`,
    );
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
  }

  async function suggest(quantity) {
    setBusy(true);
    try {
      const result = await apiGetGroupSuggestions(
        showtimeId,
        quantity,
        groupType,
      );
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

  function handlePaymentClick() {
    if (ageInfo && !ageConfirmed) {
      setShowAgeModal(true);
      return;
    }
    void checkout();
  }

  useEffect(() => {
    if (order?.status === "PAID")
      apiGetProfile()
        .then((u) => onMemberUpdate(memberProfile(u)))
        .catch(() => {});
  }, [order?.status, onMemberUpdate]);

  return (
    <Modal
      title="Chọn ghế & đặt vé"
      wide
      onClose={onClose}
      image={
        booking.movie.localBackdrop ||
        booking.movie.backdrop ||
        "/images/cinema-imax.jpg"
      }
    >
      <ol className="booking-stepper" aria-label="Tiến trình đặt vé">
        {["Chọn ghế", "Bắp nước", "Thanh toán", "Nhận vé"].map(
          (step, index) => (
            <li
              key={step}
              className={
                order?.status === "PAID"
                  ? "complete"
                  : index === (holding ? 2 : 0)
                    ? "current"
                    : ""
              }
            >
              <span>{index + 1}</span>
              {step}
            </li>
          ),
        )}
      </ol>
      <div className="booking-context">
        <img
          className="booking-film-poster"
          src={
            booking.movie.localPoster ||
            booking.movie.poster ||
            "/images/dune-poster.jpg"
          }
          alt={booking.movie.title}
        />
        <div>
          <h3>{booking.movie.title}</h3>
          <p>
            {booking.cinema.name} · {booking.time.label}
          </p>
          <div className="booking-badges-row">
            <span>
              {booking.date.label} · {booking.movie.age}
            </span>
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
        thanh toán mô phỏng qua Sandbox, không thu tiền thật.
      </p>

      {orphanWarning && !holding && (
        <div className="orphan-warning-banner" id="orphan-warning" role="alert">
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
          <p>
            Mã đơn hàng: <b>{order.orderCode}</b>
          </p>
          <p>
            Vé điện tử e-Ticket kèm QR Code bảo mật đã sẵn sàng trong tài khoản
            của bạn.
          </p>
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
                <label className="group-type-label">
                  Ưu tiên chỗ ngồi
                  <select
                    value={groupType}
                    onChange={(event) => setGroupType(event.target.value)}
                    aria-label="Loại ghế gợi ý"
                  >
                    <option value="">Trung tâm · Tất cả loại ghế</option>
                    <option value="STANDARD">Ghế thường</option>
                    <option value="VIP">Ghế VIP</option>
                    <option value="SWEETBOX">Sweetbox · Chọn số chẵn</option>
                  </select>
                </label>
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
                            className={`seat ${state}${orphanSeat?.seatId === seat.seatId ? " orphan-seat" : ""}`}
                            aria-describedby={
                              orphanSeat?.seatId === seat.seatId
                                ? "orphan-warning"
                                : undefined
                            }
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
                    <img src={menuDetails(combo).image} alt="" />
                    <span>
                      {combo.name}
                      <small>{money(combo.price)}</small>
                    </span>
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
                    onChange={(e) =>
                      setCouponInput(e.target.value.toUpperCase())
                    }
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
                      <Sparkles size={14} /> <b>{appliedCoupon.code}</b> (
                      {appliedCoupon.desc})
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

            {/* Age Rating Compliance Card */}
            {ageInfo && (
              <div
                className="age-compliance-card"
                style={{ borderColor: ageInfo.border, background: ageInfo.bg }}
              >
                <div className="age-card-top">
                  <span
                    className="age-badge-pill"
                    style={{ background: ageInfo.color }}
                  >
                    {ageInfo.code}
                  </span>
                  <span className="age-card-title">{ageInfo.name}</span>
                </div>
                <p className="age-card-desc">{ageInfo.shortNotice}</p>
                <label className="age-card-confirm">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                  />
                  <span>Tôi xác nhận bản thân và người đi cùng đã đủ tuổi</span>
                </label>
                <button
                  type="button"
                  className="age-detail-link"
                  onClick={() => setShowAgeModal(true)}
                >
                  Xem quy định kiểm duyệt chi tiết →
                </button>
              </div>
            )}

            {holding ? (
              <>
                <p>
                  Mã đơn: <small>{order.orderCode}</small>
                </p>
                <p>
                  Tiền vé <b>{money((order.totalTicketAmount ?? order.totalAmount))}</b>
                </p>
                <p>
                  Combo <b>{money((order.totalComboAmount ?? 0))}</b>
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
                <div className="payment-sandbox-card">
                  <div className="payment-secure-icon">
                    <ShieldCheck size={26} />
                  </div>
                  <h4>Một bước nữa tới màn ảnh lớn.</h4>
                  <p>
                    Đơn hàng và giá đã được xác nhận. Tiếp tục sang Sandbox để
                    chọn kết quả thanh toán mô phỏng.
                  </p>
                  <div className="payment-assurances">
                    <span>
                      <Check size={14} />
                      Không thu tiền thật
                    </span>
                    <span>
                      <Clock3 size={14} />
                      Giữ nguyên hạn giữ ghế
                    </span>
                  </div>
                  <button
                    className="button button-primary"
                    disabled={busy}
                    onClick={handlePaymentClick}
                  >
                    Thanh toán Sandbox
                  </button>
                </div>
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
                    snapshot?.canBook === false
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

      {showAgeModal && ageInfo && (
        <AgeRatingModal
          ageInfo={ageInfo}
          movieTitle={booking.movie?.title}
          onConfirm={() => {
            setAgeConfirmed(true);
            setShowAgeModal(false);
            void checkout();
          }}
          onCancel={() => setShowAgeModal(false)}
        />
      )}
    </Modal>
  );
}
