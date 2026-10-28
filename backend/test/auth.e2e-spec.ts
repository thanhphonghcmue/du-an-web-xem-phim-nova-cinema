import { Controller, Get, INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import { hash, verify } from "argon2";
import Redis from "ioredis";
import { randomBytes, randomUUID } from "node:crypto";
import { Server } from "node:http";
import request, { Response } from "supertest";
import { AppModule } from "../src/app.module";
import { configureApplication } from "../src/bootstrap";
import { Roles } from "../src/common/decorators/roles.decorator";
import { CurrentUser } from "../src/common/decorators/current-user.decorator";
import { PrismaService } from "../src/database/prisma.service";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { AuthSessionDto } from "../src/modules/auth/dto/auth.dto";
import { TokenService, tokenHash } from "../src/modules/auth/token.service";
import { UserProfileDto } from "../src/modules/users/dto/user-profile.dto";

@Controller("_roles")
class RoleHarnessController {
  @Get("admin") @Roles(UserRole.ADMIN) admin(): string {
    return "admin";
  }
  @Get("staff") @Roles(UserRole.ADMIN, UserRole.STAFF) staff(): string {
    return "staff";
  }
  @Get("default") defaults(@CurrentUser() user: UserProfileDto): string {
    return user.id;
  }
}
@Module({ imports: [AppModule], controllers: [RoleHarnessController] })
class AuthTestModule {}
function data(response: Response): unknown {
  const body = JSON.parse(response.text) as { success: boolean; data: unknown };
  expect(body.success).toBe(true);
  return body.data;
}
function sessionData(response: Response): AuthSessionDto {
  return data(response) as AuthSessionDto;
}
function profileData(response: Response): UserProfileDto {
  return data(response) as UserProfileDto;
}
function error(response: Response): { error: string; message: unknown } {
  const body = JSON.parse(response.text) as {
    success: boolean;
    error: string;
    message: unknown;
  };
  expect(body.success).toBe(false);
  return { error: body.error, message: body.message };
}

describe("Phase 3 real PostgreSQL/Redis authentication", () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;
  let redis: Redis;
  let tokens: TokenService;
  let passwordHash: string;
  let customer: UserProfileDto;
  let staff: UserProfileDto;
  let admin: UserProfileDto;
  const prefix = `p3-${randomUUID()}`;
  const password = randomBytes(24).toString("base64url");
  const jwt = new JwtService();
  const email = (suffix: string) => `${prefix}-${suffix}@example.test`;
  async function fixture(
    suffix: string,
    role: UserRole = UserRole.CUSTOMER,
  ): Promise<UserProfileDto> {
    const user = await prisma.user.create({
      data: {
        email: email(suffix),
        fullName: "Phase Three",
        passwordHash,
        role,
      },
    });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      cMemberPoints: user.cMemberPoints,
      cMemberTier: user.cMemberTier,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
  async function login(user: UserProfileDto): Promise<AuthSessionDto> {
    return sessionData(
      await request(server)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password })
        .expect(200),
    );
  }
  function refresh(refreshToken: string) {
    return request(server).post("/api/v1/auth/refresh").send({ refreshToken });
  }
  async function access(
    payload: Record<string, unknown> = {},
    secret = process.env.JWT_ACCESS_SECRET || "",
    audience = "nova-api",
  ): Promise<string> {
    const claims: Record<string, unknown> = {
      sub: customer.id,
      jti: randomUUID(),
      tokenUse: "access",
      exp: Math.floor(Date.now() / 1000) + 900,
      ...payload,
    };
    if (claims.exp === undefined) delete claims.exp;
    return jwt.signAsync(claims, {
      secret,
      algorithm: "HS256",
      issuer: "nova-cinema",
      audience,
    });
  }

  beforeAll(async () => {
    app = await NestFactory.create(AuthTestModule, {
      logger: false,
      bodyParser: false,
      abortOnError: false,
    });
    configureApplication(app);
    await app.listen(0, "127.0.0.1");
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    tokens = app.get(TokenService);
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT),
      db: Number(process.env.REDIS_DB),
      ...(process.env.REDIS_PASSWORD
        ? { password: process.env.REDIS_PASSWORD }
        : {}),
    });
    passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    customer = await fixture("customer");
    staff = await fixture("staff", UserRole.STAFF);
    admin = await fixture("admin", UserRole.ADMIN);
  });
  afterEach(async () => {
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:throttle:*`,
    );
    if (keys.length) await redis.del(...keys);
  });
  afterAll(async () => {
    const owned = await prisma.user.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });
    const ids = owned.map((user) => user.id);
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
    const keys = await redis.keys(
      `${process.env.BULLMQ_PREFIX || "invalid"}:*`,
    );
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  it("normalizes registration, stores Argon2id and returns only safe customer defaults", async () => {
    const response = await request(server)
      .post("/api/v1/auth/register")
      .send({
        email: `  ${email("register").toUpperCase()}  `,
        password,
        fullName: "  Test Member  ",
        phone: "+84901234567",
      })
      .expect(201);
    const user = profileData(response);
    expect(user).toMatchObject({
      email: email("register"),
      fullName: "Test Member",
      role: "CUSTOMER",
      cMemberPoints: 0,
      cMemberTier: "SILVER",
    });
    expect(response.text).not.toMatch(/passwordHash|password_hash|tokenHash/);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored.passwordHash).not.toBe(password);
    expect(await verify(stored.passwordHash, password)).toBe(true);
    await request(server)
      .post("/api/v1/auth/register")
      .send({ email: email("register"), password, fullName: "Duplicate" })
      .expect(409);
  });

  it("allows exactly one of simultaneous normalized duplicate registrations", async () => {
    const outcomes = await Promise.all(
      [email("race"), email("race").toUpperCase()].map((address) =>
        request(server)
          .post("/api/v1/auth/register")
          .send({ email: address, password, fullName: "Concurrent Member" }),
      ),
    );
    expect(outcomes.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await prisma.user.count({ where: { email: email("race") } })).toBe(
      1,
    );
    const conflict = outcomes.find((response) => response.status === 409);
    expect(conflict && error(conflict).error).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("rejects invalid registration and privilege injection without creating users", async () => {
    for (const payload of [
      { email: "bad-email", password, fullName: "Valid Name" },
      { email: email("short"), password: "short", fullName: "Valid Name" },
      {
        email: email("role-injection"),
        password,
        fullName: "Valid Name",
        role: "ADMIN",
        cMemberPoints: 5000,
      },
      { email: email("null-name"), password, fullName: null },
    ])
      await request(server)
        .post("/api/v1/auth/register")
        .send(payload)
        .expect(400);
    expect(
      await prisma.user.count({ where: { email: email("role-injection") } }),
    ).toBe(0);
  });

  it.each(["LOCKED", "INACTIVE"] as const)(
    "UC02 E2 rejects %s login, existing access and refresh without exposing hashes",
    async (status) => {
      const user = await fixture(`disabled-${status.toLowerCase()}`);
      const prior = await login(user);
      await prisma.user.update({ where: { id: user.id }, data: { status } });
      const denied = await request(server)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password })
        .expect(403);
      expect(error(denied).error).toBe("ACCOUNT_DISABLED");
      expect(denied.text).not.toMatch(/passwordHash|password_hash|accessToken/);
      await request(server)
        .get("/api/v1/users/me")
        .auth(prior.accessToken, { type: "bearer" })
        .expect(403);
      await refresh(prior.refreshToken).expect(403);
      await request(server)
        .post("/api/v1/auth/login")
        .send({ email: user.email, password: "incorrect-password" })
        .expect(401);
    },
  );

  it("ADMIN status update revokes refresh sessions atomically and only new login works after activation", async () => {
    const user = await fixture("admin-lock");
    const prior = await login(user),
      management = await login(admin);
    const update = (status: string, authorization = management.accessToken) =>
      request(server)
        .patch(`/api/v1/users/${user.id}/status`)
        .auth(authorization, { type: "bearer" })
        .send({ status });
    await update("LOCKED", prior.accessToken).expect(403);
    await update("LOCKED", (await login(staff)).accessToken).expect(403);
    await update("invalid").expect(400);
    await request(server)
      .patch(`/api/v1/users/${user.id}/status`)
      .auth(management.accessToken, { type: "bearer" })
      .send({ status: "LOCKED", role: "ADMIN" })
      .expect(400);
    await update("LOCKED").expect(200);
    expect(
      await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      }),
    ).toBe(0);
    await request(server)
      .get("/api/v1/users/me")
      .auth(prior.accessToken, { type: "bearer" })
      .expect(403);
    await update("ACTIVE").expect(200);
    await refresh(prior.refreshToken).expect(401);
    expect((await login(user)).user.id).toBe(user.id);
    await request(server)
      .patch(`/api/v1/users/${admin.id}/status`)
      .auth(management.accessToken, { type: "bearer" })
      .send({ status: "LOCKED" })
      .expect(409);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).status,
    ).toBe("ACTIVE");
  });

  it("uses generic login errors for absent email and wrong password", async () => {
    const absent = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: email("absent"), password })
      .expect(401);
    const wrong = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: customer.email, password: password + "wrong" })
      .expect(401);
    expect(error(absent)).toEqual(error(wrong));
    expect(error(wrong).error).toBe("INVALID_CREDENTIALS");
    expect(wrong.text).not.toContain(password);
  });

  it("logs in with normalized email and stores only a hash of the refresh token", async () => {
    const session = sessionData(
      await request(server)
        .post("/api/v1/auth/login")
        .send({ email: customer.email.toUpperCase(), password })
        .expect("Cache-Control", "no-store")
        .expect(200),
    );
    expect(session).toMatchObject({
      tokenType: "Bearer",
      expiresIn: 900,
      refreshExpiresIn: 604800,
      user: { id: customer.id },
    });
    const claims = jwt.decode<{ jti: string }>(session.refreshToken);
    const row = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: claims.jti },
    });
    expect(row.tokenHash).toBe(tokenHash(session.refreshToken));
    expect(row.tokenHash).not.toBe(session.refreshToken);
    const profile = await request(server)
      .get("/api/v1/users/me")
      .auth(session.accessToken, { type: "bearer" })
      .expect(200);
    expect(profile.text).not.toMatch(/password|tokenHash|refreshToken/);
    expect(profileData(profile).id).toBe(customer.id);
  });

  it("requires authentication by default and enforces admin/staff roles", async () => {
    await request(server).get("/api/v1/users/me").expect(401);
    await request(server).get("/api/v1/_roles/default").expect(401);
    const customerSession = await login(customer);
    const staffSession = await login(staff);
    const adminSession = await login(admin);
    await request(server)
      .get("/api/v1/_roles/admin")
      .auth(customerSession.accessToken, { type: "bearer" })
      .expect(403);
    await request(server)
      .get("/api/v1/_roles/admin")
      .auth(staffSession.accessToken, { type: "bearer" })
      .expect(403);
    await request(server)
      .get("/api/v1/_roles/staff")
      .auth(staffSession.accessToken, { type: "bearer" })
      .expect(200);
    await request(server)
      .get("/api/v1/_roles/admin")
      .auth(adminSession.accessToken, { type: "bearer" })
      .expect(200);
    const response = await request(server)
      .get("/api/v1/_roles/default")
      .auth(customerSession.accessToken, { type: "bearer" })
      .expect(200);
    expect(data(response)).toBe(customer.id);
  });

  it("loads current database roles rather than trusting stale JWT claims", async () => {
    const token = await access({ role: "ADMIN" });
    await request(server)
      .get("/api/v1/_roles/admin")
      .auth(token, { type: "bearer" })
      .expect(403);
    try {
      await prisma.user.update({
        where: { id: customer.id },
        data: { role: "STAFF" },
      });
      await request(server)
        .get("/api/v1/_roles/staff")
        .auth(token, { type: "bearer" })
        .expect(200);
      await prisma.user.update({
        where: { id: customer.id },
        data: { role: "GUEST" },
      });
      await request(server)
        .get("/api/v1/users/me")
        .auth(token, { type: "bearer" })
        .expect(401);
      await request(server)
        .post("/api/v1/auth/login")
        .send({ email: customer.email, password })
        .expect(401);
    } finally {
      await prisma.user.update({
        where: { id: customer.id },
        data: { role: "CUSTOMER" },
      });
    }
  });

  it("rejects forged, expired, wrong-purpose, wrong-audience and incomplete JWTs", async () => {
    const pair = await tokens.issue(customer.id);
    const invalid = [
      "not-a-token",
      pair.tokens.refreshToken,
      await jwt.signAsync(
        {
          sub: customer.id,
          jti: randomUUID(),
          tokenUse: "access",
          exp: Math.floor(Date.now() / 1000) + 900,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET || "",
          algorithm: "HS384",
          issuer: "nova-cinema",
          audience: "nova-api",
        },
      ),
      await access({}, randomBytes(48).toString("hex")),
      await access({}, process.env.JWT_ACCESS_SECRET || "", "wrong-audience"),
      await access({ exp: Math.floor(Date.now() / 1000) - 1 }),
      await access({ exp: undefined }),
      await access({ sub: "not-a-uuid" }),
      await access({ tokenUse: "refresh" }),
    ];
    for (const token of invalid)
      await request(server)
        .get("/api/v1/users/me")
        .auth(token, { type: "bearer" })
        .expect(401);
  });

  it("rejects a validly signed token for a deleted user", async () => {
    const deleted = await fixture("deleted");
    const pair = await tokens.issue(deleted.id);
    await prisma.user.delete({ where: { id: deleted.id } });
    await request(server)
      .get("/api/v1/users/me")
      .auth(pair.tokens.accessToken, { type: "bearer" })
      .expect(401);
  });

  it("allows safe profile edits, clears phone and rejects mass assignment/null names", async () => {
    const session = await login(customer);
    const patch = () =>
      request(server)
        .patch("/api/v1/users/me")
        .auth(session.accessToken, { type: "bearer" });
    const changed = await patch()
      .send({ fullName: "  Updated Member  ", phone: "+84987654321" })
      .expect(200);
    expect(profileData(changed)).toMatchObject({
      fullName: "Updated Member",
      phone: "+84987654321",
    });
    const cleared = await patch().send({ phone: null }).expect(200);
    expect(profileData(cleared).phone).toBeNull();
    for (const payload of [
      { role: "ADMIN" },
      { cMemberTier: "DIAMOND", cMemberPoints: 100000 },
      { email: email("hijack") },
      { fullName: null },
      { phone: "invalid" },
      { password },
    ])
      await patch().send(payload).expect(400);
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(current.role).toBe("CUSTOMER");
    expect(current.cMemberPoints).toBe(0);
    expect(current.email).toBe(customer.email);
  });

  it("returns membership rates for every tier without allowing points edits", async () => {
    const session = await login(customer);
    try {
      for (const [tier, rate] of [
        ["SILVER", 0.05],
        ["GOLD", 0.07],
        ["DIAMOND", 0.1],
      ] as const) {
        await prisma.user.update({
          where: { id: customer.id },
          data: { cMemberTier: tier, cMemberPoints: 1000 },
        });
        const response = await request(server)
          .get("/api/v1/users/me/membership")
          .auth(session.accessToken, { type: "bearer" })
          .expect(200);
        expect(data(response)).toEqual({
          points: 1000,
          tier,
          discountRate: rate,
        });
      }
    } finally {
      await prisma.user.update({
        where: { id: customer.id },
        data: { cMemberTier: "SILVER", cMemberPoints: 0 },
      });
    }
  });

  it("rotates a refresh token once, rejects replay and accepts its successor", async () => {
    const session = await login(customer);
    const rotated = sessionData(
      await refresh(session.refreshToken).expect(200),
    );
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(rotated.accessToken).not.toBe(session.accessToken);
    await refresh(session.refreshToken).expect(401);
    await refresh(rotated.refreshToken).expect(200);
    const parent = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: jwt.decode<{ jti: string }>(session.refreshToken).jti },
    });
    expect(parent.revokedAt).not.toBeNull();
  });

  it("permits exactly one winner across five simultaneous refresh requests", async () => {
    const session = await login(customer);
    const before = await prisma.refreshToken.count({
      where: { userId: customer.id },
    });
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => refresh(session.refreshToken)),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 401, 401, 401, 401,
    ]);
    expect(
      await prisma.refreshToken.count({ where: { userId: customer.id } }),
    ).toBe(before + 1);
  });

  it("rolls back consumption when successor creation fails", async () => {
    const session = await login(customer);
    const spy = jest
      .spyOn(app.get(AuthRepository), "createToken")
      .mockImplementationOnce(() => {
        throw new Error("private insertion diagnostic");
      });
    const failed = await refresh(session.refreshToken).expect(500);
    expect(failed.text).not.toContain("private insertion diagnostic");
    spy.mockRestore();
    const row = await prisma.refreshToken.findUniqueOrThrow({
      where: { id: jwt.decode<{ jti: string }>(session.refreshToken).jti },
    });
    expect(row.revokedAt).toBeNull();
    await refresh(session.refreshToken).expect(200);
  });

  it("rejects database-expired and hash-mismatched refresh tokens", async () => {
    const session = await login(customer);
    const claims = jwt.decode<{ jti: string; sub: string }>(
      session.refreshToken,
    );
    const other = await jwt.signAsync(
      {
        sub: claims.sub,
        jti: claims.jti,
        tokenUse: "refresh",
        exp: Math.floor(Date.now() / 1000) + 100,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET || "",
        algorithm: "HS256",
        issuer: "nova-cinema",
        audience: "nova-refresh",
      },
    );
    await refresh(other).expect(401);
    await prisma.refreshToken.update({
      where: { id: claims.jti },
      data: {
        createdAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await refresh(session.refreshToken).expect(401);
    await refresh(session.accessToken).expect(401);
  });

  it("revokes logout idempotently while independent sessions remain valid", async () => {
    const first = await login(customer);
    const second = await login(customer);
    for (let i = 0; i < 2; i++)
      await request(server)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: first.refreshToken })
        .expect(200);
    await refresh(first.refreshToken).expect(401);
    await refresh(second.refreshToken).expect(200);
    // Access tokens remain valid until their short expiry; logout revokes the refresh session.
    await request(server)
      .get("/api/v1/users/me")
      .auth(first.accessToken, { type: "bearer" })
      .expect(200);
  });

  it("rejects expired or unrecorded refresh sessions for both refresh and logout", async () => {
    const unrecorded = await tokens.issue(customer.id);
    const expired = await jwt.signAsync(
      {
        sub: customer.id,
        jti: randomUUID(),
        tokenUse: "refresh",
        exp: Math.floor(Date.now() / 1000) - 1,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET || "",
        algorithm: "HS256",
        issuer: "nova-cinema",
        audience: "nova-refresh",
      },
    );
    for (const token of [
      unrecorded.tokens.refreshToken,
      expired,
      "invalid-token",
    ]) {
      await refresh(token).expect(401);
      await request(server)
        .post("/api/v1/auth/logout")
        .send({ refreshToken: token })
        .expect(401);
    }
  });

  it("enforces the real Redis login limiter after five failed attempts", async () => {
    for (let i = 0; i < 5; i++)
      await request(server)
        .post("/api/v1/auth/login")
        .send({ email: customer.email, password: password + "wrong" })
        .expect(401);
    const blocked = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: customer.email, password })
      .expect(429);
    expect(error(blocked).error).toBe("RATE_LIMIT_EXCEEDED");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("documents all seven auth/user endpoints and bearer-protected user responses", async () => {
    const response = await request(server).get("/api/docs-json").expect(200);
    const spec = JSON.parse(response.text) as {
      paths: Record<
        string,
        { get?: { security?: unknown }; post?: unknown; patch?: unknown }
      >;
      components: { schemas: Record<string, unknown> };
    };
    for (const path of [
      "auth/register",
      "auth/login",
      "auth/refresh",
      "auth/logout",
      "users/me",
      "users/me/membership",
    ])
      expect(spec.paths).toHaveProperty(`/api/v1/${path}`);
    expect(spec.paths["/api/v1/users/me"]?.patch).toBeDefined();
    expect(spec.paths["/api/v1/users/me"]?.get?.security).toEqual([
      { bearer: [] },
    ]);
    expect(spec.components.schemas).toHaveProperty("AuthSessionDto");
  });
});
