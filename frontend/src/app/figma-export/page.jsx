"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Film,
  Ticket,
  Clock3,
  Calendar,
  MapPin,
  ShieldCheck,
  Crown,
  UsersRound,
  Check,
  AlertTriangle,
  QrCode,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Popcorn,
  CreditCard,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Settings,
  Plus
} from "lucide-react";

export default function FigmaExportAllScreens() {
  const [activeScreen, setActiveScreen] = useState("all");

  const movies = [
    {
      id: "dune",
      title: "Dune: Hành Tinh Cát 2",
      duration: "166 phút",
      age: "T16",
      format: "IMAX Laser · Dolby Atmos",
      poster: "/images/posters/dune-poster.jpg",
      times: ["14:30", "18:30", "21:15"]
    },
    {
      id: "godzilla",
      title: "Godzilla x Kong: Đế Chế Mới",
      duration: "115 phút",
      age: "T13",
      format: "2D Phụ đề · 3D IMAX",
      poster: "/images/posters/godzilla-kong.jpg",
      times: ["15:00", "19:00", "22:00"]
    },
    {
      id: "mai",
      title: "Mai",
      duration: "131 phút",
      age: "T18",
      format: "2D Tiếng Việt",
      poster: "/images/posters/mai.jpg",
      times: ["16:00", "20:00"]
    }
  ];

  const cinemas = [
    { id: "c1", name: "NOVA Sala Thủ Thiêm", address: "Khu đô thị Sala, TP. Thủ Đức", halls: 8 },
    { id: "c2", name: "NOVA Landmark 81", address: "Tầng B1, TTTM Landmark 81, Bình Thạnh", halls: 10 },
    { id: "c3", name: "NOVA West Lake Hà Nội", address: "Lotte Mall Tây Hồ, Hà Nội", halls: 9 }
  ];

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"];
  const cols = Array.from({ length: 14 }, (_, i) => i + 1);

  // Common Header
  const renderHeader = (isMember = false, activeNav = "Phim") => (
    <header className="figma-header" style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 40px", background: "rgba(13, 15, 23, 0.95)", borderBottom: "1px solid #1f2438", width: "100%", boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, fontSize: "20px", color: "#fff" }}>
          <span style={{ color: "#e50914" }}>▲</span>
          <span>NOVA CINEMA</span>
        </div>
        <nav style={{ display: "flex", gap: "24px", fontSize: "14px", fontWeight: 500, color: "#94a3b8" }}>
          {["Phim", "Sắp chiếu", "Lịch chiếu", "Tìm rạp NOVA", "Ưu đãi", "Bắp nước", "C'MEMBER"].map((tab) => (
            <span key={tab} style={{ color: tab === activeNav ? "#fff" : "#94a3b8", fontWeight: tab === activeNav ? 700 : 500, cursor: "pointer" }}>
              {tab}
            </span>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {isMember ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#1c2033", padding: "6px 14px", borderRadius: "20px", border: "1px solid #2e3552" }}>
            <Crown size={16} color="#fbbf24" />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>Hội viên GOLD · 50.000 điểm</span>
          </div>
        ) : (
          <button style={{ background: "transparent", border: "1px solid #334155", color: "#fff", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
            Đăng nhập / Đăng ký
          </button>
        )}
        <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 700 }}>
          Đặt vé ngay
        </button>
      </div>
    </header>
  );

  return (
    <div style={{ background: "#06080e", color: "#f8fafc", minHeight: "100vh", padding: "40px 20px", fontFamily: "Inter, -apple-system, sans-serif" }}>
      {/* Navigator Bar */}
      <div style={{ maxWidth: "1440px", margin: "0 auto 40px", background: "#111422", padding: "20px", borderRadius: "12px", border: "1px solid #23283e" }}>
        <h1 style={{ fontSize: "24px", margin: "0 0 12px", color: "#e50914" }}>
          🎬 NOVA CINEMA (LAB04) - TRANG TỔNG HỢP 25 GIAO DIỆN NGUYÊN BẢN (NATIVE DOM/CSS)
        </h1>
        <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "14px", lineHeight: "1.6" }}>
          Toàn bộ 25 màn hình bên dưới được render 100% bằng DOM/CSS thật, font chữ Inter tiếng Việt sắc nét, cấu trúc Semantic HTML hoàn chỉnh.
          Bạn có thể mở plugin <strong>html.to.design</strong> trên Figma và paste link: <code>http://localhost:3000/figma-export</code> để chuyển đổi tự động thành 25 Native Frame có Auto-Layout, TextNode và Vector sống!
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "60px", alignItems: "center" }}>

        {/* ========================================================================= */}
        {/* TRANG 01 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 01 - Trang chủ NOVA Cinema (Khách vãng lai)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", overflow: "hidden", border: "1px solid #23283e", position: "relative" }}>
          {renderHeader(false, "Phim")}
          {/* Hero Banner */}
          <div style={{ height: "460px", background: "linear-gradient(180deg, rgba(11,13,23,0.3) 0%, #0b0d17 100%), url('/images/cinema-imax.jpg') center/cover", padding: "60px 80px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <span style={{ color: "#e50914", fontWeight: 800, fontSize: "14px", letterSpacing: "2px" }}>BOM TẤN THÁNG NÀY</span>
            <h1 style={{ fontSize: "44px", fontWeight: 900, margin: "8px 0 16px", maxWidth: "700px", lineHeight: "1.2" }}>
              Dune: Hành Tinh Cát 2
            </h1>
            <p style={{ color: "#cbd5e1", maxWidth: "600px", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" }}>
              Cuộc phiêu lưu vĩ đại của Paul Atreides tiếp tục trên màn ảnh vô cực IMAX 70mm Laser. Cảm nhận âm thanh đa chiều Dolby Atmos rúng động giác quan.
            </p>
            <div style={{ display: "flex", gap: "16px" }}>
              <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "14px 28px", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
                Đặt vé nhanh ngay
              </button>
              <button style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "14px 24px", borderRadius: "8px", fontWeight: 600, fontSize: "15px" }}>
                Xem Trailer 4K
              </button>
            </div>
          </div>
          {/* Quick Selection strip */}
          <div style={{ padding: "30px 80px" }}>
            <h2 style={{ fontSize: "20px", margin: "0 0 20px" }}>Phim đang chiếu hôm nay</h2>
            <div style={{ display: "flex", gap: "24px" }}>
              {movies.map(m => (
                <div key={m.id} style={{ background: "#141726", padding: "16px", borderRadius: "10px", width: "280px", border: "1px solid #23283e" }}>
                  <div style={{ height: "180px", background: "#222538", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", color: "#e50914", fontWeight: 800 }}>
                    {m.title}
                  </div>
                  <h3 style={{ fontSize: "16px", margin: "0 0 6px" }}>{m.title}</h3>
                  <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 12px" }}>{m.age} · {m.duration}</p>
                  <button style={{ width: "100%", background: "#23283e", border: "none", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                    Chọn suất chiếu
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 02 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 02 - Hộp thoại Đăng nhập tài khoản (UC02)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.9)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #23283e", borderRadius: "12px" }}>
          <div style={{ width: "460px", background: "#131625", padding: "40px", borderRadius: "16px", border: "1px solid #2a314d", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "22px" }}>Đăng nhập C'MEMBER</h2>
              <X size={20} color="#94a3b8" style={{ cursor: "pointer" }} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button style={{ flex: 1, padding: "10px", background: "#e50914", border: "none", color: "#fff", fontWeight: 700, borderRadius: "6px" }}>Đăng nhập</button>
              <button style={{ flex: 1, padding: "10px", background: "#1f2438", border: "none", color: "#94a3b8", fontWeight: 600, borderRadius: "6px" }}>Đăng ký</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Email hoặc Số điện thoại</label>
                <input readOnly value="customer@nova.vn" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "12px", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Mật khẩu</label>
                <input readOnly type="password" value="••••••••••••" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "12px", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#94a3b8" }}>
                <span><input type="checkbox" defaultChecked /> Ghi nhớ đăng nhập</span>
                <span style={{ color: "#e50914", cursor: "pointer" }}>Quên mật khẩu?</span>
              </div>
              <button style={{ width: "100%", background: "#e50914", border: "none", color: "#fff", padding: "14px", borderRadius: "8px", fontWeight: 700, fontSize: "15px", marginTop: "8px" }}>
                Đăng nhập (C'MEMBER)
              </button>
              <div style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", marginTop: "12px" }}>
                Chưa có tài khoản? <span style={{ color: "#e50914", fontWeight: 700, cursor: "pointer" }}>Đăng ký ngay</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 03 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 03 - Hộp thoại Đăng ký hội viên mới (UC01)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.9)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #23283e", borderRadius: "12px" }}>
          <div style={{ width: "480px", background: "#131625", padding: "40px", borderRadius: "16px", border: "1px solid #2a314d", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "22px" }}>Đăng ký hội viên C'MEMBER</h2>
              <X size={20} color="#94a3b8" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Họ và tên</label>
                <input readOnly value="Nguyễn Văn A" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "11px", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Địa chỉ Email</label>
                <input readOnly value="nguyenvana@gmail.com" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "11px", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Số điện thoại</label>
                <input readOnly value="0912345678" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "11px", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Mật khẩu (tối thiểu 8 ký tự)</label>
                <input readOnly type="password" value="NovaPassword123" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "11px", borderRadius: "8px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <button style={{ width: "100%", background: "#e50914", border: "none", color: "#fff", padding: "14px", borderRadius: "8px", fontWeight: 700, fontSize: "15px", marginTop: "8px" }}>
                Hoàn tất đăng ký
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 04 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 04 - Trang chủ Đã đăng nhập (Hội viên C'MEMBER)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", overflow: "hidden" }}>
          {renderHeader(true, "Phim")}
          <div style={{ padding: "40px 80px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", background: "#131626", padding: "24px 32px", borderRadius: "12px", border: "1px solid #23283e" }}>
              <div>
                <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: "13px" }}>👑 THÀNH VIÊN GOLD</span>
                <h2 style={{ fontSize: "24px", margin: "4px 0" }}>Xin chào, Nguyễn Văn A</h2>
                <p style={{ color: "#94a3b8", margin: 0, fontSize: "14px" }}>Bạn đang có <strong>50.000 điểm</strong> tích lũy (tương đương 50.000đ giảm giá vé & bắp nước).</p>
              </div>
              <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, fontSize: "14px" }}>
                Chọn rạp cho cuộc hẹn
              </button>
            </div>
            <h2 style={{ fontSize: "20px", margin: "0 0 20px" }}>Phim đề xuất cho bạn</h2>
            <div style={{ display: "flex", gap: "24px" }}>
              {movies.map(m => (
                <div key={m.id} style={{ background: "#141726", padding: "16px", borderRadius: "10px", width: "280px", border: "1px solid #23283e" }}>
                  <div style={{ height: "180px", background: "#222538", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", color: "#e50914", fontWeight: 800 }}>
                    {m.title}
                  </div>
                  <h3 style={{ fontSize: "16px", margin: "0 0 6px" }}>{m.title}</h3>
                  <button style={{ width: "100%", background: "#e50914", border: "none", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                    Đặt vé ngay
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 05 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 05 - Hộp thoại Chọn cụm rạp theo khu vực (UC03)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.9)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "640px", background: "#131625", padding: "36px", borderRadius: "16px", border: "1px solid #2a314d" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "22px" }}>Chọn cụm rạp NOVA</h2>
              <X size={20} color="#94a3b8" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {cinemas.map(c => (
                <div key={c.id} style={{ padding: "18px 24px", background: "#1a1f33", border: "1px solid #2a3250", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "17px", color: "#fff" }}>{c.name}</h3>
                    <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>{c.address} · {c.halls} phòng chiếu</p>
                  </div>
                  <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                    Chọn rạp này
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 06 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 06 - Chi tiết phim & Lịch chiếu theo ngày (UC03)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", overflow: "hidden" }}>
          {renderHeader(true, "Lịch chiếu")}
          <div style={{ padding: "40px 80px", display: "flex", gap: "40px" }}>
            <div style={{ width: "300px", background: "#141726", padding: "20px", borderRadius: "12px", border: "1px solid #23283e" }}>
              <div style={{ height: "380px", background: "#1c2136", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#e50914", fontWeight: 800, fontSize: "20px", textAlign: "center", padding: "20px" }}>
                Dune: Hành Tinh Cát 2 (Poster)
              </div>
              <h2 style={{ fontSize: "20px", margin: "16px 0 8px" }}>Dune: Hành Tinh Cát 2</h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 8px" }}>T16 · 166 phút · Hành động, Viễn tưởng</p>
              <p style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5" }}>Đạo diễn: Denis Villeneuve · Diễn viên: Timothée Chalamet, Zendaya</p>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                {["Hôm nay (18/10)", "Ngày mai (19/10)", "Chủ nhật (20/10)", "Thứ hai (21/10)"].map((day, i) => (
                  <button key={day} style={{ background: i === 0 ? "#e50914" : "#1a1f33", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "8px", fontWeight: i === 0 ? 700 : 500 }}>
                    {day}
                  </button>
                ))}
              </div>
              <div style={{ background: "#141726", padding: "24px", borderRadius: "12px", border: "1px solid #23283e" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>Rạp: NOVA Sala Thủ Thiêm - Phòng IMAX Laser</h3>
                <div style={{ display: "flex", gap: "16px" }}>
                  {["14:30", "18:30 (IMAX)", "21:15"].map(time => (
                    <button key={time} style={{ background: time.includes("18:30") ? "#e50914" : "#1e2438", border: "1px solid #2f3754", color: "#fff", padding: "12px 24px", borderRadius: "8px", fontWeight: 700, fontSize: "15px" }}>
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 07 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 07 - Trạng thái rỗng khi ngày không có suất chiếu (UC03 Exception)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", display: "flex", flexDirection: "column" }}>
          {renderHeader(true, "Lịch chiếu")}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#1e2438", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Calendar size={36} color="#94a3b8" />
            </div>
            <h2 style={{ fontSize: "24px", margin: "0 0 12px" }}>Chưa có suất chiếu phù hợp cho ngày đã chọn</h2>
            <p style={{ color: "#94a3b8", maxWidth: "500px", lineHeight: "1.6", margin: "0 0 24px" }}>
              Hệ thống rạp NOVA hiện chưa mở bán vé cho khung giờ này hoặc suất chiếu đã kết thúc. Vui lòng chọn ngày chiếu kế tiếp hoặc đổi rạp.
            </p>
            <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "8px", fontWeight: 700, fontSize: "15px" }}>
              Chọn ngày chiếu kế tiếp
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 08 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 08 - Sơ đồ chọn ghế phòng chiếu ban đầu (UC04)" style={{ width: "1440px", height: "960px", background: "#080a12", borderRadius: "12px", border: "1px solid #23283e", display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ padding: "16px 40px", background: "#101322", borderBottom: "1px solid #1f2438", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>Dune: Hành Tinh Cát 2 · 18:30 (IMAX Laser)</h2>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>NOVA Sala Thủ Thiêm · Phòng 1</span>
            </div>
            <button style={{ background: "#1f2438", border: "1px solid #334155", color: "#fff", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
              💡 Gợi ý cụm ghế liền nhau
            </button>
          </div>
          {/* Curved Screen */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "24px 0 16px" }}>
            <div style={{ width: "600px", height: "6px", background: "linear-gradient(90deg, #3b82f6, #e50914)", borderRadius: "3px", boxShadow: "0 4px 20px rgba(229,9,20,0.5)" }} />
            <span style={{ color: "#64748b", fontSize: "12px", marginTop: "8px", letterSpacing: "3px" }}>MÀN HÌNH CHIẾU VÔ CỰC (IMAX)</span>
          </div>
          {/* Seats Grid */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            {rows.map((r, rIdx) => (
              <div key={r} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ width: "20px", fontSize: "12px", color: "#64748b", fontWeight: 700 }}>{r}</span>
                {cols.map(c => {
                  const isVip = ["E", "F", "G"].includes(r);
                  return (
                    <div key={c} style={{
                      width: "32px", height: "30px", background: isVip ? "#2b1c28" : "#1a1f33",
                      border: isVip ? "1px solid #ec4899" : "1px solid #334155", borderRadius: "6px",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#cbd5e1", cursor: "pointer"
                    }}>
                      {c < 10 ? `0${c}` : c}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{ padding: "16px", background: "#101322", borderTop: "1px solid #1f2438", display: "flex", justifyContent: "center", gap: "32px", fontSize: "13px" }}>
            <span><span style={{ display: "inline-block", width: "14px", height: "14px", background: "#1a1f33", border: "1px solid #334155", borderRadius: "3px", verticalAlign: "middle", marginRight: "6px" }} />Ghế thường (110K)</span>
            <span><span style={{ display: "inline-block", width: "14px", height: "14px", background: "#2b1c28", border: "1px solid #ec4899", borderRadius: "3px", verticalAlign: "middle", marginRight: "6px" }} />Ghế VIP (140K)</span>
            <span><span style={{ display: "inline-block", width: "14px", height: "14px", background: "#e50914", borderRadius: "3px", verticalAlign: "middle", marginRight: "6px" }} />Ghế đang chọn</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 09 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 09 - Bảng gợi ý cụm ghế liền nhau thông minh (UC09)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.92)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "440px", background: "#141829", padding: "32px", borderRadius: "16px", border: "2px solid #e50914", boxShadow: "0 24px 64px rgba(229,9,20,0.3)" }}>
            <h2 style={{ fontSize: "20px", color: "#e50914", margin: "0 0 12px" }}>💡 GỢI Ý CỤM GHẾ LIỀN NHAU (UC09)</h2>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" }}>
              Thuật toán thông minh tự động tìm kiếm vị trí xem trung tâm đẹp nhất phòng chiếu IMAX, loại bỏ hiện tượng cô lập ghế đơn:
            </p>
            <div style={{ background: "#1d233a", padding: "16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Cặp ghế VIP Trung tâm:</span>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#22c55e" }}>F08 - F09</div>
              </div>
              <span style={{ background: "#0f2e1b", color: "#22c55e", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>TẦM NHÌN 100%</span>
            </div>
            <button style={{ width: "100%", background: "#e50914", color: "#fff", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
              Áp dụng cặp ghế VIP trung tâm
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 10 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 10 - Sơ đồ ghế Đã chọn ghế VIP & Đồng hồ giữ ghế 05:00 (CR-01)" style={{ width: "1440px", height: "960px", background: "#080a12", borderRadius: "12px", border: "1px solid #23283e", display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ padding: "16px 40px", background: "#101322", borderBottom: "1px solid #1f2438", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>Dune: Hành Tinh Cát 2 · 18:30 (IMAX)</h2>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>NOVA Sala Thủ Thiêm · Phòng 1</span>
            </div>
            <div style={{ background: "#2a1518", border: "1px solid #e50914", padding: "6px 14px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#ff4d58", fontWeight: 700 }}>
              <Clock3 size={16} />
              <span>Thời gian giữ ghế: 05:00</span>
            </div>
          </div>
          {/* Seat Grid with Selected F08, F09 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            {rows.map((r) => (
              <div key={r} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ width: "20px", fontSize: "12px", color: "#64748b", fontWeight: 700 }}>{r}</span>
                {cols.map(c => {
                  const isSelected = r === "F" && (c === 8 || c === 9);
                  return (
                    <div key={c} style={{
                      width: "32px", height: "30px", background: isSelected ? "#e50914" : "#1a1f33",
                      border: isSelected ? "2px solid #fff" : "1px solid #334155", borderRadius: "6px",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#fff", fontWeight: isSelected ? 800 : 400
                    }}>
                      {c < 10 ? `0${c}` : c}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Sticky Bar */}
          <div style={{ padding: "20px 40px", background: "#131728", borderTop: "2px solid #28314e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>Đã chọn 2 ghế: <strong style={{ color: "#fff" }}>F08, F09 (VIP)</strong></span>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>Tạm tính: 280.000đ</div>
            </div>
            <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "14px 32px", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
              Tiếp tục chọn combo bắp nước
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 11 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 11 - Cảnh báo lỗi 409 Ghế vừa có người đặt trùng (BR01)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.92)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "480px", background: "#1c1214", padding: "36px", borderRadius: "16px", border: "2px solid #ef4444", textAlign: "center", boxShadow: "0 24px 64px rgba(239,68,68,0.3)" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#3b1518", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: "22px", color: "#ef4444", margin: "0 0 12px" }}>CẢNH BÁO XUNG ĐỘT (BR01 - HTTP 409)</h2>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
              Ghế <strong>F08</strong> vừa được một khách hàng khác hoàn tất giữ chỗ trước bạn. Vui lòng chọn vị trí ghế trống khác trên sơ đồ!
            </p>
            <button style={{ background: "#ef4444", color: "#fff", border: "none", padding: "12px 28px", borderRadius: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
              Chọn ghế khác
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 12 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 12 - Chọn bắp nước Party Combo 69K & Đổi điểm C'MEMBER (UC05)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", display: "flex", flexDirection: "column" }}>
          {renderHeader(true, "Bắp nước")}
          <div style={{ flex: 1, padding: "36px 80px", display: "flex", gap: "40px" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "22px", margin: "0 0 20px" }}>Combo Bắp Nước Ưu Đãi</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "#141726", padding: "20px", borderRadius: "12px", border: "2px solid #e50914", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ background: "#e50914", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 800 }}>HOT DEAL</span>
                    <h3 style={{ margin: "6px 0 4px", fontSize: "18px" }}>Party Combo 69K</h3>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>1 Bắp ngọt lớn + 2 Nước ngọt Coca-Cola 32oz</p>
                    <span style={{ fontSize: "18px", fontWeight: 800, color: "#22c55e", display: "block", marginTop: "6px" }}>69.000đ <small style={{ textDecoration: "line-through", color: "#64748b" }}>120.000đ</small></span>
                  </div>
                  <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: 700 }}>+ Thêm combo</button>
                </div>
              </div>
            </div>
            <div style={{ width: "380px", background: "#141726", padding: "28px", borderRadius: "12px", border: "1px solid #23283e", height: "fit-content" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>Tóm tắt đơn hàng</h3>
              <div style={{ fontSize: "14px", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "10px", borderBottom: "1px solid #28314e", paddingBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Vé VIP x2 (F08, F09)</span><strong>280.000đ</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Party Combo 69K x1</span><strong>69.000đ</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#fbbf24" }}><span>Đổi 20.000 điểm C'MEMBER</span><strong>-20.000đ</strong></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0", fontSize: "18px", fontWeight: 800 }}>
                <span>Tổng thanh toán:</span>
                <span style={{ color: "#22c55e" }}>329.000đ</span>
              </div>
              <button style={{ width: "100%", background: "#e50914", color: "#fff", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 700, fontSize: "15px" }}>
                Tiến hành thanh toán
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 13 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 13 - Xác nhận đơn hàng & Chọn cổng thanh toán (UC06)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", display: "flex", flexDirection: "column" }}>
          {renderHeader(true, "Lịch chiếu")}
          <div style={{ flex: 1, padding: "40px 80px", display: "flex", gap: "40px" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "22px", margin: "0 0 20px" }}>Chọn cổng thanh toán</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {["Thanh toán giả lập Sandbox (Test Đồ Án)", "Cổng VietQR (Chuyển khoản tức thì)", "Ví điện tử MoMo", "Thẻ thanh toán Quốc tế Visa/Mastercard"].map((m, i) => (
                  <label key={m} style={{ display: "flex", alignItems: "center", gap: "16px", background: i === 0 ? "#1c2238" : "#141726", border: i === 0 ? "2px solid #e50914" : "1px solid #23283e", padding: "18px", borderRadius: "10px", cursor: "pointer" }}>
                    <input type="radio" name="payment" defaultChecked={i === 0} />
                    <span style={{ fontSize: "16px", fontWeight: i === 0 ? 700 : 500 }}>{m}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ width: "380px", background: "#141726", padding: "28px", borderRadius: "12px", border: "1px solid #23283e" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>Tổng tiền thanh toán</h3>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "#22c55e", marginBottom: "20px" }}>329.000đ</div>
              <button style={{ width: "100%", background: "#e50914", color: "#fff", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 700, fontSize: "15px" }}>
                Mô phỏng thanh toán thành công
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 14 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 14 - Giao diện Cổng thanh toán mô phỏng Payment Sandbox (UC06)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.92)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "500px", background: "#131626", padding: "36px", borderRadius: "16px", border: "2px solid #3b82f6", boxShadow: "0 24px 64px rgba(59,130,246,0.3)" }}>
            <h2 style={{ fontSize: "20px", color: "#60a5fa", margin: "0 0 12px" }}>💳 CỔNG PAYMENT SANDBOX GIẢ LẬP</h2>
            <p style={{ color: "#cbd5e1", fontSize: "14px", margin: "0 0 20px" }}>Số tiền giao dịch: <strong style={{ color: "#22c55e", fontSize: "18px" }}>329.000đ</strong> · Mã đơn: <code>NOVA-7a8b9c...</code></p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 700 }}>Hủy giao dịch</button>
              <button style={{ flex: 1, background: "#22c55e", color: "#000", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 800 }}>Xác nhận Thành công</button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 15 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 15 - Thông báo Hết hạn 5 phút giữ ghế & Tự động giải phóng ghế (BR04)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.92)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "480px", background: "#1b1713", padding: "36px", borderRadius: "16px", border: "2px solid #f59e0b", textAlign: "center", boxShadow: "0 24px 64px rgba(245,158,11,0.3)" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#382915", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Clock3 size={32} color="#fbbf24" />
            </div>
            <h2 style={{ fontSize: "22px", color: "#fbbf24", margin: "0 0 12px" }}>HẾT HẠN GIỮ GHẾ 5 PHÚT (BR04)</h2>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
              Thời gian giữ chỗ tạm thời (300 giây) đã kết thúc. Ghế đã được hệ thống tự động giải phóng để khách hàng khác có thể đặt.
            </p>
            <button style={{ background: "#f59e0b", color: "#000", border: "none", padding: "12px 28px", borderRadius: "8px", fontWeight: 800, fontSize: "15px" }}>
              Đặt lại từ đầu
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 16 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 16 - Thông báo Khách hàng hủy giao dịch & Trả lại ghế trống" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.92)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "480px", background: "#141724", padding: "36px", borderRadius: "16px", border: "1px solid #334155", textAlign: "center" }}>
            <h2 style={{ fontSize: "22px", margin: "0 0 12px" }}>ĐÃ HỦY ĐƠN HÀNG THÀNH CÔNG</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6", margin: "0 0 24px" }}>
              Toàn bộ ghế F08, F09 đã được giải phóng an toàn trở lại phòng chiếu.
            </p>
            <button style={{ background: "#222738", color: "#fff", border: "1px solid #475569", padding: "12px 28px", borderRadius: "8px", fontWeight: 600 }}>
              Quay về chọn lại ghế
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 17 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 17 - Vé điện tử QR Code, Xác nhận Email & Tải lịch .ics (UC07, UC08, UC10)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", display: "flex", flexDirection: "column" }}>
          {renderHeader(true, "Phim")}
          <div style={{ flex: 1, padding: "40px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: "540px", background: "#131728", padding: "36px", borderRadius: "16px", border: "1px solid #2b3552", textAlign: "center" }}>
              <span style={{ background: "#0f2e1b", color: "#22c55e", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 800 }}>✓ ĐẶT VÉ THÀNH CÔNG</span>
              <h2 style={{ fontSize: "24px", margin: "12px 0 6px" }}>Dune: Hành Tinh Cát 2</h2>
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 20px" }}>18:30 · Hôm nay · NOVA Sala (Phòng 1 IMAX)</p>
              <div style={{ width: "180px", height: "180px", background: "#fff", margin: "0 auto 20px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 900 }}>
                MÃ QR VÉ 64-BYTE
              </div>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: "0 0 20px" }}>Ghế: <strong>F08, F09 (VIP)</strong> · Mã đơn: <code>NOVA-7a8b9c2d1e...</code></p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button style={{ background: "#1f253b", border: "1px solid #3b4566", color: "#fff", padding: "10px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>Tải vé PDF</button>
                <button style={{ background: "#1f253b", border: "1px solid #3b4566", color: "#fff", padding: "10px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>Thêm lịch .ics</button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 18 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 18 - Cổng soát vé QR dành cho Nhân viên rạp (UC14)" style={{ width: "1440px", height: "960px", background: "#090b14", borderRadius: "12px", border: "1px solid #23283e", padding: "40px 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", borderBottom: "1px solid #1f2438", paddingBottom: "20px" }}>
            <div>
              <span style={{ color: "#3b82f6", fontWeight: 800, fontSize: "13px" }}>🛡️ NOVA ADMISSION DESK</span>
              <h1 style={{ fontSize: "28px", margin: "4px 0" }}>Đúng suất. Đúng vé. Một lần vào rạp.</h1>
            </div>
            <span style={{ background: "#1c2438", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", color: "#60a5fa" }}>Nhân viên: staff@nova.vn</span>
          </div>
          <div style={{ maxWidth: "700px", margin: "0 auto", background: "#131626", padding: "32px", borderRadius: "12px", border: "1px solid #23283e" }}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Cụm rạp</label>
                <select style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "10px", borderRadius: "6px", color: "#fff" }}>
                  <option>NOVA Sala Thủ Thiêm</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Suất chiếu đang soát</label>
                <select style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "10px", borderRadius: "6px", color: "#fff" }}>
                  <option>Dune 2 · 18:30 (Phòng 1)</option>
                </select>
              </div>
            </div>
            <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Mã đọc từ QR vé (Chuỗi HMAC-SHA256)</label>
            <input readOnly value="a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "12px", borderRadius: "6px", color: "#fff", marginBottom: "16px", boxSizing: "border-box" }} />
            <button style={{ width: "100%", background: "#22c55e", color: "#000", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 800, fontSize: "16px" }}>
              Xác thực & Soát vé (Hợp lệ)
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 19 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 19 - Kết quả Soát vé Hợp lệ & Xác nhận vào rạp (Màu Xanh)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.95)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "540px", background: "#0e2015", padding: "40px", borderRadius: "16px", border: "2px solid #22c55e", boxShadow: "0 24px 64px rgba(34,197,94,0.3)" }}>
            <span style={{ background: "#22c55e", color: "#000", fontWeight: 800, padding: "4px 14px", borderRadius: "20px", fontSize: "13px" }}>✓ VÉ HỢP LỆ (VERIFIED)</span>
            <h2 style={{ fontSize: "24px", margin: "16px 0 8px" }}>Dune: Hành Tinh Cát 2</h2>
            <p style={{ color: "#cbd5e1", fontSize: "15px", margin: "0 0 16px" }}>18:30 Hôm nay · Phòng 1 (IMAX Laser)</p>
            <div style={{ background: "#163321", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
              <div>Ghế: <strong style={{ color: "#fff", fontSize: "18px" }}>F08, F09 (VIP)</strong></div>
              <div style={{ color: "#86efac", fontSize: "13px", marginTop: "4px" }}>Khách hàng: Nguyễn Văn A (Hội viên GOLD)</div>
            </div>
            <button style={{ width: "100%", background: "#22c55e", color: "#000", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 800 }}>
              Quét lại vé này lần 2 (Test chặn trùng)
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 20 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 20 - Cảnh báo Vé sai suất chiếu hoặc sai ngày chiếu (Màu Vàng)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.95)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "540px", background: "#241e0d", padding: "40px", borderRadius: "16px", border: "2px solid #eab308", boxShadow: "0 24px 64px rgba(234,179,8,0.3)" }}>
            <span style={{ background: "#eab308", color: "#000", fontWeight: 800, padding: "4px 14px", borderRadius: "20px", fontSize: "13px" }}>⚠️ CẢNH BÁO SAI SUẤT (TICKET_SHOWTIME_MISMATCH)</span>
            <h2 style={{ fontSize: "20px", color: "#fde047", margin: "16px 0 8px" }}>Suất chiếu thực tế: 21:00 (Khác suất đang soát 18:30)</h2>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" }}>
              Vé của khách hoàn toàn hợp lệ nhưng khách đi sớm hoặc nhầm phòng. Hãy hướng dẫn khách đợi đến 20:45.
            </p>
            <button style={{ width: "100%", background: "#eab308", color: "#000", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 800 }}>
              Quét mã vé tiếp theo
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 21 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 21 - Cảnh báo chặn Vé đã sử dụng hoặc Không tìm thấy vé (Màu Đỏ)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.95)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "540px", background: "#2a1012", padding: "40px", borderRadius: "16px", border: "2px solid #ef4444", boxShadow: "0 24px 64px rgba(239,68,68,0.4)" }}>
            <span style={{ background: "#ef4444", color: "#fff", fontWeight: 800, padding: "4px 14px", borderRadius: "20px", fontSize: "13px" }}>⛔ TỪ CHỐI VÀO RẠP: VÉ ĐÃ SỬ DỤNG</span>
            <h2 style={{ fontSize: "20px", color: "#fca5a5", margin: "16px 0 8px" }}>Mã lỗi: TICKET_ALREADY_USED (HTTP 409)</h2>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" }}>
              Vé này đã được quét cho vào rạp lúc 18:14. Chặn tuyệt đối vào rạp lần 2 để ngăn chặn hành vi gian lận sao chép vé!
            </p>
            <button style={{ width: "100%", background: "#ef4444", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 800 }}>
              Quét mã vé tiếp theo
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 22 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 22 - Quản trị danh mục Phim (UC11 - Admin)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", display: "flex" }}>
          {/* Admin Sidebar */}
          <div style={{ width: "260px", background: "#111422", borderRight: "1px solid #1f2438", padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#e50914", marginBottom: "32px" }}>NOVA ADMIN</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {["Quản lý Phim", "Cấu hình Phòng chiếu", "Lập lịch chiếu phim", "Báo cáo doanh thu"].map((tab, idx) => (
                  <div key={tab} style={{ padding: "10px 14px", borderRadius: "6px", background: idx === 0 ? "#e50914" : "transparent", color: idx === 0 ? "#fff" : "#94a3b8", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                    {tab}
                  </div>
                ))}
              </div>
            </div>
            <button style={{ background: "#1f2438", border: "none", color: "#94a3b8", padding: "10px", borderRadius: "6px", fontSize: "13px" }}>Đăng xuất</button>
          </div>
          {/* Admin Content */}
          <div style={{ flex: 1, padding: "32px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h1 style={{ fontSize: "24px", margin: 0 }}>Danh mục phim rạp</h1>
              <button style={{ background: "#e50914", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", fontWeight: 700 }}>+ Thêm phim mới</button>
            </div>
            <div style={{ background: "#131626", borderRadius: "8px", border: "1px solid #23283e", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "14px 20px", background: "#1c2136", fontWeight: 700, fontSize: "13px", color: "#94a3b8" }}>
                <span>TÊN PHIM</span><span>THỜI LƯỢNG</span><span>TRẠNG THÁI</span><span>HÀNH ĐỘNG</span>
              </div>
              {movies.map(m => (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "16px 20px", borderTop: "1px solid #1f2438", fontSize: "14px", alignItems: "center" }}>
                  <strong>{m.title}</strong>
                  <span>{m.duration}</span>
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>ĐANG CHIẾU</span>
                  <button style={{ background: "#1f2438", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", width: "fit-content" }}>Chỉnh sửa</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 23 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 23 - Thiết lập Phòng chiếu & Ma trận sơ đồ ghế (UC12 - Admin)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", display: "flex" }}>
          <div style={{ width: "260px", background: "#111422", borderRight: "1px solid #1f2438", padding: "24px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: "18px", color: "#e50914", marginBottom: "32px" }}>NOVA ADMIN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {["Quản lý Phim", "Cấu hình Phòng chiếu", "Lập lịch chiếu phim", "Báo cáo doanh thu"].map((tab, idx) => (
                <div key={tab} style={{ padding: "10px 14px", borderRadius: "6px", background: idx === 1 ? "#e50914" : "transparent", color: idx === 1 ? "#fff" : "#94a3b8", fontWeight: 600, fontSize: "14px" }}>
                  {tab}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, padding: "32px 40px" }}>
            <h1 style={{ fontSize: "24px", margin: "0 0 20px" }}>Cấu hình Phòng 1 (IMAX Laser) - Rạp Sala</h1>
            <div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
              <div style={{ background: "#131626", padding: "16px 24px", borderRadius: "8px", border: "1px solid #23283e" }}>Số hàng ghế: <strong>10 (A - K)</strong></div>
              <div style={{ background: "#131626", padding: "16px 24px", borderRadius: "8px", border: "1px solid #23283e" }}>Số ghế mỗi hàng: <strong>14 ghế</strong></div>
              <div style={{ background: "#131626", padding: "16px 24px", borderRadius: "8px", border: "1px solid #23283e" }}>Tổng sức chứa: <strong>140 ghế</strong></div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 24 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 24 - Lập lịch chiếu phim & Kiểm tra giờ trống (UC13 - Admin)" style={{ width: "1440px", height: "960px", background: "#0b0d17", borderRadius: "12px", border: "1px solid #23283e", display: "flex" }}>
          <div style={{ width: "260px", background: "#111422", borderRight: "1px solid #1f2438", padding: "24px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: "18px", color: "#e50914", marginBottom: "32px" }}>NOVA ADMIN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {["Quản lý Phim", "Cấu hình Phòng chiếu", "Lập lịch chiếu phim", "Báo cáo doanh thu"].map((tab, idx) => (
                <div key={tab} style={{ padding: "10px 14px", borderRadius: "6px", background: idx === 2 ? "#e50914" : "transparent", color: idx === 2 ? "#fff" : "#94a3b8", fontWeight: 600, fontSize: "14px" }}>
                  {tab}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, padding: "32px 40px" }}>
            <h1 style={{ fontSize: "24px", margin: "0 0 20px" }}>Lập lịch chiếu theo phòng</h1>
            <div style={{ background: "#131626", padding: "24px", borderRadius: "10px", border: "1px solid #23283e", maxWidth: "600px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Chọn phim</label>
                <select style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "10px", borderRadius: "6px", color: "#fff" }}><option>Dune: Hành Tinh Cát 2 (166 phút)</option></select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px" }}>Khung giờ bắt đầu</label>
                <input readOnly value="20:50" style={{ width: "100%", background: "#1c2136", border: "1px solid #2e3552", padding: "10px", borderRadius: "6px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <button style={{ width: "100%", background: "#e50914", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", fontWeight: 700 }}>
                Lưu suất chiếu mới (Kiểm tra BR03)
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TRANG 25 */}
        {/* ========================================================================= */}
        <section data-figma-frame-name="Trang 25 - Cảnh báo đỏ Xung đột lịch phòng dưới 15 phút dọn rạp (BR03 - Admin)" style={{ width: "1440px", height: "960px", background: "rgba(6,8,14,0.95)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", border: "1px solid #23283e" }}>
          <div style={{ width: "520px", background: "#1c1012", padding: "36px", borderRadius: "16px", border: "2px solid #ef4444", boxShadow: "0 24px 64px rgba(239,68,68,0.4)" }}>
            <h2 style={{ color: "#ef4444", margin: "0 0 12px", fontSize: "20px" }}>⚠️ XUNG ĐỘT THỜI GIAN DỌN RẠP (BR03)</h2>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" }}>
              Suất chiếu trước kết thúc lúc <strong>20:45</strong> trong khi suất mới chọn bắt đầu lúc <strong>20:50</strong> (chỉ cách 5 phút).<br />
              Quy định nghiệp vụ BR03 yêu cầu tối thiểu <strong>15 phút dọn rạp</strong> giữa 2 suất liên tiếp.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button style={{ background: "#222738", color: "#cbd5e1", border: "1px solid #444", padding: "10px 18px", borderRadius: "6px", fontWeight: 600 }}>Hủy bỏ</button>
              <button style={{ background: "#ef4444", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "6px", fontWeight: 700 }}>Điều chỉnh sang 21:00 (+15 phút)</button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
