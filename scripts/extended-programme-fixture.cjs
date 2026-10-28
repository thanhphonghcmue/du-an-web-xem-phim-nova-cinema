const {
  programmeWindow,
  filmDay,
  DAY,
} = require("../content/programme-calendar.cjs");
// Owned test records only. Existing integration fixtures retain their separate rooms.
async function extendedProgrammeFixture(prisma, prefix) {
  const window = programmeWindow();
  await prisma.movie.createMany({
    data: Array.from({ length: 24 }, (_, index) => ({
      title: `NOVA Selected ${String(index + 1).padStart(2, "0")} · ${prefix}`,
      description: `${prefix} extended programme`,
      durationMinutes: 120,
      ageRating: "T13",
      status: index < 16 ? "NOW_SHOWING" : "COMING_SOON",
      releaseDate: new Date(window.today + (index < 16 ? -DAY : 30 * DAY)),
    })),
  });
  const movies = await prisma.movie.findMany({
    where: { description: `${prefix} extended programme` },
    orderBy: { title: "asc" },
  });
  const cinemas = [];
  for (let index = 0; index < 2; index++) {
    const cinema = await prisma.cinema.create({
      data: {
        name: `${prefix} Extended ${index + 1}`,
        address: "Owned full-calendar acceptance fixture",
        city: index === 0 ? "Hà Nội" : "TP. Hồ Chí Minh",
      },
    });
    cinemas.push(cinema);
    const shows = [];
    for (const movie of movies) {
      for (let side = 0; side < 2; side++) {
        const room = await prisma.room.create({
          data: {
            cinemaId: cinema.id,
            name: `Selected ${movie.title.split(" · ")[0]} · ${side + 1}`,
            roomType: side === 0 ? "STANDARD_2D" : "DOLBY_ATMOS",
            totalSeats: 160,
          },
        });
        await prisma.seat.createMany({
          data: [..."ABCDEFGH"].flatMap((row) =>
            Array.from({ length: 20 }, (_, column) => ({
              roomId: room.id,
              seatRow: row,
              seatColumn: column + 1,
              seatType:
                row === "H"
                  ? "SWEETBOX"
                  : "CDEF".includes(row)
                    ? "VIP"
                    : "STANDARD",
              priceModifier:
                row === "H" ? "1.50" : "CDEF".includes(row) ? "1.20" : "1.00",
            })),
          ),
        });
        for (let day = 0; day <= window.daysAhead; day++) {
          for (const plan of filmDay(movie, side, window.today + day * DAY)) {
            if (plan.startTime.getTime() <= Date.now() + 20 * 60000) continue;
            shows.push({
              movieId: movie.id,
              roomId: room.id,
              startTime: plan.startTime,
              endTime: plan.endTime,
              baseTicketPrice: side === 0 ? "90000.00" : "105000.00",
            });
          }
        }
      }
    }
    await prisma.showtime.createMany({ data: shows });
  }
  return { movies, cinemas, window };
}
module.exports = { extendedProgrammeFixture };
