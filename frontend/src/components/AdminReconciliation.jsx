import { useEffect, useRef, useState, useMemo } from "react";
import { Search, RefreshCw, TicketCheck } from "lucide-react";
import { read, readCommand } from "@/api/client.js";
import { uniqueRecords } from "@/uniqueRecords.js";
import { money } from "@/data.js";

const labels = {
  PAID: "Đã thanh toán",
  HOLDING: "Đang giữ ghế",
  PENDING: "Đang chờ",
  EXPIRED: "Đã hết hạn",
  CANCELLED: "Đã hủy",
  FAILED: "Thất bại",
  SUCCESS: "Thành công",
};
export default function AdminReconciliation() {
  const [reference, setReference] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const request = useRef(0);
  const payments = useMemo(
    () => uniqueRecords(result?.payments, "transactionCode"),
    [result],
  );
  const delivery = useMemo(() => uniqueRecords(result?.delivery), [result]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function lookup(event) {
    event.preventDefault();
    const version = ++request.current;
    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);
    try {
      const data = await read(
        `/admin/payments/reconciliation?${new URLSearchParams({ reference: reference.trim() })}`,
      );
      if (version === request.current) setResult(data);
    } catch (cause) {
      if (version === request.current) setError(cause.message);
    } finally {
      if (version === request.current) setBusy(false);
    }
  }
  async function recover() {
    if (!result?.canRecoverTicket || busy) return;
    const version = ++request.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const recovery = await readCommand(
        `/admin/payments/${result.bookingId}/recover-ticket`,
      );
      if (version !== request.current) return;
      setNotice(
        recovery.queued
          ? "Đã tiếp nhận yêu cầu khôi phục. Hãy kiểm tra lại trạng thái vé sau giây lát."
          : "Vé đã được phát hành trước đó.",
      );
      const current = await read(
        `/admin/payments/reconciliation?${new URLSearchParams({ reference: result.orderCode })}`,
      );
      if (version === request.current) setResult(current);
    } catch (cause) {
      if (version === request.current) setError(cause.message);
    } finally {
      if (version === request.current) setBusy(false);
    }
  }
  return (
    <section className="admin-audit" aria-label="Đối soát thanh toán">
      <div className="workspace-heading">
        <div>
          <p className="nova-kicker">GIAO DỊCH & PHÁT HÀNH VÉ</p>
          <h2>
            <TicketCheck size={26} /> Đối soát thanh toán
          </h2>
          <p>Tra cứu bằng mã đơn NOVA hoặc mã giao dịch NOVA-SB.</p>
        </div>
      </div>
      <form
        className="workspace-toolbar admin-reconciliation-search"
        onSubmit={lookup}
      >
        <label className="min-w-0 flex-1">
          Mã đơn / mã giao dịch
          <input
            aria-label="Mã đơn hoặc mã giao dịch"
            className="w-full min-w-0"
            required
            maxLength={96}
            disabled={busy}
            value={reference}
            placeholder="NOVA-… hoặc NOVA-SB-…"
            onChange={(event) => {
              setReference(event.target.value);
              setResult(null);
              setNotice("");
              setError("");
            }}
          />
        </label>
        <button className="button button-primary" disabled={busy} type="submit">
          <Search size={18} />
          {busy ? "Đang xử lý…" : "Tra cứu giao dịch"}
        </button>
      </form>
      {error && (
        <p role="alert" className="workspace-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {result && (
        <div className="space-y-5 min-w-0" aria-live="polite">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt>Mã đơn</dt>
              <dd className="break-all">{result.orderCode}</dd>
            </div>
            <div>
              <dt>Trạng thái đơn</dt>
              <dd>{labels[result.bookingStatus] || result.bookingStatus}</dd>
            </div>
            <div>
              <dt>Số tiền xác nhận</dt>
              <dd>{money(result.amount)}</dd>
            </div>
            <div>
              <dt>Vé điện tử</dt>
              <dd>
                {result.ticket
                  ? result.ticket.isCheckedIn
                    ? "Đã soát vé"
                    : "Đã phát hành"
                  : "Chưa phát hành"}
              </dd>
            </div>
          </dl>
          {payments.length ? (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã giao dịch</th>
                    <th>Trạng thái</th>
                    <th>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.transactionCode}>
                      <td className="break-all">{payment.transactionCode}</td>
                      <td>{labels[payment.status] || payment.status}</td>
                      <td>{money(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Đơn chưa tạo giao dịch thanh toán.</p>
          )}
          {delivery.length > 0 && (
            <ul className="space-y-2">
              {delivery.map((item) => (
                <li key={item.id}>
                  {item.eventType === "booking.ticket.requested"
                    ? "Phát hành QR"
                    : "Email xác nhận"}
                  :{" "}
                  {item.processedAt
                    ? item.eventType === "ticket.email.requested"
                      ? "Máy chủ SMTP đã tiếp nhận"
                      : "Đã xử lý"
                    : item.lastError
                      ? "Đang chờ thử lại"
                      : "Trong hàng đợi"}{" "}
                  · {item.attempts} lần xử lý
                </li>
              ))}
            </ul>
          )}
          {result.canRecoverTicket && (
            <button
              className="button button-primary w-full max-w-full"
              disabled={busy}
              onClick={recover}
            >
              <RefreshCw size={18} />
              Khôi phục phát hành vé
            </button>
          )}
          {!result.ticket && !result.canRecoverTicket && (
            <p>
              Chưa đủ điều kiện phát hành vé. Kiểm tra kết quả giao dịch tại
              cổng Sandbox; nếu thiếu callback, gửi lại callback có chữ ký hợp
              lệ.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
