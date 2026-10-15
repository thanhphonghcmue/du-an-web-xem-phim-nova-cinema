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
