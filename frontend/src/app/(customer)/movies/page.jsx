import CinemaExperience from "@/components/CinemaExperience.jsx";

export const metadata = {
  title: "Danh Sách Phim Đang Chiếu & Sắp Chiếu — NOVA Cinema",
  description: "Khám phá danh mục phim điện ảnh bom tấn, phân loại nhãn tuổi và định dạng IMAX.",
};

export default function MoviesPage() {
  return <CinemaExperience initialView="movies" />;
}
