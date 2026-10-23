import { useQuerySelection } from "./useQuerySelection.js";
/**
 * ==============================================================================
 * TỆP TIN: src/App.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Nhạc Trưởng Điều Phối Giao Diện Toàn Cục Của Ứng Dụng (Central App Master View Orchestrator).
 *   - Quản lý toàn bộ vòng đời trải nghiệm của khách hàng từ trang chủ đến các modal:
 *     1. ĐIỀU HƯỚNG & XÁC THỰC: Thanh Header kính mờ, chuyển đổi ngôn ngữ VI/EN, hiển thị quyền ADMIN / STAFF / CUSTOMER.
 *     2. PHIM BOM TẤN NỔI BẬT: Banner Hero chuyển cảnh, trailer 4K popup, thông tin chi tiết phim.
 *     3. TIẾN TRÌNH ĐẶT VÉ TOÀN DIỆN: Kết nối QuickBooking -> SeatBooking -> Thanh toán Sandbox.
 *     4. ĐẶC QUYỀN C'MEMBER: Quản lý điểm thưởng, ví vé điện tử QR, khôi phục đơn đang giữ.
 *     5. BÀN LÀM VIỆC NỘI BỘ: Bảng soát vé cho Nhân viên (`StaffCheckIn`) và Bảng quản trị cho Admin (`AdminDashboard`).
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW TỪ ĐẦU ĐẾN CUỐI):
 *   - Giai đoạn 1 (Khởi tạo): Nạp hồ sơ đăng nhập qua `apiGetProfile()`; nạp đơn đang giữ qua `apiGetMyBookings()`.
 *   - Giai đoạn 2 (Duyệt phim): Khách hàng tìm kiếm phim qua HeaderSearch, xem trailer, xem lịch chiếu theo rạp.
 *   - Giai đoạn 3 (Chọn suất): Khách hàng chọn rạp -> phim -> ngày -> suất chiếu tại QuickBooking hoặc ShowtimeTimeline.
 *   - Giai đoạn 4 (Chọn ghế & Thanh toán): Kích hoạt modal `SeatBooking` xử lý giữ ghế 5 phút và thanh toán.
 *   - Giai đoạn 5 (Nhận vé & Vào rạp): Mở ví vé `TicketHistory` lấy mã QR; nhân viên quét vé qua `StaffCheckIn`.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Tất cả người dùng: Khách vãng lai, Hội viên C'MEMBER, Nhân viên rạp (STAFF), Quản trị viên (ADMIN).
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tích hợp thông báo đẩy (Web Push Notifications) nhắc nhở khách hàng 2 tiếng trước giờ chiếu.
 *   - Tích hợp trợ lý ảo AI Chatbot tư vấn chọn phim dựa trên tâm trạng (Mood-based Movie Recommendation).
 * ==============================================================================
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Discovery from "./components/Discovery.jsx";
import PortalPage from "./components/PortalPage.jsx";
import CinemaHero from "./components/CinemaHero.jsx";
import CinemaFooter from "./components/CinemaFooter.jsx";
import WelcomeOffer from "./components/WelcomeOffer.jsx";
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
import NovaJourney from "./components/NovaJourney.jsx";
import { useCatalog } from "./catalog.js";
import {
  apiGetProfile,
  apiLogout,
  apiGetMyBookings,
  memberProfile,
} from "./api/client.js";
import CinematicBackdrop from "./components/CinematicBackdrop.jsx";
import { useI18n } from "./i18n.js";
import ChonGhe_Va_ThanhToan from "./components/ChonGhe_Va_ThanhToan.jsx";
import DatVeNhanh from "./components/DatVeNhanh.jsx";
import SoatVeNhanVien from "./components/SoatVeNhanVien.jsx";
import QuanTriHeThong from "./components/QuanTriHeThong.jsx";
import LichSuVeKhachHang from "./components/LichSuVeKhachHang.jsx";
import DangNhap_DangKy from "./components/DangNhap_DangKy.jsx";
import LichChieuPhim from "./components/LichChieuPhim.jsx";
import TimKiemPhim from "./components/TimKiemPhim.jsx";
import MenuDieuHuong from "./components/MenuDieuHuong.jsx";
import HopThoaiModal from "./components/HopThoaiModal.jsx";

function Brand() {
  return (
    <a className="brand" href="/" aria-label="NOVA Cinema trang chủ">
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
  const pathname = usePathname();
  const view = pathname.split("/")[1] || "home";
  const { language, setLanguage, t } = useI18n();
  const { movies, cinemas, rooms, getDates, getShowtimes, contextFor } =
    useCatalog();

  const [slide, setSlide] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    try {
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      });
      return (
        view === "home" &&
        !new URLSearchParams(window.location.search).has("booking") &&
        !sessionStorage.getItem("nova-welcome-seen") &&
        localStorage.getItem("nova-welcome-hidden-day") !== today
      );
    } catch {
      return false;
    }
  });
  const [wizardVersion, setWizardVersion] = useState(0);
  const highlights = ["inception", "kong", "oppenheimer", "dune"].flatMap(
    (key) => movies.filter((movie) => movie.artId === key),
  );
  const featured = (highlights.length ? highlights : movies).slice(0, 5);
  const hero = featured[slide % featured.length] || movies[0] || {};
  const eventMovie = movies.find((m) => m.artId === "oppenheimer");
  const [cinemaId, setCinemaId] = useQuerySelection("cinema");
  const [movieId, setMovieId] = useState(
    () => new URLSearchParams(window.location.search).get("movie") || "",
  );
  const [dateId, setDateId] = useState("");
  const [timeId, setTimeId] = useState("");
  const [group, setGroup] = useState(false);
  const [withCombo, setWithCombo] = useState(false);
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
    if (view !== "home" && !id) return;
    let active = true;
    apiGetMyBookings()
      .then((orders) => {
        const order = id
          ? orders.find((o) => o.id === id)
          : orders.find((o) => ["HOLDING", "PENDING"].includes(o.status));
        const context = order && contextFor(order.showtimeId);
        if (active && context) {
          setBooking({ ...context, orderId: order.id });
          if (id) window.history.replaceState({}, "", "/");
        }
      })
      .catch((err) => {
        if (active) setSessionError(err.message);
      });
    return () => {
      active = false;
    };
  }, [memberId, contextFor, view]);
  const [city, setCity] = useState("Tất cả");

  const dates = getDates(language);
  const resolvedCinemaId =
    cinemaId ||
    (movieId ? cinemas.find((c) => c.movies.includes(movieId))?.id : "") ||
    "";
  const cinema = cinemas.find((c) => c.id === resolvedCinemaId);
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
    if (
      movie.status === "soon" &&
      !cinemas.some((c) => getDates("vi", c.id, movie.id).length)
    ) {
      openMovie(movie);
      return;
    }
    if (!["home", "dat-ve"].includes(view)) {
      window.location.assign("/dat-ve?movie=" + encodeURIComponent(movie.id));
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
    const time = getShowtimes(resolvedCinemaId, movieId, dateId).find(
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
    if (!["home", "dat-ve"].includes(view)) {
      window.location.assign("/dat-ve");
      return;
    }
    setGroup(true);
    setMenu(false);
    document
      .getElementById("booking")
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }
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
      <div className="nova-utility">
        <div className="content-width">
          <span>ĐIỆN ẢNH KHÔNG GIỚI HẠN.</span>
          <div>
            <Link href="/rap">
              <MapPin size={12} />
              Tìm rạp NOVA
            </Link>
            <Link href="/tai-khoan">
              <Ticket size={12} />
              Vé của tôi
            </Link>
            <span>VI / EN</span>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="nav-inner">
          <Brand />
          <MenuDieuHuong />
          <div className="header-actions">
            <TimKiemPhim
              movies={movies}
              cinemas={cinemas}
              onMovie={openMovie}
              onCinema={(c) => {
                if (!["home", "dat-ve"].includes(view)) {
                  window.location.assign("/dat-ve");
                  return;
                }
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
                onClick={() => window.location.assign("/quan-tri")}
                title="Mở Bảng Quản Trị Admin & Doanh Thu"
              >
                <Crown size={15} />
                Quản Trị Rạp
              </button>
            )}
            {["ADMIN", "STAFF"].includes(member?.role) && (
              <button
                className="text-button"
                onClick={() => window.location.assign("/soat-ve")}
              >
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
            <Link href="/dat-ve" className="button button-primary header-book">
              <Ticket size={15} />
              {t("Đặt vé ngay")}{" "}
            </Link>
            <Link href="/bap-nuoc" className="button header-food">
              <Popcorn size={15} />
              Đặt bắp nước
            </Link>
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
              ["/phim", t("Phim đang chiếu")],
              ["/sap-chieu", t("Sắp chiếu tháng sau")],
              ["/dat-ve", t("Lịch chiếu & đặt vé")],
              ["/rap", t("Rạp Cinema")],
              ["/uu-dai", t("Ưu đãi & sự kiện")],
              ["/bap-nuoc", t("Bắp nước & đồ ăn")],
              ["/hoi-vien", "C’MEMBER"],
            ].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {t(label)}
                <ArrowUpRight size={16} />
              </a>
            ))}
            {member?.role === "ADMIN" && (
              <Link href="/quan-tri">
                Quản trị rạp <Crown size={16} />
              </Link>
            )}
            {["ADMIN", "STAFF"].includes(member?.role) && (
              <Link href="/soat-ve">
                Soát vé <ShieldCheck size={16} />
              </Link>
            )}
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
      <nav className="nova-subnav" aria-label="Khám phá NOVA">
        <div className="content-width">
          {[
            ["/phim", "Phim đang chiếu"],
            ["/sap-chieu", "Sắp chiếu tháng sau"],
            ["/dat-ve", "Lịch chiếu & đặt vé"],
            ["/bap-nuoc", "Bắp nước & đồ ăn"],
            ["/uu-dai", "Ưu đãi & sự kiện"],
            ["/rap", "Rạp & trải nghiệm"],
            ["/hoi-vien", "C’MEMBER"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main id="main-content" tabIndex={-1}>
        {view === "home" ? (
          <>
            <CinemaHero
              movie={hero}
              featured={featured}
              active={slide}
              onChange={setSlide}
              onBook={bookMovie}
              onMovie={openMovie}
              onWelcome={() => setWelcomeOpen(true)}
            />
            <DatVeNhanh
              key={wizardVersion}
              cinemaId={resolvedCinemaId}
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
                  {t("5 phút giữ ghế")}{" "}
                  <small>{t("AN TÂM MỖI LỰA CHỌN")} </small>
                </b>
              </span>
              <span>
                <Ticket size={22} />
                <b>
                  {t("Vé điện tử QR")} <small>{t("CHẠM LÀ VÀO RẠP")} </small>
                </b>
              </span>
            </div>
            <Discovery
              view="movies-home"
              onMovie={openMovie}
              onBook={bookMovie}
            />
            <LichChieuPhim
              onBook={(value) => {
                if (!member) {
                  setModal("login");
                  return;
                }
                setBooking(value);
              }}
            />
            <Discovery view="offers-home" />
            <Discovery
              view="food-home"
              onBooking={() => window.location.assign("/dat-ve")}
            />
            <NovaJourney />
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
                <div className="membership-offer">
                  <strong>
                    {{ SILVER: 5, GOLD: 7, DIAMOND: 10 }[member?.tier] || 5}
                    <small>%</small>
                  </strong>
                  <div>
                    <b>
                      {member
                        ? `Quyền lợi hạng ${member.tier}`
                        : "Ưu đãi ngay từ hạng SILVER"}
                    </b>
                    <span>
                      Giảm trên đơn đủ điều kiện · Lưu vé QR trong tài khoản
                    </span>
                  </div>
                </div>
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
                    {["Tất cả", "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {t(c)}
                        </option>
                      ),
                    )}
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
                            ][i % 4]
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
                        <div className="cinema-details">
                          <span>
                            <strong>
                              {
                                rooms.filter((room) => room.cinemaId === c.id)
                                  .length
                              }
                            </strong>{" "}
                            phòng chiếu
                          </span>
                          <span>
                            {getDates(language, c.id).length} ngày có lịch
                          </span>
                        </div>
                        <span>{c.formats}</span>
                        <button
                          className="text-button"
                          onClick={() => {
                            setCinemaId(c.id);
                            setMovieId("");
                            setDateId("");
                            setTimeId("");
                            document.getElementById("booking")?.scrollIntoView({
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
                    <span className="format-badge">
                      70MM SPECIAL RE-RELEASE
                    </span>
                    <h3>
                      Oppenheimer.
                      <br />
                      {t("Trở lại, hoành tráng hơn.")}{" "}
                    </h3>
                    <p>
                      {t(
                        "Kiệt tác của Christopher Nolan trên màn ảnh IMAX.",
                      )}{" "}
                    </p>
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
          </>
        ) : (
          <PortalPage
            view={view}
            member={member}
            onMember={(next) => {
              setMember(next);
            }}
            onLogout={async () => {
              try {
                await apiLogout();
                setMember(null);
              } catch (err) {
                setSessionError(err.message);
              }
            }}
            onMovie={openMovie}
            onBook={bookMovie}
            onResume={setBooking}
            bookingWidget={
              <DatVeNhanh
                key={wizardVersion}
                cinemaId={resolvedCinemaId}
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
            }
            timeline={
              <LichChieuPhim
                onBook={(value) => {
                  if (!member) {
                    setModal("login");
                    return;
                  }
                  setBooking(value);
                }}
              />
            }
          />
        )}
      </main>
      <CinemaFooter />
      {welcomeOpen && view === "home" && !booking && !modal && (
        <WelcomeOffer onClose={() => setWelcomeOpen(false)} />
      )}
      {booking && (
        <ChonGhe_Va_ThanhToan
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
        <HopThoaiModal
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
            <DangNhap_DangKy
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
                    onClick={() => window.location.assign("/quan-tri")}
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
              <LichSuVeKhachHang
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
            <LichSuVeKhachHang
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
                          <Star
                            key={i}
                            size={15}
                            fill="#f59e0b"
                            color="#f59e0b"
                          />
                        ))}
                      </div>
                      <small>1.420 lượt đánh giá</small>
                    </div>
                    <div className="rating-metrics">
                      <div className="metric-badge">
                        👍 98% Khán giả khuyên xem
                      </div>
                      <div className="metric-badge">
                        🏆 Đánh giá cao nhất tuần
                      </div>
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
                            fill={
                              (hoverRating || userRating) >= star
                                ? "#f59e0b"
                                : "none"
                            }
                            color={
                              (hoverRating || userRating) >= star
                                ? "#f59e0b"
                                : "#64748b"
                            }
                          />
                        </button>
                      ))}
                      <span className="rating-score-label">
                        {userRating} / 5 sao
                      </span>
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
                        <span>
                          Cảm ơn bạn! Đánh giá ({userRating} sao: &ldquo;
                          {userReview}&rdquo;) của bạn đã được ghi nhận.
                        </span>
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
                      <p>
                        Kỹ xảo IMAX Laser mãn nhãn, âm thanh Dolby Atmos tái
                        hiện từng rung chuyển sống động đến choáng ngợp!
                      </p>
                    </div>
                    <div className="review-bubble">
                      <div className="bubble-head">
                        <b>Trần Thu Thảo</b>
                        <span className="stars-mini">⭐⭐⭐⭐⭐</span>
                      </div>
                      <p>
                        Kịch bản chặt chẽ, diễn xuất cuốn hút từng phút. Rạp
                        Nova phục vụ rất chu đáo và bắp rang rất ngon.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="detail-actions">
                  <button
                    className="button button-primary"
                    disabled={
                      activeMovie.status === "soon" &&
                      !cinemas.some(
                        (c) => getDates("vi", c.id, activeMovie.id).length,
                      )
                    }
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
                disabled={
                  activeMovie.status === "soon" &&
                  !cinemas.some(
                    (c) => getDates("vi", c.id, activeMovie.id).length,
                  )
                }
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
        </HopThoaiModal>
      )}
      {modal === "staff" && <SoatVeNhanVien onClose={() => setModal(null)} />}
      {modal === "admin" && (
        <QuanTriHeThong onClose={() => setModal(null)} adminUser={member} />
      )}
    </div>
  );
}
