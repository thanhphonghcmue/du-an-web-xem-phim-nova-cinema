import { useEffect, useState } from "react";
import { ArrowUpRight, MapPin, Ticket } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cinemas, movies, getDates, getShowtimes } from "../data.js";
import { readSeats, seats } from "../bookingStore.js";
import { useI18n } from "../i18n.js";
export default function ShowtimeTimeline({ onBook }) {
  const { language } = useI18n();
  const reduced = useReducedMotion();
  const [cinemaId, setCinemaId] = useState("landmark");
  const [dateId, setDateId] = useState(() => getDates()[0].id);
  const [filmId, setFilmId] = useState("dune");
  const [, refresh] = useState(0);
  const cinema = cinemas.find((c) => c.id === cinemaId);
  const dates = getDates(language);
  const films = movies.filter((m) => cinema.movies.includes(m.id));
  const film = films.find((m) => m.id === filmId) || films[0];
  const times = getShowtimes(cinemaId, film.id, dateId);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    const id = setInterval(update, 5000);
    window.addEventListener("storage", update);
    window.addEventListener("nova-seats", update);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", update);
      window.removeEventListener("nova-seats", update);
    };
  }, []);
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
            ? "Seat availability on this device · Demo"
            : "Ghế trống trên thiết bị này · Demo"}
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
                aria-pressed={d.id === dateId}
                className={d.id === dateId ? "active" : ""}
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
                const free =
                  seats.length -
                  Object.keys(
                    readSeats([cinema.id, film.id, dateId, time.id].join("|")),
                  ).length;
                const state =
                  free > 60 ? "plenty" : free > 20 ? "filling" : "limited";
                return (
                  <motion.button
                    key={time.id}
                    className={`timeline-show ${state}`}
                    aria-label={`${time.id}, ${free}/${seats.length} ${language === "en" ? "seats available" : "ghế trống"}`}
                    whileHover={reduced ? undefined : { y: -2 }}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    onClick={() =>
                      onBook({
                        movie: film,
                        cinema,
                        date: dates.find((d) => d.id === dateId),
                        time,
                        group: false,
                        combo: false,
                      })
                    }
                  >
                    <span className="timeline-show-format">
                      {time.label.split(" · ")[1]}
                    </span>
                    <strong>{time.id}</strong>
                    <small>{time.room}</small>
                    <span className="seat-capacity-track">
                      <i style={{ width: `${(free / seats.length) * 100}%` }} />
                    </span>
                    <span className="show-capacity-label">
                      {language === "en" ? "Available" : "Còn"} {free}/
                      {seats.length} {language === "en" ? "seats" : "ghế"}
                      <Ticket size={14} />
                    </span>
                  </motion.button>
                );
              })}
            </div>
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
