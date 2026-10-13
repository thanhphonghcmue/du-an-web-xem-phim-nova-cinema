import { test, expect } from "@playwright/test";

async function prepare(page, group = false) {
  await page.goto("/");
  await page
    .locator(".wizard-panel")
    .getByRole("button", { name: "NOVA Landmark 81", exact: true })
    .click();
  await page
    .locator(".wizard-panel")
    .getByRole("button", { name: "Dune: Hành Tinh Cát 2", exact: true })
    .click();
  await page.locator(".date-pills button").nth(1).click();
  await page
    .locator(".showtime-pills")
    .getByRole("button", { name: /19:30/ })
    .click();
  if (group) await page.getByRole("checkbox", { name: /Xếp cụm nhóm/ }).check();
  await page.getByRole("button", { name: "Tìm ghế đẹp", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function checkout(page) {
  await page.getByRole("button", { name: "Tiếp tục chọn combo" }).click();
  await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
}

async function hold(page, id = "A1") {
  await page
    .getByRole("button", { name: `Ghế ${id}, thường`, exact: true })
    .click();
  await expect(page.locator(".selected-seats")).toContainText(id);
}

test("visual wizard resets dependent choices and search finds directors", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".wizard-step").nth(1)).toBeDisabled();
  await page
    .locator(".wizard-panel")
    .getByRole("button", { name: "NOVA Landmark 81", exact: true })
    .click();
  await page
    .locator(".wizard-panel")
    .getByRole("button", { name: "Dune: Hành Tinh Cát 2", exact: true })
    .click();
  await page.locator(".date-pills button").nth(1).click();
  await page
    .locator(".showtime-pills")
    .getByRole("button", { name: /19:30/ })
    .click();
  await expect(page.getByRole("button", { name: "Tìm ghế đẹp" })).toBeEnabled();
  await page.locator(".wizard-step").first().click();
  await page
    .locator(".wizard-panel")
    .getByRole("button", { name: "NOVA Sala", exact: true })
    .click();
  await expect(page.locator(".wizard-step").nth(1)).not.toContainText("Dune");
  await expect(page.locator(".wizard-step").nth(2)).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Tìm ghế đẹp" }),
  ).toBeDisabled();
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Tên phim, đạo diễn…").fill("Christopher Nolan");
  await expect(page.locator(".search-result")).toHaveCount(3);
  await expect(page.locator(".search-modal")).toContainText("Oppenheimer");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("successful payment calculates combo and issues a unique QR; sold seats stay blocked", async ({
  page,
}) => {
  await prepare(page);
  await hold(page);
  await page.getByRole("button", { name: "Tăng combo" }).click();
  await expect(page.locator(".summary-total")).toContainText("159.000");
  await checkout(page);
  await page
    .getByRole("button", { name: "Thanh toán mô phỏng", exact: true })
    .click();
  await expect(
    page.getByText("ĐẶT VÉ MÔ PHỎNG THÀNH CÔNG", { exact: true }),
  ).toBeVisible();
  const ticket = await page.evaluate(
    () => JSON.parse(localStorage.getItem("nova-tickets"))[0],
  );
  expect(ticket.code).toMatch(/^NOVA-[\da-f-]{36}$/);
  expect(ticket.qr).toMatch(/^data:image\/png;base64,/);
  expect(ticket.total).toBe(159000);
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Tìm ghế đẹp" }).click();
  await expect(
    page.getByRole("button", { name: "Ghế A1, đã bán", exact: true }),
  ).toBeDisabled();
});

test("Sweetbox pairs, cancellation and failed payment release held seats", async ({
  page,
}) => {
  await prepare(page);
  await page
    .getByRole("button", { name: "Ghế H1, Sweetbox đôi", exact: true })
    .click();
  await expect(page.locator(".selected-seats")).toContainText("H1, H2");
  await expect(page.locator(".summary-total")).toContainText("220.000");
  await page
    .getByRole("button", { name: "Hủy đặt vé & giải phóng ghế" })
    .click();
  await page.getByRole("button", { name: "Tìm ghế đẹp" }).click();
  await expect(
    page.getByRole("button", { name: "Ghế H1, Sweetbox đôi", exact: true }),
  ).toBeEnabled();
  await hold(page);
  await checkout(page);
  await page
    .getByRole("button", { name: "Thử trường hợp thanh toán thất bại" })
    .click();
  await expect(page.getByRole("alert")).toContainText("đã được giải phóng");
  await expect(
    page.getByRole("button", { name: "Ghế A1, thường", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".selected-seats")).toContainText("Chưa chọn ghế");
});

test("groups support 20 consecutive seats and reject 21", async ({ page }) => {
  await prepare(page, true);
  await page.getByLabel("Số người trong nhóm").selectOption("20");
  await page.getByRole("button", { name: "Xếp ghế", exact: true }).click();
  await expect(page.locator(".seat.selected")).toHaveCount(20);
  await expect(page.locator(".seat.selected").first()).toHaveAttribute(
    "aria-label",
    /Ghế A1,/,
  );
  await expect(page.locator(".seat.selected").last()).toHaveAttribute(
    "aria-label",
    /Ghế A20,/,
  );
  await page
    .getByRole("button", { name: "Ghế B1, thường", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("tối đa 20 ghế");
  await expect(page.locator(".seat.selected")).toHaveCount(20);
});

test("five-minute holds expire and prevent payment", async ({ page }) => {
  await page.clock.install();
  await prepare(page);
  await hold(page);
  await checkout(page);
  await page.clock.fastForward(301000);
  await expect(
    page.getByRole("button", { name: "Thanh toán mô phỏng", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText(
    "Thời gian giữ ghế đã hết",
  );
  await page
    .locator(".flow-stepper")
    .getByRole("button", { name: /Chọn Ghế/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Ghế A1, thường", exact: true }),
  ).toBeEnabled();
});

test("tabs cannot hold the same seat; cancel makes it available in the other tab", async ({
  page,
  context,
}) => {
  await prepare(page);
  await hold(page);
  const other = await context.newPage();
  await prepare(other);
  await expect(
    other.getByRole("button", { name: "Ghế A1, đang giữ", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Hủy đặt vé & giải phóng ghế" })
    .click();
  await expect(
    other.getByRole("button", { name: "Ghế A1, thường", exact: true }),
  ).toBeEnabled();
});

test("member discount, mobile layout and menu work without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu" }).click();
  await page.getByRole("button", { name: "Tài khoản", exact: true }).click();
  await page.getByRole("tab", { name: "Đăng ký thành viên" }).click();
  await page.getByLabel("Họ và tên").fill("Thanh Phong");
  await page.getByLabel("Email", { exact: true }).fill("phong@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("DemoTest123");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("DemoTest123");
  await page.getByRole("button", { name: "Tạo tài khoản demo" }).click();
  await expect(page.getByText("Xin chào, Thanh Phong.")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  await prepare(page);
  await hold(page);
  await expect(page.locator(".summary-total")).toContainText("85.500");
  await expect(page.locator(".seat-map-scroll")).toBeVisible();
});

test("auth validates fields, password toggle works and social login reports demo scope", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("tab", { name: "Đăng ký thành viên" }).click();
  await page.getByRole("button", { name: "Tạo tài khoản demo" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "email" }),
  ).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("DemoPassword123");
  await page
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Google", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("chưa kết nối");
});
test("instant cinema search, upcoming tab, language persistence and voucher totals", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Tìm phim, rạp...", { exact: true })
    .first()
    .fill("Sala");
  await expect(page.locator(".search-dropdown")).toContainText("NOVA Sala");
  await page
    .locator(".search-dropdown")
    .getByRole("button", { name: /NOVA Sala/ })
    .click();
  await expect(page.locator(".wizard-step").first()).toContainText("NOVA Sala");
  await page.getByRole("tab", { name: "Sắp chiếu" }).click();
  await expect(page.locator(".movie-card")).toHaveCount(2);
  await page.getByRole("button", { name: "VN / EN" }).click();
  await expect(page.getByRole("tab", { name: "Coming soon" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "VN / EN" }).click();
  await prepare(page);
  await hold(page);
  await page.getByRole("button", { name: "Tiếp tục chọn combo" }).click();
  await page.getByLabel("Áp dụng mã ưu đãi").check();
  await page.getByLabel("Mã ưu đãi", { exact: true }).fill("NOVA10");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.locator(".summary-total")).toContainText("81.000");
  await page.getByLabel("Mã ưu đãi", { exact: true }).fill("WRONG");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.locator(".summary-total")).toContainText("90.000");
});

test("quick three-seat helper and C’MEMBER points update after successful checkout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("tab", { name: "Đăng ký thành viên" }).click();
  await page.getByLabel("Họ và tên").fill("Nova Tester");
  await page.getByLabel("Email", { exact: true }).fill("nova@example.com");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("DemoOnly123");
  await page
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("DemoOnly123");
  await page.getByRole("button", { name: "Tạo tài khoản demo" }).click();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("nova-member")),
  ).not.toContain("DemoOnly123");
  await prepare(page);
  await page
    .getByRole("button", { name: "Chọn nhanh 3 ghế liền nhau" })
    .click();
  await expect(page.locator(".seat.selected")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Hủy đặt vé & giải phóng ghế" })
    .click();
  await page.getByRole("button", { name: "Tìm ghế đẹp", exact: true }).click();
  await hold(page);
  await page.getByRole("button", { name: "Tiếp tục chọn combo" }).click();
  await page.getByLabel("Dùng 100 điểm demo").check();
  await expect(page.locator(".summary-total")).toContainText("80.000");
  await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
  await page
    .getByRole("button", { name: "Thanh toán mô phỏng", exact: true })
    .click();
  await expect(
    page.getByText("ĐẶT VÉ MÔ PHỎNG THÀNH CÔNG", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("nova-member")).points,
    ),
  ).toBe(80);
});
