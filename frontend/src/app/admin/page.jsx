import CinemaExperience from "@/components/CinemaExperience.jsx";

export const metadata = {
  title: "Quản Trị Hệ Thống Rạp & Lịch Chiếu BR03 — NOVA Cinema",
  description: "Trang quản trị viên quản lý danh mục phim, sơ đồ phòng chiếu, lịch chiếu và giám sát doanh thu.",
};

export default function AdminPage() {
  return <CinemaExperience initialView="admin" />;
}
