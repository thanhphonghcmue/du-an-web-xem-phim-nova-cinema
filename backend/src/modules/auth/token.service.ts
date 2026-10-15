import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { isUUID } from "class-validator";
import { createHash, randomUUID } from "node:crypto";
import { JwtSettings } from "../../config/jwt.config";
import { TokenPairDto } from "./dto/auth.dto";
export interface SessionClaims {
  sub: string;
  jti: string;
}
export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
@Injectable()
export class TokenService {
  private readonly settings: JwtSettings;
  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.settings = config.getOrThrow<JwtSettings>("jwt");
  }
  async issue(
    userId: string,
  ): Promise<{
    id: string;
    hash: string;
    expiresAt: Date;
    tokens: TokenPairDto;
  }> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expires = now + this.settings.refreshTtlSeconds;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: userId,
          jti: randomUUID(),
          tokenUse: "access",
          iat: now,
          exp: now + this.settings.accessTtlSeconds,
        },
        {
          secret: this.settings.accessSecret,
          algorithm: "HS256",
          issuer: "nova-cinema",
          audience: "nova-api",
        },
      ),
      this.jwt.signAsync(
        { sub: userId, jti: id, tokenUse: "refresh", iat: now, exp: expires },
        {
          secret: this.settings.refreshSecret,
          algorithm: "HS256",
          issuer: "nova-cinema",
          audience: "nova-refresh",
        },
      ),
    ]);
    return {
      id,
      hash: tokenHash(refreshToken),
      expiresAt: new Date(expires * 1000),
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: this.settings.accessTtlSeconds,
        refreshExpiresIn: this.settings.refreshTtlSeconds,
      },
    };
  }
  async verify(
    token: string,
    kind: "access" | "refresh",
  ): Promise<SessionClaims> {
    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        {
          secret:
            kind === "access"
              ? this.settings.accessSecret
              : this.settings.refreshSecret,
          algorithms: ["HS256"],
          issuer: "nova-cinema",
          audience: kind === "access" ? "nova-api" : "nova-refresh",
        },
      );
      if (
        payload.tokenUse !== kind ||
        typeof payload.exp !== "number" ||
        payload.exp <= Date.now() / 1000 ||
        typeof payload.sub !== "string" ||
        !isUUID(payload.sub) ||
        typeof payload.jti !== "string" ||
        !isUUID(payload.jti)
      )
        throw new Error("Invalid claims.");
      return { sub: payload.sub, jti: payload.jti };
    } catch {
      throw new UnauthorizedException("Token is invalid or expired.");
    }
  }
}
