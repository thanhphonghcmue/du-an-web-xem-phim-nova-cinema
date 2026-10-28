import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { DiscountService } from "./discount.service";
import { MembershipDto, UserProfileDto } from "./dto/user-profile.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ApiException } from "../../common/exceptions/api.exception";
import { UnitOfWork } from "../../database/unit-of-work";
@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly discount: DiscountService,
    private readonly database: UnitOfWork,
  ) {}
  async profile(id: string): Promise<UserProfileDto> {
    const account = await this.users.findAccount(id);
    if (!account || account.role === "GUEST")
      throw new UnauthorizedException("Authentication is required.");
    const { status, ...profile } = account;
    requireActiveAccount(status);
    return profile;
  }
  changeStatus(
    id: string,
    status: "ACTIVE" | "LOCKED" | "INACTIVE",
    actorId: string,
  ) {
    return this.database.transaction(async (tx) => {
      await this.users.lockAccount(id, tx);
      const account = await this.users.findAccount(id, tx);
      if (!account)
        throw new ApiException(
          404,
          "USER_NOT_FOUND",
          "Không tìm thấy tài khoản.",
        );
      if (id === actorId || account.role === "ADMIN")
        throw new ApiException(
          409,
          "ADMIN_ACCOUNT_PROTECTED",
          "Không thể khóa tài khoản quản trị tại đây.",
        );
      const result = await this.users.setStatus(id, status, tx);
      if (status !== "ACTIVE") await this.users.revokeSessions(id, tx);
      return result;
    });
  }
  updateProfile(id: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    return this.users.updateProfile(id, dto);
  }
  membership(user: UserProfileDto): MembershipDto {
    return {
      points: user.cMemberPoints,
      tier: user.cMemberTier,
      discountRate: this.discount.getDiscountRate(user.cMemberTier),
    };
  }
}

export function requireActiveAccount(status: string): void {
  if (status !== "ACTIVE")
    throw new ApiException(
      403,
      "ACCOUNT_DISABLED",
      "Tài khoản đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ hỗ trợ.",
    );
}
