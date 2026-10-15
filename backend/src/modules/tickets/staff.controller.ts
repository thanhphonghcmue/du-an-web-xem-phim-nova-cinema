import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { UserProfileDto } from "../users/dto/user-profile.dto";
import { CheckInDto, TicketDetailsDto } from "./ticket.dto";
import { TicketsService } from "./tickets.service";
@ApiTags("Staff")
@ApiBearerAuth()
@Roles("STAFF", "ADMIN")
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiConflictResponse({ type: ErrorResponseDto })
@Controller("staff")
export class StaffController {
  constructor(private readonly service: TicketsService) {}
  @Post("check-in")
  @HttpCode(200)
  @ApiDataResponse(TicketDetailsDto)
  @ApiOperation({
    summary:
      "STAFF/ADMIN atomic single-use QR check-in within the configured DB-clock window",
  })
  checkIn(@CurrentUser() user: UserProfileDto, @Body() dto: CheckInDto) {
    return this.service.checkIn(dto.ticketHash, user.id);
  }
}
