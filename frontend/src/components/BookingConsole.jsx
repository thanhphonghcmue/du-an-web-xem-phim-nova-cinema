"use client";

// BookingConsole: seats, prices, hold deadline and payment state come from NestJS.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CinematicScreen3D from "./CinematicScreen3D.jsx";
import BookingPreview from "./BookingPreview.jsx";
import BookingTicket from "./BookingTicket.jsx";
import {
  comboTastes,
  comboTasteLabel,
  recommendationBadge,
  rankedCombos,
  recommended,
} from "@/comboRecommendations.js";
import { subscribeComboUpdates } from "@/comboUpdates.js";
import SandboxGateway from "./SandboxGateway.jsx";
import { sandboxCheckout } from "@/sandboxCheckout.js";
import NovaLogo from "./NovaLogo.jsx";
import HoldCountdown from "./HoldCountdown.jsx";
import { holdSeconds } from "@/holdDeadline.js";
import MenuImage from "./MenuImage.jsx";
import { readFoodCart } from "@/foodCart.js";
import { uniqueRecords } from "@/uniqueRecords.js";
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
import { useCatalog } from "@/catalog.js";
import { useI18n } from "@/i18n.js";
import { createRequestKey } from "@/api/requestKey.js";
import { money } from "@/data.js";
import { menuDetails } from "@/commerce.js";
import {
  apiList,
  apiGetShowtimeSeats,
  apiGetMyBookings,
  apiGetBooking,
  apiGetGroupSuggestions,
  apiHoldSeats,
  apiCancelBooking,
  apiCheckout,
  apiCompleteSandbox,
  apiGetProfile,
  memberProfile,
  readCommand,
  invalidateProgramme,
  getBackendKind,
  rememberBooking,
} from "@/api/client.js";

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

function SeatConflictModal({ conflictInfo, onClose }) {
  if (!conflictInfo) return null;
  const seatNames = conflictInfo.seatNames || "vừa chọn";
  return (
    <Modal
      className="cinema-state-card cinema-state-red seat-conflict-dialog"
      headerless
      dialogRole="alertdialog"
      title="Xung đột giữ ghế (Lỗi 409 Conflict)"
      onClose={onClose}
    >
      <div className="seat-conflict-icon-wrap">
        <AlertTriangle size={28} />
      </div>
      <h3 id="conflict-dialog-title" className="seat-conflict-title">
        Xung đột giữ ghế (Lỗi 409 Conflict)
      </h3>
      <p id="conflict-dialog-desc" className="seat-conflict-message">
        Ghế <strong>{seatNames}</strong> vừa được một khách hàng khác giữ chỗ
        nhanh hơn trong tích tắc. Sơ đồ ghế đã tự động cập nhật trạng thái mới
        nhất.
        <span className="seat-conflict-sub">Vui lòng chọn ghế khác!</span>
      </p>
      <button type="button" className="seat-conflict-btn" onClick={onClose}>
        Đã hiểu · Chọn ghế khác
      </button>
    </Modal>
  );
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
  {
    code: "CINEMA10",
    desc: "Giảm 10% tổng đơn sau ưu đãi hội viên",
    value: 10,
    type: "percent",
  },
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
const paymentGateways = [
  { id: "vietqr", title: "VietQR", detail: "(Napas)" },
  { id: "momo", title: "MoMo", detail: "Ví điện tử" },
  { id: "vnpay", title: "VNPAY", detail: "Cổng thanh toán" },
  { id: "sandbox", title: "Sandbox", detail: "Môi trường thử" },
];

function LiveBookingConsole({
  booking,
  member,
  onClose,
  onViewTickets,
  onMemberUpdate,
}) {
  const { t, language } = useI18n();
  const { combos: catalogCombos, rooms, reload } = useCatalog();
  const [menuSnapshot, setMenuSnapshot] = useState(null);
  const combos = menuSnapshot || catalogCombos;
  const showtimeId = booking.showtimeId || booking.time.id;
  const startTime = new Date(booking.time.startTime);
  const startLabel = Number.isFinite(startTime.getTime())
    ? startTime.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
      })
    : booking.time.displayTime || booking.time.label;
  const [snapshot, setSnapshot] = useState(null);
  const [selected, saveSelected] = useState([]);
  const [order, saveOrder] = useState(null);
  // Các phản hồi bất đồng bộ đọc lựa chọn/đơn mới nhất, không dùng closure cũ.
  const selectionRef = useRef([]);
  const orderRef = useRef(null);
  const setSelected = useCallback((value) => {
    const next =
      typeof value === "function" ? value(selectionRef.current) : value;
    selectionRef.current = next;
    saveSelected(next);
  }, []);
  const setOrder = useCallback((value) => {
    orderRef.current = value;
    saveOrder(value);
  }, []);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState("");
  const [groupType, setGroupType] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [gateway, setGateway] = useState("sandbox");
  const [comboTaste, setComboTaste] = useState("all");
  const [comboItems, setComboItems] = useState(() => {
    const combo = booking.combo && combos.find((c) => c.price === "69000.00");
    const cart = readFoodCart();
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
  const [zoom, setZoom] = useState(100);
  const [count, setCount] = useState(3);
  const [expiredOrderId, setExpiredOrderId] = useState(null);
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  const [offset, setOffset] = useState(0);
  const requestKey = useRef(null);
  const mounted = useRef(true);
  const activeOrderId = useRef(booking.orderId);
  const expiryRefresh = useRef(null);
  const snapshotVersion = useRef(0);
  const orderRevision = useRef(0);
  const changingOrder = useRef(false);
  const noticeElement = useRef(null);
  const revealConflict = useRef(false);
  useEffect(() => {
    let active = true,
      running = false,
      dirty = false;
    const sync = async () => {
      if (!active || document.hidden) return;
      if (running) {
        dirty = true;
        return;
      }
      running = true;
      try {
        const items = await apiList("/combos");
        if (active) {
          setMenuSnapshot(items);
          if (
            !changingOrder.current &&
            !["HOLDING", "PENDING", "PAID"].includes(orderRef.current?.status)
          ) {
            const available = new Set(items.map((item) => item.id));
            setComboItems((current) =>
              Object.keys(current).some((id) => !available.has(id))
                ? Object.fromEntries(
                    Object.entries(current).filter(([id]) => available.has(id)),
                  )
                : current,
            );
          }
        }
      } catch {
        /* Giữ menu đã tải; lệnh giữ ghế vẫn kiểm tra lại trên server. */
      } finally {
        running = false;
        if (dirty && active) {
          dirty = false;
          void sync();
        }
      }
    };
    void sync();
    const unsubscribe = subscribeComboUpdates(sync);
    document.addEventListener("visibilitychange", sync);
    const timer = setInterval(sync, 5000);
    window.addEventListener("focus", sync);
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (!notice || !revealConflict.current) return;
    revealConflict.current = false;
    noticeElement.current?.scrollIntoView({
      block: "nearest",
      behavior: "instant",
    });
  }, [notice]);

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showPaymentReview, setShowPaymentReview] = useState(false);
  const [sandbox, setSandbox] = useState(null);
  const [testExpiredOrder, setTestExpiredOrder] = useState(null);
  const testExpiryPreview = useRef(null);
  const [testControls, setTestControls] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [cancelledNotice, setCancelledNotice] = useState(null);
  const ageInfo = getAgeRestriction(booking.movie?.age);
  const refresh = useCallback(async () => {
    const version = ++snapshotVersion.current;
    const map = await apiGetShowtimeSeats(showtimeId);
    if (!mounted.current || version !== snapshotVersion.current) return;
    if (!Array.isArray(map?.seats) || typeof map.canBook !== "boolean")
      throw new Error("Chưa nhận được sơ đồ ghế hợp lệ. Hãy thử lại.");
    if (map.showtimeStatus && map.showtimeStatus !== "ACTIVE") {
      window.dispatchEvent(new Event("nova-showtime-status"));
      setUnavailable(true);
      setSandbox(null);
      setShowPaymentReview(false);
    }
    const currentSeats = uniqueRecords(map.seats, "seatId");
    // Lựa chọn UI chưa khóa ghế. Đồng bộ ngay trong phản hồi server, cùng một render.
    const ownsHold = ["PENDING", "HOLDING", "PAID"].includes(
      orderRef.current?.status,
    );
    if (!changingOrder.current && !ownsHold && selectionRef.current.length) {
      const available = new Set(
        currentSeats
          .filter((s) => s.status === "AVAILABLE")
          .map((s) => s.seatId),
      );
      const blocked = new Set(
        selectionRef.current.filter((id) => !available.has(id)),
      );
      if (blocked.size) {
        const labels = currentSeats
          .filter((s) => blocked.has(s.seatId))
          .map((s) => `${s.row}${s.column}`)
          .join(", ");
        setSelected((current) => current.filter((id) => !blocked.has(id)));
        setConflictInfo({
          seatNames: labels || "đã chọn",
          seatIds: [...blocked],
        });
        requestKey.current = null;
        revealConflict.current = true;
        setNotice(
          language === "en"
            ? `Seats ${labels || "you selected"} are no longer available; they have been held or sold. Your selection has been updated. Please choose other seats.`
            : `Ghế ${labels || "đã chọn"} vừa được giữ hoặc bán, không còn trống. Đã bỏ các ghế này khỏi lựa chọn; vui lòng chọn vị trí khác.`,
        );
      }
    }
    setSnapshot(map);
    setInitialized(true);
    setOffset(new Date(map.asOf).getTime() - Date.now());
  }, [showtimeId, language, setSelected]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let running = false,
      loaded = false;
    async function update() {
      if (running || changingOrder.current || (loaded && document.hidden))
        return;
      const revision = orderRevision.current;
      running = true;
      try {
        await refresh();
        loaded = true;
        const orders = await apiGetMyBookings();
        // Không để poll cũ bật lại đơn HOLDING sau khi đã hủy/giữ ghế mới.
        if (!active || revision !== orderRevision.current) return;
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
            setShowPaymentReview(false);
            if (!(
              current.status === "EXPIRED" &&
              testExpiryPreview.current === current.id
            )) {
              setSandbox(null);
              if (current.status === "EXPIRED") setShowExpiredNotice(true);
            }
          } else
            setSelected(
              current.seats
                .filter((s) => s.status !== "AVAILABLE")
                .map((s) => s.seatId),
            );
        }
        setInitialized(true);
      } catch (err) {
        if (active && revision === orderRevision.current)
          setNotice(err.message);
        if (
          [
            "SHOWTIME_LOCKED_OR_CANCELED",
            "SHOWTIME_UNAVAILABLE",
            "MOVIE_NOT_ON_SALE",
          ].includes(err.code)
        )
          setUnavailable(true);
      } finally {
        running = false;
      }
    }
    void update();
    const poll = setInterval(update, 5000);
    window.addEventListener("focus", update);
    return () => {
      active = false;
      mounted.current = false;
      clearInterval(poll);
      window.removeEventListener("focus", update);
    };
  }, [showtimeId, booking.orderId, refresh, setOrder, setSelected]);

  useEffect(() => {
    if (!initialized || getBackendKind() === "memory") return;
    const stream = new EventSource(`/api/seat-events/${showtimeId}`);
    stream.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLive(data.type === "resync");
      if (data.type === "resync")
        void refresh().catch((err) => setNotice(err.message));
    };
    stream.onerror = () => setLive(false);
    return () => stream.close();
  }, [showtimeId, refresh, initialized]);

  const seats = useMemo(
    () => uniqueRecords(snapshot?.seats, "seatId"),
    [snapshot],
  );
  const orderSeatNames = useMemo(
    () =>
      (order?.seats || [])
        .map((line) => {
          const seat = seats.find((item) => item.seatId === line.seatId);
          return seat ? `${seat.row}${seat.column}` : "Đang cập nhật ghế";
        })
        .join(", "),
    [order?.seats, seats],
  );
  const orderSeatTypes = useMemo(
    () =>
      [
        ...new Set(
          (order?.seats || []).map((line) => {
            const seat = seats.find((item) => item.seatId === line.seatId);
            return seat?.type === "VIP"
              ? "VIP"
              : seat?.type === "SWEETBOX"
                ? "Sweetbox"
                : "Thường";
          }),
        ),
      ].join(" / "),
    [order?.seats, seats],
  );
  const rows = useMemo(
    () => [...new Set(seats.map((s) => s.row))].sort(),
    [seats],
  );
  const previewTotal = useMemo(
    () =>
      seats.reduce(
        (total, seat) =>
          total + (selected.includes(seat.seatId) ? Number(seat.price) : 0),
        0,
      ) +
      combos.reduce(
        (total, combo) =>
          total + Number(combo.price) * (comboItems[combo.id] || 0),
        0,
      ),
    [seats, selected, combos, comboItems],
  );
  const menuCombos = useMemo(
    () => rankedCombos(combos, selected.length, comboTaste),
    [combos, selected.length, comboTaste],
  );
  const suggestion = menuCombos.find((combo) =>
    recommended(combo, selected.length),
  );
  const holding = order && ["PENDING", "HOLDING"].includes(order.status);
  const expired = Boolean(
    holding &&
    (expiredOrderId === order.id || !holdSeconds(order.expiredAt, offset)),
  );
  const notifyExpiry = useCallback(
    () => setExpiredOrderId(order?.id),
    [order?.id],
  );
  const exitExpiredBooking = useCallback(() => {
    rememberBooking(null);
    setShowExpiredNotice(false);
    setSandbox(null);
    setOrder(null);
    setSelected([]);
    requestKey.current = null;
    activeOrderId.current = undefined;
    void refresh().catch((error) => setNotice(error.message));
  }, [refresh, setOrder, setSelected]);
  useEffect(() => {
    if (!holding || !expired || expiryRefresh.current === order?.id) return;
    expiryRefresh.current = order.id;
    let active = true;
    apiGetBooking(order.id)
      .then((latest) => {
        if (!active) return;
        setOrder(latest);
        if (["FAILED", "EXPIRED", "CANCELLED"].includes(latest.status)) {
          activeOrderId.current = undefined;
          requestKey.current = null;
          setSelected([]);
          setShowPaymentReview(false);
          setSandbox(null);
          if (latest.status === "EXPIRED") setShowExpiredNotice(true);
        }
        return refresh();
      })
      .catch((error) => {
        if (active) setNotice(error.message);
      });
    return () => {
      active = false;
    };
  }, [holding, expired, order?.id, refresh, setOrder, setSelected]);

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
      `Đã chọn mã ${found.code}. Máy chủ kiểm tra điều kiện trên tổng đơn sau ưu đãi hội viên khi giữ ghế.`,
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
    if (pair.some((s) => s.status !== "AVAILABLE")) {
      const unavailableSeats = pair.filter((s) => s.status !== "AVAILABLE");
      const unavailableNames = unavailableSeats
        .map((s) => `${s.row}${s.column}`)
        .join(", ");
      if (seat.type === "SWEETBOX") {
        setNotice(
          `Cặp Sweetbox có ghế ${unavailableNames} đã được giữ hoặc bán. Hãy chọn cặp khác.`,
        );
      } else {
        setConflictInfo({
          seatNames: unavailableNames,
          seatIds: unavailableSeats.map((s) => s.seatId),
        });
        setNotice(
          `Ghế ${unavailableNames} vừa được người khác chọn. Vui lòng chọn ghế khác!`,
        );
      }
      return;
    }
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
      if (!Array.isArray(result?.seatIds))
        throw new Error("Chưa nhận được gợi ý ghế hợp lệ. Vui lòng thử lại.");
      setSelected(result.seatIds);
      setNotice(
        result.seatIds.length
          ? "Đã chọn dải ghế. Bấm Giữ ghế để xác nhận với máy chủ."
          : "Không còn dải ghế phù hợp.",
      );
    } catch (err) {
      setNotice(err.message);
      if (
        [
          "SHOWTIME_LOCKED_OR_CANCELED",
          "SHOWTIME_UNAVAILABLE",
          "MOVIE_NOT_ON_SALE",
        ].includes(err.code)
      )
        setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }

  async function hold() {
    if (!initialized || !snapshot?.canBook) {
      setNotice("Suất chiếu chưa sẵn sàng hoặc đã bắt đầu. Hãy chọn lại suất.");
      return;
    }
    if (!selected.length) {
      setNotice("Hãy chọn ít nhất một ghế trước khi giữ chỗ.");
      return;
    }
    if (
      Object.values(comboItems).filter((quantity) => quantity > 0).length > 20
    ) {
      setNotice(
        "Mỗi đơn tối đa 20 loại bắp nước. Hãy bớt món trước khi giữ ghế.",
      );
      return;
    }
    setBusy(true);
    setNotice("");

    const payload = {
      showtimeId,
      seatIds: [...selected].sort(),
      comboItems: Object.entries(comboItems)
        .filter(([, q]) => q > 0)
        .map(([comboId, quantity]) => ({ comboId, quantity })),
      ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
    };
    const canonical = JSON.stringify(payload);
    orderRevision.current++;
    changingOrder.current = true;
    try {
      if (requestKey.current?.body !== canonical)
        requestKey.current = { body: canonical, key: createRequestKey() };
      const result = await apiHoldSeats(payload, requestKey.current.key);
      if (!result?.id || !Array.isArray(result.seats))
        throw new Error(
          "Máy chủ chưa trả đủ thông tin đơn. Hãy kiểm tra tài khoản trước khi thử lại.",
        );
      activeOrderId.current = result.id;
      rememberBooking(result.id);
      setOrder(result);
      setSelected(result.seats.map((s) => s.seatId));
      void refresh().catch((err) => {
        if (mounted.current) setNotice(err.message);
      });
    } catch (err) {
      if (err.code === "SEAT_UNAVAILABLE") revealConflict.current = true;
      setNotice(err.message);
      if (
        [
          "SHOWTIME_LOCKED_OR_CANCELED",
          "SHOWTIME_UNAVAILABLE",
          "MOVIE_NOT_ON_SALE",
        ].includes(err.code)
      )
        setUnavailable(true);
      if (err.code === "SEAT_UNAVAILABLE") {
        const blockedIds = Array.isArray(err.details?.seatIds)
          ? err.details.seatIds
          : [];
        if (blockedIds.length === 0) {
          setNotice(
            "Trạng thái ghế vừa thay đổi trong lúc giữ chỗ. Sơ đồ sẽ được cập nhật; bạn có thể thử giữ ghế lại.",
          );
          void refresh().catch(() => {});
          return;
        }
        const blocked = new Set(blockedIds);
        const conflictSeats = seats
          .filter((s) => blocked.has(s.seatId))
          .map((s) => `${s.row}${s.column}`);
        const seatNames = conflictSeats.length
          ? conflictSeats.join(", ")
          : selected
              .map((id) => {
                const s = seats.find((item) => item.seatId === id);
                return s ? `${s.row}${s.column}` : id;
              })
              .join(", ");

        setConflictInfo({
          seatNames: seatNames || "vừa chọn",
          seatIds: Array.from(blocked),
        });
        setSelected((current) => current.filter((id) => !blocked.has(id)));
        setNotice(
          `Ghế ${seatNames || ""} vừa được người khác chọn. Vui lòng chọn ghế khác!`,
        );
      }
      void refresh().catch(() => {});
    } finally {
      changingOrder.current = false;
      orderRevision.current++;
      setBusy(false);
    }
  }

  async function cancel() {
    orderRevision.current++;
    changingOrder.current = true;
    setBusy(true);
    try {
      const result = await apiCancelBooking(order.id);
      rememberBooking(null);
      setOrder(result);
      setShowPaymentReview(false);
      setSandbox(null);
      activeOrderId.current = undefined;
      setSelected([]);
      requestKey.current = null;
      void refresh().catch((err) => {
        if (mounted.current) setNotice(err.message);
      });
      setNotice("Đã hủy đơn và trả ghế.");
    } catch (err) {
      setNotice(err.message);
      if (
        [
          "SHOWTIME_LOCKED_OR_CANCELED",
          "SHOWTIME_UNAVAILABLE",
          "MOVIE_NOT_ON_SALE",
        ].includes(err.code)
      )
        setUnavailable(true);
    } finally {
      changingOrder.current = false;
      orderRevision.current++;
      setBusy(false);
    }
  }

  async function checkout() {
    setBusy(true);
    setNotice("");
    try {
      if (!holding || !holdSeconds(order.expiredAt, offset)) {
        setNotice(
          "Đã hết thời gian giữ ghế. Hãy chọn lại suất và giữ ghế mới.",
        );
        return;
      }
      const result = await apiCheckout(order.id);
      setSandbox(sandboxCheckout(result.url, order));
      setTestControls(result.testControls === true);
      setShowPaymentReview(false);
    } catch (err) {
      setNotice(err.message);
      if (
        [
          "SHOWTIME_LOCKED_OR_CANCELED",
          "SHOWTIME_UNAVAILABLE",
          "MOVIE_NOT_ON_SALE",
        ].includes(err.code)
      )
        setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }

  async function completeSandbox(result) {
    if (!sandbox || changingOrder.current) return;
    const payload = sandbox;
    orderRevision.current++;
    changingOrder.current = true;
    setBusy(true);
    setNotice("");
    try {
      const confirmed = await apiCompleteSandbox(payload, result);
      setOrder(confirmed);
      setSandbox(null);
      setTestExpiredOrder(null);
      testExpiryPreview.current = null;
      setShowPaymentReview(false);
      if (confirmed.status === "PAID") {
        activeOrderId.current = confirmed.id;
      } else if (
        ["FAILED", "CANCELLED", "EXPIRED"].includes(confirmed.status)
      ) {
        activeOrderId.current = undefined;
        requestKey.current = null;
        setSelected([]);
        if (confirmed.status === "EXPIRED") setShowExpiredNotice(true);
        else
          setCancelledNotice({
            status: confirmed.status,
            orderCode: confirmed.orderCode,
          });
        if (confirmed.status !== "EXPIRED") rememberBooking(null);
      }
      void refresh().catch((error) => setNotice(error.message));
    } catch (error) {
      // Mất mạng: không tự suy ra PAID/hủy đơn, không tự gửi lại POST.
      setNotice(error.message);
      if (error.code === "ORDER_EXPIRED_TIMEOUT") {
        const current = await apiGetBooking(payload.bookingId).catch(
          () => null,
        );
        if (current?.status === "EXPIRED") {
          setOrder(current);
          setSelected([]);
          setSandbox(null);
          setTestExpiredOrder(null);
          testExpiryPreview.current = null;
          setShowExpiredNotice(true);
        }
      }
      if (
        [
          "SHOWTIME_LOCKED_OR_CANCELED",
          "SHOWTIME_UNAVAILABLE",
          "BOOKING_NOT_PAYABLE",
        ].includes(error.code)
      ) {
        const show = await apiGetShowtimeSeats(showtimeId).catch(() => null);
        if (show && !show.canBook) {
          setSandbox(null);
          setUnavailable(true);
        }
      }
    } finally {
      changingOrder.current = false;
      orderRevision.current++;
      setBusy(false);
    }
  }

  function handlePaymentClick() {
    if (ageInfo && !ageConfirmed) {
      setShowAgeModal(true);
      return;
    }
    setShowPaymentReview(true);
  }

  // The signed Sandbox form performs payment on NestJS. This handler only
  // accepts its persisted result; it cannot invent PAID or create a local ticket.
  async function handleMockPaymentSuccess() {
    setBusy(true);
    setNotice("");
    try {
      const confirmed = await apiGetBooking(order.id);
      setOrder(confirmed);
      if (confirmed.status !== "PAID") {
        setNotice(
          "Máy chủ chưa xác nhận thanh toán thành công. Hãy kiểm tra lại đơn.",
        );
        return;
      }
      onViewTickets(confirmed.id);
    } catch (error) {
      setNotice(error.message);
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
    <Modal
      className="booking-console"
      title={t("Chọn ghế & đặt vé")}
      wide
      onClose={onClose}
      image={
        booking.movie.localBackdrop ||
        booking.movie.backdrop ||
        "/images/cinema-imax.jpg"
      }
    >
      <div className="booking-console-brand">
        <NovaLogo showText={false} size={40} />
        <span>YOUR NEXT GREAT EXPERIENCE</span>
      </div>
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
              {t(step)}
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
            "/images/cinema-auditorium.jpg"
          }
          alt={booking.movie.title}
          onError={(event) => {
            if (
              event.currentTarget.getAttribute("src") !==
              "/images/cinema-auditorium.jpg"
            )
              event.currentTarget.src = "/images/cinema-auditorium.jpg";
          }}
        />
        <div>
          <h3>{booking.movie.title}</h3>
          <p>
            {booking.cinema.name} ·{" "}
            {rooms.find((room) => room.id === booking.time.roomId)?.name ||
              booking.time.roomName ||
              "Phòng chiếu"}{" "}
            · {startLabel}
          </p>
          <div className="booking-badges-row">
            <span>
              {booking.date.label} · {booking.movie.age}
            </span>
          </div>
        </div>
      </div>

      <p className="sandbox-note">
        <ShieldCheck size={15} />
        {live ? "Đồng bộ ghế trực tiếp" : "Cập nhật ghế mỗi 5 giây"} · Hỗ trợ
        thanh toán mô phỏng qua Sandbox, không thu tiền thật.
      </p>
      {busy && (
        <p role="status" aria-live="polite">
          Đang xử lý yêu cầu, vui lòng chờ…
        </p>
      )}

      {notice && (
        <p ref={noticeElement} role="alert" className="auth-notice">
          {notice}
        </p>
      )}

      {order?.status === "PAID" ? (
        <div className="ticket-success">
          <div className="payment-success-brand">
            <span>NOVA TICKET</span>
            <small>Thanh toán Sandbox đã hoàn tất</small>
          </div>
          <div className="success-icon-wrap">
            <Check size={36} />
          </div>
          <h3>Thanh toán đã được xác nhận thành công!</h3>
          <p className="payment-success-order">
            Đơn hàng: <b>{order.orderCode}</b>
            <span aria-hidden="true"> · </span>
            Số tiền: <strong>{money(order.finalAmount)}</strong>
          </p>
          <p className="payment-success-copy">
            Mã QR vé điện tử của bạn. Mở ví vé để xem chi tiết và sử dụng vé tại
            rạp.
          </p>
          <BookingTicket
            key={order.id}
            orderId={order.id}
            expectedSeats={order.seats?.length || 1}
          />
          <button
            className="button button-primary payment-success-action"
            disabled={busy}
            onClick={handleMockPaymentSuccess}
          >
            {t("Xem vé trong tài khoản")}
          </button>
        </div>
      ) : (
        <>
          <div className="checkout-layout">
            <div className="seat-area">
              {!initialized && (
                <div>
                  <p role="status">Đang tải trạng thái ghế…</p>
                  <button
                    type="button"
                    className="button button-glass"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await refresh();
                      } catch (error) {
                        setNotice(error.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Thử tải lại sơ đồ
                  </button>
                </div>
              )}
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
                    {t("Xếp ghế")}
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
              <div className="seat-map-controls">
                <p>Màn hình phía trước · Kéo ngang để xem toàn bộ hàng ghế</p>
                <div>
                  <button
                    type="button"
                    aria-label={t("Thu nhỏ sơ đồ ghế")}
                    disabled={zoom <= 70}
                    onClick={() => setZoom((value) => value - 10)}
                  >
                    −
                  </button>
                  <span aria-live="polite">{zoom}%</span>
                  <button
                    type="button"
                    aria-label={t("Phóng to sơ đồ ghế")}
                    disabled={zoom >= 160}
                    onClick={() => setZoom((value) => value + 10)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label={t("Toàn cảnh sơ đồ ghế")}
                    onClick={() => setZoom(100)}
                  >
                    ↺
                  </button>
                </div>
              </div>
              <div className="seat-map-scroll">
                <div
                  className="seat-map"
                  style={{
                    zoom: zoom / 100,
                    "--seat-target": `${Math.max(32, 32 / (zoom / 100))}px`,
                  }}
                >
                  <CinematicScreen3D
                    format={(
                      rooms.find((room) => room.id === booking.time.roomId)
                        ?.roomType || "CINEMASCOPE"
                    ).replaceAll("_", " ")}
                  />
                  {rows.map((row) => (
                    <div className="seat-row" key={row}>
                      <span className="row-label">{row}</span>
                      {seats
                        .filter((s) => s.row === row)
                        .sort((a, b) => a.column - b.column)
                        .map((seat, index) => {
                          const chosen =
                            selected.includes(seat.seatId) &&
                            (Boolean(holding) || seat.status === "AVAILABLE");
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
                              key={`${seat.seatId}-${index}`}
                              className={`seat ${state}`}
                              aria-pressed={chosen}
                              disabled={
                                busy ||
                                Boolean(holding) ||
                                seat.status !== "AVAILABLE"
                              }
                              aria-label={`Ghế ${seat.row}${seat.column}, ${chosen ? "đang chọn" : seat.status === "AVAILABLE" ? "còn trống" : seat.status === "SOLD" ? "đã bán" : "đang giữ"}`}
                              onClick={() => toggle(seat)}
                              title={`${seat.row}${seat.column} · ${money(seat.price)}`}
                            >
                              {seat.status === "SOLD"
                                ? "×"
                                : `${seat.row}${String(seat.column).padStart(2, "0")}`}
                            </button>
                          );
                        })}
                      <span className="row-label">{row}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="booking-dock-hint">
                Gợi ý 1–20 người ưu tiên trung tâm; nhóm vượt một hàng được ghép
                hai hàng liền kề. Gợi ý chưa giữ ghế, trạng thái sẽ được kiểm
                tra lại khi xác nhận.
              </p>
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
              <h3>Đơn của {member?.name || "bạn"}</h3>
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
                  <h4>🍿 Chọn bắp nước</h4>
                  <div
                    role="group"
                    aria-label="Khẩu vị combo"
                    className="history-tabs"
                  >
                    {comboTastes.map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={comboTaste === value}
                        onClick={() => setComboTaste(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {suggestion && (
                    <div className="combo-recommendation-banner" role="status">
                      <p>
                        🎯 Hệ thống nhận diện bạn đang chọn {selected.length} vé
                        -&gt; Tự động ưu tiên gợi ý:{" "}
                        <strong>{suggestion.name}</strong>
                      </p>
                      <button
                        type="button"
                        className="button button-glass"
                        onClick={() =>
                          setComboItems((items) => ({
                            ...items,
                            [suggestion.id]: Math.max(
                              1,
                              items[suggestion.id] || 0,
                            ),
                          }))
                        }
                      >
                        + Áp dụng nhanh gợi ý này
                      </button>
                    </div>
                  )}
                  {menuCombos.map((combo) => (
                    <label
                      key={combo.id}
                      className={
                        recommended(combo, selected.length)
                          ? `combo-recommended ${selected.length >= 3 ? "combo-recommended-party" : ""}`
                          : undefined
                      }
                    >
                      <MenuImage
                        item={{ ...menuDetails(combo), ...combo }}
                        decorative
                      />
                      <span>
                        {combo.name}
                        {recommended(combo, selected.length) && (
                          <small className="paid-ticket-seats">
                            {recommendationBadge(selected.length)}
                          </small>
                        )}
                        <small>{combo.itemsSummary}</small>
                        <small>{comboTasteLabel(combo)}</small>
                        <small>{money(combo.price)}</small>
                      </span>
                      <div className="booking-combo-quantity">
                        <button
                          type="button"
                          aria-label={`Giảm ${combo.name}`}
                          disabled={!comboItems[combo.id]}
                          onClick={() =>
                            setComboItems((items) => ({
                              ...items,
                              [combo.id]: Math.max(
                                0,
                                (items[combo.id] || 0) - 1,
                              ),
                            }))
                          }
                        >
                          −
                        </button>
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
                        <button
                          type="button"
                          aria-label={`Tăng ${combo.name}`}
                          disabled={comboItems[combo.id] >= 20}
                          onClick={() =>
                            setComboItems((items) => ({
                              ...items,
                              [combo.id]: Math.min(
                                20,
                                (items[combo.id] || 0) + 1,
                              ),
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
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
                  style={{
                    borderColor: ageInfo.border,
                    background: ageInfo.bg,
                  }}
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
                    <span>
                      {t("Tôi xác nhận bản thân và người đi cùng đã đủ tuổi")}
                    </span>
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
                  <p className="muted">
                    Đơn <b>{order.orderCode}</b> đã được xác nhận. Mở phần thanh
                    toán để kiểm tra lại thông tin trước khi tiếp tục.
                  </p>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={cancel}
                  >
                    {t("Hủy đơn & trả ghế")}
                  </button>
                </>
              ) : (
                <>
                  <p className="muted">
                    Chưa giữ chỗ. Máy chủ sẽ xác nhận giá, ưu đãi thành viên và
                    thời hạn khi giữ ghế.
                  </p>
                  {order && <p>Trạng thái đơn trước: {order.status}</p>}
                </>
              )}
            </aside>
          </div>
          <div
            className="booking-dock"
            aria-label="Tóm tắt đặt vé"
            data-testid="booking-dock"
          >
            <div className="booking-dock-context">
              <strong>{booking.movie.title}</strong>
              <span>
                {booking.cinema.name} · {startLabel} · {booking.date.label}
              </span>
            </div>
            <div className="booking-dock-total" aria-live="polite">
              <small>
                {selected.length} ghế ·{" "}
                {holding ? "Tổng thanh toán" : "Tạm tính trước ưu đãi"}
              </small>
              <strong data-testid={holding ? "server-total" : undefined}>
                {money(holding ? order.finalAmount : previewTotal)}
              </strong>
              {selected.length > 0 && (
                <span className="booking-dock-seats">
                  {selected
                    .map((id) => {
                      const seat = seats.find((item) => item.seatId === id);
                      return seat ? `${seat.row}${seat.column}` : "";
                    })
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </div>
            {holding ? (
              <HoldCountdown
                expiresAt={order.expiredAt}
                offset={offset}
                onExpire={notifyExpiry}
              />
            ) : (
              <small className="booking-dock-hint">
                Giữ chỗ trong 5 phút sau khi hệ thống xác nhận
              </small>
            )}
            {!holding && (
              <button
                type="button"
                className="button button-glass"
                disabled={!selected.length}
                onClick={() => {
                  const target = document.querySelector(".live-combos");
                  target?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                  target
                    ?.querySelector("input")
                    ?.focus({ preventScroll: true });
                }}
              >
                Tiếp tục: Chọn bắp nước →
              </button>
            )}
            <button
              className="button button-primary booking-dock-action"
              disabled={
                holding
                  ? busy || expired
                  : busy ||
                    !initialized ||
                    !selected.length ||
                    !snapshot?.canBook
              }
              onClick={holding ? handlePaymentClick : hold}
            >
              {holding
                ? "Xem lại đơn & thanh toán"
                : busy
                  ? "Đang xử lý…"
                  : "Giữ ghế 5 phút"}
            </button>
          </div>
        </>
      )}

      {showAgeModal && ageInfo && (
        <AgeRatingModal
          ageInfo={ageInfo}
          movieTitle={booking.movie?.title}
          onConfirm={() => {
            setAgeConfirmed(true);
            setShowAgeModal(false);
            setShowPaymentReview(true);
          }}
          onCancel={() => setShowAgeModal(false)}
        />
      )}

      {showPaymentReview && holding && (
        <Modal
          className="payment-review-modal"
          title="Xác nhận đơn hàng & thanh toán"
          onClose={() => setShowPaymentReview(false)}
          headerless
          image={
            booking.movie.localBackdrop ||
            booking.movie.backdrop ||
            "/images/cinema-imax.jpg"
          }
        >
          <div className="payment-review-grid">
            <section
              className="payment-review-summary"
              aria-labelledby="payment-review-title"
            >
              <h3 id="payment-review-title">🧾 Tóm tắt đơn hàng</h3>
              <div className="payment-review-order">
                <small className="payment-review-kicker">
                  {booking.movie.title}
                </small>
                <h4>
                  {booking.cinema.name} ·{" "}
                  {rooms.find((room) => room.id === booking.time.roomId)
                    ?.name ||
                    booking.time.roomName ||
                    "Phòng chiếu"}
                </h4>
                <p>
                  {booking.date.label} · {startLabel}
                  {booking.time.endTime &&
                    ` – ${new Date(booking.time.endTime).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })}`}
                </p>
                <dl>
                  <div>
                    <dt>
                      Ghế {orderSeatTypes}: {orderSeatNames}
                    </dt>
                    <dd>{money(order.totalTicketAmount)}</dd>
                  </div>
                  {(order.combos || []).map((line) => {
                    const combo = combos.find(
                      (item) => item.id === line.comboId,
                    );
                    return (
                      <div className="payment-review-combo" key={line.comboId}>
                        <dt>
                          {line.quantity} × {combo?.name || "Combo"}
                        </dt>
                        <dd>{money(Number(line.unitPrice) * line.quantity)}</dd>
                      </div>
                    );
                  })}
                  {(order.couponCode || appliedCoupon?.code) && (
                    <div className="payment-review-discount">
                      <dt>Voucher {order.couponCode || appliedCoupon.code}</dt>
                      <dd>Đã áp dụng</dd>
                    </div>
                  )}
                  <div className="payment-review-discount">
                    <dt>
                      Tổng ưu đãi · C'MEMBER (
                      {order.membershipTier || "thành viên"}
                      {order.discountRate != null
                        ? ` · ${(Number(order.discountRate) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`
                        : ""}
                      )
                    </dt>
                    <dd>−{money(order.discountAmount)}</dd>
                  </div>
                </dl>
                <p className="payment-review-total">
                  <b>TỔNG THANH TOÁN</b>
                  <strong data-testid="review-server-total">
                    {money(order.finalAmount)}
                  </strong>
                </p>
              </div>
              <div className="payment-review-hold">
                <ShieldCheck size={16} /> <span>Ghế đang được giữ:</span>
                <HoldCountdown
                  expiresAt={order.expiredAt}
                  offset={offset}
                  onExpire={notifyExpiry}
                />
              </div>
            </section>
            <section
              className="payment-review-methods"
              aria-labelledby="payment-method-title"
            >
              <h3 id="payment-method-title">Chọn phương thức thanh toán</h3>
              <div
                className="payment-provider-tabs"
                role="group"
                aria-label="Chọn cổng thanh toán mô phỏng"
              >
                {[...paymentGateways]
                  .sort((a, b) => (b.id === "sandbox") - (a.id === "sandbox"))
                  .map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      aria-pressed={gateway === method.id}
                      disabled={busy}
                      onClick={() => setGateway(method.id)}
                    >
                      <span className="provider-radio" aria-hidden="true" />
                      <span className="provider-name">
                        {method.id === "sandbox"
                          ? "Cổng Sandbox"
                          : method.title}
                        <small>
                          {method.id === "sandbox"
                            ? "Mô phỏng tức thì"
                            : method.detail}
                        </small>
                      </span>
                      {method.id === "sandbox" && (
                        <b className="payment-review-selected">TESTING</b>
                      )}
                    </button>
                  ))}
              </div>
              <p className="payment-review-note">
                {paymentGateways.find((method) => method.id === gateway)?.title}{" "}
                · Thanh toán mô phỏng, không kết nối ngân hàng hoặc ví thật.
              </p>
              {notice && (
                <p role="alert" className="sandbox-error">
                  {notice}
                </p>
              )}
              <button
                className="button button-primary payment-review-submit"
                disabled={busy || expired}
                onClick={() => {
                  void checkout();
                }}
              >
                {busy
                  ? "Đang chuyển…"
                  : `Thanh toán ngay: ${money(order.finalAmount)} →`}
              </button>
              <p className="payment-review-secure">
                Tổng tiền và thời hạn được xác minh bởi máy chủ.
              </p>
              <button
                className="text-button payment-review-back"
                onClick={() => setShowPaymentReview(false)}
              >
                Quay lại chọn combo, ưu đãi
              </button>
            </section>
          </div>
        </Modal>
      )}

      {sandbox &&
        (holding || testExpiredOrder?.id === order?.id) &&
        !showExpiredNotice && (
          <SandboxGateway
            testControls={testControls}
            onTestExpire={async () => {
              setBusy(true);
              testExpiryPreview.current = order.id;
              try {
                await readCommand("/payments/sandbox/test-expire", sandbox);
                const expiredOrder = await apiGetBooking(order.id);
                setTestExpiredOrder(expiredOrder);
                setOrder(expiredOrder);
              } catch (error) {
                testExpiryPreview.current = null;
                setTestExpiredOrder(null);
                setNotice(error.message);
              } finally {
                setBusy(false);
              }
            }}
            payload={sandbox}
            order={testExpiredOrder || order}
            allowExpiredConfirmation={Boolean(testControls && testExpiredOrder)}
            offset={offset}
            busy={busy}
            expired={expired || Boolean(testExpiredOrder)}
            error={notice}
            onExpire={notifyExpiry}
            onResult={completeSandbox}
            onClose={() => {
              setSandbox(null);
              if (testExpiredOrder) {
                testExpiryPreview.current = null;
                setTestExpiredOrder(null);
                setShowExpiredNotice(true);
              }
            }}
          />
        )}

      {unavailable && (
        <Modal
          headerless
          className="cinema-state-card cinema-state-red"
          title="Thông báo thay đổi suất chiếu"
          onClose={onClose}
        >
          <h2>Thông báo thay đổi suất chiếu</h2>
          <p>
            Rất tiếc, suất chiếu này đã bị hủy hoặc thay đổi. Vui lòng chọn suất
            khác
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              invalidateProgramme();
              void reload();
              onClose();
            }}
          >
            Chọn suất chiếu khác
          </button>
        </Modal>
      )}

      {cancelledNotice && (
        <Modal
          headerless
          className="cinema-state-card cinema-state-red booking-cancelled-modal"
          title={
            cancelledNotice.status === "FAILED"
              ? "Thanh toán Sandbox thất bại (Trạng thái đơn: FAILED)"
              : "Giao dịch đã được hủy bỏ (Trạng thái đơn: CANCELLED)"
          }
          onClose={() => setCancelledNotice(null)}
        >
          <div className="cinema-state-icon">
            <X size={28} />
          </div>
          <h2>
            {cancelledNotice.status === "FAILED"
              ? "Thanh toán Sandbox thất bại (Trạng thái đơn: FAILED)"
              : "Giao dịch đã được hủy bỏ (Trạng thái đơn: CANCELLED)"}
          </h2>
          <p>
            Đơn <strong>{cancelledNotice.orderCode}</strong>:{" "}
            {cancelledNotice.status === "FAILED"
              ? "Cổng Sandbox trả về mã phản hồi thất bại. Đơn hàng đã được cập nhật trạng thái Thanh toán thất bại (FAILED) và ghế ngồi đã được giải phóng."
              : "Bạn đã nhấn hủy thanh toán trên cổng Sandbox. Đơn hàng đã cập nhật trạng thái là CANCELLED và hệ thống tự động đưa bạn quay lại trang chọn ghế ban đầu."}{" "}
            Đây là Sandbox, không thu tiền thật.
          </p>
          <div className="cinema-state-actions">
            <a className="button button-glass" href="/">
              Về trang chủ
            </a>
            <button
              className="button button-primary"
              onClick={() => {
                setCancelledNotice(null);
                setOrder(null);
                void refresh().catch((error) => setNotice(error.message));
              }}
            >
              Quay lại sơ đồ chọn ghế →
            </button>
          </div>
        </Modal>
      )}

      {showExpiredNotice && (
        <Modal
          className="cinema-state-card cinema-state-amber booking-expired-modal"
          title="Đơn đã hết hạn, không còn thanh toán được"
          onClose={exitExpiredBooking}
          headerless
          image={
            booking.movie.localBackdrop ||
            booking.movie.backdrop ||
            "/images/cinema-imax.jpg"
          }
        >
          <div className="booking-expired-content">
            <div className="booking-expired-icon">
              <Clock3 size={24} />
            </div>
            <h2>Đơn đã hết hạn, không còn thanh toán được</h2>
            <p>
              Hệ thống phát hiện đơn hàng đã hết thời gian giữ ghế 5 phút. Hệ
              thống không phát hành vé cho ghế đã hết hạn giữ và đã giải phóng
              ghế{order?.seats?.length ? ` ${orderSeatNames}` : " đã chọn"} về
              lại sơ đồ phòng chiếu.
            </p>
            <button
              className="button button-primary booking-expired-action"
              onClick={exitExpiredBooking}
            >
              Đặt lại vé / Chọn lại ghế <span aria-hidden="true">→</span>
            </button>
          </div>
        </Modal>
      )}

      {conflictInfo && (
        <SeatConflictModal
          conflictInfo={conflictInfo}
          onClose={() => {
            const blocked = new Set(conflictInfo.seatIds || []);
            setSelected((curr) => curr.filter((id) => !blocked.has(id)));
            setConflictInfo(null);
            void refresh().catch(() => {});
          }}
        />
      )}
    </Modal>
  );
}

export default function BookingConsole(props = {}) {
  if (props.preview) return <BookingPreview />;
  if (!props.booking)
    return <p role="status">Chọn một suất chiếu để mở sơ đồ ghế.</p>;
  return <LiveBookingConsole {...props} />;
}
