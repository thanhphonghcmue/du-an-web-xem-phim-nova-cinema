// LichChieuPhim: mã nguồn chức năng, dùng chung cho mọi trang.
/**
 * ==============================================================================
 * TỆP TIN: src/components/ShowtimeTimeline.jsx
 * CHÚ Ý: Tệp này đã được chuẩn hóa tên theo chức năng tiếng Việt:
 *   👉 Vui lòng xem và chỉnh sửa tại: src/components/LichChieuPhim.jsx
 * ==============================================================================
 */

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  MapPin,
  Ticket,
  Clock3,
  SlidersHorizontal,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCatalog } from "../catalog.js";
import { money } from "../data.js";
import { apiGetShowtimeSeats } from "../api/client.js";
import { useI18n } from "../i18n.js";
export default function LichChieuPhim({ onBook }) {
  const { language } = useI18n();
  const { cinemas, movies, rooms, getDates, getShowtimes } = useCatalog();
  const [capacities, setCapacities] = useState({});
  const [period, setPeriod] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const reduced = useReducedMotion();
  const [cinemaId, setCinemaId] = useState(cinemas[0]?.id || "");
  const [dateId, setDateId] = useState(() => getDates()[0]?.id || "");
  const [filmId, setFilmId] = useState(movies[0]?.id || "");
  const cinema = cinemas.find((c) => c.id === cinemaId) || cinemas[0];
  const activeCinemaId = cinema?.id || "";

  const films = movies.filter((m) => cinema?.movies.includes(m.id));
  const film = films.find((m) => m.id === filmId) || films[0];
  const dates = getDates(language, activeCinemaId, film?.id);
  const activeDate = dates.some((d) => d.id === dateId) ? dateId : dates[0]?.id;
  const activeDateObj = dates.find((d) => d.id === activeDate);
  const isWeekend =
    activeDateObj?.label?.includes("Thứ 7") ||
    activeDateObj?.label?.includes("Chủ nhật") ||
    activeDateObj?.label?.includes("CN") ||
    activeDateObj?.label?.includes("Sat") ||
    activeDateObj?.label?.includes("Sun");
  const cinemaRooms = rooms.filter((room) => room.cinemaId === activeCinemaId);
  const activeRoom = cinemaRooms.some((room) => room.id === roomFilter)
    ? roomFilter
    : "all";
  const allTimes = getShowtimes(activeCinemaId, film?.id, activeDate);
  const times = allTimes.filter((time) => {
    const hour = Number(time.displayTime.slice(0, 2));
    return (
      (activeRoom === "all" || time.roomId === activeRoom) &&
      (period === "all" ||
        (period === "morning" && hour < 12) ||
        (period === "afternoon" && hour >= 12 && hour < 17) ||
        (period === "evening" && hour >= 17 && hour < 21) ||
        (period === "late" && hour >= 21))
    );
  });
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
              value={activeCinemaId}
              aria-label={
                language === "en" ? "Timeline cinema" : "Rạp trong lịch chiếu"
              }
              onChange={(e) => {
                setCinemaId(e.target.value);
                setRoomFilter("all");
                setPeriod("all");
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
            <div className="schedule-tools">
              <div
                className="schedule-periods"
                role="group"
                aria-label="Lọc buổi chiếu"
              >
                {[
                  ["all", "Tất cả giờ"],
                  ["morning", "Buổi sáng"],
                  ["afternoon", "Buổi chiều"],
                  ["evening", "Buổi tối"],
                  ["late", "Suất muộn"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={period === key}
                    className={period === key ? "active" : ""}
                    onClick={() => setPeriod(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="schedule-room-filter">
                <SlidersHorizontal size={14} />
                <select
                  aria-label="Phòng chiếu trong lịch"
                  value={activeRoom}
                  onChange={(event) => setRoomFilter(event.target.value)}
                >
                  <option value="all">
                    Tất cả phòng ({cinemaRooms.length})
                  </option>
                  {cinemaRooms.map((room) => (
                    <option value={room.id} key={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="schedule-count">
              <Clock3 size={13} />
              {times.length} suất phù hợp
              {activeDateObj ? ` · ${activeDateObj.label}` : ""}
              <span>Chọn một giờ để xem sơ đồ ghế</span>
            </div>
            <div className="timeline-shows">
              {times.length === 0 && (
                <div className="schedule-empty">
                  <Clock3 size={25} />
                  <h4>Chưa có suất phù hợp bộ lọc</h4>
                  <p>Chọn ngày khác hoặc mở lại tất cả giờ và phòng.</p>
                  <button
                    onClick={() => {
                      setPeriod("all");
                      setRoomFilter("all");
                    }}
                  >
                    Xóa bộ lọc giờ & phòng
                  </button>
                </div>
              )}
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
                      {isWeekend && (
                        <span className="weekend-mini-tag">Cuối tuần</span>
                      )}
                    </span>
                    <strong>{time.displayTime}</strong>
                    <small>{time.roomName}</small>
                    <span className="show-price">
                      Từ {money(time.baseTicketPrice)}
                    </span>
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
                <span>
                  Giá vé theo từng suất và phòng chiếu. Ghế VIP, Sweetbox, bắp
                  nước và quyền lợi thành viên được tính vào tổng tiền khi giữ
                  chỗ.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
