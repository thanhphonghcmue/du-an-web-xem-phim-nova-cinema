import { Controller, Get } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { ResponseMessage } from "../common/decorators/response-message.decorator";
import {
  ErrorResponseDto,
  SuccessResponseDto,
} from "../common/dto/api-response.dto";
import { HealthDto } from "./health.dto";
import { HealthService } from "./health.service";
@SkipThrottle()
@ApiTags("Health")
@ApiExtraModels(HealthDto, SuccessResponseDto, ErrorResponseDto)
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  @ResponseMessage("Infrastructure is ready.")
  @ApiOkResponse({
    description:
      "PostgreSQL SELECT 1, Redis PING and a completed BullMQ worker job.",
    schema: {
      allOf: [
        { $ref: getSchemaPath(SuccessResponseDto) },
        { properties: { data: { $ref: getSchemaPath(HealthDto) } } },
      ],
    },
  })
  @ApiServiceUnavailableResponse({
    type: ErrorResponseDto,
    description: "HEALTH_UNAVAILABLE, with safe component statuses.",
  })
  readiness(): Promise<HealthDto> {
    return this.health.readiness();
  }
  @Get("live")
  @ResponseMessage("Application is alive.")
  @ApiOkResponse({ type: SuccessResponseDto })
  liveness(): { status: string; timestamp: string } {
    return this.health.liveness();
  }
}
