export const comboTastes = [
  ["all", "Tất cả"],
  ["NGỌT", "Ngọt Caramel"],
  ["PHÔ_MAI", "Phô Mai"],
  ["MẶN", "Mặn Truyền Thống"],
  ["MIX", "Mix 2 vị"],
];
export function recommended(combo, count) {
  return (
    (count === 1
      ? combo.badgeLabel === "SOLO"
      : count === 2
        ? combo.badgeLabel === "COUPLE"
        : count >= 3 && combo.badgeLabel === "PARTY") &&
    count >= (combo.suggestedMinSeats ?? 1) &&
    (combo.suggestedMaxSeats == null || count <= combo.suggestedMaxSeats)
  );
}
export function rankedCombos(combos, count, taste) {
  return [...combos]
    .filter(
      (c) =>
        c.isActive !== false &&
        (taste === "all" ||
          (taste === "NGỌT"
            ? ["NGỌT", "CARAMEL"].includes(c.tasteTag)
            : c.tasteTag === taste)),
    )
    .sort((a, b) => {
      const score = (c) =>
        (count >= 3 &&
        recommended(c, count) &&
        c.badgeLabel === "PARTY" &&
        Number(c.price) === 69000
          ? 100
          : 0) + (recommended(c, count) ? 10 : 0);
      return score(b) - score(a);
    });
}
