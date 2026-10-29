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
import Image from "next/image";
import { useState } from "react";
import { useCatalog } from "@/catalog.js";
import { useI18n } from "@/i18n.js";

function HeroBackdrop({ source }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? "/images/cinema-imax.jpg" : source;
  return (
    <Image
      className="premiere-scene"
      src={src}
      alt=""
      width={1920}
      height={804}
      sizes="100vw"
      fetchPriority="high"
      loading="eager"
      unoptimized={!src.startsWith("/") || src.startsWith("//")}
      onError={() => setFailed(true)}
    />
  );
}

export default function CinemaHero({
  movie,
  featured,
  active,
  onChange,
  onBook,
  onMovie,
  onWelcome,
}) {
  const { language, t } = useI18n();
  const invitations = {
    inception: ["Thực tại", "chỉ là", "khởi đầu."],
    kong: ["Màn ảnh lớn.", "Đại chiến", "bắt đầu."],
    oppenheimer: ["Lịch sử.", "Sức mạnh.", "Dư âm."],
    dune: ["Sa mạc.", "Định mệnh.", "Vô tận."],
  };
  const invitation = invitations[movie.artId] || [
    "Một bộ phim.",
    "Vạn điều",
    "đáng nhớ.",
  ];
  const { rooms, cinemas, showtimes, isLive, error } = useCatalog();
  if (!movie.id)
    return (
      <section
        className="content-width catalog-pending"
        aria-busy={!error && !isLive}
      >
        <p className="nova-kicker">NOVA CINEMA</p>
        <h1>
          {error
            ? t("Chưa tải được phim và lịch chiếu")
            : isLive
              ? t("Chưa có phim mở bán")
              : t("Đang tải phim và lịch chiếu…")}
        </h1>
        <p>{t("Thông tin đặt vé được xác nhận từ máy chủ.")}</p>
      </section>
    );
  return (
    <section
      className={`nova-premiere hero-${movie.artId || movie.id}`}
      aria-label="Phim nổi bật"
    >
      <HeroBackdrop
        key={movie.id}
        source={
          movie.localBackdrop || movie.backdrop || "/images/cinema-imax.jpg"
        }
      />
      <div className="premiere-atmosphere" />
      <div className="content-width premiere-content">
        <div className="premiere-copy">
          <p className="premiere-eyebrow">
            <span />
            NOVA SELECTED <i /> CINEMA BEYOND THE ORDINARY
          </p>
          <p className="premiere-invitation">
            {t("Đừng chỉ xem.")}
            <br />
            <em>{t("Bước vào điện ảnh.")}</em>
          </p>
          <h1>
            {language === "en" ? movie.original : movie.short || movie.title}
          </h1>
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
              ? t(
                  "Một ý tưởng có thể thay đổi cả thế giới. Cùng Dom Cobb bước qua những tầng giấc mơ, nơi thực tại không còn như bạn nghĩ.",
                )
              : movie.description}
          </p>
          <div className="premiere-actions">
            <button
              className="button button-primary"
              onClick={() => onBook(movie)}
              disabled={!movie.id}
            >
              <Ticket size={18} />
              {t("Chọn suất & đặt vé")} <ArrowUpRight size={18} />
            </button>
            <button
              className="button premiere-trailer"
              onClick={() => onMovie(movie, "trailer")}
            >
              <Play size={17} />
              {t("Xem trailer")}
            </button>
          </div>
          <div className="premiere-discover">
            <Link href="/sap-chieu">
              {t("Hẹn bạn tháng sau")} <ArrowRight size={13} />
            </Link>
            <button onClick={onWelcome}>
              <Popcorn size={14} />
              {t("Ưu đãi mở màn")}
            </button>
          </div>
        </div>
        <div className="premiere-side">
          <span>A NOVA CINEMA EXPERIENCE</span>
          <strong>
            {invitation[0]}
            <br />
            {invitation[1]}
            <br />
            <em>{invitation[2]}</em>
          </strong>
          <button
            onClick={() => onMovie(movie)}
            aria-label={`Thông tin ${movie.title}`}
          >
            <Image
              src={
                movie.localPoster || movie.poster || "/images/dune-poster.jpg"
              }
              alt={movie.title}
              width={240}
              height={360}
              sizes="160px"
              loading="lazy"
              unoptimized={!movie.localPoster}
            />
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
