import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DatabaseRepository } from "./database.repository";
@Global()
@Module({
  providers: [PrismaService, DatabaseRepository],
  exports: [PrismaService, DatabaseRepository],
})
export class PrismaModule {}
