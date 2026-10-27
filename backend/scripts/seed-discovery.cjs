// Additive demo catalog. Never replaces administrator edits or booked screenings.
require("dotenv").config({ quiet: true });
const { PrismaClient, Prisma } = require("@prisma/client");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const catalog = JSON.parse(
  readFileSync(resolve(__dirname, "../../content/cinema.json"), "utf8"),
);
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
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Discovery seed is for development only.");
  const db = new PrismaClient();
  try {
    const now = new Date();
    const vietnam = new Date(now.getTime() + 7 * 3600000);
    const month = Date.UTC(
      vietnam.getUTCFullYear(),
      vietnam.getUTCMonth() + 1,
      1,
      3,
    );
    await db.$transaction(
      async (tx) => {
        const cinema = await tx.cinema.findUnique({
          where: { id: id("cinema:landmark") },
        });
        if (!cinema)
          throw new Error("Run the standard db:seed before db:seed:discovery.");
        const roomId = id("room:discovery");
        await tx.room.upsert({
          where: { id: roomId },
          update: {},
          create: {
            id: roomId,
            cinemaId: cinema.id,
            name: "NOVA Selected Hall 03",
            roomType: "STANDARD_2D",
            totalSeats: 80,
          },
        });
        await tx.seat.createMany({
          skipDuplicates: true,
          data: ["A", "B", "C", "D"].flatMap((row) =>
            Array.from({ length: 20 }, (_, index) => ({
              id: id(`seat:discovery:${row}:${index + 1}`),
              roomId,
              seatRow: row,
              seatColumn: index + 1,
              seatType: row === "D" ? "VIP" : "STANDARD",
              priceModifier: new Prisma.Decimal(row === "D" ? "1.20" : "1.00"),
            })),
          ),
        });
        for (const [index, movie] of catalog.movies.entries()) {
          const release =
            movie.status === "soon"
              ? new Date(month + ((movie.week - 1) * 7 + 3) * 86400000)
              : new Date(`${movie.year}-01-01T00:00:00Z`);
          const movieId = id(`movie:${movie.id}`);
          await tx.movie.upsert({
            where: { id: movieId },
            update: {},
            create: {
              id: movieId,
              title: movie.title,
              description: movie.description,
              durationMinutes: movie.duration,
              ageRating: movie.age,
              releaseDate: release,
              status: movie.status === "soon" ? "COMING_SOON" : "NOW_SHOWING",
              posterUrl: new URL(
                movie.poster,
                process.env.FRONTEND_URL || "http://localhost:3000",
              ).href,
              trailerUrl: `https://www.youtube.com/watch?v=${movie.trailer}`,
            },
          });
          if (movie.status === "soon") continue;
          // Three screenings/day in a separate room, at least four hours apart.
          const start = new Date(
            Date.UTC(
              vietnam.getUTCFullYear(),
              vietnam.getUTCMonth(),
              vietnam.getUTCDate() + 1 + Math.floor(index / 3),
              3 + (index % 3) * 4,
            ),
          );
          await tx.showtime.upsert({
            where: { id: id(`showtime:discovery:${movie.id}`) },
            update: {},
            create: {
              id: id(`showtime:discovery:${movie.id}`),
              movieId,
              roomId,
              startTime: start,
              endTime: new Date(
                start.getTime() + (movie.duration + 15) * 60000,
              ),
              baseTicketPrice: new Prisma.Decimal("90000.00"),
            },
          });
        }
        for (const item of catalog.menu)
          await tx.combo.upsert({
            where: { id: id(`combo:${item.key}`) },
            update: {},
            create: {
              id: id(`combo:${item.key}`),
              name: item.name,
              description: item.description,
              price: new Prisma.Decimal(item.price),
              isActive: true,
            },
          });
      },
      { timeout: 60000 },
    );
    console.log(
      `Discovery catalog prepared: ${catalog.movies.length} films, ${catalog.menu.length} menu items; existing data preserved.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
