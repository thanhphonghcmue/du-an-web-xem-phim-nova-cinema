import { FulfillmentRelay } from "../src/modules/notifications/fulfillment-relay.service";
import { INestApplication } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import { io, Socket } from "socket.io-client";
import request, { Response } from "supertest";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { TokenService } from "../src/modules/auth/token.service";
import { BookingMaintenanceService } from "../src/modules/bookings/booking-maintenance.service";
import { SeatBookingService } from "../src/modules/bookings/seat-booking.service";
import { PaymentsRepository } from "../src/modules/payments/payments.repository";
import {
  PaymentOutcome,
  PaymentWebhookDto,
} from "../src/modules/payments/payment.dto";
import {
  EXPIRATION_CANCEL_REQUESTED,
  OutboxRepository,
  TICKET_REQUESTED,
} from "../src/queues/outbox/outbox.repository";
import { ExpiryOutboxRelay } from "../src/queues/outbox/expiry-outbox-relay.service";
import { SeatExpirationProcessor } from "../src/queues/seat-expiration/seat-expiration.processor";
import { SeatExpirationQueueService } from "../src/queues/seat-expiration/seat-expiration-queue.service";
import { SeatEventsRelay } from "../src/realtime/seat-events-relay.service";

interface Booking {
  id: string;
  orderCode: string;
  finalAmount: string;
  expiredAt: string;
  status: string;
}
interface Checkout {
  bookingId: string;
  transactionCode: string;
  amount: string;
  expiredAt: string;
  url: string;
}
interface State {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string | null;
  canPay: boolean;
  duplicate?: boolean;
}
function data(response: Response): unknown {
  return (JSON.parse(response.text) as { data: unknown }).data;
}
function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null)
    throw new Error("Required fixture value is missing.");
  return value;
}
type Webhook = { [K in keyof PaymentWebhookDto]: PaymentWebhookDto[K] };
function error(response: Response): string {
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
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(
    "Expected committed payment/queue/socket state did not arrive.",
  );
}

describe("Phase 8 real PostgreSQL/Redis Sandbox payment state machine", () => {
  let app: INestApplication;
  let other: INestApplication;
  let server: Server;
  let remote: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let userId: string;
  let foreignId: string;
  let adminId: string;
  let token: string;
  let foreignToken: string;
  let adminToken: string;
  let movieId: string;
  let cinemaId: string;
  const prefix = `p8-${randomUUID()}`;
  const clients = new Set<Socket>();
  const returnUrl = "http://localhost:3000/booking/result?source=sandbox";
  const namespace = () => process.env.BULLMQ_PREFIX || "invalid";
  async function fixture(price = "90000.00") {
    const room = await prisma.room.create({
      data: {
        cinemaId,
        name: `${prefix}-${randomUUID()}`,
        roomType: "DOLBY_ATMOS",
        totalSeats: 4,
      },
    });
    await prisma.seat.createMany({
      data: [1, 2, 3, 4].map((column) => ({
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
        movieId,
        roomId: room.id,
        startTime: new Date("2042-01-01T10:00:00Z"),
        endTime: new Date("2042-01-01T12:15:00Z"),
        baseTicketPrice: price,
      },
    });
    return { showtime, seats };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  async function hold(
    f: Fixture,
    auth = token,
    ids = [required(f.seats[0]).id],
  ): Promise<Booking> {
    return data(
      await request(server)
        .post("/api/v1/bookings/hold")
        .auth(auth, { type: "bearer" })
        .send({ showtimeId: f.showtime.id, seatIds: ids })
        .expect(201),
    ) as Booking;
  }
  function create(
    bookingId: string,
    target = server,
    auth = token,
    url = returnUrl,
  ) {
    return request(target)
      .post("/api/v1/payments/create-sandbox-url")
      .auth(auth, { type: "bearer" })
      .send({ bookingId, returnUrl: url });
  }
  async function checkout(booking: Booking): Promise<Checkout> {
    return data(await create(booking.id).expect(201)) as Checkout;
  }
  function callback(
    booking: Booking,
    payment: Checkout,
    status: PaymentOutcome = "SUCCESS",
    changes: Partial<Omit<PaymentWebhookDto, "signature">> = {},
  ): Webhook {
    const payload = {
      bookingId: booking.id,
      orderCode: booking.orderCode,
      transactionCode: payment.transactionCode,
      amount: booking.finalAmount,
      timestamp: new Date().toISOString(),
      status,
      ...changes,
    };
    const signature = createHmac(
      "sha512",
      required(process.env.PAYMENT_SANDBOX_SECRET),
    )
      .update(
        `webhook.v1:${JSON.stringify([payload.bookingId, payload.orderCode, payload.transactionCode, payload.amount, payload.timestamp, payload.status])}`,
      )
      .digest("hex");
    return { ...payload, signature };
  }
  function webhook(payload: Webhook, target = server) {
    return request(target).post("/api/v1/payments/webhook").send(payload);
  }
  function status(id: string, auth = token) {
    return request(server)
      .get(`/api/v1/payments/${id}/status`)
      .auth(auth, { type: "bearer" });
  }
  async function stored(bookingId: string) {
    return prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { seats: true, payments: true },
    });
  }
  async function points() {
    return (await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
      .cMemberPoints;
  }
  async function watch(showtimeId: string) {
    const socket = io(`${await other.getUrl()}/seats`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    clients.add(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });
    await new Promise<void>((resolve, reject) => {
      socket
        .timeout(2000)
        .emit(
          "join_showtime",
          { showtimeId },
          (err: Error | null, ack: { success: boolean }) => {
            if (err || !ack.success) reject(err || new Error("Join failed."));
            else resolve();
          },
        );
    });
    const events: Array<{
      type: string;
      eventId: string;
      seatIds: string[];
      showtimeId: string;
    }> = [];
    for (const type of ["seat_sold", "seat_released"])
      socket.on(
        type,
        (value: { eventId: string; seatIds: string[]; showtimeId: string }) => {
          events.push({ type, ...value });
        },
      );
    return events;
  }
  async function flushSeats() {
    await app.get(SeatEventsRelay).flush();
  }
  async function expireFixture(id: string) {
    const deadline = new Date(Date.now() - 1000);
    await prisma.booking.update({
      where: { id },
      data: {
        createdAt: new Date(deadline.getTime() - 300000),
        expiredAt: deadline,
      },
    });
  }
  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    await app.get(BookingMaintenanceService).stop();
    await app.get(FulfillmentRelay).stop();
    await app.get(SeatEventsRelay).stop();
    other = await createApplication({ logger: false });
    await other.listen(0, "127.0.0.1");
    await other.get(BookingMaintenanceService).stop();
    await other.get(FulfillmentRelay).stop();
    await other.get(SeatEventsRelay).stop();
    server = app.getHttpServer() as Server;
    remote = other.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      db: Number(process.env.REDIS_DB),
      password: process.env.REDIS_PASSWORD,
    });
    const ids: string[] = [];
    for (const role of ["CUSTOMER", "CUSTOMER", "ADMIN"] as const)
      ids.push(
        (
          await prisma.user.create({
            data: {
              email: `${prefix}-${String(ids.length)}@example.test`,
              passwordHash: randomBytes(32).toString("hex"),
              fullName: "Payment test",
              role,
            },
          })
        ).id,
      );
    [userId, foreignId, adminId] = ids as [string, string, string];
    token = (await app.get(TokenService).issue(userId)).tokens.accessToken;
    foreignToken = (await app.get(TokenService).issue(foreignId)).tokens
      .accessToken;
    adminToken = (await app.get(TokenService).issue(adminId)).tokens
      .accessToken;
    movieId = (
      await prisma.movie.create({
        data: {
          title: prefix,
          description: "Payment fixture",
          durationMinutes: 120,
          ageRating: "T13",
          releaseDate: new Date("2041-01-01T00:00:00Z"),
        },
      })
    ).id;
    cinemaId = (
      await prisma.cinema.create({
        data: { name: prefix, address: "Fixture", city: prefix },
      })
    ).id;
  });
  beforeEach(async () => {
    await flushSeats();
    await prisma.user.update({
      where: { id: userId },
      data: { cMemberPoints: 0, cMemberTier: "SILVER" },
    });
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    for (const socket of clients) {
      socket.disconnect();
      socket.removeAllListeners();
    }
    clients.clear();
    const keys = await redis.keys(`${namespace()}:throttle:*`);
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    await app.get(SeatExpirationProcessor).worker.pause();
    await other.get(SeatExpirationProcessor).worker.pause();
    const userIds = [userId, foreignId, adminId];
    const rows = await prisma.booking.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const ids = rows.map((row) => row.id);
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: { in: ids } },
    });
    await prisma.payment.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
    await prisma.showtime.deleteMany({ where: { movieId } });
    await prisma.seat.deleteMany({ where: { room: { cinemaId } } });
    await prisma.room.deleteMany({ where: { cinemaId } });
    await prisma.cinema.delete({ where: { id: cinemaId } });
    await prisma.movie.delete({ where: { id: movieId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await other.close();
    await app.close();
    const keys = await redis.keys(`${namespace()}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("creates a signed fixed-price checkout and replays it without extending the hold", async () => {
    const f = await fixture();
    const booking = await hold(f);
    expect(data(await status(booking.id).expect(200)) as State).toMatchObject({
      bookingStatus: "HOLDING",
      paymentStatus: null,
      canPay: true,
    });
    const payment = await checkout(booking);
    const url = new URL(payment.url);
    expect(payment.amount).toBe("85500.00");
    expect(payment.expiredAt).toBe(booking.expiredAt);
    expect(url.pathname).toBe("/api/v1/payments/sandbox");
    expect(url.searchParams.get("signature")).toMatch(/^[a-f0-9]{128}$/);
    expect(data(await create(booking.id).expect(201)) as Checkout).toEqual(
      payment,
    );
    expect(
      await prisma.payment.count({ where: { bookingId: booking.id } }),
    ).toBe(1);
    expect(
      error(
        await create(
          booking.id,
          server,
          token,
          "http://localhost:3000/different",
        ).expect(409),
      ),
    ).toBe("PAYMENT_REQUEST_CONFLICT");
    const result = await status(booking.id).expect(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.text).not.toMatch(
      /signature|requestPayload|responsePayload|userId|password|email|secret/,
    );
  });
  it("serializes concurrent URL creation across two actual API instances", async () => {
    const booking = await hold(await fixture());
    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        create(booking.id, index % 2 ? remote : server),
      ),
    );
    expect(responses.map((row) => row.status)).toEqual([
      201, 201, 201, 201, 201,
    ]);
    expect(
      new Set(responses.map((row) => (data(row) as Checkout).url)).size,
    ).toBe(1);
    expect(
      await prisma.payment.count({ where: { bookingId: booking.id } }),
    ).toBe(1);
  });
  it("requires ownership and bearer authentication, including for an unrelated administrator", async () => {
    const booking = await hold(await fixture());
    await request(server)
      .post("/api/v1/payments/create-sandbox-url")
      .send({ bookingId: booking.id, returnUrl })
      .expect(401);
    await request(server)
      .get(`/api/v1/payments/${booking.id}/status`)
      .expect(401);
    for (const auth of [foreignToken, adminToken]) {
      await create(booking.id, server, auth).expect(404);
      await status(booking.id, auth).expect(404);
    }
    await create(randomUUID()).expect(404);
    await status(randomUUID()).expect(404);
  });
  it("rejects unknown fields, numeric amounts, invalid UUIDs/statuses and duplicate form values", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    const signed = callback(booking, payment);
    for (const body of [
      { ...signed, amount: 85500 },
      { ...signed, status: "PENDING" },
      { ...signed, extra: "x" },
      { ...signed, bookingId: "bad" },
      { ...signed, signature: [signed.signature, signed.signature] },
      { ...signed, amount: "085500.00" },
    ])
      await request(server)
        .post("/api/v1/payments/webhook")
        .send(body)
        .expect(400);
    await request(server)
      .post("/api/v1/payments/create-sandbox-url")
      .auth(token, { type: "bearer" })
      .send({ bookingId: booking.id, returnUrl, amount: "1.00" })
      .expect(400);
    expect((await stored(booking.id)).payments[0]?.status).toBe("PENDING");
  });
  it("rejects invalid or tampered HMAC before any mutation", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    const signed = callback(booking, payment);
    expect(
      error(
        await webhook({ ...signed, signature: "0".repeat(128) }).expect(401),
      ),
    ).toBe("PAYMENT_SIGNATURE_INVALID");
    await webhook({ ...signed, amount: "1.00" }).expect(401);
    await webhook({ ...signed, status: "FAILED" }).expect(401);
    const url = new URL(payment.url);
    await webhook({
      ...signed,
      signature: required(url.searchParams.get("signature")),
    }).expect(401);
    expect((await stored(booking.id)).status).toBe("HOLDING");
    expect(await points()).toBe(0);
  });
  it("checks signed amount, transaction binding and order code against stored snapshots", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    expect(
      error(
        await webhook(
          callback(booking, payment, "SUCCESS", { amount: "1.00" }),
        ).expect(400),
      ),
    ).toBe("PAYMENT_AMOUNT_MISMATCH");
    await webhook(
      callback(booking, payment, "SUCCESS", {
        transactionCode: `NOVA-SB-${randomUUID()}`,
      }),
    ).expect(404);
    await webhook(
      callback(booking, payment, "SUCCESS", {
        orderCode: "NOVA-" + "f".repeat(32),
      }),
    ).expect(404);
    const second = await hold(await fixture());
    await webhook(callback(second, payment)).expect(404);
    expect((await stored(booking.id)).status).toBe("HOLDING");
  });
  it("bounds first callback freshness and rejects future or stale signed timestamps", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    for (const offset of [-360000, 60000])
      expect(
        error(
          await webhook(
            callback(booking, payment, "SUCCESS", {
              timestamp: new Date(Date.now() + offset).toISOString(),
            }),
          ).expect(400),
        ),
      ).toBe("PAYMENT_TIMESTAMP_INVALID");
    expect((await stored(booking.id)).payments[0]?.status).toBe("PENDING");
  });
  it("TC-03 phase8: atomically pays/sells/awards once, emits real remote seat_sold and leaves one durable ticket request", async () => {
    const f = await fixture();
    const booking = await hold(f);
    const payment = await checkout(booking);
    const notifications = await watch(f.showtime.id);
    await app.get(ExpiryOutboxRelay).flush();
    const queue = app.get<Queue>(getQueueToken("seat-expiration"));
    expect(await queue.getJob(`booking-expire-${booking.id}`)).toBeDefined();
    const signed = callback(booking, payment);
    expect(data(await webhook(signed).expect(200)) as State).toMatchObject({
      bookingStatus: "PAID",
      paymentStatus: "SUCCESS",
      duplicate: false,
      canPay: false,
    });
    const row = await stored(booking.id);
    expect(row.seats.every((seat) => seat.status === "SOLD")).toBe(true);
    expect(await points()).toBe(8);
    const ticket = await prisma.outboxEvent.findMany({
      where: { aggregateId: booking.id, eventType: TICKET_REQUESTED },
    });
    expect(ticket).toHaveLength(1);
    expect(ticket[0]?.processedAt).toBeNull();
    expect(
      await prisma.eTicket.count({ where: { bookingId: booking.id } }),
    ).toBe(0);
    await flushSeats();
    await eventually(() =>
      Promise.resolve(
        notifications.some((event) => event.type === "seat_sold"),
      ),
    );
    expect(
      notifications.find((event) => event.type === "seat_sold")?.seatIds,
    ).toEqual([required(f.seats[0]).id]);
    expect(JSON.stringify(notifications)).not.toMatch(
      /userId|email|signature|amount|password/,
    );
    expect(
      (data(await webhook(signed, remote).expect(200)) as State).duplicate,
    ).toBe(true);
    expect(await points()).toBe(8);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: booking.id, eventType: TICKET_REQUESTED },
      }),
    ).toBe(1);
    await app.get(ExpiryOutboxRelay).flush();
    expect(await queue.getJob(`booking-expire-${booking.id}`)).toBeUndefined();
    const harmless = await queue.add(
      "expire-booking-hold",
      { bookingId: booking.id },
      { jobId: `paid-proof-${booking.id}`, removeOnComplete: false },
    );
    await eventually(async () => (await harmless.getState()) === "completed");
    expect((await stored(booking.id)).seats[0]?.status).toBe("SOLD");
  });
  it("serializes simultaneous duplicate SUCCESS across instances and never increments points twice", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    const signed = callback(booking, payment);
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        webhook(signed, i % 2 ? remote : server),
      ),
    );
    expect(responses.every((row) => row.status === 200)).toBe(true);
    expect(
      responses.filter((row) => !(data(row) as State).duplicate),
    ).toHaveLength(1);
    expect(await points()).toBe(8);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: booking.id, eventType: "seat_sold" },
      }),
    ).toBe(1);
  });
  it.each(["FAILED", "CANCELLED"] as const)(
    "TC-04 %s releases history, broadcasts and allows another owner to hold",
    async (outcome) => {
      const f = await fixture();
      const booking = await hold(f);
      const payment = await checkout(booking);
      const notifications = await watch(f.showtime.id);
      const signed = callback(booking, payment, outcome);
      expect(data(await webhook(signed).expect(200)) as State).toMatchObject({
        bookingStatus: "CANCELLED",
        paymentStatus: outcome,
        duplicate: false,
      });
      expect((await stored(booking.id)).seats[0]?.status).toBe("AVAILABLE");
      expect(await points()).toBe(0);
      await flushSeats();
      await eventually(() =>
        Promise.resolve(
          notifications.some((event) => event.type === "seat_released"),
        ),
      );
      const second = await hold(f, foreignToken);
      expect(second.id).not.toBe(booking.id);
      expect((data(await webhook(signed).expect(200)) as State).duplicate).toBe(
        true,
      );
      await app.get(SeatBookingService).autoReleaseExpiredHold(booking.id);
      expect((await stored(second.id)).seats[0]?.status).toBe("HOLDING");
      expect(
        await prisma.outboxEvent.count({
          where: { aggregateId: booking.id, eventType: "seat_released" },
        }),
      ).toBe(1);
      expect(
        await prisma.outboxEvent.count({
          where: { aggregateId: booking.id, eventType: TICKET_REQUESTED },
        }),
      ).toBe(0);
    },
  );
  it("rejects conflicting terminal callbacks after success without releasing SOLD", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    await webhook(callback(booking, payment)).expect(200);
    for (const outcome of ["FAILED", "CANCELLED"] as const)
      expect(
        error(await webhook(callback(booking, payment, outcome)).expect(409)),
      ).toBe("PAYMENT_ALREADY_FINALIZED");
    await request(server)
      .post(`/api/v1/bookings/${booking.id}/cancel`)
      .auth(token, { type: "bearer" })
      .expect(409);
    expect((await stored(booking.id)).seats[0]?.status).toBe("SOLD");
    expect(await points()).toBe(8);
  });
  it("never resurrects a failed transaction after its seats have a new owner", async () => {
    const f = await fixture();
    const booking = await hold(f);
    const payment = await checkout(booking);
    await webhook(callback(booking, payment, "FAILED")).expect(200);
    const second = await hold(f, foreignToken);
    await webhook(callback(booking, payment)).expect(409);
    expect((await stored(second.id)).seats[0]?.status).toBe("HOLDING");
    expect(await points()).toBe(0);
  });
  it("commits expiry on a late SUCCESS, cancels its payment and protects a later hold", async () => {
    const f = await fixture();
    const booking = await hold(f);
    const payment = await checkout(booking);
    await expireFixture(booking.id);
    expect(error(await webhook(callback(booking, payment)).expect(409))).toBe(
      "BOOKING_NOT_PAYABLE",
    );
    const row = await stored(booking.id);
    expect(row.status).toBe("EXPIRED");
    expect(row.seats[0]?.status).toBe("AVAILABLE");
    expect(row.payments[0]?.status).toBe("CANCELLED");
    const second = await hold(f, foreignToken);
    await webhook(callback(booking, payment)).expect(409);
    expect((await stored(second.id)).seats[0]?.status).toBe("HOLDING");
    expect(await points()).toBe(0);
  });
  it("keeps owner cancellation terminal when a signed success arrives later", async () => {
    const f = await fixture();
    const booking = await hold(f);
    const payment = await checkout(booking);
    await request(server)
      .post(`/api/v1/bookings/${booking.id}/cancel`)
      .auth(token, { type: "bearer" })
      .expect(200);
    const second = await hold(f, foreignToken);
    await webhook(callback(booking, payment)).expect(409);
    expect((await stored(booking.id)).status).toBe("CANCELLED");
    expect((await stored(second.id)).seats[0]?.status).toBe("HOLDING");
    expect(await points()).toBe(0);
  });
  it("resolves SUCCESS versus FAILED races with one terminal outcome and one set of effects", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    const responses = await Promise.all([
      webhook(callback(booking, payment)),
      webhook(callback(booking, payment, "FAILED"), remote),
    ]);
    expect(responses.map((row) => row.status).sort()).toEqual([200, 409]);
    const row = await stored(booking.id);
    if (row.status === "PAID") {
      expect(row.payments[0]?.status).toBe("SUCCESS");
      expect(row.seats[0]?.status).toBe("SOLD");
      expect(await points()).toBe(8);
    } else {
      expect(row.status).toBe("CANCELLED");
      expect(row.payments[0]?.status).toBe("FAILED");
      expect(row.seats[0]?.status).toBe("AVAILABLE");
      expect(await points()).toBe(0);
    }
  });
  it("serializes payment versus owner cancel and expiry without freeing a paid seat", async () => {
    for (let iteration = 0; iteration < 3; iteration++) {
      await prisma.user.update({
        where: { id: userId },
        data: { cMemberPoints: 0 },
      });
      const booking = await hold(await fixture());
      const payment = await checkout(booking);
      const responses = await Promise.all([
        webhook(callback(booking, payment), remote),
        request(server)
          .post(`/api/v1/bookings/${booking.id}/cancel`)
          .auth(token, { type: "bearer" }),
        app.get(SeatBookingService).autoReleaseExpiredHold(booking.id),
      ]);
      expect([200, 409]).toContain(responses[0].status);
      const row = await stored(booking.id);
      expect(["PAID", "CANCELLED"]).toContain(row.status);
      expect(row.seats[0]?.status).toBe(
        row.status === "PAID" ? "SOLD" : "AVAILABLE",
      );
      expect(await points()).toBe(row.status === "PAID" ? 8 : 0);
    }
  });
  it("uses the DB clock after waiting on the member lock so an expired hold cannot be paid", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    const deadline = new Date(Date.now() + 500);
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        createdAt: new Date(deadline.getTime() - 300000),
        expiredAt: deadline,
      },
    });
    const entered = gate();
    const release = gate();
    const lock = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
        entered.release();
        await release.promise;
      },
      { timeout: 10000 },
    );
    await entered.promise;
    const repo = app.get(PaymentsRepository);
    const original = repo.lockMember.bind(repo);
    const waiting = gate();
    jest.spyOn(repo, "lockMember").mockImplementation(async (...args) => {
      waiting.release();
      await original(...args);
    });
    const pending = webhook(callback(booking, payment)).then(
      (response) => response,
    );
    try {
      await waiting.promise;
      await eventually(async () => {
        const rows = await prisma.$queryRaw<
          Array<{ now: Date }>
        >`SELECT clock_timestamp() AS now`;
        return required(rows[0]).now >= deadline;
      });
      release.release();
      await lock;
      const response = await pending;
      expect(response.status).toBe(409);
    } finally {
      release.release();
      await lock;
    }
    expect((await stored(booking.id)).status).toBe("EXPIRED");
    expect(await points()).toBe(0);
  });
  it("rolls back PAID/SOLD/points/payment and all outbox rows when event insertion fails", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    const events = app.get(OutboxRepository);
    const original = events.add.bind(events);
    const spy = jest
      .spyOn(events, "add")
      .mockImplementation(async (...args) => {
        if (args[0] === TICKET_REQUESTED)
          throw new Error("private-rollback-marker");
        return original(...args);
      });
    const response = await webhook(callback(booking, payment)).expect(500);
    expect(response.text).not.toContain("private-rollback-marker");
    const row = await stored(booking.id);
    expect(row.status).toBe("HOLDING");
    expect(row.seats[0]?.status).toBe("HOLDING");
    expect(row.payments[0]?.status).toBe("PENDING");
    expect(await points()).toBe(0);
    expect(
      await prisma.outboxEvent.count({
        where: {
          aggregateId: booking.id,
          eventType: {
            in: ["seat_sold", TICKET_REQUESTED, EXPIRATION_CANCEL_REQUESTED],
          },
        },
      }),
    ).toBe(0);
    spy.mockRestore();
    await webhook(callback(booking, payment)).expect(200);
    expect(await points()).toBe(8);
  });
  it("does not broadcast an uncommitted payment event and publishes it after commit", async () => {
    const f = await fixture();
    const booking = await hold(f);
    const payment = await checkout(booking);
    const notifications = await watch(f.showtime.id);
    const entered = gate();
    const release = gate();
    const events = app.get(OutboxRepository);
    const original = events.add.bind(events);
    jest.spyOn(events, "add").mockImplementation(async (...args) => {
      const result = await original(...args);
      if (args[0] === TICKET_REQUESTED) {
        entered.release();
        await release.promise;
      }
      return result;
    });
    const pending = webhook(callback(booking, payment)).then(
      (response) => response,
    );
    try {
      await entered.promise;
      await other.get(SeatEventsRelay).flush();
      expect(notifications).toHaveLength(0);
      expect((await stored(booking.id)).status).toBe("HOLDING");
    } finally {
      release.release();
    }
    expect((await pending).status).toBe(200);
    await flushSeats();
    await eventually(() =>
      Promise.resolve(
        notifications.some((event) => event.type === "seat_sold"),
      ),
    );
  });
  it("keeps a successful payment committed when expiry-job removal fails and retries its durable request", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    await app.get(ExpiryOutboxRelay).flush();
    const queue = app.get<Queue>(getQueueToken("seat-expiration"));
    const spy = jest
      .spyOn(app.get(SeatExpirationQueueService), "cancel")
      .mockRejectedValue(new Error("queue-unavailable"));
    await webhook(callback(booking, payment)).expect(200);
    await app.get(ExpiryOutboxRelay).flush();
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: booking.id,
        eventType: EXPIRATION_CANCEL_REQUESTED,
      },
    });
    expect(event.processedAt).toBeNull();
    expect(event.lastError).toBe("EXPIRATION_QUEUE_UNAVAILABLE");
    expect((await stored(booking.id)).status).toBe("PAID");
    spy.mockRestore();
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { availableAt: new Date(0) },
    });
    await app.get(ExpiryOutboxRelay).flush();
    expect(
      (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } }))
        .processedAt,
    ).not.toBeNull();
    expect(await queue.getJob(`booking-expire-${booking.id}`)).toBeUndefined();
  });
  it("renders and completes the signed Sandbox using a real HTML form without exposing the HMAC key", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    const url = new URL(payment.url);
    const page = await request(server)
      .get(url.pathname + url.search)
      .expect(200)
      .expect("content-type", /html/);
    expect(page.text).toContain("Thanh toán mô phỏng");
    expect(page.text).not.toContain(
      required(process.env.PAYMENT_SANDBOX_SECRET),
    );
    expect(page.headers["referrer-policy"]).toBe("no-referrer");
    const form = Object.fromEntries(url.searchParams);
    await request(server)
      .post("/api/v1/payments/sandbox/complete")
      .type("form")
      .send({ ...form, result: "SUCCESS" })
      .expect(200)
      .expect("content-type", /html/);
    expect((await stored(booking.id)).status).toBe("PAID");
    expect(await points()).toBe(8);
    await request(server)
      .post("/api/v1/payments/sandbox/complete")
      .type("form")
      .send({ ...form, result: "SUCCESS" })
      .expect(200);
    expect(await points()).toBe(8);
    url.searchParams.set("returnUrl", "https://attacker.example/result");
    await request(server)
      .get(url.pathname + url.search)
      .expect(401);
  });
  it("validates return origins and escapes signed query values in HTML", async () => {
    const booking = await hold(await fixture());
    for (const url of [
      "javascript:alert(1)",
      "https://attacker.example",
      "http://localhost:3000.attacker.test",
      "http://user:password@localhost:3000/result",
      "http://localhost:3000/result#fragment",
      "/relative",
    ])
      expect(
        error(await create(booking.id, server, token, url).expect(400)),
      ).toBe("PAYMENT_RETURN_URL_INVALID");
    const payment = data(
      await create(
        booking.id,
        server,
        token,
        'http://localhost:3000/result?x="><script>alert(1)</script>',
      ).expect(201),
    ) as Checkout;
    const url = new URL(payment.url);
    const page = await request(server)
      .get(url.pathname + url.search)
      .expect(200);
    expect(page.text).not.toContain("<script>");
    expect(page.headers["content-security-policy"]).toContain(
      "form-action 'self'",
    );
  });
  it("reads the hold price snapshot even after the catalog price changes", async () => {
    const f = await fixture();
    const booking = await hold(f);
    await prisma.showtime.update({
      where: { id: f.showtime.id },
      data: { baseTicketPrice: "150000.00" },
    });
    const payment = await checkout(booking);
    expect(payment.amount).toBe("85500.00");
    await webhook(callback(booking, payment)).expect(200);
    expect((await stored(booking.id)).finalAmount.toFixed(2)).toBe("85500.00");
    expect(await points()).toBe(8);
  });
  it("serializes separate successful bookings for one member without losing earned points", async () => {
    const f = await fixture();
    const first = await hold(f);
    const second = await hold(f, token, [required(f.seats[1]).id]);
    const payments = await Promise.all([checkout(first), checkout(second)]);
    const results = await Promise.all([
      webhook(callback(first, required(payments[0]))),
      webhook(callback(second, required(payments[1])), remote),
    ]);
    expect(results.map((row) => row.status)).toEqual([200, 200]);
    expect(await points()).toBe(16);
  });
  it("rejects point overflow atomically and permits a retry after points are corrected", async () => {
    const booking = await hold(await fixture());
    const payment = await checkout(booking);
    await prisma.user.update({
      where: { id: userId },
      data: { cMemberPoints: 2147483647 },
    });
    expect(error(await webhook(callback(booking, payment)).expect(409))).toBe(
      "MEMBER_POINTS_LIMIT",
    );
    expect((await stored(booking.id)).status).toBe("HOLDING");
    expect((await stored(booking.id)).payments[0]?.status).toBe("PENDING");
    await prisma.user.update({
      where: { id: userId },
      data: { cMemberPoints: 0 },
    });
    await webhook(callback(booking, payment)).expect(200);
  });
  it("expires stale URL/status reads without extending or resurrecting the hold", async () => {
    const booking = await hold(await fixture());
    await expireFixture(booking.id);
    await create(booking.id).expect(409);
    expect((await stored(booking.id)).status).toBe("EXPIRED");
    expect(data(await status(booking.id).expect(200)) as State).toMatchObject({
      bookingStatus: "EXPIRED",
      paymentStatus: null,
      canPay: false,
    });
  });
  it("documents the three payment APIs, separate signature domains alongside Phase9 ticket/check-in routes", async () => {
    const spec = JSON.parse(
      (await request(server).get("/api/docs-json").expect(200)).text,
    ) as {
      paths: Record<
        string,
        { post?: { security?: unknown }; get?: { security?: unknown } }
      >;
      components: { schemas: Record<string, unknown> };
    };
    expect(spec.paths).toHaveProperty("/api/v1/payments/create-sandbox-url");
    expect(spec.paths).toHaveProperty("/api/v1/payments/webhook");
    expect(spec.paths).toHaveProperty("/api/v1/payments/{bookingId}/status");
    expect(
      spec.paths["/api/v1/payments/create-sandbox-url"]?.post?.security,
    ).toEqual([{ bearer: [] }]);
    expect(
      spec.paths["/api/v1/payments/webhook"]?.post?.security,
    ).toBeUndefined();
    expect(spec.components.schemas).toHaveProperty("PaymentWebhookDto");
    expect(spec.paths).toHaveProperty("/api/v1/staff/check-in");
  });
});
