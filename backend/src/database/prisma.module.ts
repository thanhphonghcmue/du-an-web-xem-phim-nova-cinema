import { UnitOfWork } from "./unit-of-work";
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DatabaseRepository } from "./database.repository";
@Global()
@Module({
  providers: [UnitOfWork, PrismaService, DatabaseRepository],
  exports: [UnitOfWork, PrismaService, DatabaseRepository],
})
export class PrismaModule {}
