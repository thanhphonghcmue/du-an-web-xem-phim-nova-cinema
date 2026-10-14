import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { DatabaseSettings } from "../config/database.config";
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    super({
      datasourceUrl: config.getOrThrow<DatabaseSettings>("database").url,
      log: [],
    });
  }
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch {
      throw new Error("PostgreSQL connection failed.");
    }
  }
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
