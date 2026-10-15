import { applyDecorators, Type } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "./roles.decorator";
import { ErrorResponseDto, SuccessResponseDto } from "../dto/api-response.dto";
import { PageMetaDto } from "../dto/pagination.dto";
export function CatalogWrite() {
  return applyDecorators(
    Roles(UserRole.ADMIN),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ type: ErrorResponseDto }),
    ApiForbiddenResponse({ type: ErrorResponseDto }),
    ApiConflictResponse({ type: ErrorResponseDto }),
  );
}
export function ApiPageResponse(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(SuccessResponseDto, PageMetaDto, model),
    ApiResponse({
      status: 200,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                type: "object",
                required: ["items", "meta"],
                properties: {
                  items: {
                    type: "array",
                    items: { $ref: getSchemaPath(model) },
                  },
                  meta: { $ref: getSchemaPath(PageMetaDto) },
                },
              },
            },
          },
        ],
      },
    }),
  );
}
