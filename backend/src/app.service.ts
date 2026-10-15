import { Injectable } from "@nestjs/common";
export interface ApplicationInfo {
  application: string;
  phase: 3;
  status: string;
  apiPrefix: string;
  health: string;
  docs: string;
}
@Injectable()
export class AppService {
  getInfo(): ApplicationInfo {
    return {
      application: "NOVA CINEMA (INFINITY)",
      phase: 3,
      status: "running",
      apiPrefix: "/api/v1",
      health: "/api/v1/health",
      docs: "/api/docs",
    };
  }
}
