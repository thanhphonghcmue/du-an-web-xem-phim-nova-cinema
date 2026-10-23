import { chooseOption, chooseDate } from "./ui-choices.mjs";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const req = createRequire(new URL("../backend/package.json", import.meta.url));
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("../.runtime/fullstack-test.json", import.meta.url),
      "utf8",
    ),
  );

test.beforeEach(async () => {
  req("dotenv").config({
    path: new URL("../backend/.env", import.meta.url).pathname,
    quiet: true,
  });
  const Redis = req("ioredis");
  const redis = new Redis({
    host: process.env.TEST_REDIS_HOST,
    port: Number(process.env.TEST_REDIS_PORT),
    password: process.env.TEST_REDIS_PASSWORD,
    db: Number(process.env.TEST_REDIS_DB),
    maxRetriesPerRequest: 1,
  });
  try {
    const keys = await redis.keys(fixture().prefix + ":throttle:*");
    if (keys.length) await redis.del(...keys);
  } finally {
    await redis.quit();
  }
});

test("dedicated discovery pages have real navigation, banners and accessible filters", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/phim");
  await expect(page.locator(".page-banner h1")).toContainText("Chọn một phim");
  await expect(
    page.locator(`.discovery-film[data-movie-id="${fixture().movie.id}"]`),
  ).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Tìm phim trong danh mục" })
    .fill("khongcophimnay");
  await expect(
    page.getByText("Chưa có phim phù hợp", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.locator(".discovery-film")).not.toHaveCount(0);
  await page
    .locator(".nova-subnav")
    .getByRole("link", { name: "Sắp chiếu tháng sau" })
    .click();
  await expect(page).toHaveURL(/\/sap-chieu$/);
  await expect(page.locator(".page-banner h1")).toContainText("Tháng mới");
  await expect(page.locator(".page-banner-image")).toBeVisible();
  await page
    .locator(".nova-subnav")
    .getByRole("link", { name: "Ưu đãi & sự kiện" })
    .click();
  await expect(page.locator(".campaign-grid .campaign-card")).toHaveCount(6);
  await page
    .locator(".campaign-grid")
    .getByRole("button", { name: "Khám phá ngay" })
    .first()
    .click();
  await expect(page.locator(".offer-detail")).toContainText("Party Combo 69K");
  expect(errors).toEqual([]);
});

test("food draft survives navigation and transfers real combo IDs into seat selection", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/bap-nuoc");
  await expect(
    page.getByRole("button", { name: `Thêm ${data.combo.name}`, exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: `Thêm ${data.combo.name}`, exact: true })
    .click();
  await expect(page.locator(".food-cart")).toContainText(data.combo.name);
  await page.getByRole("button", { name: "Chọn suất & thêm vào vé" }).click();
  await expect(page).toHaveURL(/\/dat-ve$/);
  const status = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.status;
    },
    { email: data.accounts.customer.email, password: data.password },
  );
  expect(status).toBe(200);
  await page.reload();
  await expect(page.locator(".login-trigger")).toContainText("CUSTOMER");
  await chooseOption(page, "Rạp trong lịch chiếu", data.cinema.id);
  await page.locator(".timeline-show").first().click();
  await expect(
    page.getByRole("dialog", { name: "Chọn ghế & đặt vé" }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: `Số lượng ${data.combo.name}` }),
  ).toHaveValue("1");
  await expect(page.locator(".booking-film-poster")).toBeVisible();
  await expect(page.locator(".booking-stepper li")).toHaveCount(4);
});

test("mobile page navigation and food categories remain within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/phim",
    "/bap-nuoc",
    "/uu-dai",
    "/dang-nhap",
    "/hoi-vien",
  ]) {
    await page.goto(route);
    await expect(page.locator(".page-banner h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/bap-nuoc");
  await page.getByRole("tab", { name: "Đồ ăn nóng", exact: true }).click();
  await expect(page.locator(".food-product")).toHaveCount(0);
  await expect(
    page.getByText("Thực đơn đang được cập nhật", { exact: true }),
  ).toBeVisible();
});

test("welcome campaign opens on first visit, respects dismiss preference and links to real food page", async ({
  page,
}) => {
  await page.goto("/");
  const campaign = page.getByRole("dialog", { name: /Mở màn rực rỡ/ });
  await expect(campaign).toBeVisible();
  await expect(campaign.getByRole("img")).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Không hiển thị lại hôm nay" })
    .check();
  await page.keyboard.press("Escape");
  await expect(campaign).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".premiere-copy")).toBeVisible();
  await expect(campaign).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ưu đãi mở màn", exact: true })
    .click();
  await expect(campaign).toBeVisible();
  await campaign.getByRole("link", { name: "Khám phá bắp nước" }).click();
  await expect(page).toHaveURL(/\/bap-nuoc$/);
  await expect(page.locator(".food-discovery")).toBeVisible();
});

test("footer headings, support answers and payment brands all open useful destinations", async ({
  page,
}) => {
  await page.goto("/phim");
  const footer = page.locator(".nova-footer");
  await footer
    .getByRole("link", { name: "KHÁM PHÁ NOVA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/gioi-thieu$/);
  await expect(page.locator(".info-destinations>a")).toHaveCount(3);
  await footer
    .getByRole("link", { name: "ĐỒNG HÀNH CÙNG BẠN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ho-tro$/);
  await page
    .locator("summary")
    .filter({ hasText: "Ghế được giữ trong bao lâu?" })
    .click();
  await expect(page.locator("details[open]")).toContainText("5 phút");
  await footer.getByRole("link", { name: "MoMo", exact: true }).click();
  await expect(page).toHaveURL(/\/thanh-toan\?phuong-thuc=momo$/);
  await expect(page.locator(".payment-explainer h2")).toHaveText("MoMo");
  await expect(page.locator(".payment-explainer")).toContainText(
    "chưa liên kết ví",
  );
  for (const [label, title] of [
    ["VISA", "Visa"],
    ["Mastercard", "Mastercard"],
    ["ZaloPay", "ZaloPay"],
  ]) {
    await footer.getByRole("link", { name: label, exact: true }).click();
    await expect(page.locator(".payment-explainer h2")).toHaveText(title);
  }
  await page.getByRole("tab", { name: "NOVA Sandbox", exact: true }).click();
  await expect(page.locator(".payment-explainer h2")).toHaveText(
    "NOVA Sandbox",
  );
  await page
    .getByRole("link", { name: "Chọn suất & thanh toán Sandbox", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dat-ve$/);
});

test("room and day-part controls filter four real screenings without changing showtime IDs", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/dat-ve");
  await chooseOption(page, "Rạp trong lịch chiếu", data.cinema.id);
  await page
    .locator(".timeline-film-list [role=tab]")
    .filter({ hasText: "Dune" })
    .first()
    .click();
  const targetDay = new Date(
    data.programmeShowtimes[0].startTime,
  ).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  await chooseDate(page, "Chọn ngày xa trong lịch chiếu", targetDay);
  await page
    .getByRole("combobox", { name: "Phòng chiếu trong lịch", exact: true })
    .selectOption(data.programmeRoom.id);
  await expect(page.locator(".timeline-show")).toHaveCount(4);
  await page.getByRole("button", { name: "Buổi tối", exact: true }).click();
  await expect(page.locator(".timeline-show")).toHaveCount(1);
  await expect(page.locator(".timeline-show")).toContainText("18:00");
  await page.getByRole("button", { name: "Suất muộn", exact: true }).click();
  await expect(page.locator(".timeline-show")).toHaveCount(1);
  await expect(page.locator(".timeline-show")).toContainText("22:00");
  await page.getByRole("button", { name: "Tất cả giờ", exact: true }).click();
  await expect(page.locator(".timeline-show")).toHaveCount(4);
});

async function authenticate(page, role = "customer") {
  const data = fixture();
  const status = await page.evaluate(
    async ({ email, password }) =>
      (
        await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
      ).status,
    { email: data.accounts[role].email, password: data.password },
  );
  expect(status).toBe(200);
  await page.reload();
  await expect(page.locator(".login-trigger")).toContainText(
    role.toUpperCase(),
  );
}
test("month calendar loads over 100 screenings once and books an actual show 30 days ahead", async ({
  page,
}) => {
  const data = fixture(),
    requests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/showtimes"))
      requests.push(new URL(request.url()).pathname);
  });
  await page.goto("/dat-ve");
  await authenticate(page);
  await chooseOption(page, "Rạp trong lịch chiếu", data.cinema.id);
  await page
    .locator(".timeline-film-list [role=tab]")
    .filter({ hasText: "Dune" })
    .first()
    .click();
  const picker = page.getByLabel("Chọn ngày xa trong lịch chiếu", {
    exact: true,
  });
  const far = new Date(data.advanceShows.at(-1).startTime).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Ho_Chi_Minh" },
  );
  await expect(picker).toHaveAttribute("data-max", far);
  await expect(page.locator(".timeline-dates button")).toHaveCount(7);
  await page
    .getByRole("button", { name: "7 ngày tiếp theo", exact: true })
    .click();
  const next = await picker.getAttribute("data-value");
  expect(
    next >
      new Date(data.showtime.startTime).toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
  ).toBe(true);
  await chooseDate(page, "Chọn ngày xa trong lịch chiếu", far);
  await expect(page.locator(".timeline-show")).toHaveCount(4);
  await expect(
    page
      .getByRole("combobox", { name: "Phòng chiếu trong lịch", exact: true })
      .locator("option"),
  ).toHaveCount(3);
  expect(requests.some((path) => path === "/api/v1/showtimes/programme")).toBe(
    true,
  );
  expect(requests.some((path) => path === "/api/v1/showtimes")).toBe(false);
  await page.locator(".timeline-show").filter({ hasText: "21:00" }).click();
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  const held = page.waitForResponse(
    (response) =>
      response.url().endsWith("/bookings/hold") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const response = await held;
  expect(response.status()).toBe(201);
  const order = (await response.json()).data;
  expect(order.showtimeId).toBe(data.advanceShows.at(-1).id);
  await page
    .getByRole("button", { name: "Hủy đơn & trả ghế", exact: true })
    .click();
  await expect(page.getByTestId("server-total")).toHaveCount(0);
});

test("a coming-soon film with a real schedule can be prebooked, paid and issued as a real QR ticket", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/sap-chieu");
  await authenticate(page);
  const card = page.locator(
    `.discovery-film[data-movie-id="${data.presaleMovie.id}"]`,
  );
  await expect(card.locator(".presale-label")).toContainText("mở bán");
  await card
    .getByRole("button", {
      name: `Đặt trước ${data.presaleMovie.title}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(
    new RegExp("/dat-ve\\?movie=" + data.presaleMovie.id + "$"),
  );
  await expect(
    page.getByRole("combobox", { name: "Chọn phim", exact: true }),
  ).toHaveAttribute("data-value", data.presaleMovie.id);
  const date = new Date(data.presaleShow.startTime).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Ho_Chi_Minh" },
  );
  await chooseDate(page, "Chọn ngày chiếu", date);
  await chooseOption(page, "Chọn suất chiếu", data.presaleShow.id);
  await page
    .locator("#booking")
    .getByRole("button", { name: "Đặt ngay", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ghế A1, còn trống", exact: true })
    .click();
  const held = page.waitForResponse(
    (response) =>
      response.url().endsWith("/bookings/hold") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Giữ ghế 5 phút", exact: true })
    .click();
  const response = await held;
  expect(response.status()).toBe(201);
  const order = (await response.json()).data;
  expect(order.showtimeId).toBe(data.presaleShow.id);
  await page
    .getByRole("checkbox", {
      name: "Tôi xác nhận bản thân và người đi cùng đã đủ tuổi",
    })
    .check();
  await page
    .getByRole("button", { name: "Thanh toán Sandbox", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thanh toán thành công", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Quay lại ứng dụng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem vé trong tài khoản", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: /Mở màn rực rỡ/ })).toHaveCount(
    0,
  );
  await page.locator(".login-trigger").click();
  await expect(page.getByAltText(`QR vé ${order.orderCode}`)).toBeVisible();
  const result = await page.request.get("/api/v1/tickets/me?limit=100");
  const tickets = (await result.json()).data.items.filter(
    (ticket) => ticket.bookingId === order.id,
  );
  expect(tickets).toHaveLength(1);
  expect(tickets[0].startTime).toBe(data.presaleShow.startTime);
});

test("schedule labels remain readable with sufficient contrast and no mobile overflow", async ({
  page,
}) => {
  await page.goto("/dat-ve");
  await chooseOption(page, "Rạp trong lịch chiếu", fixture().cinema.id);
  await expect(page.locator(".timeline-show").first()).toBeVisible();
  const values = await page.evaluate(() => {
    const luminance = (color) => {
      const nums = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const c = value / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * nums[0] + 0.7152 * nums[1] + 0.0722 * nums[2];
    };
    return [
      ".timeline-film-list small",
      ".timeline-show>small",
      ".schedule-periods button",
    ].map((selector) => {
      const element = document.querySelector(selector),
        style = getComputedStyle(element);
      let parent = element;
      while (getComputedStyle(parent).backgroundColor === "rgba(0, 0, 0, 0)")
        parent = parent.parentElement;
      const a = luminance(style.color),
        b = luminance(getComputedStyle(parent).backgroundColor);
      return {
        selector,
        size: parseFloat(style.fontSize),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      };
    });
  });
  for (const value of values) {
    expect(value.size).toBeGreaterThanOrEqual(12);
    expect(value.ratio).toBeGreaterThanOrEqual(4.5);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseDate(
    page,
    "Chọn ngày xa trong lịch chiếu",
    new Date(fixture().advanceShows.at(-1).startTime).toLocaleDateString(
      "en-CA",
      { timeZone: "Asia/Ho_Chi_Minh" },
    ),
  );
  await expect(page.locator(".timeline-show")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await authenticate(page, "admin");
  await expect(page.locator(".admin-header-trigger")).toBeVisible();
  expect(
    await page
      .locator(".admin-header-trigger")
      .evaluate((element) => getComputedStyle(element).whiteSpace),
  ).toBe("nowrap");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

async function adminSession(page) {
  const data = fixture();
  await page.goto("/dang-nhap");
  await expect(page.locator(".auth-quick-accounts")).toHaveCount(0);
  const status = await page.evaluate(
    async ({ email, password }) =>
      (
        await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
      ).status,
    { email: data.accounts.admin.email, password: data.password },
  );
  expect(status).toBe(200);
  await page.goto("/quan-tri");
  await page
    .getByRole("button", { name: "Rạp, Phim & Suất Chiếu", exact: true })
    .click();
}

test("lower-page discovery uses current catalogue counts and each venue opens its own schedule", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() =>
    sessionStorage.setItem("nova-welcome-seen", "1"),
  );
  await page.goto("/");
  await expect(page.locator(".journey-live")).toBeVisible();
  await expect(page.locator(".journey-card")).toHaveCount(3);
  await page
    .locator(".journey-card")
    .filter({ hasText: "Chọn rạp của bạn" })
    .click();
  await expect(page).toHaveURL(/\/rap$/);
  const venue = page
    .locator(".venue-card")
    .filter({ hasText: fixture().cinema.name });
  await expect(venue.locator(".venue-stats")).toContainText("4phòng chiếu");
  await venue.getByRole("link", { name: "Xem lịch & đặt vé" }).click();
  await expect(page).toHaveURL(new RegExp(`cinema=${fixture().cinema.id}`));
  await expect(
    page.getByRole("combobox", { name: "Rạp trong lịch chiếu", exact: true }),
  ).toHaveAttribute("data-value", fixture().cinema.id);
  await expect(
    page.getByRole("combobox", { name: "Chọn cụm rạp", exact: true }),
  ).toHaveAttribute("data-value", fixture().cinema.id);
  for (const route of ["/hoi-vien", "/ho-tro", "/thanh-toan", "/rap"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.locator(".page-banner h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.locator(".venue-card").filter({ hasText: fixture().cinema.name }),
  ).toBeVisible();
  const font = await page
    .locator(".venue-card")
    .filter({ hasText: fixture().cinema.name })
    .locator("h2")
    .evaluate((el) => ({
      size: parseFloat(getComputedStyle(el).fontSize),
      color: getComputedStyle(el).color,
    }));
  expect(font.size).toBeGreaterThanOrEqual(28);
  expect(errors).toEqual([]);
});

test("admin seat builder validates capacity and persists the displayed row types through the real API", async ({
  page,
}) => {
  await adminSession(page);
  const data = fixture();
  const room = await page.evaluate(
    async ({ cinemaId, name }) => {
      const response = await fetch("/api/v1/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cinemaId, name, roomType: "STANDARD_2D" }),
      });
      return { status: response.status, body: await response.json() };
    },
    { cinemaId: data.cinema.id, name: `${data.prefix}-layout-browser` },
  );
  expect(room.status).toBe(201);
  await page.reload();
  await page
    .getByRole("button", { name: "Rạp, Phim & Suất Chiếu", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Danh mục vận hành" })
    .getByRole("button", { name: "Phòng chiếu", exact: true })
    .click();
  const builder = page.locator(".room-builder");
  await builder
    .getByRole("combobox", { name: "Phòng cần xem / tạo sơ đồ" })
    .selectOption(room.body.data.id);
  await expect(
    builder.getByRole("button", { name: "Lưu sơ đồ ghế" }),
  ).toBeEnabled();
  await builder.getByRole("spinbutton", { name: "Số hàng ghế" }).fill("15");
  await builder.getByRole("spinbutton", { name: "Số cột ghế" }).fill("24");
  await expect(builder.getByRole("alert")).toContainText("Vượt quá sức chứa");
  await expect(
    builder.getByRole("button", { name: "Lưu sơ đồ ghế" }),
  ).toBeDisabled();
  await builder.getByRole("spinbutton", { name: "Số hàng ghế" }).fill("2");
  await builder.getByRole("spinbutton", { name: "Số cột ghế" }).fill("6");
  await builder
    .getByRole("combobox", { name: "Loại ghế hàng B", exact: true })
    .selectOption("VIP");
  const generated = page.waitForResponse((response) =>
    response.url().endsWith(`/rooms/${room.body.data.id}/seats/generate`),
  );
  await builder.getByRole("button", { name: "Lưu sơ đồ ghế" }).click();
  expect((await generated).status()).toBe(201);
  await expect(builder.locator(".workspace-success")).toContainText(
    "Đã lưu sơ đồ 12 ghế",
  );
  await expect(builder.locator(".layout-preview .layout-vip")).toHaveCount(6);
  const saved = await page.evaluate(
    async (id) =>
      (await (await fetch(`/api/v1/rooms/${id}/seats?limit=100`)).json()).data,
    room.body.data.id,
  );
  expect(saved.items).toHaveLength(12);
  expect(
    saved.items
      .filter((seat) => seat.seatType === "VIP")
      .every((seat) => seat.seatRow === "B" && seat.priceModifier === "1.20"),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("admin catalogue pages are bounded and server-side search finds archived films on later pages", async ({
  page,
}) => {
  await adminSession(page);
  await expect(page.locator(".admin-list-panel tbody tr")).toHaveCount(25);
  const target = fixture().prefix + "-archive-27";
  const response = page.waitForResponse(
    (res) =>
      res.url().includes("/movies?") &&
      new URL(res.url()).searchParams.get("keyword") === target,
  );
  await page
    .getByRole("searchbox", { name: "Tìm trong danh mục quản trị" })
    .fill(target);
  expect((await response).status()).toBe(200);
  await expect(page.locator(".admin-list-panel tbody tr")).toHaveCount(1);
  await expect(page.locator(".admin-list-panel tbody")).toContainText(target);
  await expect(page.locator(".admin-list-panel tbody")).toContainText(
    "Ngừng chiếu",
  );
  await page
    .getByRole("searchbox", { name: "Tìm trong danh mục quản trị" })
    .fill("");
  await expect(page.locator(".admin-list-panel tbody tr")).toHaveCount(25);
  await page
    .locator(".admin-list-panel")
    .getByRole("button", { name: "Trang sau", exact: true })
    .click();
  await expect(page.locator(".workspace-pagination")).toContainText("Trang 2");
  await expect(page.locator(".admin-list-panel tbody tr")).not.toHaveCount(0);
});

test("searchable cinema picker keeps quick booking and schedule in the same context", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/dat-ve");
  await page
    .getByRole("combobox", { name: "Rạp trong lịch chiếu", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill(data.cinema.name);
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await dialog
    .locator(`[role="option"][data-value="${data.cinema.id}"]`)
    .click();
  await expect(
    page.getByRole("combobox", { name: "Chọn cụm rạp", exact: true }),
  ).toHaveAttribute("data-value", data.cinema.id);
  await page
    .locator(".timeline-film-list [role=tab]")
    .filter({ hasText: "Dune" })
    .first()
    .click();
  await expect(
    page.getByRole("combobox", { name: "Chọn phim", exact: true }),
  ).toHaveAttribute("data-value", data.movie.id);
  const day = new Date(data.programmeShowtimes[0].startTime).toLocaleDateString(
    "en-CA",
    { timeZone: "Asia/Ho_Chi_Minh" },
  );
  await chooseDate(page, "Chọn ngày xa trong lịch chiếu", day);
  await expect(
    page.getByRole("button", { name: "Chọn ngày chiếu", exact: true }),
  ).toHaveAttribute("data-value", day);
  await chooseOption(page, "Chọn suất chiếu", data.programmeShowtimes[0].id);
  await expect(page.locator(".booking-choice-summary")).toContainText(
    data.movie.title,
  );
  await expect(page.locator(".booking-choice-summary")).toContainText(
    data.cinema.name,
  );
});

test("film detail links survive direct reload and open the correct film and venue", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/phim");
  await page
    .locator(
      `.discovery-film[data-movie-id="${data.movie.id}"] .poster-image-button`,
    )
    .click();
  await expect(page).toHaveURL(new RegExp(`/phim/${data.movie.id}$`));
  await expect(page.locator(".movie-page h1")).toHaveText(data.movie.title);
  await page.reload();
  await expect(page.locator(".movie-page h1")).toHaveText(data.movie.title);
  const venue = page
    .locator(".movie-page-venues a")
    .filter({ hasText: data.cinema.name });
  await venue.click();
  await expect(page).toHaveURL(
    new RegExp(`cinema=${data.cinema.id}&movie=${data.movie.id}`),
  );
  await expect(
    page.getByRole("combobox", { name: "Chọn phim", exact: true }),
  ).toHaveAttribute("data-value", data.movie.id);
  await expect(
    page.getByRole("combobox", { name: "Rạp trong lịch chiếu", exact: true }),
  ).toHaveAttribute("data-value", data.cinema.id);
});

test("mobile choices retain full labels, keyboard focus and a Vietnamese calendar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dat-ve");
  const trigger = page.getByRole("combobox", {
    name: "Rạp trong lịch chiếu",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("textbox").fill("khongcotenrapnay");
  await expect(
    page.getByText("Chưa có lựa chọn phù hợp. Thử tên khác hoặc xóa từ khóa."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await chooseOption(page, "Chọn cụm rạp", fixture().cinema.id);
  await chooseOption(page, "Chọn phim", fixture().presaleMovie.id);
  await page
    .getByRole("button", { name: "Chọn ngày chiếu", exact: true })
    .click();
  await expect(page.locator(".rdp-caption_label")).toContainText(/tháng/i);
  expect(
    await page.locator(".rdp-day_button:disabled").count(),
  ).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
});

test("support search and contact destinations have distinct useful content", async ({
  page,
}) => {
  await page.goto("/ho-tro");
  await page
    .getByRole("textbox", { name: "Tìm câu hỏi hỗ trợ" })
    .fill("5 phút");
  await expect(page.locator(".faq-list details")).not.toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Tìm câu hỏi hỗ trợ" })
    .fill("chuakhongcocauhoi");
  await expect(
    page.getByRole("status").filter({ hasText: "Chưa có câu hỏi phù hợp" }),
  ).toBeVisible();
  await page.goto("/lien-he");
  await expect(page.locator(".contact-workspace")).toContainText(
    "Kiểm tra đơn & vé",
  );
  await expect(
    page.locator(".contact-venue").filter({ hasText: fixture().cinema.name }),
  ).toBeVisible();
  await expect(page.locator(".faq-list")).toHaveCount(0);
});

test("sign-in resumes the selected screening and seat zoom leaves API seat identity unchanged", async ({
  page,
}) => {
  const data = fixture();
  await page.goto("/dat-ve");
  await chooseOption(page, "Rạp trong lịch chiếu", data.cinema.id);
  await page.locator(".timeline-show").first().click();
  await expect(page.locator(".auth-form")).toBeVisible();
  await page
    .getByLabel("Email", { exact: true })
    .fill(data.accounts.customer.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(data.password);
  await page
    .getByRole("button", { name: "Đăng nhập ngay", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Chọn ghế & đặt vé" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Phóng to sơ đồ ghế" }).click();
  await expect(dialog.locator(".seat-map-controls")).toContainText("110%");
  await dialog.getByRole("button", { name: "Toàn cảnh sơ đồ ghế" }).click();
  await expect(dialog.locator(".seat-map-controls")).toContainText("100%");
  await expect(
    dialog.getByRole("button", { name: "Ghế A1, còn trống", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
});
