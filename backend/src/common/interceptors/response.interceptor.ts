import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, Observable } from "rxjs";
import { RESPONSE_MESSAGE } from "../decorators/response-message.decorator";
export interface SuccessResponse {
  success: true;
  data: unknown;
  message: string;
}
@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  unknown,
  SuccessResponse
> {
  constructor(private readonly reflector: Reflector) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<SuccessResponse> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE, [
        context.getHandler(),
        context.getClass(),
      ]) || "Request completed successfully.";
    return next.handle().pipe(
      map((data) => ({
        ...(/^\/api\/v1\/(?:admin\/)?combos$/.test(
          context.switchToHttp().getRequest<{ path: string; method: string }>()
            .path,
        ) &&
        context.switchToHttp().getRequest<{ method: string }>().method ===
          "GET" &&
        data &&
        typeof data === "object" &&
        "items" in data &&
        Array.isArray(data.items)
          ? { combos: data.items as unknown[] }
          : {}),
        ...(data &&
        typeof data === "object" &&
        ("statusType" in data || "found" in data)
          ? data
          : {}),
        success: true,
        data: data ?? null,
        message,
      })),
    );
  }
}
