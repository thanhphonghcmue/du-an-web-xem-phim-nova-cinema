import CinemaExperience from "@/components/CinemaExperience.jsx";

export const metadata = {
  title: "Vé Điện Tử QR Code — NOVA Cinema",
  description: "Ví vé cá nhân, mã QR Vector 64-hex có chữ ký số và xuất lịch xem phim .ics.",
};

export default function TicketsPage() {
  return <CinemaExperience initialView="tickets" />;
}
