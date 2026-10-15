import { Public } from "../src/common/decorators/public.decorator";
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Module,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Type } from "class-transformer";
import { IsInt, IsString, Min, ValidateNested } from "class-validator";
import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import request, { Response as SupertestResponse } from "supertest";
import { Server } from "node:http";
import { AppModule } from "../src/app.module";
import { configureApplication } from "../src/bootstrap";
import { ApiException } from "../src/common/exceptions/api.exception";
import { DatabaseRepository } from "../src/database/database.repository";
import { RedisThrottlerStorage } from "../src/redis/redis-throttler.storage";
import { RedisService } from "../src/redis/redis.service";

class NestedPayload {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}

class ValidationPayload {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => NestedPayload)
  nested!: NestedPayload;
}

@Public()
@Controller("_test")
class PhaseTwoTestController {
  @Post("validate")
  validate(@Body() body: ValidationPayload): ValidationPayload {
    return body;
  }

  @Get("unknown-error")
  unknownError(): never {
    throw new Error("sensitive-test-marker");
  }

  @Get("http-500")
  http500(): never {
    throw new InternalServerErrorException("sensitive-test-marker");
  }

  @Get("custom-error")
  customError(): never {
    throw new ApiException(409, "TEST_CONFLICT", "Stable public message.");
  }

  @Get("limited")
  @Throttle({ default: { limit: 2, ttl: 60_000, blockDuration: 60_000 } })
  limited(): { ok: true } {
    return { ok: true };
  }
}

@Module({ imports: [AppModule], controllers: [PhaseTwoTestController] })
class PhaseTwoTestModule {}

type JsonRecord = Record<string, unknown>;

function responseBody(response: SupertestResponse): JsonRecord {
  return JSON.parse(response.text) as JsonRecord;
}

function recordValue(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Expected a JSON object.");
  return value as JsonRecord;
}

function arrayValue(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected a JSON array.");
  return value;
}

describe("Phase 2 HTTP and infrastructure", () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await NestFactory.create(PhaseTwoTestModule, {
      logger: false,
      bodyParser: false,
      abortOnError: false,
    });
    configureApplication(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports live status separately from real PostgreSQL, Redis and worker readiness", async () => {
    const live = await request(server).get("/api/v1/health/live").expect(200);
    expect(responseBody(live)).toMatchObject({
      success: true,
      data: { status: "alive" },
    });
    const ready = await request(server).get("/api/v1/health").expect(200);
    expect(responseBody(ready).success).toBe(true);
    expect(recordValue(responseBody(ready).data)).toMatchObject({
      status: "ok",
      checks: {
        postgres: { status: "up" },
        redis: { status: "up" },
        queue: { status: "up" },
      },
    });
  });

  it("returns database and infrastructure configuration without credentials", async () => {
    const response = await request(server).get("/api/v1").expect(200);
    expect(responseBody(response).data).toMatchObject({
      application: "NOVA CINEMA (INFINITY)",
      phase: 5,
      status: "running",
      apiPrefix: "/api/v1",
      health: "/api/v1/health",
      docs: "/api/docs",
    });
    expect(JSON.stringify(responseBody(response))).not.toMatch(
      /password|secret|postgresql:\/\//i,
    );
  });

  it("publishes versioned OpenAPI health and error response schemas", async () => {
    const response = await request(server).get("/api/docs-json").expect(200);
    const spec = responseBody(response);
    expect(recordValue(spec.info).version).toBe("v1");
    expect(recordValue(spec.paths)).toHaveProperty("/api/v1/health");
    expect(recordValue(spec.paths)).toHaveProperty("/api/v1/health/live");
    expect(
      recordValue(recordValue(spec.components).securitySchemes).bearer,
    ).toBeDefined();
    expect(recordValue(recordValue(spec.components).schemas)).toHaveProperty(
      "ErrorResponseDto",
    );
    expect(recordValue(spec.paths)).not.toHaveProperty("/api/v1/bookings");
  });

  it("preserves safe caller correlation IDs and adds security headers", async () => {
    const response = await request(server)
      .get("/api/v1")
      .set("x-request-id", "phase2-request_123")
      .expect(200);
    expect(response.headers["x-request-id"]).toBe("phase2-request_123");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("transforms input and validates nested DTO fields without returning submitted values", async () => {
    const valid = await request(server)
      .post("/api/v1/_test/validate")
      .send({ name: "show", nested: { count: "4" } })
      .expect(201);
    expect(
      recordValue(recordValue(responseBody(valid).data).nested).count,
    ).toBe(4);

    const invalid = await request(server)
      .post("/api/v1/_test/validate")
      .send({ name: "private-value", nested: { count: "secret" } })
      .expect(400);
    const invalidBody = responseBody(invalid);
    expect(invalidBody.error).toBe("VALIDATION_ERROR");
    expect(arrayValue(invalidBody.message).join(" ")).toMatch(/integer number/);
    expect(JSON.stringify(invalidBody)).not.toContain("secret");
    expect(JSON.stringify(invalidBody)).not.toContain("private-value");

    const extra = await request(server)
      .post("/api/v1/_test/validate")
      .send({ name: "show", nested: { count: 4 }, isAdmin: true })
      .expect(400);
    expect(responseBody(extra).error).toBe("VALIDATION_ERROR");
  });

  it("normalizes malformed and oversized JSON parser errors", async () => {
    const malformed = await request(server)
      .post("/api/v1/_test/validate")
      .set("Content-Type", "application/json")
      .send('{"name":')
      .expect(400);
    expect(responseBody(malformed).error).toBe("INVALID_JSON");
    expect(responseBody(malformed).message).toBe(
      "Request body must contain valid JSON.",
    );

    const oversized = await request(server)
      .post("/api/v1/_test/validate")
      .send({ name: "x".repeat(110_000), nested: { count: 1 } })
      .expect(413);
    expect(responseBody(oversized).error).toBe("PAYLOAD_TOO_LARGE");
    expect(JSON.stringify(responseBody(oversized))).not.toContain("xxxx");
  });

  it("maps HTTP errors and hides unexpected 500 details", async () => {
    const custom = await request(server)
      .get("/api/v1/_test/custom-error")
      .expect(409);
    expect(responseBody(custom)).toMatchObject({
      success: false,
      error: "TEST_CONFLICT",
      message: "Stable public message.",
    });
    for (const endpoint of ["unknown-error", "http-500"]) {
      const failure = await request(server)
        .get(`/api/v1/_test/${endpoint}`)
        .expect(500);
      expect(responseBody(failure).message).toBe(
        "An unexpected error occurred.",
      );
      expect(JSON.stringify(responseBody(failure))).not.toContain(
        "sensitive-test-marker",
      );
    }
  });

  it("returns safe degraded readiness when a dependency fails and keeps liveness up", async () => {
    jest
      .spyOn(app.get(DatabaseRepository), "ping")
      .mockRejectedValue(new Error("private database diagnostic"));
    const ready = await request(server).get("/api/v1/health").expect(503);
    const readyBody = responseBody(ready);
    expect(readyBody.error).toBe("HEALTH_UNAVAILABLE");
    expect(
      recordValue(recordValue(recordValue(readyBody.details).checks).postgres)
        .status,
    ).toBe("down");
    expect(JSON.stringify(readyBody)).not.toContain(
      "private database diagnostic",
    );
    await request(server).get("/api/v1/health/live").expect(200);
  });

  it("uses Redis for atomic shared rate-limit counters and fails closed", async () => {
    const storage = app.get(RedisThrottlerStorage);
    const key = `atomic-${String(Date.now())}-${String(Math.random())}`;
    const counters = await Promise.all(
      Array.from({ length: 12 }, () =>
        storage.increment(key, 60_000, 4, 0, "test"),
      ),
    );
    expect(counters.filter((entry) => !entry.isBlocked)).toHaveLength(4);
    expect(counters.filter((entry) => entry.isBlocked)).toHaveLength(8);

    jest
      .spyOn(app.get(RedisService), "evaluate")
      .mockRejectedValue(new Error("private Redis diagnostic"));
    await expect(
      storage.increment(`${key}-unavailable`, 1000, 1, 0, "test"),
    ).rejects.toMatchObject({
      status: 503,
      response: {
        error: "RATE_LIMIT_UNAVAILABLE",
        message: "Rate limiting is temporarily unavailable.",
      },
    });
  });

  it("enforces endpoint limits through Redis and returns standard 429 errors", async () => {
    await request(server).get("/api/v1/_test/limited").expect(200);
    await request(server).get("/api/v1/_test/limited").expect(200);
    const blocked = await request(server)
      .get("/api/v1/_test/limited")
      .expect(429);
    expect(responseBody(blocked).error).toBe("RATE_LIMIT_EXCEEDED");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("allows only configured frontend origins", async () => {
    await request(server)
      .get("/api/v1")
      .set("Origin", "http://localhost:3000")
      .expect("Access-Control-Allow-Origin", "http://localhost:3000")
      .expect(200);
    const denied = await request(server)
      .get("/api/v1")
      .set("Origin", "https://unlisted.example")
      .expect(200);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
