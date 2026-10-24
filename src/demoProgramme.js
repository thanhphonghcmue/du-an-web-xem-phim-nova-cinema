import calendar from "../content/programme-calendar.cjs";
// Standalone data only; never used to replace a configured NestJS response.
export function buildDemoProgramme(movies, cinemas, now = Date.now()) {
  const { today, daysAhead } = calendar.programmeWindow(now);
  const rooms = [],
    showtimes = [];
  for (const cinema of cinemas) {
    for (const [index, film] of movies.entries()) {
      const movie = {
        ...film,
        durationMinutes: film.durationMinutes || film.duration,
      };
      for (let side = 0; side < 2; side++) {
        const room = {
          id: `${cinema.id}-${movie.id}-r${side + 1}`,
          cinemaId: cinema.id,
          name: `NOVA ${side === 0 ? "Laser" : "IMAX"} ${String(index * 2 + side + 1).padStart(2, "0")}`,
          roomType: side === 0 ? "STANDARD_2D" : "IMAX_70MM_LASER",
          totalSeats: 160,
        };
        rooms.push(room);
        for (let day = 0; day <= daysAhead; day++) {
          for (const plan of calendar.filmDay(
            movie,
            side,
            today + day * calendar.DAY,
          )) {
            if (plan.startTime.getTime() <= now) continue;
            showtimes.push({
              id: `st-${room.id}-${calendar.dayKey(plan.startTime)}-${plan.startTime.getTime()}`,
              movieId: movie.id,
              roomId: room.id,
              startTime: plan.startTime.toISOString(),
              endTime: plan.endTime.toISOString(),
              baseTicketPrice: side === 0 ? "90000.00" : "105000.00",
            });
          }
        }
      }
    }
  }
  return { rooms, showtimes };
}
