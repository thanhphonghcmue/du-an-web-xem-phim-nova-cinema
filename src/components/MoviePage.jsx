import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Play,
  Star,
  Ticket,
} from "lucide-react";
import { useCatalog } from "../catalog.js";
import { nextScreeningDate, downloadReminder } from "../commerce.js";
export default function MoviePage({ id, onMovie, onBook }) {
  const { movies, cinemas, rooms, showtimes, isLive, error } = useCatalog();
  const movie = movies.find((movie) => movie.id === id);
  if (!movie)
    return (
      <section className="content-width movie-unavailable">
        <p className="nova-kicker">NOVA CINEMA</p>
        <h1>
          {!isLive && !error
            ? "Đang đọc thông tin phim…"
            : "Phim chưa có trong danh mục mở bán"}
        </h1>
        <p>
          {error || "Khám phá những câu chuyện đang chờ bạn trên màn ảnh lớn."}
        </p>
        <Link className="button button-primary" href="/phim">
          Xem danh mục phim <ArrowUpRight size={18} />
        </Link>
      </section>
    );
  const programme = showtimes.filter((show) => show.movieId === id);
  const venueIds = new Set(
    programme.map(
      (show) => rooms.find((room) => room.id === show.roomId)?.cinemaId,
    ),
  );
  const scheduled = programme.length > 0;
  const first = programme.length
    ? programme.reduce(
        (min, show) => (show.startTime < min ? show.startTime : min),
        programme[0].startTime,
      )
    : null;
  return (
    <article className="movie-page">
      <section className="movie-page-hero">
        <img
          className="movie-page-backdrop"
          src={
            movie.localBackdrop ||
            movie.backdrop ||
            "/images/campaigns/nova-dream-city.png"
          }
          alt=""
        />
        <div className="content-width movie-page-content">
          <Link href="/phim" className="movie-back-link">
            <ArrowLeft size={17} /> Trở về danh mục phim
          </Link>
          <div className="movie-page-intro">
            <img
              className="movie-page-poster"
              src={
                movie.localPoster ||
                movie.poster ||
                "/images/cinema-auditorium.jpg"
              }
              alt={`Poster ${movie.title}`}
            />
            <div>
              <p className="nova-kicker">
                {movie.status === "soon"
                  ? "CUỘC HẸN SẮP TỚI"
                  : "ĐANG CHIẾU TẠI NOVA"}
              </p>
              <h1>{movie.title}</h1>
              <p className="movie-original">{movie.original}</p>
              <div className="movie-page-meta">
                <span className={`classification classification-${movie.age}`}>
                  {movie.age}
                </span>
                <span>
                  <Clock3 size={17} />
                  {movie.duration} phút
                </span>
                {movie.rating !== "—" && (
                  <span>
                    <Star size={17} />
                    {movie.rating}
                  </span>
                )}
                <span>{movie.genre || "Điện ảnh tuyển chọn"}</span>
              </div>
              <p className="movie-page-synopsis">{movie.description}</p>
              <div className="movie-page-actions">
                <button
                  className="button button-primary"
                  onClick={() =>
                    scheduled ? onBook(movie) : downloadReminder(movie)
                  }
                >
                  <Ticket size={19} />
                  {scheduled
                    ? movie.status === "soon"
                      ? "Chọn suất đặt trước"
                      : "Chọn suất & đặt vé"
                    : "Lưu nhắc lịch .ics"}
                </button>
                {movie.trailer && (
                  <button
                    className="button button-glass"
                    onClick={() => onMovie(movie, "trailer")}
                  >
                    <Play size={18} />
                    Xem trailer
                  </button>
                )}
              </div>
              <p className="movie-page-release">
                <CalendarDays size={17} />
                {first
                  ? `Có suất từ ${new Date(first).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
                  : `Dự kiến ${new Date(nextScreeningDate(movie) + "T12:00:00+07:00").toLocaleDateString("vi-VN")}`}
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="content-width movie-page-venues">
        <div>
          <p className="nova-kicker">CHỌN ĐIỂM HẸN</p>
          <h2>
            Phim bạn thích.
            <br />
            <em>Rạp bạn muốn đến.</em>
          </h2>
          <p>Chọn rạp để mở đúng lịch phim, giờ và phòng đang bán.</p>
        </div>
        <div>
          {cinemas
            .filter((cinema) => venueIds.has(cinema.id))
            .map((cinema) => (
              <Link
                key={cinema.id}
                href={`/dat-ve?cinema=${cinema.id}&movie=${movie.id}`}
              >
                <div>
                  <strong>{cinema.name}</strong>
                  <span>{cinema.address}</span>
                </div>
                <ArrowUpRight size={22} />
              </Link>
            ))}
          {!scheduled && (
            <p className="workspace-message">
              Phim chưa có suất mở bán. Bạn có thể lưu nhắc lịch và quay lại
              sau.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
