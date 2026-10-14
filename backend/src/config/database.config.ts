import { registerAs } from "@nestjs/config";
export interface DatabaseSettings {
  url: string;
}
export default registerAs("database", (): DatabaseSettings => ({
  url: process.env.DATABASE_URL || "",
}));
