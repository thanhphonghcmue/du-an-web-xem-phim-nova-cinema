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
    ? `<div class="sandbox-choice"><span class="section-label">CHỌN KỊCH BẢN MÔ PHỎNG</span><h2>Sẵn sàng cho buổi hẹn?</h2><p>Chọn một kết quả để tiếp tục. Giá và thời hạn giữ ghế vẫn được kiểm tra khi xác nhận.</p><form method="post" action="/api/v1/payments/sandbox/complete">${hidden}<button name="result" value="SUCCESS"><span>Thanh toán thành công</span><b aria-hidden="true">↗</b></button><div class="secondary-actions"><button name="result" value="FAILED">Mô phỏng thất bại</button><button name="result" value="CANCELLED">Hủy thanh toán</button></div></form><div class="trust-note">Không yêu cầu thẻ, OTP hoặc chuyển khoản ngân hàng.</div></div>`
    : '<div class="sandbox-choice"><h2>Phiên thanh toán đã kết thúc.</h2><p>Phiên này đã kết thúc hoặc hết hạn giữ ghế. Quay lại ứng dụng để xem trạng thái và chọn suất mới.</p></div>';
  return page(
    `<header class="sandbox-hero"><p class="brand">NOVA CINEMA <span>/ SANDBOX</span></p><h1>Thanh toán mô phỏng</h1><p>Một bước nữa tới màn ảnh lớn.</p><span class="secure-pill">MÔ PHỎNG · KHÔNG THU TIỀN THẬT</span></header><div class="sandbox-body"><aside class="order-summary"><span class="section-label">CHI TIẾT GIAO DỊCH</span><dl><dt>Mã đơn</dt><dd>${escapeHtml(payload.orderCode)}</dd><dt>Tổng thanh toán</dt><dd class="total">${escapeHtml(payload.amount)} <small>VND</small></dd><dt>Trạng thái đơn</dt><dd><span class="status">${escapeHtml(state)}</span></dd></dl><p class="summary-note">Chỉ khi thanh toán thành công, đơn mới được xác nhận và quá trình phát hành vé QR bắt đầu.</p></aside>${buttons}</div><footer><a href="${escapeHtml(payload.returnUrl)}">Quay lại ứng dụng</a><span>NOVA · INFINITY EXPERIENCE</span></footer>`,
  );
}
export function sandboxResult(returnUrl: string, state: string): string {
  return page(
    `<header class="sandbox-hero"><p class="brand">NOVA CINEMA <span>/ SANDBOX</span></p><h1>Kết quả: ${escapeHtml(state)}</h1><p>${state === "PAID" ? "Đã ghi nhận kết quả mô phỏng. Hẹn bạn ở màn ảnh lớn." : "Bạn có thể quay lại ứng dụng để xem đơn và tiếp tục khám phá."}</p><span class="secure-pill">MÔ PHỎNG · KHÔNG THU TIỀN THẬT</span></header><div class="result-body"><span class="result-mark" aria-hidden="true">${state === "PAID" ? "✓" : "↗"}</span><h2>${state === "PAID" ? "Cuộc hẹn điện ảnh đang chờ bạn." : "Một lựa chọn mới vẫn đang chờ bạn."}</h2><p>Quay lại ứng dụng để xem trạng thái đơn đã được xác nhận và vé điện tử khi phát hành xong.</p><a class="result-link" href="${escapeHtml(returnUrl)}">Quay lại ứng dụng</a></div>`,
  );
}
function page(content: string): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NOVA Cinema — Sandbox</title><style>
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#262033 0,#090b10 55%);color:#f8f8fc;font:14px/1.7 system-ui,-apple-system,sans-serif;display:grid;min-height:100vh;place-items:center;padding:36px 20px}main{width:min(960px,100%);background:#11151e;border:1px solid #ffffff20;border-radius:16px;overflow:hidden;box-shadow:0 25px 100px #0005}.sandbox-hero{padding:38px 40px;background:linear-gradient(90deg,#0b0e16f2,#0b0e16a6),url('/images/cinema-auditorium.jpg') center/cover;border-bottom:1px solid #ffffff15}.brand{color:#f2c586;letter-spacing:3px;font-weight:750;font-size:13px}.brand span{font-size:10px;color:#a3aaba;letter-spacing:2px}h1{line-height:1.2;font-size:38px;letter-spacing:-1.5px;margin:24px 0 10px}h2{font-size:23px;line-height:1.3;letter-spacing:-.7px}p,dt{color:#a1a9ba}.secure-pill{display:inline-block;margin-top:15px;font-size:9px;letter-spacing:1px;border:1px solid #f2c58655;background:#f2c5860c;color:#eac797;padding:6px 10px;border-radius:4px}.sandbox-body{display:grid;grid-template-columns:1fr 1.2fr}.order-summary{padding:35px 40px;border-right:1px dashed #ffffff25;background:#ffffff02}.section-label{font-size:9px;letter-spacing:2px;color:#eac797;font-weight:700}dl{margin-top:28px}dt{font-size:11px;margin-top:20px}dd{margin:6px 0 20px;overflow-wrap:anywhere;font-weight:650;font-size:14px}.total{font-size:30px;color:#f4c788;font-weight:800;letter-spacing:-.6px}.total small{font-size:12px;letter-spacing:1px}.status{font-size:10px;background:#f4c7880c;border:1px solid #f4c78833;padding:5px 9px;border-radius:4px;color:#eac797}.summary-note{font-size:11px;line-height:1.9;padding-top:18px;border-top:1px solid #ffffff12}.sandbox-choice{padding:35px 38px}.sandbox-choice>p{font-size:12px;line-height:1.9}form{display:grid;gap:12px;margin:27px 0}button{padding:15px 18px;border:1px solid #ffffff22;border-radius:7px;background:#1b202c;color:white;font:600 12px/1.5 system-ui;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:15px}form>button{background:#e51b32;border-color:#e51b32;font-size:13px}button:hover{filter:brightness(1.15)}button:focus-visible,a:focus-visible{outline:2px solid #f4c788;outline-offset:4px}.secondary-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.secondary-actions button{font-size:10px;justify-content:center}.trust-note{color:#8793a7;font-size:10px;padding:13px;border:1px solid #ffffff10;border-radius:5px;background:#ffffff03}a{color:#f4c788;font-size:12px;text-decoration:none}footer{display:flex;justify-content:space-between;gap:20px;padding:20px 40px;border-top:1px solid #ffffff12}footer>span{font-size:9px;color:#747f91;letter-spacing:2px}.result-body{padding:40px;text-align:center}.result-mark{display:grid;place-items:center;background:#f4c78815;color:#f4c788;width:65px;height:65px;font-size:30px;border:1px solid #f4c78844;border-radius:50%;margin:0 auto 24px}.result-body p{max-width:520px;margin:18px auto 25px;font-size:13px}.result-link{display:inline-block;padding:14px 25px;border-radius:7px;background:#e51b32;color:white;font-weight:700}@media(max-width:650px){body{padding:16px 12px}.sandbox-hero{padding:27px 24px}h1{font-size:29px}.sandbox-body{grid-template-columns:1fr}.order-summary{border-right:0;border-bottom:1px dashed #ffffff25;padding:25px}.sandbox-choice{padding:25px}footer{padding:20px 25px}footer>span{display:none}.total{font-size:27px}.result-body{padding:30px 24px}}
</style></head><body><main>${content}</main></body></html>`;
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
