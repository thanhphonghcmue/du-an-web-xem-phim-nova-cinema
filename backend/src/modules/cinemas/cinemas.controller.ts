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
  CinemaDto,
  CreateCinemaDto,
  ListCinemasDto,
  UpdateCinemaDto,
} from "./cinema.dto";
import { CinemasService } from "./cinemas.service";
@ApiTags("Cinemas")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller("cinemas")
export class CinemasController {
  constructor(private readonly service: CinemasService) {}
  @Get()
  @Public()
  @ApiPageResponse(CinemaDto)
  list(@Query() query: ListCinemasDto) {
    return this.service.list(query);
  }
  @Get(":id")
  @Public()
  @ApiDataResponse(CinemaDto)
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post()
  @CatalogWrite()
  @ApiDataResponse(CinemaDto, 201)
  create(@Body() dto: CreateCinemaDto) {
    return this.service.create(dto);
  }
  @Patch(":id")
  @CatalogWrite()
  @ApiDataResponse(CinemaDto)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCinemaDto) {
    return this.service.update(id, dto);
  }
  @Delete(":id")
  @HttpCode(200)
  @CatalogWrite()
  @ApiDataResponse(DeletedDto)
  delete(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
