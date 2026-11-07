import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CatalogWrite } from "../../common/decorators/catalog.decorator";
import { AdminBookingsService } from "./admin-bookings.service";
import { AdminBookingsQueryDto } from "./admin-bookings.dto";
@ApiTags("Admin Bookings")
@Controller("admin/bookings")
export class AdminBookingsController {
  constructor(private readonly service: AdminBookingsService) {}
  @Get()
  @CatalogWrite()
  @Header("Cache-Control", "no-store")
  list(@Query() query: AdminBookingsQueryDto) {
    return this.service.list(query);
  }
  @Get(":id")
  @CatalogWrite()
  @Header("Cache-Control", "no-store")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
}
