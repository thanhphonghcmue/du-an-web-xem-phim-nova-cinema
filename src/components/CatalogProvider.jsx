/**
 * ==============================================================================
 * TỆP TIN: src/components/CatalogProvider.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Quản lý Dữ liệu Danh mục Điện ảnh Toàn cục (Global Cinema Catalog Provider).
 *   - Tải song song 5 tập dữ liệu từ Backend API:
 *     1. Danh sách phim (`/movies`)
 *     2. Danh sách cụm rạp (`/cinemas`)
 *     3. Lịch chiếu phim (`/showtimes`)
 *     4. Phòng chiếu (`/rooms`)
 *     5. Combo ẩm thực bắp nước (`/combos`)
 *   - Ghép nối dữ liệu Backend với Artwork hình ảnh độ phân giải cao (`src/data.js`).
 *   - Tự động fallback sang danh mục tĩnh nếu backend chưa sẵn sàng, đảm bảo UI luôn hiển thị đẹp.
 *   - Cung cấp các hàm tìm kiếm tiện ích: `getDates`, `getShowtimes`, `contextFor`, `reload`.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Khởi tạo với danh mục ban đầu (`getInitialCatalog`).
 *   2. Gọi `load()` thông qua `apiGetMovies()`, `apiGetCinemas()`, ...
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

import { useCallback, useEffect, useState } from "react";
import { CatalogContext, dayKey, timeLabel } from "../catalog.js";
import discovery from "../../content/cinema.json";
import { movies as artwork, cinemas as defaultCinemas } from "../data.js";
import {
  read,
  apiGetMovies,
  apiGetCinemas,
  apiGetShowtimes,
  apiList,
} from "../api/client.js";

function getInitialCatalog() {
  return {
    movies: artwork.map((m) => ({
      ...m,
      artId: m.id,
      status: m.status || "now",
      durationMinutes: m.duration,
      ageRating: m.age,
    })),
    cinemas: defaultCinemas.map((c) => ({
      ...c,
      formats: c.formats || "IMAX Laser · 2D Laser",
      movies: artwork.map((m) => m.id),
    })),
    rooms: [],
    showtimes: [],
    combos: discovery.menu.map((item) => ({
      ...item,
      id: item.key,
      isActive: true,
    })),
    isLive: false,
  };
}

export default function CatalogProvider({ children }) {
  const [data, setData] = useState(getInitialCatalog);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const runtime = await read("/runtime");
      const [films, locations, showtimes, rooms, combos] =
        runtime.mode === "backend"
          ? await read("/showtimes/programme").then((data) => [
              data.movies,
              data.cinemas,
              data.showtimes,
              data.rooms,
              data.combos,
            ])
          : await Promise.all([
              apiGetMovies(),
              apiGetCinemas(),
              apiGetShowtimes(),
              apiList("/rooms"),
              apiList("/combos"),
            ]);
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
        ].join(" · "),
        movies: [
          ...new Set(
            showtimes
              .filter(
                (s) => rooms.find((r) => r.id === s.roomId)?.cinemaId === c.id,
              )
              .map((s) => s.movieId),
          ),
        ],
      }));
      setData({
        isLive: true,
        runtimeMode: runtime.mode,
        movies,
        cinemas,
        rooms,
        showtimes,
        combos: combos.filter((c) => c.isActive),
      });
      setError("");
    } catch (cause) {
      setData((prev) => ({
        ...(prev || getInitialCatalog()),
        isLive: false,
        showtimes: [],
      }));
      setError(cause.message || "Đặt vé đang tạm gián đoạn.");
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  if (!data)
    return (
      <main className="initial-screen">
        <div>
          <h1>NOVA CINEMA</h1>
          <p role={error ? "alert" : "status"}>
            {error || "Đang tải phim và lịch chiếu…"}
          </p>
          {data.runtimeMode === "standalone" && (
            <div className="standalone-mode-notice" role="status">
              DEMO ĐỘC LẬP · Dữ liệu mẫu trong bộ nhớ tạm, không phải đơn/vé từ
              máy chủ NestJS. Khởi động lại có thể mất dữ liệu.
            </div>
          )}
          {error && (
            <button className="button button-primary" onClick={load}>
              Thử kết nối lại
            </button>
          )}
        </div>
      </main>
    );
  const getDates = (_language, cinemaId, movieId) =>
    [
      ...new Set(
        data.showtimes
          .filter(
            (s) =>
              new Date(s.startTime) > new Date() &&
              (!movieId || s.movieId === movieId) &&
              (!cinemaId ||
                data.rooms.find((r) => r.id === s.roomId)?.cinemaId ===
                  cinemaId),
          )
          .map((s) => dayKey(s.startTime)),
      ),
    ]
      .sort()
      .map((id) => ({
        id,
        label: new Date(id + "T12:00:00+07:00").toLocaleDateString("vi-VN", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          timeZone: "Asia/Ho_Chi_Minh",
        }),
      }));
  const getShowtimes = (cinemaId, movieId, date) =>
    data.showtimes
      .filter(
        (s) =>
          s.movieId === movieId &&
          data.rooms.find((r) => r.id === s.roomId)?.cinemaId === cinemaId &&
          dayKey(s.startTime) === date &&
          new Date(s.startTime) > new Date(),
      )
      .map((s) => ({
        ...s,
        label: `${timeLabel(s.startTime)} · ${data.rooms.find((r) => r.id === s.roomId)?.name || ""}`,
        displayTime: timeLabel(s.startTime),
        roomName: data.rooms.find((r) => r.id === s.roomId)?.name || "",
        roomType: data.rooms.find((r) => r.id === s.roomId)?.roomType || "",
      }));
  const contextFor = (showtimeId) => {
    const show = data.showtimes.find((s) => s.id === showtimeId);
    if (!show) return null;
    const movie = data.movies.find((m) => m.id === show.movieId);
    const cinema = data.cinemas.find(
      (c) => c.id === data.rooms.find((r) => r.id === show.roomId)?.cinemaId,
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
      {data.runtimeMode === "standalone" && (
        <div className="standalone-mode-notice" role="status">
          DEMO ĐỘC LẬP · Dữ liệu mẫu trong bộ nhớ tạm, không phải đơn/vé từ máy
          chủ NestJS. Khởi động lại có thể mất dữ liệu.
        </div>
      )}
      {error && (
        <div className="catalog-connection-notice">
          <p role="alert">
            Đặt vé đang tạm gián đoạn. Bạn vẫn có thể khám phá phim và thực đơn.{" "}
            <span>{error}</span>
          </p>
          <button onClick={load}>Thử kết nối lại</button>
        </div>
      )}
      {children}
    </CatalogContext.Provider>
  );
}
