import { validateNoOrphanSeats, PhysicalSeatCandidate } from "./orphan-seats";

describe("validateNoOrphanSeats", () => {
  const makeRow = (count: number, row = "A"): PhysicalSeatCandidate[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `${row}${String(i + 1)}`,
      seatRow: row,
      seatColumn: i + 1,
    }));

  it("permits picking the edge seat A1 without leaving orphan when remaining row has >= 2 seats", () => {
    const row = makeRow(10);
    const occupied = new Set<string>();
    const requested = new Set(["A1"]);

    const res = validateNoOrphanSeats(row, occupied, requested);
    expect(res.hasOrphan).toBe(false);
  });

  it("rejects picking seat A2 leaving seat A1 as an isolated single seat", () => {
    const row = makeRow(10);
    const occupied = new Set<string>();
    const requested = new Set(["A2"]);

    const res = validateNoOrphanSeats(row, occupied, requested);
    expect(res.hasOrphan).toBe(true);
    expect(res.orphanSeat?.id).toBe("A1");
  });

  it("permits picking seats A1 and A2 together", () => {
    const row = makeRow(10);
    const occupied = new Set<string>();
    const requested = new Set(["A1", "A2"]);

    const res = validateNoOrphanSeats(row, occupied, requested);
    expect(res.hasOrphan).toBe(false);
  });

  it("rejects picking seats A1 and A3 leaving seat A2 isolated in between", () => {
    const row = makeRow(10);
    const occupied = new Set<string>();
    const requested = new Set(["A1", "A3"]);

    const res = validateNoOrphanSeats(row, occupied, requested);
    expect(res.hasOrphan).toBe(true);
    expect(res.orphanSeat?.id).toBe("A2");
  });

  it("rejects picking seat A9 leaving the last seat A10 isolated at the row edge", () => {
    const row = makeRow(10);
    const occupied = new Set<string>();
    const requested = new Set(["A9"]);

    const res = validateNoOrphanSeats(row, occupied, requested);
    expect(res.hasOrphan).toBe(true);
    expect(res.orphanSeat?.id).toBe("A10");
  });

  it("permits picking seat A10 at the far edge leaving seats A1..A9 intact", () => {
    const row = makeRow(10);
    const occupied = new Set<string>();
    const requested = new Set(["A10"]);

    const res = validateNoOrphanSeats(row, occupied, requested);
    expect(res.hasOrphan).toBe(false);
  });

  it("rejects leaving an orphan next to an already occupied seat", () => {
    const row = makeRow(10);
    const occupied = new Set(["A1", "A2"]); // A1, A2 already booked
    const requested = new Set(["A4", "A5"]); // User books A4, A5 -> leaves A3 alone!

    const res = validateNoOrphanSeats(row, occupied, requested);
    expect(res.hasOrphan).toBe(true);
    expect(res.orphanSeat?.id).toBe("A3");
  });
});
