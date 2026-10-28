// Only the aggregate API result belongs to the selected report period.
// The overview's ten latest orders are a separate, unfiltered list.
export function revenueCsv(revenue, range, generatedAt = new Date()) {
  const rows = [
    ["NOVA CINEMA - BÁO CÁO DOANH THU"],
    [
      "Thời gian xuất báo cáo",
      generatedAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    ],
    ["Từ ngày (Việt Nam)", range.from],
    ["Đến ngày (Việt Nam)", range.to],
    ["Phạm vi", "Đơn PAID theo ngày tạo đơn; không phải ngày thanh toán"],
    ["Chỉ số", "Giá trị", "Đơn vị"],
    ["Tổng doanh thu ròng (Net Revenue)", revenue.netRevenue, "VND"],
    ["Doanh thu vé xem phim", revenue.ticketRevenue, "VND"],
    ["Doanh thu bắp nước", revenue.comboRevenue, "VND"],
    ["Tổng ưu đãi", revenue.discountAmount, "VND"],
    ["Số đơn PAID", revenue.paidBookingCount, "đơn"],
    ["Số ghế SOLD", revenue.ticketCount, "ghế"],
  ];
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n")
  );
}
