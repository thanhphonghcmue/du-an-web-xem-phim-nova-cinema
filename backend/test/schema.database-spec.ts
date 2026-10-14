import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { hash, verify } from "argon2";
import { toDataURL } from "qrcode";
import {
  BookingSeatStatus,
  BookingStatus,
  Prisma,
  PrismaClient,
  RoomType,
  SeatType,
  UserRole,
} from "@prisma/client";
import { seedDatabase, seedId } from "../prisma/seed";

const target = process.env.TEST_DATABASE_URL;
if (!target) throw new Error("TEST_DATABASE_URL is required.");
const prisma = new PrismaClient({ datasourceUrl: target, log: [] });
const ownedRooms: string[] = [];
const ownedCinemas: string[] = [];
const ownedMovies: string[] = [];
const ownedUsers: string[] = [];
let ownerId: string;
let staffId: string;

async function fixture() {
  return prisma.$transaction(async (tx) => {
    const cinema = await tx.cinema.create({
      data: {
        name: "Constraint test",
        address: "Isolated test fixture",
        city: "Test",
      },
    });
    const movie = await tx.movie.create({
      data: {
        title: "Constraint test",
        description: "Isolated fixture",
        durationMinutes: 120,
        releaseDate: new Date("2030-01-01T00:00:00.000Z"),
        ageRating: "P",
        status: "NOW_SHOWING",
      },
    });
    const room = await tx.room.create({
      data: {
        cinemaId: cinema.id,
        name: "Test room",
        roomType: RoomType.STANDARD_2D,
        totalSeats: 1,
      },
    });
    const seat = await tx.seat.create({
      data: {
        roomId: room.id,
        seatRow: "A",
        seatColumn: 1,
        seatType: SeatType.STANDARD,
        priceModifier: new Prisma.Decimal("1.00"),
      },
    });
    const showtime = await tx.showtime.create({
      data: {
        roomId: room.id,
        movieId: movie.id,
        startTime: new Date("2040-01-01T10:00:00Z"),
        endTime: new Date("2040-01-01T12:15:00Z"),
        baseTicketPrice: new Prisma.Decimal("90000.00"),
      },
    });
    ownedRooms.push(room.id);
    ownedCinemas.push(cinema.id);
    ownedMovies.push(movie.id);
    return { room, seat, showtime, movie };
  });
}
async function booking(
  showtimeId: string,
  status: BookingStatus = BookingStatus.HOLDING,
) {
  return prisma.booking.create({
    data: {
      orderCode: `NOVA-T-${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      userId: ownerId,
      showtimeId,
      status,
      totalTicketAmount: new Prisma.Decimal("90000.00"),
      finalAmount: new Prisma.Decimal("90000.00"),
      expiredAt: new Date(Date.now() + 300000),
    },
  });
}
function seatRow(
  f: Awaited<ReturnType<typeof fixture>>,
  bookingId: string,
  status: BookingSeatStatus = BookingSeatStatus.HOLDING,
) {
  return {
    bookingId,
    seatId: f.seat.id,
    showtimeId: f.showtime.id,
    roomId: f.room.id,
    price: new Prisma.Decimal("90000.00"),
    status,
  };
}

beforeAll(async () => {
  const passwordHash = await hash(randomBytes(32));
  for (const role of [UserRole.CUSTOMER, UserRole.STAFF]) {
    const user = await prisma.user.create({
      data: {
        email: `${randomUUID()}@fixture.test`,
        passwordHash,
        fullName: "Database test",
        role,
      },
    });
    ownedUsers.push(user.id);
    if (role === UserRole.CUSTOMER) ownerId = user.id;
    else staffId = user.id;
  }
});
afterAll(async () => {
  // Delete only IDs created by this suite; never truncate the database or demo rows.
  await prisma.$transaction(async (tx) => {
    const bookings = await tx.booking.findMany({
      where: { showtime: { roomId: { in: ownedRooms } } },
      select: { id: true },
    });
    const ids = bookings.map((row) => row.id);
    await tx.eTicket.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.payment.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.booking.deleteMany({ where: { id: { in: ids } } });
    await tx.showtime.deleteMany({ where: { roomId: { in: ownedRooms } } });
    await tx.seat.deleteMany({ where: { roomId: { in: ownedRooms } } });
    await tx.room.deleteMany({ where: { id: { in: ownedRooms } } });
    await tx.cinema.deleteMany({ where: { id: { in: ownedCinemas } } });
    await tx.movie.deleteMany({ where: { id: { in: ownedMovies } } });
    await tx.user.deleteMany({ where: { id: { in: ownedUsers } } });
  });
  await prisma.$disconnect();
});

describe("Phase 1 PostgreSQL constraints (not API TC01–TC05)", () => {
  it("connects to the dedicated test database", async () => {
    const rows = await prisma.$queryRaw<
      { database: string; version: string }[]
    >`SELECT current_database() AS database, version() AS version`;
    expect(rows[0]?.database.endsWith("_test")).toBe(true);
    expect(rows[0]?.version).toContain("PostgreSQL");
  });
  it("stores all DateTime columns as timestamptz and money as numeric(14,2)", async () => {
    const times = await prisma.$queryRaw<
      { data_type: string }[]
    >`SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND (column_name LIKE '%_at' OR column_name IN ('start_time','end_time','release_date')) AND table_name <> '_prisma_migrations'`;
    expect(times.length).toBeGreaterThan(20);
    expect(
      times.every((row) => row.data_type === "timestamp with time zone"),
    ).toBe(true);
    const amounts = await prisma.$queryRaw<
      { numeric_precision: number; numeric_scale: number }[]
    >`SELECT numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('price','amount','unit_price','base_ticket_price','final_amount','discount_amount','total_ticket_amount','total_combo_amount')`;
    expect(amounts.length).toBeGreaterThan(7);
    expect(
      amounts.every(
        (row) => row.numeric_precision === 14 && row.numeric_scale === 2,
      ),
    ).toBe(true);
  });
  it("has the partial unique index without an unconditional showtime/seat unique", async () => {
    const indexes = await prisma.$queryRaw<
      { indexdef: string }[]
    >`SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='booking_seats'`;
    const active = indexes.find((row) =>
      row.indexdef.includes("uq_active_showtime_seat"),
    );
    expect(active?.indexdef).toMatch(/UNIQUE.*showtime_id, seat_id.*WHERE/);
    expect(
      indexes.some(
        (row) =>
          row.indexdef.includes("UNIQUE") &&
          row.indexdef.includes("(showtime_id, seat_id)") &&
          !row.indexdef.includes("WHERE"),
      ),
    ).toBe(false);
  });
  it("rejects one of two simultaneous active ownership inserts", async () => {
    const f = await fixture();
    const a = await booking(f.showtime.id);
    const b = await booking(f.showtime.id);
    const results = await Promise.allSettled([
      prisma.bookingSeat.create({ data: seatRow(f, a.id) }),
      prisma.bookingSeat.create({ data: seatRow(f, b.id) }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected");
    const reason: unknown =
      failed?.status === "rejected" ? failed.reason : undefined;
    expect(
      reason instanceof Prisma.PrismaClientKnownRequestError &&
        reason.code === "P2002",
    ).toBe(true);
    expect(
      await prisma.bookingSeat.count({
        where: { showtimeId: f.showtime.id, status: "HOLDING" },
      }),
    ).toBe(1);
  });
  it("retains released history and allows a new owner", async () => {
    const f = await fixture();
    const a = await booking(f.showtime.id);
    const b = await booking(f.showtime.id);
    const old = await prisma.bookingSeat.create({ data: seatRow(f, a.id) });
    await prisma.$transaction([
      prisma.bookingSeat.update({
        where: { id: old.id },
        data: { status: "AVAILABLE" },
      }),
      prisma.booking.update({
        where: { id: a.id },
        data: { status: "CANCELLED" },
      }),
    ]);
    await prisma.bookingSeat.create({ data: seatRow(f, b.id) });
    expect(
      await prisma.bookingSeat.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(2);
    expect(
      await prisma.bookingSeat.count({
        where: { showtimeId: f.showtime.id, status: "HOLDING" },
      }),
    ).toBe(1);
  });
  it("keeps SOLD seats exclusive too", async () => {
    const f = await fixture();
    const a = await booking(f.showtime.id, "PAID");
    const b = await booking(f.showtime.id);
    await prisma.bookingSeat.create({ data: seatRow(f, a.id, "SOLD") });
    await expect(
      prisma.bookingSeat.create({ data: seatRow(f, b.id) }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("blocks overlapping screenings", async () => {
    const f = await fixture();
    await expect(
      prisma.showtime.create({
        data: {
          movieId: f.movie.id,
          roomId: f.room.id,
          startTime: new Date("2040-01-01T12:00:00Z"),
          endTime: new Date("2040-01-01T14:15:00Z"),
          baseTicketPrice: "90000.00",
        },
      }),
    ).rejects.toThrow(/showtimes_no_room_overlap/);
  });
  it("permits exactly adjacent showtimes", async () => {
    const f = await fixture();
    const next = await prisma.showtime.create({
      data: {
        movieId: f.movie.id,
        roomId: f.room.id,
        startTime: f.showtime.endTime,
        endTime: new Date("2040-01-01T14:30:00Z"),
        baseTicketPrice: "90000.00",
      },
    });
    expect(next.startTime.toISOString()).toBe(f.showtime.endTime.toISOString());
  });
  it("checks overlaps on UPDATE as well as INSERT", async () => {
    const f = await fixture();
    const next = await prisma.showtime.create({
      data: {
        movieId: f.movie.id,
        roomId: f.room.id,
        startTime: new Date("2040-01-01T13:00:00Z"),
        endTime: new Date("2040-01-01T15:15:00Z"),
        baseTicketPrice: "90000.00",
      },
    });
    await expect(
      prisma.showtime.update({
        where: { id: next.id },
        data: { startTime: new Date("2040-01-01T11:59:00Z") },
      }),
    ).rejects.toThrow(/showtimes_no_room_overlap/);
  });
  it("rejects one of two concurrent overlapping showtime inserts", async () => {
    const f = await fixture();
    const make = (start: string) =>
      prisma.showtime.create({
        data: {
          movieId: f.movie.id,
          roomId: f.room.id,
          startTime: new Date(start),
          endTime: new Date("2040-01-02T14:15:00Z"),
          baseTicketPrice: "90000.00",
        },
      });
    const results = await Promise.allSettled([
      make("2040-01-02T12:00:00Z"),
      make("2040-01-02T12:05:00Z"),
    ]);
    expect(results.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((row) => row.status === "rejected")).toHaveLength(1);
  });
  it("prevents a seat from another room joining the booking", async () => {
    const f = await fixture();
    const other = await fixture();
    const b = await booking(f.showtime.id);
    await expect(
      prisma.bookingSeat.create({
        data: { ...seatRow(f, b.id), seatId: other.seat.id },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("prevents attaching a booking seat to a different booking showtime", async () => {
    const f = await fixture();
    const other = await fixture();
    const b = await booking(f.showtime.id);
    await expect(
      prisma.bookingSeat.create({ data: seatRow(other, b.id) }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("enforces unique physical seat coordinates", async () => {
    const f = await fixture();
    await expect(
      prisma.seat.create({
        data: {
          roomId: f.room.id,
          seatRow: "A",
          seatColumn: 1,
          seatType: "STANDARD",
          priceModifier: "1.00",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("enforces the BR05 type multipliers in storage", async () => {
    const f = await fixture();
    await expect(
      prisma.seat.update({
        where: { id: f.seat.id },
        data: { seatType: "VIP", priceModifier: "1.00" },
      }),
    ).rejects.toThrow(/seats_type_modifier/);
  });
  it("round trips exact Decimal arithmetic without float addition", async () => {
    const f = await fixture();
    const b = await booking(f.showtime.id);
    const total = new Prisma.Decimal("0.10").plus(new Prisma.Decimal("0.20"));
    const stored = await prisma.booking.update({
      where: { id: b.id },
      data: { totalTicketAmount: total, finalAmount: total },
    });
    expect(stored.finalAmount.toFixed(2)).toBe("0.30");
  });
  it("rejects negative and inconsistent booking amounts", async () => {
    const f = await fixture();
    const b = await booking(f.showtime.id);
    await expect(
      prisma.booking.update({
        where: { id: b.id },
        data: { finalAmount: "1.00" },
      }),
    ).rejects.toThrow(/bookings_amount_consistent/);
    await expect(
      prisma.booking.update({
        where: { id: b.id },
        data: { totalTicketAmount: "-1.00", finalAmount: "-1.00" },
      }),
    ).rejects.toThrow(/bookings_money_nonnegative/);
  });
  it("restricts deletion of referenced movie history", async () => {
    const f = await fixture();
    await expect(
      prisma.movie.delete({ where: { id: f.movie.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("makes provider transaction codes unique", async () => {
    const f = await fixture();
    const a = await booking(f.showtime.id);
    const b = await booking(f.showtime.id);
    const transactionCode = randomUUID();
    await prisma.payment.create({
      data: { bookingId: a.id, transactionCode, amount: "90000.00" },
    });
    await expect(
      prisma.payment.create({
        data: { bookingId: b.id, transactionCode, amount: "90000.00" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("allows one ticket per booking and globally unique random hashes", async () => {
    const f = await fixture();
    const a = await booking(f.showtime.id, "PAID");
    const b = await booking(f.showtime.id, "PAID");
    const ticketHash = randomBytes(32).toString("hex");
    const qrCodeBase64 = await toDataURL(ticketHash);
    await prisma.eTicket.create({
      data: { bookingId: a.id, ticketHash, qrCodeBase64 },
    });
    await expect(
      prisma.eTicket.create({
        data: { bookingId: b.id, ticketHash, qrCodeBase64 },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      prisma.eTicket.create({
        data: {
          bookingId: a.id,
          ticketHash: randomBytes(32).toString("hex"),
          qrCodeBase64,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("supports an atomic single-winner check-in update", async () => {
    const f = await fixture();
    const b = await booking(f.showtime.id, "PAID");
    const ticketHash = randomBytes(32).toString("hex");
    const ticket = await prisma.eTicket.create({
      data: {
        bookingId: b.id,
        ticketHash,
        qrCodeBase64: await toDataURL(ticketHash),
      },
    });
    const update = () =>
      prisma.eTicket.updateMany({
        where: { id: ticket.id, isCheckedIn: false },
        data: {
          isCheckedIn: true,
          checkedInAt: new Date(),
          checkedInByStaffId: staffId,
        },
      });
    const results = await Promise.all([update(), update()]);
    expect(results.map((row) => row.count).sort()).toEqual([0, 1]);
  });
});

describe("Phase 1 demo seed", () => {
  it("is idempotent and preserves passwords, edits, IDs and showtime timestamps", async () => {
    await seedDatabase(prisma);
    const accounts = await prisma.user.findMany({
      where: {
        email: {
          in: ["admin@nova.local", "staff@nova.local", "customer@nova.local"],
        },
      },
    });
    expect(accounts).toHaveLength(3);
    const secret = process.env.SEED_DEMO_PASSWORD;
    if (!secret) throw new Error("Private seed password missing.");
    for (const account of accounts) {
      expect(await verify(account.passwordHash, secret)).toBe(true);
    }
    const movieId = seedId("movie:dune");
    const original = await prisma.movie.findUniqueOrThrow({
      where: { id: movieId },
    });
    const shows = await prisma.showtime.findMany({
      where: {
        roomId: {
          in: ["landmark-imax", "landmark-dolby", "westlake-laser"].map((key) =>
            seedId(`room:${key}`),
          ),
        },
      },
      orderBy: { id: "asc" },
    });
    await prisma.movie.update({
      where: { id: movieId },
      data: { title: "User edit preserved by seed" },
    });
    try {
      await seedDatabase(prisma);
      const after = await prisma.user.findMany({
        where: { id: { in: accounts.map((row) => row.id) } },
      });
      expect(
        accounts.every(
          (row) =>
            after.find((candidate) => candidate.id === row.id)?.passwordHash ===
            row.passwordHash,
        ),
      ).toBe(true);
      expect(
        await prisma.movie.findUnique({
          where: { id: movieId },
          select: { title: true },
        }),
      ).toEqual({ title: "User edit preserved by seed" });
      const rerun = await prisma.showtime.findMany({
        where: { id: { in: shows.map((row) => row.id) } },
        orderBy: { id: "asc" },
      });
      expect(
        rerun.map((row) => [
          row.id,
          row.startTime.toISOString(),
          row.endTime.toISOString(),
        ]),
      ).toEqual(
        shows.map((row) => [
          row.id,
          row.startTime.toISOString(),
          row.endTime.toISOString(),
        ]),
      );
      expect(rerun).toHaveLength(54);
      const rooms = await prisma.room.findMany({
        where: {
          id: {
            in: ["landmark-imax", "landmark-dolby", "westlake-laser"].map(
              (key) => seedId(`room:${key}`),
            ),
          },
        },
        include: { _count: { select: { seats: true } } },
      });
      expect(
        rooms.every(
          (room) => room.totalSeats === 160 && room._count.seats === 160,
        ),
      ).toBe(true);
      expect(
        await prisma.combo
          .findUnique({
            where: { id: seedId("combo:party69") },
            select: { price: true },
          })
          .then((row) => row?.price.toFixed(2)),
      ).toBe("69000.00");
      expect(accounts.map((row) => row.role).sort()).toEqual([
        "ADMIN",
        "CUSTOMER",
        "STAFF",
      ]);
    } finally {
      await prisma.movie.update({
        where: { id: movieId },
        data: { title: original.title },
      });
    }
  });
  it("seeds exact movie duration plus 15 minutes cleaning without overlaps", async () => {
    const rooms = ["landmark-imax", "landmark-dolby", "westlake-laser"].map(
      (key) => seedId(`room:${key}`),
    );
    const rows = await prisma.showtime.findMany({
      where: { roomId: { in: rooms } },
      include: { movie: true },
      orderBy: [{ roomId: "asc" }, { startTime: "asc" }],
    });
    expect(rows).toHaveLength(54);
    expect(
      rows.every(
        (row) =>
          row.endTime.getTime() - row.startTime.getTime() ===
          (row.movie.durationMinutes + 15) * 60000,
      ),
    ).toBe(true);
    for (const room of rooms) {
      const timeline = rows.filter((row) => row.roomId === room);
      for (let i = 1; i < timeline.length; i++) {
        const previous = timeline[i - 1];
        const next = timeline[i];
        if (!previous || !next) throw new Error("Unexpected timeline gap.");
        expect(next.startTime.getTime()).toBeGreaterThanOrEqual(
          previous.endTime.getTime(),
        );
      }
    }
  });
});
