import "reflect-metadata";
import {
  BadRequestException,
  INestApplication,
  Logger,
  NestApplicationOptions,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { json, NextFunction, Response, urlencoded } from "express";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";
import { AppSettings } from "./config/app.config";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { RequestContext } from "./common/utils/request-context";
import {
  ErrorResponseDto,
  SuccessResponseDto,
} from "./common/dto/api-response.dto";
import { ValidationError } from "class-validator";
import { SeatSocketAdapter } from "./realtime/seat-socket.adapter";
import { SeatSocketPolicy } from "./realtime/seat-socket-policy.service";

function validationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints || {}),
    ...validationMessages(error.children || []),
  ]);
}

export function configureApplication(app: INestApplication): void {
  const settings = app.get(ConfigService).getOrThrow<AppSettings>("app");
  const logger = new Logger("HTTP");
  app.use((request: RequestContext, response: Response, next: NextFunction) => {
    const header = request.header("x-request-id");
    request.correlationId =
      header && /^[a-zA-Z0-9_-]{1,64}$/.test(header) ? header : randomUUID();
    response.setHeader("x-request-id", request.correlationId);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("x-nova-backend", "postgres");
    const started = Date.now();
    logger.log(
      `START ${request.method} ${request.path} id=${request.correlationId}`,
    );
    response.once("finish", () => {
      logger.log(
        `${request.method} ${request.path} ${String(response.statusCode)} ${String(Date.now() - started)}ms id=${request.correlationId || "unknown"}`,
      );
    });
    next();
  });
  app.use(helmet());
  // Compress public read-only catalogue/seat JSON, never authentication tokens or SSE.
  app.use(
    compression({
      threshold: 1024,
      level: 4,
      filter: (request, response) =>
        ["GET", "HEAD"].includes(request.method) &&
        /^\/api\/v1\/(movies|cinemas|rooms|combos|showtimes)(\/|$)/.test(
          request.path,
        ) &&
        compression.filter(request, response),
    }),
  );
  app.use(json({ limit: "100kb" }));
  app.use(urlencoded({ extended: true, limit: "100kb" }));
  app.use(
    (
      exception: unknown,
      request: RequestContext,
      response: Response,
      next: NextFunction,
    ) => {
      if (!isBodyParserError(exception)) {
        next(exception);
        return;
      }
      const tooLarge = exception.type === "entity.too.large";
      const statusCode = tooLarge ? 413 : 400;
      response.status(statusCode).json({
        success: false,
        statusCode,
        error: tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON",
        message: tooLarge
          ? "Request body is too large."
          : "Request body must contain valid JSON.",
        timestamp: new Date().toISOString(),
        path: request.path,
        requestId: request.correlationId,
      });
    },
  );
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: settings.corsOrigins,
    credentials: false,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["x-request-id"],
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
      exceptionFactory: (errors) =>
        new BadRequestException(validationMessages(errors)),
    }),
  );
  const swagger = new DocumentBuilder()
    .setTitle("NOVA Cinema API")
    .setVersion("v1")
    .setDescription(
      "Phase 10: ADMIN-only revenue report for PAID booking creation dates in Vietnam, optional cinema/movie filters and exact Decimal snapshot aggregates. Booking/payment/realtime/ticket/email/staff APIs are available.",
    )
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swagger, {
    extraModels: [SuccessResponseDto, ErrorResponseDto],
  });
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
    swaggerOptions: { persistAuthorization: false },
  });
  app.enableShutdownHooks();
  app.useWebSocketAdapter(
    new SeatSocketAdapter(app, app.get(SeatSocketPolicy)),
  );
}
export async function createApplication(
  options: NestApplicationOptions = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    ...options,
    bodyParser: false,
    abortOnError: false,
  });
  configureApplication(app);
  return app;
}

function isBodyParserError(
  exception: unknown,
): exception is { type: "entity.parse.failed" | "entity.too.large" } {
  return (
    typeof exception === "object" &&
    exception !== null &&
    "type" in exception &&
    (exception.type === "entity.parse.failed" ||
      exception.type === "entity.too.large")
  );
}
