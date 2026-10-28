import CinemaExperience from "@/components/CinemaExperience.jsx";

export const metadata = {
  title: "Soát Vé Nhân Viên (Camera Quét Mã QR) — NOVA Cinema",
  description: "Phân hệ kiểm soát vé cho nhân viên rạp, quét mã QR WebRTC và soát vé nguyên tử 1 lần duy nhất.",
};

export default function StaffPage() {
  return <CinemaExperience initialView="staff" />;
}
