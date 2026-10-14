import "dotenv/config";
import { Logger } from "@nestjs/common";
import { createApplication } from "./bootstrap";
import { readBootstrapConfig } from "./config/bootstrap.config";

async function bootstrap(): Promise<void> {
  const config = readBootstrapConfig(process.env);
  const app = await createApplication();
  await app.listen(config.port, config.host);
  Logger.log(
    `NOVA backend Phase 0 listening on port ${String(config.port)}`,
    "Bootstrap",
  );
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : "Backend startup failed.",
    undefined,
    "Bootstrap",
  );
  process.exitCode = 1;
});
