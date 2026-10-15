import { INestApplication } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { hash } from "argon2";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import request, { Response } from "supertest";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { RedisService } from "../src/redis/redis.service";
import { TokenService } from "../src/modules/auth/token.service";
import { BookingMaintenanceService } from "../src/modules/bookings/booking-maintenance.service";
import { BookingsRepository } from "../src/modules/bookings/bookings.repository";
import { SeatLockService } from "../src/modules/bookings/seat-lock.service";
import { ExpiryOutboxRelay } from "../src/queues/outbox/expiry-outbox-relay.service";
import {
  EXPIRATION_REQUESTED,
  OutboxRepository,
} from "../src/queues/outbox/outbox.repository";
import {
  SeatExpirationQueueService,
  ExpirationPayload,
} from "../src/queues/seat-expiration/seat-expiration-queue.service";
import { SeatExpirationProcessor } from "../src/queues/seat-expiration/seat-expiration.processor";
import { SeatEventsRelay } from "../src/realtime/seat-events-relay.service";

interface Booking {
  id: string;
  showtimeId: string;
  orderCode: string;
  status: string;
  expiredAt: string;
  createdAt: string;
  updatedAt: string;
  totalTicketAmount: string;
  totalComboAmount: string;
  discountAmount: string;
  finalAmount: string;
  baseTicketPrice: string | null;
  membershipTier: string | null;
  discountRate: string | null;
  seats: Array<{ seatId: string; status: string; price: string }>;
  combos: Array<{ comboId: string; quantity: number; unitPrice: string }>;
}
interface Listing {
  items: Booking[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
function data(response: Response): unknown {
  const body = JSON.parse(response.text) as { success: boolean; data: unknown };
  expect(body.success).toBe(true);
  return body.data;
}
function booking(response: Response): Booking {
  return data(response) as Booking;
}
function code(response: Response): string {
  return (JSON.parse(response.text) as { error: string }).error;
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function eventually(check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Expected database/queue state did not arrive.");
}

describe("Phase 6 BR01/02/04/05 and TC-01, two real API instances", () => {
  let app: INestApplication;
  let otherApp: INestApplication;
  let server: Server;
  let otherServer: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let queue: Queue<ExpirationPayload, void>;
  let customerA: string;
  let customerB: string;
  let admin: string;
  let staff: string;
  let userA: string;
  let userB: string;
  const prefix = `p6-${randomUUID()}`;
  const namespace = () => process.env.BULLMQ_PREFIX || "invalid";
  async function fixture(price = "90000.00", start = "2042-01-01T10:00:00Z") {
    const movie = await prisma.movie.create({
      data: {
        title: `${prefix}-${randomUUID()}`,
        description: "Booking fixture",
        durationMinutes: 120,
        ageRating: "T13",
        releaseDate: new Date("2041-01-01T00:00:00Z"),
      },
    });
    const cinema = await prisma.cinema.create({
      data: {
        name: `${prefix}-${randomUUID()}`,
        address: "Fixture",
        city: prefix,
      },
    });
    const room = await prisma.room.create({
      data: {
        cinemaId: cinema.id,
        name: prefix,
        roomType: "DOLBY_ATMOS",
        totalSeats: 24,
      },
    });
    await prisma.seat.createMany({
      data: Array.from({ length: 24 }, (_, index) => ({
        roomId: room.id,
        seatRow: "A",
        seatColumn: index + 1,
        seatType: index === 1 ? "VIP" : index === 2 ? "SWEETBOX" : "STANDARD",
        priceModifier: index === 1 ? "1.20" : index === 2 ? "1.50" : "1.00",
      })),
    });
    const seats = await prisma.seat.findMany({
      where: { roomId: room.id },
      orderBy: { seatColumn: "asc" },
    });
    const showtime = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        roomId: room.id,
        startTime: new Date(start),
        endTime: new Date(new Date(start).getTime() + 135 * 60000),
        baseTicketPrice: price,
      },
    });
    return { movie, room, seats, showtime };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  function seat(f: Fixture, index = 0): string {
    const row = f.seats[index];
    if (!row) throw new Error("Fixture seat missing.");
    return row.id;
  }
  function input(f: Fixture, ids = [seat(f)]) {
    return { showtimeId: f.showtime.id, seatIds: ids };
  }
  function hold(
    f: Fixture,
    token = customerA,
    ids = [seat(f)],
    target = server,
  ) {
    return request(target)
      .post("/api/v1/bookings/hold")
      .auth(token, { type: "bearer" })
      .send(input(f, ids));
  }
  function get(id: string, token = customerA) {
    return request(server)
      .get(`/api/v1/bookings/${id}`)
      .auth(token, { type: "bearer" });
  }
  function cancel(id: string, token = customerA) {
    return request(server)
      .post(`/api/v1/bookings/${id}/cancel`)
      .auth(token, { type: "bearer" });
  }
  async function combo(price = "69000.00") {
    return prisma.combo.create({
      data: {
        name: `${prefix}-${randomUUID()}`,
        description: "Party Combo fixture",
        price,
        isActive: true,
      },
    });
  }
  async function expireFixture(id: string) {
    await prisma.booking.update({
      where: { id },
      data: {
        createdAt: new Date(Date.now() - 301000),
        expiredAt: new Date(Date.now() - 1000),
      },
    });
  }
  async function runJob(id: string) {
    const job = await queue.add(
      "expire-booking-hold",
      { bookingId: id },
      { jobId: `test-${randomUUID()}` },
    );
    await eventually(async () => (await job.getState()) === "completed");
    return job;
  }
  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    await app.get(BookingMaintenanceService).stop();
    await app.get(SeatEventsRelay).stop();
    otherApp = await createApplication({ logger: false });
    await otherApp.listen(0, "127.0.0.1");
    await otherApp.get(BookingMaintenanceService).stop();
    await otherApp.get(SeatEventsRelay).stop();
    server = app.getHttpServer() as Server;
    otherServer = otherApp.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    queue = app.get<Queue<ExpirationPayload, void>>(
      getQueueToken("seat-expiration"),
    );
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      db: Number(process.env.REDIS_DB),
      ...(process.env.REDIS_PASSWORD
        ? { password: process.env.REDIS_PASSWORD }
        : {}),
    });
    const passwordHash = await hash(randomBytes(24).toString("hex"), {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    for (const label of ["a", "b", "admin", "staff"] as const) {
      const role =
        label === "admin" ? "ADMIN" : label === "staff" ? "STAFF" : "CUSTOMER";
      const user = await prisma.user.create({
        data: {
          email: `${prefix}-${label}@example.test`,
          passwordHash,
          fullName: "Booking fixture",
          role,
        },
      });
      const token = (await app.get(TokenService).issue(user.id)).tokens
        .accessToken;
      if (label === "a") {
        customerA = token;
        userA = user.id;
      } else if (label === "b") {
        customerB = token;
        userB = user.id;
      } else if (label === "admin") admin = token;
      else staff = token;
    }
  });
  beforeEach(async () => {
    await app.get(ExpiryOutboxRelay).flush();
  });
  afterEach(async () => {
    await prisma.user.updateMany({
      where: { id: { in: [userA, userB] } },
      data: { cMemberTier: "SILVER" },
    });
    const keys = await redis.keys(`${namespace()}:throttle:*`);
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    await app.get(BookingMaintenanceService).stop();
    await otherApp.get(BookingMaintenanceService).stop();
    await app.get(SeatExpirationProcessor).worker.pause();
    await otherApp.get(SeatExpirationProcessor).worker.pause();
    const users = await prisma.user.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });
    const userIds = users.map((row) => row.id);
    const bookings = await prisma.booking.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const ids = bookings.map((row) => row.id);
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: { in: ids } },
    });
    await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
    await prisma.showtime.deleteMany({
      where: { movie: { title: { startsWith: prefix } } },
    });
    await prisma.seat.deleteMany({
      where: { room: { cinema: { name: { startsWith: prefix } } } },
    });
    await prisma.room.deleteMany({
      where: { cinema: { name: { startsWith: prefix } } },
    });
    await prisma.cinema.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.movie.deleteMany({ where: { title: { startsWith: prefix } } });
    await prisma.combo.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await otherApp.close();
    await app.close();
    const keys = await redis.keys(`${namespace()}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("requires authentication and exposes only the current user's bookings", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    for (const path of [
      "/api/v1/bookings/me",
      `/api/v1/bookings/${created.id}`,
    ])
      await request(server).get(path).expect(401);
    await request(server)
      .post("/api/v1/bookings/hold")
      .send(input(f))
      .expect(401);
    await request(server)
      .post(`/api/v1/bookings/${created.id}/cancel`)
      .expect(401);
    for (const token of [customerB, staff, admin]) {
      expect(code(await get(created.id, token).expect(404))).toBe(
        "BOOKING_NOT_FOUND",
      );
      await cancel(created.id, token).expect(404);
    }
    const listed = data(
      await request(server)
        .get("/api/v1/bookings/me")
        .auth(customerA, { type: "bearer" })
        .query({ status: "HOLDING", limit: 1 })
        .expect(200),
    ) as Listing;
    expect(listed.items.map((item) => item.id)).toContain(created.id);
    expect(JSON.stringify(created)).not.toMatch(
      /password|email|requestHash|idempotencyKey|userId/,
    );
  });

  it("stores a fixed 300000ms deadline, Decimal prices for all seat types and combo snapshots", async () => {
    const f = await fixture();
    const party = await combo();
    const result = booking(
      await request(server)
        .post("/api/v1/bookings/hold")
        .auth(customerA, { type: "bearer" })
        .send({
          ...input(
            f,
            f.seats.slice(0, 3).map((row) => row.id),
          ),
          comboItems: [{ comboId: party.id, quantity: 2 }],
        })
        .expect(201),
    );
    expect(
      new Date(result.expiredAt).getTime() -
        new Date(result.createdAt).getTime(),
    ).toBe(300000);
    expect(result).toMatchObject({
      status: "HOLDING",
      totalTicketAmount: "333000.00",
      totalComboAmount: "138000.00",
      discountAmount: "23550.00",
      finalAmount: "447450.00",
      baseTicketPrice: "90000.00",
      membershipTier: "SILVER",
      discountRate: "0.050",
    });
    expect(result.seats.map((row) => row.price).sort()).toEqual([
      "108000.00",
      "135000.00",
      "90000.00",
    ]);
    expect(result.combos).toEqual([
      { comboId: party.id, quantity: 2, unitPrice: "69000.00" },
    ]);
    await prisma.combo.update({
      where: { id: party.id },
      data: { price: "99000.00", isActive: false },
    });
    await prisma.user.update({
      where: { id: userA },
      data: { cMemberTier: "DIAMOND" },
    });
    expect(booking(await get(result.id).expect(200))).toEqual(result);
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: result.id } }),
    ).toBe(2);
  });

  it("loads GOLD/DIAMOND discounts from DB and leaves points unchanged", async () => {
    for (const [tier, finalAmount] of [
      ["GOLD", "83700.00"],
      ["DIAMOND", "81000.00"],
    ] as const) {
      await prisma.user.update({
        where: { id: userA },
        data: { cMemberTier: tier },
      });
      const f = await fixture();
      expect(booking(await hold(f).expect(201))).toMatchObject({
        membershipTier: tier,
        finalAmount,
      });
    }
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userA } }))
        .cMemberPoints,
    ).toBe(0);
  });

  it("TC-01: two instances and users request one seat simultaneously; exactly one succeeds", async () => {
    const f = await fixture();
    const settled = await Promise.allSettled([
      hold(f).then((response) => response),
      hold(f, customerB, [seat(f)], otherServer).then((response) => response),
    ]);
    expect(settled.every((row) => row.status === "fulfilled")).toBe(true);
    const responses = settled.flatMap((row) =>
      row.status === "fulfilled" ? [row.value] : [],
    );
    expect(responses.map((row) => row.status).sort()).toEqual([201, 409]);
    for (const response of responses.filter((row) => row.status === 409))
      expect(code(response)).toBe("SEAT_UNAVAILABLE");
    expect(
      await prisma.bookingSeat.count({
        where: {
          showtimeId: f.showtime.id,
          seatId: seat(f),
          status: { in: ["HOLDING", "SOLD"] },
        },
      }),
    ).toBe(1);
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(1);
  });

  it("rejects an overlapping multi-seat request atomically without reserving its other seats", async () => {
    const f = await fixture();
    const responses = await Promise.all([
      hold(f, customerA, [seat(f), seat(f, 1)]),
      hold(f, customerB, [seat(f, 1), seat(f, 2)], otherServer),
    ]);
    expect(responses.map((row) => row.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.bookingSeat.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(2);
    expect(
      await redis.keys(`${namespace()}:seat-lock:{${f.showtime.id}}:*`),
    ).toEqual([]);
  });

  it("allows disjoint seats concurrently and up to 20 seats in one booking", async () => {
    const f = await fixture();
    const results = await Promise.all([
      hold(f, customerA, [seat(f)]),
      hold(f, customerB, [seat(f, 1)], otherServer),
    ]);
    expect(results.map((row) => row.status)).toEqual([201, 201]);
    const another = await fixture();
    expect(
      booking(
        await hold(
          another,
          customerA,
          another.seats.slice(0, 20).map((row) => row.id),
        ).expect(201),
      ).seats,
    ).toHaveLength(20);
  });

  it("validates nested DTOs, IDs, duplicates, counts, quantities and rejects client pricing/state", async () => {
    const f = await fixture();
    const party = await combo();
    const invalid: Array<Record<string, unknown>> = [
      { seatIds: [] },
      { seatIds: f.seats.slice(0, 21).map((row) => row.id) },
      { seatIds: [seat(f), seat(f).toUpperCase()] },
      { seatIds: null },
      { seatIds: [null] },
      { seatIds: ["bad"] },
      { showtimeId: "bad" },
      { comboItems: null },
      { comboItems: [null] },
      { comboItems: [1] },
      { comboItems: {} },
      { comboItems: [{ comboId: party.id, quantity: 0 }] },
      { comboItems: [{ comboId: party.id, quantity: 21 }] },
      { comboItems: [{ comboId: party.id, quantity: 1.5 }] },
      { comboItems: [{ comboId: party.id, quantity: "1" }] },
      { comboItems: [{ comboId: party.id, quantity: 1, unitPrice: "1" }] },
      {
        comboItems: [
          { comboId: party.id, quantity: 1 },
          { comboId: party.id.toUpperCase(), quantity: 1 },
        ],
      },
      { finalAmount: "1" },
      { status: "PAID" },
      { expiredAt: "2043-01-01T00:00:00Z" },
      { userId: userB },
    ];
    for (const changes of invalid)
      expect(
        code(
          await request(server)
            .post("/api/v1/bookings/hold")
            .auth(customerA, { type: "bearer" })
            .send({ ...input(f), ...changes })
            .expect(400),
        ),
      ).toBe("VALIDATION_ERROR");
    await request(server)
      .post("/api/v1/bookings/hold")
      .auth(customerA, { type: "bearer" })
      .set("Idempotency-Key", "bad")
      .send(input(f))
      .expect(400);
    await get("bad").expect(400);
    await get(randomUUID()).expect(404);
    await request(server)
      .get("/api/v1/bookings/me")
      .auth(customerA, { type: "bearer" })
      .query({ userId: userB })
      .expect(400);
    await request(server)
      .get("/api/v1/bookings/me")
      .auth(customerA, { type: "bearer" })
      .query({ status: "bad", limit: 101 })
      .expect(400);
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(0);
  });

  it("rejects a foreign-room/missing seat, missing showtime, inactive/missing combo and started showtime", async () => {
    const f = await fixture();
    const foreign = await fixture();
    expect(code(await hold(f, customerA, [seat(foreign)]).expect(400))).toBe(
      "SEATS_NOT_IN_ROOM",
    );
    await hold(f, customerA, [randomUUID()]).expect(400);
    expect(
      code(
        await request(server)
          .post("/api/v1/bookings/hold")
          .auth(customerA, { type: "bearer" })
          .send({ ...input(f), showtimeId: randomUUID() })
          .expect(404),
      ),
    ).toBe("SHOWTIME_NOT_FOUND");
    const party = await combo();
    await prisma.combo.update({
      where: { id: party.id },
      data: { isActive: false },
    });
    for (const id of [party.id, randomUUID()])
      expect(
        code(
          await request(server)
            .post("/api/v1/bookings/hold")
            .auth(customerA, { type: "bearer" })
            .send({ ...input(f), comboItems: [{ comboId: id, quantity: 1 }] })
            .expect(400),
        ),
      ).toBe("COMBO_UNAVAILABLE");
    const past = await fixture("90000.00", "2020-01-01T10:00:00Z");
    expect(code(await hold(past).expect(409))).toBe("SHOWTIME_STARTED");
    expect(
      await prisma.booking.count({
        where: { showtimeId: { in: [f.showtime.id, past.showtime.id] } },
      }),
    ).toBe(0);
  });

  it("rejects Decimal overflow before persisting any partial booking", async () => {
    const f = await fixture("999999999999.99");
    expect(code(await hold(f, customerA, [seat(f, 1)]).expect(400))).toBe(
      "BOOKING_AMOUNT_OUT_OF_RANGE",
    );
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(0);
    const valid = booking(await hold(f).expect(201));
    expect(valid.finalAmount).toBe("949999999999.99");
  });

  it("replays equivalent Idempotency-Key bodies across instances without extending the hold", async () => {
    const f = await fixture();
    const one = await combo();
    const two = await combo("1.25");
    const key = randomUUID();
    const payload = {
      ...input(f, [seat(f), seat(f, 1)]),
      comboItems: [
        { comboId: one.id, quantity: 1 },
        { comboId: two.id, quantity: 2 },
      ],
    };
    const first = booking(
      await request(server)
        .post("/api/v1/bookings/hold")
        .auth(customerA, { type: "bearer" })
        .set("Idempotency-Key", key)
        .send(payload)
        .expect(201),
    );
    const replay = booking(
      await request(otherServer)
        .post("/api/v1/bookings/hold")
        .auth(customerA, { type: "bearer" })
        .set("Idempotency-Key", key.toUpperCase())
        .send({
          showtimeId: f.showtime.id.toUpperCase(),
          seatIds: [...payload.seatIds].reverse().map((id) => id.toUpperCase()),
          comboItems: [
            { quantity: 2, comboId: two.id.toUpperCase() },
            { quantity: 1, comboId: one.id },
          ],
        })
        .expect(201),
    );
    expect(replay).toEqual(first);
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(1);
    expect(
      code(
        await request(server)
          .post("/api/v1/bookings/hold")
          .auth(customerA, { type: "bearer" })
          .set("Idempotency-Key", key)
          .send(input(f))
          .expect(409),
      ),
    ).toBe("IDEMPOTENCY_CONFLICT");
    await cancel(first.id).expect(200);
    expect(
      booking(
        await request(server)
          .post("/api/v1/bookings/hold")
          .auth(customerA, { type: "bearer" })
          .set("Idempotency-Key", key)
          .send(payload)
          .expect(201),
      ).status,
    ).toBe("CANCELLED");
  });

  it("serializes five concurrent identical idempotency requests into one booking", async () => {
    const f = await fixture();
    const key = randomUUID();
    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        request(index % 2 ? otherServer : server)
          .post("/api/v1/bookings/hold")
          .auth(customerA, { type: "bearer" })
          .set("Idempotency-Key", key)
          .send(input(f)),
      ),
    );
    expect(responses.map((row) => row.status)).toEqual([
      201, 201, 201, 201, 201,
    ]);
    expect(new Set(responses.map((row) => booking(row).id)).size).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: booking(responses[0] as Response).id },
      }),
    ).toBe(2);
  });

  it("cancels atomically and idempotently, preserves seat history and permits a new owner", async () => {
    const f = await fixture();
    const old = booking(await hold(f).expect(201));
    const result = booking(await cancel(old.id).expect(200));
    expect(result.status).toBe("CANCELLED");
    expect(result.seats[0]?.status).toBe("AVAILABLE");
    expect(booking(await cancel(old.id).expect(200))).toEqual(result);
    const successor = booking(await hold(f, customerB).expect(201));
    expect(successor.id).not.toBe(old.id);
    expect(
      await prisma.bookingSeat.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(2);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: old.id, eventType: "seat_released" },
      }),
    ).toBe(1);
    await runJob(old.id);
    expect(
      (
        await prisma.bookingSeat.findFirstOrThrow({
          where: { bookingId: successor.id },
        })
      ).status,
    ).toBe("HOLDING");
  });

  it("lazily expires stale holds during another user's hold even without queue delivery", async () => {
    const f = await fixture();
    const old = booking(await hold(f).expect(201));
    await expireFixture(old.id);
    const replacement = booking(await hold(f, customerB).expect(201));
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: old.id } }))
        .status,
    ).toBe("EXPIRED");
    expect(
      (
        await prisma.bookingSeat.findFirstOrThrow({
          where: { bookingId: old.id },
        })
      ).status,
    ).toBe("AVAILABLE");
    expect(replacement.status).toBe("HOLDING");
  });

  it("expires an overdue own booking on GET/list and cancellation returns EXPIRED", async () => {
    const f = await fixture();
    const a = booking(await hold(f).expect(201));
    await expireFixture(a.id);
    expect(booking(await get(a.id).expect(200)).status).toBe("EXPIRED");
    const b = booking(await hold(f, customerA, [seat(f, 1)]).expect(201));
    await expireFixture(b.id);
    const listed = data(
      await request(server)
        .get("/api/v1/bookings/me")
        .auth(customerA, { type: "bearer" })
        .query({ status: "EXPIRED" })
        .expect(200),
    ) as Listing;
    expect(listed.items.map((row) => row.id)).toContain(b.id);
    const c = booking(await hold(f, customerA, [seat(f, 2)]).expect(201));
    await expireFixture(c.id);
    expect(booking(await cancel(c.id).expect(200)).status).toBe("EXPIRED");
  });

  it("runs the real delayed-job processor, reschedules early jobs and never extends expiredAt", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    const early = await queue.add(
      "expire-booking-hold",
      { bookingId: created.id },
      { jobId: `early-${randomUUID()}` },
    );
    await eventually(async () => (await early.getState()) === "delayed");
    expect(
      (
        await prisma.booking.findUniqueOrThrow({ where: { id: created.id } })
      ).expiredAt.toISOString(),
    ).toBe(created.expiredAt);
    await expireFixture(created.id);
    await Promise.all([runJob(created.id), runJob(created.id)]);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("EXPIRED");
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: created.id, eventType: "seat_released" },
      }),
    ).toBe(1);
    expect(
      (
        await prisma.bookingSeat.findFirstOrThrow({
          where: { bookingId: created.id },
        })
      ).status,
    ).toBe("AVAILABLE");
  });

  it("protects a PAID/SOLD booking from cancellation, repeated jobs and lazy expiry", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    await expireFixture(created.id);
    // Database fixture only; payment webhook/points/tickets are Phase 8/9, not simulated API acceptance.
    await prisma.booking.update({
      where: { id: created.id },
      data: {
        status: "PAID",
        seats: { updateMany: { where: {}, data: { status: "SOLD" } } },
      },
    });
    expect(code(await cancel(created.id).expect(409))).toBe(
      "BOOKING_NOT_CANCELLABLE",
    );
    await Promise.all([runJob(created.id), runJob(created.id)]);
    expect(booking(await get(created.id).expect(200))).toMatchObject({
      status: "PAID",
      seats: [{ seatId: seat(f), status: "SOLD" }],
    });
    expect(code(await hold(f, customerB).expect(409))).toBe("SEAT_UNAVAILABLE");
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: created.id, eventType: "seat_released" },
      }),
    ).toBe(0);
  });

  it("serializes simultaneous cancel and expiry and emits one durable release event", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    await expireFixture(created.id);
    await Promise.all([
      cancel(created.id).expect(200),
      runJob(created.id),
      runJob(created.id),
    ]);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("EXPIRED");
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: created.id, eventType: "seat_released" },
      }),
    ).toBe(1);
    await hold(f, customerB).expect(201);
  });

  it("recovers a pending outbox event after a queue publish failure and uses a stable job ID", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    const schedule = jest
      .spyOn(app.get(SeatExpirationQueueService), "schedule")
      .mockRejectedValue(new Error("private queue credential diagnostic"));
    await app.get(ExpiryOutboxRelay).flush();
    schedule.mockRestore();
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: created.id, eventType: EXPIRATION_REQUESTED },
    });
    expect(event.processedAt).toBeNull();
    expect(event.lastError).toBe("EXPIRATION_QUEUE_UNAVAILABLE");
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("HOLDING");
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { availableAt: new Date(Date.now() - 1) },
    });
    await app.get(ExpiryOutboxRelay).flush();
    expect(
      (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } }))
        .processedAt,
    ).not.toBeNull();
    const job = await queue.getJob(`booking-expire-${created.id}`);
    expect(job).toBeDefined();
    expect(job?.data).toEqual({ bookingId: created.id });
    expect(await job?.getState()).toBe("delayed");
    const domain = await prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: created.id, eventType: "seat_locked" },
    });
    expect(domain.processedAt).toBeNull(); // Phase 7 owns WebSocket delivery.
    expect(JSON.stringify(domain.payload)).not.toMatch(
      /email|userId|price|token/,
    );
  });

  it("reclaims a stale outbox lease once across two relays and recovers jobs lost during downtime", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: created.id, eventType: EXPIRATION_REQUESTED },
    });
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        lockedAt: new Date(Date.now() - 31000),
        lockedBy: "crashed-relay",
      },
    });
    await Promise.all([
      app.get(ExpiryOutboxRelay).flush(),
      otherApp.get(ExpiryOutboxRelay).flush(),
    ]);
    expect(await queue.getJob(`booking-expire-${created.id}`)).toBeDefined();
    const claimed = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(claimed.attempts).toBe(1);
    expect(claimed.lockedBy).toBeNull();
    expect(claimed.processedAt).not.toBeNull();
    await (await queue.getJob(`booking-expire-${created.id}`))?.remove();
    await expireFixture(created.id);
    await app.get(BookingMaintenanceService).runOnce(true);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("EXPIRED");
  });

  it("rolls back booking, seats, combos and outbox on an internal persistence failure", async () => {
    const f = await fixture();
    const party = await combo();
    const key = randomUUID();
    const outbox = app.get(OutboxRepository);
    const original = outbox.add.bind(outbox);
    let attemptedId: string | undefined;
    const spy = jest
      .spyOn(outbox, "add")
      .mockImplementationOnce((type, id, payload, tx) => {
        attemptedId = id;
        return original(type, id, payload, tx);
      })
      .mockRejectedValueOnce(
        new Error("private database credential diagnostic"),
      );
    const response = await request(server)
      .post("/api/v1/bookings/hold")
      .auth(customerA, { type: "bearer" })
      .set("Idempotency-Key", key)
      .send({ ...input(f), comboItems: [{ comboId: party.id, quantity: 1 }] })
      .expect(500);
    expect(response.text).not.toContain("private database");
    spy.mockRestore();
    if (!attemptedId) throw new Error("First outbox INSERT was not exercised.");
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: attemptedId } }),
    ).toBe(0);
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(0);
    expect(
      await prisma.bookingSeat.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(0);
    expect(
      await prisma.bookingCombo.count({ where: { comboId: party.id } }),
    ).toBe(0);
    expect(
      await redis.keys(`${namespace()}:seat-lock:{${f.showtime.id}}:*`),
    ).toEqual([]);
    await request(server)
      .post("/api/v1/bookings/hold")
      .auth(customerA, { type: "bearer" })
      .set("Idempotency-Key", key)
      .send(input(f))
      .expect(201);
  });

  it("keeps PostgreSQL as the final barrier when a writer bypasses Redis and wins after the precheck", async () => {
    const f = await fixture();
    const ready = gate();
    const release = gate();
    const repository = app.get(BookingsRepository);
    const original = repository.activeSeat.bind(repository);
    const spy = jest
      .spyOn(repository, "activeSeat")
      .mockImplementationOnce(async (...args) => {
        const result = await original(...args);
        ready.release();
        await release.promise;
        return result;
      });
    const pending = hold(f, customerA, [seat(f), seat(f, 1)]).then(
      (response) => response,
    );
    await ready.promise;
    try {
      await prisma.$transaction(async (tx) => {
        const winner = await tx.booking.create({
          data: {
            userId: userB,
            showtimeId: f.showtime.id,
            orderCode: `sql-${randomUUID()}`,
            status: "HOLDING",
            expiredAt: new Date(Date.now() + 300000),
          },
        });
        await tx.bookingSeat.create({
          data: {
            bookingId: winner.id,
            showtimeId: f.showtime.id,
            roomId: f.room.id,
            seatId: seat(f),
            price: "90000.00",
            status: "HOLDING",
          },
        });
      });
    } finally {
      release.release();
    }
    const result = await pending;
    spy.mockRestore();
    expect(result.status).toBe(409);
    expect(code(result)).toBe("SEAT_UNAVAILABLE");
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(1);
    expect(
      await prisma.bookingSeat.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(1);
    expect(
      await prisma.bookingSeat.count({
        where: { showtimeId: f.showtime.id, seatId: seat(f, 1) },
      }),
    ).toBe(0);
  });

  it("uses owner-token compare-and-delete and short TTL, never deletes another lock owner", async () => {
    const f = await fixture();
    const locks = app.get(SeatLockService);
    const lease = await locks.acquire(f.showtime.id, [seat(f, 1), seat(f)]);
    expect(lease.keys).toEqual([...lease.keys].sort());
    expect(await redis.pttl(lease.keys[0] || "invalid")).toBeGreaterThan(5000);
    await redis.set(lease.keys[0] || "invalid", "new-owner", "PX", 10000);
    await locks.release(lease);
    expect(await redis.get(lease.keys[0] || "invalid")).toBe("new-owner");
    expect(await redis.get(lease.keys[1] || "invalid")).toBeNull();
    await redis.del(...lease.keys);
    const blocked = await locks.acquire(f.showtime.id, [seat(f, 1)]);
    await hold(f, customerA, [seat(f), seat(f, 1)]).expect(409);
    expect(
      await redis.exists(
        `${namespace()}:seat-lock:{${f.showtime.id}}:${seat(f)}`,
      ),
    ).toBe(0);
    await locks.release(blocked);
    await hold(f).expect(201);
  });

  it("fails closed with no DB writes if Redis seat locking fails after authentication/rate limiting", async () => {
    const f = await fixture();
    const service = app.get(RedisService);
    const original = service.evaluate.bind(service);
    const spy = jest
      .spyOn(service, "evaluate")
      .mockImplementation((script, keys, args) =>
        keys.some((key) => key.includes(":seat-lock:"))
          ? Promise.reject(new Error("private Redis credential"))
          : original(script, keys, args),
      );
    const result = await hold(f).expect(503);
    expect(code(result)).toBe("SEAT_LOCK_UNAVAILABLE");
    expect(result.text).not.toContain("private Redis");
    spy.mockRestore();
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(0);
  });

  it("snapshots catalog price and membership only after acquiring their PostgreSQL locks", async () => {
    const f = await fixture();
    const party = await combo();
    const ready = gate();
    const release = gate();
    const writer = prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: userA },
          data: { cMemberTier: "DIAMOND" },
        });
        await tx.combo.update({
          where: { id: party.id },
          data: { price: "100000.00" },
        });
        ready.release();
        await release.promise;
      },
      { timeout: 10000 },
    );
    await ready.promise;
    const pending = request(server)
      .post("/api/v1/bookings/hold")
      .auth(customerA, { type: "bearer" })
      .send({ ...input(f), comboItems: [{ comboId: party.id, quantity: 1 }] })
      .then((response) => response);
    try {
      await eventually(async () => {
        const rows = await prisma.$queryRaw<
          Array<{ waiting: boolean }>
        >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'SELECT id FROM users%') AS waiting`;
        return rows[0]?.waiting === true;
      });
    } finally {
      release.release();
    }
    await writer;
    const result = await pending;
    expect(result.status).toBe(201);
    expect(booking(result)).toMatchObject({
      membershipTier: "DIAMOND",
      totalComboAmount: "100000.00",
      finalAmount: "171000.00",
    });
  });

  it("supports active combo catalog reads and ADMIN changes without changing historical snapshots", async () => {
    const payload = {
      name: `${prefix}-${randomUUID()}`,
      description: "Party 69K",
      price: "69000.00",
    };
    await request(server).post("/api/v1/combos").send(payload).expect(401);
    for (const token of [customerA, staff])
      await request(server)
        .post("/api/v1/combos")
        .auth(token, { type: "bearer" })
        .send(payload)
        .expect(403);
    const created = data(
      await request(server)
        .post("/api/v1/combos")
        .auth(admin, { type: "bearer" })
        .send(payload)
        .expect(201),
    ) as { id: string; price: string };
    expect(created.price).toBe("69000.00");
    await request(server)
      .patch(`/api/v1/combos/${created.id}`)
      .auth(admin, { type: "bearer" })
      .send({ price: 1 })
      .expect(400);
    await request(server)
      .patch(`/api/v1/combos/${created.id}`)
      .auth(admin, { type: "bearer" })
      .send({ isActive: null })
      .expect(400);
    await request(server)
      .patch(`/api/v1/combos/${created.id}`)
      .auth(admin, { type: "bearer" })
      .send({ isActive: false })
      .expect(200);
    const listed = data(
      await request(server).get("/api/v1/combos").expect(200),
    ) as { items: Array<{ id: string; isActive: boolean }> };
    expect(listed.items.every((row) => row.isActive)).toBe(true);
    expect(listed.items.map((row) => row.id)).not.toContain(created.id);
  });

  it("rolls back both booking state and seat release if the release outbox insert fails", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    const spy = jest
      .spyOn(app.get(OutboxRepository), "add")
      .mockRejectedValueOnce(new Error("private release persistence error"));
    const result = await cancel(created.id).expect(500);
    expect(result.text).not.toContain("private release");
    spy.mockRestore();
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("HOLDING");
    expect(
      (
        await prisma.bookingSeat.findFirstOrThrow({
          where: { bookingId: created.id },
        })
      ).status,
    ).toBe("HOLDING");
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: created.id, eventType: "seat_released" },
      }),
    ).toBe(0);
    await cancel(created.id).expect(200);
  });

  it("preserves nullable legacy snapshots and enforces snapshot/idempotency database constraints", async () => {
    const f = await fixture();
    const key = randomUUID();
    const legacy = await prisma.booking.create({
      data: {
        userId: userA,
        showtimeId: f.showtime.id,
        orderCode: `old-${randomUUID()}`,
        status: "CANCELLED",
        expiredAt: new Date("2043-01-01T00:00:00Z"),
      },
    });
    expect(booking(await get(legacy.id).expect(200))).toMatchObject({
      baseTicketPrice: null,
      membershipTier: null,
      discountRate: null,
    });
    await expect(
      prisma.booking.update({
        where: { id: legacy.id },
        data: { membershipTier: "SILVER" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.booking.update({
        where: { id: legacy.id },
        data: { idempotencyKey: key },
      }),
    ).rejects.toThrow();
    const created = booking(
      await request(server)
        .post("/api/v1/bookings/hold")
        .auth(customerA, { type: "bearer" })
        .set("Idempotency-Key", key)
        .send(input(f))
        .expect(201),
    );
    await expect(
      prisma.booking.update({
        where: { id: created.id },
        data: { discountRate: "0.070" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.booking.create({
        data: {
          userId: userA,
          showtimeId: f.showtime.id,
          orderCode: `dup-${randomUUID()}`,
          idempotencyKey: key,
          requestHash: "a".repeat(64),
          expiredAt: new Date("2043-01-01T00:00:00Z"),
        },
      }),
    ).rejects.toThrow();
    // Same client key is independent for a different user; their seat selection remains isolated.
    await request(otherServer)
      .post("/api/v1/bookings/hold")
      .auth(customerB, { type: "bearer" })
      .set("Idempotency-Key", key)
      .send(input(f, [seat(f, 1)]))
      .expect(201);
  });

  it("waits for an in-flight PAID/SOLD transaction before processing expiry", async () => {
    const f = await fixture();
    const created = booking(await hold(f).expect(201));
    await expireFixture(created.id);
    const ready = gate();
    const release = gate();
    const writer = prisma.$transaction(
      async (tx) => {
        await tx.booking.update({
          where: { id: created.id },
          data: {
            status: "PAID",
            seats: { updateMany: { where: {}, data: { status: "SOLD" } } },
          },
        });
        ready.release();
        await release.promise;
      },
      { timeout: 10000 },
    );
    await ready.promise;
    const pending = runJob(created.id);
    try {
      await eventually(async () => {
        const rows = await prisma.$queryRaw<
          Array<{ waiting: boolean }>
        >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'SELECT id FROM bookings%') AS waiting`;
        return rows[0]?.waiting === true;
      });
    } finally {
      release.release();
    }
    await writer;
    await pending;
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: created.id } }))
        .status,
    ).toBe("PAID");
    expect(
      (
        await prisma.bookingSeat.findFirstOrThrow({
          where: { bookingId: created.id },
        })
      ).status,
    ).toBe("SOLD");
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: created.id, eventType: "seat_released" },
      }),
    ).toBe(0);
  });

  it("documents implemented booking/combos APIs and includes public seat reads while keeping payment routes for later phases", async () => {
    const response = await request(server).get("/api/docs-json").expect(200);
    const spec = JSON.parse(response.text) as {
      paths: Record<string, Record<string, { security?: unknown }>>;
      components: { schemas: Record<string, unknown> };
    };
    for (const [path, method] of [
      ["/api/v1/bookings/hold", "post"],
      ["/api/v1/bookings/me", "get"],
      ["/api/v1/bookings/{id}", "get"],
      ["/api/v1/bookings/{id}/cancel", "post"],
    ] as const)
      expect(spec.paths[path]?.[method]?.security).toEqual([{ bearer: [] }]);
    expect(spec.paths).toHaveProperty("/api/v1/combos");
    expect(spec.components.schemas).toHaveProperty("BookingDto");
    expect(spec.paths).not.toHaveProperty("/api/v1/payments/webhook");
    expect(spec.paths).toHaveProperty(
      "/api/v1/showtimes/{showtimeId}/group-seat-suggestion",
    );
    expect(spec.paths).toHaveProperty("/api/v1/showtimes/{showtimeId}/seats");
  });
});
