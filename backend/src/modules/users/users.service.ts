import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { DiscountService } from "./discount.service";
import { MembershipDto, UserProfileDto } from "./dto/user-profile.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly discount: DiscountService,
  ) {}
  async profile(id: string): Promise<UserProfileDto> {
    const profile = await this.users.findProfile(id);
    if (!profile || profile.role === "GUEST")
      throw new UnauthorizedException("Authentication is required.");
    return profile;
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
