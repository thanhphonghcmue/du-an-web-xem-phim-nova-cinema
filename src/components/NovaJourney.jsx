import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Film,
  MapPin,
  Popcorn,
  Ticket,
} from "lucide-react";
import { useCatalog } from "../catalog.js";
export default function NovaJourney() {
  const { movies, rooms, cinemas, showtimes, isLive } = useCatalog();
  const dates = new Set(
    showtimes.map((show) =>
      new Date(show.startTime).toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    ),
  );
  return (
    <section
      className="nova-journey content-width section-space"
      aria-labelledby="journey-title"
    >
      <div className="journey-intro">
        <div>
          <p className="nova-kicker">CUỘC HẸN TIẾP THEO CỦA BẠN</p>
          <h2 id="journey-title">
            Đến NOVA.
            <br />
            <em>Vui theo cách của bạn.</em>
          </h2>
        </div>
        <p>
          Một buổi xem phim trọn vẹn, từ khoảnh khắc chọn phim đến chiếc vé trên
          tay. Bắt đầu ở điều bạn yêu thích.
        </p>
      </div>
      <div className="journey-grid">
        {[
          [
            "/phim",
            Film,
            "01",
            "Tìm phim thật hay",
            "Chuyện mới, cảm xúc mới. Khám phá những bộ phim đang chờ bạn.",
            "/images/cinema-auditorium.jpg",
          ],
          [
            "/bap-nuoc",
            Popcorn,
            "02",
            "Thêm vị cho cuộc vui",
            "Bắp thơm, nước mát và combo cho cả nhóm. Chọn món trước khi đến rạp.",
            "/images/food-photography/popcorn-sharing.webp",
          ],
          [
            "/rap",
            MapPin,
            "03",
            "Chọn rạp của bạn",
            "Xem địa chỉ, phòng chiếu và chọn giờ phù hợp cho buổi hẹn.",
            "/images/cinema-auditorium.jpg",
          ],
        ].map(([href, Icon, num, title, text, img]) => (
          <Link href={href} className="journey-card" key={href}>
            <img src={img} alt="" loading="lazy" />
            <span className="journey-number">{num}</span>
            <div>
              <Icon size={25} />
              <h3>{title}</h3>
              <p>{text}</p>
              <span>
                Khám phá ngay <ArrowUpRight size={19} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {isLive && (
        <div className="journey-live" aria-label="Danh mục lịch chiếu hiện tại">
          <span>
            <i /> Đang mở bán tại NOVA
          </span>
          {[
            [
              Film,
              movies.filter((m) => m.status !== "soon").length,
              "phim đang chiếu",
            ],
            [MapPin, cinemas.length, "cụm rạp"],
            [Ticket, rooms.length, "phòng chiếu"],
            [CalendarDays, dates.size, "ngày có lịch"],
          ].map(([Icon, count, label]) => (
            <div key={label}>
              <Icon size={20} />
              <strong>{count}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
