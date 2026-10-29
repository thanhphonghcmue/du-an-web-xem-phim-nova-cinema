import test from "node:test";
import assert from "node:assert/strict";
import { formFieldErrors } from "../frontend/src/api/formErrors.js";

test("maps validated DTO fields and nested paths only to existing form controls", () => {
  const result = formFieldErrors(
    {
      status: 400,
      details: {
        fieldErrors: [
          {
            field: "fullName",
            messages: [
              "fullName must be shorter than or equal to 120 characters",
            ],
          },
          {
            field: "columns",
            messages: ["columns must not be greater than 24"],
          },
          { field: "rows.0", messages: ["rows.0 must be a string"] },
          { field: "passwordHash", messages: ["do not bind"] },
          { field: "constructor", messages: ["do not bind"] },
          null,
        ],
      },
    },
    ["name", "columns", "rows"],
    { aliases: { fullName: "name" } },
  );
  assert.deepEqual(result, {
    name: "Chỉ nhập tối đa 120 ký tự.",
    columns: "Giá trị không được vượt quá 24.",
    rows: "rows.0 must be a string",
  });
  assert.equal(Object.hasOwn(result, "constructor"), false);
});
test("business conflicts bind to their known field while internal/legacy failures stay global", () => {
  const options = { codes: { EMAIL_ALREADY_EXISTS: "email" } };
  assert.deepEqual(
    formFieldErrors(
      {
        status: 409,
        code: "EMAIL_ALREADY_EXISTS",
        message: "Email đã được sử dụng.",
      },
      ["email"],
      options,
    ),
    { email: "Email đã được sử dụng." },
  );
  assert.deepEqual(
    formFieldErrors(
      {
        status: 500,
        details: { fieldErrors: [{ field: "email", messages: ["sensitive"] }] },
      },
      ["email"],
    ),
    {},
  );
  assert.deepEqual(formFieldErrors(null, ["email"]), {});
  assert.deepEqual(
    formFieldErrors({ status: 400, message: "legacy" }, ["email"]),
    {},
  );
});
test("English fields retain validation messages and malformed values cannot crash the form", () => {
  assert.deepEqual(
    formFieldErrors(
      {
        status: 400,
        details: {
          fieldErrors: [
            { field: "email", messages: [null, "email must be an email"] },
            { field: null },
            { field: "email", messages: null },
          ],
        },
      },
      ["email"],
      { language: "en" },
    ),
    { email: "email must be an email" },
  );
});
