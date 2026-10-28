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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UserProfileDto } from "../users/dto/user-profile.dto";
import { Public } from "../../common/decorators/public.decorator";
import {
  CatalogWrite,
  ApiPageResponse,
} from "../../common/decorators/catalog.decorator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { DeletedDto } from "../../common/dto/pagination.dto";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import {
  MovieDto,
  CreateMovieDto,
  ListMoviesDto,
  UpdateMovieDto,
} from "./movie.dto";
import { MoviesService } from "./movies.service";
@ApiTags("Movies")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller("movies")
export class MoviesController {
  constructor(private readonly service: MoviesService) {}
  @Get()
  @Public()
  @ApiPageResponse(MovieDto)
  list(@Query() query: ListMoviesDto) {
    return this.service.list(query);
  }
  @Get(":id")
  @Public()
  @ApiDataResponse(MovieDto)
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post()
  @CatalogWrite()
  @ApiDataResponse(MovieDto, 201)
  create(@Body() dto: CreateMovieDto, @CurrentUser() actor: UserProfileDto) {
    return this.service.create(dto, actor.id);
  }
  @Patch(":id")
  @CatalogWrite()
  @ApiDataResponse(MovieDto)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMovieDto,
    @CurrentUser() actor: UserProfileDto,
  ) {
    return this.service.update(id, dto, actor.id);
  }
  @Delete(":id")
  @HttpCode(200)
  @CatalogWrite()
  @ApiDataResponse(DeletedDto)
  delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: UserProfileDto,
  ) {
    return this.service.delete(id, actor.id);
  }
}
