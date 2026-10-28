// Public business messages only. Never translate or expose an internal exception string.
export const publicErrorMessages: Record<string, string> = {
  ACCOUNT_DISABLED:
    "Tài khoản đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ hỗ trợ.",
  ADMIN_ACCOUNT_PROTECTED: "Không thể khóa tài khoản quản trị tại đây.",
  PAYMENT_REFERENCE_NOT_FOUND: "Không tìm thấy mã đơn hoặc mã giao dịch.",
  PAYMENT_NOT_CONFIRMED:
    "Thanh toán chưa được xác nhận thành công. Hãy kiểm tra giao dịch trước khi khôi phục vé.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  EMAIL_ALREADY_EXISTS:
    "Email này đã đăng ký. Hãy đăng nhập bằng tài khoản đó.",
  UNAUTHORIZED: "Bạn cần đăng nhập để tiếp tục.",
  INVALID_REFRESH_TOKEN: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Tài khoản của bạn chưa có quyền thực hiện thao tác này.",
  RATE_LIMIT_EXCEEDED: "Bạn thao tác quá nhanh. Hãy đợi một lát rồi thử lại.",
  RATE_LIMIT_UNAVAILABLE: "Hệ thống đang bận. Vui lòng thử lại sau giây lát.",
  SEAT_UNAVAILABLE:
    "Ghế vừa được người khác giữ hoặc mua. Vui lòng chọn ghế khác.",
  SHOWTIME_STARTED:
    "Suất chiếu đã bắt đầu và ngừng nhận đặt vé. Hãy chọn suất khác.",
  MOVIE_NOT_ON_SALE: "Phim đã ngừng mở bán. Hãy chọn phim khác.",
  COMBO_UNAVAILABLE:
    "Bắp nước đã chọn vừa ngừng bán. Hãy bỏ món đó và thử lại.",
  SEAT_LIMIT_EXCEEDED: "Mỗi đơn tối đa 20 ghế, bao gồm cả hai chỗ của ghế đôi.",
  SEATS_NOT_IN_ROOM:
    "Ghế đã chọn không thuộc phòng của suất này. Hãy tải lại sơ đồ.",
  BOOKING_CHANGED: "Đơn vừa được cập nhật. Hãy tải lại và thử lại thao tác.",
  IDEMPOTENCY_CONFLICT:
    "Yêu cầu đã thay đổi. Hãy kiểm tra lại đơn trước khi đặt tiếp.",
  BOOKING_NOT_CANCELLABLE:
    "Đơn đã thanh toán không thể hủy giữ ghế hoặc trả ghế.",
  PAYMENT_ALREADY_FINALIZED:
    "Giao dịch đã có kết quả. Hãy kiểm tra trạng thái đơn và vé.",
  PAYMENT_RETURN_URL_INVALID:
    "Địa chỉ website chưa được cấu hình để nhận kết quả thanh toán. Hãy liên hệ quản trị viên.",
  REFERENCE_CONFLICT:
    "Mục này đang được dữ liệu khác sử dụng nên không thể xóa.",
  RESOURCE_CONFLICT: "Dữ liệu đã tồn tại. Hãy kiểm tra lại thông tin.",
  MOVIE_DURATION_LOCKED: "Phim đã có lịch chiếu nên không thể đổi thời lượng.",
  MOVIE_IN_USE:
    "Phim đã có lịch chiếu. Hãy chuyển sang Ngừng chiếu thay vì xóa.",
  CINEMA_IN_USE: "Rạp còn phòng chiếu đang được sử dụng nên không thể xóa.",
  ROOM_IN_USE: "Phòng đã có lịch chiếu nên không thể xóa.",
  ROOM_HAS_SEATS:
    "Phòng còn ghế. Chỉ có thể xóa phòng trống chưa có lịch sử sử dụng.",
  ROOM_STRUCTURE_LOCKED:
    "Phòng đã có lịch chiếu nên không thể đổi rạp hoặc định dạng.",
  SEAT_LAYOUT_LOCKED:
    "Phòng đã có lịch chiếu nên không thể thay đổi sơ đồ ghế.",
  SEAT_LAYOUT_EXISTS:
    "Phòng đã có sơ đồ ghế. Hệ thống không ghi đè ghế hiện có.",
  SHOWTIME_CONFLICT:
    "Phòng đã có suất trùng giờ, bao gồm cả thời gian dọn phòng. Hãy đổi phòng hoặc giờ chiếu.",
  SHOWTIME_IN_USE: "Suất đã có lịch sử đặt vé nên không thể sửa hoặc xóa.",
  TICKET_NOT_FOUND: "Không tìm thấy định danh vé trong hệ thống.",
  TICKET_ALREADY_USED: "Vé đã được soát trước đó, không thể sử dụng lại.",
  TICKET_SHOWTIME_MISMATCH: "Vé không đúng suất hoặc ngày chiếu được chọn.",
  CHECK_IN_OUTSIDE_WINDOW: "Chưa đến hoặc đã quá thời gian vào rạp của vé này.",
  TICKET_BOOKING_NOT_PAID:
    "Đơn chưa thanh toán thành công nên chưa thể phát hành hoặc soát vé.",
  BOOKING_NOT_PAYABLE: "Đơn đã hết hạn hoặc không còn đủ điều kiện thanh toán.",
  BOOKING_NOT_FOUND: "Không tìm thấy đơn đặt vé.",
  PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch thanh toán.",
  SHOWTIME_NOT_FOUND: "Không tìm thấy suất chiếu.",
  SEAT_LOCK_UNAVAILABLE:
    "Hệ thống giữ ghế đang bận. Vui lòng thử lại sau giây lát.",
  SWEETBOX_PAIR_INVALID:
    "Ghế đôi thiếu vị trí liền kề. Vui lòng chọn cặp ghế khác.",
  INVALID_REPORT_RANGE:
    "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc báo cáo.",
};
