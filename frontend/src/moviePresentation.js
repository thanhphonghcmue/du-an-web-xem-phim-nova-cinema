export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .replace(/đ/g, "d");
}

// Một trailer lỗi không được làm mất cả danh mục đặt vé.
export function youtubeTrailerId(value, fallback) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return fallback;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const candidate =
      host === "youtu.be"
        ? url.pathname.split("/")[1]
        : ["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(
              host,
            )
          ? url.searchParams.get("v") ||
            /^\/(?:embed|shorts)\/([^/]+)/.exec(url.pathname)?.[1]
          : null;
    return /^[a-zA-Z0-9_-]{11}$/.test(candidate || "") ? candidate : fallback;
  } catch {
    return fallback;
  }
}

// Lập chỉ mục một lần cho snapshot; không quét hàng nghìn suất trên mỗi thẻ phim.
export function createMovieAvailability(showtimes, dayKey) {
  const latestByMovie = new Map();
  const latestByDay = new Map();
  for (const show of showtimes) {
    const start = Date.parse(show.startTime);
    if (!show.movieId || !Number.isFinite(start)) continue;
    const day = dayKey(show.startTime);
    const key = `${show.movieId}|${day}`;
    latestByMovie.set(
      show.movieId,
      Math.max(latestByMovie.get(show.movieId) ?? -Infinity, start),
    );
    latestByDay.set(key, Math.max(latestByDay.get(key) ?? -Infinity, start));
  }
  return {
    hasFuture: (movieId, now) =>
      (latestByMovie.get(movieId) ?? -Infinity) > now,
    hasDay: (movieId, day, now) =>
      (latestByDay.get(`${movieId}|${day}`) ?? -Infinity) > now,
  };
}
