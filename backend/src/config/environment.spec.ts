import { randomBytes } from "node:crypto";
import { ConfigurationError, validateEnvironment } from "./environment";

function validEnvironment(): NodeJS.ProcessEnv {
  return {
    PAYMENT_SANDBOX_SECRET: randomBytes(48).toString("hex"),
    JWT_ACCESS_SECRET: randomBytes(48).toString("hex"),
    JWT_REFRESH_SECRET: randomBytes(48).toString("hex"),
    DATABASE_URL: "postgresql://nova:secret@127.0.0.1:55432/nova_development",
    PORT: "4100",
    REDIS_HOST: "127.0.0.1",
    REDIS_PORT: "6380",
    REDIS_DB: "0",
    HEALTH_TIMEOUT_MS: "1200",
    RATE_LIMIT_TTL_MS: "60000",
    RATE_LIMIT_MAX: "60",
    BULLMQ_PREFIX: "nova:development",
    REDIS_TLS: "false",
  };
}

describe("Phase 3 environment validation", () => {
  it("requires an independent payment key and validates public/return origins without leaking values", () => {
    const missing = validEnvironment();
    delete missing.PAYMENT_SANDBOX_SECRET;
    expect(() => validateEnvironment(missing)).toThrow(
      "PAYMENT_SANDBOX_SECRET must contain at least 32 characters.",
    );
    const shared = validEnvironment();
    shared.PAYMENT_SANDBOX_SECRET = shared.JWT_ACCESS_SECRET;
    expect(() => validateEnvironment(shared)).toThrow(
      "Payment and JWT secrets must be different.",
    );
    for (const value of [
      "https://user:password@example.test",
      "http://example.test",
      "https://example.test/path",
      "https://example.test/",
    ]) {
      const environment = validEnvironment();
      environment.PAYMENT_SANDBOX_BASE_URL = value;
      expect(() => validateEnvironment(environment)).toThrow(
        "PAYMENT_SANDBOX_BASE_URL must contain HTTPS origins or local HTTP origins without paths or credentials.",
      );
    }
    const environment = validEnvironment();
    environment.PAYMENT_SANDBOX_BASE_URL = "https://sandbox.example.test";
    environment.PAYMENT_RETURN_ORIGINS =
      "https://app.example.test,http://localhost:3000";
    expect(validateEnvironment(environment)).toBe(environment);
  });
  it("accepts the required infrastructure configuration with independent auth secrets", () => {
    const environment = validEnvironment();
    expect(validateEnvironment(environment)).toBe(environment);
  });

  it("rejects missing or malformed PostgreSQL URLs without including their value", () => {
    const missing = validEnvironment();
    delete missing.DATABASE_URL;
    expect(() => validateEnvironment(missing)).toThrow(
      "DATABASE_URL is required.",
    );

    const malformed = validEnvironment();
    malformed.DATABASE_URL =
      "postgresql://private-user:private-password/not-a-host";
    expect(() => validateEnvironment(malformed)).toThrow(
      "DATABASE_URL must be a valid PostgreSQL connection URL.",
    );
  });

  it("bounds numeric settings and validates Redis TLS and worker prefixes", () => {
    const invalidNumericSettings: Array<[string, string]> = [
      ["REDIS_PORT", "70000"],
      ["REDIS_DB", "16"],
      ["HEALTH_TIMEOUT_MS", "25"],
      ["RATE_LIMIT_MAX", "0"],
    ];
    for (const [key, value] of invalidNumericSettings) {
      const environment = validEnvironment();
      environment[key] = value;
      expect(() => validateEnvironment(environment)).toThrow(
        ConfigurationError,
      );
    }

    const badTls = validEnvironment();
    badTls.REDIS_TLS = "yes";
    expect(() => validateEnvironment(badTls)).toThrow(
      "REDIS_TLS must be true or false.",
    );

    const badPrefix = validEnvironment();
    badPrefix.BULLMQ_PREFIX = "prefix with spaces";
    expect(() => validateEnvironment(badPrefix)).toThrow(
      "BULLMQ_PREFIX is invalid.",
    );
  });

  it("requires valid JWT settings before starting", () => {
    const shortSecret = validEnvironment();
    shortSecret.JWT_ACCESS_SECRET = "short-secret";
    expect(() => validateEnvironment(shortSecret)).toThrow(
      "JWT_ACCESS_SECRET must contain at least 32 characters.",
    );

    const invalidDuration = validEnvironment();
    invalidDuration.JWT_REFRESH_EXPIRES_IN = "0m";
    expect(() => validateEnvironment(invalidDuration)).toThrow(
      "JWT_REFRESH_EXPIRES_IN must be a positive duration with s/m/h/d suffix.",
    );
  });
  it("rejects missing and shared signing secrets", () => {
    const missing = validEnvironment();
    delete missing.JWT_ACCESS_SECRET;
    expect(() => validateEnvironment(missing)).toThrow(
      "JWT_ACCESS_SECRET must contain at least 32 characters.",
    );
    const shared = validEnvironment();
    shared.JWT_REFRESH_SECRET = shared.JWT_ACCESS_SECRET;
    expect(() => validateEnvironment(shared)).toThrow(
      "JWT access and refresh secrets must be different.",
    );
  });
  it("bounds token lifetimes and keeps refresh longer than access", () => {
    const longAccess = validEnvironment();
    longAccess.JWT_ACCESS_EXPIRES_IN = "2h";
    expect(() => validateEnvironment(longAccess)).toThrow(
      "JWT_ACCESS_EXPIRES_IN exceeds its allowed lifetime.",
    );
    const longRefresh = validEnvironment();
    longRefresh.JWT_REFRESH_EXPIRES_IN = "91d";
    expect(() => validateEnvironment(longRefresh)).toThrow(
      "JWT_REFRESH_EXPIRES_IN exceeds its allowed lifetime.",
    );
    const shortRefresh = validEnvironment();
    shortRefresh.JWT_REFRESH_EXPIRES_IN = "1m";
    expect(() => validateEnvironment(shortRefresh)).toThrow(
      "Refresh lifetime must exceed access lifetime.",
    );
  });
});
