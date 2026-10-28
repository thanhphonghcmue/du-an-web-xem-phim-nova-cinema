import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Header,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { MembershipDto, UserProfileDto } from "./dto/user-profile.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { AccountStatusDto } from "./dto/account-status.dto";
@ApiTags("Users")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Patch(":id/status")
  @Roles("ADMIN")
  @Header("Cache-Control", "no-store")
  status(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AccountStatusDto,
    @CurrentUser() user: UserProfileDto,
  ) {
    return this.users.changeStatus(id, dto.status, user.id);
  }
  @Get("me")
  @ApiDataResponse(UserProfileDto)
  me(@CurrentUser() user: UserProfileDto): UserProfileDto {
    return user;
  }
  @Patch("me")
  @ApiDataResponse(UserProfileDto)
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: UserProfileDto,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.users.updateProfile(user.id, dto);
  }
  @Get("me/membership")
  @ApiDataResponse(MembershipDto)
  membership(@CurrentUser() user: UserProfileDto): MembershipDto {
    return this.users.membership(user);
  }
}
