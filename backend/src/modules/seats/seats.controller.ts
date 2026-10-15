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
  ApiTags,
} from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import {
  CatalogWrite,
  ApiPageResponse,
} from "../../common/decorators/catalog.decorator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { DeletedDto } from "../../common/dto/pagination.dto";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import {
  CreateSeatDto,
  GenerateSeatsDto,
  GeneratedSeatsDto,
  ListSeatsDto,
  SeatDto,
  UpdateSeatDto,
} from "./seat.dto";
import { SeatsService } from "./seats.service";
@ApiTags("Seats")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller()
export class SeatsController {
  constructor(private readonly service: SeatsService) {}
  @Get("rooms/:roomId/seats")
  @Public()
  @ApiPageResponse(SeatDto)
  list(
    @Param("roomId", ParseUUIDPipe) roomId: string,
    @Query() query: ListSeatsDto,
  ) {
    return this.service.list(roomId, query);
  }
  @Get("seats/:id")
  @Public()
  @ApiDataResponse(SeatDto)
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post("rooms/:roomId/seats")
  @CatalogWrite()
  @ApiDataResponse(SeatDto, 201)
  create(
    @Param("roomId", ParseUUIDPipe) roomId: string,
    @Body() dto: CreateSeatDto,
  ) {
    return this.service.create(roomId, dto);
  }
  @Post("rooms/:roomId/seats/generate")
  @CatalogWrite()
  @ApiDataResponse(GeneratedSeatsDto, 201)
  generate(
    @Param("roomId", ParseUUIDPipe) roomId: string,
    @Body() dto: GenerateSeatsDto,
  ) {
    return this.service.generate(roomId, dto);
  }
  @Patch("seats/:id")
  @CatalogWrite()
  @ApiDataResponse(SeatDto)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateSeatDto) {
    return this.service.update(id, dto);
  }
  @Delete("seats/:id")
  @HttpCode(200)
  @CatalogWrite()
  @ApiDataResponse(DeletedDto)
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
