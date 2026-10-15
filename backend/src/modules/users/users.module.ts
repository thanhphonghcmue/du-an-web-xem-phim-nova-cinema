import { Module } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";
import { DiscountService } from "./discount.service";
import { UsersController } from "./users.controller";
@Module({
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, DiscountService],
  exports: [UsersRepository, UsersService, DiscountService],
})
export class UsersModule {}
