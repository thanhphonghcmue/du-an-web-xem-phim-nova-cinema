"use client";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

function time(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Chưa có giờ";
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function AdmissionStatus({
  ticket,
  result,
  error,
  currentShowtime,
  busy,
  onAdmit,
  onClear,
  onRepeat,
  guidance,
  onGuidance,
  cardRef,
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  if (!ticket && !error) return null;
  const warning = [
    "TICKET_SHOWTIME_MISMATCH",
    "CHECK_IN_OUTSIDE_WINDOW",
  ].includes(error?.code);
  const used = error?.code === "TICKET_ALREADY_USED";
  const details = error?.details;
  const ago =
    error?.at && Number.isFinite(Date.parse(error.at))
      ? Math.max(1, Math.round((now - Date.parse(error.at)) / 60000))
      : null;
  const code = ticket?.ticketCode || details?.ticketCode;
  return (
    <div
      ref={cardRef}
      tabIndex={-1}
      id="staff-alert-box"
      role={error ? "alert" : "status"}
      className={`admission-result cinema-admission-card ${error ? (warning ? "warning cinema-state-amber" : "invalid cinema-state-red") : "valid cinema-state-green"}`}
    >
      <div className="cinema-state-heading">
        <span className="cinema-status-pill">
          {error
            ? warning
              ? `CẢNH BÁO: ${error.code === "TICKET_SHOWTIME_MISMATCH" ? "SAI SUẤT CHIẾU" : "NGOÀI KHUNG GIỜ VÀO RẠP"}`
              : used
                ? "TỪ CHỐI VÀO RẠP: VÉ ĐÃ SỬ DỤNG"
                : "KHÔNG THỂ XÁC NHẬN VÉ"
            : result
              ? "✓ VÉ HỢP LỆ (VERIFIED)"
              : "✓ VÉ HỢP LỆ (VERIFIED)"}
        </span>
        <span>
          {error
            ? `Mã lỗi: ${error.code || "REQUEST_FAILED"}${error.status ? ` (HTTP ${error.status})` : ""}`
            : result
              ? "Soát vé thành công - Hợp lệ · Trạng thái vé: Đã sử dụng / Đã check-in"
              : "ĐỦ ĐIỀU KIỆN VÀO RẠP · CHƯA CHECK-IN"}
        </span>
      </div>
      {error ? (
        <>
          <h3>
            {used
              ? `Vé đã được sử dụng! — Quét lần trước lúc ${time(error.at)}${ago !== null ? ` (Cách đây ${ago} phút)` : ""}`
              : warning
                ? `Suất trên vé: ${time(details?.startTime)} · Suất đang soát: ${time(currentShowtime?.startTime)}`
                : error.message}
          </h3>
          <p>
            {used
              ? "Hệ thống ngăn chặn tuyệt đối việc vào rạp lần thứ hai với cùng một mã QR để chống hành vi gian lận chụp ảnh màn hình chia sẻ vé cho người khác. Không cho phép check-in lại."
              : error.code === "TICKET_NOT_FOUND"
                ? `Mã "${error.input || ""}" không tồn tại trong hệ thống phát hành vé của NOVA Cinema. Từ chối cho vào rạp.`
                : details?.movie
                  ? `Phim ${details.movie} · ${details.room || ""}. ${error.message}`
                  : error.message}
          </p>
          {code && (
            <p>
              Mã vé: <strong>{code}</strong> · Mã đơn: {details.orderCode}
            </p>
          )}
          {used && error.at && <p>Đã soát lúc {time(error.at)}</p>}
          <div className="cinema-state-actions">
            {(warning || used) && (
              <button
                type="button"
                className={`button ${warning ? "cinema-warning-button" : "button-primary"}`}
                onClick={() =>
                  onGuidance(
                    warning
                      ? "Hướng dẫn tại cửa: đối chiếu đúng giờ trên vé và mời khách đợi tại sảnh nếu chưa đến giờ. Vé chưa được check-in."
                      : "Hướng dẫn tại cửa: đối chiếu giấy tờ và đơn của khách, liên hệ quản lý nếu thông tin không khớp. Không xác nhận lại vé đã sử dụng.",
                  )
                }
              >
                {warning
                  ? "Mời khách đợi tại sảnh (Chưa đến giờ vào rạp)"
                  : "Giữ khách đối chiếu CCCD & Thông tin đơn hàng"}
              </button>
            )}
            <button
              type="button"
              className="button button-glass"
              onClick={onClear}
            >
              {used ? "Bỏ qua · Quét vé tiếp theo" : "Quét mã tiếp theo"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>
            {result
              ? "Soát vé thành công - Hợp lệ"
              : "Vé hợp lệ · Hãy đối chiếu thông tin"}
          </h3>
          <p className="admission-film">
            {ticket.movie} · {time(ticket.startTime)} · {ticket.room}
          </p>
          <p>
            <strong className="admission-seat-list">
              Ghế:{" "}
              {ticket.seats
                .map(
                  (seat) =>
                    `${seat.label} (${seat.type === "VIP" ? "VIP" : seat.type === "SWEETBOX" ? "Sweetbox" : "Thường"})`,
                )
                .join(", ")}
            </strong>{" "}
            · Khách hàng: {ticket.customerName || "Chưa cung cấp"}
            {ticket.membershipTier ? ` (${ticket.membershipTier})` : ""}
          </p>
          <p>
            {ticket.cinema} · Mã vé: <strong>{code || ticket.orderCode}</strong>{" "}
            · Mã đơn: {ticket.orderCode}
          </p>
          <details className="admission-extra">
            <summary>Chi tiết đối chiếu</summary>
            <p>
              Điện thoại: {ticket.customerPhone || "Chưa cung cấp"} · Thanh
              toán: {ticket.paymentStatus || "Chưa có trạng thái"}
            </p>
            {ticket.bookedAt && <p>Ngày đặt: {time(ticket.bookedAt)}</p>}
          </details>
          {result ? (
            <p className="admission-confirmed">
              <CheckCircle2 size={16} /> Đã xác nhận lúc{" "}
              {time(result.checkedInAt)}
            </p>
          ) : (
            <p>Chưa xác nhận vào rạp</p>
          )}
          <div className="cinema-state-actions">
            {result && (
              <button
                type="button"
                className="button cinema-success-button"
                disabled
              >
                ✓ Đã xác nhận CHO VÀO RẠP (Đã Check-in)
              </button>
            )}
            {result && (
              <button
                type="button"
                className="button button-glass"
                disabled={busy}
                onClick={onRepeat}
              >
                🔄 Quét lại vé này lần 2 (Test TC_FR09_03)
              </button>
            )}
            {!result && (
              <button
                type="button"
                className="button cinema-success-button"
                aria-label="Xác nhận soát vé"
                disabled={busy}
                onClick={onAdmit}
              >
                <ShieldCheck size={16} /> ✓ Xác nhận CHO VÀO RẠP
              </button>
            )}
            <button
              type="button"
              className="button button-glass"
              disabled={busy}
              onClick={onClear}
            >
              Quét vé tiếp theo
            </button>
          </div>
        </>
      )}
      {guidance && (
        <p role="status" className="admission-guidance">
          {guidance}
        </p>
      )}
    </div>
  );
}
