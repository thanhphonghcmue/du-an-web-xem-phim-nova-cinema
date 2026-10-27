import NovaLogo from "./NovaLogo.jsx";
import Link from "next/link";
import {
  ArrowUpRight,
  Crown,
  HelpCircle,
  MapPin,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useI18n } from "../i18n.js";

export default function CinemaFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-footer nova-footer">
      <div className="content-width">
        <div className="footer-invitation">
          <div>
            <p className="nova-kicker">CÒN MỘT CUỘC HẸN ĐANG CHỜ BẠN.</p>
            <h2>
              Tắt thế giới ngoài kia.
              <br />
              <em>Bật trải nghiệm NOVA.</em>
            </h2>
          </div>
          <Link href="/dat-ve" className="button button-primary">
            <Ticket size={17} />
            Chọn một suất phim <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="footer-main">
          <div className="footer-brand">
            <Link className="brand" href="/">
              <NovaLogo />
            </Link>
            <p>
              Không giới hạn cảm xúc.
              <br />
              Không giới hạn trải nghiệm.
            </p>
            <Link href="/gioi-thieu" className="footer-brand-more">
              Tìm hiểu NOVA <ArrowUpRight size={12} />
            </Link>
          </div>
          <div>
            <h4>
              <Link href="/gioi-thieu">
                {t("KHÁM PHÁ NOVA")}
                <ArrowUpRight size={12} />
              </Link>
            </h4>
            {[
              ["/phim", "Phim đang chiếu"],
              ["/sap-chieu", "Sắp chiếu tháng sau"],
              ["/dat-ve", "Lịch chiếu & đặt vé"],
              ["/rap", "Hệ thống rạp & phòng chiếu"],
              ["/bap-nuoc", "Thế giới bắp nước"],
              ["/uu-dai", "Ưu đãi & sự kiện"],
              ["/hoi-vien", "Hội viên C’MEMBER"],
            ].map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h4>
              <Link href="/ho-tro">
                {t("ĐỒNG HÀNH CÙNG BẠN")}
                <ArrowUpRight size={12} />
              </Link>
            </h4>
            {[
              ["/huong-dan", "Hướng dẫn đặt vé"],
              ["/ho-tro", "Câu hỏi thường gặp"],
              ["/chinh-sach", "Điều khoản & chính sách"],
              ["/tai-khoan", "Tra cứu vé đã đặt"],
              ["/lien-he", "Kết nối & hỗ trợ"],
              ["/gioi-thieu", "NOVA Cinema · Nhóm 03"],
            ].map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <div className="footer-payment">
            <h4>
              <Link href="/thanh-toan">
                {t("THANH TOÁN SANDBOX")}
                <ArrowUpRight size={12} />
              </Link>
            </h4>
            <div className="footer-payment-links">
              {[
                ["visa", "VISA"],
                ["mastercard", "Mastercard"],
                ["momo", "MoMo"],
                ["zalopay", "ZaloPay"],
              ].map(([key, name]) => (
                <Link key={key} href={`/thanh-toan?phuong-thuc=${key}`}>
                  {name}
                  <ArrowUpRight size={10} />
                </Link>
              ))}
            </div>
            <Link href="/thanh-toan" className="footer-secure">
              <ShieldCheck size={16} />
              <span>
                Tìm hiểu thanh toán mô phỏng.
                <br />
                Không thu tiền thật.
              </span>
            </Link>
            <Link href="/huong-dan" className="footer-quick-help">
              <HelpCircle size={15} />
              Bắt đầu đặt vé như thế nào?
            </Link>
            <Link href="/rap" className="footer-quick-help">
              <MapPin size={15} />
              Xem rạp & phòng chiếu
            </Link>
            <Link href="/hoi-vien" className="footer-quick-help">
              <Crown size={15} />
              Khám phá quyền lợi thành viên
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <Link href="/gioi-thieu">
            © {new Date().getFullYear()} NOVA Cinema · Beyond the Frame
          </Link>
          <Link href="/chinh-sach">
            Dữ liệu minh họa cho đồ án · Thông tin & quyền riêng tư
          </Link>
          <a href="#top">
            VỀ ĐẦU TRANG <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </footer>
  );
}
