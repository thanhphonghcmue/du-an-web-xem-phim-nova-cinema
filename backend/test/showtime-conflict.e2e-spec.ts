import { INestApplication } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { hash } from "argon2";
import Redis from "ioredis";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import request, { Response } from "supertest";
import { createApplication } from "../src/bootstrap";
import { PrismaService } from "../src/database/prisma.service";
import { TokenService } from "../src/modules/auth/token.service";
import { ShowtimesRepository } from "../src/modules/showtimes/showtimes.repository";

interface Entity {
  id: string;
  [key: string]: unknown;
}
interface Listing {
  items: Entity[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
function data(response: Response): unknown {
  const body = JSON.parse(response.text) as { success: boolean; data: unknown };
  expect(body.success).toBe(true);
  return body.data;
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
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("Phase 5 BR03 / TC-02 with real PostgreSQL and Redis", () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let admin: string;
  let staff: string;
  let customer: string;
  let customerId: string;
  const prefix = `p5-${randomUUID()}`;

  const post = (body: object) =>
    request(server)
      .post("/api/v1/showtimes")
      .auth(admin, { type: "bearer" })
      .send(body);
  const patch = (id: string, body: object) =>
    request(server)
      .patch(`/api/v1/showtimes/${id}`)
      .auth(admin, { type: "bearer" })
      .send(body);
  const remove = (id: string) =>
    request(server)
      .delete(`/api/v1/showtimes/${id}`)
      .auth(admin, { type: "bearer" });
  const body = (
    movieId: string,
    roomId: string,
    startTime = "2042-01-01T10:00:00Z",
  ) => ({ movieId, roomId, startTime, baseTicketPrice: "90000.00" });

  async function film(durationMinutes = 120) {
    return prisma.movie.create({
      data: {
        title: `${prefix}-${randomUUID()}`,
        description: "Showtime fixture",
        durationMinutes,
        releaseDate: new Date("2041-01-01T00:00:00Z"),
        ageRating: "T13",
        status: "NOW_SHOWING",
      },
    });
  }
  async function auditorium(cinemaId?: string) {
    const venue = cinemaId
      ? { id: cinemaId }
      : await prisma.cinema.create({
          data: {
            name: `${prefix}-${randomUUID()}`,
            address: "Fixture",
            city: prefix,
          },
        });
    return prisma.room.create({
      data: {
        cinemaId: venue.id,
        name: `${prefix}-${randomUUID()}`,
        roomType: "IMAX_70MM_LASER",
        totalSeats: 0,
      },
    });
  }
  async function fixture() {
    const movie = await film();
    const room = await auditorium();
    const showtime = entity(await post(body(movie.id, room.id)).expect(201));
    return { movie, room, showtime };
  }
  function booking(showtimeId: string, tx: Prisma.TransactionClient = prisma) {
    return tx.booking.create({
      data: {
        userId: customerId,
        showtimeId,
        orderCode: `p5-${randomBytes(12).toString("hex")}`,
        status: "CANCELLED",
        expiredAt: new Date("2043-01-01T00:00:00Z"),
      },
    });
  }
  async function waitForLock(queryPrefix: string, count = 1): Promise<void> {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) AS count FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'
          AND query LIKE ${`${queryPrefix}%`}`;
      if (Number(rows[0]?.count ?? 0) >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(
      "Expected an actual PostgreSQL lock wait, but none occurred.",
    );
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
    for (const role of ["ADMIN", "STAFF", "CUSTOMER"] as const) {
      const user = await prisma.user.create({
        data: {
          email: `${prefix}-${role}@example.test`.toLowerCase(),
          passwordHash,
          fullName: "Showtime fixture",
          role,
        },
      });
      const token = (await app.get(TokenService).issue(user.id)).tokens
        .accessToken;
      if (role === "ADMIN") admin = token;
      else if (role === "STAFF") staff = token;
      else {
        customer = token;
        customerId = user.id;
      }
    }
  });
  afterEach(async () => {
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:throttle:*`,
    );
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    const movies = await prisma.movie.findMany({
      where: { title: { startsWith: prefix } },
      select: { id: true },
    });
    const movieIds = movies.map((row) => row.id);
    const shows = await prisma.showtime.findMany({
      where: { movieId: { in: movieIds } },
      select: { id: true },
    });
    await prisma.booking.deleteMany({
      where: { showtimeId: { in: shows.map((row) => row.id) } },
    });
    await prisma.showtime.deleteMany({ where: { movieId: { in: movieIds } } });
    await prisma.seat.deleteMany({
      where: { room: { cinema: { name: { startsWith: prefix } } } },
    });
    await prisma.room.deleteMany({
      where: { cinema: { name: { startsWith: prefix } } },
    });
    await prisma.cinema.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.movie.deleteMany({ where: { id: { in: movieIds } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:*`,
    );
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("allows public reads and restricts every schedule mutation to ADMIN", async () => {
    const { showtime } = await fixture();
    await request(server).get("/api/v1/showtimes").expect(200);
    for (const token of [staff, customer])
      await request(server)
        .get(`/api/v1/showtimes/${showtime.id}`)
        .auth(token, { type: "bearer" })
        .expect(200);
    for (const [method, path] of [
      ["post", "/api/v1/showtimes"],
      ["patch", `/api/v1/showtimes/${showtime.id}`],
      ["delete", `/api/v1/showtimes/${showtime.id}`],
    ] as const) {
      const api = request(server);
      await api[method](path).send({}).expect(401);
      for (const token of [staff, customer])
        await api[method](path)
          .auth(token, { type: "bearer" })
          .send({})
          .expect(403);
    }
  });

  it("derives endTime with cleaning, normalizes timezone and preserves Decimal precision", async () => {
    const movie = await film(166);
    const room = await auditorium();
    const created = entity(
      await post({
        ...body(movie.id, room.id, "2042-01-01T23:50:00.123+07:00"),
        baseTicketPrice: "999999999999.99",
      }).expect(201),
    );
    expect(created).toMatchObject({
      movieId: movie.id,
      roomId: room.id,
      startTime: "2042-01-01T16:50:00.123Z",
      endTime: "2042-01-01T19:51:00.123Z",
      baseTicketPrice: "999999999999.99",
    });
    expect(
      entity(await patch(created.id, { baseTicketPrice: "0.01" }).expect(200))
        .baseTicketPrice,
    ).toBe("0.01");
    expect(
      entity(
        await request(server)
          .get(`/api/v1/showtimes/${created.id}`)
          .expect(200),
      ).baseTicketPrice,
    ).toBe("0.01");
  });

  it("TC-02: rejects 12:00 after a 10:00–12:15 show, permits exactly 12:15", async () => {
    const { movie, room, showtime } = await fixture();
    expect(showtime.endTime).toBe("2042-01-01T12:15:00.000Z");
    expect(
      code(
        await post(body(movie.id, room.id, "2042-01-01T12:00:00Z")).expect(409),
      ),
    ).toBe("SHOWTIME_CONFLICT");
    const next = entity(
      await post(body(movie.id, room.id, "2042-01-01T12:15:00Z")).expect(201),
    );
    expect(next.startTime).toBe(showtime.endTime);
    expect(await prisma.showtime.count({ where: { roomId: room.id } })).toBe(2);
  });

  it.each([14, 15, 16])(
    "BVA cleaning gap %i minutes is checked against the previous movie end",
    async (minutes) => {
      const { movie, room } = await fixture();
      const start = `2042-01-01T12:${String(minutes).padStart(2, "0")}:00Z`;
      await post(body(movie.id, room.id, start)).expect(
        minutes < 15 ? 409 : 201,
      );
    },
  );

  it("rejects all overlap shapes and permits a boundary immediately before the existing show", async () => {
    const { movie, room } = await fixture();
    for (const start of ["08:00", "09:59", "10:00", "11:00", "12:14"])
      expect(
        code(
          await post(body(movie.id, room.id, `2042-01-01T${start}:00Z`)).expect(
            409,
          ),
        ),
      ).toBe("SHOWTIME_CONFLICT");
    const longer = await film(180);
    await post(body(longer.id, room.id, "2042-01-01T09:00:00Z")).expect(409);
    await post(body(movie.id, room.id, "2042-01-01T07:45:00Z")).expect(201);
    await post(body(movie.id, (await auditorium()).id)).expect(201);
  });

  it("validates strict bodies, positive string money, timezone and timestamp precision on create and patch", async () => {
    const { movie, room, showtime } = await fixture();
    const invalid: Array<Record<string, unknown>> = [
      { movieId: null },
      { roomId: "bad" },
      { startTime: null },
      { startTime: "2042-01-01" },
      { startTime: "2042-01-01T10:00:00" },
      { startTime: "2042-02-30T10:00:00Z" },
      { startTime: "2042-01-01T10:00:00.1234Z" },
      { startTime: "2042-01-01T10:00:00Z\n" },
      { startTime: "0000-01-01T10:00:00Z" },
      { baseTicketPrice: null },
      { baseTicketPrice: 90000 },
      { baseTicketPrice: "0" },
      { baseTicketPrice: "0.00" },
      { baseTicketPrice: "-1" },
      { baseTicketPrice: "1.001" },
      { baseTicketPrice: "1000000000000" },
      { baseTicketPrice: "1e5" },
      { baseTicketPrice: "01.00" },
      { baseTicketPrice: "90000\n" },
      { endTime: "2042-01-01T12:00:00Z" },
      { id: randomUUID() },
      { bookingSeats: [] },
    ];
    for (const changes of invalid) {
      expect(
        code(
          await post({ ...body(movie.id, room.id), ...changes }).expect(400),
        ),
      ).toBe("VALIDATION_ERROR");
      await patch(showtime.id, changes).expect(400);
    }
    await post({}).expect(400);
    await post(body(movie.id, room.id, "9999-12-31T23:59:59Z")).expect(400);
    await post({
      ...body(movie.id, room.id, "2042-02-01T10:00:00Z"),
      baseTicketPrice: "1",
    }).expect(201);
  });

  it("returns domain 404s for missing parents and IDs and validates route/query UUIDs", async () => {
    const { movie, room, showtime } = await fixture();
    expect(code(await post(body(randomUUID(), room.id)).expect(404))).toBe(
      "MOVIE_NOT_FOUND",
    );
    expect(code(await post(body(movie.id, randomUUID())).expect(404))).toBe(
      "ROOM_NOT_FOUND",
    );
    expect(
      code(await patch(showtime.id, { movieId: randomUUID() }).expect(404)),
    ).toBe("MOVIE_NOT_FOUND");
    expect(
      code(await patch(showtime.id, { roomId: randomUUID() }).expect(404)),
    ).toBe("ROOM_NOT_FOUND");
    for (const method of ["get", "patch", "delete"] as const) {
      const api = request(server);
      expect(
        code(
          await api[method](`/api/v1/showtimes/${randomUUID()}`)
            .auth(admin, { type: "bearer" })
            .expect(404),
        ),
      ).toBe("SHOWTIME_NOT_FOUND");
      await api[method]("/api/v1/showtimes/not-a-uuid")
        .auth(admin, { type: "bearer" })
        .expect(400);
    }
    for (const query of [
      { movieId: "bad" },
      { cinemaId: "bad" },
      { roomId: "bad" },
      { date: "2042-02-30" },
      { date: "2042-01-01\n" },
      { date: "2042-01-01T00:00:00Z" },
      { page: 0 },
      { limit: 101 },
      { unexpected: true },
    ])
      await request(server).get("/api/v1/showtimes").query(query).expect(400);
  });

  it("filters by movie/cinema/room/Vietnam day with stable pagination and both day boundaries", async () => {
    const movie = await film();
    const room = await auditorium();
    const room2 = await auditorium(room.cinemaId);
    for (const start of [
      "2042-02-01T16:59:59Z",
      "2042-02-01T20:00:00Z",
      "2042-02-02T16:59:59Z",
      "2042-02-02T20:00:00Z",
    ])
      await post(body(movie.id, room.id, start)).expect(201);
    const sameStart = entity(
      await post(body(movie.id, room2.id, "2042-02-01T20:00:00Z")).expect(201),
    );
    const base = {
      movieId: movie.id,
      cinemaId: room.cinemaId,
      date: "2042-02-02",
      limit: 1,
    };
    const pages: Entity[] = [];
    for (let page = 1; page <= 3; page++) {
      const result = listing(
        await request(server)
          .get("/api/v1/showtimes")
          .query({ ...base, page })
          .expect(200),
      );
      expect(result.meta).toEqual({ page, limit: 1, total: 3, totalPages: 3 });
      pages.push(...result.items);
    }
    expect(new Set(pages.map((item) => item.id)).size).toBe(3);
    const equalStart = pages
      .filter((row) => row.startTime === sameStart.startTime)
      .map((row) => row.id);
    expect(equalStart).toEqual([...equalStart].sort());
    const filtered = listing(
      await request(server)
        .get("/api/v1/showtimes")
        .query({ ...base, roomId: room.id, limit: 20 })
        .expect(200),
    );
    expect(filtered.meta.total).toBe(2);
    expect(filtered.items.map((row) => row.startTime)).toEqual([
      "2042-02-01T20:00:00.000Z",
      "2042-02-02T16:59:59.000Z",
    ]);
    expect(
      listing(
        await request(server)
          .get("/api/v1/showtimes")
          .query({ ...base, page: 99 })
          .expect(200),
      ).items,
    ).toEqual([]);
    expect(
      listing(
        await request(server)
          .get("/api/v1/showtimes")
          .query({ ...base, cinemaId: randomUUID() })
          .expect(200),
      ).meta.total,
    ).toBe(0);
    // Midnight itself belongs to the next day, on a separate room so it cannot overlap the 23:59 show.
    const midnight = entity(
      await post(body(movie.id, room2.id, "2042-02-01T17:00:00Z")).expect(201),
    );
    expect(
      listing(
        await request(server)
          .get("/api/v1/showtimes")
          .query({ movieId: movie.id, date: "2042-02-02" })
          .expect(200),
      ).items.map((row) => row.id),
    ).toContain(midnight.id);
    expect(
      listing(
        await request(server)
          .get("/api/v1/showtimes")
          .query({ movieId: movie.id, date: "2042-02-01" })
          .expect(200),
      ).items.map((row) => row.id),
    ).not.toContain(midnight.id);
  });

  it("defaults to upcoming starts and allows explicitly reading a historical day/detail", async () => {
    const movie = await film();
    const room = await auditorium();
    const past = entity(
      await post(body(movie.id, room.id, "2020-01-01T10:00:00Z")).expect(201),
    );
    const future = entity(await post(body(movie.id, room.id)).expect(201));
    expect(
      listing(
        await request(server)
          .get("/api/v1/showtimes")
          .query({ movieId: movie.id })
          .expect(200),
      ).items.map((row) => row.id),
    ).toEqual([future.id]);
    expect(
      listing(
        await request(server)
          .get("/api/v1/showtimes")
          .query({ movieId: movie.id, date: "2020-01-01" })
          .expect(200),
      ).items.map((row) => row.id),
    ).toEqual([past.id]);
    await request(server).get(`/api/v1/showtimes/${past.id}`).expect(200);
  });

  it("excludes self on update, recomputes duration after a movie change and rolls back conflicts", async () => {
    const { movie, room, showtime } = await fixture();
    expect(entity(await patch(showtime.id, {}).expect(200))).toEqual(showtime);
    await patch(showtime.id, {
      startTime: "2042-01-01T10:00:00+00:00",
      baseTicketPrice: "90000",
    }).expect(200);
    const longMovie = await film(180);
    expect(
      entity(
        await patch(showtime.id, {
          movieId: longMovie.id,
          startTime: "2042-01-01T09:00:00Z",
        }).expect(200),
      ).endTime,
    ).toBe("2042-01-01T12:15:00.000Z");
    const second = entity(
      await post(body(movie.id, room.id, "2042-01-01T12:15:00Z")).expect(201),
    );
    expect(
      code(
        await patch(second.id, {
          startTime: "2042-01-01T12:14:59.999Z",
          baseTicketPrice: "100000",
        }).expect(409),
      ),
    ).toBe("SHOWTIME_CONFLICT");
    expect(
      entity(
        await request(server).get(`/api/v1/showtimes/${second.id}`).expect(200),
      ),
    ).toEqual(second);
    expect(
      code(
        await patch(showtime.id, { startTime: "2042-01-01T10:00:00Z" }).expect(
          409,
        ),
      ),
    ).toBe("SHOWTIME_CONFLICT");
  });

  it("checks conflicts in a destination room when moving a schedule", async () => {
    const { movie, room, showtime } = await fixture();
    const target = await auditorium();
    await post(body(movie.id, target.id)).expect(201);
    await patch(showtime.id, { roomId: target.id }).expect(409);
    expect(
      entity(
        await patch(showtime.id, {
          roomId: target.id,
          startTime: "2042-01-01T12:15:00Z",
        }).expect(200),
      ).roomId,
    ).toBe(target.id);
    expect(await prisma.showtime.count({ where: { roomId: room.id } })).toBe(0);
  });

  it("permits one winner among five simultaneous overlapping creates in one room", async () => {
    const room = await auditorium();
    const movies = await Promise.all(Array.from({ length: 5 }, () => film()));
    const responses = await Promise.all(
      movies.map((movie) => post(body(movie.id, room.id))),
    );
    expect(responses.map((row) => row.status).sort()).toEqual([
      201, 409, 409, 409, 409,
    ]);
    for (const response of responses.filter((row) => row.status === 409))
      expect(code(response)).toBe("SHOWTIME_CONFLICT");
    expect(await prisma.showtime.count({ where: { roomId: room.id } })).toBe(1);
  });

  it("permits simultaneous adjacent schedules and simultaneous schedules in different rooms", async () => {
    const movie = await film();
    const room = await auditorium();
    const room2 = await auditorium();
    const responses = await Promise.all([
      post(body(movie.id, room.id)),
      post(body(movie.id, room.id, "2042-01-01T12:15:00Z")),
      post(body(movie.id, room2.id)),
    ]);
    expect(responses.map((row) => row.status)).toEqual([201, 201, 201]);
  });

  it("allows only one of two simultaneous updates to occupy the same new interval", async () => {
    const { movie, room, showtime } = await fixture();
    const other = entity(
      await post(body(movie.id, room.id, "2042-01-01T14:00:00Z")).expect(201),
    );
    const responses = await Promise.all([
      patch(showtime.id, { startTime: "2042-01-02T10:00:00Z" }),
      patch(other.id, { startTime: "2042-01-02T10:00:00Z" }),
    ]);
    expect(responses.map((row) => row.status).sort()).toEqual([200, 409]);
    for (const response of responses.filter((row) => row.status === 409))
      expect(code(response)).toBe("SHOWTIME_CONFLICT");
    expect(
      await prisma.showtime.count({
        where: { roomId: room.id, startTime: new Date("2042-01-02T10:00:00Z") },
      }),
    ).toBe(1);
  });

  it("retries a changed parent snapshot during concurrent moves of the same showtime", async () => {
    const { movie, showtime } = await fixture();
    const destinations = await Promise.all([auditorium(), auditorium()]);
    const locked = gate();
    const release = gate();
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM movies WHERE id = ${movie.id}::uuid FOR UPDATE`;
        locked.release();
        await release.promise;
      },
      { timeout: 10000 },
    );
    await locked.promise;
    const responses = Promise.all(
      destinations.map((room) =>
        patch(showtime.id, { roomId: room.id }).then((response) => response),
      ),
    );
    try {
      await waitForLock("SELECT id FROM movies", 2);
    } finally {
      release.release();
    }
    await holder;
    expect((await responses).map((row) => row.status)).toEqual([200, 200]);
    expect(destinations.map((room) => room.id)).toContain(
      entity(
        await request(server)
          .get(`/api/v1/showtimes/${showtime.id}`)
          .expect(200),
      ).roomId,
    );
  });

  it("merges independent concurrent patches against the fresh locked row", async () => {
    const { showtime } = await fixture();
    const responses = await Promise.all([
      patch(showtime.id, { baseTicketPrice: "99000.55" }),
      patch(showtime.id, { startTime: "2042-01-02T10:00:00Z" }),
    ]);
    expect(responses.map((row) => row.status)).toEqual([200, 200]);
    expect(
      entity(
        await request(server)
          .get(`/api/v1/showtimes/${showtime.id}`)
          .expect(200),
      ),
    ).toMatchObject({
      startTime: "2042-01-02T10:00:00.000Z",
      endTime: "2042-01-02T12:15:00.000Z",
      baseTicketPrice: "99000.55",
    });
  });

  it("reads movie duration after acquiring its lock during concurrent catalog edits", async () => {
    const movie = await film();
    const room = await auditorium();
    const locked = gate();
    const release = gate();
    const writer = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM movies WHERE id = ${movie.id}::uuid FOR UPDATE`;
        locked.release();
        await release.promise;
        await tx.movie.update({
          where: { id: movie.id },
          data: { durationMinutes: 150 },
        });
      },
      { timeout: 10000 },
    );
    await locked.promise;
    const pending = post(body(movie.id, room.id)).then((response) => response);
    try {
      await waitForLock("SELECT id FROM movies");
    } finally {
      release.release();
    }
    await writer;
    const response = await pending;
    expect(response.status).toBe(201);
    expect(entity(response).endTime).toBe("2042-01-01T12:45:00.000Z");
  });

  it("maps a real GiST violation to SHOWTIME_CONFLICT when the service precheck is bypassed", async () => {
    const { movie, room, showtime } = await fixture();
    const repository = app.get(ShowtimesRepository);
    // Fault injection only bypasses the advisory precheck. Writes still hit real PostgreSQL constraints.
    jest.spyOn(repository, "overlap").mockResolvedValueOnce(null);
    expect(code(await post(body(movie.id, room.id)).expect(409))).toBe(
      "SHOWTIME_CONFLICT",
    );
    const next = entity(
      await post(body(movie.id, room.id, "2042-01-01T14:00:00Z")).expect(201),
    );
    jest.spyOn(repository, "overlap").mockResolvedValueOnce(null);
    expect(
      code(
        await patch(next.id, { startTime: "2042-01-01T10:00:00Z" }).expect(409),
      ),
    ).toBe("SHOWTIME_CONFLICT");
    expect(await prisma.showtime.count({ where: { roomId: room.id } })).toBe(2);
    expect(
      entity(
        await request(server)
          .get(`/api/v1/showtimes/${showtime.id}`)
          .expect(200),
      ),
    ).toEqual(showtime);
  });

  it("protects every booking status, including cancelled history, from schedule/price changes and deletion", async () => {
    const { showtime } = await fixture();
    const reference = await booking(showtime.id);
    for (const status of [
      "PENDING",
      "HOLDING",
      "PAID",
      "CANCELLED",
      "EXPIRED",
    ] as const) {
      await prisma.booking.update({
        where: { id: reference.id },
        data: { status },
      });
      expect(
        code(await patch(showtime.id, { baseTicketPrice: "1" }).expect(409)),
      ).toBe("SHOWTIME_IN_USE");
      expect(code(await remove(showtime.id).expect(409))).toBe(
        "SHOWTIME_IN_USE",
      );
    }
    await patch(showtime.id, {
      baseTicketPrice: "90000",
      movieId: String(showtime.movieId).toUpperCase(),
      roomId: String(showtime.roomId).toUpperCase(),
    }).expect(200);
    expect(
      entity(
        await request(server)
          .get(`/api/v1/showtimes/${showtime.id}`)
          .expect(200),
      ),
    ).toEqual(showtime);
  });

  it("waits for an in-flight booking FK insert before deciding whether an update is safe", async () => {
    const { showtime } = await fixture();
    const inserted = gate();
    const release = gate();
    const writer = prisma.$transaction(
      async (tx) => {
        await booking(showtime.id, tx);
        inserted.release();
        await release.promise;
      },
      { timeout: 10000 },
    );
    await inserted.promise;
    const pending = patch(showtime.id, { baseTicketPrice: "50000" }).then(
      (response) => response,
    );
    try {
      await waitForLock("SELECT id FROM showtimes");
    } finally {
      release.release();
    }
    await writer;
    const response = await pending;
    expect(response.status).toBe(409);
    expect(code(response)).toBe("SHOWTIME_IN_USE");
  });

  it("deletes an unused showtime and frees its interval for a new schedule", async () => {
    const { movie, room, showtime } = await fixture();
    expect(entity(await remove(showtime.id).expect(200))).toEqual({
      id: showtime.id,
      deleted: true,
    });
    await request(server).get(`/api/v1/showtimes/${showtime.id}`).expect(404);
    await post(body(movie.id, room.id)).expect(201);
  });

  it("documents five operations, request validation, public reads and protected writes alongside payment APIs", async () => {
    const response = await request(server).get("/api/docs-json").expect(200);
    const spec = JSON.parse(response.text) as {
      paths: Record<string, Record<string, { security?: unknown }>>;
      components: {
        schemas: Record<string, { properties?: Record<string, unknown> }>;
      };
    };
    expect(Object.keys(spec.paths["/api/v1/showtimes"] ?? {}).sort()).toEqual([
      "get",
      "post",
    ]);
    expect(
      Object.keys(spec.paths["/api/v1/showtimes/{id}"] ?? {}).sort(),
    ).toEqual(["delete", "get", "patch"]);
    for (const [path, method] of [
      ["/api/v1/showtimes", "post"],
      ["/api/v1/showtimes/{id}", "patch"],
      ["/api/v1/showtimes/{id}", "delete"],
    ] as const)
      expect(spec.paths[path]?.[method]?.security).toEqual([{ bearer: [] }]);
    expect(spec.paths["/api/v1/showtimes"]?.get?.security).toBeUndefined();
    expect(
      spec.components.schemas.CreateShowtimeDto?.properties,
    ).not.toHaveProperty("endTime");
    expect(spec.components.schemas.ShowtimeDto?.properties).toHaveProperty(
      "endTime",
    );
    expect(spec.paths).toHaveProperty("/api/v1/payments/webhook");
    expect(spec.paths).not.toHaveProperty("/api/v1/showtimes/{id}/seats");
  });
});
