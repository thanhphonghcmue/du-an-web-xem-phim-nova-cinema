import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { mergeMap, Observable } from "rxjs";
import { ProgrammeSnapshotService } from "./programme-snapshot.service";

@Injectable()
export class ProgrammeInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger("ProgrammeCache");
  constructor(private readonly snapshots: ProgrammeSnapshotService) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    if (
      !["POST", "PATCH", "DELETE"].includes(request.method) ||
      !/^\/api\/v1\/(movies|cinemas|rooms|seats|combos|showtimes)(\/|$)/.test(
        request.path,
      )
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result) => {
        try {
          // Controller/service has committed successfully before publishing invalidation.
          await this.snapshots.invalidate();
        } catch {
          // Do not turn an already-committed Admin write into a failed/replayed request.
          // Thirty-second pointer TTL still bounds staleness if Redis is temporarily unavailable.
          this.logger.warn(
            "Catalogue cache invalidation deferred; snapshot reuse expires within 30 seconds.",
          );
        }
        return result;
      }),
    );
  }
}
