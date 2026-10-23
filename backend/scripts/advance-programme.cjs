// Additive local programme: fixed UUIDs, real seats and collision-checked screenings.
const { createHash } = require("node:crypto");
const { Prisma } = require("@prisma/client");
const MINUTE = 60000;
const DAY = 86400000;
const id = (key) => {
  const bytes = createHash("sha256")
    .update(`nova-cinema-demo:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const dayKey = (value) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
const midnight = (value) =>
  new Date(`${dayKey(value)}T00:00:00+07:00`).getTime();
function planDay(movies, hall, day) {
  return [9, 13, 17, 21].map((hour, slot) => {
    const movie =
      movies[
        (hall + (slot % 2) * Math.ceil(movies.length / 2)) % movies.length
      ];
    const startTime = new Date(day + (hour * 60 + (hall % 3) * 15) * MINUTE);
    return {
      movie,
      startTime,
      endTime: new Date(
        startTime.getTime() + (movie.durationMinutes + 15) * MINUTE,
      ),
    };
  });
}
async function prepareRoom(db, cinema, key, index) {
  const roomId = id(`room:advance:${key}:${index}`);
  const room = await db.room.upsert({
    where: { id: roomId },
    update: {},
    create: {
      id: roomId,
      cinemaId: cinema.id,
      name: `NOVA ${index % 4 === 0 ? "IMAX" : index % 4 === 1 ? "Dolby" : "Laser"} Studio ${String(index + 9).padStart(2, "0")}`,
      roomType:
        index % 4 === 0
          ? "IMAX_70MM_LASER"
          : index % 4 === 1
            ? "DOLBY_ATMOS"
            : "STANDARD_2D",
      totalSeats: 160,
    },
  });
  // Existing/admin-modified layouts are left untouched.
  if (!(await db.seat.count({ where: { roomId } })))
    await db.seat.createMany({
      skipDuplicates: true,
      data: [..."ABCDEFGH"].flatMap((row) =>
        Array.from({ length: 20 }, (_, i) => ({
          id: id(`seat:advance:${key}:${index}:${row}:${i + 1}`),
          roomId,
          seatRow: row,
          seatColumn: i + 1,
          seatType:
            row === "H"
              ? "SWEETBOX"
              : "CDEF".includes(row)
                ? "VIP"
                : "STANDARD",
          priceModifier: new Prisma.Decimal(
            row === "H" ? "1.50" : "CDEF".includes(row) ? "1.20" : "1.00",
          ),
        })),
      ),
    });
  return room;
}
async function insertDay(db, room, plans, namespace, now) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM rooms WHERE id=${room.id}::uuid FOR UPDATE`;
      const first = plans[0],
        last = plans.at(-1);
      const existing = await tx.showtime.findMany({
        where: {
          roomId: room.id,
          endTime: { gt: first.startTime },
          startTime: { lt: last.endTime },
        },
      });
      let added = 0,
        conflicts = 0;
      for (const [slot, plan] of plans.entries()) {
        const showId = id(
          `showtime:${namespace}:${room.id}:${dayKey(plan.startTime)}:${slot}`,
        );
        if (
          existing.some((show) => show.id === showId) ||
          plan.startTime.getTime() <= now + 20 * MINUTE
        )
          continue;
        if (
          existing.some(
            (show) =>
              show.startTime < plan.endTime && show.endTime > plan.startTime,
          )
        ) {
          conflicts++;
          continue;
        }
        const show = await tx.showtime.create({
          data: {
            id: showId,
            movieId: plan.movie.id,
            roomId: room.id,
            startTime: plan.startTime,
            endTime: plan.endTime,
            baseTicketPrice: new Prisma.Decimal(
              room.roomType === "STANDARD_2D" ? "90000.00" : "105000.00",
            ),
          },
        });
        existing.push(show);
        added++;
      }
      return { added, conflicts };
    },
    { timeout: 30000 },
  );
}
async function seedAdvanceProgramme(db, catalog) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo programme is disabled in production.");
  const now = Date.now(),
    today = midnight(now);
  const originals = ["dune", "kong", "mai", "panda", "exhuma", "oppenheimer"];
  const keys = [
    ...new Set([
      ...originals,
      ...catalog.movies
        .filter((movie) => movie.status !== "soon")
        .map((movie) => movie.id),
    ]),
  ];
  const stored = await db.movie.findMany({
    where: {
      id: { in: keys.map((key) => id(`movie:${key}`)) },
      status: "NOW_SHOWING",
    },
  });
  const movies = keys.flatMap((key) =>
    stored.filter((movie) => movie.id === id(`movie:${key}`)),
  );
  if (!movies.length)
    throw new Error("Demo films are missing; run discovery seed first.");
  const soon = await db.movie.findMany({
    where: {
      id: {
        in: catalog.movies
          .filter((movie) => movie.status === "soon")
          .map((movie) => id(`movie:${movie.id}`)),
      },
      status: "COMING_SOON",
    },
    orderBy: [{ releaseDate: "asc" }, { id: "asc" }],
  });
  let added = 0,
    conflicts = 0;
  for (const key of ["landmark", "westlake"]) {
    const cinema = await db.cinema.findUniqueOrThrow({
      where: { id: id(`cinema:${key}`) },
    });
    for (let hall = 0; hall < 16; hall++) {
      const room = await prepareRoom(db, cinema, key, hall);
      for (let day = 0; day <= 30; day++) {
        const result = await insertDay(
          db,
          room,
          planDay(movies, hall, today + day * DAY),
          "advance",
          now,
        );
        added += result.added;
        conflicts += result.conflicts;
      }
    }
    // Legacy programme halls are free after the initial week; reuse them for advance sales.
    const premiereRooms = await db.room.findMany({
      where: {
        cinemaId: cinema.id,
        id: {
          in: Array.from({ length: 8 }, (_, i) =>
            id(`room:programme:${key}:${i}`),
          ),
        },
      },
      orderBy: { id: "asc" },
    });
    for (const [index, movie] of soon.entries()) {
      if (!premiereRooms.length) break;
      for (let side = 0; side < 2; side++) {
        const room = premiereRooms[(index * 2 + side) % premiereRooms.length];
        for (let day = 0; day < 7; day++) {
          const base = midnight(movie.releaseDate) + day * DAY;
          const plans = (side === 0 ? [10, 18.5] : [13, 21.25]).map((hour) => ({
            movie,
            startTime: new Date(base + hour * 60 * MINUTE),
            endTime: new Date(
              base + (hour * 60 + movie.durationMinutes + 15) * MINUTE,
            ),
          }));
          const result = await insertDay(
            db,
            room,
            plans,
            `presale:${movie.id}`,
            now,
          );
          added += result.added;
          conflicts += result.conflicts;
        }
      }
    }
  }
  return {
    added,
    conflicts,
    daysAhead: 30,
    films: movies.length,
    presaleFilms: soon.length,
  };
}
module.exports = { seedAdvanceProgramme, planDay, id, dayKey, midnight };
