import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Play,
  Popcorn,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useCatalog } from "../catalog.js";

export default function CinemaHero({
  movie,
  featured,
  active,
  onChange,
  onBook,
  onMovie,
  onWelcome,
}) {
  const { rooms, cinemas, showtimes, isLive } = useCatalog();
  return (
    <section
      className={`nova-premiere hero-${movie.artId || movie.id}`}
      aria-label="Phim nổi bật"
    >
      <img
        key={movie.id}
        className="premiere-scene"
        src={movie.localBackdrop || movie.backdrop || "/images/cinema-imax.jpg"}
        alt=""
        fetchPriority="high"
      />
      <div className="premiere-atmosphere" />
      <div className="content-width premiere-content">
        <div className="premiere-copy">
          <p className="premiere-eyebrow">
            <span />
            NOVA SELECTED <i /> CINEMA BEYOND THE ORDINARY
          </p>
          <p className="premiere-invitation">
            Đừng chỉ xem.
            <br />
            <em>Bước vào điện ảnh.</em>
          </p>
          <h1>{movie.short || movie.title}</h1>
          <p className="premiere-subtitle">{movie.part}</p>
          <div className="premiere-meta">
            <span className={`classification classification-${movie.age}`}>
              {movie.age}
            </span>
            <span>
              <Clock3 size={13} />
              {movie.duration} phút
            </span>
            <span>
              <Star size={13} fill="currentColor" />
              {movie.rating}
            </span>
            <span>NOVA CINEMA</span>
          </div>
          <p className="premiere-description">
            {movie.artId === "inception"
              ? "Một ý tưởng có thể thay đổi cả thế giới. Cùng Dom Cobb bước qua những tầng giấc mơ, nơi thực tại không còn như bạn nghĩ."
              : movie.description}
          </p>
          <div className="premiere-actions">
            <button
              className="button button-primary"
              onClick={() => onBook(movie)}
              disabled={!movie.id}
            >
              <Ticket size={18} />
              Chọn suất & đặt vé <ArrowUpRight size={18} />
            </button>
            <button
              className="button premiere-trailer"
              onClick={() => onMovie(movie, "trailer")}
            >
              <Play size={17} />
              Xem trailer
            </button>
          </div>
          <div className="premiere-discover">
            <Link href="/sap-chieu">
              Hẹn bạn tháng sau <ArrowRight size={13} />
            </Link>
            <button onClick={onWelcome}>
              <Popcorn size={14} />
              Ưu đãi mở màn
            </button>
          </div>
        </div>
        <div className="premiere-side">
          <span>A NOVA CINEMA EXPERIENCE</span>
          <strong>
            Thực tại
            <br />
            chỉ là
            <br />
            <em>khởi đầu.</em>
          </strong>
          <button
            onClick={() => onMovie(movie)}
            aria-label={`Thông tin ${movie.title}`}
          >
            <img src={movie.localPoster || movie.poster} alt={movie.title} />
            <span>
              KHÁM PHÁ BỘ PHIM <ArrowUpRight size={16} />
            </span>
          </button>
        </div>
      </div>
      <div className="content-width premiere-bottom">
        <div className="premiere-facts">
          <span>
            <b>{isLive ? cinemas.length : "—"}</b> cụm rạp
          </span>
          <span>
            <b>{isLive ? rooms.length : "—"}</b> phòng chiếu
          </span>
          <span>
            <b>{isLive ? showtimes.length : "—"}</b> suất đang mở
          </span>
          <Link href="/dat-ve">
            Tìm cuộc hẹn của bạn <ArrowDown size={15} />
          </Link>
        </div>
        <div className="premiere-controls">
          <button
            aria-label="Phim nổi bật trước"
            onClick={() =>
              onChange((active + featured.length - 1) % featured.length)
            }
          >
            <ChevronLeft size={18} />
          </button>
          {featured.map((film, index) => (
            <button
              key={film.id}
              className={index === active ? "active" : ""}
              aria-label={`Xem banner ${film.title}`}
              aria-current={index === active ? "true" : undefined}
              onClick={() => onChange(index)}
            >
              <span>0{index + 1}</span>
              <i />
            </button>
          ))}
          <button
            aria-label="Phim nổi bật tiếp theo"
            onClick={() => onChange((active + 1) % featured.length)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <span className="premiere-art-note">
        <Sparkles size={10} />
        Concept art NOVA · Tuyển tập tái chiếu
      </span>
    </section>
  );
}
