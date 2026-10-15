import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import {
  ApiPageResponse,
  CatalogWrite,
} from "../../common/decorators/catalog.decorator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { DeletedDto } from "../../common/dto/pagination.dto";
import {
  CreateShowtimeDto,
  ListShowtimesDto,
  ShowtimeDto,
  UpdateShowtimeDto,
} from "./showtime.dto";
import { ShowtimesService } from "./showtimes.service";

@ApiTags("Showtimes")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller("showtimes")
export class ShowtimesController {
  constructor(private readonly service: ShowtimesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary:
      "List upcoming showtimes, or a full Vietnam calendar day when date is specified",
  })
  @ApiPageResponse(ShowtimeDto)
  list(@Query() query: ListShowtimesDto) {
    return this.service.list(query);
  }

  @Get(":id")
  @Public()
  @ApiDataResponse(ShowtimeDto)
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  @CatalogWrite()
  @ApiOperation({
    summary:
      "ADMIN: create schedule; endTime includes movie duration and 15-minute cleaning; overlaps return SHOWTIME_CONFLICT",
  })
  @ApiDataResponse(ShowtimeDto, 201)
  create(@Body() dto: CreateShowtimeDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @CatalogWrite()
  @ApiOperation({
    summary:
      "ADMIN: update unbooked schedule; exclude self when checking overlap",
  })
  @ApiDataResponse(ShowtimeDto)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateShowtimeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  @CatalogWrite()
  @ApiOperation({
    summary: "ADMIN: delete only showtimes without booking history",
  })
  @ApiDataResponse(DeletedDto)
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
