import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  CatalogWrite,
  ApiPageResponse,
} from "../../common/decorators/catalog.decorator";
import { AuditLogDto, AuditQueryDto } from "./audit.dto";
import { AuditService } from "./audit.service";
@ApiTags("Admin audit")
@CatalogWrite()
@Controller("admin/audit-logs")
export class AuditController {
  constructor(private readonly audit: AuditService) {}
  @Get()
  @ApiPageResponse(AuditLogDto)
  list(@Query() query: AuditQueryDto) {
    return this.audit.list(query);
  }
}
