import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import { ApiException } from "../exceptions/api.exception";
import { publicErrorMessages } from "./public-error-messages";
import { RequestContext } from "../utils/request-context";
interface ErrorPayload {
  error?: unknown;
  message?: unknown;
  details?: unknown;
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("API");
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<RequestContext>();
    const response = host.switchToHttp().getResponse<Response>();
    let statusCode = 500;
    let error = "INTERNAL_ERROR";
    let message: unknown = "An unexpected error occurred.";
    let details: unknown;
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const payload: ErrorPayload =
        typeof body === "object" ? body : { message: body };
      const codes: Record<number, string> = {
        400: "VALIDATION_ERROR",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        429: "RATE_LIMIT_EXCEEDED",
        503: "SERVICE_UNAVAILABLE",
      };
      error =
        typeof payload.error === "string" &&
        /^[A-Z][A-Z0-9_]+$/.test(payload.error)
          ? payload.error
          : codes[statusCode] || "HTTP_ERROR";
      const safeServiceFailure =
        exception instanceof ApiException &&
        (error === "HEALTH_UNAVAILABLE" || error === "RATE_LIMIT_UNAVAILABLE");
      message =
        statusCode >= 500 && !safeServiceFailure
          ? "An unexpected error occurred."
          : payload.message || exception.message;
      // Admission details are explicitly safe and protected by STAFF/ADMIN guards.
      const safeAdmission =
        exception instanceof ApiException &&
        statusCode === 409 &&
        ["TICKET_ALREADY_USED", "TICKET_SHOWTIME_MISMATCH"].includes(error);
      details =
        safeServiceFailure ||
        safeAdmission ||
        (exception instanceof ApiException &&
          statusCode === 409 &&
          error === "SEAT_UNAVAILABLE")
          ? payload.details
          : undefined;
      if (statusCode === 400 && isParserError(exception)) {
        error = "INVALID_JSON";
        message = "Request body must contain valid JSON.";
      }
      if (statusCode === 413 && isParserError(exception)) {
        error = "PAYLOAD_TOO_LARGE";
        message = "Request body is too large.";
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        ["P2024", "P2028"].includes(exception.code) ||
        (exception.code === "P2010" &&
          ["55P03", "57014"].includes(String(exception.meta?.code)))
      ) {
        statusCode = 503;
        error = "DATABASE_BUSY";
        message = "Máy chủ đang bận. Vui lòng thử lại sau giây lát.";
      } else if (exception.code === "P2002") {
        statusCode = 409;
        error = "RESOURCE_CONFLICT";
        message = "The resource already exists.";
      } else if (exception.code === "P2003") {
        statusCode = 409;
        error = "REFERENCE_CONFLICT";
        message = "The resource has conflicting references.";
      } else if (exception.code === "P2025") {
        statusCode = 404;
        error = "RESOURCE_NOT_FOUND";
        message = "The resource was not found.";
      } else if (exception.code === "P2004") {
        statusCode = 409;
        error = "CONSTRAINT_CONFLICT";
        message = "The operation conflicts with a database constraint.";
      }
    }
    if (statusCode < 500 && publicErrorMessages[error])
      message = publicErrorMessages[error];
    if (statusCode >= 500)
      this.logger.error(
        `request=${request.correlationId || "unknown"} error=${error}`,
      );
    response.status(statusCode).json({
      success: false,
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.path,
      requestId: request.correlationId,
      ...(details === undefined ? {} : { details }),
    });
  }
}

function isParserError(exception: unknown): boolean {
  return (
    typeof exception === "object" &&
    exception !== null &&
    "type" in exception &&
    typeof exception.type === "string" &&
    ["entity.parse.failed", "entity.too.large"].includes(exception.type)
  );
}
