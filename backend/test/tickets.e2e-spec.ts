import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { INestApplication } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import request, { Response } from "supertest";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { TokenService } from "../src/modules/auth/token.service";
import { BookingMaintenanceService } from "../src/modules/bookings/booking-maintenance.service";
import { FulfillmentRelay } from "../src/modules/notifications/fulfillment-relay.service";
import { TicketEmailProcessor } from "../src/modules/notifications/ticket-email.processor";
import { TicketsService } from "../src/modules/tickets/tickets.service";
import * as ticketQr from "../src/modules/tickets/ticket-qr";
import { TicketsRepository } from "../src/modules/tickets/tickets.repository";
import { ticketCalendar } from "../src/modules/tickets/ticket-format";
import { ticketEmail } from "../src/modules/notifications/ticket-email";
import { SeatExpirationProcessor } from "../src/queues/seat-expiration/seat-expiration.processor";
import {
  EMAIL_REQUESTED,
  TICKET_REQUESTED,
  OutboxRepository,
} from "../src/queues/outbox/outbox.repository";
import { TicketEmailQueueService } from "../src/queues/ticket-email/ticket-email-queue.service";
import { SeatEventsRelay } from "../src/realtime/seat-events-relay.service";
import { createSmtpFixture, SmtpFixture } from "./support/smtp-fixture.cjs";

interface Booking {
  id: string;
  orderCode: string;
  finalAmount: string;
}
interface Checkout {
  transactionCode: string;
}
interface Ticket {
  id: string;
  bookingId: string;
  ticketHash: string;
  qrCodeBase64: string;
  isCheckedIn: boolean;
  amount: string;
  seats: Array<{ label: string }>;
  combos: Array<{ name: string; quantity: number }>;
}
function data(response: Response): unknown {
  return (JSON.parse(response.text) as { data: unknown }).data;
}
function error(response: Response): string {
  return (JSON.parse(response.text) as { error: string }).error;
}
function required<T>(value: T | null | undefined): T {
  if (value === undefined || value === null)
    throw new Error("Required fixture value is missing.");
  return value;
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
async function eventually(check: () => Promise<boolean>): Promise<void> {
  const end = Date.now() + 7000;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Expected ticket/SMTP/queue state did not arrive.");
}

describe("Phase9 real QR tickets, SMTP/BullMQ recovery and atomic staff admission", () => {
  let app: INestApplication;
  let other: INestApplication;
  let server: Server;
  let remote: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let smtp: SmtpFixture;
  let userId: string;
  let otherUserId: string;
  let staffId: string;
  let secondStaffId: string;
  let adminId: string;
  let token: string;
  let foreignToken: string;
  let staffToken: string;
  let secondStaffToken: string;
  let adminToken: string;
  let movieId: string;
  let cinemaId: string;
  let comboId: string;
  const prefix = `p9-${randomUUID()}`;
  const namespace = () => process.env.BULLMQ_PREFIX || "invalid";
  async function fixture(offset = 30 * 60000) {
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
    const startTime = new Date(Date.now() + offset);
    const showtime = await prisma.showtime.create({
      data: {
        roomId: room.id,
        movieId,
        startTime,
        endTime: new Date(startTime.getTime() + 135 * 60000),
        baseTicketPrice: "90000.00",
      },
    });
    const booking = data(
      await request(server)
        .post("/api/v1/bookings/hold")
        .auth(token, { type: "bearer" })
        .send({
          showtimeId: showtime.id,
          seatIds: seats.slice(0, 2).map((seat) => seat.id),
          comboItems: [{ comboId, quantity: 1 }],
        })
        .expect(201),
    ) as Booking;
    return { showtime, seats, booking };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  async function pay(f: Fixture) {
    const payment = data(
      await request(server)
        .post("/api/v1/payments/create-sandbox-url")
        .auth(token, { type: "bearer" })
        .send({ bookingId: f.booking.id, returnUrl: "http://localhost:3000/" })
        .expect(201),
    ) as Checkout;
    const payload = {
      bookingId: f.booking.id,
      orderCode: f.booking.orderCode,
      transactionCode: payment.transactionCode,
      amount: f.booking.finalAmount,
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
    };
    const signature = createHmac(
      "sha512",
      required(process.env.PAYMENT_SANDBOX_SECRET),
    )
      .update(
        `webhook.v1:${JSON.stringify([payload.bookingId, payload.orderCode, payload.transactionCode, payload.amount, payload.timestamp, payload.status])}`,
      )
      .digest("hex");
    await request(server)
      .post("/api/v1/payments/webhook")
      .send({ ...payload, signature })
      .expect(200);
    return { ...payload, signature };
  }
  function get(id: string, auth = token) {
    return request(server)
      .get(`/api/v1/tickets/${id}`)
      .auth(auth, { type: "bearer" });
  }
  function list(auth = token, query: object = {}) {
    return request(server)
      .get("/api/v1/tickets/me")
      .auth(auth, { type: "bearer" })
      .query(query);
  }
  function check(ticketHash: string, target = server, auth = staffToken) {
    return request(target)
      .post("/api/v1/staff/check-in")
      .auth(auth, { type: "bearer" })
      .send({ ticketHash });
  }
  async function generate(f: Fixture) {
    return app.get(TicketsService).generateETicket(f.booking.id);
  }
  async function emailEvent(bookingId: string) {
    return prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: bookingId, eventType: EMAIL_REQUESTED },
    });
  }
  async function delivered(id: string) {
    await eventually(
      async () =>
        (await prisma.outboxEvent.findUniqueOrThrow({ where: { id } }))
          .processedAt !== null,
    );
  }
  function messages(id: string) {
    return smtp.state.messages.filter((message) => message.raw.includes(id));
  }
  async function retryEvent(id: string) {
    await prisma.outboxEvent.update({
      where: { id },
      data: { availableAt: new Date(0) },
    });
    await app.get(FulfillmentRelay).flush();
  }
  beforeAll(async () => {
    smtp = await createSmtpFixture();
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = String(smtp.port);
    process.env.SMTP_USER = "";
    process.env.SMTP_PASS = "";
    process.env.SMTP_FROM = "tickets@nova.local";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_TIMEOUT_MS = "1000";
    process.env.CHECK_IN_BEFORE_MINUTES = "60";
    process.env.CHECK_IN_AFTER_MINUTES = "30";
    app = await createApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    await app.get(FulfillmentRelay).stop();
    await app.get(BookingMaintenanceService).stop();
    await app.get(SeatEventsRelay).stop();
    other = await createApplication({ logger: false });
    await other.listen(0, "127.0.0.1");
    await other.get(FulfillmentRelay).stop();
    await other.get(BookingMaintenanceService).stop();
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
    for (const role of [
      "CUSTOMER",
      "CUSTOMER",
      "STAFF",
      "STAFF",
      "ADMIN",
    ] as const)
      ids.push(
        (
          await prisma.user.create({
            data: {
              email: `${prefix}-${String(ids.length)}@example.test`,
              passwordHash: randomBytes(32).toString("hex"),
              fullName: "Ticket fixture",
              role,
            },
          })
        ).id,
      );
    [userId, otherUserId, staffId, secondStaffId, adminId] = ids as [
      string,
      string,
      string,
      string,
      string,
    ];
    const tokens = [];
    for (const id of ids)
      tokens.push((await app.get(TokenService).issue(id)).tokens.accessToken);
    [token, foreignToken, staffToken, secondStaffToken, adminToken] =
      tokens as [string, string, string, string, string];
    movieId = (
      await prisma.movie.create({
        data: {
          title: prefix,
          description: "Ticket fixture",
          durationMinutes: 120,
          ageRating: "T13",
          releaseDate: new Date("2025-01-01T00:00:00Z"),
        },
      })
    ).id;
    cinemaId = (
      await prisma.cinema.create({
        data: { name: prefix, address: "Fixture", city: prefix },
      })
    ).id;
    comboId = (
      await prisma.combo.create({
        data: {
          name: "Party Combo 69K",
          description: prefix,
          price: "69000.00",
        },
      })
    ).id;
  });
  beforeEach(async () => {
    await app.get(FulfillmentRelay).flush();
    const ids = (
      await prisma.booking.findMany({
        where: { userId, status: "PAID" },
        select: { id: true },
      })
    ).map((row) => row.id);
    await eventually(
      async () =>
        (await prisma.outboxEvent.count({
          where: {
            eventType: EMAIL_REQUESTED,
            aggregateId: { in: ids },
            processedAt: null,
          },
        })) === 0,
    );
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    smtp.state.rejectNext = 0;
    smtp.state.stall = false;
    const keys = await redis.keys(`${namespace()}:throttle:*`);
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    await app.get(FulfillmentRelay).stop();
    await other.get(FulfillmentRelay).stop();
    await app.get(TicketEmailProcessor).worker.pause();
    await other.get(TicketEmailProcessor).worker.pause();
    await app.get(SeatExpirationProcessor).worker.pause();
    await other.get(SeatExpirationProcessor).worker.pause();
    const userIds = [userId, otherUserId, staffId, secondStaffId, adminId];
    const ids = (
      await prisma.booking.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      })
    ).map((row) => row.id);
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: { in: ids } },
    });
    await prisma.eTicket.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
    await prisma.showtime.deleteMany({ where: { movieId } });
    await prisma.seat.deleteMany({ where: { room: { cinemaId } } });
    await prisma.room.deleteMany({ where: { cinemaId } });
    await prisma.cinema.delete({ where: { id: cinemaId } });
    await prisma.movie.delete({ where: { id: movieId } });
    await prisma.combo.delete({ where: { id: comboId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await other.close();
    await app.close();
    const keys = await redis.keys(`${namespace()}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
    await smtp.close();
  });

  it("TC-03 completes committed payment into one QR and one actual SMTP email; duplicate webhook has no new effects", async () => {
    const f = await fixture();
    const callback = await pay(f);
    await app.get(FulfillmentRelay).flush();
    const ticket = await prisma.eTicket.findUniqueOrThrow({
      where: { bookingId: f.booking.id },
    });
    const event = await emailEvent(f.booking.id);
    await delivered(event.id);
    expect(ticket.ticketHash).toMatch(/^[a-f0-9]{64}$/);
    expect(ticket.qrCodeBase64).toMatch(/^data:image\/png;base64,/);
    expect(messages(event.id)).toHaveLength(1);
    expect(
      (
        await prisma.outboxEvent.findFirstOrThrow({
          where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
        })
      ).processedAt,
    ).not.toBeNull();
    await request(remote)
      .post("/api/v1/payments/webhook")
      .send(callback)
      .expect(200);
    await other.get(FulfillmentRelay).flush();
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: f.booking.id, eventType: EMAIL_REQUESTED },
      }),
    ).toBe(1);
    expect(messages(event.id)).toHaveLength(1);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
        .cMemberPoints,
    ).toBe(23);
  });
  it("decodes the generated PNG to only the opaque hash and creates different hashes for different bookings", async () => {
    const first = await fixture();
    const second = await fixture();
    await pay(first);
    await pay(second);
    const a = await generate(first);
    const b = await generate(second);
    const png = PNG.sync.read(
      Buffer.from(
        a.qrCodeBase64.replace(/^data:image\/png;base64,/, ""),
        "base64",
      ),
    );
    expect(
      jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
    ).toBe(a.ticketHash);
    expect(a.ticketHash).not.toBe(b.ticketHash);
    expect(a.ticketHash).not.toContain(first.booking.id);
  });
  it("issues a committed PAID ticket from the wake signal while periodic recovery is delayed60s", async () => {
    const f = await fixture();
    const relay = app.get(FulfillmentRelay);
    const originalInterval = global.setInterval;
    const interval = jest
      .spyOn(global, "setInterval")
      .mockImplementationOnce((callback) => originalInterval(callback, 60000));
    try {
      relay.start();
      interval.mockRestore();
      await relay.flush(); // Drain startup before payment; the next poll is60s away.
      const callback = await pay(f);
      await eventually(
        async () =>
          (await prisma.eTicket.count({
            where: { bookingId: f.booking.id },
          })) === 1,
      );
      const ticket = await prisma.eTicket.findUniqueOrThrow({
        where: { bookingId: f.booking.id },
        include: { booking: { include: { seats: true } } },
      });
      expect(ticket.booking.status).toBe("PAID");
      expect(ticket.booking.seats.every((seat) => seat.status === "SOLD")).toBe(
        true,
      );
      const png = PNG.sync.read(
        Buffer.from(ticket.qrCodeBase64.split(",")[1] ?? "", "base64"),
      );
      expect(
        jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
      ).toBe(ticket.ticketHash);
      await request(server)
        .post("/api/v1/payments/webhook")
        .send(callback)
        .expect(200);
      await relay.flush();
      expect(
        await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
      ).toBe(1);
      expect(
        await prisma.outboxEvent.count({
          where: { aggregateId: f.booking.id, eventType: EMAIL_REQUESTED },
        }),
      ).toBe(1);
      expect(
        (
          await prisma.eTicket.findUniqueOrThrow({
            where: { bookingId: f.booking.id },
          })
        ).ticketHash,
      ).toBe(ticket.ticketHash);
    } finally {
      interval.mockRestore();
      await relay.stop();
    }
  });
  it("serializes concurrent generation across2 instances and keeps one stable QR and email event", async () => {
    const f = await fixture();
    await pay(f);
    const rows = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        (i % 2 ? other : app).get(TicketsService).generateETicket(f.booking.id),
      ),
    );
    expect(new Set(rows.map((row) => row.id)).size).toBe(1);
    expect(new Set(rows.map((row) => row.qrCodeBase64)).size).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: f.booking.id, eventType: EMAIL_REQUESTED },
      }),
    ).toBe(1);
  });
  it("refuses unpaid/cancelled bookings and issues no ticket or email", async () => {
    const f = await fixture();
    await expect(generate(f)).rejects.toThrow("Only a paid booking");
    await request(server)
      .post(`/api/v1/bookings/${f.booking.id}/cancel`)
      .auth(token, { type: "bearer" })
      .expect(200);
    await expect(generate(f)).rejects.toThrow();
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(0);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: f.booking.id, eventType: EMAIL_REQUESTED },
      }),
    ).toBe(0);
  });
  it("rolls back ticket and email together on outbox insertion failure, then safely retries", async () => {
    const f = await fixture();
    await pay(f);
    const events = app.get(OutboxRepository);
    const original = events.add.bind(events);
    const spy = jest
      .spyOn(events, "add")
      .mockImplementation(async (...args) => {
        if (args[0] === EMAIL_REQUESTED)
          throw new Error("private-email-insert-failure");
        return original(...args);
      });
    await expect(generate(f)).rejects.toThrow();
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(0);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: f.booking.id } }))
        .status,
    ).toBe("PAID");
    spy.mockRestore();
    await generate(f);
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(1);
  });
  it("keeps ticket requests pending on issuance failure and recovers after retry", async () => {
    const f = await fixture();
    await pay(f);
    const spy = jest
      .spyOn(app.get(TicketsService), "generateETicket")
      .mockRejectedValue(new Error("private-ticket-failure"));
    await app.get(FulfillmentRelay).flush();
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
    });
    expect(event.processedAt).toBeNull();
    expect(event.lastError).toBe("TICKET_ISSUANCE_FAILED");
    spy.mockRestore();
    await retryEvent(event.id);
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(1);
  });
  it("exposes only owner ticket detail/list with complete booking data and no credential fields", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const response = await get(ticket.id).expect(200);
    const result = data(response) as Ticket;
    expect(result).toMatchObject({
      bookingId: f.booking.id,
      amount: "236550.00",
      isCheckedIn: false,
    });
    expect(result.seats.map((seat) => seat.label)).toEqual(["A1", "A2"]);
    expect(result.combos).toEqual([
      { name: "Party Combo 69K", quantity: 1, unitPrice: "69000.00" },
    ]);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).not.toMatch(
      /password|email|requestPayload|responsePayload|userId|secret/,
    );
    const page = data(await list(token, { limit: 1, page: 1 }).expect(200)) as {
      items: Ticket[];
      meta: { total: number };
    };
    expect(page.items).toHaveLength(1);
    expect(page.meta.total).toBeGreaterThan(0);
    for (const auth of [foreignToken, adminToken])
      await get(ticket.id, auth).expect(404);
    expect(
      (data(await list(foreignToken).expect(200)) as { items: unknown[] })
        .items,
    ).toEqual([]);
    await request(server).get(`/api/v1/tickets/${ticket.id}`).expect(401);
    await get(randomUUID()).expect(404);
    await get("bad").expect(400);
  });
  it("validates pagination and strict boolean query filters", async () => {
    for (const query of [
      { page: 0 },
      { limit: 101 },
      { isCheckedIn: "1" },
      { isCheckedIn: ["true", "false"] },
      { unexpected: "x" },
    ])
      await list(token, query).expect(400);
    const page = data(
      await list(token, { isCheckedIn: "true" }).expect(200),
    ) as { items: Ticket[] };
    expect(page.items.every((ticket) => ticket.isCheckedIn)).toBe(true);
  });
  it("ADMIN reconciliation finds order/transaction without disclosing payment signatures or QR capabilities", async () => {
    const f = await fixture();
    const paid = await pay(f);
    const lookup = (reference: string, auth = adminToken) =>
      request(server)
        .get("/api/v1/admin/payments/reconciliation")
        .query({ reference })
        .auth(auth, { type: "bearer" });
    for (const reference of [f.booking.orderCode, paid.transactionCode]) {
      const response = await lookup(reference).expect(200);
      expect(data(response)).toMatchObject({
        bookingId: f.booking.id,
        bookingStatus: "PAID",
        amount: f.booking.finalAmount,
        canRecoverTicket: true,
      });
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.text).not.toMatch(
        /signature|ticketHash|qrCodeBase64|requestPayload|responsePayload|password/,
      );
    }
    await lookup(f.booking.orderCode, token).expect(403);
    await lookup(f.booking.orderCode, staffToken).expect(403);
    await lookup("NOVA-" + "0".repeat(32)).expect(404);
    await lookup("invalid").expect(400);
  });

  it("ADMIN recovery retries deferred durable issuance concurrently and converges to one QR", async () => {
    const f = await fixture();
    await pay(f);
    await prisma.outboxEvent.updateMany({
      where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
      data: {
        availableAt: new Date(Date.now() + 60000),
        lastError: "TICKET_ISSUANCE_FAILED",
      },
    });
    const recover = () =>
      request(server)
        .post(`/api/v1/admin/payments/${f.booking.id}/recover-ticket`)
        .auth(adminToken, { type: "bearer" })
        .expect(202);
    await Promise.all([recover(), recover()]);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
      }),
    ).toBe(1);
    await app.get(FulfillmentRelay).flush();
    const ticket = await generate(f);
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(1);
    expect(data(await recover())).toEqual({
      bookingId: f.booking.id,
      queued: false,
      ticketId: ticket.id,
    });
  });

  it("ADMIN recovery refuses unpaid orders and never steals an active delivery lease", async () => {
    const f = await fixture();
    const endpoint = `/api/v1/admin/payments/${f.booking.id}/recover-ticket`;
    await request(server)
      .post(endpoint)
      .auth(adminToken, { type: "bearer" })
      .expect(409);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: f.booking.id } }))
        .status,
    ).toBe("HOLDING");
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(0);
    await pay(f);
    await prisma.outboxEvent.updateMany({
      where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
      data: { lockedAt: new Date(), lockedBy: "owned-active-worker" },
    });
    await request(server)
      .post(endpoint)
      .auth(adminToken, { type: "bearer" })
      .expect(202);
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
    });
    expect(event.lockedBy).toBe("owned-active-worker");
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { lockedAt: null, lockedBy: null },
    });
    await generate(f);
  });

  it("ADMIN reconciliation projects a timed-out hold as EXPIRED without write-on-GET", async () => {
    const f = await fixture();
    await prisma.booking.update({
      where: { id: f.booking.id },
      data: {
        createdAt: new Date(Date.now() - 300001),
        expiredAt: new Date(Date.now() - 1),
      },
    });
    const response = await request(server)
      .get("/api/v1/admin/payments/reconciliation")
      .query({ reference: f.booking.orderCode })
      .auth(adminToken, { type: "bearer" })
      .expect(200);
    expect(data(response)).toMatchObject({
      bookingStatus: "EXPIRED",
      canRecoverTicket: false,
    });
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: f.booking.id } }))
        .status,
    ).toBe("HOLDING");
  });

  it("ADMIN recovery recreates a missing ticket-request event once after confirmed payment", async () => {
    const f = await fixture();
    await pay(f);
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
    });
    await Promise.all(
      [1, 2].map(() =>
        request(server)
          .post(`/api/v1/admin/payments/${f.booking.id}/recover-ticket`)
          .auth(adminToken, { type: "bearer" })
          .expect(202),
      ),
    );
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
      }),
    ).toBe(1);
    await app.get(FulfillmentRelay).flush();
    await generate(f);
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(1);
  });

  it("TC-05 records a staff check-in once with exact booking detail and rejects reuse", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const response = await check(ticket.ticketHash).expect(200);
    expect(data(response)).toMatchObject({
      orderCode: f.booking.orderCode,
      movie: prefix,
      cinema: prefix,
      isCheckedIn: true,
      seats: [{ label: "A1" }, { label: "A2" }],
      combos: [{ name: "Party Combo 69K", quantity: 1 }],
    });
    expect(response.text).not.toMatch(/ticketHash|qrCodeBase64|email|userId/);
    const row = await prisma.eTicket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect(row.checkedInByStaffId).toBe(staffId);
    expect(row.checkedInAt).not.toBeNull();
    expect(
      error(
        await check(ticket.ticketHash, remote, secondStaffToken).expect(409),
      ),
    ).toBe("TICKET_ALREADY_USED");
  });
  it("gives one winner to six simultaneous staff/admin scans across2 API instances", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        check(
          ticket.ticketHash,
          i % 2 ? remote : server,
          i % 3 === 0 ? adminToken : i % 2 ? secondStaffToken : staffToken,
        ),
      ),
    );
    expect(responses.filter((row) => row.status === 200)).toHaveLength(1);
    expect(responses.filter((row) => row.status === 409)).toHaveLength(5);
    const row = await prisma.eTicket.findUniqueOrThrow({
      where: { id: ticket.id },
    });
    expect([staffId, secondStaffId, adminId]).toContain(row.checkedInByStaffId);
  });
  it("enforces roles using the current DB role and prevents caller-supplied staff identity", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    await check(ticket.ticketHash, server, token).expect(403);
    await request(server)
      .post("/api/v1/staff/check-in")
      .send({ ticketHash: ticket.ticketHash })
      .expect(401);
    await request(server)
      .post("/api/v1/staff/check-in")
      .auth(staffToken, { type: "bearer" })
      .send({ ticketHash: ticket.ticketHash, staffId: adminId })
      .expect(400);
    await prisma.user.update({
      where: { id: staffId },
      data: { role: "CUSTOMER" },
    });
    try {
      await check(ticket.ticketHash).expect(403);
    } finally {
      await prisma.user.update({
        where: { id: staffId },
        data: { role: "STAFF" },
      });
    }
    expect(
      (await prisma.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .isCheckedIn,
    ).toBe(false);
  });
  it("returns404 for unknown valid hashes and400 for malformed or mass-assigned check-in payloads", async () => {
    expect(
      error(await check(randomBytes(32).toString("hex")).expect(404)),
    ).toBe("TICKET_NOT_FOUND");
    for (const value of ["bad", "a".repeat(63), "A".repeat(64)])
      await check(value).expect(400);
    await request(server)
      .post("/api/v1/staff/check-in")
      .auth(staffToken, { type: "bearer" })
      .send({ ticketHash: ["a".repeat(64)] })
      .expect(400);
  });
  it("rejects too-early and too-late scans without consuming the ticket", async () => {
    const f = await fixture(2 * 86400000);
    await pay(f);
    const ticket = await generate(f);
    expect(error(await check(ticket.ticketHash).expect(409))).toBe(
      "CHECK_IN_OUTSIDE_WINDOW",
    );
    const past = new Date(Date.now() - 31 * 60000);
    await prisma.showtime.update({
      where: { id: f.showtime.id },
      data: {
        startTime: past,
        endTime: new Date(past.getTime() + 135 * 60000),
      },
    });
    expect(error(await check(ticket.ticketHash).expect(409))).toBe(
      "CHECK_IN_OUTSIDE_WINDOW",
    );
    expect(
      (await prisma.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .isCheckedIn,
    ).toBe(false);
  });
  it("does not admit a ticket whose booking is no longer PAID", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    await prisma.booking.update({
      where: { id: f.booking.id },
      data: { status: "CANCELLED" },
    });
    expect(error(await check(ticket.ticketHash).expect(409))).toBe(
      "TICKET_BOOKING_NOT_PAID",
    );
    expect(
      (await prisma.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .isCheckedIn,
    ).toBe(false);
  });
  it("rolls back admission on a DB update failure and permits a later first successful scan", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const spy = jest
      .spyOn(app.get(TicketsRepository), "checkIn")
      .mockRejectedValue(new Error("private-check-in-failure"));
    const response = await check(ticket.ticketHash).expect(500);
    expect(response.text).not.toContain("private-check-in-failure");
    expect(
      (await prisma.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .checkedInAt,
    ).toBeNull();
    spy.mockRestore();
    await check(ticket.ticketHash).expect(200);
  });
  it("returns a private UTC ICS download with stable UID and no QR capability", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const response = await request(server)
      .get(`/api/v1/tickets/${ticket.id}/calendar`)
      .auth(token, { type: "bearer" })
      .expect(200)
      .expect("content-type", /text\/calendar/);
    expect(response.text).toContain(`UID:${ticket.id}@nova.local`);
    expect(response.text).toContain("DTSTART:");
    expect(response.text).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(response.text).not.toContain(ticket.ticketHash);
    expect(response.text).not.toContain("@example.test");
    expect(response.headers["content-disposition"]).toContain(".ics");
    await request(server)
      .get(`/api/v1/tickets/${ticket.id}/calendar`)
      .auth(foreignToken, { type: "bearer" })
      .expect(404);
  });
  it("sends actual MIME text/html, QR PNG and ICS attachments through Nodemailer SMTP", async () => {
    const f = await fixture();
    await pay(f);
    await generate(f);
    const event = await emailEvent(f.booking.id);
    await app.get(FulfillmentRelay).flush();
    await delivered(event.id);
    const message = required(messages(event.id)[0]);
    expect(message.to).toEqual([`${prefix}-0@example.test`]);
    expect(message.raw).toMatch(/Content-Type: text\/html/i);
    expect(message.raw).toMatch(/Content-Type: image\/png/i);
    expect(message.raw).toMatch(/Content-Type: text\/calendar/i);
    expect(message.raw).toContain("Content-ID: <nova-ticket-qr>");
    expect(message.raw).toContain(f.booking.orderCode);
    expect(message.raw).not.toContain(
      required(process.env.PAYMENT_SANDBOX_SECRET),
    );
  });
  it("retains PAID and its QR on a real SMTP451, then retries the same email event successfully", async () => {
    const f = await fixture();
    const started = performance.now();
    await pay(f);
    const paymentCompletedMs = performance.now() - started;
    const encode = ticketQr.ticketQrPng;
    const pngTimes: number[] = [];
    const encoder = jest
      .spyOn(ticketQr, "ticketQrPng")
      .mockImplementation((hash) => {
        const encodedAt = performance.now();
        try {
          return encode(hash);
        } finally {
          pngTimes.push(performance.now() - encodedAt);
        }
      });
    const ticketStarted = performance.now();
    const ticket = await (async () => {
      try {
        return await generate(f);
      } finally {
        encoder.mockRestore();
      }
    })();
    const ticketServiceMs = performance.now() - ticketStarted;
    const pngEncodingMs = pngTimes.reduce((sum, time) => sum + time, 0);
    const qrServiceReadyMs = performance.now() - started;
    const event = await emailEvent(f.booking.id);
    smtp.state.rejectNext = 1;
    await app.get(FulfillmentRelay).flush();
    await eventually(
      async () =>
        (
          await prisma.outboxEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).lastError === "EMAIL_DELIVERY_FAILED",
    );
    const failed = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(failed.processedAt).toBeNull();
    if (process.env.NOVA_QA_SMTP_METRICS_FILE) {
      mkdirSync(dirname(process.env.NOVA_QA_SMTP_METRICS_FILE), {
        recursive: true,
      });
      writeFileSync(
        process.env.NOVA_QA_SMTP_METRICS_FILE,
        JSON.stringify(
          {
            measuredAt: new Date().toISOString(),
            samples: 1,
            paymentCompletedMs,
            qrServiceReadyMs,
            ticketServiceMs,
            pngEncodingMs,
            pngEncodingCalls: pngTimes.length,
            ticketNonPngMs: ticketServiceMs - pngEncodingMs,
            smtpFault: "451 confirmed; durable retry retained",
            layer:
              "native HTTP checkout+webhook then direct post-commit TicketsService inside Jest; PNG component is measured separately; excludes browser rendering and relay polling",
            budgets: { servicePathUnder50ms: qrServiceReadyMs < 50 },
          },
          null,
          2,
        ) + "\n",
        { mode: 0o600 },
      );
    }
    const retryPreview = data(
      await request(server)
        .get(`/api/v1/tickets/${ticket.id}/confirmation`)
        .auth(token, { type: "bearer" })
        .expect(200),
    ) as { deliveryStatus: string };
    expect(retryPreview.deliveryStatus).toBe("RETRYING");
    expect(failed.availableAt.getTime()).toBeGreaterThan(Date.now());
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: f.booking.id } }))
        .status,
    ).toBe("PAID");
    await retryEvent(event.id);
    await delivered(event.id);
    expect(messages(event.id)).toHaveLength(1);
    expect(
      (await prisma.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .qrCodeBase64,
    ).toBe(ticket.qrCodeBase64);
  });
  it("closes a stalled SMTP connection at the absolute deadline and leaves a durable retry", async () => {
    const f = await fixture();
    await pay(f);
    await generate(f);
    const event = await emailEvent(f.booking.id);
    smtp.state.stall = true;
    const began = Date.now();
    await app.get(FulfillmentRelay).flush();
    await eventually(
      async () =>
        (
          await prisma.outboxEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).lastError === "EMAIL_DELIVERY_FAILED",
    );
    expect(Date.now() - began).toBeLessThan(5000);
    expect(messages(event.id)).toHaveLength(0);
    smtp.state.stall = false;
    await retryEvent(event.id);
    await delivered(event.id);
  });
  it("does not acknowledge email merely because a BullMQ job was queued", async () => {
    await app.get(TicketEmailProcessor).worker.pause();
    await other.get(TicketEmailProcessor).worker.pause();
    try {
      const f = await fixture();
      await pay(f);
      await generate(f);
      const event = await emailEvent(f.booking.id);
      await app.get(FulfillmentRelay).flush();
      const queued = await prisma.outboxEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(queued.processedAt).toBeNull();
      expect(queued.lockedBy).toMatch(/^fulfill-/);
      expect(messages(event.id)).toHaveLength(0);
      const queue = app.get<Queue>(getQueueToken("ticket-email"));
      expect(
        await queue.getJob(
          `ticket-email-${event.id}-${String(queued.attempts)}`,
        ),
      ).toBeDefined();
    } finally {
      app.get(TicketEmailProcessor).worker.resume();
      other.get(TicketEmailProcessor).worker.resume();
    }
  });
  it("reclaims a lost queued attempt with fencing so stale jobs cannot send a duplicate", async () => {
    await app.get(TicketEmailProcessor).worker.pause();
    await other.get(TicketEmailProcessor).worker.pause();
    const f = await fixture();
    await pay(f);
    await generate(f);
    const event = await emailEvent(f.booking.id);
    try {
      await app.get(FulfillmentRelay).flush();
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { lockedAt: new Date(Date.now() - 31000) },
      });
      await other.get(FulfillmentRelay).flush();
    } finally {
      app.get(TicketEmailProcessor).worker.resume();
      other.get(TicketEmailProcessor).worker.resume();
    }
    await delivered(event.id);
    expect(messages(event.id)).toHaveLength(1);
    expect(
      (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } }))
        .attempts,
    ).toBe(2);
  });
  it("keeps email durable across a queue publish failure and acknowledges only after SMTP on retry", async () => {
    const f = await fixture();
    await pay(f);
    await generate(f);
    const event = await emailEvent(f.booking.id);
    const spy = jest
      .spyOn(app.get(TicketEmailQueueService), "enqueue")
      .mockRejectedValue(new Error("private-redis-down"));
    await app.get(FulfillmentRelay).flush();
    const queued = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(queued.lastError).toBe("EMAIL_QUEUE_UNAVAILABLE");
    expect(queued.processedAt).toBeNull();
    spy.mockRestore();
    await retryEvent(event.id);
    await delivered(event.id);
  });
  it("replays ticket delivery after an ack failure without replacing the QR or creating a second email request", async () => {
    const f = await fixture();
    await pay(f);
    const events = app.get(OutboxRepository);
    const original = events.acknowledge.bind(events);
    const spy = jest
      .spyOn(events, "acknowledge")
      .mockImplementation(async (...args) => {
        const row = await prisma.outboxEvent.findUnique({
          where: { id: args[0] },
        });
        if (
          row?.eventType === TICKET_REQUESTED &&
          row.aggregateId === f.booking.id
        )
          throw new Error("ack-failed");
        return original(...args);
      });
    await app.get(FulfillmentRelay).flush();
    const ticket = await prisma.eTicket.findUniqueOrThrow({
      where: { bookingId: f.booking.id },
    });
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: f.booking.id, eventType: TICKET_REQUESTED },
    });
    expect(event.processedAt).toBeNull();
    spy.mockRestore();
    await retryEvent(event.id);
    expect(
      (
        await prisma.eTicket.findUniqueOrThrow({
          where: { bookingId: f.booking.id },
        })
      ).id,
    ).toBe(ticket.id);
    expect(
      await prisma.outboxEvent.count({
        where: { aggregateId: f.booking.id, eventType: EMAIL_REQUESTED },
      }),
    ).toBe(1);
  });
  it("keeps QR/email invisible until the ticket transaction commits", async () => {
    const f = await fixture();
    await pay(f);
    const entered = gate();
    const release = gate();
    const events = app.get(OutboxRepository);
    const original = events.add.bind(events);
    jest.spyOn(events, "add").mockImplementation(async (...args) => {
      const row = await original(...args);
      if (args[0] === EMAIL_REQUESTED && args[1] === f.booking.id) {
        entered.release();
        await release.promise;
      }
      return row;
    });
    const pending = generate(f);
    try {
      await entered.promise;
      expect(
        await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
      ).toBe(0);
      expect(
        await prisma.outboxEvent.count({
          where: { aggregateId: f.booking.id, eventType: EMAIL_REQUESTED },
        }),
      ).toBe(0);
    } finally {
      release.release();
    }
    await pending;
    expect(
      await prisma.eTicket.count({ where: { bookingId: f.booking.id } }),
    ).toBe(1);
  });
  it("makes the SMTP accepted/DB ack failure window explicit: retries may duplicate email, with the same Message-ID and QR", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const event = await emailEvent(f.booking.id);
    let fail = true;
    const spies = [app, other].map((instance) => {
      const events = instance.get(OutboxRepository);
      const original = events.acknowledge.bind(events);
      return jest
        .spyOn(events, "acknowledge")
        .mockImplementation(async (...args) => {
          if (fail && args[0] === event.id && args[1].startsWith("smtp-")) {
            fail = false;
            throw new Error("SMTP-accepted-before-ack-failure");
          }
          return original(...args);
        });
    });
    await app.get(FulfillmentRelay).flush();
    await eventually(
      async () =>
        (
          await prisma.outboxEvent.findUniqueOrThrow({
            where: { id: event.id },
          })
        ).lastError === "EMAIL_DELIVERY_FAILED",
    );
    expect(messages(event.id)).toHaveLength(1);
    for (const spy of spies) spy.mockRestore();
    await retryEvent(event.id);
    await delivered(event.id);
    expect(messages(event.id)).toHaveLength(2);
    expect(
      messages(event.id).every((message) =>
        message.raw.includes(`<nova-ticket-${event.id}@nova.local>`),
      ),
    ).toBe(true);
    expect(
      (
        await prisma.eTicket.findUniqueOrThrow({
          where: { bookingId: f.booking.id },
        })
      ).ticketHash,
    ).toBe(ticket.ticketHash);
  });
  it("escapes calendar injection and email markup while folding Unicode ICS lines by bytes", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const title =
      "<script>alert(1)</script>\\,;\rBEGIN:VEVENT\n" +
      "Điện ảnh Việt Nam ".repeat(12);
    const row = {
      ...ticket,
      booking: {
        ...ticket.booking,
        showtime: {
          ...ticket.booking.showtime,
          movie: { ...ticket.booking.showtime.movie, title },
        },
      },
    };
    const calendar = ticketCalendar(row);
    expect(
      calendar.split("\r\n").every((line) => Buffer.byteLength(line) <= 75),
    ).toBe(true);
    expect(calendar.match(/(?:^|\r\n)BEGIN:VEVENT/g)).toHaveLength(1);
    expect(calendar).not.toMatch(/[^\r]\n/);
    expect(calendar).toContain("TRIGGER:-PT30M");
    expect(calendar).toContain("BEGIN:VALARM");
    const email = ticketEmail(row, randomUUID(), "tickets@nova.local");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
  it("previews a real confirmation only for its owner without sending or acknowledging email", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const event = await emailEvent(f.booking.id);
    const preview = () =>
      request(server)
        .get(`/api/v1/tickets/${ticket.id}/confirmation`)
        .auth(token, { type: "bearer" });
    const message = data(await preview().expect(200)) as {
      html: string;
      subject: string;
      deliveryStatus: string;
      acceptedAt: string | null;
    };
    expect(message.deliveryStatus).toBe("QUEUED");
    expect(message.acceptedAt).toBeNull();
    expect(message.subject).toContain(f.booking.orderCode);
    expect(message.html).toContain(ticket.qrCodeBase64);
    expect(message.html).not.toContain("cid:nova-ticket-qr");
    expect(message.html).not.toMatch(
      /passwordHash|refreshToken|accessToken|<script>/,
    );
    for (const auth of [foreignToken, adminToken, staffToken])
      await request(server)
        .get(`/api/v1/tickets/${ticket.id}/confirmation`)
        .auth(auth, { type: "bearer" })
        .expect(404);
    await request(server)
      .get(`/api/v1/tickets/${ticket.id}/confirmation`)
      .expect(401);
    expect(messages(event.id)).toHaveLength(0);
    expect(
      (await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } }))
        .processedAt,
    ).toBeNull();
    await app.get(FulfillmentRelay).flush();
    await delivered(event.id);
    const sent = data(await preview().expect(200)) as {
      deliveryStatus: string;
      acceptedAt: string | null;
    };
    expect(sent.deliveryStatus).toBe("SMTP_ACCEPTED");
    expect(sent.acceptedAt).not.toBeNull();
    expect(messages(event.id)).toHaveLength(1);
  });
  it("verifies without consuming and enforces mismatch, unknown and reused QR cases", async () => {
    const f = await fixture();
    await pay(f);
    const ticket = await generate(f);
    const verify = (
      ticketHash = ticket.ticketHash,
      showtimeId = f.showtime.id,
      auth = staffToken,
    ) =>
      request(server)
        .post("/api/v1/staff/verify")
        .auth(auth, { type: "bearer" })
        .send({ ticketHash, showtimeId });
    await verify().expect(200);
    await verify(ticket.ticketHash, f.showtime.id.toUpperCase()).expect(200);
    expect(
      (await prisma.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .isCheckedIn,
    ).toBe(false);
    expect(
      error(await verify(ticket.ticketHash, randomUUID()).expect(409)),
    ).toBe("TICKET_SHOWTIME_MISMATCH");
    expect(
      error(await verify(randomBytes(32).toString("hex")).expect(404)),
    ).toBe("TICKET_NOT_FOUND");
    await verify(ticket.ticketHash, f.showtime.id, token).expect(403);
    await request(server)
      .post("/api/v1/staff/verify")
      .send({ ticketHash: ticket.ticketHash, showtimeId: f.showtime.id })
      .expect(401);
    await request(server)
      .post("/api/v1/staff/verify")
      .auth(staffToken, { type: "bearer" })
      .send({ ticketHash: ticket.ticketHash })
      .expect(400);
    expect(
      error(
        await request(server)
          .post("/api/v1/staff/check-in")
          .auth(staffToken, { type: "bearer" })
          .send({ ticketHash: ticket.ticketHash, showtimeId: randomUUID() })
          .expect(409),
      ),
    ).toBe("TICKET_SHOWTIME_MISMATCH");
    expect(
      (await prisma.eTicket.findUniqueOrThrow({ where: { id: ticket.id } }))
        .isCheckedIn,
    ).toBe(false);
    await request(server)
      .post("/api/v1/staff/check-in")
      .auth(staffToken, { type: "bearer" })
      .send({ ticketHash: ticket.ticketHash, showtimeId: f.showtime.id })
      .expect(200);
    const usedPreview = await verify().expect(409);
    expect(error(usedPreview)).toBe("TICKET_ALREADY_USED");
    expect(
      (JSON.parse(usedPreview.text) as { details: { checkedInAt: string } })
        .details.checkedInAt,
    ).toBeTruthy();
  });
  it("documents owner ticket/calendar APIs and protected staff admission alongside Phase10 revenue reports", async () => {
    const spec = JSON.parse(
      (await request(server).get("/api/docs-json").expect(200)).text,
    ) as {
      paths: Record<
        string,
        { post?: { security?: unknown }; get?: { security?: unknown } }
      >;
    };
    expect(spec.paths).toHaveProperty("/api/v1/tickets/me");
    expect(spec.paths).toHaveProperty("/api/v1/tickets/{id}");
    expect(spec.paths).toHaveProperty("/api/v1/tickets/{id}/calendar");
    expect(spec.paths["/api/v1/staff/check-in"]?.post?.security).toEqual([
      { bearer: [] },
    ]);
    expect(spec.paths).toHaveProperty("/api/v1/admin/reports/revenue");
  });
});
