// Local drafts contain quantities only. Price, availability and final money are server-owned.
export function normalizeFoodCart(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([id, quantity]) =>
          id.trim() &&
          typeof quantity === "number" &&
          Number.isFinite(quantity) &&
          quantity >= 1,
      )
      .map(([id, quantity]) => [id, Math.min(20, Math.trunc(quantity))]),
  );
}
export function readFoodCart() {
  if (typeof window === "undefined") return {};
  try {
    return normalizeFoodCart(
      JSON.parse(sessionStorage.getItem("nova-food-cart") || "{}"),
    );
  } catch {
    return {};
  }
}
export function saveFoodCart(cart) {
  if (typeof window === "undefined") return false;
  try {
    sessionStorage.setItem(
      "nova-food-cart",
      JSON.stringify(normalizeFoodCart(cart)),
    );
    return true;
  } catch {
    return false;
  }
}
export function matchesFood(item, query) {
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLocaleLowerCase("vi");
  return normalize(`${item.name} ${item.description} ${item.taste}`).includes(
    normalize(query.trim()),
  );
}
