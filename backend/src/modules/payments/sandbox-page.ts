import { SignedCheckoutDto } from "./payment.dto";
export function sandboxPage(
  payload: SignedCheckoutDto,
  canPay: boolean,
  state: string,
): string {
  const fields = [
    "bookingId",
    "orderCode",
    "transactionCode",
    "amount",
    "timestamp",
    "returnUrl",
    "signature",
  ] as const;
  const hidden = fields
    .map(
      (key) =>
        `<input type="hidden" name="${key}" value="${escapeHtml(payload[key])}">`,
    )
    .join("");
  const buttons = canPay
    ? `<form method="post" action="/api/v1/payments/sandbox/complete">${hidden}<button name="result" value="SUCCESS">Thanh toán thành công</button><button name="result" value="FAILED">Mô phỏng thất bại</button><button name="result" value="CANCELLED">Hủy thanh toán</button></form>`
    : "<p>Phiên này đã kết thúc hoặc hết hạn giữ ghế.</p>";
  return page(
    `<p class="brand">NOVA CINEMA · SANDBOX</p><h1>Thanh toán mô phỏng</h1><p>Không thu tiền thật. Không nhập thông tin thẻ hoặc tài khoản ngân hàng.</p><dl><dt>Mã đơn</dt><dd>${escapeHtml(payload.orderCode)}</dd><dt>Tổng tiền</dt><dd>${escapeHtml(payload.amount)} VND</dd><dt>Trạng thái đơn</dt><dd>${escapeHtml(state)}</dd></dl>${buttons}<a href="${escapeHtml(payload.returnUrl)}">Quay lại ứng dụng</a>`,
  );
}
export function sandboxResult(returnUrl: string, state: string): string {
  return page(
    `<p class="brand">NOVA CINEMA · SANDBOX</p><h1>Kết quả: ${escapeHtml(state)}</h1><p>Ứng dụng cần đọc API trạng thái để xác nhận kết quả của đơn hàng.</p><a href="${escapeHtml(returnUrl)}">Quay lại ứng dụng</a>`,
  );
}
function page(content: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NOVA Cinema — Sandbox</title><style>body{margin:0;background:#0b0e14;color:#fff;font:16px/1.6 system-ui;display:grid;min-height:100vh;place-items:center}main{width:min(560px,85vw);padding:32px;background:#141a24;border:1px solid #ffffff20;border-radius:24px}.brand,a{color:#f5c518}h1{line-height:1.2}p,dt{color:#94a3b8}dd{margin:0 0 12px;overflow-wrap:anywhere}form{display:grid;gap:12px;margin:24px 0}button{padding:14px;border:1px solid #ffffff30;border-radius:12px;background:#202a39;color:white;font:inherit;cursor:pointer}button:first-of-type{background:#b50e19}a{display:inline-block;margin-top:12px}</style></head><body><main>${content}</main></body></html>`;
}
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || "",
  );
}
