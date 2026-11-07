// DatVeNhanh: mã nguồn chức năng, dùng chung cho mọi trang.
import CinemaPicker from "./CinemaPicker.jsx";
import QuickChoice from "./QuickChoice.jsx";
import DateSelector from "./DateSelector.jsx";
import { friendlyDay } from "@/bookingDates.js";
import { money } from "@/data.js";
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
import { useCatalog } from "@/catalog.js";
import { useI18n } from "@/i18n.js";
import { useEffect, useState } from "react";
import { apiList } from "@/api/client.js";
import { timeLabel } from "@/catalog.js";

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
  const { t, language } = useI18n();
  const { cinemas, movies, rooms, getDates, getShowtimes, isLive } =
    useCatalog();
  const cinema = cinemas.find((item) => item.id === cinemaId);
  const films = movies.filter((movie) => cinema?.movies.includes(movie.id));
  const dates = getDates("vi", cinemaId, movieId);
  const cachedTimes =
    dateId && movieId ? getShowtimes(cinemaId, movieId, dateId) : [];
  const scheduleKey = `${cinemaId}/${movieId}/${dateId}`;
  const [schedule, setSchedule] = useState(null);
  useEffect(() => {
    if (!cinemaId || !movieId || !dateId || !isLive) return;
    let active = true;
    const sync = async () => {
      try {
        const items = await apiList("/showtimes", {
          cinemaId,
          movieId,
          date: dateId,
        });
        if (active)
          setSchedule({
            key: scheduleKey,
            items: items.filter(
              (time) => Date.parse(time.startTime) > Date.now(),
            ),
          });
      } catch {
        /* Catalogue đã tải vẫn cho chọn; backend luôn kiểm tra lại trạng thái. */
      }
    };
    void sync();
    window.addEventListener("focus", sync);
    window.addEventListener("nova-showtime-status", sync);
    return () => {
      active = false;
      window.removeEventListener("focus", sync);
      window.removeEventListener("nova-showtime-status", sync);
    };
  }, [cinemaId, movieId, dateId, isLive, scheduleKey]);
  const times = (
    schedule?.key === scheduleKey ? schedule.items : cachedTimes
  ).map((time) => ({
    ...time,
    displayTime: time.displayTime || timeLabel(time.startTime),
    roomName:
      time.roomName ||
      rooms.find((room) => room.id === time.roomId)?.name ||
      "",
  }));
  const movie = films.find((movie) => movie.id === movieId);
  const selectedTime = times.find((time) => time.id === timeId);

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
            <p>{t("Chọn rạp. Chọn phim. Hẹn giờ.")}</p>
          </div>
        </div>
        <label className={cinemaId ? "express-selected" : ""}>
          <span>
            <MapPin size={13} />
            {t("01 · CỤM RẠP")}
          </span>
          <CinemaPicker value={cinemaId} onChange={onCinema} />
          <small>
            {cinema
              ? `${rooms.filter((room) => room.cinemaId === cinema.id).length} phòng chiếu · ${cinema.city}`
              : "Tìm điểm hẹn gần bạn"}
          </small>
        </label>
        <label className={movieId ? "express-selected" : ""}>
          <span>
            <Film size={13} />
            {t("02 · BỘ PHIM")}
          </span>
          <QuickChoice
            label="Chọn phim"
            title="Bộ phim bạn muốn xem"
            value={movieId}
            onChange={onMovie}
            disabled={!cinemaId}
            placeholder="Bạn muốn xem phim gì?"
            items={films.map((movie) => ({
              id: movie.id,
              name: language === "en" ? movie.original : movie.title,
              image: movie.localPoster || movie.poster,
              description: `${movie.age} · ${movie.duration} phút`,
              detail:
                movie.status === "soon"
                  ? t("Đã mở bán trước")
                  : t("Đang chiếu"),
            }))}
          />
          <small>
            {movieId
              ? "Một câu chuyện đang chờ bạn"
              : "Bom tấn & phim tuyển chọn"}
          </small>
        </label>
        <label className={dateId ? "express-selected" : ""}>
          <span>
            <CalendarDays size={13} />
            {t("03 · NGÀY CHIẾU")}
          </span>
          <DateSelector
            dates={dates}
            value={dateId}
            onChange={onDate}
            disabled={!cinemaId || !movieId}
          />
          <small>
            {cinemaId && movieId && dates.length
              ? `${language === "en" ? "Book ahead" : "Đặt vé trước"} · ${dates.length} ${t("ngày có lịch")}`
              : "Chọn ngày bạn muốn đi"}
          </small>
        </label>
        <label className={timeId ? "express-selected" : ""}>
          <span>
            <Clock3 size={13} />
            {t("04 · GIỜ & PHÒNG")}
          </span>
          <QuickChoice
            label="Chọn suất chiếu"
            title="Chọn giờ & phòng chiếu"
            value={timeId}
            onChange={onTime}
            disabled={!dateId}
            placeholder="Chọn giờ phù hợp"
            searchable={false}
            items={times.map((time) => ({
              id: time.id,
              name: `${time.displayTime}${time.status === "LOCKED" ? " · Tạm khóa" : time.status === "CANCELED" ? " · Đã hủy" : ""}`,
              disabled: time.status !== undefined && time.status !== "ACTIVE",
              description: time.roomName,
              detail: `Từ ${money(time.baseTicketPrice)} · ${t("Xem ghế trống")}`,
            }))}
          />
          <small>
            {times.length
              ? `${times.length} lựa chọn giờ & phòng`
              : "Sáng, chiều, tối & suất muộn"}
          </small>
        </label>
        <button
          className="button button-primary express-submit"
          disabled={
            !isLive ||
            (selectedTime?.status !== undefined &&
              selectedTime.status !== "ACTIVE")
          }
        >
          {t("Đặt ngay")} <ArrowRight size={18} />
        </button>
      </form>
      {(cinema || movie) && (
        <div
          className="booking-choice-summary"
          aria-label="Lựa chọn đặt vé của bạn"
        >
          <div>
            <p className="nova-kicker">{t("LỰA CHỌN CỦA BẠN")}</p>
            <strong>{movie?.title || "Chọn bộ phim bạn muốn xem"}</strong>
            <p>
              {cinema?.name}
              {dateId ? ` · ${friendlyDay(dateId, language)}` : ""}
              {selectedTime
                ? ` · ${selectedTime.displayTime} · ${selectedTime.roomName}`
                : ""}
            </p>
          </div>
          <a href="#showtimes">
            {t("So sánh lịch chiếu")} <ArrowRight size={18} />
          </a>
        </div>
      )}
      <div className="express-bottom">
        <label>
          <input
            type="checkbox"
            checked={group}
            onChange={(event) => onGroup(event.target.checked)}
          />
          <UsersRound size={14} />
          {t("Đi cùng nhóm · Gợi ý đến 20 ghế")}
        </label>
        {withCombo && (
          <button onClick={onRemoveCombo} className="express-combo">
            <Popcorn size={13} />
            {t("Đã thêm Party Combo · Bỏ chọn")}
          </button>
        )}
        <span>
          <ShieldCheck size={13} />
          {t("Giá & ghế được xác nhận khi giữ chỗ")}
        </span>
      </div>
    </section>
  );
}
