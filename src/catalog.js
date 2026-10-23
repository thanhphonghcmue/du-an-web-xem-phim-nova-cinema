/**
 * ==============================================================================
 * TỆP TIN: src/catalog.js
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Định nghĩa React Context cho Danh Mục Điện Ảnh Toàn Cục (`CatalogContext`).
 *   - Cung cấp Hook `useCatalog` để các component giao diện truy cập danh sách:
 *     phim (movies), cụm rạp (cinemas), phòng chiếu (rooms), suất chiếu (showtimes), combo bắp nước.
 *   - Cung cấp các tiện ích định dạng ngày giờ theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh` UTC+7).
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. `CatalogProvider` nạp dữ liệu từ backend hoặc fallback và truyền vào Provider.
 *   2. Các trang/component con (HeaderSearch, QuickBooking, SeatBooking, ShowtimeTimeline)
 *      gọi `useCatalog()` để lấy dữ liệu hiển thị.
 *   3. `dayKey`: chuẩn hóa ngày chiếu thành chuỗi `YYYY-MM-DD` để lọc theo ngày.
 *   4. `timeLabel`: chuẩn hóa giờ chiếu thành chuỗi `HH:MM` (ví dụ: `19:30`).
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Mọi component giao diện hiển thị thông tin rạp và lịch chiếu.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm bộ nhớ đệm client (Client-side cache với SWR hoặc TanStack Query) để giảm tải truy vấn server.
 *   - Hỗ trợ thêm tính năng lọc suất chiếu theo định dạng âm thanh Dolby Atmos, IMAX Laser, 3D, 4DX.
 * ==============================================================================
 */

import { createContext, useContext } from "react";

// Ngữ cảnh danh mục rạp chiếu
export const CatalogContext = createContext(null);

// Hook tiện ích để lấy dữ liệu danh mục từ bất kỳ component con nào
export const useCatalog = () => useContext(CatalogContext);

/**
 * Chuyển đổi mốc thời gian thành chuỗi ngày chuẩn YYYY-MM-DD theo giờ Việt Nam
 * @param {string | number | Date} value - Mốc thời gian
 * @returns {string} Chuỗi ngày chuẩn (ví dụ "2026-10-24")
 */
export const dayKey = (value) =>
  new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
export const formatVietnamDateKey = dayKey;

/**
 * Định dạng mốc thời gian thành giờ phút tiếng Việt (HH:mm)
 * @param {string | number | Date} value - Mốc thời gian
 * @returns {string} Chuỗi giờ hiển thị (ví dụ "19:45")
 */
export const timeLabel = (value) =>
  new Date(value).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
export const formatVietnamTimeLabel = timeLabel;
