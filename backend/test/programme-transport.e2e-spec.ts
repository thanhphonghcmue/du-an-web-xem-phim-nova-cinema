import { INestApplication } from "@nestjs/common";
import { hash } from "argon2";
import Redis from "ioredis";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import request, { Response } from "supertest";
import {
  ProgrammeChunk,
  ProgrammeCollection,
  ProgrammeManifest,
} from "../programme-codec.cjs";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { TokenService } from "../src/modules/auth/token.service";
import { SeatEventsRelay } from "../src/realtime/seat-events-relay.service";
import { SeatExpirationProcessor } from "../src/queues/seat-expiration/seat-expiration.processor";

function data(response: Response): unknown {
  const body = JSON.parse(response.text) as { success: boolean; data: unknown };
  expect(body.success).toBe(true);
  return body.data;
}
function decode(
  pages: ProgrammeChunk[],
): Record<ProgrammeCollection, unknown[]> {
  const rows: Record<ProgrammeCollection, unknown[]> = {
    movies: [],
    cinemas: [],
    rooms: [],
    combos: [],
    showtimes: [],
  };
  const fragments = new Map<
    string,
    { collection: ProgrammeCollection; offset: number; text: string[] }
  >();
  for (const page of pages)
    for (const part of page.parts) {
      if ("fragment" in part) {
        const key = `${part.collection}:${String(part.offset)}`;
        const entry = fragments.get(key) ?? {
          collection: part.collection,
          offset: part.offset,
          text: [],
        };
        entry.text[part.fragment.index] = part.fragment.text;
        fragments.set(key, entry);
      } else {
        for (const [offset, cells] of part.rows.entries())
          rows[part.collection][part.offset + offset] = Object.fromEntries(
            part.keys.map((key, column) => {
              const cell = cells[column];
              const value =
                part.stringColumns?.includes(column) && typeof cell === "number"
                  ? part.strings[cell]
                  : cell !== null &&
                      typeof cell === "object" &&
                      !Array.isArray(cell)
                    ? "s" in cell && typeof cell.s === "number"
                      ? part.strings[cell.s]
                      : "v" in cell
                        ? cell.v
                        : cell
                    : cell;
              return [key, value];
            }),
          );
      }
    }
  for (const entry of fragments.values())
    rows[entry.collection][entry.offset] = JSON.parse(
      entry.text.join(""),
    ) as unknown;
  return rows;
}

describe("native shared immutable programme transport", () => {
  let app: INestApplication,
    other: INestApplication,
    server: Server,
    second: Server,
    prisma: PrismaService,
    redis: Redis;
  let admin = "",
    customer = "",
    movieId = "",
    cinemaId = "",
    roomId = "",
    showtimeId = "",
    seatId = "";
  const users: string[] = [],
    prefix = `transport-${randomUUID()}`;
  const namespace = () => process.env.BULLMQ_PREFIX || "invalid";
  async function manifest(
    target: Server = server,
    days = 60,
  ): Promise<ProgrammeManifest> {
    return data(
      await request(target)
        .get("/api/v1/showtimes/programme/manifest")
        .query({ days })
        .expect(200),
    ) as ProgrammeManifest;
  }
  const chunkPath = (snapshot: ProgrammeManifest, index: number) =>
    `/api/v1/showtimes/programme/chunks/${snapshot.snapshotId}/${String(index)}`;
  beforeAll(async () => {
    const previousLimit = process.env.RATE_LIMIT_MAX;
    process.env.RATE_LIMIT_MAX = "60";
    try {
      app = await createApplication({ logger: false });
      await app.listen(0, "127.0.0.1");
      other = await createApplication({ logger: false });
      await other.listen(0, "127.0.0.1");
    } finally {
      if (previousLimit === undefined) delete process.env.RATE_LIMIT_MAX;
      else process.env.RATE_LIMIT_MAX = previousLimit;
    }
    server = app.getHttpServer() as Server;
    second = other.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
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
    for (const role of ["ADMIN", "CUSTOMER"] as const) {
      const user = await prisma.user.create({
        data: {
          email: `${prefix}-${role.toLowerCase()}@example.test`,
          fullName: "Programme fixture",
          passwordHash,
          role,
        },
      });
      users.push(user.id);
      const token = (await app.get(TokenService).issue(user.id)).tokens
        .accessToken;
      if (role === "ADMIN") admin = token;
      else customer = token;
    }
    const movie = await prisma.movie.create({
      data: {
        title: prefix,
        description: "Programme fixture Tiếng Việt",
        durationMinutes: 120,
        releaseDate: new Date("2026-01-01T00:00:00Z"),
        ageRating: "P",
        status: "NOW_SHOWING",
      },
    });
    movieId = movie.id;
    const cinema = await prisma.cinema.create({
      data: { name: prefix, address: "Owned loopback fixture", city: prefix },
    });
    cinemaId = cinema.id;
    const room = await prisma.room.create({
      data: { cinemaId, name: prefix, roomType: "STANDARD_2D", totalSeats: 3 },
    });
    roomId = room.id;
    const seat = await prisma.seat.create({
      data: {
        roomId,
        seatRow: "A",
        seatColumn: 1,
        seatType: "STANDARD",
        priceModifier: "1.00",
      },
    });
    seatId = seat.id;
    await prisma.seat.createMany({
      data: [2, 3].map((seatColumn) => ({
        roomId,
        seatRow: "A",
        seatColumn,
        seatType: "STANDARD" as const,
        priceModifier: "1.00",
      })),
    });
    const start = new Date(Date.now() + 86400000);
    const show = await prisma.showtime.create({
      data: {
        movieId,
        roomId,
        startTime: start,
        endTime: new Date(start.getTime() + 135 * 60000),
        baseTicketPrice: "90000.00",
      },
    });
    showtimeId = show.id;
  });
  afterEach(async () => {
    const keys = await redis.keys(`${namespace()}:throttle:*`);
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    await app.get(SeatEventsRelay).stop();
    await other.get(SeatEventsRelay).stop();
    await app.get(SeatExpirationProcessor).worker.pause();
    await other.get(SeatExpirationProcessor).worker.pause();
    const bookings = await prisma.booking.findMany({
      where: { userId: { in: users } },
      select: { id: true },
    });
    const ids = bookings.map((row) => row.id);
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: { in: ids } },
    });
    await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids } } });
    // Không bao giờ truyền ID undefined vào Prisma khi beforeAll thất bại:
    // Prisma bỏ qua field undefined và có thể xóa cả fixture ngoài phạm vi sở hữu.
    if (movieId) await prisma.showtime.deleteMany({ where: { movieId } });
    if (roomId) {
      await prisma.seat.deleteMany({ where: { roomId } });
      await prisma.room.deleteMany({ where: { id: roomId } });
    }
    if (cinemaId) await prisma.cinema.deleteMany({ where: { id: cinemaId } });
    if (movieId) await prisma.movie.deleteMany({ where: { id: movieId } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await other.close();
    await app.close();
    const keys = await redis.keys(`${namespace()}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("serves every exact legacy field from chunks readable on the other API instance", async () => {
    const snapshot = await manifest();
    expect((await manifest(second)).snapshotId).toBe(snapshot.snapshotId);
    const pages: ProgrammeChunk[] = [];
    for (let index = 0; index < snapshot.chunks; index++) {
      const response = await request(second)
        .get(chunkPath(snapshot, index))
        .expect(200);
      expect(Buffer.byteLength(response.text)).toBeLessThan(15 * 1024);
      expect(response.headers["cache-control"]).toMatch(
        /^private, max-age=\d+, immutable$/,
      );
      expect(response.headers["x-nova-snapshot-expires-at"]).toBe(
        snapshot.expiresAt,
      );
      pages.push(data(response) as ProgrammeChunk);
    }
    const expanded = decode(pages),
      legacy = data(
        await request(server).get("/api/v1/showtimes/programme").expect(200),
      ) as Record<string, unknown>;
    for (const collection of [
      "movies",
      "cinemas",
      "rooms",
      "combos",
      "showtimes",
    ] as const) {
      expect(expanded[collection]).toEqual(legacy[collection]);
      expect(expanded[collection].length).toBe(snapshot.counts[collection]);
    }
    expect(legacy.asOf).toBe(snapshot.asOf);
    expect(legacy.until).toBe(snapshot.until);
    expect(JSON.stringify(pages)).not.toMatch(
      /bookingId|holdBy|hold_expire_at|ticketHash/,
    );
  });

  it("invalidates both instances after an Admin commit while old chunks remain immutable", async () => {
    const before = await manifest();
    const old = await request(second).get(chunkPath(before, 0)).expect(200);
    const description = `${prefix} updated by Admin`;
    await request(server)
      .patch(`/api/v1/movies/${movieId}`)
      .auth(admin, { type: "bearer" })
      .send({ description })
      .expect(200);
    const after = await manifest(second);
    expect(after.snapshotId).not.toBe(before.snapshotId);
    expect(
      (await request(server).get(chunkPath(before, 0)).expect(200)).text,
    ).toBe(old.text);
    const legacy = data(
      await request(second).get("/api/v1/showtimes/programme").expect(200),
    ) as { movies: Array<{ id: string; description: string }> };
    expect(legacy.movies.find((row) => row.id === movieId)?.description).toBe(
      description,
    );
  });

  it("rejects malformed, missing and expired chunk identities then creates a complete replacement", async () => {
    const snapshot = await manifest(server, 12);
    await request(server).get(chunkPath(snapshot, snapshot.chunks)).expect(404);
    await request(server).get(chunkPath(snapshot, -1)).expect(400);
    await request(server)
      .get(`/api/v1/showtimes/programme/chunks/${randomUUID()}/0`)
      .expect(410);
    await request(server)
      .get("/api/v1/showtimes/programme/chunks/not-a-uuid/0")
      .expect(400);
    const keys = await redis.keys(`${namespace()}:programme:v1:current:12:*`);
    keys.push(`${namespace()}:programme:v1:${snapshot.snapshotId}:manifest`);
    await redis.del(...keys);
    const expired = await request(second)
      .get(chunkPath(snapshot, 0))
      .expect(410);
    expect((JSON.parse(expired.text) as { error: string }).error).toBe(
      "PROGRAMME_SNAPSHOT_EXPIRED",
    );
    expect(expired.headers["cache-control"]).toBe("no-store");
    expect((await manifest(second, 12)).snapshotId).not.toBe(
      snapshot.snapshotId,
    );
  });

  it("keeps hold/cancel seat availability fresh while reusing catalogue snapshots", async () => {
    const snapshot = await manifest();
    const held = data(
      await request(server)
        .post("/api/v1/bookings/hold")
        .auth(customer, { type: "bearer" })
        .send({ showtimeId, seatIds: [seatId] })
        .expect(201),
    ) as { id: string };
    try {
      const map = data(
        await request(second)
          .get(`/api/v1/showtimes/${showtimeId}/seats`)
          .expect(200),
      ) as { seats: Array<{ seatId: string; status: string }> };
      expect(map.seats.find((row) => row.seatId === seatId)?.status).toBe(
        "HOLDING",
      );
      expect((await manifest(second)).snapshotId).toBe(snapshot.snapshotId);
    } finally {
      await request(server)
        .post(`/api/v1/bookings/${held.id}/cancel`)
        .auth(customer, { type: "bearer" })
        .expect(200);
    }
    const map = data(
      await request(second)
        .get(`/api/v1/showtimes/${showtimeId}/seats`)
        .expect(200),
    ) as { seats: Array<{ seatId: string; status: string }> };
    expect(map.seats.find((row) => row.seatId === seatId)?.status).toBe(
      "AVAILABLE",
    );
  });
  it("shares bounded asset quotas across instances without raising the legacy handler limit", async () => {
    const snapshot = await manifest();
    const assets = await Promise.all(
      Array.from({ length: 61 }, (_, index) =>
        request(index % 2 ? server : second).get(chunkPath(snapshot, 0)),
      ),
    );
    expect(assets.filter((response) => response.status === 200)).toHaveLength(
      60,
    );
    expect(assets.filter((response) => response.status === 429)).toHaveLength(
      1,
    );
    await request(server).get(chunkPath(snapshot, 1)).expect(200);
    const legacy = await Promise.all(
      Array.from({ length: 61 }, (_, index) =>
        request(index % 2 ? server : second).get("/api/v1/showtimes/programme"),
      ),
    );
    expect(legacy.filter((response) => response.status === 200)).toHaveLength(
      60,
    );
    expect(legacy.filter((response) => response.status === 429)).toHaveLength(
      1,
    );
  });
});
