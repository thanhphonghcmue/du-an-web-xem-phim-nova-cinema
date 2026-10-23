/**
 * ==============================================================================
 * TỆP TIN: src/components/ShowtimeTimeline.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Lịch Chiếu Phim Trực Quan Theo Rạp & Suất Chiếu (Showtime Schedule Timeline).
 *   - Hiển thị danh sách rạp (Hà Nội, TP.HCM, Đà Nẵng) và lịch chiếu theo ngày (hôm nay, ngày mai...).
 *   - Tự động thăm dò (Polling) tình trạng ghế trống theo từng khung giờ (ví dụ: "Còn 142/160 ghế").
 *   - Phân biệt mức giá vé ngày thường và cuối tuần (Thứ 7, Chủ Nhật).
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Khách hàng bấm chọn Cụm Rạp -> Chọn Phim -> Chọn Ngày chiếu.
 *   2. Component hiển thị các thẻ khung giờ chiếu (10:00, 13:30, 16:45, 19:30, 22:30).
 *   3. Khách hàng click vào một khung giờ -> kích hoạt `onBook(...)` để chuyển sang màn hình chọn ghế.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng tra cứu lịch chiếu chi tiết của rạp yêu thích.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Bổ sung bộ lọc xem nhanh "Chỉ hiện suất chiếu IMAX" hoặc "Suất sau 18:00".
 *   - Thêm nút "Nhận thông báo khi mở bán vé" cho các phim bom tấn sắp ra rạp.
 * ==============================================================================
 */

import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin, Ticket } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCatalog } from "../catalog.js";
import { apiGetShowtimeSeats } from "../api/client.js";
import { useI18n } from "../i18n.js";
export default function ShowtimeTimeline({ onBook }) {
  const { language } = useI18n();
  const { cinemas, movies, getDates, getShowtimes } = useCatalog();
  const [capacities, setCapacities] = useState({});
  const reduced = useReducedMotion();
  const [cinemaId, setCinemaId] = useState(cinemas[0]?.id || "");
  const [dateId, setDateId] = useState(() => getDates()[0]?.id || "");
  const [filmId, setFilmId] = useState(movies[0]?.id || "");
  const cinema = cinemas.find((c) => c.id === cinemaId);

  const films = movies.filter((m) => cinema?.movies.includes(m.id));
  const film = films.find((m) => m.id === filmId) || films[0];
  const dates = getDates(language, cinemaId, film?.id);
  const activeDate = dates.some((d) => d.id === dateId) ? dateId : dates[0]?.id;
  const activeDateObj = dates.find((d) => d.id === activeDate);
  const isWeekend =
    activeDateObj?.label?.includes("Thứ 7") ||
    activeDateObj?.label?.includes("Chủ nhật") ||
    activeDateObj?.label?.includes("CN") ||
    activeDateObj?.label?.includes("Sat") ||
    activeDateObj?.label?.includes("Sun");
  const times = getShowtimes(cinemaId, film?.id, activeDate);
  const timeKey = times.map((t) => t.id).join(",");
  useEffect(() => {
    let active = true;
    async function update() {
      const results = await Promise.allSettled(
        timeKey
          .split(",")
          .filter(Boolean)
          .map(async (id) => [id, (await apiGetShowtimeSeats(id)).capacity]),
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
  if (!cinema || !film)
    return (
      <section id="showtimes" className="content-width section-space">
        <h2>Lịch chiếu</h2>
        <p>Chưa có suất chiếu. Vui lòng quay lại sau.</p>
      </section>
    );
  return (
    <section
      id="showtimes"
      className="timeline-section content-width section-space"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">
            {language === "en"
              ? "YOUR EVENING, YOUR WAY"
              : "MỘT BUỔI TỐI DÀNH RIÊNG CHO BẠN"}
          </p>
          <h2>
            {language === "en"
              ? "A good film. A perfect time."
              : "Phim hay. Đúng lúc."}
          </h2>
        </div>
        <span className="timeline-status">
          {language === "en"
            ? "Live seat availability"
            : "Ghế trống từ hệ thống"}
        </span>
      </div>
      <div className="timeline-workspace" data-ui>
        <div className="timeline-filters">
          <label>
            <MapPin size={16} />
            <select
              value={cinemaId}
              aria-label={
                language === "en" ? "Timeline cinema" : "Rạp trong lịch chiếu"
              }
              onChange={(e) => {
                setCinemaId(e.target.value);
                setFilmId(
                  cinemas.find((c) => c.id === e.target.value).movies[0],
                );
              }}
            >
              {cinemas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="timeline-dates">
            {dates.map((d) => (
              <button
                key={d.id}
                aria-pressed={d.id === activeDate}
                className={d.id === activeDate ? "active" : ""}
                onClick={() => setDateId(d.id)}
              >
                <strong>{d.id.slice(-2)}</strong>
                <span>{d.label.split(",")[0]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="timeline-body">
          <div
            className="timeline-film-list"
            role="tablist"
            aria-label={
              language === "en" ? "Choose a film" : "Phim trong lịch chiếu"
            }
          >
            {films.map((m) => (
              <button
                role="tab"
                aria-selected={m.id === film.id}
                className={m.id === film.id ? "active" : ""}
                onClick={() => setFilmId(m.id)}
                key={m.id}
              >
                <img
                  src={m.localPoster || m.poster}
                  alt=""
                  width="50"
                  height="75"
                />
                <span>
                  <strong>{language === "en" ? m.original : m.title}</strong>
                  <small>
                    {m.age} · {m.duration} {language === "en" ? "min" : "phút"}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
          <div className="timeline-content">
            <div className="timeline-film-heading">
              <h3>{language === "en" ? film.original : film.title}</h3>
              <span>
                {film.format} · {cinema.name}
              </span>
            </div>
            <div className="timeline-shows">
              {times.map((time) => {
                const free = capacities[time.id]?.available ?? "—";
                const total = capacities[time.id]?.total ?? "—";
                const state =
                  free > 60 ? "plenty" : free > 20 ? "filling" : "limited";
                return (
                  <motion.button
                    key={time.id}
                    className={`timeline-show ${state}`}
                    aria-label={`${time.displayTime}, ${free}/${total} ${language === "en" ? "seats available" : "ghế trống"}`}
                    whileHover={reduced ? undefined : { y: -2 }}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    onClick={() =>
                      onBook({
                        showtimeId: time.id,
                        movie: film,
                        cinema,
                        date: dates.find((d) => d.id === activeDate),
                        time,
                        group: false,
                        combo: false,
                      })
                    }
                  >
                    <span className="timeline-show-format">
                      {time.label.split(" · ")[1]}
                      {isWeekend && <span className="weekend-mini-tag">Cuối tuần</span>}
                    </span>
                    <strong>{time.displayTime}</strong>
                    <small>{time.room}</small>
                    <span className="seat-capacity-track">
                      <i
                        style={{
                          width: `${(typeof free === "number" && typeof total === "number" && total > 0 ? free / total : 0) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="show-capacity-label">
                      {language === "en" ? "Available" : "Còn"} {free}/{total}{" "}
                      {language === "en" ? "seats" : "ghế"}
                      <Ticket size={14} />
                    </span>
                  </motion.button>
                );
              })}
            </div>
            {times.length > 0 && (
              <div className="timeline-price-hint">
                <span>💡 <b>Quy luật giá vé:</b> Ngày thường từ 90.000đ · Cuối tuần (T7, CN) phụ thu +15.000đ/vé · Ghế VIP +20%, Sweetbox đôi +50%. Giảm giá tự động theo hạng thành viên & mã Voucher.</span>
              </div>
            )}
            {!times.length && (
              <div className="timeline-empty">
                <p>
                  {language === "en"
                    ? "The curtain has fallen for today."
                    : "Hôm nay đã hạ màn."}
                </p>
                <button
                  className="button button-glass"
                  onClick={() => setDateId(dates[1].id)}
                >
                  {language === "en"
                    ? "See tomorrow’s showtimes"
                    : "Xem suất chiếu ngày mai"}
                  <ArrowUpRight size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
