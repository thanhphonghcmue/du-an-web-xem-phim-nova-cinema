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
  RoomDto,
  CreateRoomDto,
  ListRoomsDto,
  RoomFiltersDto,
  UpdateRoomDto,
} from "./room.dto";
import { RoomsService } from "./rooms.service";
@ApiTags("Rooms")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller()
export class RoomsController {
  constructor(private readonly service: RoomsService) {}
  @Get("rooms")
  @Public()
  @ApiPageResponse(RoomDto)
  list(@Query() query: ListRoomsDto) {
    return this.service.list(query);
  }
  @Get("cinemas/:cinemaId/rooms")
  @Public()
  @ApiPageResponse(RoomDto)
  forCinema(
    @Param("cinemaId", ParseUUIDPipe) cinemaId: string,
    @Query() query: RoomFiltersDto,
  ) {
    return this.service.listForCinema(cinemaId, query);
  }
  @Get("rooms/:id")
  @Public()
  @ApiDataResponse(RoomDto)
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post("rooms")
  @CatalogWrite()
  @ApiDataResponse(RoomDto, 201)
  create(@Body() dto: CreateRoomDto) {
    return this.service.create(dto);
  }
  @Patch("rooms/:id")
  @CatalogWrite()
  @ApiDataResponse(RoomDto)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(id, dto);
  }
  @Delete("rooms/:id")
  @HttpCode(200)
  @CatalogWrite()
  @ApiDataResponse(DeletedDto)
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
