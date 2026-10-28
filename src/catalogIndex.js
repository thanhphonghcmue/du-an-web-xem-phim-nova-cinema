import { dayKey } from "./catalog.js";
// Index one API snapshot once. No generated dates or screenings are introduced here.
export function createCatalogIndex(data) {
  const rooms = new Map(data.rooms.map((room) => [room.id, room]));
  const shows = new Map(),
    days = new Map(),
    groups = new Map(),
    latestByDay = new Map(),
    byDate = new Map(),
    starts = new Map();
  for (const show of data.showtimes) {
    shows.set(show.id, show);
    days.set(show.id, dayKey(show.startTime));
    starts.set(show.id, Date.parse(show.startTime));
    const cinemaId = rooms.get(show.roomId)?.cinemaId;
    for (const key of [
      "|",
      `${cinemaId}|${show.movieId}`,
      `${cinemaId}|`,
      `|${show.movieId}`,
    ]) {
      const group = groups.get(key) || [];
      group.push(show);
      groups.set(key, group);
      const dates = latestByDay.get(key) || new Map();
      const date = days.get(show.id);
      dates.set(date, Math.max(dates.get(date) || 0, starts.get(show.id)));
      latestByDay.set(key, dates);
    }
    const key = `${cinemaId}|${show.movieId}|${days.get(show.id)}`;
    const row = byDate.get(key) || [];
    row.push(show);
    byDate.set(key, row);
  }
  return {
    rooms,
    starts,
    dates: (cinemaId, movieId, now = Date.now()) =>
      [...(latestByDay.get(`${cinemaId || ""}|${movieId || ""}`) || [])]
        .filter(([, latest]) => latest > now)
        .map(([date]) => date)
        .sort(),
    at: (cinemaId, movieId, date) =>
      byDate.get(`${cinemaId}|${movieId}|${date}`) || [],
    shows,
    days,
    select: (cinemaId, movieId) =>
      !cinemaId && !movieId
        ? data.showtimes
        : groups.get(`${cinemaId || ""}|${movieId || ""}`) || [],
  };
}
