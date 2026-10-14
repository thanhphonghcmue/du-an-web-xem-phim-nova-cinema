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
import { cinemas, movies, getDates, getShowtimes } from "../data.js";
import { readSeats, seats } from "../bookingStore.js";
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
  const reduced = useReducedMotion();
  const [step, setStep] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [, setRefresh] = useState(0);
  // Đồng bộ số ghế còn lại với các tab, không dùng số ngẫu nhiên hay báo trạng thái giả.
  useEffect(() => {
    const sync = () => setRefresh((n) => n + 1);
    const id = setInterval(sync, 5000);
    window.addEventListener("storage", sync);
    window.addEventListener("nova-seats", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", sync);
      window.removeEventListener("nova-seats", sync);
    };
  }, []);
  const cinema = cinemas.find((c) => c.id === cinemaId),
    film = movies.find((m) => m.id === movieId);
  const dates = getDates(language);
  const date = dates.find((d) => d.id === dateId);
  const times =
    dateId && movieId ? getShowtimes(cinemaId, movieId, dateId) : [];
  const inferred = !cinemaId ? 0 : !movieId ? 1 : !dateId ? 2 : 3;
  const active = step === null ? inferred : Math.min(step, inferred);
  const values = [cinema?.name, film?.title, date?.label, timeId];
  const labels = ["Chọn cụm rạp", "Chọn phim", "Chọn ngày", "Chọn suất chiếu"];
  const icons = [MapPin, Film, Clock3, Clock3];
  const availability = times.map((time) => {
    const data = readSeats([cinemaId, movieId, dateId, time.id].join("|"));
    const free = seats.length - Object.keys(data).length;
    return {
      ...time,
      free,
      status: free > 60 ? "plenty" : free > 20 ? "filling" : "limited",
    };
  });
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
            ? "LIVE ON THIS DEVICE · DEMO"
            : "ĐỒNG BỘ TRÊN THIẾT BỊ · DEMO"}
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
                    <strong>{time.id}</strong>
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
            ? "Party Combo 69K added to your booking"
            : "Party Combo 69K đã thêm vào lựa chọn của bạn"}
          <button onClick={onRemoveCombo}>
            {language === "en" ? "Remove" : "Bỏ combo"}
          </button>
        </div>
      )}
    </section>
  );
}
