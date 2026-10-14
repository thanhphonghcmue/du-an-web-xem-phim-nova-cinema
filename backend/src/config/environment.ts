import { readBootstrapConfig } from "./bootstrap.config";
export class ConfigurationError extends Error {}
export function integerSetting(
  environment: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = environment[key] || String(fallback);
  if (!/^\d+$/.test(value))
    throw new ConfigurationError(`${key} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max)
    throw new ConfigurationError(`${key} is outside its allowed range.`);
  return parsed;
}
export function validateEnvironment(
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  readBootstrapConfig(environment);
  if (
    !["development", "test", "production"].includes(
      environment.NODE_ENV || "development",
    )
  )
    throw new ConfigurationError("NODE_ENV is invalid.");
  const url = environment.DATABASE_URL;
  if (!url) throw new ConfigurationError("DATABASE_URL is required.");
  try {
    const parsed = new URL(url);
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !parsed.hostname ||
      parsed.pathname === "/"
    )
      throw new Error();
  } catch {
    throw new ConfigurationError(
      "DATABASE_URL must be a valid PostgreSQL connection URL.",
    );
  }
  const host = environment.REDIS_HOST || "127.0.0.1";
  if (!/^[a-zA-Z0-9.:[\]_-]+$/.test(host))
    throw new ConfigurationError("REDIS_HOST is invalid.");
  integerSetting(environment, "REDIS_PORT", 6380, 1, 65535);
  integerSetting(environment, "REDIS_DB", 0, 0, 15);
  integerSetting(environment, "HEALTH_TIMEOUT_MS", 2500, 100, 10000);
  integerSetting(environment, "RATE_LIMIT_TTL_MS", 60000, 100, 3600000);
  integerSetting(environment, "RATE_LIMIT_MAX", 60, 1, 10000);
  if (
    environment.REDIS_TLS &&
    !["true", "false"].includes(environment.REDIS_TLS)
  )
    throw new ConfigurationError("REDIS_TLS must be true or false.");
  if (
    !/^[a-zA-Z0-9:_-]{1,64}$/.test(
      environment.BULLMQ_PREFIX || "nova:development",
    )
  )
    throw new ConfigurationError("BULLMQ_PREFIX is invalid.");
  for (const name of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"])
    if (environment[name] && environment[name].length < 32)
      throw new ConfigurationError(
        `${name} must contain at least 32 characters when provided.`,
      );
  for (const name of ["JWT_ACCESS_EXPIRES_IN", "JWT_REFRESH_EXPIRES_IN"])
    if (environment[name] && !/^[1-9]\d*[smhd]$/.test(environment[name] || ""))
      throw new ConfigurationError(
        `${name} must be a positive duration with s/m/h/d suffix.`,
      );
  return environment;
}
