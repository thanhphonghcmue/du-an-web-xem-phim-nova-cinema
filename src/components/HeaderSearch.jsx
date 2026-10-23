/**
 * ==============================================================================
 * TỆP TIN: src/components/HeaderSearch.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Thanh Tìm Kiếm Trực Tiếp Trên Header (Header Live Search Dropdown).
 *   - Tìm kiếm nhanh phim theo tiêu đề tiếng Việt, tên gốc tiếng Anh hoặc đạo diễn.
 *   - Tìm kiếm cụm rạp theo tên hoặc tỉnh thành (TP.HCM, Hà Nội, Đà Nẵng).
 *   - Hỗ trợ gõ tiếng Việt không dấu (bỏ dấu NFD: ví dụ gõ "quat mo" tìm ra "Quật Mộ Trùng Ma").
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Người dùng gõ từ khóa vào ô tìm kiếm trên thanh điều hướng.
 *   2. Thuật toán `normalize` lọc kết quả khớp ngay lập tức.
 *   3. Người dùng click vào một kết quả -> chuyển thẳng tới chi tiết phim hoặc cụm rạp đã chọn.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng muốn tìm kiếm nhanh nội dung yêu thích.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm tính năng lưu "Lịch sử tìm kiếm gần đây" trong LocalStorage.
 *   - Gợi ý từ khóa tìm kiếm xu hướng (Trending keywords) khi ô tìm kiếm được focus.
 * ==============================================================================
 */

import { useState } from "react";
import { Film, MapPin, Search, X } from "lucide-react";
import { useI18n } from "../i18n.js";
export default function HeaderSearch({
  onMovie,
  onCinema,
  onExpand,
  movies,
  cinemas,
}) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false);
  const normalize = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  const match = (s) => normalize(s).includes(normalize(query));
  const films = movies
      .filter((m) => match(`${m.title} ${m.original} ${m.director}`))
      .slice(0, 3),
    locations = cinemas.filter((c) => match(`${c.name} ${c.city}`)).slice(0, 2);
  return (
    <div
      className="header-search"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label>
        <Search size={17} />
        <input
          aria-label={t("Tìm phim, rạp...")}
          placeholder={t("Tìm phim, rạp...")}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <kbd>⌘K</kbd>
      </label>
      <button
        className="compact-search"
        onClick={onExpand}
        aria-label={t("Tìm phim, rạp...")}
      >
        <Search size={20} />
      </button>
      {open && (
        <div className="search-dropdown">
          <div className="dropdown-label">
            {language === "en" ? "YOUR NEXT DESTINATION" : "ĐIỂM HẸN CỦA BẠN"}
            <button aria-label={t("Đóng")} onClick={() => setOpen(false)}>
              <X size={13} />
            </button>
          </div>
          {films.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onMovie(m);
                setOpen(false);
                setQuery("");
              }}
            >
              <Film size={17} />
              <span>
                <strong>{language === "en" ? m.original : m.title}</strong>
                <small>
                  {m.age} · {m.duration} {language === "en" ? "min" : "phút"}
                </small>
              </span>
            </button>
          ))}
          {locations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onCinema(c);
                setOpen(false);
                setQuery("");
              }}
            >
              <MapPin size={17} />
              <span>
                <strong>{c.name}</strong>
                <small>{c.city}</small>
              </span>
            </button>
          ))}
          {!films.length && !locations.length && (
            <p>
              {language === "en"
                ? "No matches. Try another film or city."
                : "Không có kết quả. Thử tên phim hoặc thành phố khác."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
