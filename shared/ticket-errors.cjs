function ticketErrorFields(code, details, timestamp = Date.now()) {
  if (code === "TICKET_NOT_FOUND")
    return {
      found: false,
      data: null,
      statusType: "INVALID_NOT_FOUND",
      httpCode: 404,
      title: "Mã vé không tồn tại hoặc không hợp lệ!",
    };
  if (code === "TICKET_ALREADY_USED") {
    const at = details?.checkedInAt;
    const minutesAgo = at
      ? Math.max(1, Math.round((timestamp - Date.parse(at)) / 60000))
      : null;
    const usedAt = at
      ? new Date(at).toLocaleTimeString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "chưa xác định";
    return {
      statusType: "ALREADY_USED",
      httpCode: 409,
      errorCode: code,
      title: "Vé đã được sử dụng!",
      subTitle: `Vé này đã được nhân viên soát vé quét lúc ${usedAt}${minutesAgo == null ? "" : ` (Cách đây ${minutesAgo} phút)`}`,
      minutesAgo,
      ticket: details,
    };
  }
  if (code === "TICKET_SHOWTIME_MISMATCH")
    return {
      statusType: "WRONG_SHOWTIME",
      httpCode: 409,
      title: "CẢNH BÁO: SAI SUẤT CHIẾU",
    };
  return {};
}
module.exports = { ticketErrorFields };
