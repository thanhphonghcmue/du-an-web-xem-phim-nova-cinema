import { dayKey } from "./catalog.js";
// Index one API snapshot once. No generated dates or screenings are introduced here.
export function createCatalogIndex(data) {
  const rooms = new Map(data.rooms.map((room) => [room.id, room]));
  const shows = new Map(),
    days = new Map(),
    groups = new Map();
  for (const show of data.showtimes) {
    shows.set(show.id, show);
    days.set(show.id, dayKey(show.startTime));
    const cinemaId = rooms.get(show.roomId)?.cinemaId;
    for (const key of [
      `${cinemaId}|${show.movieId}`,
      `${cinemaId}|`,
      `|${show.movieId}`,
    ]) {
      const group = groups.get(key) || [];
      group.push(show);
      groups.set(key, group);
    }
  }
  return {
    rooms,
    shows,
    days,
    select: (cinemaId, movieId) =>
      !cinemaId && !movieId
        ? data.showtimes
        : groups.get(`${cinemaId || ""}|${movieId || ""}`) || [],
  };
}
