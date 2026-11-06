// Chỉ bóc dữ liệu, không tải URL và không suy ra vé từ tên file ảnh.
function extractNormalizedCode(rawInput) {
  if (typeof rawInput !== "string") return "";
  let str = rawInput.trim();
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const obj = JSON.parse(str);
      const found =
        obj.ticketCode ||
        obj.ticketHash ||
        obj.orderCode ||
        obj.shortCode ||
        obj.code ||
        obj.id;
      if (typeof found === "string") str = found.trim();
    } catch {
      /* Chuỗi JSON hỏng vẫn được tra như mã không tồn tại. */
    }
  }
  try {
    const url = new URL(str);
    if (["https:", "http:"].includes(url.protocol)) {
      const keys = ["ticketHash", "hash", "ticketCode", "shortCode", "code"];
      str =
        url.hash.slice(1) ||
        keys.map((k) => url.searchParams.get(k)).find(Boolean) ||
        decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    }
  } catch {
    /* Nhập tay không bắt buộc là URL. */
  }
  if (/^TICKET:/i.test(str)) str = str.slice(7);
  if (/^NV-[A-HJ-NP-Z2-9]{8}$/i.test(str)) str = str.slice(3);
  return str.trim().toUpperCase();
}
module.exports = { extractNormalizedCode };
