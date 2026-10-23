/**
 * ==============================================================================
 * TỆP TIN: src/components/QuickBooking.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Thanh Đặt Vé Nhanh 4 Bước Trực Quan (4-Step Quick Booking Wizard).
 *   - Quy trình tinh gọn cho khách hàng:
 *     + Bước 1: Chọn Cụm rạp (NOVA Landmark 81, NOVA West Lake, NOVA Riverside)
 *     + Bước 2: Chọn Phim chiếu rạp
 *     + Bước 3: Chọn Ngày chiếu (Hôm nay, Ngày mai, hoặc các ngày trong tuần)
 *     + Bước 4: Chọn Suất chiếu & Định dạng (IMAX Laser, 2D Laser, Dolby Atmos)
 *   - Hiển thị số lượng ghế trống thực tế (`free: capacities[id]`) được cập nhật mỗi 10 giây.
 *   - Hỗ trợ tùy chọn đặt nhóm (≤ 20 ghế) và đính kèm Party Combo bắp nước.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Người dùng chọn từng bước; hệ thống tự động suy luận bước kế tiếp (`inferred`).
 *   2. Sau khi chọn đủ 4 bước -> Nút "Đặt vé ngay" hoặc "Xếp cụm nhóm" sáng lên.
 *   3. Người dùng bấm nút -> kích hoạt `onSubmit` mở hộp thoại chọn ghế (`SeatBooking`).
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng muốn đặt vé nhanh chóng mà không cần lướt qua từng trang chi tiết.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tự động định vị GPS để chọn cụm rạp gần vị trí của khách hàng nhất.
 *   - Tự động gợi ý suất chiếu gần thời điểm hiện tại nhất (ví dụ còn 30 phút nữa là chiếu).
 * ==============================================================================
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Film,
  MapPin,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useCatalog } from "../catalog.js";
import { apiGetShowtimeSeats } from "../api/client.js";
import { useI18n } from "../i18n.js";

export default function QuickBooking({
  cinemaId,
  movieId,
  dateId,
  timeId,
  onCinema,
  onMovie,
  onDate,
  onTime,
  group,
  onGroup,
  onSubmit,
  withCombo,
  onRemoveCombo,
}) {
  const { language, t } = useI18n();
  const { cinemas, movies, getDates, getShowtimes } = useCatalog();
  const [capacities, setCapacities] = useState({});
  const reduced = useReducedMotion();
  const [step, setStep] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const cinema = cinemas.find((c) => c.id === cinemaId),
    film = movies.find((m) => m.id === movieId);
  const dates = getDates(language, cinemaId, movieId);
  const date = dates.find((d) => d.id === dateId);
  const times =
    dateId && movieId ? getShowtimes(cinemaId, movieId, dateId) : [];
  const inferred = !cinemaId ? 0 : !movieId ? 1 : !dateId ? 2 : 3;
  const active = step === null ? inferred : Math.min(step, inferred);
  const values = [
    cinema?.name,
    film?.title,
    date?.label,
    times.find((t) => t.id === timeId)?.displayTime,
  ];
  const labels = ["Chọn cụm rạp", "Chọn phim", "Chọn ngày", "Chọn suất chiếu"];
  const icons = [MapPin, Film, Clock3, Clock3];
  const timeKey = times.map((t) => t.id).join(",");
  useEffect(() => {
    let active = true;
    async function update() {
      const results = await Promise.allSettled(
        timeKey
          .split(",")
          .filter(Boolean)
          .map(async (id) => [
            id,
            (await apiGetShowtimeSeats(id)).capacity.available,
          ]),
      );
      if (active)
        setCapacities(
          Object.fromEntries(
            results.filter((r) => r.status === "fulfilled").map((r) => r.value),
          ),
        );
    }
    void update();
    const timer = setInterval(update, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [timeKey]);
  const availability = times.map((time) => ({
    ...time,
    free: capacities[time.id] ?? "—",
    status: (capacities[time.id] ?? 0) > 60 ? "plenty" : "limited",
  }));
  function choose(fn, value, next) {
    fn(value);
    setStep(next);
    setExpanded(true);
    requestAnimationFrame(() =>
      document
        .getElementById(`booking-step-${next}`)
        ?.focus({ preventScroll: true }),
    );
  }
  return (
    <section
      id="booking"
      className="quick-booking content-width visual-booking"
      data-ui
    >
      <div className="booking-topline">
        <div>
          <span className="booking-lightning">
            <Sparkles size={18} />
          </span>
          <h2>{t("Đặt vé nhanh")}</h2>
          <span className="booking-30">
            {t("30 giây để chạm đến điện ảnh")}
          </span>
        </div>
        <span className="wizard-demo">
          {language === "en"
            ? "LIVE SHOWTIMES · SANDBOX"
            : "LỊCH CHIẾU TỪ HỆ THỐNG · SANDBOX"}
        </span>
      </div>
      <motion.div
        className="wizard-shell"
        layout
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <div className="wizard-steps">
          {labels.map((label, i) => {
            const Icon = icons[i];
            return (
              <button
                key={label}
                id={`booking-step-${i}`}
                aria-controls="booking-options"
                aria-expanded={expanded && active === i}
                className={`wizard-step ${active === i ? "active" : ""} ${values[i] ? "complete" : ""}`}
                disabled={i > inferred}
                onClick={() => {
                  if (i === active) setExpanded((v) => !v);
                  else {
                    setStep(i);
                    setExpanded(true);
                  }
                }}
                aria-current={active === i ? "step" : undefined}
              >
                <span className="wizard-number">
                  {values[i] ? (
                    <Check size={14} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <small>{t(label)}</small>
                  <strong>
                    {values[i] ||
                      (language === "en"
                        ? "Make your selection"
                        : "Chọn trải nghiệm của bạn")}
                  </strong>
                </div>
                <Icon size={17} />
                {active === i && (
                  <motion.span
                    className="wizard-tab-glow"
                    layoutId="booking-tab-glow"
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {expanded && (
          <motion.div
            id="booking-options"
            role="region"
            key={active}
            className="wizard-panel"
            aria-label={t(labels[active])}
            initial={false}
            animate={reduced ? undefined : { opacity: [0.7, 1], y: [6, 0] }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="wizard-panel-heading">
              <span>
                {language === "en"
                  ? [
                      "FIND YOUR CINEMA",
                      "WHAT ARE WE WATCHING?",
                      "PICK YOUR DAY",
                      "THE PERFECT SHOWTIME",
                    ][active]
                  : [
                      "CHỌN ĐIỂM HẸN ĐIỆN ẢNH",
                      "HÔM NAY XEM GÌ?",
                      "CHỌN NGÀY CỦA BẠN",
                      "SUẤT CHIẾU DÀNH CHO BẠN",
                    ][active]}
              </span>
              <small>
                {language === "en"
                  ? "Select a card to continue"
                  : "Chạm vào lựa chọn để tiếp tục"}
                <ChevronRight size={12} />
              </small>
            </div>
            {active === 0 && (
              <div className="cinema-choice-grid">
                {cinemas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => choose(onCinema, c.id, 1)}
                    className={`cinema-choice ${cinemaId === c.id ? "selected" : ""}`}
                    aria-label={c.name}
                  >
                    <MapPin size={22} />
                    <div>
                      <strong>{c.name}</strong>
                      <small>{c.city}</small>
                      <span>{c.formats}</span>
                    </div>
                    <i />
                    <b>{language === "en" ? "Open" : "Đang mở"}</b>
                  </button>
                ))}
              </div>
            )}
            {active === 1 && (
              <div className="mini-movie-grid">
                {movies
                  .filter(
                    (m) => cinema?.movies.includes(m.id) && m.status !== "soon",
                  )
                  .map((m) => (
                    <button
                      key={m.id}
                      className={`mini-movie ${movieId === m.id ? "selected" : ""}`}
                      onClick={() => choose(onMovie, m.id, 2)}
                      aria-label={m.title}
                    >
                      <img
                        src={m.localPoster || m.poster}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.opacity = 0;
                        }}
                      />
                      <span>
                        <strong>
                          {language === "en" ? m.original : m.title}
                        </strong>
                        <small>
                          {m.age} · {m.duration}{" "}
                          {language === "en" ? "min" : "phút"} · {m.format}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
              </div>
            )}
            {active === 2 && (
              <div className="date-pills">
                {dates.map((d, i) => {
                  const jsDate = new Date(`${d.id}T12:00:00+07:00`);
                  return (
                    <button
                      key={d.id}
                      className={dateId === d.id ? "selected" : ""}
                      onClick={() => choose(onDate, d.id, 3)}
                      aria-label={d.label}
                    >
                      <small>
                        {i === 0
                          ? language === "en"
                            ? "Today"
                            : "Hôm nay"
                          : i === 1
                            ? language === "en"
                              ? "Tomorrow"
                              : "Ngày mai"
                            : jsDate.toLocaleDateString(
                                language === "en" ? "en-GB" : "vi-VN",
                                {
                                  weekday: "short",
                                  timeZone: "Asia/Ho_Chi_Minh",
                                },
                              )}
                      </small>
                      <strong>{d.id.slice(-2)}</strong>
                      <span>
                        {language === "en"
                          ? jsDate
                              .toLocaleDateString("en-GB", {
                                month: "short",
                                timeZone: "Asia/Ho_Chi_Minh",
                              })
                              .toUpperCase()
                          : "THÁNG " + d.id.slice(5, 7)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {active === 3 && (
              <div className="showtime-pills">
                {availability.map((time) => (
                  <button
                    key={time.id}
                    className={`showtime-pill ${time.status} ${timeId === time.id ? "selected" : ""}`}
                    onClick={() => onTime(time.id)}
                    aria-label={time.label}
                    aria-pressed={timeId === time.id}
                  >
                    <strong>{time.displayTime}</strong>
                    <span>{time.label.split(" · ")[1]}</span>
                    <small>
                      <i />
                      {time.free}{" "}
                      {language === "en" ? "seats left" : "ghế trống"}
                    </small>
                    <b>
                      {time.status === "plenty"
                        ? language === "en"
                          ? "Plenty of seats"
                          : "Còn nhiều ghế"
                        : time.status === "filling"
                          ? language === "en"
                            ? "Filling fast"
                            : "Sắp kín"
                          : language === "en"
                            ? "Almost full"
                            : "Gần hết ghế"}
                    </b>
                  </button>
                ))}
                {!times.length && (
                  <p className="muted">
                    {language === "en"
                      ? "No remaining shows today. Please choose another day."
                      : "Đã hết suất hôm nay. Hãy chọn ngày khác."}
                    <button className="text-button" onClick={() => setStep(2)}>
                      {t("Chọn ngày")}
                    </button>
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
        <div className="wizard-bottom">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={group}
              onChange={(e) => onGroup(e.target.checked)}
            />
            <span className="switch-track" />
            <UsersRound size={16} />
            <span>{t("Xếp cụm nhóm")}</span>
            <small>
              ≤ 20 {language === "en" ? "adjacent seats" : "ghế liền nhau"}
            </small>
          </label>
          <span className="hold-label">
            <ShieldCheck size={15} />
            {t("Giữ ghế an toàn trong 5 phút")}
          </span>
          <button
            className="button button-primary"
            onClick={() => onSubmit({ preventDefault() {} })}
            disabled={!timeId}
          >
            <Sparkles size={17} />
            {t("Tìm ghế đẹp")}
            <ArrowRight size={18} />
          </button>
        </div>
      </motion.div>
      {withCombo && (
        <div className="combo-attached">
          <Check size={14} />
          {language === "en"
            ? "Choose your popcorn and drinks before confirming seats"
            : "Chọn bắp nước trước khi xác nhận giữ ghế"}
          <button onClick={onRemoveCombo}>
            {language === "en" ? "Remove" : "Bỏ combo"}
          </button>
        </div>
      )}
    </section>
  );
}
