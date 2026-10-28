import { INestApplication } from "@nestjs/common";
import { BookingStatus, Prisma } from "@prisma/client";
import Redis from "ioredis";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import request, { Response } from "supertest";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { TokenService } from "../src/modules/auth/token.service";
import { BookingMaintenanceService } from "../src/modules/bookings/booking-maintenance.service";
import { FulfillmentRelay } from "../src/modules/notifications/fulfillment-relay.service";
import { SeatEventsRelay } from "../src/realtime/seat-events-relay.service";
import { ReportsRepository } from "../src/modules/reports/reports.repository";
import { revenueFilters } from "../src/modules/reports/reports.service";
import { revenueQuery } from "../src/modules/reports/revenue-query";
interface Report {
  ticketRevenue: string;
  comboRevenue: string;
  discountAmount: string;
  netRevenue: string;
  paidBookingCount: number;
  ticketCount: number;
}
function data(response: Response): Report {
  return (JSON.parse(response.text) as { data: Report }).data;
}
function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null)
    throw new Error("Required revenue fixture is missing.");
  return value;
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
const zero: Report = {
  ticketRevenue: "0.00",
  comboRevenue: "0.00",
  discountAmount: "0.00",
  netRevenue: "0.00",
  paidBookingCount: 0,
  ticketCount: 0,
};
const one: Report = {
  ticketRevenue: "180000.00",
  comboRevenue: "138000.00",
  discountAmount: "15900.00",
  netRevenue: "302100.00",
  paidBookingCount: 1,
  ticketCount: 2,
};
describe("Phase10 ADMIN revenue on real PostgreSQL snapshots", () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let adminId: string;
  let customerId: string;
  let adminToken: string;
  let customerToken: string;
  let staffToken: string;
  const ownedUsers: string[] = [];
  const cinemas: string[] = [];
  const movies: string[] = [];
  const combos: string[] = [];
  const rooms: string[] = [];
  const prefix = `p10-${randomUUID()}`;
  const range = { from: "2040-06-15", to: "2040-06-15" };
  function report(query: object = range, auth = adminToken) {
    return request(server)
      .get("/api/v1/admin/reports/revenue")
      .auth(auth, { type: "bearer" })
      .query(query);
  }
  // Aggregation-only DB fixtures, not simulated payment/ticket acceptance. Production smoke covers the real payment writer.
  async function fixture(
    options: {
      status?: BookingStatus;
      at?: string;
      cinemaId?: string;
      movieId?: string;
      ticketAmount?: string;
      comboAmount?: string;
      discount?: string;
      seats?: number;
    } = {},
  ) {
    const room = await prisma.room.create({
      data: {
        cinemaId: options.cinemaId || required(cinemas[0]),
        name: `${prefix}-${randomUUID()}`,
        roomType: "STANDARD_2D",
        totalSeats: 3,
      },
    });
    rooms.push(room.id);
    await prisma.seat.createMany({
      data: [1, 2, 3].map((column) => ({
        roomId: room.id,
        seatRow: "A",
        seatColumn: column,
        seatType: "STANDARD",
        priceModifier: "1.00",
      })),
    });
    const seats = await prisma.seat.findMany({
      where: { roomId: room.id },
      orderBy: { seatColumn: "asc" },
    });
    const showtime = await prisma.showtime.create({
      data: {
        roomId: room.id,
        movieId: options.movieId || required(movies[0]),
        startTime: new Date("2042-01-01T10:00:00Z"),
        endTime: new Date("2042-01-01T12:15:00Z"),
        baseTicketPrice: "90000.00",
      },
    });
    const at = new Date(options.at || "2040-06-15T03:00:00Z");
    const status = options.status || "PAID";
    const ticketAmount = new Prisma.Decimal(
      options.ticketAmount || "180000.00",
    );
    const comboAmount = new Prisma.Decimal(options.comboAmount || "138000.00");
    const discount = new Prisma.Decimal(options.discount || "15900.00");
    const booking = await prisma.booking.create({
      data: {
        userId: customerId,
        showtimeId: showtime.id,
        orderCode: `NOVA-${randomUUID().replaceAll("-", "")}`,
        status,
        totalTicketAmount: ticketAmount,
        totalComboAmount: comboAmount,
        discountAmount: discount,
        finalAmount: ticketAmount.add(comboAmount).sub(discount),
        createdAt: at,
        expiredAt: new Date(at.getTime() + 300000),
      },
    });
    const seatCount = options.seats ?? 2;
    if (seatCount)
      await prisma.bookingSeat.createMany({
        data: seats.slice(0, seatCount).map((seat) => ({
          bookingId: booking.id,
          showtimeId: showtime.id,
          roomId: room.id,
          seatId: seat.id,
          price: ticketAmount.div(seatCount).toFixed(2),
          status:
            status === "PAID"
              ? "SOLD"
              : ["PENDING", "HOLDING"].includes(status)
                ? "HOLDING"
                : "AVAILABLE",
        })),
      });
    if (comboAmount.gt(0))
      await prisma.bookingCombo.createMany({
        data: combos.map((comboId) => ({
          bookingId: booking.id,
          comboId,
          quantity: 1,
          unitPrice: comboAmount.div(2).toFixed(2),
        })),
      });
    return { booking, room, seats, showtime };
  }
  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    await app.get(FulfillmentRelay).stop();
    await app.get(BookingMaintenanceService).stop();
    await app.get(SeatEventsRelay).stop();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      db: Number(process.env.REDIS_DB),
      password: process.env.REDIS_PASSWORD,
    });
    const ids: string[] = [];
    const tokens: string[] = [];
    for (const role of ["ADMIN", "CUSTOMER", "STAFF"] as const) {
      const user = await prisma.user.create({
        data: {
          role,
          email: `${prefix}-${role.toLowerCase()}@example.test`,
          passwordHash: randomBytes(32).toString("hex"),
          fullName: "Revenue fixture",
        },
      });
      ids.push(user.id);
      ownedUsers.push(user.id);
      tokens.push(
        (await app.get(TokenService).issue(user.id)).tokens.accessToken,
      );
    }
    [adminId, customerId] = ids as [string, string, string];
    [adminToken, customerToken, staffToken] = tokens as [
      string,
      string,
      string,
    ];
    for (let i = 0; i < 2; i++) {
      cinemas.push(
        (
          await prisma.cinema.create({
            data: {
              name: `${prefix}-${String(i)}`,
              address: "Fixture",
              city: prefix,
            },
          })
        ).id,
      );
      movies.push(
        (
          await prisma.movie.create({
            data: {
              title: `${prefix}-${String(i)}`,
              description: "Revenue fixture",
              durationMinutes: 120,
              ageRating: "T13",
              releaseDate: new Date("2030-01-01T00:00:00Z"),
            },
          })
        ).id,
      );
      combos.push(
        (
          await prisma.combo.create({
            data: {
              name: `${prefix}-${String(i)}`,
              description: "Snapshot combo",
              price: "69000.00",
            },
          })
        ).id,
      );
    }
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    const ids = (
      await prisma.booking.findMany({
        where: { userId: { in: ownedUsers } },
        select: { id: true },
      })
    ).map((row) => row.id);
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: { in: ids } },
    });
    await prisma.eTicket.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
    await prisma.showtime.deleteMany({ where: { roomId: { in: rooms } } });
    await prisma.seat.deleteMany({ where: { roomId: { in: rooms } } });
    await prisma.room.deleteMany({ where: { id: { in: rooms } } });
    rooms.length = 0;
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:throttle:*`,
    );
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    await prisma.cinema.deleteMany({ where: { id: { in: cinemas } } });
    await prisma.movie.deleteMany({ where: { id: { in: movies } } });
    await prisma.combo.deleteMany({ where: { id: { in: combos } } });
    await prisma.user.deleteMany({
      where: { id: { in: ownedUsers } },
    });
    await app.close();
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:*`,
    );
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });
  it("returns a stable six-field zero report without PII for an empty paid cohort", async () => {
    const response = await report().expect(200);
    expect(data(response)).toEqual(zero);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).not.toMatch(
      /email|userId|ticketHash|password|transactionCode|qrCodeBase64/,
    );
  });
  it("requires ADMIN from the current DB role, not a stale access token", async () => {
    await request(server)
      .get("/api/v1/admin/reports/revenue")
      .query(range)
      .expect(401);
    for (const auth of [customerToken, staffToken])
      await report(range, auth).expect(403);
    await prisma.user.update({
      where: { id: adminId },
      data: { role: "STAFF" },
    });
    try {
      await report().expect(403);
    } finally {
      await prisma.user.update({
        where: { id: adminId },
        data: { role: "ADMIN" },
      });
    }
    await report().expect(200);
  });
  it("includes PAID only and ignores PENDING/HOLDING/CANCELLED/EXPIRED amounts and seats", async () => {
    await fixture();
    for (const status of [
      "PENDING",
      "HOLDING",
      "CANCELLED",
      "EXPIRED",
    ] as const)
      await fixture({ status, ticketAmount: "900000.00" });
    expect(data(await report().expect(200))).toEqual(one);
  });
  it("requires strict real YYYY-MM-DD dates and an ordered range", async () => {
    const bad: object[] = [
      {},
      { from: range.from },
      { to: range.to },
      { from: "2040-02-30", to: range.to },
      { from: "2041-02-29", to: range.to },
      { from: "0000-01-01", to: range.to },
      { from: "2040-6-15", to: range.to },
      { from: range.from + "\n", to: range.to },
      { from: "2040-06-15T00:00:00Z", to: range.to },
      { from: range.from, to: "2040-06-14" },
      { ...range, from: [range.from, range.from] },
    ];
    for (const query of bad) await report(query).expect(400);
    await report().expect(200);
    await report({ from: "0001-01-01", to: "0001-01-01" }).expect(200);
    await report({ from: "9999-12-31", to: "9999-12-31" }).expect(200);
  });
  it("rejects unknown fields, invalid UUIDs and repeated filter values without interpolating SQL", async () => {
    for (const query of [
      { ...range, status: "HOLDING" },
      { ...range, cinemaId: "' OR 1=1 --" },
      { ...range, movieId: "bad" },
      { ...range, cinemaId: [required(cinemas[0]), required(cinemas[1])] },
      { ...range, from: "2040-06-15'; DROP TABLE bookings;--" },
    ])
      await report(query).expect(400);
    expect(data(await report().expect(200))).toEqual(zero);
  });
  it("uses inclusive Vietnam days with exact start/end millisecond boundaries", async () => {
    for (const at of [
      "2040-06-14T16:59:59.999Z",
      "2040-06-14T17:00:00.000Z",
      "2040-06-15T16:59:59.999Z",
      "2040-06-15T17:00:00.000Z",
    ])
      await fixture({ at });
    expect(data(await report().expect(200))).toEqual({
      ticketRevenue: "360000.00",
      comboRevenue: "276000.00",
      discountAmount: "31800.00",
      netRevenue: "604200.00",
      paidBookingCount: 2,
      ticketCount: 4,
    });
  });
  it("includes the final day across a year boundary and accepts a leap-day range", async () => {
    await fixture({ at: "2040-12-30T17:00:00Z" });
    await fixture({ at: "2041-01-01T16:59:59.999Z" });
    await fixture({ at: "2041-01-01T17:00:00Z" });
    expect(
      data(await report({ from: "2040-12-31", to: "2041-01-01" }).expect(200))
        .paidBookingCount,
    ).toBe(2);
    await fixture({ at: "2040-02-28T17:00:00Z" });
    expect(
      data(await report({ from: "2040-02-29", to: "2040-02-29" }).expect(200))
        .paidBookingCount,
    ).toBe(1);
  });
  it("filters cinema/movie independently or together with AND and accepts uppercase UUIDs", async () => {
    await fixture();
    await fixture({ movieId: required(movies[1]) });
    await fixture({ cinemaId: required(cinemas[1]) });
    await fixture({
      cinemaId: required(cinemas[1]),
      movieId: required(movies[1]),
    });
    expect(
      data(
        await report({ ...range, cinemaId: required(cinemas[0]) }).expect(200),
      ).paidBookingCount,
    ).toBe(2);
    expect(
      data(await report({ ...range, movieId: required(movies[0]) }).expect(200))
        .paidBookingCount,
    ).toBe(2);
    expect(
      data(
        await report({
          ...range,
          cinemaId: required(cinemas[0]).toUpperCase(),
          movieId: required(movies[0]).toUpperCase(),
        }).expect(200),
      ),
    ).toEqual(one);
  });
  it("returns zeros for unknown valid filter IDs or a known but empty cinema/movie pair", async () => {
    await fixture();
    await fixture({
      cinemaId: required(cinemas[1]),
      movieId: required(movies[1]),
    });
    for (const query of [
      { ...range, cinemaId: randomUUID() },
      { ...range, movieId: randomUUID() },
      {
        ...range,
        cinemaId: required(cinemas[0]),
        movieId: required(movies[1]),
      },
    ])
      expect(data(await report(query).expect(200))).toEqual(zero);
  });
  it("uses booking creation date even when payment creation and showtime fall in other periods", async () => {
    const f = await fixture();
    await prisma.payment.create({
      data: {
        bookingId: f.booking.id,
        transactionCode: `fixture-${randomUUID()}`,
        amount: f.booking.finalAmount,
        status: "SUCCESS",
        createdAt: new Date("2040-07-01T00:00:00Z"),
      },
    });
    expect(data(await report().expect(200))).toEqual(one);
    expect(
      data(await report({ from: "2040-07-01", to: "2040-07-01" }).expect(200)),
    ).toEqual(zero);
    expect(
      data(await report({ from: "2042-01-01", to: "2042-01-01" }).expect(200)),
    ).toEqual(zero);
  });
  it("never multiplies money by seat/combo/payment joins and counts SOLD rows rather than QR rows", async () => {
    const f = await fixture();
    await prisma.bookingSeat.create({
      data: {
        bookingId: f.booking.id,
        showtimeId: f.showtime.id,
        roomId: f.room.id,
        seatId: required(f.seats[0]).id,
        price: "90000.00",
        status: "AVAILABLE",
      },
    });
    for (const status of ["PENDING", "FAILED", "SUCCESS"] as const)
      await prisma.payment.create({
        data: {
          bookingId: f.booking.id,
          transactionCode: `fixture-${randomUUID()}`,
          amount: f.booking.finalAmount,
          status,
        },
      });
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(0);
    expect(data(await report().expect(200))).toEqual(one);
  });
  it("does not recalculate history from changed catalog, line prices or membership", async () => {
    const f = await fixture();
    await prisma.showtime.update({
      where: { id: f.showtime.id },
      data: { baseTicketPrice: "999999.99" },
    });
    await prisma.combo.updateMany({
      where: { id: { in: combos } },
      data: { price: "123456.78" },
    });
    await prisma.user.update({
      where: { id: customerId },
      data: { cMemberTier: "DIAMOND" },
    });
    expect(data(await report().expect(200))).toEqual(one);
  });
  it("sums fractional VND exactly without floating-point arithmetic", async () => {
    await fixture({
      ticketAmount: "0.10",
      comboAmount: "0.10",
      discount: "0.01",
    });
    await fixture({
      ticketAmount: "0.20",
      comboAmount: "0.20",
      discount: "0.02",
    });
    expect(data(await report().expect(200))).toEqual({
      ticketRevenue: "0.30",
      comboRevenue: "0.30",
      discountAmount: "0.03",
      netRevenue: "0.57",
      paidBookingCount: 2,
      ticketCount: 4,
    });
  });
  it("aggregates10000 numeric snapshots beyond Number.MAX_SAFE_INTEGER without losing cents", async () => {
    const f = await fixture({
      seats: 0,
      ticketAmount: "999999999999.99",
      comboAmount: "0.00",
      discount: "0.00",
    });
    for (let batch = 0; batch < 4; batch++)
      await prisma.booking.createMany({
        data: Array.from({ length: batch === 0 ? 2499 : 2500 }, () => ({
          userId: customerId,
          showtimeId: f.showtime.id,
          orderCode: `NOVA-${randomUUID().replaceAll("-", "")}`,
          status: "PAID",
          totalTicketAmount: "999999999999.99",
          finalAmount: "999999999999.99",
          createdAt: f.booking.createdAt,
          expiredAt: f.booking.expiredAt,
        })),
      });
    expect(data(await report().expect(200))).toEqual({
      ticketRevenue: "9999999999999900.00",
      comboRevenue: "0.00",
      discountAmount: "0.00",
      netRevenue: "9999999999999900.00",
      paidBookingCount: 10000,
      ticketCount: 0,
    });
  });
  it("does not observe uncommitted PAID/SOLD transitions and reads both after the transaction commits", async () => {
    const f = await fixture({ status: "HOLDING" });
    const entered = gate();
    const release = gate();
    const pending = prisma.$transaction(
      async (tx) => {
        await tx.booking.update({
          where: { id: f.booking.id },
          data: {
            status: "PAID",
            seats: {
              updateMany: {
                where: { status: "HOLDING" },
                data: { status: "SOLD" },
              },
            },
          },
        });
        entered.release();
        await release.promise;
      },
      { timeout: 10000 },
    );
    try {
      await entered.promise;
      expect(data(await report().expect(200))).toEqual(zero);
    } finally {
      release.release();
      await pending;
    }
    expect(data(await report().expect(200))).toEqual(one);
  });
  it("never reports a rolled-back state transition", async () => {
    const f = await fixture({ status: "HOLDING" });
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: f.booking.id },
          data: {
            status: "PAID",
            seats: {
              updateMany: {
                where: { status: "HOLDING" },
                data: { status: "SOLD" },
              },
            },
          },
        });
        throw new Error("owned-rollback");
      }),
    ).rejects.toThrow("owned-rollback");
    expect(data(await report().expect(200))).toEqual(zero);
  });
  it("uses existing report/seat indexes when eligible without adding duplicate indexes or global planner changes", async () => {
    await fixture();
    const definitions = await prisma.$queryRaw<
      Array<{ indexname: string; indexdef: string }>
    >`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename IN ('bookings','booking_seats','showtimes','rooms')`;
    expect(
      definitions.find(
        (row) => row.indexname === "bookings_status_created_at_showtime_id_idx",
      )?.indexdef,
    ).toContain("(status, created_at, showtime_id)");
    expect(
      definitions.some(
        (row) => row.indexname === "booking_seats_booking_id_idx",
      ),
    ).toBe(true);
    const plan = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
      return tx.$queryRaw(
        Prisma.sql`EXPLAIN (FORMAT JSON) ${revenueQuery(revenueFilters({ ...range, cinemaId: required(cinemas[0]), movieId: required(movies[0]) }))}`,
      );
    });
    // A selective movie/showtime join can legitimately choose the existing
    // showtime FK index instead of the status/date index on a small fixture.
    expect(JSON.stringify(plan)).toMatch(
      /bookings_status_created_at_showtime_id_idx|bookings_showtime_id_idx/,
    );
    expect(JSON.stringify(plan)).toMatch(
      /booking_seats_booking_id_idx|uq_active_showtime_seat/,
    );
  });
  it("masks database failures without returning sensitive diagnostic details", async () => {
    jest
      .spyOn(app.get(ReportsRepository), "revenue")
      .mockRejectedValueOnce(new Error("private-report-diagnostic"));
    const response = await report().expect(500);
    expect(response.text).not.toContain("private-report-diagnostic");
    expect(JSON.parse(response.text)).toMatchObject({
      success: false,
      error: "INTERNAL_ERROR",
    });
  });
  it("documents required dates, optional UUID filters and the exact six-field response schema", async () => {
    const spec = JSON.parse(
      (await request(server).get("/api/docs-json").expect(200)).text,
    ) as {
      paths: Record<
        string,
        {
          get?: {
            security?: unknown;
            parameters: Array<{ name: string; required: boolean }>;
            responses: Record<string, unknown>;
          };
        }
      >;
      components: {
        schemas: Record<
          string,
          { properties: Record<string, { type: string }> }
        >;
      };
    };
    const operation = required(
      spec.paths["/api/v1/admin/reports/revenue"]?.get,
    );
    expect(operation.security).toEqual([{ bearer: [] }]);
    expect(
      operation.parameters
        .filter((parameter) => parameter.required)
        .map((parameter) => parameter.name)
        .sort(),
    ).toEqual(["from", "to"]);
    expect(
      operation.parameters.map((parameter) => parameter.name).sort(),
    ).toEqual(["cinemaId", "from", "movieId", "to"]);
    expect(operation.responses).toHaveProperty("403");
    const fields = required(
      spec.components.schemas.RevenueReportDto,
    ).properties;
    expect(Object.keys(fields).sort()).toEqual(Object.keys(zero).sort());
    for (const field of [
      "ticketRevenue",
      "comboRevenue",
      "discountAmount",
      "netRevenue",
    ])
      expect(fields[field]?.type).toBe("string");
  });
});
