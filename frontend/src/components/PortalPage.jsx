import { usePathname } from "next/navigation";
import MoviePage from "./MoviePage.jsx";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Crown,
  MapPin,
  ShieldCheck,
  Ticket,
  UsersRound,
} from "lucide-react";
import { useCatalog } from "@/catalog.js";
import PageBanner from "./PageBanner.jsx";
import AuthForm from "./AuthForm.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import StaffCheckIn from "./StaffCheckIn.jsx";
import TicketHistory from "./TicketHistory.jsx";
import Discovery from "./Discovery.jsx";
import InfoPage from "./InfoPage.jsx";

export default function PortalPage({
  view,
  member,
  onMember,
  onLogout,
  onMovie,
  onBook,
  onResume,
  bookingWidget,
  timeline,
}) {
  const { cinemas, movies, rooms, getDates } = useCatalog();
  const movieId = usePathname().split("/")[2];
  const [venueCity, setVenueCity] = useState("all");
  if (view === "phim" && movieId)
    return <MoviePage id={movieId} onMovie={onMovie} onBook={onBook} />;
  if (
    [
      "gioi-thieu",
      "ho-tro",
      "huong-dan",
      "chinh-sach",
      "thanh-toan",
      "lien-he",
    ].includes(view)
  )
    return <InfoPage view={view} />;
  if (["phim", "sap-chieu", "uu-dai", "bap-nuoc"].includes(view))
    return (
      <Discovery
        view={view}
        onMovie={onMovie}
        onBook={onBook}
        onBooking={() => window.location.assign("/dat-ve")}
      />
    );
  if (view === "dat-ve")
    return (
      <>
        <PageBanner
          label="BOOK YOUR NEXT EXPERIENCE"
          title={
            <>
              Một buổi hẹn hay.
              <br />
              Bắt đầu từ chiếc vé.
            </>
          }
          description="Chọn rạp, phim và thời gian phù hợp. Ghế, combo và tổng tiền sẽ được xác nhận ở bước tiếp theo."
          image="/images/cinema-imax.jpg"
        >
          <div className="banner-chips">
            <span>
              <ShieldCheck size={15} />
              Giữ ghế 5 phút
            </span>
            <span>
              <UsersRound size={15} />
              Nhóm đến 20 người
            </span>
            <span>
              <Ticket size={15} />
              Vé điện tử QR
            </span>
          </div>
        </PageBanner>
        {bookingWidget}
        {timeline}
      </>
    );
  if (view === "rap")
    return (
      <>
        <PageBanner
          label="FIND YOUR NOVA"
          title={
            <>
              Màn ảnh lớn.
              <br />
              Ngay gần bạn.
            </>
          }
          description="Khám phá không gian rạp, công nghệ trình chiếu và lịch chiếu cho buổi hẹn của bạn."
          image="/images/cinema-lobby.jpg"
        />
        <section className="content-width discovery-section">
          <div className="venue-filter">
            <div>
              <p className="nova-kicker">CHỌN ĐIỂM HẸN</p>
              <h2>Rạp nào gần bạn?</h2>
            </div>
            <label>
              Thành phố
              <select
                aria-label="Thành phố tìm rạp"
                value={venueCity}
                onChange={(event) => setVenueCity(event.target.value)}
              >
                <option value="all">Tất cả thành phố</option>
                {[...new Set(cinemas.map((cinema) => cinema.city))].map(
                  (city) => (
                    <option key={city}>{city}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="venue-grid">
            {cinemas
              .filter(
                (cinema) => venueCity === "all" || cinema.city === venueCity,
              )
              .map((cinema, index) => (
                <article className="venue-card" key={cinema.id}>
                  <img
                    src={
                      index % 2 === 0
                        ? "/images/cinema-auditorium.jpg"
                        : "/images/cinema-imax.jpg"
                    }
                    alt={`Không gian điện ảnh minh họa ${cinema.name}`}
                  />
                  <div>
                    <p className="nova-kicker">
                      <MapPin size={13} />
                      {cinema.city}
                    </p>
                    <h2>{cinema.name}</h2>
                    <p>{cinema.address}</p>
                    <div className="venue-stats">
                      <div>
                        <strong>
                          {
                            rooms.filter((room) => room.cinemaId === cinema.id)
                              .length
                          }
                        </strong>
                        <span>phòng chiếu</span>
                      </div>
                      <div>
                        <strong>{getDates("vi", cinema.id).length}</strong>
                        <span>ngày có lịch</span>
                      </div>
                    </div>
                    <div className="banner-chips">
                      {[
                        ...new Set(
                          rooms
                            .filter((room) => room.cinemaId === cinema.id)
                            .map(
                              (room) =>
                                ({
                                  STANDARD_2D: "2D",
                                  IMAX_70MM_LASER: "IMAX Laser",
                                  DOLBY_ATMOS: "Dolby Atmos",
                                })[room.roomType],
                            ),
                        ),
                      ].map((format) => (
                        <span key={format}>{format}</span>
                      ))}
                    </div>
                    <Link
                      href={`/dat-ve?cinema=${cinema.id}`}
                      className="button button-primary"
                    >
                      Xem lịch & đặt vé <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
          </div>
          <p className="discovery-footnote">
            Hình ảnh không gian và địa điểm NOVA được dùng minh họa cho đồ án.
          </p>
        </section>
      </>
    );
  if (view === "hoi-vien")
    return (
      <>
        <PageBanner
          label="THE INNER CIRCLE"
          title={
            <>
              Đam mê điện ảnh.
              <br />
              Đặc quyền của bạn.
            </>
          }
          description="Mỗi bộ phim là một kỷ niệm. C’MEMBER giúp bạn lưu giữ chúng, cùng quyền lợi theo hạng thành viên."
          image="/images/cinema-auditorium.jpg"
        />
        <section className="content-width discovery-section">
          <div className="member-introduction">
            <div>
              <p className="nova-kicker">YOUR PASS TO INFINITY</p>
              <h2>
                Mỗi lần đến rạp.
                <br />
                <em>Thêm một điều xứng đáng.</em>
              </h2>
              <p>
                Tài khoản mới bắt đầu ở hạng SILVER. Theo dõi điểm, đơn đang giữ
                và vé điện tử trong cùng một nơi.
              </p>
              <Link
                className="button button-primary"
                href={member ? "/tai-khoan" : "/dang-nhap"}
              >
                {member ? "Mở tài khoản của bạn" : "Gia nhập C’MEMBER"}
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="nova-member-card">
              <Crown size={32} />
              <span>C’MEMBER</span>
              <h3>{member?.tier || "SILVER"}</h3>
              <p>{member?.name || "YOUR NAME. YOUR EXPERIENCE."}</p>
              <small>
                {member
                  ? `${member.points.toLocaleString("vi-VN")} ĐIỂM TÍCH LŨY`
                  : "NOVA CINEMA · INFINITY EXPERIENCE"}
              </small>
            </div>
          </div>
          <div className="membership-tiers">
            {[
              ["SILVER", "5", "Khởi đầu những cuộc hẹn"],
              ["GOLD", "7", "Đặc quyền thêm trọn vẹn"],
              ["DIAMOND", "10", "Dành cho đam mê điện ảnh"],
            ].map(([tier, rate, note]) => (
              <article
                key={tier}
                className={`tier-card tier-${tier.toLowerCase()}`}
              >
                <Crown size={26} />
                <span>C’MEMBER {tier}</span>
                <h3>
                  {rate}
                  <small>%</small>
                </h3>
                <p>{note}</p>
                <ul>
                  <li>
                    <Check size={15} />
                    Ưu đãi trên đơn đủ điều kiện
                  </li>
                  <li>
                    <Check size={15} />
                    Tích điểm sau thanh toán thành công
                  </li>
                  <li>
                    <Check size={15} />
                    Lưu vé QR và lịch sử đặt vé
                  </li>
                </ul>
              </article>
            ))}
          </div>
          <p className="discovery-footnote">
            Hạng và điểm do hệ thống quản lý; không tự nâng hạng khi đạt một
            ngưỡng chưa được quy định. Hiện tích 1 điểm trên mỗi 10.000đ thanh
            toán.
          </p>
        </section>
      </>
    );
  if (view === "quan-tri" && member?.role === "ADMIN")
    return (
      <AdminDashboard
        embedded
        adminUser={member}
        onClose={() => window.location.assign("/")}
      />
    );
  if (view === "soat-ve" && ["ADMIN", "STAFF"].includes(member?.role))
    return (
      <>
        <PageBanner
          label="NOVA STAFF"
          title="Chào đón một trải nghiệm mới."
          description="Kiểm tra vé điện tử trước khi khách vào phòng chiếu."
          image="/images/cinema-lobby.jpg"
        />
        <div className="content-width page-workspace">
          <StaffCheckIn embedded onClose={() => window.location.assign("/")} />
        </div>
      </>
    );
  if (["quan-tri", "soat-ve"].includes(view) && member)
    return (
      <>
        <PageBanner
          label="KHU VỰC VẬN HÀNH"
          title="Tài khoản chưa có quyền truy cập."
          description="Chức năng này dành cho nhân viên được phân quyền."
        />
        <div className="content-width discovery-section">
          <Link href="/tai-khoan" className="button button-primary">
            Về tài khoản <ArrowRight size={17} />
          </Link>
        </div>
      </>
    );
  if (
    ["dang-nhap", "tai-khoan", "quan-tri", "soat-ve"].includes(view) &&
    !member
  )
    return (
      <>
        <PageBanner
          label="WELCOME TO YOUR NEXT EXPERIENCE"
          title={
            <>
              Xin chào.
              <br />
              Hẹn nhau ở NOVA.
            </>
          }
          description="Đăng nhập để giữ ghế, nhận vé điện tử và tận hưởng những quyền lợi của riêng bạn."
          image="/images/cinema-lobby.jpg"
        />
        <div className="content-width page-auth">
          <AuthForm onSuccess={onMember} />
        </div>
      </>
    );
  return (
    <>
      <PageBanner
        label="YOUR NOVA SPACE"
        title={
          <>
            Xin chào, {member?.name?.split(" ").at(-1)}.<br />
            Cuộc hẹn của bạn ở đây.
          </>
        }
        description="Theo dõi đơn đặt, lưu vé điện tử và sẵn sàng cho trải nghiệm tiếp theo."
        image="/images/dune-scene.jpg"
      />
      <section className="content-width discovery-section account-page">
        <div className="account-summary">
          <div className="account-avatar">
            <Crown size={28} />
          </div>
          <div>
            <p className="nova-kicker">C’MEMBER {member?.tier}</p>
            <h2>{member?.name}</h2>
            <p>{member?.email}</p>
          </div>
          <div className="account-points">
            <strong>{(member?.points || 0).toLocaleString("vi-VN")}</strong>
            <span>điểm tích lũy</span>
          </div>
          <button className="button button-glass" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
        <div className="account-shortcuts">
          <Link href="/dat-ve">
            <Ticket size={18} />
            Đặt vé mới <ArrowUpRight size={16} />
          </Link>
          <Link href="/hoi-vien">
            <Crown size={18} />
            Quyền lợi hội viên <ArrowUpRight size={16} />
          </Link>
          {member?.role === "ADMIN" && (
            <Link href="/quan-tri">
              <ShieldCheck size={18} />
              Quản trị rạp <ArrowUpRight size={16} />
            </Link>
          )}
          {["ADMIN", "STAFF"].includes(member?.role) && (
            <Link href="/soat-ve">
              <UsersRound size={18} />
              Soát vé <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
        <div className="discovery-heading">
          <div>
            <p className="nova-kicker">YOUR MOVIE MEMORIES</p>
            <h2 id="ve-cua-toi" style={{ scrollMarginTop: "110px" }}>
              Vé & đơn đặt <em>của bạn.</em>
            </h2>
          </div>
          <span>{movies.length} bộ phim chờ bạn</span>
        </div>
        <TicketHistory member={member} onResume={onResume} />
      </section>
    </>
  );
}
