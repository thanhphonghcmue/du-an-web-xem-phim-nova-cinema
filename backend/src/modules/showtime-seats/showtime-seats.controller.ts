import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import {
  GroupSeatQueryDto,
  GroupSeatSuggestionDto,
  ShowtimeSeatMapDto,
} from "./showtime-seats.dto";
import { ShowtimeSeatsService } from "./showtime-seats.service";
@ApiTags("Showtime seats")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Public()
@Controller("showtimes/:showtimeId")
export class ShowtimeSeatsController {
  constructor(private readonly service: ShowtimeSeatsService) {}
  @Get("seats")
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiDataResponse(ShowtimeSeatMapDto)
  @ApiOperation({
    summary:
      "Public seat map and capacity from one DB snapshot; no booking owner information",
  })
  map(@Param("showtimeId", ParseUUIDPipe) id: string) {
    return this.service.map(id.toLowerCase());
  }
  @Get("group-seat-suggestion")
  @ApiDataResponse(GroupSeatSuggestionDto)
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiOperation({
    summary:
      "Suggest 1–20 available adjacent seats in one row near its center; does not reserve seats",
  })
  suggest(
    @Param("showtimeId", ParseUUIDPipe) id: string,
    @Query() query: GroupSeatQueryDto,
  ) {
    return this.service.suggest(id.toLowerCase(), query);
  }
}
