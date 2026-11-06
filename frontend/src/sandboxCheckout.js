const fields = [
  "bookingId",
  "orderCode",
  "transactionCode",
  "amount",
  "timestamp",
  "returnUrl",
  "signature",
];

// Chỉ nhận capability do API cấp cho đúng đơn. Backend vẫn xác minh chữ ký/giá/hạn.
export function sandboxCheckout(url, order) {
  const target = new URL(url);
  if (
    target.pathname !== "/api/v1/payments/sandbox" ||
    target.username ||
    target.password
  )
    throw new Error("Đường dẫn thanh toán không hợp lệ.");
  const payload = Object.fromEntries(
    fields.map((key) => [key, target.searchParams.get(key)]),
  );
  if (
    fields.some(
      (key) => !payload[key] || target.searchParams.getAll(key).length !== 1,
    ) ||
    payload.bookingId !== order.id ||
    payload.orderCode !== order.orderCode ||
    Number(payload.amount) !== Number(order.finalAmount)
  )
    throw new Error(
      "Thông tin thanh toán không khớp đơn đang giữ. Hãy kiểm tra lại đơn.",
    );
  return payload;
}
