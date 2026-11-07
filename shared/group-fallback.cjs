// FR11: nhóm lớn có thể ghép hai hàng kề nhau khi không còn cụm đủ chỗ trên một hàng.
function twoRowGroup(seats, quantity, type) {
  const rows = new Map();
  for (const seat of seats) {
    if (!rows.has(seat.row)) rows.set(seat.row, []);
    rows.get(seat.row).push(seat);
  }
  const labels = [...rows.keys()].sort();
  const maximum = Math.max(0, ...[...rows.values()].map((row) => row.length));
  if (
    !Number.isInteger(quantity) ||
    (quantity < 10 && quantity <= maximum) ||
    quantity > 20
  )
    return [];
  const windows = (row, n) => {
    const ordered = [...row].sort((a, b) => a.column - b.column),
      result = [];
    for (let start = 0; start + n <= ordered.length; start++) {
      const part = ordered.slice(start, start + n);
      if (
        part.some(
          (s, i) =>
            s.status !== "AVAILABLE" ||
            (type && s.type !== type) ||
            (i && s.column !== part[i - 1].column + 1),
        )
      )
        continue;
      if (
        part.some(
          (s) =>
            s.type === "SWEETBOX" &&
            !part.some(
              (p) =>
                p.type === "SWEETBOX" &&
                p.column === (s.column % 2 ? s.column + 1 : s.column - 1),
            ),
        )
      )
        continue;
      result.push(part);
    }
    return result;
  };
  let best = [],
    score = Infinity;
  for (let i = 0; i < labels.length - 1; i++) {
    if (
      labels[i].length !== 1 ||
      labels[i + 1].charCodeAt(0) !== labels[i].charCodeAt(0) + 1
    )
      continue;
    const a = rows.get(labels[i]),
      b = rows.get(labels[i + 1]);
    for (let left = 1; left < quantity; left++)
      for (const first of windows(a, left))
        for (const second of windows(b, quantity - left)) {
          const center = (row) =>
            (Math.min(...row.map((s) => s.column)) +
              Math.max(...row.map((s) => s.column))) /
            2;
          const distance =
            Math.abs(i + 0.5 - (labels.length - 1) / 2) * 100 +
            Math.abs(center(first) - center(a)) +
            Math.abs(center(second) - center(b)) +
            Math.abs(left - quantity / 2);
          if (distance < score) {
            score = distance;
            best = [...first, ...second].map((s) => s.seatId);
          }
        }
  }
  return best;
}
module.exports = { twoRowGroup };
