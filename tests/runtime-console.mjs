// HTTP 404/409 dự kiến không phải lỗi React/runtime của trình duyệt.
export function verifyRuntimeConsole(test, expect) {
  const faults = new WeakMap();
  test.beforeEach(({ page }) => {
    const errors = [];
    faults.set(page, errors);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        ["error", "warning"].includes(message.type()) &&
        /Encountered two children|hydration|Uncaught|Maximum update depth|Cannot read properties|Invalid hook call/i.test(
          message.text(),
        )
      )
        errors.push(message.text());
    });
  });
  test.afterEach(({ page }) => {
    expect(
      faults.get(page) || [],
      "Không có lỗi React/runtime trong ca browser",
    ).toEqual([]);
  });
}
