import { registerAs } from "@nestjs/config";
export interface JwtSettings {
  accessSecret: string | undefined;
  refreshSecret: string | undefined;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}
export default registerAs("jwt", (): JwtSettings => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || undefined,
  refreshSecret: process.env.JWT_REFRESH_SECRET || undefined,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
}));
