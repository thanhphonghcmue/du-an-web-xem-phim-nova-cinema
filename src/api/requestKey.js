// getRandomValues is available on HTTP LAN origins where randomUUID is not.
// Keep UUID v4 entropy; never substitute Math.random for a booking request key.
export function createRequestKey() {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto?.getRandomValues !== "function")
    throw new Error(
      "Trình duyệt chưa hỗ trợ tạo yêu cầu an toàn. Hãy cập nhật trình duyệt hoặc mở website bằng HTTPS/localhost.",
    );
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((part) => part.join(""))
    .join("-");
}
