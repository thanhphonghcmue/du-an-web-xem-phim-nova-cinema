// Read-only checks against the configured development catalogue; prints no credentials or customer data.
require("dotenv").config({ quiet: true });
const assert = require("node:assert/strict");
const { PrismaClient, Prisma } = require("@prisma/client");
const { id, dayKey, programmeWindow } = require("./advance-programme.cjs");
async function main() {
  const db = new PrismaClient();
  try {
    const { today, end, daysAhead } = programmeWindow();
    const films = await db.movie.findMany({
      where: { status: { not: "ENDED" } },
    });
    assert.ok(
      films.length >= 24,
      "Expected at least 24 publicly bookable films",
    );
    const report = [];
    for (const key of ["landmark", "westlake"]) {
      const cinemaId = id(`cinema:${key}`);
      const rooms = await db.room.findMany({ where: { cinemaId } });
      const shows = await db.showtime.findMany({
        where: {
          room: { cinemaId },
          startTime: { gte: new Date(today), lt: new Date(end + 86400000) },
          movie: { status: { not: "ENDED" } },
        },
        include: { movie: true },
      });
      const filmIds = [...new Set(shows.map((show) => show.movieId))];
      assert.equal(
        filmIds.length,
        films.length,
        "Every public film needs an actual schedule at each cinema",
      );
      for (let day = 1; day <= daysAhead; day++)
        for (const filmId of filmIds) {
          const key = dayKey(today + day * 86400000);
          const matches = shows.filter(
            (show) => show.movieId === filmId && dayKey(show.startTime) === key,
          );
          assert.ok(
            matches.length >= 4,
            `Missing four daily showtimes for ${filmId} on ${key}`,
          );
          assert.ok(
            new Set(matches.map((show) => show.roomId)).size >= 2,
            "Each film needs two actual rooms",
          );
          for (const show of matches)
            assert.equal(
              show.endTime - show.startTime,
              (show.movie.durationMinutes + 15) * 60000,
            );
          assert.ok(
            new Set(matches.map((show) => show.startTime.toISOString())).size >=
              4,
            "Each film needs four different start times, not duplicate room listings",
          );
        }
      const presales = await db.showtime.findMany({
        where: { room: { cinemaId }, movie: { status: "COMING_SOON" } },
        include: { movie: true },
      });
      assert.equal(new Set(presales.map((show) => show.movieId)).size, 8);
      // COMING_SOON demo titles now have explicit early screenings, independently of planned re-release dates.
      for (const room of rooms)
        assert.ok(
          (await db.seat.count({ where: { roomId: room.id } })) > 0,
          "Every scheduled room needs an actual seat map",
        );
      const overlaps = await db.$queryRaw(
        Prisma.sql`SELECT count(*)::int AS count FROM showtimes a JOIN showtimes b ON a.room_id=b.room_id AND a.id<b.id AND a.start_time<b.end_time AND a.end_time>b.start_time WHERE a.room_id::text IN (${Prisma.join(rooms.map((room) => room.id))})`,
      );
      assert.equal(overlaps[0].count, 0, "Room schedules overlap");
      report.push({
        cinema: key,
        rooms: rooms.length,
        films: filmIds.length,
        daysAhead,
        through: dayKey(end),
        minShowsPerFilmPerDay: 4,
        minRoomsPerFilmPerDay: 2,
        presaleFilms: 8,
        presaleShows: presales.length,
        overlaps: 0,
      });
    }
    console.log(
      JSON.stringify({
        report,
        totalRooms: await db.room.count(),
        totalShows: await db.showtime.count(),
        verified: true,
      }),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
