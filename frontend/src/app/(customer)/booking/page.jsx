import CinemaExperience from "@/components/CinemaExperience.jsx";

export const metadata = {
  title: "Đặt Vé Xem Phim Real-time (Khóa ghế 5 phút CR-01) — NOVA Cinema",
  description: "Chọn suất chiếu, sơ đồ ghế cong IMAX và giữ ghế thời gian thực.",
};

export default function BookingPage() {
  return <CinemaExperience initialView="booking" />;
}
