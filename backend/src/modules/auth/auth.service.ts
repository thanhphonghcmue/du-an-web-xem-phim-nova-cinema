import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiException } from "../../common/exceptions/api.exception";
import { UsersRepository } from "../users/users.repository";
import { UserProfileDto } from "../users/dto/user-profile.dto";
import { requireActiveAccount } from "../users/users.service";
import { AuthRepository } from "./auth.repository";
import { PasswordService } from "./password.service";
import { TokenService, tokenHash } from "./token.service";
import { AuthSessionDto, LoginDto, RegisterDto } from "./dto/auth.dto";
function invalidRefresh(): ApiException {
  return new ApiException(
    401,
    "INVALID_REFRESH_TOKEN",
    "Refresh token is invalid, expired or revoked.",
  );
}
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}
  async register(dto: RegisterDto): Promise<UserProfileDto> {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      return await this.sessions.transaction((tx) =>
        this.users.create(
          {
            email: dto.email.trim().toLowerCase(),
            fullName: dto.fullName,
            passwordHash,
            ...(dto.phone ? { phone: dto.phone } : {}),
          },
          tx,
        ),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ApiException(
          409,
          "EMAIL_ALREADY_EXISTS",
          "Email is already registered.",
        );
      throw error;
    }
  }
  async login(dto: LoginDto): Promise<AuthSessionDto> {
    const account = await this.users.findCredentials(
      dto.email.trim().toLowerCase(),
    );
    const valid = await this.passwords.verify(
      account?.passwordHash,
      dto.password,
    );
    if (!account || !valid || account.role === "GUEST")
      throw new ApiException(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    requireActiveAccount(account.status);
    return this.sessions.transaction(async (tx) => {
      await this.users.lockAccount(account.id, tx);
      const current = await this.users.findAccount(account.id, tx);
      if (!current || current.role === "GUEST")
        throw new ApiException(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      const { status, ...user } = current;
      requireActiveAccount(status);
      const session = await this.tokens.issue(user.id);
      await this.sessions.createToken(
        {
          id: session.id,
          userId: user.id,
          tokenHash: session.hash,
          expiresAt: session.expiresAt,
        },
        tx,
      );
      return Object.assign(new AuthSessionDto(), session.tokens, { user });
    });
  }

  async refresh(rawToken: string): Promise<AuthSessionDto> {
    const claims = await this.tokens.verify(rawToken, "refresh").catch(() => {
      throw invalidRefresh();
    });
    return this.sessions.transaction(async (tx) => {
      await this.users.lockAccount(claims.sub, tx);
      if (
        !(await this.sessions.consumeToken(
          claims.jti,
          claims.sub,
          tokenHash(rawToken),
          tx,
        ))
      )
        throw invalidRefresh();
      const account = await this.users.findAccount(claims.sub, tx);
      if (!account || account.role === "GUEST") throw invalidRefresh();
      const { status, ...user } = account;
      requireActiveAccount(status);
      const session = await this.tokens.issue(user.id);
      await this.sessions.createToken(
        {
          id: session.id,
          userId: user.id,
          tokenHash: session.hash,
          expiresAt: session.expiresAt,
        },
        tx,
      );
      return Object.assign(new AuthSessionDto(), session.tokens, { user });
    });
  }
  async logout(rawToken: string): Promise<{ revoked: boolean }> {
    const claims = await this.tokens.verify(rawToken, "refresh").catch(() => {
      throw invalidRefresh();
    });
    return this.sessions.transaction(async (tx) => {
      if (
        !(await this.sessions.findToken(
          claims.jti,
          claims.sub,
          tokenHash(rawToken),
          tx,
        ))
      )
        throw invalidRefresh();
      await this.sessions.revokeToken(claims.jti, tx);
      return { revoked: true };
    });
  }
}
