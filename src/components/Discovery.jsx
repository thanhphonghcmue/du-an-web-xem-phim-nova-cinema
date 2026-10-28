import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Film,
  Gift,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import { useI18n } from "../i18n.js";
import { vietnamDay } from "../bookingDates.js";
import { useCatalog } from "../catalog.js";
import {
  menuArtwork,
  nextScreeningDate,
  downloadReminder,
} from "../commerce.js";
import PageBanner from "./PageBanner.jsx";
import FoodStore, { FoodHero } from "./FoodStore.jsx";
import MenuImage from "./MenuImage.jsx";

const campaigns = [
  {
    id: "party",
    label: "THE PERFECT MOVIE PAIRING",
    title: "Phim hay.\nCombo trọn vị.",
    price: "69",
    unit: "K",
    subtitle: "Một bắp lớn. Hai ly mát lạnh. Một buổi hẹn đáng nhớ.",
    image: "/images/menu/party69.svg",
    tone: "gold",
    tag: "PARTY COMBO",
    category: "combo",
    detail:
      "Party Combo 69K gồm một bắp lớn và hai nước 22oz. Chọn trong bước đặt vé; giá chính thức được xác nhận khi giữ ghế.",
    href: "/bap-nuoc",
  },
  {
    id: "festival",
    label: "LIMITED NOVA COLLECTION",
    title: "Một chút quái.\nThêm nhiều vui.",
    price: "139",
    unit: "K",
    subtitle: "Bắp mix, nước mát và món quà NOVA cho mùa lễ hội.",
    image: "/images/menu/festival.svg",
    tone: "purple",
    tag: "COMBO LỄ HỘI",
    category: "limited",
    detail:
      "Combo Lễ Hội Quái Nhí gồm bắp mix, nước ngọt và móc khóa NOVA. Đây là bộ sưu tập minh họa của đồ án, được thêm vào đơn cùng vé.",
    href: "/bap-nuoc",
  },
  {
    id: "member",
    label: "GOOD FILMS. GREAT PRIVILEGES.",
    title: "Đi xem phim.\nMang về đặc quyền.",
    price: "10",
    unit: "%",
    subtitle: "Ưu đãi theo hạng C’MEMBER, áp dụng vào đơn của bạn.",
    image: "/images/menu/couple.svg",
    tone: "crimson",
    tag: "C’MEMBER",
    category: "membership",
    detail:
      "Hạng SILVER giảm 5%, GOLD giảm 7%, DIAMOND giảm 10% theo chính sách backend. Quyền lợi áp dụng trên đơn hợp lệ; mức giá cuối cùng hiển thị sau khi giữ ghế.",
    href: "/hoi-vien",
  },
  {
    id: "group",
    label: "MORE FRIENDS. MORE MEMORIES.",
    title: "Cả nhóm cùng đi.\nCả hàng cùng vui.",
    price: "189",
    unit: "K",
    subtitle: "Family Movie Box cho nhóm bạn thích chia sẻ từng khoảnh khắc.",
    image: "/images/menu/family.svg",
    tone: "green",
    tag: "FAMILY MOVIE BOX",
    category: "combo",
    detail:
      "Family Movie Box gồm hai bắp lớn, bốn nước và hai hotdog. Gợi ý nhóm hỗ trợ tối đa 20 ghế liền hàng, tùy chỗ còn trống của từng suất.",
    href: "/bap-nuoc",
  },
  {
    id: "welcome",
    label: "YOUR FIRST NOVA NIGHT",
    title: "Lần đầu đến NOVA.\nThêm một lý do vui.",
    price: "30",
    unit: "K",
    subtitle: "Mã CHAOBANMOI cho đơn đủ điều kiện từ 100.000đ.",
    image: "/images/menu/solo.svg",
    tone: "blue",
    tag: "CHAOBANMOI",
    category: "voucher",
    detail:
      "Mã CHAOBANMOI giảm 30.000đ khi số tiền sau ưu đãi thành viên đạt 100.000đ. Đây là mã minh họa theo cấu hình hiện tại, chưa giới hạn theo lần mua đầu tiên. Tổng tiền được backend xác nhận.",
    href: "/dat-ve",
  },
  {
    id: "collector",
    label: "TAKE THE EXPERIENCE HOME",
    title: "Một đêm điện ảnh.\nMột món để nhớ.",
    price: "249",
    unit: "K",
    subtitle: "Hộp bắp sưu tầm NOVA và hai nước cho fan màn ảnh lớn.",
    image: "/images/menu/infinity.svg",
    tone: "purple",
    tag: "INFINITY COLLECTOR",
    category: "limited",
    detail:
      "Infinity Collector Box là gói bắp nước kèm hộp NOVA trong danh mục minh họa. Xem mô tả món và tổng tiền tại bước chọn ghế trước khi xác nhận.",
    href: "/bap-nuoc",
  },
];

function CampaignCard({ campaign, onOpen, large = false }) {
  return (
    <article
      className={`campaign-card campaign-${campaign.tone} ${large ? "campaign-large" : ""}`}
    >
      <div className="campaign-pattern" aria-hidden="true" />
      <div className="campaign-copy">
        <span className="campaign-tag">
          <Sparkles size={12} />
          {campaign.tag}
        </span>
        <h3>
          {campaign.title.split("\n").map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </h3>
        <p>{campaign.subtitle}</p>
        <button onClick={() => onOpen(campaign)} className="campaign-link">
          Khám phá ngay <ArrowUpRight size={16} />
        </button>
      </div>
      <MenuImage
        item={menuArtwork.find((item) => item.image === campaign.image)}
        className="campaign-food-visual"
      />
      <span className="campaign-price">
        {campaign.price}
        <small>{campaign.unit}</small>
      </span>
    </article>
  );
}

function FilmCard({ movie, onMovie, onBook }) {
  const upcoming = movie.status === "soon";
  const { showtimes } = useCatalog();
  const presale =
    upcoming &&
    showtimes.some(
      (show) =>
        show.movieId === movie.id && new Date(show.startTime) > new Date(),
    );
  const remindOnly = upcoming && !presale;
  return (
    <article className="discovery-film" data-movie-id={movie.id}>
      <div className="discovery-poster">
        <Link
          href={`/phim/${movie.id}`}
          className="poster-image-button"
          aria-label={`Thông tin ${movie.title}`}
        >
          <img
            src={movie.localPoster || movie.poster || "/images/dune-poster.jpg"}
            alt={movie.title}
            loading="lazy"
            width="400"
            height="600"
          />
        </Link>
        <div className="film-badges">
          <span className={`classification classification-${movie.age}`}>
            {movie.age}
          </span>
          <span>{movie.format || "2D"}</span>
        </div>
        {movie.rating && movie.rating !== "—" && (
          <span className="film-score">
            <Star size={12} fill="currentColor" />
            {movie.rating}
          </span>
        )}
        <div className="film-hover">
          <button onClick={() => onMovie(movie, "trailer")}>
            <Play size={17} /> Xem trailer
          </button>
          <button
            onClick={() =>
              remindOnly ? downloadReminder(movie) : onBook(movie)
            }
          >
            {remindOnly ? <CalendarDays size={17} /> : <Ticket size={17} />}{" "}
            {remindOnly
              ? "Nhắc lịch .ics"
              : presale
                ? "Đặt vé trước"
                : "Đặt vé"}
          </button>
        </div>
      </div>
      {presale && (
        <span className="presale-label">
          <Ticket size={13} />
          Đã mở bán vé trước
        </span>
      )}
      <p className="film-genre">{movie.genre || "Điện ảnh tuyển chọn"}</p>
      <Link className="film-name" href={`/phim/${movie.id}`}>
        {movie.title}
      </Link>
      <div className="film-bottom">
        <span>
          <Clock3 size={12} />
          {movie.duration} phút
        </span>
        <button
          onClick={() => (remindOnly ? downloadReminder(movie) : onBook(movie))}
          aria-label={
            remindOnly
              ? `Nhắc lịch ${movie.title}`
              : presale
                ? `Đặt trước ${movie.title}`
                : `Đặt vé ${movie.title}`
          }
        >
          {remindOnly ? <CalendarDays size={16} /> : <ArrowUpRight size={17} />}
        </button>
      </div>
      {upcoming && (
        <button
          className="presale-reminder"
          onClick={() => downloadReminder(movie)}
        >
          <CalendarDays size={13} />
          Lưu nhắc lịch .ics
        </button>
      )}
      {upcoming && (
        <p className="film-release">
          Dự kiến{" "}
          {new Date(
            nextScreeningDate(movie) + "T12:00:00+07:00",
          ).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </p>
      )}
    </article>
  );
}

function MovieLibrary({ upcoming = false, compact = false, onMovie, onBook }) {
  const { t } = useI18n();
  const { movies, showtimes } = useCatalog();
  const [tab, setTab] = useState(upcoming ? "soon" : "all");
  const [genre, setGenre] = useState("Tất cả");
  const [age, setAge] = useState("all");
  const [todayOnly, setTodayOnly] = useState(false);
  const [query, setQuery] = useState("");
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("vi");
  const selected = movies.filter(
    (movie) =>
      (tab === "all" ||
        (tab === "now" ? movie.status !== "soon" : movie.status === tab)) &&
      (genre === "Tất cả" || movie.genre?.includes(genre)) &&
      (age === "all" || movie.age === age) &&
      normalize(movie.title + " " + movie.original).includes(
        normalize(query),
      ) &&
      (!todayOnly ||
        showtimes.some(
          (show) =>
            show.movieId === movie.id &&
            vietnamDay(show.startTime) === vietnamDay(Date.now()),
        )),
  );
  const visible = selected;
  return (
    <section id="movies" className="content-width discovery-section">
      <div className="discovery-heading">
        <div>
          <p className="nova-kicker">YOUR NEXT GREAT STORY</p>
          <h2>
            {upcoming ? (
              <>
                Hẹn bạn <em>tháng sau.</em>
              </>
            ) : (
              <>
                {t("Một màn ảnh.")}
                <br className="mobile-only" /> <em>{t("Vạn cảm xúc.")}</em>
              </>
            )}
          </h2>
          <p>
            {upcoming
              ? "Tuyển tập tái chiếu dự kiến. Lưu lịch để không bỏ lỡ bộ phim yêu thích."
              : "Bom tấn, phim Việt và những tác phẩm xứng đáng trở lại màn ảnh lớn."}
          </p>
        </div>
        {compact && (
          <Link className="discovery-text-link" href="/phim">
            {t("Tất cả phim")} <ArrowUpRight size={18} />
          </Link>
        )}
      </div>
      {!upcoming && (
        <div
          className="discovery-tabs"
          role="tablist"
          aria-label="Danh mục phim"
        >
          {[
            ["now", "Đang chiếu"],
            ["soon", "Sắp chiếu tháng sau"],
            ["special", "Suất đặc biệt"],
            ["all", "Tất cả phim"],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {t(label)}
              <span>
                {
                  movies.filter(
                    (m) =>
                      id === "all" ||
                      (id === "now" ? m.status !== "soon" : m.status === id),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
      )}
      {!upcoming && !compact && (
        <label className="today-screenings">
          <input
            type="checkbox"
            checked={todayOnly}
            onChange={(event) => setTodayOnly(event.target.checked)}
          />
          Chỉ phim có suất hôm nay
        </label>
      )}
      <div className="discovery-filters">
        <div className="filter-pills">
          {[
            "Tất cả",
            "Hành động",
            "Khoa học viễn tưởng",
            "Hoạt hình",
            "Kinh dị",
            "Tâm lý",
          ].map((g) => (
            <button
              key={g}
              aria-pressed={genre === g}
              className={genre === g ? "selected" : ""}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <label className="age-filter">
          <SlidersHorizontal size={14} />
          <select
            aria-label="Lọc độ tuổi"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="all">Độ tuổi</option>
            {["P", "K", "T13", "T16", "T18"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      {!compact && (
        <label className="discovery-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm bộ phim bạn muốn xem…"
            aria-label="Tìm phim trong danh mục"
          />
          <span>{selected.length} phim</span>
        </label>
      )}
      {upcoming ? (
        [1, 2, 3, 4].map((week) => {
          const films = visible.filter(
            (m) =>
              (m.week ||
                Math.min(
                  4,
                  Math.ceil(
                    new Date(nextScreeningDate(m) + "T12:00:00Z").getUTCDate() /
                      7,
                  ),
                )) === week,
          );
          return (
            films.length > 0 && (
              <div className="upcoming-week" key={week}>
                <div className="week-heading">
                  <CalendarDays size={20} />
                  <h3>Tuần {week}</h3>
                  <span>{films.length} cuộc hẹn điện ảnh</span>
                </div>
                <div className="discovery-movies">
                  {films.map((m) => (
                    <FilmCard
                      key={m.id}
                      movie={m}
                      onMovie={onMovie}
                      onBook={onBook}
                    />
                  ))}
                </div>
              </div>
            )
          );
        })
      ) : (
        <div className="discovery-movies">
          {visible.map((m) => (
            <FilmCard key={m.id} movie={m} onMovie={onMovie} onBook={onBook} />
          ))}
        </div>
      )}
      {selected.length === 0 && (
        <div className="discovery-empty">
          <Film size={32} />
          <h3>Chưa có phim phù hợp</h3>
          <p>Thử thể loại hoặc độ tuổi khác để tiếp tục khám phá.</p>
          <button
            className="button button-glass"
            onClick={() => {
              setGenre("Tất cả");
              setAge("all");
              setQuery("");
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
      {compact && selected.length > 12 && (
        <div className="section-bottom-action">
          <Link href="/phim" className="button button-glass">
            Khám phá thêm {selected.length - 12} phim <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <p className="discovery-footnote">
        Danh mục tuyển chọn và lịch tái chiếu minh họa của NOVA Cinema. Phim sắp
        chiếu chưa mở bán.
      </p>
    </section>
  );
}

function Offers({ compact = false }) {
  const [selected, setSelected] = useState(null);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("all");
  const cards = campaigns.filter(
    (c) => filter === "all" || c.category === filter,
  );
  return (
    <section
      id="offers"
      className="content-width discovery-section offers-discovery"
    >
      <div className="discovery-heading">
        <div>
          <p className="nova-kicker">LITTLE EXTRAS. BIG MEMORIES.</p>
          <h2>
            Thêm ưu đãi.
            <br className="mobile-only" /> <em>Trọn cuộc vui.</em>
          </h2>
          <p>Một lý do nữa để hẹn nhau ở NOVA.</p>
        </div>
        {compact ? (
          <Link className="discovery-text-link" href="/uu-dai">
            Tất cả ưu đãi <ArrowUpRight size={18} />
          </Link>
        ) : (
          <Gift className="heading-icon" size={40} />
        )}
      </div>
      {compact ? (
        <>
          <div className="campaign-carousel">
            {[0, 1, 2].map((offset) => (
              <CampaignCard
                key={offset}
                campaign={campaigns[(index + offset) % campaigns.length]}
                onOpen={setSelected}
              />
            ))}
          </div>
          <div className="campaign-controls">
            <button
              aria-label="Ưu đãi trước"
              onClick={() =>
                setIndex((index + campaigns.length - 1) % campaigns.length)
              }
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {index + 1} / {campaigns.length}
            </span>
            <button
              aria-label="Ưu đãi tiếp theo"
              onClick={() => setIndex((index + 1) % campaigns.length)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="filter-pills offers-filters">
            {[
              ["all", "Tất cả ưu đãi"],
              ["combo", "Bắp nước"],
              ["membership", "Hội viên"],
              ["voucher", "Mã ưu đãi"],
              ["limited", "Bộ sưu tập"],
            ].map(([id, label]) => (
              <button
                className={filter === id ? "selected" : ""}
                key={id}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="campaign-grid">
            {cards.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onOpen={setSelected}
                large
              />
            ))}
          </div>
        </>
      )}
      {selected && (
        <div className="offer-detail" role="status">
          <MenuImage
            item={menuArtwork.find((item) => item.image === selected.image)}
            className="offer-food-visual"
            decorative
          />
          <div>
            <p className="nova-kicker">{selected.tag}</p>
            <h3>{selected.title.replace("\n", " ")}</h3>
            <p>{selected.detail}</p>
            <Link className="button button-primary" href={selected.href}>
              Khám phá <ArrowUpRight size={16} />
            </Link>
          </div>
          <button
            className="icon-button"
            aria-label="Đóng chi tiết ưu đãi"
            onClick={() => setSelected(null)}
          >
            <X size={20} />
          </button>
        </div>
      )}
      {!compact && (
        <p className="discovery-footnote">
          Ưu đãi và sản phẩm minh họa cho đồ án. Điều kiện và tổng thanh toán
          được xác nhận trong đơn đặt vé; không thu tiền thật.
        </p>
      )}
    </section>
  );
}

export default function Discovery({ view, onMovie, onBook, onBooking }) {
  if (view === "movies-home")
    return <MovieLibrary compact onMovie={onMovie} onBook={onBook} />;
  if (view === "offers-home") return <Offers compact />;
  if (view === "food-home") return <FoodStore compact onBooking={onBooking} />;
  if (view === "phim")
    return (
      <>
        <PageBanner
          label="PHIM ĐANG CHIẾU"
          title={
            <>
              Chọn một phim.
              <br />
              Bắt đầu một trải nghiệm.
            </>
          }
          description="Từ bom tấn màn ảnh lớn đến những tác phẩm kinh điển. Tìm bộ phim cho buổi hẹn tiếp theo."
          image="/images/dune-scene.jpg"
        />
        <MovieLibrary onMovie={onMovie} onBook={onBook} />
      </>
    );
  if (view === "sap-chieu")
    return (
      <>
        <PageBanner
          label="COMING NEXT MONTH"
          title={
            <>
              Tháng mới.
              <br />
              Những cuộc hẹn mới.
            </>
          }
          description="Tuyển tập tái chiếu dự kiến tháng sau. Phim đã mở bán cho phép đặt trước, chọn phòng và giữ ghế ngay; các phim còn lại có thể lưu nhắc lịch."
          image="/images/cinema-imax.jpg"
        >
          <div className="banner-chips">
            <span>
              <CalendarDays size={15} /> Tháng{" "}
              {new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                1,
              ).toLocaleDateString("vi-VN", {
                month: "2-digit",
                year: "numeric",
              })}
            </span>
            <span>Tuyển tập NOVA Selected</span>
            <span>Chưa mở bán</span>
          </div>
        </PageBanner>
        <MovieLibrary upcoming onMovie={onMovie} onBook={onBook} />
      </>
    );
  if (view === "uu-dai")
    return (
      <>
        <PageBanner
          label="NOVA EXTRAS"
          title={
            <>
              Cuộc vui trọn vẹn.
              <br />
              Ưu đãi đầy tay.
            </>
          }
          description="Combo, bộ sưu tập và đặc quyền hội viên. Khám phá những điều nhỏ làm nên một buổi xem phim đáng nhớ."
          image="/images/cinema-lobby.jpg"
        />
        <Offers />
      </>
    );
  if (view === "bap-nuoc")
    return (
      <>
        <FoodHero />
        <FoodStore onBooking={onBooking} />
      </>
    );
  return null;
}
