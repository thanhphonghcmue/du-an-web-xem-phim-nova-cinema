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
    return next
      .handle()
      .pipe(map((data) => ({ success: true, data: data ?? null, message })));
  }
}
