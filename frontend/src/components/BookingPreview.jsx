"use client";
import { useState } from "react";
import Link from "next/link";
import NovaLogo from "./NovaLogo.jsx";
import CinematicScreen3D from "./CinematicScreen3D.jsx";

const demoSeats = ["A", "B", "C", "D", "E"].flatMap((row) =>
  Array.from({ length: 12 }, (_, i) => ({
    id: `${row}${i + 1}`,
    row,
    column: i + 1,
    unavailable: (row === "B" && i > 3 && i < 8) || (row === "D" && i < 3),
  })),
);
export default function BookingPreview() {
  const [selected, setSelected] = useState([]);
  return (
    <main className="booking-preview booking-console">
      <header className="preview-header">
        <Link href="/" aria-label="NOVA Cinema trang chủ">
          <NovaLogo />
        </Link>
        <Link href="/dat-ve">Về đặt vé thật ↗</Link>
      </header>
      <div className="preview-notice" role="note">
        <b>BẢN XEM TRƯỚC · CHỈ ĐỌC</b>
        <span>
          Dữ liệu minh họa giao diện. Không giữ ghế, không thanh toán và không
          cấp vé.
        </span>
      </div>
      <section className="preview-heading">
        <p className="nova-kicker">NOVA / THE NEXT FRAME</p>
        <h1>
          Một chỗ ngồi.
          <br />
          <em>Hàng ngàn cảm xúc.</em>
        </h1>
        <p>Khám phá không gian điện ảnh mới của bạn.</p>
      </section>
      <div className="preview-layout">
        <section className="preview-auditorium" aria-label="Sơ đồ ghế minh họa">
          <CinematicScreen3D />
          <div className="preview-seats">
            {["A", "B", "C", "D", "E"].map((row) => (
              <div className="preview-seat-row" key={row}>
                <span>{row}</span>
                {demoSeats
                  .filter((seat) => seat.row === row)
                  .map((seat, index) => (
                    <button
                      key={`${seat.id}-${index}`}
                      type="button"
                      disabled={seat.unavailable}
                      aria-label={`Ghế minh họa ${seat.id}`}
                      aria-pressed={selected.includes(seat.id)}
                      onClick={() =>
                        setSelected((old) =>
                          old.includes(seat.id)
                            ? old.filter((id) => id !== seat.id)
                            : [...old, seat.id],
                        )
                      }
                    >
                      {seat.column}
                    </button>
                  ))}
                <span>{row}</span>
              </div>
            ))}
          </div>
          <p className="preview-legend">
            <i /> Còn trống <i /> Bạn chọn <i /> Không khả dụng
          </p>
        </section>
        <aside className="preview-summary">
          <p className="nova-kicker">LỰA CHỌN CỦA BẠN</p>
          <h2>
            Đêm điện ảnh
            <br />
            bắt đầu từ đây.
          </h2>
          <p>NOVA Cinema · Màn hình cong</p>
          <div className="preview-selection">
            {selected.length ? selected.join(" · ") : "Chọn thử một vị trí"}
          </div>
          <p>Đếm ngược và giá sẽ được backend xác nhận khi bạn đặt vé thật.</p>
          <button className="button button-primary w-full" disabled>
            Thanh toán cần backend
          </button>
          <div className="preview-qr-note">
            QR có hiệu lực chỉ được cấp sau khi backend xác nhận PAID.
          </div>
          <Link href="/dat-ve" className="text-button">
            Kết nối luồng đặt vé →
          </Link>
        </aside>
      </div>
    </main>
  );
}
