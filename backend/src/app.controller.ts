import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AppService, ApplicationInfo } from "./app.service";
import { ResponseMessage } from "./common/decorators/response-message.decorator";
import { SuccessResponseDto } from "./common/dto/api-response.dto";
@ApiTags("Application")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  @ResponseMessage("NOVA Cinema backend is running.")
  @ApiOkResponse({ type: SuccessResponseDto })
  getInfo(): ApplicationInfo {
    return this.appService.getInfo();
  }
}
