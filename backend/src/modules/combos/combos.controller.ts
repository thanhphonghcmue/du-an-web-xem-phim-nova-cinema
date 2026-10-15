import {
  Body,
  Controller,
  Get,
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
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ComboDto, CreateComboDto, UpdateComboDto } from "./combo.dto";
import { CombosService } from "./combos.service";
@ApiTags("Combos")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller("combos")
export class CombosController {
  constructor(private readonly service: CombosService) {}
  @Get() @Public() @ApiPageResponse(ComboDto) list(
    @Query() query: PaginationDto,
  ) {
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
