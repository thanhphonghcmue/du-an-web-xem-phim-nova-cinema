import { revenueFilters, serializeRevenue } from "./reports.service";
describe("Phase10 revenue range and exact JSON representation", () => {
  it("converts an inclusive leap day in Vietnam to a half-open UTC interval", () => {
    const filters = revenueFilters({ from: "2024-02-29", to: "2024-02-29" });
    expect(filters.fromInclusive.toISOString()).toBe(
      "2024-02-28T17:00:00.000Z",
    );
    expect(filters.toExclusive.toISOString()).toBe("2024-02-29T17:00:00.000Z");
  });
  it("includes the whole final day across a year boundary", () => {
    const filters = revenueFilters({ from: "2025-12-31", to: "2026-01-01" });
    expect(filters.fromInclusive.toISOString()).toBe(
      "2025-12-30T17:00:00.000Z",
    );
    expect(filters.toExclusive.toISOString()).toBe("2026-01-01T17:00:00.000Z");
  });
  it("rejects a reversed range", () => {
    expect(() =>
      revenueFilters({ from: "2026-02-01", to: "2026-01-31" }),
    ).toThrow("ordered inclusive calendar-day range");
  });
  it("preserves fractional totals and values above JS safe integer precision as fixed2 strings", () => {
    expect(
      serializeRevenue({
        ticketRevenue: "9999999999999900",
        comboRevenue: "0.30",
        discountAmount: "0.03",
        netRevenue: "9999999999999900.27",
        paidBookingCount: "10000",
        ticketCount: "20000",
      }),
    ).toEqual({
      ticketRevenue: "9999999999999900.00",
      comboRevenue: "0.30",
      discountAmount: "0.03",
      netRevenue: "9999999999999900.27",
      paidBookingCount: 10000,
      ticketCount: 20000,
    });
  });
  it("fails instead of returning unsafe or fractional JSON counts", () => {
    for (const value of ["9007199254740992", "-1", "1.5", "NaN"])
      expect(() =>
        serializeRevenue({
          ticketRevenue: "0",
          comboRevenue: "0",
          discountAmount: "0",
          netRevenue: "0",
          paidBookingCount: value,
          ticketCount: "0",
        }),
      ).toThrow("safe JSON integer range");
  });
});
