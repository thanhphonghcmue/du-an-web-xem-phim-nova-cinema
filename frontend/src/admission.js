const qrHash = /^[a-f0-9]{64}$/i;
const orderCode = /^NOVA-[a-f0-9]{16,32}$/i;
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function normalize(value) {
  if (qrHash.test(value) || uuid.test(value)) return value.toLowerCase();
  const short = /^(?:NV-)?([A-HJ-NP-Z2-9]{8})$/i.exec(value);
  if (short) return short[1].toUpperCase();
  if (orderCode.test(value)) return value.toUpperCase();
  return null;
}

export function extractCode(input) {
  if (typeof input !== "string") return "";
  const value = input.trim();
  const direct = normalize(value);
  if (direct) return direct;
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol)) {
      const fragment = normalize(url.hash.slice(1));
      if (fragment) return fragment;
      for (const key of ["ticketHash", "hash", "ticketCode", "code"]) {
        const found = normalize(url.searchParams.get(key) || "");
        if (found) return found;
      }
    }
  } catch {
    // Giữ đầu vào sai để server trả lỗi validation; không cắt một phần thành vé khác.
  }
  return value;
}

export function admissionTicket(data) {
  if (
    !data ||
    !["movie", "cinema", "room", "orderCode"].every(
      (key) => typeof data[key] === "string" && data[key].trim(),
    ) ||
    typeof data.startTime !== "string" ||
    !Number.isFinite(Date.parse(data.startTime)) ||
    !Array.isArray(data.seats) ||
    !data.seats.length ||
    !data.seats.every(
      (seat) => typeof seat?.label === "string" && seat.label.trim(),
    )
  ) {
    const error = new Error(
      "Máy chủ chưa trả đủ thông tin vé. Hãy kiểm tra lại trạng thái vé trước khi xác nhận vào rạp.",
    );
    error.code = "TICKET_RESPONSE_INVALID";
    throw error;
  }
  return data;
}
