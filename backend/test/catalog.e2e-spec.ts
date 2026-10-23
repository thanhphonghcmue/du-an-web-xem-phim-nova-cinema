import { INestApplication } from "@nestjs/common";
import { hash } from "argon2";
import Redis from "ioredis";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import request, { Response } from "supertest";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { TokenService } from "../src/modules/auth/token.service";
import { AuditRepository } from "../src/modules/audit/audit.repository";
import { RoomsRepository } from "../src/modules/rooms/rooms.repository";

interface Entity {
  id: string;
  [key: string]: unknown;
}
interface Listing {
  items: Entity[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
function data(response: Response): unknown {
  const payload = JSON.parse(response.text) as {
    success: boolean;
    data: unknown;
  };
  expect(payload.success).toBe(true);
  return payload.data;
}
function entity(response: Response): Entity {
  return data(response) as Entity;
}
function listing(response: Response): Listing {
  return data(response) as Listing;
}
function code(response: Response): string {
  return (JSON.parse(response.text) as { error: string }).error;
}

describe("Phase 4 real PostgreSQL/Redis catalog", () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let admin: string;
  let staff: string;
  let customer: string;
  const prefix = `p4-${randomUUID()}`;
  const movieBody = (suffix: string = randomUUID()) => ({
    title: `${prefix}-${suffix}`,
    description: "Catalog integration fixture",
    durationMinutes: 120,
    releaseDate: "2026-10-15T07:00:00+07:00",
    ageRating: "T13",
  });
  const moviePost = () =>
    request(server).post("/api/v1/movies").auth(admin, { type: "bearer" });
  async function movie(
    suffix: string = randomUUID(),
    overrides: Record<string, unknown> = {},
  ): Promise<Entity> {
    return entity(
      await moviePost()
        .send({ ...movieBody(suffix), ...overrides })
        .expect(201),
    );
  }
  async function cinema(suffix: string = randomUUID()): Promise<Entity> {
    return entity(
      await request(server)
        .post("/api/v1/cinemas")
        .auth(admin, { type: "bearer" })
        .send({
          name: `${prefix}-${suffix}`,
          address: "1 Test Street",
          city: prefix,
        })
        .expect(201),
    );
  }
  async function room(
    cinemaId: string,
    suffix: string = randomUUID(),
  ): Promise<Entity> {
    return entity(
      await request(server)
        .post("/api/v1/rooms")
        .auth(admin, { type: "bearer" })
        .send({
          cinemaId,
          name: `${prefix}-${suffix}`,
          roomType: "STANDARD_2D",
        })
        .expect(201),
    );
  }
  async function emptyRoom() {
    return room((await cinema()).id);
  }
  function generate(
    roomId: string,
    body: object = {
      rows: ["A", "B", "C"],
      columns: 4,
      vipRows: ["B"],
      sweetboxRows: ["C"],
    },
  ) {
    return request(server)
      .post(`/api/v1/rooms/${roomId}/seats/generate`)
      .auth(admin, { type: "bearer" })
      .send(body);
  }
  function createSeat(roomId: string, column = 1, row = "A") {
    return request(server)
      .post(`/api/v1/rooms/${roomId}/seats`)
      .auth(admin, { type: "bearer" })
      .send({ seatRow: row, seatColumn: column, seatType: "STANDARD" });
  }
  function patch(path: string, body: object) {
    return request(server)
      .patch(`/api/v1/${path}`)
      .auth(admin, { type: "bearer" })
      .send(body);
  }
  function remove(path: string) {
    return request(server)
      .delete(`/api/v1/${path}`)
      .auth(admin, { type: "bearer" });
  }
  async function referenced() {
    const film = await movie();
    const venue = await cinema();
    const auditorium = await room(venue.id);
    const chair = entity(await createSeat(auditorium.id).expect(201));
    const showtime = await prisma.showtime.create({
      data: {
        movieId: film.id,
        roomId: auditorium.id,
        startTime: new Date("2042-01-01T10:00:00Z"),
        endTime: new Date("2042-01-01T12:15:00Z"),
        baseTicketPrice: "90000.00",
      },
    });
    return { film, venue, auditorium, chair, showtime };
  }
  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    server = app.getHttpServer() as Server;
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
    const tokenService = app.get(TokenService);
    for (const role of ["ADMIN", "STAFF", "CUSTOMER"] as const) {
      const user = await prisma.user.create({
        data: {
          email: `${prefix}-${role.toLowerCase()}@example.test`,
          passwordHash,
          fullName: "Catalog fixture",
          role,
        },
      });
      const token = (await tokenService.issue(user.id)).tokens.accessToken;
      if (role === "ADMIN") admin = token;
      else if (role === "STAFF") staff = token;
      else customer = token;
    }
  });
  afterEach(async () => {
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:throttle:*`,
    );
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    const venues = await prisma.cinema.findMany({
      where: { name: { startsWith: prefix } },
      select: { id: true },
    });
    const venueIds = venues.map((row) => row.id);
    const rooms = await prisma.room.findMany({
      where: { cinemaId: { in: venueIds } },
      select: { id: true },
    });
    const roomIds = rooms.map((row) => row.id);
    const films = await prisma.movie.findMany({
      where: { title: { startsWith: prefix } },
      select: { id: true },
    });
    const movieIds = films.map((row) => row.id);
    await prisma.showtime.deleteMany({
      where: {
        OR: [{ movieId: { in: movieIds } }, { roomId: { in: roomIds } }],
      },
    });
    await prisma.seat.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
    await prisma.cinema.deleteMany({ where: { id: { in: venueIds } } });
    await prisma.movie.deleteMany({ where: { id: { in: movieIds } } });
    const actors = await prisma.user.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: actors.map((actor) => actor.id) } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:*`,
    );
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("allows public catalog reads while every write requires an ADMIN", async () => {
    const id = randomUUID();
    const writes: Array<["post" | "patch" | "delete", string]> = [
      ["post", "movies"],
      ["patch", `movies/${id}`],
      ["delete", `movies/${id}`],
      ["post", "cinemas"],
      ["patch", `cinemas/${id}`],
      ["delete", `cinemas/${id}`],
      ["post", "rooms"],
      ["patch", `rooms/${id}`],
      ["delete", `rooms/${id}`],
      ["post", `rooms/${id}/seats`],
      ["post", `rooms/${id}/seats/generate`],
      ["patch", `seats/${id}`],
      ["delete", `seats/${id}`],
    ];
    const api = request(server);
    for (const [method, path] of writes) {
      await api[method](`/api/v1/${path}`).send({}).expect(401);
      for (const token of [customer, staff])
        await api[method](`/api/v1/${path}`)
          .auth(token, { type: "bearer" })
          .send({})
          .expect(403);
    }
    for (const path of ["movies", "cinemas", "rooms"])
      await request(server).get(`/api/v1/${path}`).expect(200);
  });

  it("creates, reads, updates and deletes a movie with UTC dates and nullable media", async () => {
    const film = await movie("lifecycle", {
      title: `  ${prefix}-lifecycle  `,
      posterUrl: "http://localhost:3000/poster.jpg",
    });
    expect(film).toMatchObject({
      title: `${prefix}-lifecycle`,
      status: "COMING_SOON",
      releaseDate: "2026-10-15T00:00:00.000Z",
    });
    const detail = entity(
      await request(server).get(`/api/v1/movies/${film.id}`).expect(200),
    );
    expect(detail.id).toBe(film.id);
    const updated = entity(
      await patch(`movies/${film.id}`, {
        status: "NOW_SHOWING",
        durationMinutes: 130,
        posterUrl: null,
      }).expect(200),
    );
    expect(updated).toMatchObject({
      status: "NOW_SHOWING",
      durationMinutes: 130,
      posterUrl: null,
    });
    expect(entity(await remove(`movies/${film.id}`).expect(200))).toEqual({
      id: film.id,
      deleted: true,
    });
    await request(server).get(`/api/v1/movies/${film.id}`).expect(404);
  });

  it("filters and paginates movies with stable totals and page boundaries", async () => {
    const keyword = `${prefix}-filter`;
    await movie("filter-one", { status: "NOW_SHOWING", ageRating: "T18" });
    await movie("filter-two", { status: "NOW_SHOWING", ageRating: "T18" });
    await movie("filter-other", { status: "COMING_SOON", ageRating: "P" });
    const query = {
      keyword: keyword.toUpperCase(),
      status: "NOW_SHOWING",
      ageRating: "T18",
      limit: 1,
    };
    const first = listing(
      await request(server)
        .get("/api/v1/movies")
        .query({ ...query, page: 1 })
        .expect(200),
    );
    const second = listing(
      await request(server)
        .get("/api/v1/movies")
        .query({ ...query, page: 2 })
        .expect(200),
    );
    expect(first.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
    const empty = listing(
      await request(server)
        .get("/api/v1/movies")
        .query({ keyword: randomUUID() })
        .expect(200),
    );
    expect(empty).toEqual({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it("rejects invalid movie fields, unsafe URLs, nulls and mass assignment", async () => {
    for (const override of [
      { title: "  " },
      { durationMinutes: 0 },
      { durationMinutes: 1.5 },
      { durationMinutes: "120" },
      { durationMinutes: 601 },
      { ageRating: "R" },
      { status: null },
      { releaseDate: "2026-02-30T00:00:00Z" },
      { releaseDate: "2026-01-01T10:00:00" },
      { posterUrl: "javascript:alert(1)" },
      { id: randomUUID() },
      { director: "unknown field" },
    ])
      await moviePost()
        .send({ ...movieBody("invalid"), ...override })
        .expect(400);
    const film = await movie();
    for (const override of [
      { title: null },
      { durationMinutes: null },
      { status: null },
      { releaseDate: null },
    ])
      await patch(`movies/${film.id}`, override).expect(400);
    expect(
      await prisma.movie.count({ where: { title: `${prefix}-invalid` } }),
    ).toBe(0);
  });

  it("validates UUIDs, filters and bounded pagination before querying", async () => {
    for (const query of [
      { page: 0 },
      { page: 1.5 },
      { limit: 101 },
      { limit: -1 },
      { status: "UNKNOWN" },
      { ageRating: "INVALID" },
      { surprise: true },
    ])
      await request(server).get("/api/v1/movies").query(query).expect(400);
    for (const path of [
      "movies/not-uuid",
      "cinemas/not-uuid",
      "rooms/not-uuid",
      "rooms/not-uuid/seats",
      "seats/not-uuid",
    ])
      await request(server).get(`/api/v1/${path}`).expect(400);
    const id = randomUUID();
    for (const path of [
      `movies/${id}`,
      `cinemas/${id}`,
      `rooms/${id}`,
      `seats/${id}`,
      `rooms/${id}/seats`,
      `cinemas/${id}/rooms`,
    ])
      await request(server).get(`/api/v1/${path}`).expect(404);
    await patch(`movies/${id}`, { title: "missing" }).expect(404);
    await remove(`movies/${id}`).expect(404);
  });

  it("handles cinema CRUD, case-insensitive city filters and safe deletion", async () => {
    const venue = await cinema("lifecycle");
    expect(
      entity(
        await request(server).get(`/api/v1/cinemas/${venue.id}`).expect(200),
      ).id,
    ).toBe(venue.id);
    const updated = entity(
      await patch(`cinemas/${venue.id}`, {
        address: "  20 New Street  ",
      }).expect(200),
    );
    expect(updated.address).toBe("20 New Street");
    const found = listing(
      await request(server)
        .get("/api/v1/cinemas")
        .query({
          city: prefix.toUpperCase(),
          keyword: `${prefix}-lifecycle`,
          limit: 1,
        })
        .expect(200),
    );
    expect(found.meta.total).toBe(1);
    expect(found.items[0]?.id).toBe(venue.id);
    await patch(`cinemas/${venue.id}`, { name: null }).expect(400);
    await request(server)
      .post("/api/v1/cinemas")
      .auth(admin, { type: "bearer" })
      .send({ name: "bad", address: " ", city: "test" })
      .expect(400);
    await remove(`cinemas/${venue.id}`).expect(200);
    await request(server).get(`/api/v1/cinemas/${venue.id}`).expect(404);
  });

  it("creates and lists rooms in cinema scope and rejects missing parents", async () => {
    const venue = await cinema();
    const other = await cinema();
    const auditorium = await room(venue.id, "shared-name");
    await room(other.id, "shared-name");
    expect(auditorium.totalSeats).toBe(0);
    const scoped = listing(
      await request(server)
        .get(`/api/v1/cinemas/${venue.id}/rooms`)
        .query({ roomType: "STANDARD_2D" })
        .expect(200),
    );
    expect(scoped.items.map((row) => row.id)).toEqual([auditorium.id]);
    const generic = listing(
      await request(server)
        .get("/api/v1/rooms")
        .query({ cinemaId: venue.id, keyword: "shared-name" })
        .expect(200),
    );
    expect(generic.meta.total).toBe(1);
    const changed = entity(
      await patch(`rooms/${auditorium.id}`, {
        cinemaId: other.id,
        name: `${prefix}-moved`,
        roomType: "DOLBY_ATMOS",
      }).expect(200),
    );
    expect(changed.cinemaId).toBe(other.id);
    await request(server)
      .post("/api/v1/rooms")
      .auth(admin, { type: "bearer" })
      .send({
        cinemaId: randomUUID(),
        name: "missing",
        roomType: "STANDARD_2D",
      })
      .expect(404);
    await patch(`rooms/${auditorium.id}`, { cinemaId: randomUUID() }).expect(
      404,
    );
  });

  it("keeps room names unique under concurrent requests in one cinema", async () => {
    const venue = await cinema();
    const payload = {
      cinemaId: venue.id,
      name: `${prefix}-duplicate`,
      roomType: "IMAX_70MM_LASER",
    };
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(server)
          .post("/api/v1/rooms")
          .auth(admin, { type: "bearer" })
          .send(payload),
      ),
    );
    expect(results.map((response) => response.status).sort()).toEqual([
      201, 409, 409,
    ]);
    expect(
      await prisma.room.count({
        where: { cinemaId: venue.id, name: payload.name },
      }),
    ).toBe(1);
  });

  it("rejects invalid room fields and client-controlled totalSeats", async () => {
    const venue = await cinema();
    const payload = {
      cinemaId: venue.id,
      name: `${prefix}-invalid`,
      roomType: "STANDARD_2D",
    };
    for (const override of [
      { totalSeats: 999 },
      { roomType: "IMAX" },
      { name: " " },
      { cinemaId: "bad" },
      { id: randomUUID() },
    ])
      await request(server)
        .post("/api/v1/rooms")
        .auth(admin, { type: "bearer" })
        .send({ ...payload, ...override })
        .expect(400);
    const auditorium = await room(venue.id);
    for (const override of [
      { name: null },
      { roomType: null },
      { totalSeats: 999 },
    ])
      await patch(`rooms/${auditorium.id}`, override).expect(400);
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: auditorium.id } }))
        .totalSeats,
    ).toBe(0);
  });

  it("generates a complete seat matrix atomically with server-owned Decimal multipliers", async () => {
    const auditorium = await emptyRoom();
    const result = data(await generate(auditorium.id).expect(201));
    expect(result).toEqual({
      roomId: auditorium.id,
      createdCount: 12,
      totalSeats: 12,
    });
    const seats = listing(
      await request(server)
        .get(`/api/v1/rooms/${auditorium.id}/seats`)
        .query({ limit: 100 })
        .expect(200),
    );
    expect(seats.items).toHaveLength(12);
    expect(new Set(seats.items.map((row) => row.id)).size).toBe(12);
    expect(seats.items[0]).toMatchObject({
      seatRow: "A",
      seatColumn: 1,
      seatType: "STANDARD",
      priceModifier: "1.00",
    });
    expect(seats.items[4]).toMatchObject({
      seatRow: "B",
      seatColumn: 1,
      seatType: "VIP",
      priceModifier: "1.20",
    });
    expect(seats.items[8]).toMatchObject({
      seatRow: "C",
      seatColumn: 1,
      seatType: "SWEETBOX",
      priceModifier: "1.50",
    });
    expect(seats.items[0]).not.toHaveProperty("status");
    const ids = seats.items.map((row) => row.id);
    const repeat = await generate(auditorium.id).expect(409);
    expect(code(repeat)).toBe("SEAT_LAYOUT_EXISTS");
    expect(
      (await prisma.seat.findMany({ where: { roomId: auditorium.id } }))
        .map((row) => row.id)
        .sort(),
    ).toEqual(ids.sort());
  });

  it("rejects invalid matrices before writing any seats", async () => {
    const auditorium = await emptyRoom();
    for (const payload of [
      { rows: [], columns: 4 },
      { rows: ["A", "a"], columns: 4 },
      { rows: ["1"], columns: 4 },
      { rows: ["A"], columns: 51 },
      { rows: ["A"], columns: "4" },
      { rows: ["A"], columns: 4, vipRows: ["B"] },
      { rows: ["A"], columns: 4, vipRows: ["A"], sweetboxRows: ["A"] },
      { rows: ["A"], columns: 4, vipRows: null },
      {
        rows: Array.from({ length: 27 }, (_, i) => `A${String(i)}`),
        columns: 4,
      },
      { rows: ["A"], columns: 4, priceModifier: "0.01" },
    ])
      await generate(auditorium.id, payload).expect(400);
    expect(await prisma.seat.count({ where: { roomId: auditorium.id } })).toBe(
      0,
    );
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: auditorium.id } }))
        .totalSeats,
    ).toBe(0);
  });

  it("supports seat CRUD, coordinate uniqueness and derived room totals", async () => {
    const auditorium = await emptyRoom();
    const chair = entity(await createSeat(auditorium.id, 1, " a ").expect(201));
    expect(chair).toMatchObject({
      seatRow: "A",
      seatType: "STANDARD",
      priceModifier: "1.00",
    });
    await createSeat(auditorium.id).expect(409);
    const changed = entity(
      await patch(`seats/${chair.id}`, {
        seatType: "VIP",
        seatColumn: 2,
      }).expect(200),
    );
    expect(changed).toMatchObject({ seatColumn: 2, priceModifier: "1.20" });
    await patch(`seats/${chair.id}`, { priceModifier: "0.01" }).expect(400);
    await patch(`seats/${chair.id}`, { seatType: null }).expect(400);
    expect(
      entity(
        await request(server).get(`/api/v1/rooms/${auditorium.id}`).expect(200),
      ).totalSeats,
    ).toBe(1);
    expect(
      entity(await request(server).get(`/api/v1/seats/${chair.id}`).expect(200))
        .id,
    ).toBe(chair.id);
    await remove(`seats/${chair.id}`).expect(200);
    await remove(`seats/${chair.id}`).expect(404);
    expect(
      entity(
        await request(server).get(`/api/v1/rooms/${auditorium.id}`).expect(200),
      ).totalSeats,
    ).toBe(0);
  });

  it("filters and paginates physical seats by room, row and type", async () => {
    const auditorium = await emptyRoom();
    await generate(auditorium.id).expect(201);
    const first = listing(
      await request(server)
        .get(`/api/v1/rooms/${auditorium.id}/seats`)
        .query({ seatType: "VIP", seatRow: "b", page: 1, limit: 2 })
        .expect(200),
    );
    const second = listing(
      await request(server)
        .get(`/api/v1/rooms/${auditorium.id}/seats`)
        .query({ seatType: "VIP", seatRow: "b", page: 2, limit: 2 })
        .expect(200),
    );
    expect(first.meta).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(first.items.map((row) => row.seatColumn)).toEqual([1, 2]);
    expect(second.items.map((row) => row.seatColumn)).toEqual([3, 4]);
  });

  it("allows one of concurrent generation requests and preserves exact capacity", async () => {
    const auditorium = await emptyRoom();
    const responses = await Promise.all([
      generate(auditorium.id),
      generate(auditorium.id),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await prisma.seat.count({ where: { roomId: auditorium.id } })).toBe(
      12,
    );
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: auditorium.id } }))
        .totalSeats,
    ).toBe(12);
  });

  it("maintains exact capacity across concurrent seat additions and deletions", async () => {
    const auditorium = await emptyRoom();
    const additions = await Promise.all(
      Array.from({ length: 8 }, (_, i) => createSeat(auditorium.id, i + 1)),
    );
    expect(additions.map((response) => response.status)).toEqual(
      Array(8).fill(201),
    );
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: auditorium.id } }))
        .totalSeats,
    ).toBe(8);
    const removals = await Promise.all(
      additions.map((response) => remove(`seats/${entity(response).id}`)),
    );
    expect(removals.map((response) => response.status)).toEqual(
      Array(8).fill(200),
    );
    expect(await prisma.seat.count({ where: { roomId: auditorium.id } })).toBe(
      0,
    );
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: auditorium.id } }))
        .totalSeats,
    ).toBe(0);
  });

  it("rejects duplicate coordinates atomically without inflating capacity", async () => {
    const auditorium = await emptyRoom();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => createSeat(auditorium.id)),
    );
    expect(results.map((response) => response.status).sort()).toEqual([
      201, 409, 409, 409,
    ]);
    expect(await prisma.seat.count({ where: { roomId: auditorium.id } })).toBe(
      1,
    );
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: auditorium.id } }))
        .totalSeats,
    ).toBe(1);
  });

  it("rolls back the whole generated matrix if capacity persistence fails", async () => {
    const auditorium = await emptyRoom();
    const spy = jest
      .spyOn(app.get(RoomsRepository), "syncSeatCount")
      .mockImplementationOnce(() => {
        throw new Error("private catalog diagnostic");
      });
    const response = await generate(auditorium.id).expect(500);
    expect(response.text).not.toContain("private catalog diagnostic");
    spy.mockRestore();
    expect(await prisma.seat.count({ where: { roomId: auditorium.id } })).toBe(
      0,
    );
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: auditorium.id } }))
        .totalSeats,
    ).toBe(0);
    await generate(auditorium.id).expect(201);
  });

  it("protects movie duration and deletion when showtimes reference it", async () => {
    const fixture = await referenced();
    const conflict = await patch(`movies/${fixture.film.id}`, {
      durationMinutes: 150,
    }).expect(409);
    expect(code(conflict)).toBe("MOVIE_DURATION_LOCKED");
    await patch(`movies/${fixture.film.id}`, {
      durationMinutes: 120,
      status: "ENDED",
      description: "Safe metadata edit",
    }).expect(200);
    expect(code(await remove(`movies/${fixture.film.id}`).expect(409))).toBe(
      "MOVIE_IN_USE",
    );
    const showtime = await prisma.showtime.findUniqueOrThrow({
      where: { id: fixture.showtime.id },
    });
    expect(showtime.endTime.toISOString()).toBe(
      fixture.showtime.endTime.toISOString(),
    );
  });

  it("freezes referenced room structure and physical seats without cascading deletes", async () => {
    const fixture = await referenced();
    const other = await cinema();
    await patch(`rooms/${fixture.auditorium.id}`, {
      name: `${prefix}-safe-rename`,
    }).expect(200);
    for (const update of [{ roomType: "DOLBY_ATMOS" }, { cinemaId: other.id }])
      expect(
        code(await patch(`rooms/${fixture.auditorium.id}`, update).expect(409)),
      ).toBe("ROOM_STRUCTURE_LOCKED");
    expect(code(await createSeat(fixture.auditorium.id, 2).expect(409))).toBe(
      "SEAT_LAYOUT_LOCKED",
    );
    await generate(fixture.auditorium.id).expect(409);
    await patch(`seats/${fixture.chair.id}`, { seatType: "VIP" }).expect(409);
    await remove(`seats/${fixture.chair.id}`).expect(409);
    expect(
      code(await remove(`rooms/${fixture.auditorium.id}`).expect(409)),
    ).toBe("ROOM_IN_USE");
    expect(code(await remove(`cinemas/${fixture.venue.id}`).expect(409))).toBe(
      "CINEMA_IN_USE",
    );
    expect(
      await prisma.seat.count({ where: { roomId: fixture.auditorium.id } }),
    ).toBe(1);
    expect(
      (
        await prisma.seat.findUniqueOrThrow({ where: { id: fixture.chair.id } })
      ).priceModifier.toFixed(2),
    ).toBe("1.00");
  });

  it("waits for an in-flight showtime FK before deciding duration/layout changes", async () => {
    const film = await movie();
    const auditorium = await emptyRoom();
    let unlock!: () => void;
    let inserted!: () => void;
    const gate = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      inserted = resolve;
    });
    const insertion = prisma.$transaction(
      async (tx) => {
        await tx.showtime.create({
          data: {
            movieId: film.id,
            roomId: auditorium.id,
            startTime: new Date("2042-02-01T10:00:00Z"),
            endTime: new Date("2042-02-01T12:15:00Z"),
            baseTicketPrice: "90000.00",
          },
        });
        inserted();
        await gate;
      },
      { timeout: 10000 },
    );
    await ready;
    let settled = false;
    const mutation = Promise.all([
      patch(`movies/${film.id}`, { durationMinutes: 140 }),
      createSeat(auditorium.id),
    ]).then((responses) => {
      settled = true;
      return responses;
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(settled).toBe(false);
    } finally {
      unlock();
      await insertion;
    }
    expect((await mutation).map((response) => response.status)).toEqual([
      409, 409,
    ]);
    expect(
      (await prisma.movie.findUniqueOrThrow({ where: { id: film.id } }))
        .durationMinutes,
    ).toBe(120);
    expect(await prisma.seat.count({ where: { roomId: auditorium.id } })).toBe(
      0,
    );
  });

  it("deletes only empty, unreferenced children and parents through the API", async () => {
    const venue = await cinema();
    const auditorium = await room(venue.id);
    const chair = entity(await createSeat(auditorium.id).expect(201));
    expect(code(await remove(`rooms/${auditorium.id}`).expect(409))).toBe(
      "ROOM_HAS_SEATS",
    );
    await remove(`seats/${chair.id}`).expect(200);
    await remove(`rooms/${auditorium.id}`).expect(200);
    await remove(`cinemas/${venue.id}`).expect(200);
    expect(
      await prisma.room.findUnique({ where: { id: auditorium.id } }),
    ).toBeNull();
    expect(
      await prisma.cinema.findUnique({ where: { id: venue.id } }),
    ).toBeNull();
  });

  it("publishes catalog schemas and role-protected writes alongside showtimes", async () => {
    const response = await request(server).get("/api/docs-json").expect(200);
    const spec = JSON.parse(response.text) as {
      paths: Record<
        string,
        { post?: { security?: unknown }; get?: { security?: unknown } }
      >;
      components: { schemas: Record<string, unknown> };
    };
    for (const path of [
      "movies",
      "movies/{id}",
      "cinemas",
      "cinemas/{id}",
      "rooms",
      "rooms/{id}",
      "cinemas/{cinemaId}/rooms",
      "rooms/{roomId}/seats",
      "rooms/{roomId}/seats/generate",
      "seats/{id}",
    ])
      expect(spec.paths).toHaveProperty(`/api/v1/${path}`);
    expect(spec.paths["/api/v1/movies"]?.post?.security).toEqual([
      { bearer: [] },
    ]);
    expect(spec.paths["/api/v1/movies"]?.get?.security).toBeUndefined();
    for (const model of [
      "MovieDto",
      "CinemaDto",
      "RoomDto",
      "SeatDto",
      "GenerateSeatsDto",
      "PageMetaDto",
    ])
      expect(spec.components.schemas).toHaveProperty(model);
    expect(spec.paths).toHaveProperty("/api/v1/showtimes");
    await request(server).get("/api/v1/showtimes").expect(200);
  });
  it("serves more than 100 real screenings in one public bounded catalogue snapshot", async () => {
    const film = await movie("programme", { status: "NOW_SHOWING" });
    const ended = await movie("programme-ended", { status: "ENDED" });
    const venue = await cinema("programme");
    const hall = await room(venue.id, "programme");
    const first = Date.now() + 3600000;
    await prisma.showtime.createMany({
      data: Array.from({ length: 110 }, (_, i) => ({
        movieId: film.id,
        roomId: hall.id,
        startTime: new Date(first + i * 3 * 3600000),
        endTime: new Date(first + (i * 180 + 135) * 60000),
        baseTicketPrice: "90000.01",
      })),
    });
    const far = await prisma.showtime.create({
      data: {
        movieId: film.id,
        roomId: hall.id,
        startTime: new Date(first + 70 * 86400000),
        endTime: new Date(first + 70 * 86400000 + 135 * 60000),
        baseTicketPrice: "90000.00",
      },
    });
    const hidden = await prisma.showtime.create({
      data: {
        movieId: ended.id,
        roomId: hall.id,
        startTime: new Date(first + 40 * 86400000),
        endTime: new Date(first + 40 * 86400000 + 135 * 60000),
        baseTicketPrice: "90000.00",
      },
    });
    const snapshot = data(
      await request(server).get("/api/v1/showtimes/programme").expect(200),
    ) as {
      movies: Entity[];
      rooms: Entity[];
      showtimes: Array<{
        id: string;
        movieId: string;
        baseTicketPrice: string;
      }>;
      asOf: string;
      until: string;
    };
    const shows = snapshot.showtimes.filter((show) => show.movieId === film.id);
    expect(shows).toHaveLength(110);
    expect(shows.every((show) => show.baseTicketPrice === "90000.01")).toBe(
      true,
    );
    expect(
      snapshot.showtimes.some(
        (show) => show.id === far.id || show.id === hidden.id,
      ),
    ).toBe(false);
    expect(snapshot.movies.some((movie) => movie.id === ended.id)).toBe(false);
    expect(snapshot.rooms.some((room) => room.id === hall.id)).toBe(true);
    expect(
      new Date(snapshot.until).getTime() - new Date(snapshot.asOf).getTime(),
    ).toBe(60 * 86400000);
    expect(Object.keys(snapshot).sort()).toEqual([
      "asOf",
      "cinemas",
      "combos",
      "movies",
      "rooms",
      "showtimes",
      "until",
    ]);
  });
  it("validates the public programme horizon and retains ordinary pagination limits", async () => {
    for (const days of ["0", "61", "abc", "1.5"])
      await request(server)
        .get("/api/v1/showtimes/programme")
        .query({ days })
        .expect(400);
    await request(server)
      .get("/api/v1/showtimes/programme")
      .query({ days: 1 })
      .expect(200);
    await request(server)
      .get("/api/v1/showtimes/programme")
      .query({ userId: randomUUID() })
      .expect(400);
    await request(server)
      .get("/api/v1/showtimes")
      .query({ limit: 101 })
      .expect(400);
  });
  it("normalizes Vietnamese titles and rejects case, whitespace and Unicode-equivalent duplicates", async () => {
    const title = `${prefix}-Đêm Trắng`;
    const film = await movie("unicode", {
      title: `  ${title.replace(" ", "   ")}  `,
    });
    expect(film.title).toBe(title);
    for (const value of [
      title.toLowerCase(),
      title.normalize("NFD"),
      title.replace(" ", "\t "),
    ]) {
      expect(
        code(
          await moviePost()
            .send({ ...movieBody(), title: value })
            .expect(409),
        ),
      ).toBe("MOVIE_TITLE_EXISTS");
    }
    expect(await prisma.movie.count({ where: { title } })).toBe(1);
    const other = await movie();
    expect(code(await patch(`movies/${other.id}`, { title }).expect(409))).toBe(
      "MOVIE_TITLE_EXISTS",
    );
    expect(
      (await prisma.movie.findUniqueOrThrow({ where: { id: other.id } })).title,
    ).toBe(other.title);
  });
  it("commits exactly one movie and one audit record under concurrent duplicate creates", async () => {
    const title = `${prefix}-concurrent-title`;
    const replies = await Promise.all(
      Array.from({ length: 5 }, () =>
        moviePost().send({ ...movieBody(), title }),
      ),
    );
    expect(replies.map((reply) => reply.status).sort()).toEqual([
      201, 409, 409, 409, 409,
    ]);
    const film = await prisma.movie.findFirstOrThrow({ where: { title } });
    expect(await prisma.auditLog.count({ where: { entityId: film.id } })).toBe(
      1,
    );
    await expect(
      prisma.movie.create({
        data: {
          ...movieBody(),
          title: title.toUpperCase(),
          ageRating: "T13",
          releaseDate: new Date(),
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("retains atomic actor-bound create/update/delete movie history without logging no-op writes", async () => {
    const film = await movie();
    await patch(`movies/${film.id}`, { status: "NOW_SHOWING" }).expect(200);
    await patch(`movies/${film.id}`, { status: "NOW_SHOWING" }).expect(200);
    await remove(`movies/${film.id}`).expect(200);
    const logs = listing(
      await request(server)
        .get(`/api/v1/admin/audit-logs?entityId=${film.id}`)
        .auth(admin, { type: "bearer" })
        .expect(200),
    );
    expect(logs.items).toHaveLength(3);
    expect(logs.items.map((log) => log.action).sort()).toEqual([
      "CREATE",
      "DELETE",
      "UPDATE",
    ]);
    const actor = await prisma.user.findUniqueOrThrow({
      where: { email: `${prefix}-admin@example.test` },
    });
    expect(
      logs.items.every(
        (log) => log.actorId === actor.id && log.entityType === "MOVIE",
      ),
    ).toBe(true);
    expect(
      logs.items.find((log) => log.action === "UPDATE")?.changes,
    ).toMatchObject({
      before: { status: "COMING_SOON" },
      after: { status: "NOW_SHOWING" },
    });
    expect(JSON.stringify(logs)).not.toMatch(
      /passwordHash|refreshToken|accessToken/,
    );
    const filtered = listing(
      await request(server)
        .get(
          `/api/v1/admin/audit-logs?entityId=${film.id}&action=DELETE&limit=1`,
        )
        .auth(admin, { type: "bearer" })
        .expect(200),
    );
    expect(filtered.meta.total).toBe(1);
    expect(filtered.items[0]?.action).toBe("DELETE");
  });
  it("keeps audit private to current ADMIN roles and validates bounded filters", async () => {
    await request(server).get("/api/v1/admin/audit-logs").expect(401);
    for (const token of [staff, customer])
      await request(server)
        .get("/api/v1/admin/audit-logs")
        .auth(token, { type: "bearer" })
        .expect(403);
    for (const query of [
      "limit=101",
      "entityId=bad",
      "action=RESET",
      "entityType=USER",
      "unexpected=yes",
    ])
      await request(server)
        .get(`/api/v1/admin/audit-logs?${query}`)
        .auth(admin, { type: "bearer" })
        .expect(400);
    const actor = await prisma.user.findUniqueOrThrow({
      where: { email: `${prefix}-admin@example.test` },
    });
    await prisma.user.update({
      where: { id: actor.id },
      data: { role: "CUSTOMER" },
    });
    try {
      await request(server)
        .get("/api/v1/admin/audit-logs")
        .auth(admin, { type: "bearer" })
        .expect(403);
    } finally {
      await prisma.user.update({
        where: { id: actor.id },
        data: { role: "ADMIN" },
      });
    }
  });
  it("rolls back catalogue writes if durable audit persistence fails", async () => {
    const repository = app.get(AuditRepository);
    const failedTitle = `${prefix}-audit-rollback`;
    const failure = jest
      .spyOn(repository, "record")
      .mockRejectedValueOnce(new Error("owned audit failure"));
    await moviePost()
      .send({ ...movieBody(), title: failedTitle })
      .expect(500);
    failure.mockRestore();
    expect(await prisma.movie.count({ where: { title: failedTitle } })).toBe(0);
    expect(
      await prisma.auditLog.count({ where: { summary: failedTitle } }),
    ).toBe(0);
    const film = await movie();
    const failedUpdate = jest
      .spyOn(repository, "record")
      .mockRejectedValueOnce(new Error("owned audit failure"));
    await patch(`movies/${film.id}`, { status: "NOW_SHOWING" }).expect(500);
    failedUpdate.mockRestore();
    expect(
      (await prisma.movie.findUniqueOrThrow({ where: { id: film.id } })).status,
    ).toBe("COMING_SOON");
    const failedDelete = jest
      .spyOn(repository, "record")
      .mockRejectedValueOnce(new Error("owned audit failure"));
    await remove(`movies/${film.id}`).expect(500);
    failedDelete.mockRestore();
    expect(await prisma.movie.count({ where: { id: film.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: film.id } })).toBe(
      1,
    );
  });
  it("rejects oversized room matrices and unpaired Sweetbox rows before creating seats", async () => {
    const roomId = await emptyRoom().then((value) => value.id);
    const rows = Array.from({ length: 15 }, (_, index) =>
      String.fromCharCode(65 + index),
    );
    expect(
      code(await generate(roomId, { rows, columns: 24 }).expect(400)),
    ).toBe("ROOM_CAPACITY_EXCEEDED");
    expect(
      code(
        await generate(roomId, {
          rows: ["A"],
          columns: 3,
          sweetboxRows: ["A"],
        }).expect(400),
      ),
    ).toBe("INVALID_SWEETBOX_LAYOUT");
    await generate(roomId, { rows: [...rows, "P"], columns: 1 }).expect(400);
    await generate(roomId, { rows: ["A"], columns: 25 }).expect(400);
    expect(await prisma.seat.count({ where: { roomId } })).toBe(0);
    expect(
      entity(await request(server).get(`/api/v1/rooms/${roomId}`).expect(200))
        .totalSeats,
    ).toBe(0);
  });
  it("serializes capacity checks so concurrent seat additions cannot exceed 300", async () => {
    const roomId = await emptyRoom().then((value) => value.id);
    const rows = Array.from({ length: 15 }, (_, index) =>
      String.fromCharCode(65 + index),
    );
    await generate(roomId, { rows, columns: 20 }).expect(201);
    const last = await prisma.seat.findFirstOrThrow({
      where: { roomId, seatRow: "O", seatColumn: 20 },
    });
    await remove(`seats/${last.id}`).expect(200);
    const replies = await Promise.all([
      createSeat(roomId, 20, "O"),
      createSeat(roomId, 21, "O"),
    ]);
    expect(replies.map((reply) => reply.status).sort()).toEqual([201, 400]);
    const rejected = replies.find((reply) => reply.status === 400);
    if (!rejected) throw new Error("Capacity rejection missing");
    expect(code(rejected)).toBe("ROOM_CAPACITY_EXCEEDED");
    expect(await prisma.seat.count({ where: { roomId } })).toBe(300);
    expect(
      (await prisma.room.findUniqueOrThrow({ where: { id: roomId } }))
        .totalSeats,
    ).toBe(300);
  });
  it("enforces the 15-row boundary on individual seat create and edit routes", async () => {
    const roomId = await emptyRoom().then((value) => value.id);
    const rows = Array.from({ length: 15 }, (_, index) =>
      String.fromCharCode(65 + index),
    );
    await generate(roomId, { rows, columns: 2 }).expect(201);
    expect(code(await createSeat(roomId, 1, "P").expect(400))).toBe(
      "ROOM_CAPACITY_EXCEEDED",
    );
    const seat = await prisma.seat.findFirstOrThrow({
      where: { roomId, seatRow: "A" },
    });
    expect(
      code(await patch(`seats/${seat.id}`, { seatRow: "P" }).expect(400)),
    ).toBe("ROOM_CAPACITY_EXCEEDED");
    expect(
      (await prisma.seat.findUniqueOrThrow({ where: { id: seat.id } })).seatRow,
    ).toBe("A");
  });
});
