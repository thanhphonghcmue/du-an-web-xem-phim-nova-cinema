import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Film,
  Infinity as InfinityIcon,
  MapPin,
  Menu,
  Play,
  Popcorn,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Ticket,
  UsersRound,
  X,
  CheckCircle2,
} from "lucide-react";
import { useCatalog } from "./catalog.js";
import {
  apiGetProfile,
  apiLogout,
  apiGetMyBookings,
  memberProfile,
} from "./api/client.js";
import TicketHistory from "./components/TicketHistory.jsx";
import StaffCheckIn from "./components/StaffCheckIn.jsx";
import Modal from "./components/Modal.jsx";
import SeatBooking from "./components/SeatBooking.jsx";
import CinematicBackdrop from "./components/CinematicBackdrop.jsx";
import GlassNavigation from "./components/GlassNavigation.jsx";
import TiltPoster from "./components/TiltPoster.jsx";
import ShowtimeTimeline from "./components/ShowtimeTimeline.jsx";
import { motion, useReducedMotion } from "framer-motion";
import QuickBooking from "./components/QuickBooking.jsx";
import AuthForm from "./components/AuthForm.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import HeaderSearch from "./components/HeaderSearch.jsx";
import { useI18n } from "./i18n.js";

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="NOVA Cinema trang chủ">
      <InfinityIcon
        className="brand-symbol"
        strokeWidth={1.8}
        stroke="url(#nova-brand-glow)"
      >
        <defs>
          <linearGradient id="nova-brand-glow">
            <stop stopColor="#E50914" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
      </InfinityIcon>
      <span>
        NOVA<span className="brand-subtitle">CINEMA</span>
      </span>
    </a>
  );
}
function MoviePoster({ movie, className = "" }) {
  return (
    <div className={`movie-art ${className}`}>
      <div className={`poster-fallback fallback-${movie.id}`}>
        <Film size={36} />
        <strong>{movie.short}</strong>
        <small>{movie.part}</small>
      </div>
      <img
        src={movie.localPoster || movie.poster || "/images/cinema-imax.jpg"}
        alt={`Poster ${movie.title}`}
        width="400"
        height="600"
        loading="lazy"
        onError={(e) => {
          if (
            movie.localPoster &&
            !e.currentTarget.src.endsWith(movie.localPoster)
          ) {
            e.currentTarget.src = movie.localPoster;
          } else {
            e.currentTarget.style.opacity = 0;
            e.currentTarget.parentElement
              .querySelector(".poster-fallback")
              ?.style.setProperty("display", "flex");
          }
        }}
      />
    </div>
  );
}
export default function App() {
  const { language, setLanguage, t } = useI18n();
  const { movies, cinemas, getDates, getShowtimes, contextFor } = useCatalog();
  const reducedMotion = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [wizardVersion, setWizardVersion] = useState(0);
  const highlights = movies.filter((m) =>
    ["dune", "oppenheimer", "kong"].includes(m.artId),
  );
  const featured = (highlights.length ? highlights : movies).slice(0, 3);
  const hero = featured[slide % featured.length] || movies[0] || {};
  const eventMovie = movies.find((m) => m.artId === "oppenheimer");
  const [cinemaId, setCinemaId] = useState("");
  const [movieId, setMovieId] = useState("");
  const [dateId, setDateId] = useState("");
  const [timeId, setTimeId] = useState("");
  const [group, setGroup] = useState(false);
  const [withCombo, setWithCombo] = useState(false);
  const [filter, setFilter] = useState("now");
  const [modal, setModal] = useState(null);
  const [activeMovie, setActiveMovie] = useState(null);
  const [booking, setBooking] = useState(null);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [member, setMember] = useState(null);
  const [sessionError, setSessionError] = useState("");
  const [userRating, setUserRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  useEffect(() => {
    // Remove credentials and invented profiles left by the former browser demo.
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of ["nova_access_token", "nova-member", "nova-tickets"])
        storage.removeItem(key);
    }
    let active = true;
    apiGetProfile()
      .then((user) => {
        if (active) setMember(memberProfile(user));
      })
      .catch((err) => {
        if (active && err.status !== 401) setSessionError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const memberId = member?.id;
  useEffect(() => {
    if (!memberId) return;
    const id = new URLSearchParams(window.location.search).get("booking");
    let active = true;
    apiGetMyBookings()
      .then((orders) => {
        const order = id
          ? orders.find((o) => o.id === id)
          : orders.find((o) => ["HOLDING", "PENDING"].includes(o.status));
        const context = order && contextFor(order.showtimeId);
        if (active && context) {
          setBooking({ ...context, orderId: order.id });
          window.history.replaceState({}, "", "/");
        }
      })
      .catch((err) => {
        if (active) setSessionError(err.message);
      });
    return () => {
      active = false;
    };
  }, [memberId, contextFor]);
  const [city, setCity] = useState("Tất cả");

  const dates = getDates(language);
  const cinema = cinemas.find((c) => c.id === cinemaId);
  useEffect(() => {
    const shortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModal("search");
        setMenu(false);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function bookMovie(movie, combo = false) {
    if (!movie) return;
    if (movie.status === "soon") {
      openMovie(movie);
      return;
    }
    if (!cinema?.movies.includes(movie.id))
      setCinemaId(cinemas.find((c) => c.movies.includes(movie.id))?.id || "");
    setWizardVersion((v) => v + 1);
    setMovieId(movie.id);
    setDateId("");
    setTimeId("");
    setWithCombo(combo);
    setModal(null);
    document
      .getElementById("booking")
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function openSeats(e) {
    e.preventDefault();
    const time = getShowtimes(cinemaId, movieId, dateId).find(
      (t) => t.id === timeId,
    );
    if (!time) {
      setTimeId("");
      return;
    }
    if (!member) {
      setModal("login");
      return;
    }
    setBooking({
      showtimeId: time.id,
      movie: movies.find((m) => m.id === movieId),
      cinema,
      date: dates.find((d) => d.id === dateId),
      time,
      group,
      combo: withCombo,
    });
  }
  function openMovie(movie, type = "movie") {
    if (type === "trailer" && !movie.trailer) type = "movie";
    setActiveMovie(movie);
    setUserRating(5);
    setUserReview("");
    setReviewSubmitted(false);
    setModal(type);
  }
  function jumpGroup() {
    setGroup(true);
    setMenu(false);
    document
      .getElementById("booking")
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const visibleMovies =
    filter === "all" ? movies : movies.filter((m) => m.status === filter);
  const results = movies.filter((m) =>
    `${t(m.title)} ${m.original} ${m.director}`
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );
  const cinemaResults = cinemas.filter((c) =>
    `${c.name} ${c.city}`
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <div id="top" className="app-shell">
      {sessionError && (
        <p role="alert" className="auth-notice">
          {sessionError}
        </p>
      )}
      <a href="#main-content" className="skip-link">
        {language === "en" ? "Skip to content" : "Đến nội dung chính"}
      </a>
      <CinematicBackdrop />
      <header className="site-header">
        <div className="nav-inner">
          <Brand />
          <GlassNavigation />
          <div className="header-actions">
            <HeaderSearch
              movies={movies}
              cinemas={cinemas}
              onMovie={openMovie}
              onCinema={(c) => {
                setCinemaId(c.id);
                setMovieId("");
                setDateId("");
                setTimeId("");
                document
                  .getElementById("booking")
                  .scrollIntoView({ behavior: "smooth" });
              }}
              onExpand={() => setModal("search")}
            />
            <button
              className="language-toggle"
              onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
              aria-label="VN / EN"
            >
              <span className={language === "vi" ? "active" : ""}>VN</span>
              <i />
              <span className={language === "en" ? "active" : ""}>EN</span>
            </button>
            <span className="nav-divider" />
            {member?.role === "ADMIN" && (
              <button
                className="admin-header-trigger"
                onClick={() => setModal("admin")}
                title="Mở Bảng Quản Trị Admin & Doanh Thu"
              >
                <Crown size={15} />
                Quản Trị Rạp
              </button>
            )}
            {["ADMIN", "STAFF"].includes(member?.role) && (
              <button className="text-button" onClick={() => setModal("staff")}>
                Soát vé
              </button>
            )}
            <button
              className="login-trigger"
              onClick={() => setModal(member ? "account" : "login")}
            >
              {member ? (
                <>
                  <Crown size={16} />
                  {member.name.split(" ").at(-1)}
                </>
              ) : (
                t("Đăng nhập")
              )}
            </button>
            <a href="#booking" className="button button-primary header-book">
              <Ticket size={15} />
              {t("Đặt vé ngay")}{" "}
            </a>
            <button
              className="icon-button mobile-toggle"
              aria-label={menu ? t("Đóng menu") : t("Mở menu")}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Điều hướng di động">
            {[
              ["#movies", t("Lịch chiếu")],
              ["#cinemas", t("Rạp Cinema")],
              ["#offers", t("Khuyến mãi 69K")],
              ["#membership", "C’MEMBER"],
              ["#events", t("Sự kiện")],
            ].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {t(label)}
                <ArrowUpRight size={16} />
              </a>
            ))}
            <button onClick={jumpGroup}>
              {t("Xếp cụm nhóm")} <UsersRound size={16} />
            </button>
            <button
              onClick={() => {
                setModal(member ? "account" : "login");
                setMenu(false);
              }}
            >
              {t("Tài khoản")} <Ticket size={16} />
            </button>
          </nav>
        )}
      </header>
      <main id="main-content" tabIndex={-1}>
        <section
          className={`hero hero-${hero.artId || hero.id}`}
          aria-label="Phim nổi bật"
        >
          <div
            key={hero.id}
            className="hero-art"
            style={{
              backgroundImage: `url("${hero.localBackdrop || hero.backdrop || "/images/cinema-imax.jpg"}")`,
            }}
          />
          <div className="hero-shade" />
          <div className="hero-grain" />
          <div className="hero-content content-width">
            <div className="hero-copy" key={hero.id}>
              <span className="hero-exclusive">
                <span className="live-dot" />
                NOVA EXCLUSIVE <span className="exclusive-divider" />{" "}
                {t("TRẢI NGHIỆM ĐIỆN ẢNH ĐỈNH CAO")}{" "}
              </span>
              <p className="hero-kicker">
                {hero.artId === "dune"
                  ? "BEYOND THE ORDINARY."
                  : hero.artId === "oppenheimer"
                    ? "THE WORLD FOREVER CHANGES."
                    : "RISE TOGETHER. FALL TOGETHER."}
              </p>
              <h1 className={hero.artId === "dune" ? "dune-title" : ""}>
                {hero.short}
              </h1>
              <p className="hero-part">{hero.part}</p>
              <div className="hero-meta">
                <span className="format-badge">
                  {hero.artId === "oppenheimer"
                    ? "IMAX 70MM LASER"
                    : "IMAX LASER"}
                </span>
                <span className="dolby-badge">▣ DOLBY ATMOS</span>
                <span className="rating">
                  <Star size={14} fill="currentColor" />
                  {hero.rating}
                  <small>/10</small>
                </span>
                <span className="age-badge">{hero.age}</span>
                <span className="duration">
                  <Clock3 size={14} />
                  {hero.duration} {t("phút")}{" "}
                </span>
              </div>
              <p className="hero-description">{t(hero.description)}</p>
              <div className="hero-buttons">
                <button
                  className="button button-primary"
                  disabled={!hero.id}
                  onClick={() => bookMovie(hero)}
                >
                  <Ticket size={18} />
                  {t("Đặt vé bây giờ")} <ArrowUpRight size={18} />
                </button>
                <button
                  className="button button-glass"
                  onClick={() => openMovie(hero, "trailer")}
                >
                  <Play size={16} fill="currentColor" />
                  Xem trailer 4K
                </button>
              </div>
              <p className="hero-tagline">{t(hero.tagline)}</p>
              <div className="hero-shortcuts">
                <a href="#movies">
                  {language === "en"
                    ? "Now showing"
                    : "Phim hot tháng " +
                      new Date().toLocaleDateString("vi-VN", {
                        month: "2-digit",
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                  <ArrowRight size={13} />
                </a>
                <a href="#offers">
                  Party Combo 69K
                  <Popcorn size={13} />
                </a>
                <button onClick={jumpGroup}>
                  {t("Xếp cụm nhóm")}
                  <UsersRound size={13} />
                </button>
              </div>
            </div>
            <div className="hero-side-note">
              <span>THE INFINITY EXPERIENCE</span>
              <i />
              <small>01 / IMAX LASER</small>
            </div>
          </div>
          <div className="hero-bottom content-width">
            <a href="#booking" className="scroll-label">
              <ArrowDown size={16} /> {t("KHÁM PHÁ TRẢI NGHIỆM")}{" "}
            </a>
            <div className="carousel-controls">
              <button
                aria-label="Phim nổi bật trước"
                className="icon-button"
                onClick={() =>
                  setSlide((slide + featured.length - 1) % featured.length)
                }
              >
                <ChevronLeft size={17} />
              </button>
              <div className="carousel-pages">
                {featured.map((m, i) => (
                  <button
                    className={i === slide ? "active" : ""}
                    onClick={() => setSlide(i)}
                    aria-label={`Xem banner ${t(m.title)}`}
                    aria-current={i === slide ? "true" : undefined}
                    key={m.id}
                  >
                    <span>0{i + 1}</span>
                    <i />
                  </button>
                ))}
              </div>
              <button
                aria-label="Phim nổi bật tiếp theo"
                className="icon-button"
                onClick={() => setSlide((slide + 1) % featured.length)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
        <QuickBooking
          key={wizardVersion}
          cinemaId={cinemaId}
          movieId={movieId}
          dateId={dateId}
          timeId={timeId}
          onCinema={(v) => {
            setCinemaId(v);
            setMovieId("");
            setDateId("");
            setTimeId("");
          }}
          onMovie={(v) => {
            setMovieId(v);
            setDateId("");
            setTimeId("");
          }}
          onDate={(v) => {
            setDateId(v);
            setTimeId("");
          }}
          onTime={setTimeId}
          group={group}
          onGroup={setGroup}
          onSubmit={openSeats}
          withCombo={withCombo}
          onRemoveCombo={() => setWithCombo(false)}
        />
        <div className="experience-strip content-width">
          <span>
            <InfinityIcon size={23} />
            <b>
              {t("Không chỉ xem phim.")} <br />
              <em>{t("Sống trong từng khung hình.")} </em>
            </b>
          </span>
          <span>
            <i>IMAX</i>
            <small>{t("MÀN ẢNH VÔ CỰC")} </small>
          </span>
          <span>
            <i className="dolby-type">▣ Dolby Atmos</i>
            <small>{t("ÂM THANH ĐA CHIỀU")} </small>
          </span>
          <span>
            <ShieldCheck size={22} />
            <b>
              {t("5 phút giữ ghế")} <small>{t("AN TÂM MỖI LỰA CHỌN")} </small>
            </b>
          </span>
          <span>
            <Ticket size={22} />
            <b>
              {t("Vé điện tử QR")} <small>{t("CHẠM LÀ VÀO RẠP")} </small>
            </b>
          </span>
        </div>
        <section
          id="movies"
          className="movies-section content-width section-space"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span />
                {t("SPOTLIGHT / TRÊN MÀN ẢNH LỚN")}{" "}
              </p>
              <h2>
                {t("Câu chuyện tiếp theo")} <em>{t("của bạn.")} </em>
              </h2>
              <p className="section-description">
                {t("Những thước phim đáng xem. Những cảm xúc đáng nhớ.")}{" "}
              </p>
            </div>
            <button
              className="text-button view-all"
              onClick={() => setFilter("all")}
            >
              {t("Khám phá tất cả")} <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="movie-toolbar">
            <div
              className="movie-tabs"
              role="tablist"
              aria-label="Danh mục phim"
            >
              {[
                ["now", t("Đang chiếu")],
                ["soon", t("Sắp chiếu")],
                ["special", t("Suất chiếu đặc biệt")],
                ["all", t("Tất cả phim")],
              ].map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={filter === id}
                  className={filter === id ? "active" : ""}
                  onClick={() => setFilter(id)}
                >
                  {label}
                  {filter === id && <span>{visibleMovies.length}</span>}
                </button>
              ))}
            </div>
            <span className="movie-curated">
              <Sparkles size={13} />
              NOVA CURATED
            </span>
          </div>
          <div className="movie-grid">
            {visibleMovies.map((m, index) => (
              <motion.article
                className="movie-card"
                key={m.id}
                initial={false}
                whileInView={
                  reducedMotion ? undefined : { y: [16, 0], opacity: [0.8, 1] }
                }
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: index * 0.055 }}
              >
                <TiltPoster>
                  <MoviePoster movie={m} />
                  <span className="poster-age">{m.age}</span>
                  <span className="poster-rating">
                    <Star size={13} fill="currentColor" />
                    {m.rating}
                  </span>

                  <div className="poster-overlay">
                    <button
                      className="poster-play"
                      aria-label={`Xem trailer ${t(m.title)}`}
                      onClick={() => openMovie(m, "trailer")}
                    >
                      <Play size={18} fill="currentColor" />
                      <span>{t("Xem Trailer")}</span>
                    </button>
                    <div>
                      <p>
                        {t("ĐẠO DIỄN")} <span>{m.director}</span>
                      </p>
                      <p>
                        {t("DIỄN VIÊN")} <span>{m.cast}</span>
                      </p>
                      <button
                        className="button button-primary"
                        onClick={() => bookMovie(m)}
                        disabled={m.status === "soon"}
                      >
                        <Ticket size={15} />
                        {t("Đặt Vé")}{" "}
                      </button>
                      <button
                        className="poster-detail"
                        onClick={() => openMovie(m)}
                      >
                        {t("Thông tin phim")} <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </TiltPoster>
                <div className="movie-card-meta">
                  <span>{t(m.genre)}</span>
                  <b>
                    <Star size={12} fill="currentColor" />
                    {m.rating}
                  </b>
                </div>
                <button className="movie-title" onClick={() => openMovie(m)}>
                  {t(m.title)}
                </button>
                <p className="movie-duration">
                  <Clock3 size={12} />
                  {m.duration} {t("phút")} <span>·</span>
                  {m.year}
                  <button
                    onClick={() => bookMovie(m)}
                    disabled={m.status === "soon"}
                    aria-label={`Đặt vé ${t(m.title)}`}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </p>
              </motion.article>
            ))}
          </div>
          <div className="movie-note">
            <span className="live-dot" />
            <p>
              {t(
                "Lịch chiếu và dữ liệu phim minh họa cho trải nghiệm NOVA Cinema.",
              )}{" "}
            </p>
            <span className="age-guide">
              {t("Phân loại: P · K · T13 · T16 · T18")}{" "}
            </span>
          </div>
        </section>
        <ShowtimeTimeline
          onBook={(value) => {
            if (!member) {
              setModal("login");
              return;
            }
            setBooking(value);
          }}
        />
        <section id="offers" className="offers-section content-width">
          <div className="combo-offer">
            <div className="combo-copy">
              <p className="eyebrow">
                <span />
                THE PERFECT MOVIE PAIRING
              </p>
              <div className="offer-flash">
                <Sparkles size={13} />
                FLASH SALE · PARTY COMBO 69K
              </div>
              <h2>
                {language === "en" ? "Great films." : "Phim hay."}
                <br />
                {language === "en" ? "Great company." : "Combo trọn vị."}
              </h2>
              <p>
                {t("Một bắp lớn, hai ly mát lạnh.")} <br />
                {t("Đủ vị cho một buổi hẹn hoàn hảo.")}{" "}
              </p>
              <div className="offer-price">
                <strong>
                  69<span>K</span>
                </strong>
                <div>
                  <del>{t("109.000đ")} </del>
                  <span>{t("CHO CẢ COMBO")} </span>
                </div>
              </div>
              <button
                className="button button-primary"
                onClick={() => bookMovie(hero, true)}
              >
                <Popcorn size={17} />
                {t("Thêm combo vào vé")} <ArrowUpRight size={17} />
              </button>
              <small className="offer-fineprint">
                {t(
                  "Giá combo minh họa · Áp dụng khi đặt cùng vé xem phim",
                )}{" "}
              </small>
            </div>
            <div
              className="combo-visual"
              aria-label="Bắp rang và nước ngọt NOVA"
            >
              <div className="combo-orbit orbit-one" />
              <div className="combo-orbit orbit-two" />
              <span className="combo-stamp">
                BEST
                <br />
                <b>PAIRING</b>
                <Sparkles size={16} />
              </span>
              <div className="drink drink-one">
                <div className="drink-straw" />
                <div className="drink-lid" />
                <InfinityIcon size={30} />
                <b>NOVA</b>
                <small>CINEMA</small>
              </div>
              <div className="drink drink-two">
                <div className="drink-straw" />
                <div className="drink-lid" />
                <InfinityIcon size={30} />
                <b>NOVA</b>
                <small>CINEMA</small>
              </div>
              <div className="popcorn-bucket">
                <div className="popcorn-top">
                  {Array.from({ length: 26 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        left: `${(i * 29) % 94}%`,
                        top: `${(i * 17) % 58}%`,
                        transform: `rotate(${i * 37}deg)`,
                      }}
                    />
                  ))}
                </div>
                <div className="bucket-body">
                  <InfinityIcon size={48} />
                  <strong>NOVA</strong>
                  <small>CINEMA</small>
                </div>
              </div>
              <span className="combo-visual-caption"></span>
            </div>
          </div>
          <div className="group-offer">
            <div className="group-offer-glow" />
            <UsersRound size={34} strokeWidth={1.2} />
            <span className="eyebrow">BETTER TOGETHER</span>
            <h3>
              {language === "en" ? "Together." : "Đi cùng."}
              <br />
              {language === "en" ? "Better." : "Vui cùng."}
            </h3>
            <p>
              {t("Cùng một hàng ghế.")} <br />
              {t("Cùng một thế giới điện ảnh.")}{" "}
            </p>
            <div className="group-avatar-stack">
              {["P", "H", "M", "N"].map((l, i) => (
                <span
                  key={l}
                  style={{
                    background: ["#71574b", "#555f53", "#546573", "#806257"][i],
                  }}
                >
                  {l}
                </span>
              ))}
              <span>+16</span>
            </div>
            <span className="group-max">
              {t("Xếp cụm tối đa 20 ghế liền nhau")}{" "}
            </span>
            <button className="button button-glass" onClick={jumpGroup}>
              {t("Đặt vé cho cả nhóm")} <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <section
          id="membership"
          className="membership-section content-width section-space"
        >
          <div className="membership-copy">
            <p className="eyebrow">
              <span />
              THE INNER CIRCLE
            </p>
            <h2>
              {t("Điện ảnh là đam mê.")} <br />
              <em>{t("Đặc quyền là của bạn.")} </em>
            </h2>
            <p className="section-description">
              {t("Gia nhập C’MEMBER. Để mỗi lần đến rạp")} <br />
              {t("đều là một trải nghiệm xứng đáng hơn.")}{" "}
            </p>
            <div className="member-benefits">
              <span>
                <Crown size={18} />
                {t("Ưu đãi dành riêng")}{" "}
              </span>
              <span>
                <Sparkles size={18} />
                {t("Tích điểm mỗi vé")}{" "}
              </span>
              <span>
                <Ticket size={18} />
                {t("Lưu vé trong tài khoản")}{" "}
              </span>
            </div>
            <button
              className="button button-glass"
              onClick={() => setModal(member ? "account" : "login")}
            >
              {member
                ? t("Khám phá tài khoản của bạn")
                : t("Trở thành C’MEMBER")}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="membership-card">
            <div className="card-metal-line" />
            <div className="member-card-top">
              <InfinityIcon size={31} />
              <span>C’MEMBER</span>
            </div>
            <p>
              YOUR PASS TO
              <br />
              <strong>INFINITY.</strong>
            </p>
            <div className="member-card-bottom">
              <span>
                {member?.name?.toUpperCase() || "NOVA CINEMA"}
                <small>INFINITY EXPERIENCE</small>
              </span>
              <Crown size={30} strokeWidth={1} />
            </div>
            <div className="card-orbit" />
          </div>
        </section>
        <section
          id="cinemas"
          className="cinemas-section content-width section-space"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span />
                FIND YOUR NEXT DESTINATION
              </p>
              <h2>
                {t("Màn ảnh lớn.")} <em>{t("Ngay gần bạn.")} </em>
              </h2>
            </div>
            <label className="city-select">
              <MapPin size={16} />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Lọc rạp theo thành phố"
              >
                {["Tất cả", "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"].map((c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
          <div className="cinema-grid">
            {cinemas
              .filter((c) => city === "Tất cả" || c.city === city)
              .map((c, i) => (
                <article className="cinema-card" key={c.id}>
                  <div className={`cinema-graphic cinema-graphic-${i % 3}`}>
                    <img
                      className="cinema-photo"
                      src={
                        [
                          "/images/cinema-imax.jpg",
                          "/images/cinema-auditorium.jpg",
                          "/images/cinema-lobby.jpg",
                          "/images/cinema-auditorium.jpg",
                        ][i]
                      }
                      alt={
                        language === "en"
                          ? "Illustrative cinema interior"
                          : "Ảnh minh họa không gian rạp chiếu"
                      }
                      width="1000"
                      height="600"
                      loading="lazy"
                    />
                    <span>{c.city}</span>
                    <span className="cinema-graphic-label">
                      {language === "en"
                        ? "ILLUSTRATIVE CINEMA INTERIOR"
                        : "KHÔNG GIAN RẠP THAM KHẢO"}
                    </span>
                  </div>
                  <div className="cinema-info">
                    <h3>{c.name}</h3>
                    <p>
                      <MapPin size={13} />
                      {c.address}
                    </p>
                    <span>{c.formats}</span>
                    <button
                      className="text-button"
                      onClick={() => {
                        setCinemaId(c.id);
                        setMovieId("");
                        setDateId("");
                        setTimeId("");
                        document.getElementById("booking").scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }}
                    >
                      {t("Xem lịch chiếu")} <ArrowUpRight size={17} />
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
        {eventMovie && (
          <section id="events" className="events-section content-width">
            <div>
              <p className="eyebrow">
                <span />
                NOVA SPECIAL SCREENINGS
              </p>
              <h2>
                {language === "en" ? "Special films." : "Suất đặc biệt."}
                <br />
                {language === "en" ? "Worth returning." : "Đáng trở lại."}
              </h2>
            </div>
            <article className="event-card">
              <img
                src={eventMovie.localBackdrop || eventMovie.backdrop}
                alt="Oppenheimer suất chiếu đặc biệt"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.opacity = 0;
                }}
              />
              <div className="event-content">
                <span className="format-badge">70MM SPECIAL RE-RELEASE</span>
                <h3>
                  Oppenheimer.
                  <br />
                  {t("Trở lại, hoành tráng hơn.")}{" "}
                </h3>
                <p>{t("Kiệt tác của Christopher Nolan trên màn ảnh IMAX.")} </p>
                <button
                  className="text-button"
                  onClick={() => bookMovie(eventMovie)}
                >
                  {t("Khám phá suất chiếu")} <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          </section>
        )}
        <section className="app-banner content-width">
          <div className="app-symbol">
            <Smartphone size={29} />
            <InfinityIcon size={18} />
          </div>
          <div>
            <h3>{t("Cả rạp phim, trong tầm tay.")} </h3>
            <p>
              {t(
                "NOVA đồng hành trên mọi màn hình. Đặt vé trực tiếp từ trình duyệt điện thoại.",
              )}{" "}
            </p>
          </div>
          <button
            className="button button-glass"
            onClick={() => setModal("app")}
          >
            {t("Khám phá NOVA Mobile")} <ArrowUpRight size={16} />
          </button>
        </section>
      </main>
      <footer className="site-footer">
        <div className="content-width">
          <div className="footer-main">
            <div className="footer-brand">
              <Brand />
              <p>
                {t("Không giới hạn cảm xúc.")} <br />
                {t("Không giới hạn trải nghiệm.")}{" "}
              </p>
              <span>INFINITY EXPERIENCE.</span>
            </div>
            <div>
              <h4>{t("KHÁM PHÁ NOVA")} </h4>
              <a href="#movies">{t("Phim & lịch chiếu")} </a>
              <a href="#cinemas">{t("Hệ thống rạp")} </a>
              <a href="#offers">{t("Ưu đãi & bắp nước")} </a>
              <a href="#membership">{t("Thành viên C’MEMBER")} </a>
            </div>
            <div>
              <h4>{t("ĐỒNG HÀNH CÙNG BẠN")} </h4>
              <button onClick={() => setModal("help")}>
                {t("Hướng dẫn đặt vé")}{" "}
              </button>
              <button onClick={() => setModal("policy")}>
                {t("Điều khoản & chính sách")}{" "}
              </button>
              <button onClick={() => setModal("history")}>
                {t("Tra cứu vé đã đặt")}{" "}
              </button>
              <span className="footer-contact">
                {t("NOVA Cinema · Đồ án Nhóm 03")}{" "}
              </span>
            </div>
            <div className="footer-payment">
              <h4>{t("THANH TOÁN SANDBOX")} </h4>
              <div>
                <b>VISA</b>
                <b>Mastercard</b>
                <b>MoMo</b>
                <b>ZaloPay</b>
              </div>
              <p>
                <ShieldCheck size={16} />
                {t("Giao dịch mô phỏng, không thu tiền thật.")}{" "}
              </p>
              <span className="footer-project-label">
                {t("DỰ ÁN HỌC PHẦN / HCMUE")}{" "}
              </span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} NOVA Cinema. Crafted for the big
              screen.
            </p>
            <span>
              {t(
                "Dữ liệu rạp, giá vé và quyền lợi được dùng để minh họa.",
              )}{" "}
            </span>
            <a href="#top">
              {t("VỀ ĐẦU TRANG")} <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </footer>
      {booking && (
        <SeatBooking
          key={[
            booking.cinema.id,
            booking.movie.id,
            booking.date.id,
            booking.time.id,
          ].join("|")}
          booking={booking}
          member={member}
          onMemberUpdate={setMember}
          onClose={() => setBooking(null)}
        />
      )}
      {modal && !["admin", "staff"].includes(modal) && (
        <Modal
          title={
            modal === "search"
              ? t("Tìm câu chuyện của bạn")
              : modal === "login"
                ? t("Chào mừng đến C’MEMBER")
                : modal === "account"
                  ? t("Đặc quyền của bạn")
                  : modal === "history"
                    ? t("Vé của bạn")
                    : modal === "movie"
                      ? t(activeMovie.title)
                      : modal === "trailer"
                        ? `Trailer · ${t(activeMovie.title)}`
                        : modal === "help"
                          ? t("Đặt vé, thật đơn giản")
                          : modal === "app"
                            ? t("NOVA trên mọi màn hình")
                            : t("Điều khoản & thông tin dự án")
          }
          onClose={() => {
            setModal(null);
            setQuery("");
          }}
          wide={["movie", "trailer", "history", "account", "login"].includes(
            modal,
          )}
        >
          {modal === "search" && (
            <div className="search-modal">
              <label className="search-input">
                <Search size={20} />
                <input
                  autoFocus
                  placeholder={t("Tên phim, đạo diễn…")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>ESC</kbd>
              </label>
              <p className="eyebrow">
                {query
                  ? `${results.length + cinemaResults.length} ${language === "en" ? "RESULTS" : "KẾT QUẢ"}`
                  : language === "en"
                    ? "TRENDING NOW"
                    : "ĐANG ĐƯỢC QUAN TÂM"}
              </p>
              {results.map((m) => (
                <button
                  className="search-result"
                  key={m.id}
                  onClick={() => openMovie(m)}
                >
                  <MoviePoster movie={m} />
                  <span>
                    <strong>{t(m.title)}</strong>
                    <small>
                      {t(m.genre)} · {m.duration} {t("phút ·")} {m.age}
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
              {cinemaResults.map((c) => (
                <button
                  className="search-cinema-result"
                  key={c.id}
                  onClick={() => {
                    setCinemaId(c.id);
                    setMovieId("");
                    setDateId("");
                    setTimeId("");
                    setModal(null);
                    document
                      .getElementById("booking")
                      .scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <MapPin size={21} />
                  <span>
                    <strong>{c.name}</strong>
                    <small>
                      {c.city} · {c.formats}
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
              {!results.length && !cinemaResults.length && (
                <p className="muted">
                  {t(
                    "Chưa có phim phù hợp. Hãy thử tên phim hoặc đạo diễn khác.",
                  )}{" "}
                </p>
              )}
            </div>
          )}
          {modal === "login" && (
            <AuthForm
              onSuccess={(next) => {
                setMember(next);
                setModal("account");
              }}
            />
          )}
          {modal === "account" && (
            <div className="account-view">
              <div className="account-welcome">
                <Crown size={28} />
                <h3>
                  {t("Xin chào,")} {member?.name}.
                </h3>
                <span className="format-badge">C’MEMBER</span>
                <p>{member?.email}</p>
                <p className="muted">
                  {t("Hạng thành viên và điểm được cập nhật từ hệ thống:")}{" "}
                  {(member?.points || 0).toLocaleString("vi-VN")}
                </p>
              </div>
              {member?.role === "ADMIN" && (
                <div style={{ margin: "14px 0" }}>
                  <button
                    className="button button-primary w-full"
                    onClick={() => setModal("admin")}
                    style={{
                      background: "linear-gradient(135deg, #d97706, #b45309)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    <Crown size={16} /> Mở Bảng Quản Trị Admin & Doanh Thu
                  </button>
                </div>
              )}
              <TicketHistory
                member={member}
                onResume={(value) => {
                  setBooking(value);
                  setModal(null);
                }}
              />
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await apiLogout();
                    setMember(null);
                    setBooking(null);
                    setModal(null);
                  } catch (err) {
                    setSessionError(err.message);
                  }
                }}
              >
                {t("Đăng xuất")}{" "}
              </button>
            </div>
          )}
          {modal === "history" && (
            <TicketHistory
              member={member}
              onResume={(value) => {
                setBooking(value);
                setModal(null);
              }}
            />
          )}
          {modal === "movie" && (
            <div className="movie-detail">
              <MoviePoster movie={activeMovie} />
              <div>
                <p className="eyebrow">
                  {activeMovie.original} / {activeMovie.year}
                </p>
                <div className="detail-meta">
                  <span className="age-badge">{activeMovie.age}</span>
                  <span>
                    <Clock3 size={14} />
                    {activeMovie.duration} {t("phút")}{" "}
                  </span>
                  <span className="rating">
                    <Star size={14} />
                    {activeMovie.rating}
                  </span>
                </div>
                <p>{t(activeMovie.description)}</p>
                <dl>
                  <dt>{t("Thể loại")} </dt>
                  <dd>{t(activeMovie.genre)}</dd>
                  <dt>{t("Đạo diễn")} </dt>
                  <dd>{activeMovie.director}</dd>
                  <dt>{t("Diễn viên")} </dt>
                  <dd>{activeMovie.cast}</dd>
                  <dt>{t("Định dạng")} </dt>
                  <dd>
                    {activeMovie.format === "IMAX"
                      ? "IMAX Laser · Dolby Atmos 12.1"
                      : activeMovie.format === "70MM"
                        ? "IMAX 70mm Laser"
                        : "2D Laser · Dolby Atmos 12.1"}
                  </dd>
                </dl>

                {/* Rating & Reviews Section */}
                <div className="movie-reviews-box">
                  <div className="reviews-summary-bar">
                    <div className="big-rating">
                      <strong>4.9</strong>
                      <div className="stars-row">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                        ))}
                      </div>
                      <small>1.420 lượt đánh giá</small>
                    </div>
                    <div className="rating-metrics">
                      <div className="metric-badge">👍 98% Khán giả khuyên xem</div>
                      <div className="metric-badge">🏆 Đánh giá cao nhất tuần</div>
                    </div>
                  </div>

                  {/* Interactive User Rating */}
                  <div className="user-rating-section">
                    <label>Đánh giá & chia sẻ cảm nhận của bạn:</label>
                    <div className="interactive-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="star-pick-btn"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setUserRating(star)}
                          title={`${star} sao`}
                        >
                          <Star
                            size={20}
                            fill={(hoverRating || userRating) >= star ? "#f59e0b" : "none"}
                            color={(hoverRating || userRating) >= star ? "#f59e0b" : "#64748b"}
                          />
                        </button>
                      ))}
                      <span className="rating-score-label">{userRating} / 5 sao</span>
                    </div>

                    {!reviewSubmitted ? (
                      <div className="review-input-row">
                        <input
                          type="text"
                          placeholder="Nhập cảm nhận của bạn về bộ phim này..."
                          value={userReview}
                          onChange={(e) => setUserReview(e.target.value)}
                        />
                        <button
                          type="button"
                          className="button button-glass button-small"
                          disabled={!userReview.trim()}
                          onClick={() => setReviewSubmitted(true)}
                        >
                          Gửi đánh giá
                        </button>
                      </div>
                    ) : (
                      <div className="review-thank-you">
                        <CheckCircle2 size={16} color="#22c55e" />
                        <span>Cảm ơn bạn! Đánh giá ({userRating} sao: &ldquo;{userReview}&rdquo;) của bạn đã được ghi nhận.</span>
                      </div>
                    )}
                  </div>

                  {/* Top Community Reviews */}
                  <div className="community-reviews-list">
                    <h4>Bình luận nổi bật từ khán giả:</h4>
                    <div className="review-bubble">
                      <div className="bubble-head">
                        <b>Nguyễn Hoàng Nam</b>
                        <span className="stars-mini">⭐⭐⭐⭐⭐</span>
                      </div>
                      <p>Kỹ xảo IMAX Laser mãn nhãn, âm thanh Dolby Atmos tái hiện từng rung chuyển sống động đến choáng ngợp!</p>
                    </div>
                    <div className="review-bubble">
                      <div className="bubble-head">
                        <b>Trần Thu Thảo</b>
                        <span className="stars-mini">⭐⭐⭐⭐⭐</span>
                      </div>
                      <p>Kịch bản chặt chẽ, diễn xuất cuốn hút từng phút. Rạp Nova phục vụ rất chu đáo và bắp rang rất ngon.</p>
                    </div>
                  </div>
                </div>

                <div className="detail-actions">
                  <button
                    className="button button-primary"
                    disabled={activeMovie.status === "soon"}
                    onClick={() => bookMovie(activeMovie)}
                  >
                    <Ticket size={17} />
                    {t("Đặt vé ngay")}{" "}
                  </button>
                  <button
                    className="button button-glass"
                    onClick={() => setModal("trailer")}
                  >
                    <Play size={15} />
                    Xem trailer
                  </button>
                </div>
              </div>
            </div>
          )}
          {modal === "trailer" && (
            <div className="trailer-modal">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeMovie.trailer}`}
                title={`Trailer ${t(activeMovie.title)}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <p className="muted small">
                {t("Chất lượng phát phụ thuộc video gốc và kết nối mạng.")}{" "}
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${activeMovie.trailer}`}
                target="_blank"
                rel="noreferrer"
                className="text-button"
              >
                {t("Mở trailer trên YouTube")} <ArrowUpRight size={17} />
              </a>
              <button
                className="button button-primary"
                disabled={activeMovie.status === "soon"}
                onClick={() => bookMovie(activeMovie)}
              >
                {t("Đặt vé")} {t(activeMovie.title)}
                <Ticket size={16} />
              </button>
            </div>
          )}
          {modal === "help" && (
            <div className="info-modal">
              {[
                [
                  "01",
                  "Tìm suất chiếu",
                  "Chọn rạp, phim, ngày và giờ. Lựa chọn ở bước trước sẽ cập nhật các bước sau.",
                ],
                [
                  "02",
                  "Chọn ghế yêu thích",
                  "Chọn ghế thường, VIP hoặc Sweetbox. Bật xếp cụm để tìm tối đa 20 ghế liền nhau trong cùng hàng.",
                ],
                [
                  "03",
                  "Giữ ghế & thêm combo",
                  "Ghế được giữ 5 phút từ lựa chọn đầu tiên. Thêm Party Combo 69K và áp dụng C’MEMBER.",
                ],
                [
                  "04",
                  "Thanh toán & nhận QR",
                  "Thử thanh toán Sandbox để nhận vé QR. Hủy, thất bại hoặc hết hạn sẽ giải phóng ghế.",
                ],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
          {modal === "app" && (
            <div className="info-modal app-modal-content">
              <Smartphone size={48} />
              <h3>{t("Trải nghiệm NOVA trên điện thoại")} </h3>
              <p>
                {t(
                  "Giao diện tự điều chỉnh cho điện thoại, máy tính bảng và máy tính. Mở địa chỉ website trong trình duyệt và bắt đầu đặt vé. Dự án hiện chưa phát hành ứng dụng iOS/Android.",
                )}{" "}
              </p>
              <button
                className="button button-primary"
                onClick={() => {
                  setModal(null);
                  document
                    .getElementById("booking")
                    .scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("Bắt đầu đặt vé")} <ArrowRight size={17} />
              </button>
            </div>
          )}
          {modal === "policy" && (
            <div className="info-modal policy-copy">
              <h3>{t("Thông tin dự án")} </h3>
              <p>
                {t(
                  "NOVA Cinema (Infinity) là giao diện minh họa cho đồ án Website Đặt Vé Xem Phim Trực Tuyến, Nhóm 03, HCMUE. Hệ thống không vận hành rạp thật, không thu tiền và chưa có chứng nhận Bộ Công Thương.",
                )}{" "}
              </p>
              <h3>{t("Dữ liệu & quyền riêng tư")} </h3>
              <p>
                {t(
                  "Hồ sơ, ghế và vé được quản lý bởi máy chủ. Phiên đăng nhập dùng cookie HttpOnly. Chỉ chủ tài khoản được đọc vé của mình.",
                )}{" "}
              </p>
              <h3>{t("Giữ ghế & thanh toán")} </h3>
              <p>
                {t(
                  "Ghế được giữ 5 phút và giải phóng khi hết hạn, hủy hoặc thanh toán thất bại. Máy chủ đồng bộ trạng thái ghế giữa các người dùng. Thanh toán Sandbox không thu tiền thật.",
                )}{" "}
              </p>
              <h3>{t("Hình ảnh & nội dung")} </h3>
              <p>
                {t(
                  "Hình ảnh phim từ TMDB; trailer từ YouTube. Nội dung và hình ảnh thuộc chủ sở hữu tương ứng. Điểm đánh giá được dùng để minh họa giao diện.",
                )}{" "}
              </p>
            </div>
          )}
        </Modal>
      )}
      {modal === "staff" && <StaffCheckIn onClose={() => setModal(null)} />}
      {modal === "admin" && (
        <AdminDashboard onClose={() => setModal(null)} adminUser={member} />
      )}
    </div>
  );
}
