import {
  Body,
  Delete,
  Header,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Put,
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
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import {
  ComboDto,
  CreateComboDto,
  UpdateComboDto,
  ComboStatusDto,
} from "./combo.dto";
import { CombosService } from "./combos.service";
@ApiTags("Combos")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller("combos")
export class CombosController {
  constructor(private readonly service: CombosService) {}
  @Get()
  @Header("Cache-Control", "no-store")
  @Public()
  @ApiPageResponse(ComboDto)
  list(@Query() query: PaginationDto) {
    return this.service.list(query);
  }
  @Post() @CatalogWrite() @ApiDataResponse(ComboDto, 201) create(
    @Body() dto: CreateComboDto,
  ) {
    return this.service.create(dto);
  }
  @Patch(":id") @CatalogWrite() @ApiDataResponse(ComboDto) update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateComboDto,
  ) {
    return this.service.update(id, dto);
  }
}

@ApiTags("Admin Combos")
@Controller("admin/combos")
export class AdminCombosController {
  constructor(private readonly service: CombosService) {}
  @Delete(":id")
  @CatalogWrite()
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
  @Get() @Header("Cache-Control", "no-store") @CatalogWrite() list(
    @Query() query: PaginationDto,
  ) {
    return this.service.list(query, true);
  }
  @Post() @CatalogWrite() create(@Body() dto: CreateComboDto) {
    return this.service.create(dto);
  }
  @Put(":id") @CatalogWrite() update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateComboDto,
  ) {
    return this.service.update(id, dto);
  }
  @Patch(":id/status")
  @CatalogWrite()
  status(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ComboStatusDto) {
    return dto.isActive === undefined
      ? this.service.toggle(id)
      : this.service.update(id, { isActive: dto.isActive });
  }
  @Patch(":id/toggle-status") @CatalogWrite() toggle(
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.toggle(id);
  }
}
