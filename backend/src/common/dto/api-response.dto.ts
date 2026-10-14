import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
export class SuccessResponseDto {
  @ApiProperty({ example: true }) success!: boolean;
  @ApiProperty({ type: "object", additionalProperties: true }) data!: unknown;
  @ApiProperty({ example: "Request completed successfully." }) message!: string;
}
export class ErrorResponseDto {
  @ApiProperty({ example: false }) success!: boolean;
  @ApiProperty({ example: 400 }) statusCode!: number;
  @ApiProperty({ example: "VALIDATION_ERROR" }) error!: string;
  @ApiProperty({
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  })
  message!: string | string[];
  @ApiProperty({ format: "date-time" }) timestamp!: string;
  @ApiProperty({ example: "/api/v1/health" }) path!: string;
  @ApiProperty({ example: "phase2-request_123" }) requestId!: string;
  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  details?: unknown;
}
