import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";
import { SuccessResponseDto } from "../dto/api-response.dto";
export function ApiDataResponse(
  model: Type<unknown>,
  status = 200,
  isArray = false,
) {
  return applyDecorators(
    ApiExtraModels(SuccessResponseDto, model),
    ApiResponse({
      status,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: isArray
                ? { type: "array", items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}
