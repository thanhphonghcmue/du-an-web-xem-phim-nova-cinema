import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { Matches } from "class-validator";
export class ReconciliationQueryDto {
  @ApiProperty({
    description:
      "Exact NOVA order code or NOVA-SB transaction code (not a signed checkout URL).",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @Matches(
    /^(NOVA-[a-f0-9]{32}|NOVA-SB-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/,
  )
  reference!: string;
}
