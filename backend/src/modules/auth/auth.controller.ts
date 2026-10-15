import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { UserProfileDto } from "../users/dto/user-profile.dto";
import {
  AuthSessionDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
} from "./dto/auth.dto";
import { AuthService } from "./auth.service";
@ApiTags("Authentication")
@Public()
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiTooManyRequestsResponse({ type: ErrorResponseDto })
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 60000 } })
  @ApiDataResponse(UserProfileDto, 201)
  @ApiConflictResponse({ type: ErrorResponseDto })
  register(@Body() dto: RegisterDto): Promise<UserProfileDto> {
    return this.auth.register(dto);
  }
  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 60000 } })
  @ApiDataResponse(AuthSessionDto)
  login(@Body() dto: LoginDto): Promise<AuthSessionDto> {
    return this.auth.login(dto);
  }
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60000, blockDuration: 60000 } })
  @ApiDataResponse(AuthSessionDto)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthSessionDto> {
    return this.auth.refresh(dto.refreshToken);
  }
  @Post("logout")
  @HttpCode(200)
  @ApiDataResponse(LogoutDto)
  logout(@Body() dto: RefreshTokenDto): Promise<{ revoked: boolean }> {
    return this.auth.logout(dto.refreshToken);
  }
}
