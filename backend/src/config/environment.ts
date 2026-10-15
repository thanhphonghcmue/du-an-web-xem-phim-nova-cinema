import { readBootstrapConfig } from "./bootstrap.config";
import { notificationSettings } from "./notification.settings";
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
    requiredSecret(environment, name);
  if (environment.JWT_ACCESS_SECRET === environment.JWT_REFRESH_SECRET)
    throw new ConfigurationError(
      "JWT access and refresh secrets must be different.",
    );
  const access = durationSetting(
    environment,
    "JWT_ACCESS_EXPIRES_IN",
    "15m",
    3600,
  );
  const refresh = durationSetting(
    environment,
    "JWT_REFRESH_EXPIRES_IN",
    "7d",
    7776000,
  );
  if (refresh <= access)
    throw new ConfigurationError(
      "Refresh lifetime must exceed access lifetime.",
    );
  const paymentSecret = requiredSecret(environment, "PAYMENT_SANDBOX_SECRET");
  if (
    [environment.JWT_ACCESS_SECRET, environment.JWT_REFRESH_SECRET].includes(
      paymentSecret,
    )
  )
    throw new ConfigurationError("Payment and JWT secrets must be different.");
  paymentOrigin(environment);
  paymentReturnOrigins(environment);
  notificationSettings(environment);
  return environment;
}
export function paymentOrigin(environment: NodeJS.ProcessEnv): string {
  return httpOrigin(
    environment.PAYMENT_SANDBOX_BASE_URL ||
      `http://localhost:${environment.PORT || "4000"}`,
    "PAYMENT_SANDBOX_BASE_URL",
  );
}
export function paymentReturnOrigins(environment: NodeJS.ProcessEnv): string[] {
  const values = (
    environment.PAYMENT_RETURN_ORIGINS ||
    "http://localhost:3000,http://127.0.0.1:3000"
  )
    .split(",")
    .map((value) => value.trim());
  return [
    ...new Set(
      values.map((value) => httpOrigin(value, "PAYMENT_RETURN_ORIGINS")),
    ),
  ];
}
function httpOrigin(value: string, name: string): string {
  try {
    const url = new URL(value);
    if (
      value !== url.origin ||
      url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
        ))
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new ConfigurationError(
      `${name} must contain HTTPS origins or local HTTP origins without paths or credentials.`,
    );
  }
}
export function requiredSecret(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = environment[name];
  if (!value || value.length < 32)
    throw new ConfigurationError(
      `${name} must contain at least 32 characters.`,
    );
  return value;
}
export function durationSetting(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: string,
  maximum: number,
): number {
  const value = environment[name] || fallback;
  const match = value.match(/^([1-9]\d*)([smhd])$/);
  if (!match?.[1] || !match[2])
    throw new ConfigurationError(
      `${name} must be a positive duration with s/m/h/d suffix.`,
    );
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const seconds = Number(match[1]) * (units[match[2]] || 0);
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > maximum)
    throw new ConfigurationError(`${name} exceeds its allowed lifetime.`);
  return seconds;
}
