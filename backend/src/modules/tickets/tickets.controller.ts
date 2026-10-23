import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Response } from "express";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { ApiPageResponse } from "../../common/decorators/catalog.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { UserProfileDto } from "../users/dto/user-profile.dto";
import { ListTicketsDto, TicketDto, TicketConfirmationDto } from "./ticket.dto";
import { TicketsService } from "./tickets.service";
@ApiTags("Tickets")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller("tickets")
export class TicketsController {
  constructor(private readonly service: TicketsService) {}
  @Get("me")
  @ApiPageResponse(TicketDto)
  @ApiOperation({
    summary: "Paginated own e-tickets only; QR capabilities must not be shared",
  })
  list(@CurrentUser() user: UserProfileDto, @Query() query: ListTicketsDto) {
    return this.service.list(user.id, query);
  }
  @Get(":id/confirmation")
  @ApiDataResponse(TicketConfirmationDto)
  @ApiOperation({
    summary:
      "Owner-only confirmation email preview and actual outbox delivery state; does not send mail.",
  })
  confirmation(
    @CurrentUser() user: UserProfileDto,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.confirmation(id, user.id);
  }
  @Get(":id/calendar")
  @ApiProduces("text/calendar")
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Download own film calendar event; UTC, stable UID, no ticket hash or PII",
  })
  async calendar(
    @CurrentUser() user: UserProfileDto,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const body = await this.service.calendar(id, user.id);
    response
      .type("text/calendar; charset=utf-8")
      .set("Content-Disposition", `attachment; filename="nova-${id}.ics"`)
      .send(body);
  }
  @Get(":id")
  @ApiDataResponse(TicketDto)
  @ApiOperation({
    summary: "Read own ticket/QR; nonowner including ADMIN returns404",
  })
  get(
    @CurrentUser() user: UserProfileDto,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.get(id, user.id);
  }
}
