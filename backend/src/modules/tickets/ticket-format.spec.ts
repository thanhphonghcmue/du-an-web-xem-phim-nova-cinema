import { notificationSettings } from "../../config/notification.settings";
import { withinCheckInWindow } from "./ticket-format";
describe("Phase9 QR, check-in boundaries and notification config", () => {
  const start = new Date("2042-01-01T10:00:00.000Z");
  it.each([
    [-3600001, false],
    [-3600000, true],
    [0, true],
    [1800000, true],
    [1800001, false],
  ])("checks the inclusive server-time boundary %i ms", (offset, accepted) => {
    expect(
      withinCheckInWindow(new Date(start.getTime() + offset), start, 60, 30),
    ).toBe(accepted);
  });
  it("supports a zero-width window and never accepts an adjacent millisecond", () => {
    expect(withinCheckInWindow(start, start, 0, 0)).toBe(true);
    expect(
      withinCheckInWindow(new Date(start.getTime() + 1), start, 0, 0),
    ).toBe(false);
  });
  it("validates SMTP/window settings without printing secret values", () => {
    expect(notificationSettings({})).toMatchObject({
      host: "127.0.0.1",
      port: 1025,
      from: "tickets@nova.local",
      checkInBeforeMinutes: 60,
      checkInAfterMinutes: 30,
    });
    for (const environment of [
      { SMTP_PORT: "0" },
      { SMTP_TIMEOUT_MS: "10001" },
      { SMTP_SECURE: "yes" },
      { SMTP_USER: "demo" },
      { SMTP_PASS: "private" },
      { SMTP_FROM: "invalid\r\nBcc:other@example.test" },
      { CHECK_IN_BEFORE_MINUTES: "-1" },
      { CHECK_IN_AFTER_MINUTES: "1441" },
    ])
      expect(() => notificationSettings(environment)).toThrow();
  });
});
