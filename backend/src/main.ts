import "dotenv/config";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createApplication } from "./bootstrap";
import { AppSettings } from "./config/app.config";
async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const config = app.get(ConfigService).getOrThrow<AppSettings>("app");
  try {
    await app.listen(config.port, config.host);
  } catch {
    await app.close();
    throw new Error("Backend startup failed.");
  }
  Logger.log(
    `NOVA backend Phase 10 listening on port ${String(config.port)}`,
    "Bootstrap",
  );
}
bootstrap().catch(() => {
  Logger.error(
    "Unable to start backend. Verify environment configuration and PostgreSQL/Redis availability.",
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
