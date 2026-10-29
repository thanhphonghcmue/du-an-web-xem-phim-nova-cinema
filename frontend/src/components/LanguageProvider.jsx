/**
 * ==============================================================================
 * TỆP TIN: src/components/LanguageProvider.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Quản lý trạng thái ngôn ngữ toàn cục (Tiếng Việt / English).
 *   - Tự động ghi nhớ tùy chọn ngôn ngữ của người dùng vào `localStorage` ("nova-language").
 *   - Đồng bộ thuộc tính `lang` của thẻ `<html>` (`document.documentElement.lang`) chuẩn trợ năng SEO.
 *   - Cung cấp hàm `t(text)` tra cứu bản dịch từ `english` dictionary trong `src/i18n.js`.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Khởi tạo: đọc từ localStorage hoặc mặc định "vi" (Tiếng Việt).
 *   2. Khi người dùng bấm nút chuyển đổi ngôn ngữ trên Navbar: `setLanguage("en")` hoặc `setLanguage("vi")`.
 *   3. useEffect tự động lưu vào LocalStorage và cập nhật `html.lang`.
 *   4. Các component con re-render với nội dung ngôn ngữ tương ứng.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Toàn bộ giao diện người dùng.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Tự động phát hiện ngôn ngữ trình duyệt của khách hàng (`navigator.language`) trong lần truy cập đầu tiên.
 * ==============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { LanguageContext, english } from "@/i18n.js";

export default function LanguageProvider({ children }) {
  // Trạng thái ngôn ngữ hiện tại: "vi" (Tiếng Việt) hoặc "en" (Tiếng Anh)
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("nova-language") === "en" ? "en" : "vi";
    } catch {
      return "vi";
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("nova-language", language);
    } catch {
      // Chặn lưu tùy chọn không được ngăn người dùng chuyển ngôn ngữ.
    }
  }, [language]);

  // Hàm dịch nhanh dựa trên từ điển song ngữ
  const translate = useCallback(
    (text) => (language === "en" ? english[text] || text : text),
    [language],
  );
  const value = useMemo(
    () => ({ language, setLanguage, t: translate }),
    [language, translate],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
