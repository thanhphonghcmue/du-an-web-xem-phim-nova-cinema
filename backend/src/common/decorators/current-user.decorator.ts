import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { UserProfileDto } from "../../modules/users/dto/user-profile.dto";
export type AuthenticatedRequest = Request & { user?: UserProfileDto };
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserProfileDto => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthorizedException("Authentication is required.");
    return user;
  },
);
