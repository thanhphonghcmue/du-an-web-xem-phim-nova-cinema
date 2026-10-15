import { useCallback, useEffect, useState } from "react";
import { CatalogContext, dayKey, timeLabel } from "../catalog.js";
import { movies as artwork, cinemas as defaultCinemas } from "../data.js";
import {
  apiGetMovies,
  apiGetCinemas,
  apiGetShowtimes,
  apiList,
} from "../api/client.js";

function getInitialCatalog() {
  const fallbackRooms = defaultCinemas.flatMap((c) => [
    { id: `${c.id}-r1`, cinemaId: c.id, name: "Cinema 1 (Laser)", roomType: "STANDARD_2D" },
    { id: `${c.id}-r2`, cinemaId: c.id, name: "IMAX Laser", roomType: "IMAX_70MM_LASER" },
  ]);
  const fallbackShowtimes = defaultCinemas.flatMap((c) =>
    artwork.slice(0, 4).flatMap((m, mi) =>
      [0, 1, 2, 3].map((dayOffset) => {
        const date = new Date(Date.now() + dayOffset * 86400000);
        date.setHours(10 + mi * 3, 30, 0, 0);
        return {
          id: `st-${c.id}-${m.id}-${dayOffset}`,
          movieId: m.id,
          roomId: `${c.id}-r1`,
          startTime: date.toISOString(),
          endTime: new Date(date.getTime() + 120 * 60000).toISOString(),
          baseTicketPrice: "90000.00",
        };
      }),
    ),
  );
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
    rooms: fallbackRooms,
    showtimes: fallbackShowtimes,
    combos: [
      { id: "combo-1", name: "Solo Combo 69K", description: "1 bắp + 1 nước", price: "69000.00", isActive: true },
      { id: "combo-2", name: "Duo Combo 99K", description: "1 bắp lớn + 2 nước", price: "99000.00", isActive: true },
      { id: "combo-3", name: "Party Combo 199K", description: "2 bắp lớn + 4 nước + snack", price: "199000.00", isActive: true },
    ],
  };
}

export default function CatalogProvider({ children }) {
  const [data, setData] = useState(getInitialCatalog);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [films, locations, showtimes, rooms, combos] = await Promise.all([
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
        movies,
        cinemas,
        rooms,
        showtimes,
        combos: combos.filter((c) => c.isActive),
      });
      setError("");
    } catch {
      setData((prev) => prev || getInitialCatalog());
      setError("");
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
      value={{ ...data, getDates, getShowtimes, contextFor, reload: load }}
    >
      {children}
    </CatalogContext.Provider>
  );
}
