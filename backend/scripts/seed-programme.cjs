// A richer, repeatable development programme. Existing rooms, schedules and bookings stay intact.
require("dotenv").config({ quiet: true });
const { PrismaClient, Prisma } = require("@prisma/client");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const discovery = JSON.parse(
  readFileSync(resolve(__dirname, "../../content/cinema.json"), "utf8"),
);
const keys = [
  "inception",
  "kong",
  "dune",
  "panda",
  "mai",
  "oppenheimer",
  "exhuma",
  ...discovery.movies
    .filter((movie) => movie.status !== "soon")
    .map((movie) => movie.id),
];
const filmKeys = [...new Set(keys)];
const minute = 60000;
const quarter = 15 * minute;
const roundUp = (value) => Math.ceil(value / quarter) * quarter;
function id(key) {
  const bytes = createHash("sha256")
    .update(`nova-cinema-demo:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
async function seedProgramme() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo programme is disabled in production.");
  const db = new PrismaClient();
  try {
    const now = Date.now();
    const localDay = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
    const dayZero = new Date(`${localDay}T00:00:00+07:00`).getTime();
    const storedFilms = await db.movie.findMany({
      where: {
        id: { in: filmKeys.map((key) => id(`movie:${key}`)) },
        status: "NOW_SHOWING",
      },
    });
    const movies = filmKeys
      .map((key) =>
        storedFilms.find((movie) => movie.id === id(`movie:${key}`)),
      )
      .filter(Boolean);
    if (!movies.length)
      throw new Error(
        "Run db:seed and db:seed:discovery before db:seed:programme.",
      );
    let added = 0;
    for (const [cinemaIndex, key] of [
      "landmark",
      "westlake",
      "sala",
      "riverside",
    ].entries()) {
      const cinema = await db.cinema.findUnique({
        where: { id: id(`cinema:${key}`) },
      });
      if (!cinema) throw new Error("Standard demo cinemas are missing.");
      const rooms = await db.room.findMany({
        where: { cinemaId: cinema.id },
        orderBy: { name: "asc" },
      });
      let owned = rooms.filter((room) =>
        Array.from({ length: 8 }, (_, index) =>
          id(`room:programme:${key}:${index}`),
        ).includes(room.id),
      );
      const missing = Math.max(0, 8 - rooms.length);
      for (let index = 0; index < missing; index++) {
        const ordinal = rooms.length + index + 1;
        let serial = 0;
        while (
          rooms.some(
            (room) => room.id === id(`room:programme:${key}:${serial}`),
          ) ||
          owned.some(
            (room) => room.id === id(`room:programme:${key}:${serial}`),
          )
        )
          serial++;
        const room = await db.room.create({
          data: {
            id: id(`room:programme:${key}:${serial}`),
            cinemaId: cinema.id,
            name: `NOVA ${ordinal % 3 === 0 ? "Dolby" : ordinal % 3 === 1 ? "Laser" : "Premium"} Hall ${String(ordinal).padStart(2, "0")}`,
            roomType: ordinal % 3 === 0 ? "DOLBY_ATMOS" : "STANDARD_2D",
            totalSeats: 160,
          },
        });
        owned.push(room);
      }
      for (const [hall, room] of owned.entries()) {
        await db.seat.createMany({
          skipDuplicates: true,
          data: ["A", "B", "C", "D", "E", "F", "G", "H"].flatMap((row) =>
            Array.from({ length: 20 }, (_, index) => ({
              id: id(`seat:programme:${room.id}:${row}:${index + 1}`),
              roomId: room.id,
              seatRow: row,
              seatColumn: index + 1,
              seatType:
                row === "H"
                  ? "SWEETBOX"
                  : ["C", "D", "E", "F"].includes(row)
                    ? "VIP"
                    : "STANDARD",
              priceModifier: new Prisma.Decimal(
                row === "H"
                  ? "1.50"
                  : ["C", "D", "E", "F"].includes(row)
                    ? "1.20"
                    : "1.00",
              ),
            })),
          ),
        });
        for (let day = 0; day < 7; day++) {
          const midnight = dayZero + day * 86400000;
          const dateKey = new Date(midnight + 7 * 3600000)
            .toISOString()
            .slice(0, 10);
          const opening = midnight + (9 * 60 + (hall % 3) * 15) * minute;
          const closing = midnight + (22 * 60 + 45) * minute;
          await db.$transaction(
            async (tx) => {
              // Same room-level lock used when managing showtimes; serialize seed/admin scheduling.
              await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${room.id}::uuid FOR UPDATE`;
              const existing = await tx.showtime.findMany({
                where: {
                  roomId: room.id,
                  endTime: { gt: new Date(opening) },
                  startTime: { lt: new Date(closing + 4 * 3600000) },
                },
                orderBy: { startTime: "asc" },
              });
              let cursor = opening;
              for (let slot = 0; slot < 8; slot++) {
                const showId = id(
                  `showtime:programme:${room.id}:${dateKey}:${slot}`,
                );
                const stored = existing.find((show) => show.id === showId);
                if (stored) {
                  cursor = Math.max(cursor, roundUp(stored.endTime.getTime()));
                  continue;
                }
                const movie =
                  movies[
                    (cinemaIndex * 7 + hall * 3 + day * 2 + slot) %
                      movies.length
                  ];
                let end = cursor + (movie.durationMinutes + 15) * minute;
                for (
                  let attempt = 0;
                  attempt < existing.length + 1;
                  attempt++
                ) {
                  const conflict = existing.find(
                    (show) =>
                      show.startTime.getTime() < end &&
                      show.endTime.getTime() > cursor,
                  );
                  if (!conflict) break;
                  cursor = roundUp(conflict.endTime.getTime());
                  end = cursor + (movie.durationMinutes + 15) * minute;
                }
                if (cursor > closing) break;
                if (cursor > now + 20 * minute) {
                  const show = await tx.showtime.create({
                    data: {
                      id: showId,
                      movieId: movie.id,
                      roomId: room.id,
                      startTime: new Date(cursor),
                      endTime: new Date(end),
                      baseTicketPrice: new Prisma.Decimal(
                        room.roomType === "DOLBY_ATMOS"
                          ? "105000.00"
                          : "90000.00",
                      ),
                    },
                  });
                  existing.push(show);
                  added++;
                }
                cursor = roundUp(end);
              }
            },
            { timeout: 30000 },
          );
        }
      }
    }
    const expanded =
      await require("./advance-programme.cjs").seedAdvanceProgramme(
        db,
        discovery,
      );
    console.log(
      JSON.stringify({
        legacyAdded: added,
        ...expanded,
        message:
          "All active films through at least 30 days and the end of next month; existing bookings, schedules and layouts preserved.",
      }),
    );
  } finally {
    await db.$disconnect();
  }
}
seedProgramme().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
