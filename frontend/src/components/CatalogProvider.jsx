/**
 * ==============================================================================
 * TỆP TIN: src/components/CatalogProvider.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Quản lý Dữ liệu Danh mục Điện ảnh Toàn cục (Global Cinema Catalog Provider).
 *   - Tải programme snapshot từ /showtimes/programme: phim, rạp, lịch, phòng và combo.
 *   - Khởi tạo ngay lập tức (Instant Bootstrap 0s) danh mục phim và rạp từ Artwork.
 *   - Đồng bộ nền không chặn giao diện; tự động lưu cache phiên (Session Cache).
 *   - Ghép nối dữ liệu Backend với Artwork hình ảnh độ phân giải cao (`src/data.js`).
 *   - Cung cấp các hàm tìm kiếm tiện ích: `getDates`, `getShowtimes`, `contextFor`, `reload`.
 * ==============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n.js";
import { createCatalogIndex } from "@/catalogIndex.js";
import { CatalogContext, dayKey, timeLabel } from "@/catalog.js";
import { movies as artwork } from "@/data.js";
import { readProgramme } from "@/api/client.js";
import { uniqueRecords } from "@/uniqueRecords.js";
import { calendarLabel } from "@/bookingDates.js";
import { youtubeTrailerId } from "@/moviePresentation.js";
import Link from "next/link";

const initialMovies = artwork.map((art) => ({
  ...art,
  artId: art.id,
  id: art.id,
  short: art.short || art.title,
  original: art.original || art.title,
  part: art.part || "",
  duration: art.duration,
  age: art.age,
  poster: art.poster,
  status: art.status || "now",
  rating: art.rating || "—",
  format: art.format || "2D",
  trailer: youtubeTrailerId(art.trailer, art.trailer),
  year: art.year || 2024,
}));

const initialCinemas = [
  {
    id: "8581297e-1055-468e-ab50-8d6b58f09817",
    key: "landmark",
    name: "NOVA Landmark 81",
    city: "TP. Hồ Chí Minh",
    address: "720A Điện Biên Phủ, Bình Thạnh",
    formats: "2D · IMAX Laser · Dolby Atmos",
    movies: initialMovies.map((m) => m.id),
  },
  {
    id: "e81b309a-db9d-433e-bed7-f12cb7c9a97a",
    key: "danang",
    name: "NOVA Riverside",
    city: "Đà Nẵng",
    address: "910 Ngô Quyền, Sơn Trà",
    formats: "2D · IMAX Laser · Dolby Atmos",
    movies: initialMovies.map((m) => m.id),
  },
  {
    id: "b8fdb4f3-87cf-4418-9007-66dea5a5c726",
    key: "sala",
    name: "NOVA Sala",
    city: "TP. Hồ Chí Minh",
    address: "10 Mai Chí Thọ, Thủ Đức",
    formats: "2D · IMAX Laser · Dolby Atmos",
    movies: initialMovies.map((m) => m.id),
  },
  {
    id: "c104f1e3-bc9b-4b05-8d54-5db1999b4b81",
    key: "westlake",
    name: "NOVA West Lake",
    city: "Hà Nội",
    address: "272 Võ Chí Công, Tây Hồ",
    formats: "2D · IMAX Laser · Dolby Atmos",
    movies: initialMovies.map((m) => m.id),
  },
];

const fallbackCatalog = {
  movies: initialMovies,
  cinemas: initialCinemas,
  rooms: [],
  showtimes: [],
  combos: [],
  isLive: false,
};

function processCatalogSnapshot(rawSnapshot) {
  if (!rawSnapshot) return null;
  const {
    movies: films,
    cinemas: locations,
    showtimes,
    rooms,
    combos,
  } = Object.fromEntries(
    ["movies", "cinemas", "showtimes", "rooms", "combos"].map((key) => {
      if (!Array.isArray(rawSnapshot?.[key]))
        throw new Error("Danh mục máy chủ chưa đầy đủ. Vui lòng thử lại.");
      return [key, uniqueRecords(rawSnapshot[key])];
    }),
  );
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
        trailer: youtubeTrailerId(m.trailerUrl, art?.trailer),
        year: new Date(m.releaseDate).getUTCFullYear(),
      };
    });
  const roomCinema = new Map(rooms.map((room) => [room.id, room.cinemaId]));
  const formatsByCinema = new Map(),
    moviesByCinema = new Map();
  for (const room of rooms) {
    if (!formatsByCinema.has(room.cinemaId))
      formatsByCinema.set(room.cinemaId, new Set());
    formatsByCinema.get(room.cinemaId).add(room.roomType);
  }
  for (const show of showtimes) {
    const cinemaId = roomCinema.get(show.roomId);
    if (!moviesByCinema.has(cinemaId)) moviesByCinema.set(cinemaId, new Set());
    moviesByCinema.get(cinemaId).add(show.movieId);
  }
  const cinemas = locations.map((c) => ({
    ...c,
    formats: [...(formatsByCinema.get(c.id) || [])]
      .map(
        (type) =>
          ({
            STANDARD_2D: "2D",
            IMAX_70MM_LASER: "IMAX Laser",
            DOLBY_ATMOS: "Dolby Atmos",
          })[type] || type,
      )
      .join(" · "),
    movies: [...(moviesByCinema.get(c.id) || [])],
  }));
  return {
    isLive: true,
    movies,
    cinemas,
    rooms,
    showtimes,
    combos: combos.filter((c) => c.isActive),
  };
}

function getInitialCatalog() {
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem("nova_catalogue_snapshot");
      if (cached) {
        const parsed = JSON.parse(cached);
        const processed = processCatalogSnapshot(parsed);
        if (processed) return processed;
      }
    } catch {
      /* Cache chỉ hỗ trợ hiển thị; tiếp tục đồng bộ từ API. */
    }
  }
  return fallbackCatalog;
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
        const rawSnapshot = await readProgramme();
        const processed = processCatalogSnapshot(rawSnapshot);
        if (!processed)
          throw new Error("Danh mục máy chủ chưa đầy đủ. Vui lòng thử lại.");
        setData(processed);
        setError("");
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              "nova_catalogue_snapshot",
              JSON.stringify(rawSnapshot),
            );
          } catch {
            /* Cache chỉ hỗ trợ hiển thị; tiếp tục đồng bộ từ API. */
          }
        }
      } catch (cause) {
        setData((current) =>
          current?.movies?.length ? current : fallbackCatalog,
        );
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
  const reload = useCallback(async () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("nova_catalogue_snapshot");
        sessionStorage.removeItem("nova:programme:raw");
      } catch {
        /* Cache chỉ hỗ trợ hiển thị; tiếp tục đồng bộ từ API. */
      }
    }
    const pending = inFlight.current;
    if (pending) await pending;
    return load();
  }, [load]);
  const getDates = useCallback(
    (language, cinemaId, movieId) =>
      index
        .dates(cinemaId, movieId)
        .map((id) => ({ id, label: calendarLabel(id, language) })),
    [index],
  );
  const getShowtimes = useCallback(
    (cinemaId, movieId, date) => {
      const now = Date.now();
      return index
        .at(cinemaId, movieId, date)
        .filter((s) => index.starts.get(s.id) > now)
        .map((s) => {
          const displayTime = timeLabel(s.startTime);
          const room = index.rooms.get(s.roomId);
          return {
            ...s,
            label: `${displayTime} · ${room?.name || ""}`,
            displayTime,
            roomName: room?.name || "",
            roomType: room?.roomType || "",
          };
        });
    },
    [index],
  );
  const contextFor = useCallback(
    (showtimeId, fallbackShowtime) => {
      const show = index.shows.get(showtimeId) || fallbackShowtime;
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
    },
    [data.movies, data.cinemas, index],
  );
  const value = useMemo(
    () => ({
      ...data,
      error,
      getDates,
      getShowtimes,
      contextFor,
      reload,
    }),
    [data, error, getDates, getShowtimes, contextFor, reload],
  );
  return (
    <CatalogContext.Provider value={value}>
      {error && (
        <div className="catalog-connection-notice">
          <p role="alert">
            {t("Không thể kết nối đến máy chủ Backend. Hãy thử kết nối lại.")}{" "}
            <span>{error}</span>
          </p>
          <button onClick={reload}>{t("Thử kết nối lại")}</button>
          <Link href="/xem-truoc">Xem trước giao diện (chỉ đọc)</Link>
        </div>
      )}
      {children}
    </CatalogContext.Provider>
  );
}
