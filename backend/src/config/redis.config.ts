import { registerAs } from "@nestjs/config";
import { integerSetting } from "./environment";
export interface RedisSettings {
  host: string;
  port: number;
  db: number;
  password: string | undefined;
  tls: boolean;
  prefix: string;
}
export default registerAs("redis", (): RedisSettings => ({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: integerSetting(process.env, "REDIS_PORT", 6380, 1, 65535),
  db: integerSetting(process.env, "REDIS_DB", 0, 0, 15),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === "true",
  prefix: process.env.BULLMQ_PREFIX || "nova:development",
}));
