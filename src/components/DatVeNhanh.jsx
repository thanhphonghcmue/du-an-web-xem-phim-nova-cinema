// DatVeNhanh: mã nguồn chức năng, dùng chung cho mọi trang.
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Film,
  MapPin,
  Popcorn,
  ShieldCheck,
  Ticket,
  UsersRound,
} from "lucide-react";
import { useCatalog } from "../catalog.js";
import { apiGetShowtimeSeats } from "../api/client.js";
import { useI18n } from "../i18n.js";

export default function DatVeNhanh({
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
  const { t } = useI18n();
  const { cinemas, movies, rooms, getDates, getShowtimes, isLive } =
    useCatalog();
  const [capacities, setCapacities] = useState({});
  const cinema = cinemas.find((item) => item.id === cinemaId);
  const films = movies.filter(
    (movie) => cinema?.movies.includes(movie.id) && movie.status !== "soon",
  );
  const dates = getDates("vi", cinemaId, movieId);
  const times =
    dateId && movieId ? getShowtimes(cinemaId, movieId, dateId) : [];
  const timeKey = times.map((time) => time.id).join(",");
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
            results
              .filter((result) => result.status === "fulfilled")
              .map((result) => result.value),
          ),
        );
    }
    void update();
    const timer = setInterval(update, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [timeKey]);
  return (
    <section
      id="booking"
      className="content-width booking-express"
      aria-label="Đặt vé nhanh"
    >
      <form onSubmit={onSubmit}>
        <div className="express-title">
          <Ticket size={24} />
          <div>
            <h2>{t("Đặt vé nhanh")}</h2>
            <p>Chọn rạp. Chọn phim. Hẹn giờ.</p>
          </div>
        </div>
        <label className={cinemaId ? "express-selected" : ""}>
          <span>
            <MapPin size={13} />
            01 · CỤM RẠP
          </span>
          <select
            aria-label="Chọn cụm rạp"
            value={cinemaId}
            onChange={(event) => onCinema(event.target.value)}
            required
          >
            <option value="">Chọn rạp NOVA</option>
            {cinemas.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <small>
            {cinema
              ? `${rooms.filter((room) => room.cinemaId === cinema.id).length} phòng chiếu · ${cinema.city}`
              : "Tìm điểm hẹn gần bạn"}
          </small>
        </label>
        <label className={movieId ? "express-selected" : ""}>
          <span>
            <Film size={13} />
            02 · BỘ PHIM
          </span>
          <select
            aria-label="Chọn phim"
            value={films.some((movie) => movie.id === movieId) ? movieId : ""}
            onChange={(event) => onMovie(event.target.value)}
            disabled={!cinemaId}
            required
          >
            <option value="">Bạn muốn xem gì?</option>
            {films.map((movie) => (
              <option value={movie.id} key={movie.id}>
                {movie.age} · {movie.title}
              </option>
            ))}
          </select>
          <small>
            {movieId
              ? "Một câu chuyện đang chờ bạn"
              : "Bom tấn & phim tuyển chọn"}
          </small>
        </label>
        <label className={dateId ? "express-selected" : ""}>
          <span>
            <CalendarDays size={13} />
            03 · NGÀY CHIẾU
          </span>
          <select
            aria-label="Chọn ngày chiếu"
            value={dateId}
            onChange={(event) => onDate(event.target.value)}
            disabled={!cinemaId || !movieId}
            required
          >
            <option value="">Ngày nào gặp nhau?</option>
            {dates.map((date) => (
              <option value={date.id} key={date.id}>
                {date.label}
              </option>
            ))}
          </select>
          <small>
            {dates.length
              ? `${dates.length} ngày có lịch phù hợp`
              : "Chọn ngày bạn muốn đi"}
          </small>
        </label>
        <label className={timeId ? "express-selected" : ""}>
          <span>
            <Clock3 size={13} />
            04 · GIỜ & PHÒNG
          </span>
          <select
            aria-label="Chọn suất chiếu"
            value={timeId}
            onChange={(event) => onTime(event.target.value)}
            disabled={!dateId}
            required
          >
            <option value="">Chọn giờ đẹp của bạn</option>
            {times.map((time) => (
              <option
                value={time.id}
                key={time.id}
                disabled={capacities[time.id] === 0}
              >
                {time.displayTime} ·{" "}
                {time.roomName || time.label.split(" · ")[1]}
                {typeof capacities[time.id] === "number"
                  ? ` · còn ${capacities[time.id]} ghế`
                  : ""}
              </option>
            ))}
          </select>
          <small>
            {times.length
              ? `${times.length} lựa chọn giờ & phòng`
              : "Sáng, chiều, tối & suất muộn"}
          </small>
        </label>
        <button
          className="button button-primary express-submit"
          disabled={!isLive || !cinemaId || !movieId || !dateId || !timeId}
        >
          Đặt ngay <ArrowRight size={18} />
        </button>
      </form>
      <div className="express-bottom">
        <label>
          <input
            type="checkbox"
            checked={group}
            onChange={(event) => onGroup(event.target.checked)}
          />
          <UsersRound size={14} />
          Đi cùng nhóm · Gợi ý đến 20 ghế
        </label>
        {withCombo && (
          <button onClick={onRemoveCombo} className="express-combo">
            <Popcorn size={13} />
            Đã thêm Party Combo · Bỏ chọn
          </button>
        )}
        <span>
          <ShieldCheck size={13} />
          Giá & ghế được xác nhận khi giữ chỗ
        </span>
      </div>
    </section>
  );
}
