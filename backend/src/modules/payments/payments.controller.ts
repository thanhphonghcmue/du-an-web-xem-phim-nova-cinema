import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { ApiDataResponse } from "../../common/decorators/api-data-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ErrorResponseDto } from "../../common/dto/api-response.dto";
import { UserProfileDto } from "../users/dto/user-profile.dto";
import {
  CompleteSandboxDto,
  CreateSandboxUrlDto,
  PaymentStateDto,
  PaymentWebhookDto,
  PaymentWebhookResultDto,
  SandboxUrlDto,
  SignedCheckoutDto,
} from "./payment.dto";
import { PaymentsService } from "./payments.service";
import { sandboxPage, sandboxResult } from "./sandbox-page";
@ApiTags("Payments — Sandbox only")
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiConflictResponse({ type: ErrorResponseDto })
@Controller("payments")
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Post("create-sandbox-url")
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  @ApiBearerAuth()
  @ApiDataResponse(SandboxUrlDto, 201)
  @ApiOperation({
    summary:
      "Create/replay one signed sandbox checkout for own active hold; never extends its 5-minute deadline",
  })
  create(
    @CurrentUser() user: UserProfileDto,
    @Body() dto: CreateSandboxUrlDto,
  ) {
    return this.service.createSandboxUrl(user.id, dto);
  }
  @Public()
  @Post("webhook")
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiDataResponse(PaymentWebhookResultDto)
  @ApiOperation({
    summary:
      "HMAC-SHA512 authenticated terminal callback; same outcome is idempotent, conflicting outcome returns409",
  })
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.service.webhook(dto);
  }
  @Public()
  @Get("sandbox")
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  @ApiProduces("text/html")
  @ApiOperation({
    summary:
      "Open a signed, expiring sandbox-only capability URL; no real money or bank credentials",
  })
  async checkout(
    @Query() dto: SignedCheckoutDto,
    @Res() response: Response,
  ): Promise<void> {
    const state = await this.service.checkout(dto);
    response
      .set({
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      })
      .type("html")
      .send(sandboxPage(dto, state.canPay, state.bookingStatus));
  }
  @Public()
  @Post("sandbox/complete")
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  @HttpCode(200)
  @ApiProduces("text/html")
  @ApiOperation({
    summary:
      "Simulate SUCCESS/FAILED/CANCELLED using the signed sandbox checkout; shares the webhook state machine",
  })
  async simulate(
    @Body() dto: CompleteSandboxDto,
    @Res() response: Response,
  ): Promise<void> {
    const state = await this.service.simulate(dto);
    response
      .set({
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      })
      .type("html")
      .send(sandboxResult(dto.returnUrl, state.bookingStatus));
  }
  @Get(":bookingId/status")
  @Header("Cache-Control", "no-store")
  @ApiBearerAuth()
  @ApiDataResponse(PaymentStateDto)
  @ApiOperation({
    summary:
      "Read own booking/payment state; other owners return404, including ADMIN",
  })
  status(
    @CurrentUser() user: UserProfileDto,
    @Param("bookingId", ParseUUIDPipe) id: string,
  ) {
    return this.service.status(id, user.id);
  }
}
