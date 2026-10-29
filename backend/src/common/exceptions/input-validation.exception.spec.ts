import { ValidationError } from "class-validator";
import {
  InputValidationException,
  validationFields,
  validationMessages,
} from "./input-validation.exception";

const issue = (
  property: string,
  constraints = {},
  children: ValidationError[] = [],
): ValidationError =>
  Object.assign(new ValidationError(), {
    property,
    constraints,
    children,
    target: { password: "private-password" },
    value: "private-value",
  });

describe("safe per-field validation details", () => {
  it("keeps legacy messages and nested numeric paths without submitted targets/values", () => {
    const errors = [
      issue("comboItems", {}, [
        issue("0", {}, [
          issue("quantity", { min: "quantity must not be less than 1" }),
        ]),
      ]),
    ];
    expect(validationMessages(errors)).toEqual([
      "quantity must not be less than 1",
    ]);
    const exception = new InputValidationException(errors);
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      error: "VALIDATION_ERROR",
      message: validationMessages(errors),
      details: {
        fieldErrors: [
          {
            field: "comboItems.0.quantity",
            messages: ["quantity must not be less than 1"],
          },
        ],
      },
    });
    expect(JSON.stringify(exception.getResponse())).not.toMatch(
      /private-password|private-value|target|value/,
    );
  });
  it("does not bind unknown or prototype properties into a UI form", () => {
    const errors = [
      issue("isAdmin", {
        whitelistValidation: "property isAdmin should not exist",
      }),
      issue("__proto__", { isString: "bad" }),
      issue("<script>", { isString: "bad" }),
      issue("email", { isEmail: "email must be an email" }),
    ];
    expect(validationFields(errors)).toEqual([
      { field: "email", messages: ["email must be an email"] },
    ]);
    expect(validationMessages(errors)[0]).toContain("isAdmin");
  });
  it("bounds public field detail lists and traverses empty nested entries safely", () => {
    expect(validationFields([])).toEqual([]);
    const errors = Array.from({ length: 100 }, (_, i) =>
      issue(`field${String(i)}`, { isInt: "must be integer" }),
    );
    expect(validationFields(errors)).toHaveLength(32);
  });
});
