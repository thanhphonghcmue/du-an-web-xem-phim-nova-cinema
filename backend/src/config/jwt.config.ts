import { registerAs } from "@nestjs/config";
import { durationSetting, requiredSecret } from "./environment";
export interface JwtSettings {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}
export default registerAs("jwt", (): JwtSettings => ({
  accessSecret: requiredSecret(process.env, "JWT_ACCESS_SECRET"),
  refreshSecret: requiredSecret(process.env, "JWT_REFRESH_SECRET"),
  accessTtlSeconds: durationSetting(
    process.env,
    "JWT_ACCESS_EXPIRES_IN",
    "15m",
    3600,
  ),
  refreshTtlSeconds: durationSetting(
    process.env,
    "JWT_REFRESH_EXPIRES_IN",
    "7d",
    7776000,
  ),
}));
