import "reflect-metadata";
import { INestApplication, NestApplicationOptions } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { readBootstrapConfig } from "./config/bootstrap.config";

export async function createApplication(
  options: NestApplicationOptions = {},
): Promise<INestApplication> {
  const config = readBootstrapConfig(process.env);
  const app = await NestFactory.create(AppModule, options);
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: config.corsOrigins,
    credentials: false,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  app.enableShutdownHooks();
  return app;
}
