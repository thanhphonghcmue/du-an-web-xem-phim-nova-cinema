"use client";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";
import Modal from "./Modal.jsx";
import HoldCountdown from "./HoldCountdown.jsx";
import { money } from "@/data.js";

export default function SandboxGateway({
  testControls,
  allowExpiredConfirmation = false,
  onTestExpire,
  payload,
  order,
  offset,
  busy,
  expired,
  error,
  onExpire,
  onResult,
  onClose,
}) {
  // QR giao dịch mô phỏng không phải VietQR ngân hàng hay QR quyền vào rạp.
  const value = JSON.stringify({
    type: "NOVA_SANDBOX",
    orderCode: payload.orderCode,
    transactionCode: payload.transactionCode,
    amount: payload.amount,
    currency: "VND",
  });
  return (
    <Modal
      className="cinema-state-card cinema-state-cyan sandbox-gateway"
      headerless
      title="Cổng thanh toán Sandbox"
      onClose={busy ? () => {} : onClose}
    >
      {testControls && (
        <button
          type="button"
          className="text-button"
          disabled={busy || expired || allowExpiredConfirmation}
          onClick={onTestExpire}
        >
          ⚡ Giả lập đã qua 5 phút không phản hồi
        </button>
      )}
      <div className="cinema-state-heading">
        <span className="cinema-status-pill">SANDBOX GATEWAY</span>
        <span>Môi trường giả lập</span>
      </div>
      <h2>Xác nhận Thanh toán Giả lập</h2>
      <p className="sandbox-reference">
        Đơn hàng: <strong>{order.orderCode}</strong>
        <br />
        Số tiền: <b>{money(order.finalAmount)}</b>
      </p>
      <div className="sandbox-transaction-qr">
        <QRCodeSVG
          value={value}
          size={188}
          marginSize={4}
          level="M"
          title={`QR giao dịch ${order.orderCode}`}
        />
      </div>
      <p>
        QR chỉ nhận diện giao dịch mô phỏng. Không chuyển tiền hoặc nhập thông
        tin ngân hàng. Chọn kết quả bên dưới để thử luồng đặt vé.
      </p>
      <HoldCountdown
        expiresAt={order.expiredAt}
        offset={offset}
        onExpire={onExpire}
      />
      {error && (
        <p role="alert" className="sandbox-error">
          {error}
        </p>
      )}
      {expired && (
        <p role="alert">
          Đã hết thời gian giữ ghế. Đang đồng bộ trạng thái đơn.
        </p>
      )}
      <div className="cinema-state-actions">
        <button
          type="button"
          className="button button-glass"
          disabled={busy}
          onClick={() => onResult("CANCELLED")}
        >
          Hủy giao dịch
        </button>
        <button
          type="button"
          className="button cinema-success-button"
          aria-label="Thanh toán thành công"
          disabled={busy || (expired && !allowExpiredConfirmation)}
          onClick={() => onResult("SUCCESS")}
        >
          {busy ? "Đang xác nhận…" : "✓ Giả lập Thành công (Paid)"}
        </button>
      </div>
      <button
        type="button"
        className="text-button sandbox-fail-action"
        disabled={busy || expired}
        onClick={() => onResult("FAILED")}
      >
        Mô phỏng thất bại
      </button>
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={onClose}
      >
        <ShieldCheck size={14} /> Quay lại đơn đang giữ
      </button>
    </Modal>
  );
}
