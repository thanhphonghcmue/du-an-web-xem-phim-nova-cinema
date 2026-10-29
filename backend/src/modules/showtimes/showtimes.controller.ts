import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  ParseIntPipe,
  Res,
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
  ShowtimeCapacityQueryDto,
  ShowtimeCapacityDto,
  CreateShowtimeDto,
  ProgrammeDto,
  ProgrammeQueryDto,
  ListShowtimesDto,
  ShowtimeDto,
  UpdateShowtimeDto,
} from "./showtime.dto";
import { ShowtimesService } from "./showtimes.service";
import { ProgrammeSnapshotService } from "./programme-snapshot.service";
import { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { programmeChunkKey } from "./programme-throttle";

@ApiTags("Showtimes")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller("showtimes")
export class ShowtimesController {
  constructor(
    private readonly service: ShowtimesService,
    private readonly snapshots: ProgrammeSnapshotService,
  ) {}

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

  @Get("programme")
  @Public()
  @ApiOperation({
    summary:
      "Public catalogue snapshot plus future schedule, bounded to 60 days/20000 screenings; never silently truncated.",
  })
  @ApiDataResponse(ProgrammeDto)
  programme(@Query() query: ProgrammeQueryDto) {
    return this.snapshots.legacy(query.days);
  }

  @Get("programme/manifest")
  @Public()
  @ApiOperation({
    summary:
      "Lossless columnar catalogue manifest; shared immutable snapshot, 30-second reuse and 120-second retention.",
  })
  manifest(@Query() query: ProgrammeQueryDto) {
    return this.snapshots.manifest(query.days);
  }

  @Get("programme/chunks/:snapshotId/:index")
  @Public()
  @Throttle({ default: { generateKey: programmeChunkKey } })
  @ApiOperation({
    summary:
      "Read an immutable snapshot chunk; complete JSON envelope is below 15 KiB; 410 asks clients to restart the manifest.",
  })
  async chunk(
    @Param("snapshotId", ParseUUIDPipe) snapshotId: string,
    @Param("index", ParseIntPipe) index: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { chunk, expiresAt } = await this.snapshots.chunk(snapshotId, index);
    const remaining = Math.max(
      0,
      Math.floor((Date.parse(expiresAt) - Date.now()) / 1000),
    );
    response.setHeader("x-nova-snapshot-expires-at", expiresAt);
    response.setHeader(
      "Cache-Control",
      `private, max-age=${String(remaining)}, immutable`,
    );
    return chunk;
  }

  @Get("capacities")
  @Public()
  @ApiOperation({
    summary:
      "Read real remaining/total capacity for 1–50 visible showtimes, without loading seat maps.",
  })
  @ApiDataResponse(ShowtimeCapacityDto, 200, true)
  capacities(@Query() query: ShowtimeCapacityQueryDto) {
    return this.service.capacities(query.ids);
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
