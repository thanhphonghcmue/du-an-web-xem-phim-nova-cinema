import { Controller, Get } from "@nestjs/common";
import { AppService, BootstrapInfo } from "./app.service";

interface BootstrapResponse {
  success: true;
  data: BootstrapInfo;
  message: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getBootstrap(): BootstrapResponse {
    return {
      success: true,
      data: this.appService.getBootstrapInfo(),
      message: "NOVA Cinema backend bootstrap is running.",
    };
  }
}
