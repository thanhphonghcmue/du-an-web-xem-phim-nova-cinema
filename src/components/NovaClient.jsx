/**
 * ==============================================================================
 * TỆP TIN: src/components/NovaClient.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Lớp cấu hình Client Context tập trung (Client Root Context Shell).
 *   - Tích hợp 3 tầng Provider quan trọng:
 *     1. `MotionConfig reducedMotion="user"`: Tôn trọng thiết lập trợ năng giảm chuyển động của hệ điều hành.
 *     2. `LanguageProvider`: Cung cấp khả năng chuyển đổi song ngữ Việt - Anh.
 *     3. `CatalogProvider`: Nạp và đồng bộ danh mục phim, rạp, phòng và suất chiếu.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Nhận lệnh kích hoạt từ `CinemaExperience`.
 *   2. Khởi tạo LanguageProvider và CatalogProvider.
 *   3. Nạp ứng dụng chính `App.jsx` sẵn sàng phục vụ người dùng.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Toàn bộ giao diện người dùng.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Bổ sung ThemeProvider để hỗ trợ chế độ tương phản cao (High Contrast Mode) cho người thị lực kém.
 * ==============================================================================
 */

"use client";
import { MotionConfig } from "framer-motion";
import CatalogProvider from "./CatalogProvider.jsx";
import App from "../App.jsx";
import LanguageProvider from "./LanguageProvider.jsx";

export default function NovaClient() {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <CatalogProvider>
          <App />
        </CatalogProvider>
      </LanguageProvider>
    </MotionConfig>
  );
}
