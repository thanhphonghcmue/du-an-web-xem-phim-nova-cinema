import { isEmail } from "class-validator";
export interface NotificationSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string | undefined;
  password: string | undefined;
  from: string;
  timeoutMs: number;
  checkInBeforeMinutes: number;
  checkInAfterMinutes: number;
}
export function notificationSettings(
  environment: NodeJS.ProcessEnv,
): NotificationSettings {
  const host = environment.SMTP_HOST || "127.0.0.1";
  const from = environment.SMTP_FROM || "tickets@nova.local";
  if (!/^[a-zA-Z0-9.:[\]_-]+$/.test(host))
    throw new Error("SMTP_HOST is invalid.");
  if (!isEmail(from, { require_tld: false }) || /[\r\n]/.test(from))
    throw new Error("SMTP_FROM must be a single email address.");
  if (
    environment.SMTP_SECURE &&
    !["true", "false"].includes(environment.SMTP_SECURE)
  )
    throw new Error("SMTP_SECURE must be true or false.");
  if (!!environment.SMTP_USER !== !!environment.SMTP_PASS)
    throw new Error("SMTP_USER and SMTP_PASS must be provided together.");
  return {
    host,
    from,
    port: setting(environment, "SMTP_PORT", 1025, 1, 65535),
    secure: environment.SMTP_SECURE === "true",
    user: environment.SMTP_USER || undefined,
    password: environment.SMTP_PASS || undefined,
    timeoutMs: setting(environment, "SMTP_TIMEOUT_MS", 10000, 100, 10000),
    checkInBeforeMinutes: setting(
      environment,
      "CHECK_IN_BEFORE_MINUTES",
      60,
      0,
      1440,
    ),
    checkInAfterMinutes: setting(
      environment,
      "CHECK_IN_AFTER_MINUTES",
      30,
      0,
      1440,
    ),
  };
}
function setting(
  environment: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = environment[key] || String(fallback);
  const number = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(number) ||
    number < min ||
    number > max
  )
    throw new Error(`${key} is outside its allowed range.`);
  return number;
}
