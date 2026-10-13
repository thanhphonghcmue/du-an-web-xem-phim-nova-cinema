import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
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
} from "lucide-react";
import { movies, cinemas, getDates, getShowtimes, money } from "./data.js";
import Modal from "./components/Modal.jsx";
import SeatBooking from "./components/SeatBooking.jsx";

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="NOVA Cinema trang chủ">
      <InfinityIcon className="brand-symbol" strokeWidth={1.8} />
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
        src={movie.poster}
        alt={`Poster ${movie.title}`}
        loading="lazy"
        onError={(e) => {
          if (
            movie.localPoster &&
            !e.currentTarget.src.endsWith(movie.localPoster)
          ) {
            e.currentTarget.src = movie.localPoster;
          } else {
            e.currentTarget.style.opacity = 0;
          }
        }}
      />
    </div>
  );
}
function TicketHistory({ tickets }) {
  return tickets.length ? (
    <div className="history-list">
      {[...tickets].reverse().map((t) => (
        <article key={t.code}>
          <img src={t.qr} alt={`QR vé ${t.code}`} />
          <div>
            <h3>{t.movie}</h3>
            <p>
              {t.cinema} · {t.date} · {t.time}
            </p>
            <p>
              Ghế: {t.seats.join(", ")} · {money(t.total)}
            </p>
            <small>Vé mô phỏng · {t.code.slice(0, 18)}</small>
          </div>
          <a href={t.qr} download={`${t.code}.png`} className="text-button">
            Tải QR
          </a>
        </article>
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <Ticket size={40} />
      <h3>Màn ảnh lớn đang chờ bạn.</h3>
      <p>
        Vé điện tử sẽ xuất hiện tại đây sau khi bạn hoàn tất đặt vé mô phỏng.
      </p>
    </div>
  );
}

export default function App() {
  const [slide, setSlide] = useState(0);
  const featured = [movies[0], movies[5], movies[1]];
  const hero = featured[slide];
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
  const [member, setMember] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nova-member"));
    } catch {
      return null;
    }
  });
  const [tickets, setTickets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nova-tickets") || "[]");
    } catch {
      return [];
    }
  });
  const [city, setCity] = useState("Tất cả");
  const dateRef = useRef(null);
  const dates = getDates();
  const cinema = cinemas.find((c) => c.id === cinemaId);
  const availableMovies = movies.filter((m) => cinema?.movies.includes(m.id));
  const showtimes =
    dateId && movieId ? getShowtimes(cinemaId, movieId, dateId) : [];
  const progress = [cinemaId, movieId, dateId, timeId].filter(Boolean).length;
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
    if (!cinema?.movies.includes(movie.id)) setCinemaId("landmark");
    setMovieId(movie.id);
    setDateId("");
    setTimeId("");
    setWithCombo(combo);
    setModal(null);
    document
      .getElementById("booking")
      .scrollIntoView({ behavior: "smooth", block: "center" });
    dateRef.current?.focus({ preventScroll: true });
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
    setBooking({
      movie: movies.find((m) => m.id === movieId),
      cinema,
      date: dates.find((d) => d.id === dateId),
      time,
      group,
      combo: withCombo,
    });
  }
  function openMovie(movie, type = "movie") {
    setActiveMovie(movie);
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
    `${m.title} ${m.original} ${m.director}`
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <div id="top" className="app-shell">
      <header className="site-header">
        <div className="nav-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            <a href="#movies" className="nav-active">
              Lịch chiếu
            </a>
            <a href="#cinemas">Rạp Cinema</a>
            <a href="#offers">
              Ưu đãi <span className="nav-pill">69K</span>
            </a>
            <button onClick={jumpGroup}>Xếp cụm nhóm</button>
            <a href="#membership">C’MEMBER</a>
            <a href="#events">Sự kiện</a>
          </nav>
          <div className="header-actions">
            <button
              className="search-trigger"
              onClick={() => setModal("search")}
              aria-label="Tìm phim Ctrl K"
            >
              <Search size={19} />
              <kbd>⌘ K</kbd>
            </button>
            <span className="nav-divider" />
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
                "Đăng nhập"
              )}
            </button>
            <a href="#booking" className="button button-gold header-book">
              <Ticket size={15} />
              Đặt vé ngay
            </a>
            <button
              className="icon-button mobile-toggle"
              aria-label={menu ? "Đóng menu" : "Mở menu"}
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
              ["#movies", "Lịch chiếu"],
              ["#cinemas", "Rạp Cinema"],
              ["#offers", "Khuyến mãi 69K"],
              ["#membership", "C’MEMBER"],
              ["#events", "Sự kiện"],
            ].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
                <ArrowUpRight size={16} />
              </a>
            ))}
            <button onClick={jumpGroup}>
              Xếp cụm nhóm
              <UsersRound size={16} />
            </button>
            <button
              onClick={() => {
                setModal(member ? "account" : "login");
                setMenu(false);
              }}
            >
              Tài khoản
              <Ticket size={16} />
            </button>
          </nav>
        )}
      </header>
      <main>
        <section className={`hero hero-${hero.id}`} aria-label="Phim nổi bật">
          <div
            key={hero.id}
            className="hero-art"
            style={{
              backgroundImage: `url("${hero.backdrop}"), ${hero.localBackdrop ? `url("${hero.localBackdrop}")` : "none"}`,
            }}
          />
          <div className="hero-shade" />
          <div className="hero-grain" />
          <div className="hero-content content-width">
            <div className="hero-copy" key={hero.id}>
              <span className="hero-exclusive">
                <span className="live-dot" />
                NOVA EXCLUSIVE <span className="exclusive-divider" /> TRẢI
                NGHIỆM ĐIỆN ẢNH ĐỈNH CAO
              </span>
              <p className="hero-kicker">
                {hero.id === "dune"
                  ? "BEYOND THE ORDINARY."
                  : hero.id === "oppenheimer"
                    ? "THE WORLD FOREVER CHANGES."
                    : "RISE TOGETHER. FALL TOGETHER."}
              </p>
              <h1 className={hero.id === "dune" ? "dune-title" : ""}>
                {hero.short}
              </h1>
              <p className="hero-part">{hero.part}</p>
              <div className="hero-meta">
                <span className="format-badge">
                  {hero.id === "oppenheimer" ? "IMAX 70MM LASER" : "IMAX LASER"}
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
                  {hero.duration} phút
                </span>
              </div>
              <p className="hero-description">{hero.description}</p>
              <div className="hero-buttons">
                <button
                  className="button button-gold"
                  onClick={() => bookMovie(hero)}
                >
                  <Ticket size={18} />
                  Đặt vé bây giờ
                  <ArrowUpRight size={18} />
                </button>
                <button
                  className="button button-glass"
                  onClick={() => openMovie(hero, "trailer")}
                >
                  <Play size={16} fill="currentColor" />
                  Xem trailer 4K
                </button>
              </div>
              <p className="hero-tagline">{hero.tagline}</p>
            </div>
            <div className="hero-side-note">
              <span>THE INFINITY EXPERIENCE</span>
              <i />
              <small>01 / IMAX LASER</small>
            </div>
          </div>
          <div className="hero-bottom content-width">
            <a href="#booking" className="scroll-label">
              <ArrowDown size={16} /> KHÁM PHÁ TRẢI NGHIỆM
            </a>
            <div className="carousel-controls">
              <button
                aria-label="Phim nổi bật trước"
                className="icon-button"
                onClick={() => setSlide((slide + 2) % 3)}
              >
                <ChevronLeft size={17} />
              </button>
              <div className="carousel-pages">
                {featured.map((m, i) => (
                  <button
                    className={i === slide ? "active" : ""}
                    onClick={() => setSlide(i)}
                    aria-label={`Xem banner ${m.title}`}
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
                onClick={() => setSlide((slide + 1) % 3)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
        <section id="booking" className="quick-booking content-width">
          <div className="booking-topline">
            <div>
              <span className="booking-lightning">
                <Sparkles size={16} />
              </span>
              <h2>Đặt vé nhanh</h2>
              <span className="booking-30">30 giây để chạm đến điện ảnh</span>
            </div>
            <span className="booking-progress">
              {progress}/4 bước <span className="live-dot" />
            </span>
          </div>
          <form onSubmit={openSeats} className="booking-dock">
            <div className="booking-fields">
              {[
                {
                  label: "Chọn cụm rạp",
                  value: cinemaId,
                  icon: MapPin,
                  options: cinemas.map((c) => ({ id: c.id, label: c.name })),
                  change: (v) => {
                    setCinemaId(v);
                    setMovieId("");
                    setDateId("");
                    setTimeId("");
                  },
                },
                {
                  label: "Chọn phim",
                  value: movieId,
                  icon: Film,
                  options: availableMovies.map((m) => ({
                    id: m.id,
                    label: m.title,
                  })),
                  disabled: !cinemaId,
                  change: (v) => {
                    setMovieId(v);
                    setDateId("");
                    setTimeId("");
                  },
                },
                {
                  label: "Chọn ngày",
                  value: dateId,
                  icon: CalendarDays,
                  options: dates,
                  disabled: !movieId,
                  change: (v) => {
                    setDateId(v);
                    setTimeId("");
                  },
                  ref: dateRef,
                },
                {
                  label: "Chọn suất chiếu",
                  value: timeId,
                  icon: Clock3,
                  options: showtimes,
                  disabled: !dateId,
                  change: setTimeId,
                },
              ].map((field, i) => (
                <label
                  className={`booking-field ${field.disabled ? "is-disabled" : ""}`}
                  key={field.label}
                >
                  <field.icon size={19} />
                  <div>
                    <span>
                      0{i + 1} <small>{field.label.toUpperCase()}</small>
                    </span>
                    <select
                      ref={field.ref}
                      aria-label={field.label}
                      value={field.value}
                      disabled={field.disabled}
                      onChange={(e) => field.change(e.target.value)}
                      required
                    >
                      <option value="">
                        {i === 3 && dateId && !showtimes.length
                          ? "Hết suất hôm nay"
                          : field.label}
                      </option>
                      {field.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ChevronDown size={14} />
                </label>
              ))}
              <button
                className="button button-gold booking-submit"
                disabled={!timeId}
                type="submit"
              >
                <Ticket size={18} />
                Tìm ghế đẹp
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="booking-options">
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={group}
                  onChange={(e) => setGroup(e.target.checked)}
                />
                <span className="switch-track" />
                <UsersRound size={15} />
                <span>Xếp cụm nhóm</span>
                <small>Ngồi cạnh nhau, vui cùng nhau · ≤ 20 ghế</small>
              </label>
              <span className="hold-label">
                <ShieldCheck size={14} />
                Giữ ghế an toàn trong 5 phút
              </span>
            </div>
          </form>
          {withCombo && (
            <div className="combo-attached">
              <Check size={14} />
              Party Combo 69K đã thêm vào lựa chọn của bạn
              <button onClick={() => setWithCombo(false)}>Bỏ combo</button>
            </div>
          )}
        </section>
        <div className="experience-strip content-width">
          <span>
            <InfinityIcon size={23} />
            <b>
              Không chỉ xem phim.
              <br />
              <em>Sống trong từng khung hình.</em>
            </b>
          </span>
          <span>
            <i>IMAX</i>
            <small>MÀN ẢNH VÔ CỰC</small>
          </span>
          <span>
            <i className="dolby-type">▣ Dolby Atmos</i>
            <small>ÂM THANH ĐA CHIỀU</small>
          </span>
          <span>
            <ShieldCheck size={22} />
            <b>
              5 phút giữ ghế<small>AN TÂM MỖI LỰA CHỌN</small>
            </b>
          </span>
          <span>
            <Ticket size={22} />
            <b>
              Vé điện tử QR<small>CHẠM LÀ VÀO RẠP</small>
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
                SPOTLIGHT / TRÊN MÀN ẢNH LỚN
              </p>
              <h2>
                Câu chuyện tiếp theo <em>của bạn.</em>
              </h2>
              <p className="section-description">
                Những thước phim đáng xem. Những cảm xúc đáng nhớ.
              </p>
            </div>
            <button
              className="text-button view-all"
              onClick={() => setFilter("all")}
            >
              Khám phá tất cả
              <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="movie-toolbar">
            <div
              className="movie-tabs"
              role="tablist"
              aria-label="Danh mục phim"
            >
              {[
                ["now", "Đang chiếu"],
                ["special", "Suất chiếu đặc biệt"],
                ["all", "Tất cả phim"],
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
              <article className="movie-card" key={m.id}>
                <div className="poster-wrap">
                  <MoviePoster movie={m} />
                  <span className="poster-age">{m.age}</span>
                  <span className="poster-format">{m.format}</span>
                  <span className="poster-rank">0{index + 1}</span>
                  <div className="poster-overlay">
                    <button
                      className="poster-play"
                      aria-label={`Xem trailer ${m.title}`}
                      onClick={() => openMovie(m, "trailer")}
                    >
                      <Play size={23} fill="currentColor" />
                    </button>
                    <div>
                      <p>
                        ĐẠO DIỄN<span>{m.director}</span>
                      </p>
                      <p>
                        DIỄN VIÊN<span>{m.cast}</span>
                      </p>
                      <button
                        className="button button-gold"
                        onClick={() => bookMovie(m)}
                      >
                        <Ticket size={15} />
                        Đặt vé suất này
                      </button>
                      <button
                        className="poster-detail"
                        onClick={() => openMovie(m)}
                      >
                        Thông tin phim
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="movie-card-meta">
                  <span>{m.genre}</span>
                  <b>
                    <Star size={12} fill="currentColor" />
                    {m.rating}
                  </b>
                </div>
                <button className="movie-title" onClick={() => openMovie(m)}>
                  {m.title}
                </button>
                <p className="movie-duration">
                  <Clock3 size={12} />
                  {m.duration} phút<span>·</span>
                  {m.year}
                  <button
                    onClick={() => bookMovie(m)}
                    aria-label={`Đặt vé ${m.title}`}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </p>
              </article>
            ))}
          </div>
          <div className="movie-note">
            <span className="live-dot" />
            <p>
              Lịch chiếu và dữ liệu phim minh họa cho trải nghiệm NOVA Cinema.
            </p>
            <span className="age-guide">
              Phân loại: P · K · T13 · T16 · T18
            </span>
          </div>
        </section>
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
                Phim hay.
                <br />
                Bắp ngon. <em>Vui hết cỡ.</em>
              </h2>
              <p>
                Một bắp lớn, hai ly mát lạnh.
                <br />
                Đủ vị cho một buổi hẹn hoàn hảo.
              </p>
              <div className="offer-price">
                <strong>
                  69<span>K</span>
                </strong>
                <div>
                  <del>109.000đ</del>
                  <span>CHO CẢ COMBO</span>
                </div>
              </div>
              <button
                className="button button-gold"
                onClick={() => bookMovie(hero, true)}
              >
                <Popcorn size={17} />
                Thêm combo vào vé
                <ArrowUpRight size={17} />
              </button>
              <small className="offer-fineprint">
                Giá combo minh họa · Áp dụng khi đặt cùng vé xem phim
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
                <small>REFRESH THE MOMENT</small>
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
                  <small>POPCORN & GOOD TIMES</small>
                </div>
              </div>
              <span className="combo-visual-caption">
                GOOD FILMS DESERVE GOOD COMPANY.
              </span>
            </div>
          </div>
          <div className="group-offer">
            <div className="group-offer-glow" />
            <UsersRound size={34} strokeWidth={1.2} />
            <span className="eyebrow">BETTER TOGETHER</span>
            <h3>
              Một nhóm bạn.
              <br />
              <em>Vạn niềm vui.</em>
            </h3>
            <p>
              Cùng một hàng ghế.
              <br />
              Cùng một thế giới điện ảnh.
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
            <span className="group-max">Xếp cụm tối đa 20 ghế liền nhau</span>
            <button className="button button-glass" onClick={jumpGroup}>
              Đặt vé cho cả nhóm
              <ArrowUpRight size={17} />
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
              Điện ảnh là đam mê.
              <br />
              <em>Đặc quyền là của bạn.</em>
            </h2>
            <p className="section-description">
              Gia nhập C’MEMBER. Để mỗi lần đến rạp
              <br />
              đều là một trải nghiệm xứng đáng hơn.
            </p>
            <div className="member-benefits">
              <span>
                <Crown size={18} />
                Ưu đãi dành riêng
              </span>
              <span>
                <Sparkles size={18} />
                Tích điểm mỗi vé
              </span>
              <span>
                <Ticket size={18} />
                Lưu vé trong tài khoản
              </span>
            </div>
            <button
              className="button button-glass"
              onClick={() => setModal(member ? "account" : "login")}
            >
              {member ? "Khám phá tài khoản của bạn" : "Trở thành C’MEMBER"}
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
                Màn ảnh lớn. <em>Ngay gần bạn.</em>
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
                  <option key={c}>{c}</option>
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
                    <div className="cinema-screen" />
                    <div className="cinema-seats-art" />
                    <span>{c.city}</span>
                    <span className="cinema-graphic-label">
                      NOVA / INFINITY HALL
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
                        document
                          .getElementById("booking")
                          .scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                      }}
                    >
                      Xem lịch chiếu
                      <ArrowUpRight size={17} />
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
        <section id="events" className="events-section content-width">
          <div>
            <p className="eyebrow">
              <span />
              NOVA SPECIAL SCREENINGS
            </p>
            <h2>
              Những thước phim.
              <br />
              <em>Không thể bỏ lỡ.</em>
            </h2>
          </div>
          <article className="event-card">
            <img
              src={movies[5].backdrop}
              alt="Oppenheimer suất chiếu đặc biệt"
              loading="lazy"
              onError={(e) => {
                if (!e.currentTarget.src.endsWith(movies[5].localBackdrop)) {
                  e.currentTarget.src = movies[5].localBackdrop;
                } else {
                  e.currentTarget.style.opacity = 0;
                }
              }}
            />
            <div className="event-content">
              <span className="format-badge">70MM SPECIAL RE-RELEASE</span>
              <h3>
                Oppenheimer.
                <br />
                Trở lại, hoành tráng hơn.
              </h3>
              <p>Kiệt tác của Christopher Nolan trên màn ảnh IMAX.</p>
              <button
                className="text-button"
                onClick={() => bookMovie(movies[5])}
              >
                Khám phá suất chiếu
                <ArrowUpRight size={17} />
              </button>
            </div>
          </article>
        </section>
        <section className="app-banner content-width">
          <div className="app-symbol">
            <Smartphone size={29} />
            <InfinityIcon size={18} />
          </div>
          <div>
            <h3>Cả rạp phim, trong tầm tay.</h3>
            <p>
              NOVA đồng hành trên mọi màn hình. Đặt vé trực tiếp từ trình duyệt
              điện thoại.
            </p>
          </div>
          <button
            className="button button-glass"
            onClick={() => setModal("app")}
          >
            Khám phá NOVA Mobile
            <ArrowUpRight size={16} />
          </button>
        </section>
      </main>
      <footer className="site-footer">
        <div className="content-width">
          <div className="footer-main">
            <div className="footer-brand">
              <Brand />
              <p>
                Không giới hạn cảm xúc.
                <br />
                Không giới hạn trải nghiệm.
              </p>
              <span>INFINITY EXPERIENCE.</span>
            </div>
            <div>
              <h4>KHÁM PHÁ NOVA</h4>
              <a href="#movies">Phim & lịch chiếu</a>
              <a href="#cinemas">Hệ thống rạp</a>
              <a href="#offers">Ưu đãi & bắp nước</a>
              <a href="#membership">Thành viên C’MEMBER</a>
            </div>
            <div>
              <h4>ĐỒNG HÀNH CÙNG BẠN</h4>
              <button onClick={() => setModal("help")}>Hướng dẫn đặt vé</button>
              <button onClick={() => setModal("policy")}>
                Điều khoản & chính sách
              </button>
              <button onClick={() => setModal("history")}>
                Tra cứu vé đã đặt
              </button>
              <span className="footer-contact">
                NOVA Cinema · Đồ án Nhóm 03
              </span>
            </div>
            <div className="footer-payment">
              <h4>THANH TOÁN SANDBOX</h4>
              <div>
                <b>VISA</b>
                <b>Mastercard</b>
                <b>MoMo</b>
                <b>VNPay</b>
              </div>
              <p>
                <ShieldCheck size={16} />
                Giao dịch mô phỏng, không thu tiền thật.
              </p>
              <span className="footer-project-label">
                DỰ ÁN HỌC PHẦN / HCMUE
              </span>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              © {new Date().getFullYear()} NOVA Cinema. Crafted for the big
              screen.
            </p>
            <span>Dữ liệu rạp, giá vé và quyền lợi được dùng để minh họa.</span>
            <a href="#top">
              VỀ ĐẦU TRANG
              <ArrowUpRight size={13} />
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
          onClose={() => setBooking(null)}
          onTicket={(t) => setTickets((prev) => [...prev, t])}
        />
      )}
      {modal && (
        <Modal
          title={
            modal === "search"
              ? "Tìm câu chuyện của bạn"
              : modal === "login"
                ? "Chào mừng đến C’MEMBER"
                : modal === "account"
                  ? "Đặc quyền của bạn"
                  : modal === "history"
                    ? "Vé của bạn"
                    : modal === "movie"
                      ? activeMovie.title
                      : modal === "trailer"
                        ? `Trailer · ${activeMovie.title}`
                        : modal === "help"
                          ? "Đặt vé, thật đơn giản"
                          : modal === "app"
                            ? "NOVA trên mọi màn hình"
                            : "Điều khoản & thông tin dự án"
          }
          onClose={() => {
            setModal(null);
            setQuery("");
          }}
          wide={["movie", "trailer", "history", "account"].includes(modal)}
        >
          {modal === "search" && (
            <div className="search-modal">
              <label className="search-input">
                <Search size={20} />
                <input
                  autoFocus
                  placeholder="Tên phim, đạo diễn…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>ESC</kbd>
              </label>
              <p className="eyebrow">
                {query ? `${results.length} KẾT QUẢ` : "ĐANG ĐƯỢC QUAN TÂM"}
              </p>
              {results.map((m) => (
                <button
                  className="search-result"
                  key={m.id}
                  onClick={() => openMovie(m)}
                >
                  <MoviePoster movie={m} />
                  <span>
                    <strong>{m.title}</strong>
                    <small>
                      {m.genre} · {m.duration} phút · {m.age}
                    </small>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
              {!results.length && (
                <p className="muted">
                  Chưa có phim phù hợp. Hãy thử tên phim hoặc đạo diễn khác.
                </p>
              )}
            </div>
          )}
          {modal === "login" && (
            <form
              className="login-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fields = new FormData(e.currentTarget);
                const next = {
                  name: fields.get("name").trim(),
                  email: fields.get("email").trim(),
                };
                if (!next.name) return;
                localStorage.setItem("nova-member", JSON.stringify(next));
                setMember(next);
                setModal("account");
              }}
            >
              <div className="login-emblem">
                <Crown size={35} />
              </div>
              <h3>Mỗi tấm vé, một đặc quyền.</h3>
              <p className="muted">
                Tạo hồ sơ demo để trải nghiệm ưu đãi 5% tiền vé và lưu lịch sử
                đặt vé trên thiết bị này.
              </p>
              <label>
                Họ và tên
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={60}
                  placeholder="Tên của bạn"
                  autoComplete="name"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ban@example.com"
                  autoComplete="email"
                />
              </label>
              <button className="button button-gold w-full">
                Tiếp tục với hồ sơ demo
                <ArrowRight size={17} />
              </button>
              <p className="small muted">
                Đây là hồ sơ minh họa lưu trong trình duyệt, chưa phải tài khoản
                được xác thực.
              </p>
            </form>
          )}
          {modal === "account" && (
            <div className="account-view">
              <div className="account-welcome">
                <Crown size={28} />
                <h3>Xin chào, {member?.name}.</h3>
                <span className="format-badge">C’MEMBER</span>
                <p>{member?.email}</p>
                <p className="muted">
                  Ưu đãi minh họa: giảm 5% tiền vé. Điểm demo đã tích:{" "}
                  {tickets
                    .reduce((s, t) => s + Math.floor(t.total / 1000), 0)
                    .toLocaleString("vi-VN")}
                </p>
              </div>
              <TicketHistory tickets={tickets} />
              <button
                className="text-button"
                onClick={() => {
                  localStorage.removeItem("nova-member");
                  setMember(null);
                  setModal(null);
                }}
              >
                Đăng xuất hồ sơ demo
              </button>
            </div>
          )}
          {modal === "history" && <TicketHistory tickets={tickets} />}
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
                    {activeMovie.duration} phút
                  </span>
                  <span className="rating">
                    <Star size={14} />
                    {activeMovie.rating}
                  </span>
                </div>
                <p>{activeMovie.description}</p>
                <dl>
                  <dt>Thể loại</dt>
                  <dd>{activeMovie.genre}</dd>
                  <dt>Đạo diễn</dt>
                  <dd>{activeMovie.director}</dd>
                  <dt>Diễn viên</dt>
                  <dd>{activeMovie.cast}</dd>
                  <dt>Định dạng</dt>
                  <dd>
                    {activeMovie.format === "IMAX"
                      ? "IMAX Laser · Dolby Atmos 12.1"
                      : activeMovie.format === "70MM"
                        ? "IMAX 70mm Laser"
                        : "2D Laser · Dolby Atmos 12.1"}
                  </dd>
                </dl>
                <div className="detail-actions">
                  <button
                    className="button button-gold"
                    onClick={() => bookMovie(activeMovie)}
                  >
                    <Ticket size={17} />
                    Đặt vé ngay
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
                title={`Trailer ${activeMovie.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <p className="muted small">
                Chất lượng phát phụ thuộc video gốc và kết nối mạng.
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${activeMovie.trailer}`}
                target="_blank"
                rel="noreferrer"
                className="text-button"
              >
                Mở trailer trên YouTube
                <ArrowUpRight size={17} />
              </a>
              <button
                className="button button-gold"
                onClick={() => bookMovie(activeMovie)}
              >
                Đặt vé {activeMovie.title}
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
              <h3>Trải nghiệm NOVA trên điện thoại</h3>
              <p>
                Giao diện tự điều chỉnh cho điện thoại, máy tính bảng và máy
                tính. Mở địa chỉ website trong trình duyệt và bắt đầu đặt vé. Dự
                án hiện chưa phát hành ứng dụng iOS/Android.
              </p>
              <button
                className="button button-gold"
                onClick={() => {
                  setModal(null);
                  document
                    .getElementById("booking")
                    .scrollIntoView({ behavior: "smooth" });
                }}
              >
                Bắt đầu đặt vé
                <ArrowRight size={17} />
              </button>
            </div>
          )}
          {modal === "policy" && (
            <div className="info-modal policy-copy">
              <h3>Thông tin dự án</h3>
              <p>
                NOVA Cinema (Infinity) là giao diện minh họa cho đồ án Website
                Đặt Vé Xem Phim Trực Tuyến, Nhóm 03, HCMUE. Hệ thống không vận
                hành rạp thật, không thu tiền và chưa có chứng nhận Bộ Công
                Thương.
              </p>
              <h3>Dữ liệu & quyền riêng tư</h3>
              <p>
                Hồ sơ demo, trạng thái ghế và vé được lưu bằng localStorage trên
                thiết bị. Không nhập thông tin nhạy cảm. Xóa dữ liệu website
                trong trình duyệt để xóa toàn bộ thông tin demo.
              </p>
              <h3>Giữ ghế & thanh toán</h3>
              <p>
                Ghế được giữ 5 phút và giải phóng khi hết hạn, hủy hoặc thanh
                toán thất bại. Đồng bộ demo chỉ giữa các tab cùng trình duyệt;
                hệ thống thực cần backend để khóa ghế giữa nhiều người dùng.
                Giá, ưu đãi và lịch chiếu là dữ liệu minh họa.
              </p>
              <h3>Hình ảnh & nội dung</h3>
              <p>
                Hình ảnh phim từ TMDB; trailer từ YouTube. Nội dung và hình ảnh
                thuộc chủ sở hữu tương ứng. Điểm đánh giá được dùng để minh họa
                giao diện.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
