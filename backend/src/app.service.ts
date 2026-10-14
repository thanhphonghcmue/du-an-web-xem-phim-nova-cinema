import { Injectable } from "@nestjs/common";

export interface BootstrapInfo {
  application: "NOVA CINEMA (INFINITY)";
  phase: 0;
  status: "bootstrap-ready";
  apiPrefix: "/api/v1";
  database: "not-configured";
  redis: "not-configured";
}

@Injectable()
export class AppService {
  getBootstrapInfo(): BootstrapInfo {
    return {
      application: "NOVA CINEMA (INFINITY)",
      phase: 0,
      status: "bootstrap-ready",
      apiPrefix: "/api/v1",
      database: "not-configured",
      redis: "not-configured",
    };
  }
}
