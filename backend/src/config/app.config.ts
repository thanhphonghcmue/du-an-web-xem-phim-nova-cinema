import { registerAs } from "@nestjs/config";
import { readBootstrapConfig } from "./bootstrap.config";
import { integerSetting } from "./environment";
export interface AppSettings {
  port: number;
  host: string;
  corsOrigins: string[];
  healthTimeoutMs: number;
  rateLimitTtlMs: number;
  rateLimitMax: number;
  environment: string;
}
export default registerAs("app", (): AppSettings => ({
  ...readBootstrapConfig(process.env),
  environment: process.env.NODE_ENV || "development",
  healthTimeoutMs: integerSetting(
    process.env,
    "HEALTH_TIMEOUT_MS",
    2500,
    100,
    10000,
  ),
  rateLimitTtlMs: integerSetting(
    process.env,
    "RATE_LIMIT_TTL_MS",
    60000,
    100,
    3600000,
  ),
  rateLimitMax: integerSetting(process.env, "RATE_LIMIT_MAX", 60, 1, 10000),
}));
