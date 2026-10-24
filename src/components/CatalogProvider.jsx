/**
 * ==============================================================================
 * TỆP TIN: src/components/CatalogProvider.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Quản lý Dữ liệu Danh mục Điện ảnh Toàn cục (Global Cinema Catalog Provider).
 *   - Tải programme snapshot từ `/showtimes/programme`: phim, rạp, lịch, phòng và combo.
 *   - Ghép nối dữ liệu Backend với Artwork hình ảnh độ phân giải cao (`src/data.js`).
 *   - Lỗi kết nối xóa danh mục khả dụng và báo lỗi rõ ràng; không sinh dữ liệu thay thế.
 *   - Cung cấp các hàm tìm kiếm tiện ích: `getDates`, `getShowtimes`, `contextFor`, `reload`.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Khởi tạo danh mục rỗng (`getInitialCatalog`).
 *   2. Gọi `load()` qua BFF cùng origin; singleflight tránh tải trùng.
 *   3. Chuẩn hóa tiêu đề và kết nối poster/trailer cục bộ.
 *   4. Phân phối dữ liệu vào `CatalogContext.Provider` cho toàn bộ ứng dụng.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Toàn bộ các component: Tìm kiếm, Đặt vé nhanh, Chọn ghế, Chi tiết phim, Lịch chiếu.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Bổ sung bộ lọc phim theo độ tuổi (P, K, T13, T16, T18) hoặc thể loại (Hành động, Tình cảm).
 *   - Tự động polling làm mới lịch chiếu mỗi 60 giây khi rạp cập nhật suất chiếu đột xuất.
 * ==============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n.js";
import { createCatalogIndex } from "../catalogIndex.js";
import { CatalogContext, dayKey, timeLabel } from "../catalog.js";
import { movies as artwork } from "../data.js";
import { read } from "../api/client.js";

function getInitialCatalog() {
  return {
    movies: [],
    cinemas: [],
    rooms: [],
    showtimes: [],
    combos: [],
    isLive: false,
  };
}

export default function CatalogProvider({ children }) {
  const { t } = useI18n();
  const [data, setData] = useState(getInitialCatalog);
  const [error, setError] = useState("");
  const index = useMemo(() => createCatalogIndex(data), [data]);
  const inFlight = useRef(null);
  const load = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    inFlight.current = (async () => {
      try {
        const {
          movies: films,
          cinemas: locations,
          showtimes,
          rooms,
          combos,
        } = await read("/showtimes/programme");
        const normalize = (s) =>
          s.toLocaleLowerCase("vi").replace(/[^\p{L}\p{N}]/gu, "");
        const movies = films
          .filter((m) => m.status !== "ENDED")
          .map((m) => {
            const art = artwork.find(
              (a) =>
                normalize(a.title) === normalize(m.title) ||
                normalize(m.title).includes(normalize(a.short)),
            );
            return {
              ...art,
              ...m,
              artId: art?.id,
              id: m.id,
              short: art?.short || m.title,
              original: art?.original || m.title,
              part: art?.part || "",
              duration: m.durationMinutes,
              age: m.ageRating,
              poster: m.posterUrl || art?.poster,
              status:
                m.status === "COMING_SOON"
                  ? "soon"
                  : art?.status === "special"
                    ? "special"
                    : "now",
              rating: art?.rating || "—",
              format: art?.format || "2D",
              trailer: m.trailerUrl
                ? new URL(m.trailerUrl).searchParams.get("v") || art?.trailer
                : art?.trailer,
              year: new Date(m.releaseDate).getUTCFullYear(),
            };
          });
        const cinemas = locations.map((c) => ({
          ...c,
          formats: [
            ...new Set(
              rooms.filter((r) => r.cinemaId === c.id).map((r) => r.roomType),
            ),
          ]
            .map(
              (type) =>
                ({
                  STANDARD_2D: "2D",
                  IMAX_70MM_LASER: "IMAX Laser",
                  DOLBY_ATMOS: "Dolby Atmos",
                })[type] || type,
            )
            .join(" · "),
          movies: [
            ...new Set(
              showtimes
                .filter(
                  (s) =>
                    rooms.find((r) => r.id === s.roomId)?.cinemaId === c.id,
                )
                .map((s) => s.movieId),
            ),
          ],
        }));
        setData({
          isLive: true,
          movies,
          cinemas,
          rooms,
          showtimes,
          combos: combos.filter((c) => c.isActive),
        });
        setError("");
      } catch (cause) {
        setData(getInitialCatalog());
        setError(cause.message || "Đặt vé đang tạm gián đoạn.");
      }
    })().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  const getDates = (_language, cinemaId, movieId) =>
    [
      ...new Set(
        index
          .select(cinemaId, movieId)
          .filter(
            (s) =>
              new Date(s.startTime) > new Date() &&
              (!movieId || s.movieId === movieId),
          )
          .map((s) => index.days.get(s.id)),
      ),
    ]
      .sort()
      .map((id) => ({
        id,
        label: new Date(id + "T12:00:00+07:00").toLocaleDateString(
          _language === "en" ? "en-GB" : "vi-VN",
          {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          },
        ),
      }));
  const getShowtimes = (cinemaId, movieId, date) =>
    index
      .select(cinemaId, movieId)
      .filter(
        (s) =>
          s.movieId === movieId &&
          index.rooms.get(s.roomId)?.cinemaId === cinemaId &&
          index.days.get(s.id) === date &&
          new Date(s.startTime) > new Date(),
      )
      .map((s) => ({
        ...s,
        label: `${timeLabel(s.startTime)} · ${index.rooms.get(s.roomId)?.name || ""}`,
        displayTime: timeLabel(s.startTime),
        roomName: index.rooms.get(s.roomId)?.name || "",
        roomType: index.rooms.get(s.roomId)?.roomType || "",
      }));
  const contextFor = (showtimeId) => {
    const show = index.shows.get(showtimeId);
    if (!show) return null;
    const movie = data.movies.find((m) => m.id === show.movieId);
    const cinema = data.cinemas.find(
      (c) => c.id === index.rooms.get(show.roomId)?.cinemaId,
    );
    if (!movie || !cinema) return null;
    const id = dayKey(show.startTime);
    return {
      showtimeId,
      movie,
      cinema,
      date: { id, label: id },
      time: { ...show, label: timeLabel(show.startTime) },
    };
  };
  return (
    <CatalogContext.Provider
      value={{
        ...data,
        error,
        getDates,
        getShowtimes,
        contextFor,
        reload: load,
      }}
    >
      {error && (
        <div className="catalog-connection-notice">
          <p role="alert">
            {t("Không thể kết nối đến máy chủ Backend. Hãy thử kết nối lại.")}{" "}
            <span>{error}</span>
          </p>
          <button onClick={load}>{t("Thử kết nối lại")}</button>
        </div>
      )}
      {children}
    </CatalogContext.Provider>
  );
}
