/**
 * ==============================================================================
 * TỆP TIN: src/app/layout.jsx
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Bố cục gốc toàn cục của ứng dụng (Root Layout - Next.js App Router).
 *   - Nạp mã nguồn CSS giao diện (`styles.css`) và các bộ phông chữ hiện đại:
 *     Be Vietnam Pro (nội dung) và Space Grotesk (tiêu đề, chữ số, mã vé).
 *   - Định cấu hình thông số SEO Metadata chuẩn OpenGraph (tiêu đề rạp, mô tả, ảnh bìa, favicon).
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Next.js bao bọc toàn bộ các trang bên trong thẻ <html> và <body> của RootLayout.
 *   2. Ngôn ngữ mặc định được thiết lập là "vi" (Tiếng Việt).
 *   3. Trình duyệt tải phông chữ cục bộ và chủ đề xanh đen điện ảnh.
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Toàn bộ ứng dụng web trên máy tính để bàn, máy tính bảng và điện thoại di động.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Thêm PWA Manifest (`manifest.json`) và Service Worker để cài đặt website như app di động trên iOS/Android.
 *   - Bổ sung Google Analytics hoặc Plausible Analytics tự host để theo dõi hành vi người dùng.
 * ==============================================================================
 */

import "@/styles.css";
import "@/cinema.css";
import "@/premiere.css";
import "@/booking-experience.css";
import "@/clarity.css";
import "@/experience-details.css";
import "react-day-picker/style.css";
import "@/nova-refresh.css";
import "@/server-experience.css";
import "@/cyber-cinema.css";
import "@/food-studio.css";
import "@/qa-readability.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/latin-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/space-grotesk/vietnamese-500.css";
import "@fontsource/space-grotesk/vietnamese-600.css";
import "@fontsource/space-grotesk/vietnamese-700.css";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "NOVA Cinema — Beyond the Frame",
  description:
    "Điện ảnh không giới hạn. Khám phá phim, chọn suất IMAX, đặt ghế liền nhau và trải nghiệm Party Combo 69K tại NOVA Cinema.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "NOVA Cinema — Beyond the Frame",
    description: "Một bộ phim hay. Một vị trí dành riêng cho bạn.",
    images: [
      {
        url: "/images/dune-scene.jpg",
        width: 3840,
        height: 1608,
        alt: "NOVA Cinema — thế giới điện ảnh Dune",
      },
    ],
  },
};

export const viewport = {
  themeColor: "#08090C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
