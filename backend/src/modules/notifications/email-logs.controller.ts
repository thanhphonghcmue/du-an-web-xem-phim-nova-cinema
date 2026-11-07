import { Controller, Get, Header, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CatalogWrite } from "../../common/decorators/catalog.decorator";
import { EmailLogsService } from "./email-logs.service";
@ApiTags("Admin Email Logs")
@Controller("admin/email-logs")
export class EmailLogsController {
  constructor(private readonly service: EmailLogsService) {}
  @Get(":id")
  @CatalogWrite()
  @Header("Cache-Control", "no-store")
  preview(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminPreview(id);
  }
}
