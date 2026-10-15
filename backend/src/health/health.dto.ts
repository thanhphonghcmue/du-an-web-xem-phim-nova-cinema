import { ApiProperty } from "@nestjs/swagger";
export class DependencyStatusDto {
  @ApiProperty({ enum: ["up", "down"] }) status!: "up" | "down";
}
export class HealthChecksDto {
  @ApiProperty({ type: DependencyStatusDto }) postgres!: DependencyStatusDto;
  @ApiProperty({ type: DependencyStatusDto }) redis!: DependencyStatusDto;
  @ApiProperty({ type: DependencyStatusDto }) queue!: DependencyStatusDto;
  @ApiProperty({ type: DependencyStatusDto }) realtime!: DependencyStatusDto;
}
export class HealthDto {
  @ApiProperty({ enum: ["ok", "degraded"] }) status!: "ok" | "degraded";
  @ApiProperty({ format: "date-time" }) timestamp!: string;
  @ApiProperty({ type: HealthChecksDto }) checks!: HealthChecksDto;
}
