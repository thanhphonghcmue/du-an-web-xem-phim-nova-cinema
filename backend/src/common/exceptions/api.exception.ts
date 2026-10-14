import { HttpException } from "@nestjs/common";
export class ApiException extends HttpException {
  constructor(
    status: number,
    error: string,
    message: string,
    details?: unknown,
  ) {
    super(
      { error, message, ...(details === undefined ? {} : { details }) },
      status,
    );
  }
}
