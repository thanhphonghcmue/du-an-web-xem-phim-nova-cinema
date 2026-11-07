export const comboTastes = [
  ["all", "Tất cả"],
  ["NGỌT", "Ngọt Caramel"],
  ["PHÔ_MAI", "Phô Mai Hoàng Kim"],
  ["MẶN", "Mặn Truyền Thống"],
  ["MIX", "Mix 2 vị"],
];
export function recommended(combo, count) {
  return (
    (count === 1
      ? combo.badgeLabel === "SOLO"
      : count === 2
        ? combo.badgeLabel === "COUPLE"
        : count >= 3 &&
          combo.badgeLabel === "PARTY" &&
          (combo.suggestedMinSeats ?? 1) >= 3) &&
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
            ? ["NGỌT", "CARAMEL"].includes(normalizedTasteTag(c.tasteTag))
            : normalizedTasteTag(c.tasteTag) === taste)),
    )
    .sort((a, b) => {
      const score = (c) =>
        (recommended(c, count) &&
        c.name ===
          (count === 1
            ? "Single / Solo Combo"
            : count === 2
              ? "Couple Combo"
              : "Party Combo 69K")
          ? 1000
          : 0) +
        (count >= 3 &&
        recommended(c, count) &&
        c.badgeLabel === "PARTY" &&
        Number(c.price) === 69000
          ? 100
          : 0) +
        (recommended(c, count) ? 10 : 0);
      return score(b) - score(a);
    });
}

export function comboTasteLabel(combo) {
  return (
    {
      NGỌT: "Ngọt",
      CARAMEL: "Ngọt Caramel",
      PHÔ_MAI: "Phô Mai Hoàng Kim",
      MẶN: "Mặn Truyền Thống",
      MIX: "Mix 2 Vị (Ngọt & Phô Mai)",
    }[normalizedTasteTag(combo.tasteTag)] || "Theo thực đơn"
  );
}
export function recommendationBadge(count) {
  return count === 1
    ? "✨ GỢI Ý CHO 1 VÉ: SINGLE / SOLO COMBO"
    : count === 2
      ? "💑 GỢI Ý CHO 2 VÉ: COUPLE COMBO"
      : `🔥 ƯU TIÊN NỔI BẬT CHO NHÓM ${count} VÉ: PARTY COMBO`;
}

export function normalizedTasteTag(tag) {
  return (
    {
      "Ngọt Caramel": "CARAMEL",
      "Phô Mai Hoàng Kim": "PHÔ_MAI",
      "Mix 2 Vị (Ngọt & Phô Mai)": "MIX",
    }[tag] || tag
  );
}
