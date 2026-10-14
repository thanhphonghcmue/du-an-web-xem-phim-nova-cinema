import "dotenv/config";
import { createHash } from "node:crypto";
import { hash, argon2id } from "argon2";
import {
  AgeRating,
  CMemberTier,
  MovieStatus,
  Prisma,
  PrismaClient,
  RoomType,
  SeatType,
  UserRole,
} from "@prisma/client";

export function seedId(key: string): string {
  const bytes = createHash("sha256")
    .update(`nova-cinema-demo:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function seedBaseDate(): Date {
  const provided = process.env.SEED_BASE_DATE;
  if (provided) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(provided))
      throw new Error("SEED_BASE_DATE must be YYYY-MM-DD.");
    const parsed = new Date(`${provided}T03:00:00.000Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== provided
    ) {
      throw new Error("SEED_BASE_DATE must be a valid calendar date.");
    }
    return parsed;
  }
  const result = new Date();
  result.setUTCDate(result.getUTCDate() + 1);
  result.setUTCHours(3, 0, 0, 0);
  return result;
}

const movies = [
  {
    key: "dune",
    title: "Dune: Hành Tinh Cát 2",
    durationMinutes: 166,
    ageRating: AgeRating.T16,
    releaseDate: "2024-03-01",
    poster: "dune-poster.jpg",
    trailer: "Way9Dexny3w",
    description: "Paul Atreides tiếp tục hành trình trên hành tinh Arrakis.",
  },
  {
    key: "kong",
    title: "Godzilla x Kong: Đế Chế Mới",
    durationMinutes: 115,
    ageRating: AgeRating.T13,
    releaseDate: "2024-03-29",
    poster: "kong-art.jpg",
    trailer: "lV1OOlGwExM",
    description: "Godzilla và Kong đối mặt hiểm họa từ thế giới ngầm.",
  },
  {
    key: "mai",
    title: "Mai",
    durationMinutes: 131,
    ageRating: AgeRating.T18,
    releaseDate: "2024-02-10",
    poster: "mai-title.svg",
    trailer: "EX6clvId19s",
    description:
      "Câu chuyện tình cảm của đạo diễn Trấn Thành. Title art dùng cho demo.",
  },
  {
    key: "panda",
    title: "Kung Fu Panda 4",
    durationMinutes: 94,
    ageRating: AgeRating.P,
    releaseDate: "2024-03-08",
    poster: "panda-poster.jpg",
    trailer: "_inKs4eeHiI",
    description: "Po bắt đầu hành trình tìm người kế nhiệm Thần Long Đại Hiệp.",
  },
  {
    key: "exhuma",
    title: "Quật Mộ Trùng Ma",
    durationMinutes: 134,
    ageRating: AgeRating.T18,
    releaseDate: "2024-02-22",
    poster: "exhuma-poster.jpg",
    trailer: "H2O193v3jkM",
    description: "Một nhóm chuyên gia khai quật ngôi mộ chứa bí mật đáng sợ.",
  },
  {
    key: "oppenheimer",
    title: "Oppenheimer — 70mm Special Re-release",
    durationMinutes: 180,
    ageRating: AgeRating.T18,
    releaseDate: "2023-07-21",
    poster: "oppenheimer-art.jpg",
    trailer: "uYPbbksJxIg",
    description: "Suất tái chiếu minh họa tác phẩm của Christopher Nolan.",
  },
] as const;

const rooms = [
  {
    key: "landmark-imax",
    cinema: "landmark",
    name: "IMAX Hall 01",
    type: RoomType.IMAX_70MM_LASER,
  },
  {
    key: "landmark-dolby",
    cinema: "landmark",
    name: "Infinity Hall 02",
    type: RoomType.DOLBY_ATMOS,
  },
  {
    key: "westlake-laser",
    cinema: "westlake",
    name: "Laser Hall 01",
    type: RoomType.STANDARD_2D,
  },
] as const;

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed is disabled in production.");
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error(
      "Set SEED_DEMO_PASSWORD to at least 12 characters in your private .env.",
    );
  const frontend = new URL(process.env.FRONTEND_URL || "http://localhost:3000");
  if (
    !["http:", "https:"].includes(frontend.protocol) ||
    frontend.username ||
    frontend.password
  ) {
    throw new Error("FRONTEND_URL must be an HTTP(S) URL without credentials.");
  }
  const passwordHash = await hash(password, { type: argon2id });
  const baseDate = seedBaseDate();
  await prisma.$transaction(
    async (tx) => {
      const accounts = [
        {
          email: "admin@nova.local",
          fullName: "NOVA Demo Admin",
          role: UserRole.ADMIN,
          tier: CMemberTier.DIAMOND,
        },
        {
          email: "staff@nova.local",
          fullName: "NOVA Demo Staff",
          role: UserRole.STAFF,
          tier: CMemberTier.GOLD,
        },
        {
          email: "customer@nova.local",
          fullName: "NOVA Demo Customer",
          role: UserRole.CUSTOMER,
          tier: CMemberTier.SILVER,
        },
      ];
      for (const user of accounts) {
        await tx.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            cMemberTier: user.tier,
            passwordHash,
          },
        });
      }
      for (const cinema of [
        {
          key: "landmark",
          name: "NOVA Landmark 81",
          address: "720A Điện Biên Phủ, Bình Thạnh",
          city: "TP. Hồ Chí Minh",
        },
        {
          key: "westlake",
          name: "NOVA West Lake",
          address: "272 Võ Chí Công, Tây Hồ",
          city: "Hà Nội",
        },
      ]) {
        await tx.cinema.upsert({
          where: { id: seedId(`cinema:${cinema.key}`) },
          update: {},
          create: {
            id: seedId(`cinema:${cinema.key}`),
            name: cinema.name,
            address: cinema.address,
            city: cinema.city,
          },
        });
      }
      for (const movie of movies) {
        await tx.movie.upsert({
          where: { id: seedId(`movie:${movie.key}`) },
          update: {},
          create: {
            id: seedId(`movie:${movie.key}`),
            title: movie.title,
            description: movie.description,
            durationMinutes: movie.durationMinutes,
            ageRating: movie.ageRating,
            releaseDate: new Date(`${movie.releaseDate}T00:00:00.000Z`),
            status: MovieStatus.NOW_SHOWING,
            posterUrl: new URL(`/images/${movie.poster}`, frontend).toString(),
            trailerUrl: `https://www.youtube.com/watch?v=${movie.trailer}`,
          },
        });
      }
      await tx.combo.upsert({
        where: { id: seedId("combo:party69") },
        update: {},
        create: {
          id: seedId("combo:party69"),
          name: "Party Combo 69K",
          description: "Một bắp và hai nước — giá minh họa đồ án.",
          price: new Prisma.Decimal("69000.00"),
          isActive: true,
        },
      });
      for (const room of rooms) {
        const roomId = seedId(`room:${room.key}`);
        await tx.room.upsert({
          where: { id: roomId },
          update: {},
          create: {
            id: roomId,
            cinemaId: seedId(`cinema:${room.cinema}`),
            name: room.name,
            roomType: room.type,
            totalSeats: 160,
          },
        });
        const seats: Prisma.SeatCreateManyInput[] = [];
        for (const row of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
          const seatType =
            row === "H"
              ? SeatType.SWEETBOX
              : ["C", "D", "E", "F"].includes(row)
                ? SeatType.VIP
                : SeatType.STANDARD;
          const modifier =
            seatType === SeatType.SWEETBOX
              ? "1.50"
              : seatType === SeatType.VIP
                ? "1.20"
                : "1.00";
          for (let column = 1; column <= 20; column++) {
            seats.push({
              id: seedId(`seat:${room.key}:${row}:${String(column)}`),
              roomId,
              seatRow: row,
              seatColumn: column,
              seatType,
              priceModifier: new Prisma.Decimal(modifier),
            });
          }
        }
        await tx.seat.createMany({ data: seats, skipDuplicates: true });
        for (let day = 0; day < 3; day++) {
          let cursor = new Date(baseDate.getTime() + day * 86400000);
          for (const movie of movies) {
            // Stable slot IDs keep repeat seeds from shifting existing or booked screenings.
            const id = seedId(
              `showtime:${room.key}:${String(day)}:${movie.key}`,
            );
            const storedMovie = await tx.movie.findUniqueOrThrow({
              where: { id: seedId(`movie:${movie.key}`) },
            });
            const end = new Date(
              cursor.getTime() + (storedMovie.durationMinutes + 15) * 60000,
            );
            const showtime = await tx.showtime.upsert({
              where: { id },
              update: {},
              create: {
                id,
                movieId: storedMovie.id,
                roomId,
                startTime: cursor,
                endTime: end,
                baseTicketPrice: new Prisma.Decimal("90000.00"),
              },
            });
            cursor = new Date(showtime.endTime.getTime() + 15 * 60000);
          }
        }
      }
    },
    { timeout: 120000, maxWait: 10000 },
  );
}

if (require.main === module) {
  const prisma = new PrismaClient({ log: [] });
  seedDatabase(prisma)
    .then(() => {
      console.log(
        "Demo seed completed: 3 accounts, 6 movies, 2 cinemas, 3 rooms, 480 seats, 54 showtimes, Party Combo 69K. Existing data and passwords were preserved.",
      );
    })
    .catch(() => {
      console.error(
        "Demo seed failed; no partial seed was committed. Check database availability, schedule constraints and private seed configuration.",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
