import { registerAs } from "@nestjs/config";
import { integerSetting } from "./environment";

export interface RedisSettings {
  host: string;
  port: number;
  db: number;
  password: string | undefined;
  username: string | undefined;
  tls: boolean;
  prefix: string;
  url: string | undefined;
}

export default registerAs("redis", (): RedisSettings => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const isTls =
        parsed.protocol === "rediss:" || process.env.REDIS_TLS === "true";
      const port = parsed.port
        ? Number(parsed.port)
        : isTls
          ? 6380
          : 6379;
      const db =
        parsed.pathname && parsed.pathname.length > 1
          ? Number(parsed.pathname.slice(1))
          : 0;
      return {
        host: parsed.hostname,
        port: Number.isSafeInteger(port) && port > 0 ? port : 6379,
        db: Number.isSafeInteger(db) && db >= 0 ? db : 0,
        username: parsed.username
          ? decodeURIComponent(parsed.username)
          : undefined,
        password: parsed.password
          ? decodeURIComponent(parsed.password)
          : undefined,
        tls: isTls,
        prefix: process.env.BULLMQ_PREFIX || "nova:development",
        url: redisUrl,
      };
    } catch {
      // Fall through to host/port settings
    }
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: integerSetting(process.env, "REDIS_PORT", 6380, 1, 65535),
    db: integerSetting(process.env, "REDIS_DB", 0, 0, 15),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === "true",
    prefix: process.env.BULLMQ_PREFIX || "nova:development",
    url: undefined,
  };
});
