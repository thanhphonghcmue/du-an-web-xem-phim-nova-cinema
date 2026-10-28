import { INestApplication } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { hash } from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import { io, Socket } from "socket.io-client";
import request, { Response } from "supertest";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { BookingMaintenanceService } from "../src/modules/bookings/booking-maintenance.service";
import { SeatExpirationProcessor } from "../src/queues/seat-expiration/seat-expiration.processor";
import { ExpirationPayload } from "../src/queues/seat-expiration/seat-expiration-queue.service";
import { OutboxRepository } from "../src/queues/outbox/outbox.repository";
import { TokenService } from "../src/modules/auth/token.service";
import { SeatEventsBus } from "../src/realtime/seat-events.bus";
import { SeatEventsRelay } from "../src/realtime/seat-events-relay.service";
import { RedisThrottlerStorage } from "../src/redis/redis-throttler.storage";
import { SeatSocketPolicy } from "../src/realtime/seat-socket-policy.service";

interface SeatMap {
  showtimeId: string;
  roomId: string;
  canBook: boolean;
  asOf: string;
  capacity: { total: number; available: number; holding: number; sold: number };
  seats: Array<{
    seatId: string;
    row: string;
    column: number;
    type: string;
    status: string;
    price: string;
    expiresAt: string | null;
  }>;
}
interface EventPayload {
  showtimeId: string;
  eventId: string;
  seatIds: string[];
  bookingId?: string;
  expiresAt?: string;
}
interface Ack {
  success: boolean;
  error?: string;
  data?: { showtimeId: string; joined: boolean };
}
function data(response: Response): unknown {
  const body = JSON.parse(response.text) as { success: boolean; data: unknown };
  expect(body.success).toBe(true);
  return body.data;
}
function entity(response: Response) {
  return data(response) as { id: string; expiredAt: string };
}
async function eventually(check: () => Promise<boolean>): Promise<void> {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Expected live socket/database state was not observed.");
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
function ack(socket: Socket, event: string, body: unknown): Promise<Ack> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Socket acknowledgement timed out."));
    }, 3000);
    socket.emit(event, body, (value: Ack) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}
function waitEvent(socket: Socket, name: string): Promise<EventPayload> {
  return new Promise((resolve, reject) => {
    const listener = (value: EventPayload) => {
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      socket.off(name, listener);
      reject(new Error("Seat event timed out."));
    }, 4000);
    socket.once(name, listener);
  });
}

describe("Phase 7 seat snapshots, group suggestions and real Socket.IO/Redis delivery", () => {
  let app: INestApplication;
  let other: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let base: string;
  let otherBase: string;
  let token: string;
  let userId: string;
  const clients = new Set<Socket>();
  const prefix = `p7-${randomUUID()}`;
  const extraEvents: string[] = [];
  const namespace = () => process.env.BULLMQ_PREFIX || "invalid";
  async function fixture(start = "2042-01-01T10:00:00Z", columns = 8) {
    const movie = await prisma.movie.create({
      data: {
        title: `${prefix}-${randomUUID()}`,
        description: "Realtime fixture",
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
        name: prefix,
        cinemaId: cinema.id,
        roomType: "DOLBY_ATMOS",
        totalSeats: 3 * columns,
      },
    });
    for (const [label, seatType, priceModifier] of [
      ["A", "STANDARD", "1.00"],
      ["B", "VIP", "1.20"],
      ["C", "SWEETBOX", "1.50"],
    ] as const)
      await prisma.seat.createMany({
        data: Array.from({ length: columns }, (_, i) => ({
          roomId: room.id,
          seatRow: label,
          seatColumn: i + 1,
          seatType,
          priceModifier,
        })),
      });
    const showtime = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        roomId: room.id,
        startTime: new Date(start),
        endTime: new Date(new Date(start).getTime() + 135 * 60000),
        baseTicketPrice: "90000.00",
      },
    });
    const seats = await prisma.seat.findMany({
      where: { roomId: room.id },
      orderBy: [{ seatRow: "asc" }, { seatColumn: "asc" }],
    });
    return { movie, room, showtime, seats };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  function id(f: Fixture, index = 0): string {
    const seat = f.seats[index];
    if (!seat) throw new Error("Missing fixture seat.");
    return seat.id;
  }
  function hold(f: Fixture, seatIds = [id(f)]) {
    return request(server)
      .post("/api/v1/bookings/hold")
      .auth(token, { type: "bearer" })
      .send({ showtimeId: f.showtime.id, seatIds });
  }
  function map(id: string) {
    return request(server).get(`/api/v1/showtimes/${id}/seats`);
  }
  function suggest(id: string, query: object) {
    return request(server)
      .get(`/api/v1/showtimes/${id}/group-seat-suggestion`)
      .query(query);
  }
  async function connect(url = base, origin?: string): Promise<Socket> {
    const socket = io(`${url}/seats`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 2000,
      ...(origin ? { extraHeaders: { Origin: origin } } : {}),
    });
    clients.add(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => {
        resolve();
      });
      socket.once("connect_error", reject);
    });
    return socket;
  }
  async function watch(f: Fixture, url = base) {
    const socket = await connect(url);
    expect(
      (await ack(socket, "join_showtime", { showtimeId: f.showtime.id }))
        .success,
    ).toBe(true);
    return socket;
  }
  async function flush() {
    await app.get(SeatEventsRelay).flush();
  }
  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    await app.get(BookingMaintenanceService).stop();
    await app.get(SeatEventsRelay).stop();
    other = await createApplication({ logger: false });
    await other.listen(0, "127.0.0.1");
    await other.get(BookingMaintenanceService).stop();
    await other.get(SeatEventsRelay).stop();
    base = await app.getUrl();
    otherBase = await other.getUrl();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      db: Number(process.env.REDIS_DB),
      ...(process.env.REDIS_PASSWORD
        ? { password: process.env.REDIS_PASSWORD }
        : {}),
    });
    const user = await prisma.user.create({
      data: {
        email: `${prefix}@example.test`,
        fullName: "Realtime fixture",
        passwordHash: await hash(randomBytes(24).toString("hex"), {
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        }),
      },
    });
    userId = user.id;
    token = (await app.get(TokenService).issue(userId)).tokens.accessToken;
  });
  beforeEach(async () => {
    await flush();
  });
  afterEach(async () => {
    for (const socket of clients) {
      socket.disconnect();
      socket.removeAllListeners();
    }
    clients.clear();
    const keys = await redis.keys(`${namespace()}:throttle:*`);
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    await app.get(SeatEventsRelay).stop();
    await other.get(SeatEventsRelay).stop();
    await app.get(SeatExpirationProcessor).worker.pause();
    await other.get(SeatExpirationProcessor).worker.pause();
    const rows = await prisma.booking.findMany({
      where: { userId },
      select: { id: true },
    });
    const ids = rows.map((row) => row.id);
    await prisma.outboxEvent.deleteMany({
      where: {
        OR: [{ aggregateId: { in: ids } }, { id: { in: extraEvents } }],
      },
    });
    await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
    await prisma.showtime.deleteMany({
      where: { movie: { title: { startsWith: prefix } } },
    });
    await prisma.seat.deleteMany({ where: { room: { name: prefix } } });
    await prisma.room.deleteMany({ where: { name: prefix } });
    await prisma.cinema.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.movie.deleteMany({ where: { title: { startsWith: prefix } } });
    await prisma.user.delete({ where: { id: userId } });
    await other.close();
    await app.close();
    const keys = await redis.keys(`${namespace()}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("returns public per-showtime seats, Decimal prices and actual capacity without ownership information", async () => {
    const f = await fixture();
    const result = data(await map(f.showtime.id).expect(200)) as SeatMap;
    expect(result.capacity).toEqual({
      total: 24,
      available: 24,
      holding: 0,
      sold: 0,
    });
    expect(result.canBook).toBe(true);
    expect(
      result.seats
        .filter((seat) => seat.type === "VIP")
        .every((seat) => seat.price === "108000.00"),
    ).toBe(true);
    expect(
      result.seats
        .filter((seat) => seat.type === "SWEETBOX")
        .every((seat) => seat.price === "135000.00"),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(
      /userId|bookingId|email|password|requestHash/,
    );
    expect(
      await prisma.bookingSeat.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(0);
  });
  it("isolates availability by showtime and reflects holds, cancellation and SOLD rows", async () => {
    const f = await fixture();
    const held = entity(await hold(f).expect(201));
    const second = await prisma.showtime.create({
      data: {
        movieId: f.movie.id,
        roomId: f.room.id,
        startTime: new Date("2042-01-02T10:00:00Z"),
        endTime: new Date("2042-01-02T12:15:00Z"),
        baseTicketPrice: "90000.00",
      },
    });
    const current = data(await map(f.showtime.id).expect(200)) as SeatMap;
    expect(current.seats[0]).toMatchObject({
      status: "HOLDING",
      expiresAt: held.expiredAt,
    });
    expect(current.capacity.holding).toBe(1);
    expect(
      (data(await map(second.id).expect(200)) as SeatMap).capacity.available,
    ).toBe(24);
    await request(server)
      .post(`/api/v1/bookings/${held.id}/cancel`)
      .auth(token, { type: "bearer" })
      .expect(200);
    expect(
      (data(await map(f.showtime.id).expect(200)) as SeatMap).capacity
        .available,
    ).toBe(24);
    const paid = entity(await hold(f).expect(201));
    await prisma.booking.update({
      where: { id: paid.id },
      data: {
        status: "PAID",
        seats: { updateMany: { where: {}, data: { status: "SOLD" } } },
      },
    });
    expect(
      (data(await map(f.showtime.id).expect(200)) as SeatMap).capacity.sold,
    ).toBe(1);
  });
  it("batched capacities match seat maps for expired, PAID and mixed SOLD/HOLDING claims", async () => {
    const f = await fixture();
    const held = entity(await hold(f, [id(f, 0), id(f, 1)]).expect(201));
    const counts = async () => {
      const rows = data(
        await request(server)
          .get("/api/v1/showtimes/capacities")
          .query({ ids: `${f.showtime.id.toUpperCase()},${randomUUID()}` })
          .expect(200),
      ) as Array<SeatMap["capacity"] & { showtimeId: string; asOf: string }>;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject(
        (data(await map(f.showtime.id).expect(200)) as SeatMap).capacity,
      );
      return rows[0];
    };
    expect(await counts()).toMatchObject({
      holding: 2,
      sold: 0,
      available: 22,
    });
    await prisma.booking.update({
      where: { id: held.id },
      data: {
        createdAt: new Date(Date.now() - 301000),
        expiredAt: new Date(Date.now() - 1000),
      },
    });
    expect(await counts()).toMatchObject({
      holding: 0,
      sold: 0,
      available: 24,
    });
    await prisma.booking.update({
      where: { id: held.id },
      data: { status: "PAID" },
    });
    expect(await counts()).toMatchObject({
      holding: 2,
      sold: 0,
      available: 22,
    });
    await prisma.bookingSeat.updateMany({
      where: { bookingId: held.id, seatId: id(f, 0) },
      data: { status: "SOLD" },
    });
    await prisma.booking.update({
      where: { id: held.id },
      data: { status: "HOLDING" },
    });
    expect(await counts()).toMatchObject({
      holding: 1,
      sold: 1,
      available: 22,
    });
  });

  it("reads batched expired capacities while a writer owns the booking row lock, without mutating claims", async () => {
    const f = await fixture();
    const held = entity(await hold(f).expect(201));
    const before = await prisma.booking.update({
      where: { id: held.id },
      data: {
        createdAt: new Date(Date.now() - 301000),
        expiredAt: new Date(Date.now() - 1000),
      },
    });
    const ready = gate(),
      unlock = gate();
    const writer = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${held.id}::uuid FOR UPDATE`;
        ready.release();
        await unlock.promise;
      },
      { timeout: 10000 },
    );
    await ready.promise;
    try {
      const started = Date.now();
      const rows = data(
        await request(server)
          .get("/api/v1/showtimes/capacities")
          .query({ ids: f.showtime.id })
          .expect(200),
      ) as Array<SeatMap["capacity"]>;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ available: 24, holding: 0 });
      expect(Date.now() - started).toBeLessThan(1000);
      const after = await prisma.booking.findUniqueOrThrow({
        where: { id: held.id },
      });
      expect(after.status).toBe("HOLDING");
      expect(after.updatedAt).toEqual(before.updatedAt);
    } finally {
      unlock.release();
      await writer;
    }
  });

  it("projects overdue holds without writes, then atomically reclaims them on POST", async () => {
    const f = await fixture();
    const held = entity(await hold(f).expect(201));
    const now = Date.now();
    await prisma.booking.update({
      where: { id: held.id },
      data: {
        createdAt: new Date(now - 301000),
        expiredAt: new Date(now - 1000),
      },
    });
    expect(
      (data(await map(f.showtime.id).expect(200)) as SeatMap).capacity
        .available,
    ).toBe(24);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: held.id } }))
        .status,
    ).toBe("HOLDING");
    expect(
      (
        await prisma.bookingSeat.findFirstOrThrow({
          where: { bookingId: held.id },
        })
      ).status,
    ).toBe("HOLDING");
    await hold(f).expect(201);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: held.id } }))
        .status,
    ).toBe("EXPIRED");
    expect(
      (
        await prisma.bookingSeat.findFirstOrThrow({
          where: { bookingId: held.id },
        })
      ).status,
    ).toBe("AVAILABLE");
  });
  it("reads an expired seat snapshot without waiting for an unrelated booking row write lock", async () => {
    const f = await fixture();
    const held = entity(await hold(f).expect(201));
    await prisma.booking.update({
      where: { id: held.id },
      data: {
        createdAt: new Date(Date.now() - 301000),
        expiredAt: new Date(Date.now() - 1000),
      },
    });
    let release: () => void = () => {};
    let ready: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const locked = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const writer = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${held.id}::uuid FOR UPDATE`;
        ready();
        await gate;
      },
      { timeout: 10000 },
    );
    await locked;
    try {
      const started = Date.now();
      expect(
        (data(await map(f.showtime.id).expect(200)) as SeatMap).capacity
          .available,
      ).toBe(24);
      expect(Date.now() - started).toBeLessThan(1000);
    } finally {
      release();
      await writer;
    }
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: held.id } }))
        .status,
    ).toBe("HOLDING");
  });
  it("suggests centered adjacent seats, respects type/blocked seats and remains advisory", async () => {
    const f = await fixture();
    const result = data(
      await suggest(f.showtime.id, { quantity: 3 }).expect(200),
    ) as { seatIds: string[] };
    expect(result.seatIds).toEqual([id(f, 2), id(f, 3), id(f, 4)]);
    const vip = data(
      await suggest(f.showtime.id, { quantity: 3, seatType: "VIP" }).expect(
        200,
      ),
    ) as { seatIds: string[] };
    expect(vip.seatIds).toEqual([id(f, 10), id(f, 11), id(f, 12)]);
    expect(
      await prisma.booking.count({ where: { showtimeId: f.showtime.id } }),
    ).toBe(0);
    await hold(f, vip.seatIds).expect(201);
    expect(
      (
        data(
          await suggest(f.showtime.id, { quantity: 3, seatType: "VIP" }).expect(
            200,
          ),
        ) as { seatIds: string[] }
      ).seatIds,
    ).toEqual([id(f, 13), id(f, 14), id(f, 15)]);
    expect(
      (
        data(await suggest(f.showtime.id, { quantity: 20 }).expect(200)) as {
          seatIds: string[];
        }
      ).seatIds,
    ).toEqual([]);
  });
  it("validates all suggestion inputs and handles missing, empty and historical showtimes", async () => {
    const f = await fixture();
    for (const query of [
      {},
      { quantity: 0 },
      { quantity: 21 },
      { quantity: 1.5 },
      { quantity: "bad" },
      { quantity: 2, seatType: "bad" },
      { quantity: 2, userId },
    ])
      await suggest(f.showtime.id, query).expect(400);
    await map("bad").expect(400);
    await map(randomUUID()).expect(404);
    await suggest(randomUUID(), { quantity: 2 }).expect(404);
    const past = await fixture("2020-01-01T10:00:00Z");
    expect(
      (data(await map(past.showtime.id).expect(200)) as SeatMap).canBook,
    ).toBe(false);
    await suggest(past.showtime.id, { quantity: 2 }).expect(409);
    const empty = await fixture("2042-01-01T10:00:00Z", 0);
    expect(
      (data(await map(empty.showtime.id).expect(200)) as SeatMap).capacity
        .total,
    ).toBe(0);
  });
  it("joins public existing showtimes, normalizes UUIDs, rejects arbitrary rooms and validates acknowledgements", async () => {
    const f = await fixture();
    const socket = await connect();
    expect(
      await ack(socket, "join_showtime", {
        showtimeId: f.showtime.id.toUpperCase(),
      }),
    ).toMatchObject({
      success: true,
      data: { showtimeId: f.showtime.id, joined: true },
    });
    for (const body of [
      null,
      [],
      {},
      { showtimeId: "bad" },
      { showtimeId: f.showtime.id, room: "admin" },
      { showtimeId: f.showtime.id, userId },
    ])
      expect(await ack(socket, "join_showtime", body)).toMatchObject({
        success: false,
        error: "VALIDATION_ERROR",
      });
    expect(
      await ack(socket, "join_showtime", { showtimeId: randomUUID() }),
    ).toMatchObject({ success: false, error: "SHOWTIME_NOT_FOUND" });
    expect(
      (await ack(socket, "leave_showtime", { showtimeId: f.showtime.id }))
        .success,
    ).toBe(true);
    expect(
      (await ack(socket, "leave_showtime", { showtimeId: f.showtime.id }))
        .success,
    ).toBe(true);
  });
  it("delivers hold/cancel events once per publish to clients on both API instances and only in the target room", async () => {
    const f = await fixture();
    const unrelated = await fixture();
    const local = await watch(f);
    const remote = await watch(f, otherBase);
    const stranger = await watch(unrelated, otherBase);
    const received: unknown[] = [];
    stranger.on("seat_locked", (value: unknown) => received.push(value));
    const localEvent = waitEvent(local, "seat_locked");
    const remoteEvent = waitEvent(remote, "seat_locked");
    const held = entity(await hold(f).expect(201));
    await flush();
    const [one, two] = await Promise.all([localEvent, remoteEvent]);
    expect(one).toEqual(two);
    expect(one).toMatchObject({
      showtimeId: f.showtime.id,
      bookingId: held.id,
      seatIds: [id(f)],
    });
    expect(received).toEqual([]);
    expect(JSON.stringify(one)).not.toMatch(
      /userId|email|token|password|price/,
    );
    const released = waitEvent(remote, "seat_released");
    await request(server)
      .post(`/api/v1/bookings/${held.id}/cancel`)
      .auth(token, { type: "bearer" })
      .expect(200);
    await flush();
    expect((await released).seatIds).toEqual([id(f)]);
  });
  it("replaces the subscribed room and stops events after leave/disconnect", async () => {
    const a = await fixture();
    const b = await fixture();
    const socket = await watch(a);
    await ack(socket, "join_showtime", { showtimeId: b.showtime.id });
    const seen: EventPayload[] = [];
    socket.on("seat_locked", (value: EventPayload) => seen.push(value));
    await hold(a).expect(201);
    await flush();
    const target = waitEvent(socket, "seat_locked");
    await hold(b).expect(201);
    await flush();
    expect((await target).showtimeId).toBe(b.showtime.id);
    expect(seen.every((event) => event.showtimeId === b.showtime.id)).toBe(
      true,
    );
    await ack(socket, "leave_showtime", { showtimeId: b.showtime.id });
    const count = seen.length;
    await hold(b, [id(b, 1)]).expect(201);
    await flush();
    await redis.ping();
    expect(seen).toHaveLength(count);
  });
  it("does not broadcast before transaction commit and does not publish a rolled-back hold", async () => {
    const f = await fixture();
    const socket = await watch(f, otherBase);
    const seen: unknown[] = [];
    socket.on("seat_locked", (value: unknown) => seen.push(value));
    const outbox = app.get(OutboxRepository);
    const original = outbox.add.bind(outbox);
    const ready = gate();
    const release = gate();
    const spy = jest
      .spyOn(outbox, "add")
      .mockImplementationOnce(original)
      .mockImplementationOnce((...args) => {
        const result = original(...args);
        return result.then(async (event) => {
          ready.release();
          await release.promise;
          return event;
        });
      });
    const pending = hold(f).then((response) => response);
    await ready.promise;
    try {
      await other.get(SeatEventsRelay).flush();
      expect(seen).toEqual([]);
    } finally {
      release.release();
    }
    const result = await pending;
    spy.mockRestore();
    expect(result.status).toBe(201);
    const event = waitEvent(socket, "seat_locked");
    await flush();
    expect((await event).bookingId).toBe(entity(result).id);
    const rollback = await fixture();
    const watcher = await watch(rollback);
    const bad: unknown[] = [];
    watcher.on("seat_locked", (value: unknown) => bad.push(value));
    jest
      .spyOn(outbox, "add")
      .mockRejectedValueOnce(new Error("private rollback diagnostic"));
    await hold(rollback).expect(500);
    await flush();
    expect(bad).toEqual([]);
  });
  it("retains failed publishes durably and reclaims a stale lease across relays", async () => {
    const f = await fixture();
    const socket = await watch(f, otherBase);
    const held = entity(await hold(f).expect(201));
    const bus = app.get(SeatEventsBus);
    const spy = jest
      .spyOn(bus, "publish")
      .mockRejectedValueOnce(new Error("private Redis diagnostic"));
    await flush();
    spy.mockRestore();
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: held.id, eventType: "seat_locked" },
    });
    expect(event.processedAt).toBeNull();
    expect(event.lastError).toBe("SEAT_BROADCAST_UNAVAILABLE");
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        availableAt: new Date(Date.now() - 1),
        lockedAt: new Date(Date.now() - 31000),
        lockedBy: "crashed-relay",
      },
    });
    const received = waitEvent(socket, "seat_locked");
    await Promise.all([flush(), other.get(SeatEventsRelay).flush()]);
    expect((await received).eventId).toBe(event.id);
    expect(
      (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } }))
        .processedAt,
    ).not.toBeNull();
  });
  it("broadcasts expiry from the real worker and preserves a SOLD event contract without implementing payments", async () => {
    const f = await fixture();
    const socket = await watch(f, otherBase);
    const held = entity(await hold(f).expect(201));
    await flush();
    const now = Date.now();
    await prisma.booking.update({
      where: { id: held.id },
      data: {
        createdAt: new Date(now - 301000),
        expiredAt: new Date(now - 1000),
      },
    });
    const queue = app.get<Queue<ExpirationPayload, void>>(
      getQueueToken("seat-expiration"),
    );
    const job = await queue.add(
      "expire-booking-hold",
      { bookingId: held.id },
      { jobId: `p7-${randomUUID()}` },
    );
    await eventually(async () => (await job.getState()) === "completed");
    const released = waitEvent(socket, "seat_released");
    await flush();
    expect((await released).seatIds).toEqual([id(f)]);
    // Forward-compatible wire fixture; no payment endpoint or PAID transition is claimed.
    const fixtureEvent = await prisma.outboxEvent.create({
      data: {
        eventType: "seat_sold",
        aggregateType: "booking",
        aggregateId: held.id,
        payload: {
          showtimeId: f.showtime.id,
          seatIds: [id(f)],
          email: "private@test.invalid",
          userId,
        },
      },
    });
    extraEvents.push(fixtureEvent.id);
    const sold = waitEvent(socket, "seat_sold");
    await flush();
    const payload = await sold;
    expect(payload.seatIds).toEqual([id(f)]);
    expect(JSON.stringify(payload)).not.toMatch(/email|userId|private/);
  });
  it("enforces browser Origin and shared message rate limits, including invalid requests", async () => {
    await expect(connect(base, "https://unlisted.example")).rejects.toThrow();
    const allowed = await connect(base, "http://localhost:3000");
    const policy = app.get(SeatSocketPolicy);
    const storage = app.get(RedisThrottlerStorage);
    await storage.increment("127.0.0.1:subscribe", 60000, 0, 60000, "seats-ws");
    expect(await ack(allowed, "join_showtime", {})).toMatchObject({
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
    });
    await expect(
      policy.connect("https://unlisted.example", "test"),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("requests a fresh snapshot after actual Redis subscriber reconnection", async () => {
    const f = await fixture();
    const socket = await watch(f, otherBase);
    const signals: unknown[] = [];
    socket.on("resync_required", (value: unknown) => {
      signals.push(value);
    });
    const connections: unknown = await redis.client("LIST", "TYPE", "PUBSUB");
    if (typeof connections !== "string")
      throw new Error("Redis client listing unavailable.");
    const ids = connections
      .trim()
      .split("\n")
      .map((line) =>
        Object.fromEntries<string>(
          line.split(" ").map((part) => {
            const at = part.indexOf("=");
            return [part.slice(0, at), part.slice(at + 1)] as const;
          }),
        ),
      )
      .filter(
        (fields) =>
          typeof fields.name === "string" &&
          fields.name.startsWith(`${namespace()}:seats-sub:`),
      )
      .map((fields) => fields.id);
    expect(ids).toHaveLength(2);
    for (const subscriberId of ids) {
      if (typeof subscriberId !== "string")
        throw new Error("Missing subscriber ID.");
      await redis.client("KILL", "ID", subscriberId);
    }
    await eventually(() =>
      Promise.resolve(
        signals.some(
          (value) =>
            typeof value === "object" &&
            value !== null &&
            "reason" in value &&
            value.reason === "REDIS_RECONNECTED",
        ),
      ),
    );
    expect(socket.connected).toBe(true);
    const changed = waitEvent(socket, "seat_locked");
    await hold(f).expect(201);
    await flush();
    expect((await changed).showtimeId).toBe(f.showtime.id);
    expect(
      (data(await map(f.showtime.id).expect(200)) as SeatMap).capacity.holding,
    ).toBe(1);
    const ready = await request(server).get("/api/v1/health").expect(200);
    expect(ready.text).toContain('"realtime":{"status":"up"}');
  });

  it("reuses event IDs after publish/ack failure and treats delayed events as snapshot invalidations", async () => {
    const f = await fixture();
    const socket = await watch(f, otherBase);
    const held = entity(await hold(f).expect(201));
    const first = waitEvent(socket, "seat_locked");
    const spy = jest
      .spyOn(app.get(OutboxRepository), "acknowledge")
      .mockRejectedValueOnce(new Error("private acknowledgement error"));
    await flush();
    spy.mockRestore();
    const delivered = await first;
    const release = waitEvent(socket, "seat_released");
    await request(server)
      .post(`/api/v1/bookings/${held.id}/cancel`)
      .auth(token, { type: "bearer" })
      .expect(200);
    await flush();
    await release;
    await prisma.outboxEvent.update({
      where: { id: delivered.eventId },
      data: { availableAt: new Date(Date.now() - 1) },
    });
    const repeated = waitEvent(socket, "seat_locked");
    await flush();
    expect((await repeated).eventId).toBe(delivered.eventId);
    expect(
      (data(await map(f.showtime.id).expect(200)) as SeatMap).capacity,
    ).toMatchObject({ available: 24, holding: 0 });
  });

  it("reports realtime transport health failures safely without affecting liveness", async () => {
    jest
      .spyOn(app.get(SeatEventsBus), "ping")
      .mockRejectedValueOnce(new Error("private realtime diagnostic"));
    const response = await request(server).get("/api/v1/health").expect(503);
    expect(response.text).toContain('"realtime":{"status":"down"}');
    expect(response.text).not.toContain("private realtime");
    await request(server).get("/api/v1/health/live").expect(200);
  });

  it("exposes seat-map/suggestion schemas with public reads alongside payment routes", async () => {
    const response = await request(server).get("/api/docs-json").expect(200);
    const spec = JSON.parse(response.text) as {
      paths: Record<string, { get?: { security?: unknown } }>;
      components: { schemas: Record<string, unknown> };
    };
    expect(
      spec.paths["/api/v1/showtimes/{showtimeId}/seats"]?.get?.security,
    ).toBeUndefined();
    expect(spec.components.schemas).toHaveProperty("ShowtimeSeatMapDto");
    expect(spec.components.schemas).toHaveProperty("GroupSeatSuggestionDto");
    expect(spec.paths).toHaveProperty("/api/v1/payments/webhook");
  });
});
