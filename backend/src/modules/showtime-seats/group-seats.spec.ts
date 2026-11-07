import { SeatType } from "@prisma/client";
import { findGroupSeats, GroupCandidate } from "./group-seats";
function row(
  label: string,
  columns: number[],
  type: SeatType = "STANDARD",
): GroupCandidate[] {
  return columns.map((column) => ({
    seatId: `${label}${String(column)}`,
    row: label,
    column,
    type,
    status: "AVAILABLE",
  }));
}
describe("group seat sliding windows", () => {
  it("selects a centered contiguous window and preserves input order", () => {
    const seats = row("A", [8, 1, 7, 2, 6, 3, 5, 4]);
    const before = [...seats];
    expect(findGroupSeats(seats, 3)).toEqual(["A3", "A4", "A5"]);
    expect(seats).toEqual(before);
  });
  it("uses physical row center, including unavailable end seats", () => {
    const seats = row("A", [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const seat of seats) if (seat.column <= 2) seat.status = "SOLD";
    expect(findGroupSeats(seats, 1)).toEqual(["A5"]);
  });
  it("never crosses a sold or held seat", () => {
    const seats = row("A", [1, 2, 3, 4, 5, 6, 7]);
    for (const seat of seats) if (seat.column === 4) seat.status = "SOLD";
    expect(findGroupSeats(seats, 4)).toEqual([]);
    expect(findGroupSeats(seats, 3)).toEqual(["A1", "A2", "A3"]);
  });
  it("never bridges missing physical columns or crosses rows", () => {
    expect(
      findGroupSeats([...row("A", [1, 2, 4, 5]), ...row("B", [1, 2])], 3),
    ).toEqual([]);
  });
  it("filters all seats by requested type without jumping across other types", () => {
    const seats = [
      ...row("A", [1, 2, 3, 4], "STANDARD"),
      ...row("B", [1, 2, 3, 4], "VIP"),
    ];
    expect(findGroupSeats(seats, 2, "VIP")).toEqual(["B2", "B3"]);
    expect(findGroupSeats(seats, 1, "SWEETBOX")).toEqual([]);
  });
  it("ranks distance before row label and uses row/column tie breakers", () => {
    expect(
      findGroupSeats(
        [...row("B", [1, 2, 3, 4, 5, 6, 7]), ...row("A", [1, 2, 3, 4])],
        3,
      ),
    ).toEqual(["B3", "B4", "B5"]);
    expect(
      findGroupSeats([...row("B", [1, 2, 3, 4]), ...row("A", [1, 2, 3, 4])], 2),
    ).toEqual(["A2", "A3"]);
  });
  it.each([0, 21, -1, 1.5])("rejects invalid quantity %s", (quantity) => {
    expect(findGroupSeats(row("A", [1, 2, 3]), quantity)).toEqual([]);
  });
  it("suggests only complete Sweetbox pairs, excluding orphan or held halves", () => {
    const seats = row("H", [1, 2, 3, 4], "SWEETBOX");
    expect(findGroupSeats(seats, 1, "SWEETBOX")).toEqual([]);
    expect(findGroupSeats(seats, 3)).toEqual([]);
    expect(findGroupSeats(seats, 2)).toEqual(["H1", "H2"]);
    expect(findGroupSeats(seats.slice(1), 2)).toEqual(["H3", "H4"]);
    expect(
      findGroupSeats(
        seats.map((s) => (s.column === 2 ? { ...s, status: "HOLDING" } : s)),
        2,
      ),
    ).toEqual(["H3", "H4"]);
  });
  it("FR11 prioritizes central rows and joins exactly two adjacent rows for twenty guests", () => {
    const seats = Array.from("ABCDEFGHIJ").flatMap((label) =>
      row(
        label,
        Array.from({ length: 14 }, (_, i) => i + 1),
      ),
    );
    for (const quantity of [1, 2, 5])
      expect(
        findGroupSeats(seats, quantity).every(
          (id) => id.startsWith("E") || id.startsWith("F"),
        ),
      ).toBe(true);
    const group = findGroupSeats(seats, 20);
    expect(group).toHaveLength(20);
    expect(new Set(group).size).toBe(20);
    expect([...new Set(group.map((id) => id[0]))]).toEqual(["E", "F"]);
    expect(
      findGroupSeats(
        [...row("E", [1, 2, 3, 4, 5, 6]), ...row("G", [1, 2, 3, 4, 5, 6])],
        10,
      ),
    ).toEqual([]);
  });
  it("joins adjacent central runs for a large group when occupied seats split longer rows", () => {
    const seats = Array.from("ABCDEFGHIJ")
      .flatMap((label) =>
        row(
          label,
          Array.from({ length: 24 }, (_, i) => i + 1),
        ),
      )
      .map((seat) => ({
        ...seat,
        status: seat.column === 12 ? "SOLD" : "AVAILABLE",
      }));
    const group = findGroupSeats(seats, 20);
    expect(group).toHaveLength(20);
    expect(new Set(group.map((id) => id[0]))).toEqual(new Set(["E", "F"]));
    expect(
      group.every(
        (id) =>
          seats.find((seat) => seat.seatId === id)?.status === "AVAILABLE",
      ),
    ).toBe(true);
  });
  it("handles empty/full rooms and a 20-seat window", () => {
    expect(findGroupSeats([], 1)).toEqual([]);
    expect(
      findGroupSeats(
        row("A", [1]).map((seat) => ({ ...seat, status: "SOLD" })),
        1,
      ),
    ).toEqual([]);
    expect(
      findGroupSeats(
        row(
          "A",
          Array.from({ length: 20 }, (_, i) => i + 1),
        ),
        20,
      ),
    ).toHaveLength(20);
  });
  it("recommends available contiguous seats even when a single gap remains", () => {
    for (let mask = 0; mask < 256; mask++) {
      const seats = row("A", [1, 2, 3, 4, 5, 6, 7, 8]).map((seat, index) => ({
        ...seat,
        status: mask & (1 << index) ? "HOLDING" : "AVAILABLE",
      }));
      for (let quantity = 1; quantity <= 8; quantity++) {
        const suggestion = findGroupSeats(seats, quantity);
        const candidates = seats
          .slice(0, 9 - quantity)
          .map((_, start) => seats.slice(start, start + quantity))
          .filter((window) =>
            window.every((seat) => seat.status === "AVAILABLE"),
          );
        expect(suggestion.length > 0).toBe(candidates.length > 0);
        if (suggestion.length) {
          expect(suggestion).toHaveLength(quantity);
          expect(
            suggestion.every(
              (id) =>
                seats.find((seat) => seat.seatId === id)?.status ===
                "AVAILABLE",
            ),
          ).toBe(true);
        }
      }
    }
  });
});
