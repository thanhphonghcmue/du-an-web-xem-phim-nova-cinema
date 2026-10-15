import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC } from "../decorators/public.decorator";
import { AuthenticatedRequest } from "../decorators/current-user.decorator";
import { TokenService } from "../../modules/auth/token.service";
import { UsersService } from "../../modules/users/users.service";
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.header("authorization");
    const match = header?.match(/^Bearer ([^\s]+)$/i);
    if (!match?.[1] || match[1].length > 4096)
      throw new UnauthorizedException(
        "A valid bearer access token is required.",
      );
    const claims = await this.tokens.verify(match[1], "access");
    request.user = await this.users.profile(claims.sub);
    return true;
  }
}
