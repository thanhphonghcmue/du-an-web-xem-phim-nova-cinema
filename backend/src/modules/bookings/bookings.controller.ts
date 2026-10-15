import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { IdempotencyKey } from "../../common/decorators/idempotency-key.decorator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { ApiPageResponse } from "../../common/decorators/catalog.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { UserProfileDto } from "../users/dto/user-profile.dto";
import { BookingDto, HoldSeatsDto, ListBookingsDto } from "./booking.dto";
import { BookingsService } from "./bookings.service";
@ApiTags("Bookings")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiConflictResponse({ type: ErrorResponseDto })
@Controller("bookings")
export class BookingsController {
  constructor(private readonly service: BookingsService) {}
  @Post("hold")
  @ApiDataResponse(BookingDto, 201)
  @ApiOperation({
    summary:
      "Hold 1–20 seats for exactly 5 minutes using server prices; writes booking/snapshots/outbox atomically",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    schema: { type: "string", format: "uuid" },
    description:
      "Per-user UUID. Same normalized body replays the original booking without extending its deadline. Different body returns409.",
  })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  hold(
    @CurrentUser() user: UserProfileDto,
    @Body() dto: HoldSeatsDto,
    @IdempotencyKey(new ParseUUIDPipe({ optional: true }))
    key?: string,
  ) {
    return this.service.hold(user.id, dto, key);
  }
  @Get("me")
  @ApiPageResponse(BookingDto)
  list(@CurrentUser() user: UserProfileDto, @Query() query: ListBookingsDto) {
    return this.service.list(user.id, query);
  }
  @Get(":id")
  @ApiDataResponse(BookingDto)
  get(
    @CurrentUser() user: UserProfileDto,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.get(id, user.id);
  }
  @Post(":id/cancel")
  @HttpCode(200)
  @ApiDataResponse(BookingDto)
  @ApiOperation({
    summary:
      "Cancel own unpaid booking; repeated cancellation is safe; PAID/SOLD cannot be released",
  })
  cancel(
    @CurrentUser() user: UserProfileDto,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(id, user.id);
  }
}
