import { test, expect } from "@playwright/test";

async function prepare(page, group = false) {
  await page.goto("/");
  await page
    .getByLabel("Chọn cụm rạp", { exact: true })
    .selectOption("landmark");
  await page.getByLabel("Chọn phim", { exact: true }).selectOption("dune");
  const date = await page
    .getByLabel("Chọn ngày", { exact: true })
    .locator("option")
    .nth(2)
    .getAttribute("value");
  await page.getByLabel("Chọn ngày", { exact: true }).selectOption(date);
  await page
    .getByLabel("Chọn suất chiếu", { exact: true })
    .selectOption("19:30");
  if (group) await page.getByRole("checkbox", { name: /Xếp cụm nhóm/ }).check();
  await page.getByRole("button", { name: "Tìm ghế đẹp" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function hold(page, id = "A1") {
  await page
    .getByRole("button", { name: `Ghế ${id}, thường`, exact: true })
    .click();
  await expect(page.locator(".selected-seats")).toContainText(id);
}

test("booking choices reset dependent fields and search finds directors", async ({
  page,
}) => {
  await page.goto("/");
  const film = page.getByLabel("Chọn phim", { exact: true });
  await expect(film).toBeDisabled();
  await page
    .getByLabel("Chọn cụm rạp", { exact: true })
    .selectOption("landmark");
  await film.selectOption("dune");
  await page
    .getByLabel("Chọn ngày", { exact: true })
    .selectOption({ index: 2 });
  await page
    .getByLabel("Chọn suất chiếu", { exact: true })
    .selectOption("19:30");
  await expect(page.getByRole("button", { name: "Tìm ghế đẹp" })).toBeEnabled();
  await page.getByLabel("Chọn cụm rạp", { exact: true }).selectOption("sala");
  await expect(film).toHaveValue("");
  await expect(page.getByLabel("Chọn ngày", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Tìm ghế đẹp" }),
  ).toBeDisabled();
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Tên phim, đạo diễn…").fill("Christopher Nolan");
  await expect(page.locator(".search-result")).toHaveCount(1);
  await expect(page.locator(".search-result")).toContainText("Oppenheimer");
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
  await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
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
  await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
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
  await page.getByRole("button", { name: "Tiếp tục thanh toán" }).click();
  await page.clock.fastForward(301000);
  await expect(
    page.getByRole("button", { name: "Thanh toán mô phỏng", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText(
    "Thời gian giữ ghế đã hết",
  );
  await page.getByRole("button", { name: "Quay lại chọn ghế" }).click();
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
  await page.getByLabel("Họ và tên").fill("Thanh Phong");
  await page.getByLabel("Email", { exact: true }).fill("phong@example.com");
  await page.getByRole("button", { name: "Tiếp tục với hồ sơ demo" }).click();
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
