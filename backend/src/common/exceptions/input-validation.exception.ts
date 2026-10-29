import { BadRequestException } from "@nestjs/common";
import { ValidationError } from "class-validator";

interface FieldIssue {
  field: string;
  messages: string[];
}

export function validationMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints || {}),
    ...validationMessages(error.children || []),
  ]);
}

export function validationFields(errors: ValidationError[]): FieldIssue[] {
  const fields: FieldIssue[] = [];
  function visit(items: ValidationError[], parent = "", depth = 0): void {
    if (depth > 16 || fields.length >= 32) return;
    for (const item of items) {
      if (fields.length >= 32) break;
      if (
        typeof item.property !== "string" ||
        !/^[A-Za-z0-9_]{1,64}$/.test(item.property) ||
        ["__proto__", "prototype", "constructor"].includes(item.property)
      )
        continue;
      const field = parent ? `${parent}.${item.property}` : item.property;
      const messages = Object.entries(item.constraints || {})
        .filter(([code]) => code !== "whitelistValidation")
        .map(([, message]) => message);
      // Chỉ gửi đường dẫn và thông báo DTO, không gửi target/value của khách.
      if (messages.length) fields.push({ field, messages });
      visit(item.children || [], field, depth + 1);
    }
  }
  visit(errors);
  return fields;
}

export class InputValidationException extends BadRequestException {
  constructor(errors: ValidationError[]) {
    super({
      error: "VALIDATION_ERROR",
      message: validationMessages(errors),
      details: { fieldErrors: validationFields(errors) },
    });
  }
}
