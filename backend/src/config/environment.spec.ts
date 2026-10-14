import { ConfigurationError, validateEnvironment } from "./environment";

function validEnvironment(): NodeJS.ProcessEnv {
  return {
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

describe("Phase 2 environment validation", () => {
  it("accepts the required infrastructure configuration without requiring future auth secrets", () => {
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

  it("validates optional JWT settings early when they are configured", () => {
    const shortSecret = validEnvironment();
    shortSecret.JWT_ACCESS_SECRET = "short-secret";
    expect(() => validateEnvironment(shortSecret)).toThrow(
      "JWT_ACCESS_SECRET must contain at least 32 characters when provided.",
    );

    const invalidDuration = validEnvironment();
    invalidDuration.JWT_REFRESH_EXPIRES_IN = "0m";
    expect(() => validateEnvironment(invalidDuration)).toThrow(
      "JWT_REFRESH_EXPIRES_IN must be a positive duration with s/m/h/d suffix.",
    );
  });
});
