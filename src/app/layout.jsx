import "../styles.css";
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "@fontsource/plus-jakarta-sans/vietnamese-400.css";
import "@fontsource/plus-jakarta-sans/vietnamese-500.css";
import "@fontsource/plus-jakarta-sans/vietnamese-600.css";
import "@fontsource/plus-jakarta-sans/vietnamese-700.css";
import "@fontsource/plus-jakarta-sans/vietnamese-800.css";
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
  title: "NOVA Cinema — Infinity Experience",
  description:
    "Điện ảnh không giới hạn. Khám phá phim, chọn suất IMAX, đặt ghế liền nhau và trải nghiệm Party Combo 69K tại NOVA Cinema.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "NOVA Cinema — Infinity Experience",
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
