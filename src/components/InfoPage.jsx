import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CreditCard,
  Film,
  HelpCircle,
  MapPin,
  Popcorn,
  QrCode,
  ShieldCheck,
  Ticket,
  UsersRound,
} from "lucide-react";
import PageBanner from "./PageBanner.jsx";

const questions = [
  [
    "Làm sao để đặt vé?",
    "Chọn rạp → phim → ngày → suất, đăng nhập rồi chọn ghế và bắp nước. Bấm Giữ ghế 5 phút để xác nhận đơn và giá. Tiếp tục sang Sandbox để mô phỏng kết quả thanh toán.",
  ],
  [
    "Ghế được giữ trong bao lâu?",
    "Ghế được giữ 5 phút kể từ khi backend xác nhận yêu cầu giữ chỗ. Tải lại trang không gia hạn. Khi hết hạn, hủy đơn hoặc thanh toán thất bại, ghế được giải phóng.",
  ],
  [
    "Có thanh toán tiền thật không?",
    "Không. NOVA hiện là đồ án dùng Payment Sandbox. Không cần chuyển khoản, thông tin thẻ, mã OTP hoặc thông tin ví điện tử.",
  ],
  [
    "Tôi tìm vé QR đã mua ở đâu?",
    "Đăng nhập và mở Vé của tôi. Đơn thanh toán thành công sẽ được phát hành vé QR; bạn có thể tải ảnh QR hoặc lịch .ics. Chỉ chủ tài khoản được đọc vé của mình.",
  ],
  [
    "Đặt ghế cho nhóm hoặc Sweetbox như thế nào?",
    "Chọn xếp nhóm để gợi ý tối đa 20 ghế liền hàng theo chỗ còn trống. Sweetbox được giữ theo cặp; ghế đã bán hoặc người khác đang giữ không thể chọn.",
  ],
  [
    "Bắp nước có mua riêng được không?",
    "Hiện các món được mua kèm vé. Chọn số lượng ở trang Bắp nước, tiếp tục chọn suất và kiểm tra lại giỏ món trong bước chọn ghế trước khi giữ chỗ.",
  ],
  [
    "Vì sao không thấy một khung giờ?",
    "Lịch được lọc theo rạp, phim, ngày, phòng và buổi. Suất đã bắt đầu không mở bán. Thử đổi ngày hoặc bỏ bộ lọc phòng/buổi để thấy thêm lựa chọn.",
  ],
  [
    "Mất kết nối hoặc thanh toán xong chưa thấy vé?",
    "Mở tài khoản để đọc trạng thái đơn từ hệ thống. Vé QR có thể cần vài giây để phát hành sau PAID. Không tự tạo giao dịch mới chỉ vì trang mất kết nối; có thể tiếp tục đơn đang giữ trong tài khoản.",
  ],
];
const policies = [
  [
    "Giữ ghế & hủy đơn",
    "Giữ chỗ 5 phút, giá và hạn giữ do backend xác nhận. Không gia hạn khi tải lại. Hủy đơn đang giữ sẽ trả ghế; không có luồng hoàn tiền thật trong đồ án.",
  ],
  [
    "Tài khoản & vé điện tử",
    "Phiên đăng nhập dùng cookie HttpOnly. Không chia sẻ tài khoản hoặc QR của bạn. Vé QR được kiểm tra quyền sở hữu; soát vé chỉ thành công một lần trong khung giờ cho phép.",
  ],
  [
    "Độ tuổi & nội dung phim",
    "Nhãn P, K, T13, T16 và T18 giúp lựa chọn nội dung phù hợp. Đọc nhãn tuổi trước khi đặt vé và đảm bảo người đi cùng phù hợp với phân loại phim.",
  ],
  [
    "Dữ liệu & quyền riêng tư",
    "Hồ sơ, đơn đặt và vé được lưu trên máy chủ. Giỏ bắp nước nháp và lựa chọn ẩn ưu đãi lưu trong trình duyệt. Không nhập dữ liệu thẻ hoặc giấy tờ nhạy cảm khi thử nghiệm đồ án.",
  ],
  [
    "Hình ảnh & phạm vi minh họa",
    "Đây là đồ án Nhóm 03 tại HCMUE, chưa phải rạp thương mại. Địa điểm, giá, chương trình tái chiếu và ưu đãi là dữ liệu minh họa. Ảnh concept NOVA được tạo riêng; poster/trailer thuộc chủ sở hữu tác phẩm.",
  ],
];
const paymentMethods = [
  [
    "sandbox",
    "NOVA Sandbox",
    "Môi trường thanh toán hiện đang hoạt động của NOVA. Chọn thành công, thất bại hoặc hủy để kiểm tra trạng thái đơn và việc trả ghế.",
  ],
  [
    "visa",
    "Visa",
    "Nội dung giới thiệu phương thức thẻ. Đồ án chưa tích hợp cổng thẻ thật; không nhập số thẻ, CVV hoặc OTP. Luồng đặt vé hiện tại sử dụng Sandbox.",
  ],
  [
    "mastercard",
    "Mastercard",
    "Nội dung giới thiệu phương thức thẻ quốc tế. Chưa có giao dịch thẻ thật hoặc lưu thông tin thẻ; bạn hoàn tất đặt vé qua Sandbox của NOVA.",
  ],
  [
    "momo",
    "MoMo",
    "Nội dung giới thiệu ví điện tử. NOVA chưa liên kết ví hoặc yêu cầu chuyển tiền MoMo. Hãy sử dụng Sandbox để mô phỏng thanh toán đơn đang giữ.",
  ],
  [
    "zalopay",
    "ZaloPay",
    "Nội dung giới thiệu ví điện tử. Đồ án chưa tích hợp giao dịch ZaloPay thật. Không chuyển tiền vào tài khoản bên ngoài; kết quả đặt vé được xác nhận qua Sandbox.",
  ],
];

export default function InfoPage({ view }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get("phuong-thuc") || "sandbox";
  const selected =
    paymentMethods.find((item) => item[0] === method) || paymentMethods[0];
  const isPolicy = view === "chinh-sach";
  if (view === "thanh-toan")
    return (
      <>
        <PageBanner
          label="NOVA PAYMENT GUIDE"
          title={
            <>
              Thanh toán rõ ràng.
              <br />
              An tâm từng bước.
            </>
          }
          description="Hiểu đúng luồng thanh toán, kiểm tra đơn đang giữ và quay lại nhận vé điện tử."
          image="/images/campaigns/nova-movie-night.png"
        />
        <section className="content-width discovery-section">
          <div className="payment-guide-grid">
            <div
              className="payment-method-menu"
              role="tablist"
              aria-label="Phương thức thanh toán"
            >
              {paymentMethods.map(([key, name]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={key === selected[0]}
                  onClick={() =>
                    router.replace(`/thanh-toan?phuong-thuc=${key}`, {
                      scroll: false,
                    })
                  }
                >
                  <CreditCard size={18} />
                  {name}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
            <article className="payment-explainer" role="tabpanel">
              <p className="nova-kicker">THÔNG TIN PHƯƠNG THỨC</p>
              <h2>{selected[1]}</h2>
              <p>{selected[2]}</p>
              <div className="payment-process">
                {[
                  ["01", "Giữ ghế", "Backend xác nhận đơn và hạn 5 phút."],
                  [
                    "02",
                    "Chọn kết quả",
                    "Sandbox mô phỏng thành công, thất bại hoặc hủy.",
                  ],
                  [
                    "03",
                    "Nhận vé",
                    "Đơn PAID được phát hành QR, email và lịch .ics.",
                  ],
                ].map(([step, title, text]) => (
                  <div key={step}>
                    <span>{step}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/dat-ve" className="button button-primary">
                Chọn suất & thanh toán Sandbox <ArrowRight size={17} />
              </Link>
              <Link href="/tai-khoan" className="info-secondary-link">
                Kiểm tra đơn & vé của tôi <ArrowUpRight size={15} />
              </Link>
            </article>
          </div>
        </section>
      </>
    );
  if (view === "gioi-thieu")
    return (
      <>
        <PageBanner
          label="THIS IS NOVA"
          title={
            <>
              Nơi một bộ phim.
              <br />
              Thành một trải nghiệm.
            </>
          }
          description="NOVA Cinema — Infinity Experience. Một cuộc hẹn giữa màn ảnh lớn, những câu chuyện hay và vị trí dành riêng cho bạn."
          image="/images/campaigns/nova-dream-city.png"
        />
        <section className="content-width discovery-section">
          <div className="info-intro">
            <div>
              <p className="nova-kicker">CINEMA BEYOND THE ORDINARY</p>
              <h2>
                Không giới hạn cảm xúc.
                <br />
                <em>Không giới hạn trải nghiệm.</em>
              </h2>
              <p>
                NOVA là đồ án website đặt vé xem phim trực tuyến của Nhóm 03,
                HCMUE. Trải nghiệm kết nối từ tìm phim, xem lịch, chọn ghế, mua
                kèm bắp nước đến thanh toán Sandbox và nhận vé QR.
              </p>
              <p>
                Khách hàng, hội viên, nhân viên rạp và quản trị viên có không
                gian riêng, cùng một luồng dữ liệu đặt vé thống nhất.
              </p>
              <Link href="/phim" className="button button-primary">
                Khám phá phim <ArrowUpRight size={16} />
              </Link>
            </div>
            <img
              src="/images/cinema-auditorium.jpg"
              alt="Không gian rạp chiếu minh họa NOVA"
            />
          </div>
          <div className="info-destinations">
            {[
              [
                "/rap",
                MapPin,
                "Tìm rạp của bạn",
                "Khám phá phòng chiếu và lịch 7 ngày.",
              ],
              [
                "/bap-nuoc",
                Popcorn,
                "Đủ vị cho cuộc vui",
                "Chọn bắp, nước và đồ ăn cho buổi hẹn.",
              ],
              [
                "/hoi-vien",
                UsersRound,
                "Đặc quyền hội viên",
                "Tài khoản, điểm và vé trong một nơi.",
              ],
            ].map(([href, Icon, title, text]) => (
              <Link href={href} key={href}>
                <Icon size={26} />
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight size={19} />
              </Link>
            ))}
          </div>
        </section>
      </>
    );
  if (view === "huong-dan")
    return (
      <>
        <PageBanner
          label="YOUR FIRST NOVA NIGHT"
          title={
            <>
              Chọn phim dễ dàng.
              <br />
              Đặt vé thật trực quan.
            </>
          }
          description="Từ lần chạm đầu tiên đến chiếc vé QR. Cùng NOVA chuẩn bị cho cuộc hẹn điện ảnh của bạn."
          image="/images/cinema-imax.jpg"
        />
        <section className="content-width discovery-section">
          <div className="guide-steps">
            {[
              [
                Film,
                "Tìm đúng bộ phim",
                "Xem phim đang chiếu, trailer và phân loại tuổi. Chọn rạp cùng ngày bạn muốn đi.",
                "/phim",
                "Khám phá phim",
              ],
              [
                CalendarDays,
                "Chọn giờ & phòng",
                "Lọc buổi sáng, chiều, tối hoặc suất muộn; chọn phòng và khung giờ phù hợp.",
                "/dat-ve",
                "Xem lịch chiếu",
              ],
              [
                Popcorn,
                "Chọn ghế & món ngon",
                "Chọn ghế thường, VIP, Sweetbox hoặc gợi ý nhóm. Thêm bắp nước trước khi giữ chỗ.",
                "/bap-nuoc",
                "Xem thực đơn",
              ],
              [
                ShieldCheck,
                "Giữ ghế & thanh toán",
                "Giữ ghế 5 phút. Đọc tổng tiền chính thức và tiếp tục sang Sandbox; không có giao dịch tiền thật.",
                "/thanh-toan",
                "Hiểu về thanh toán",
              ],
              [
                QrCode,
                "Nhận QR & đến rạp",
                "Theo dõi đơn và QR trong tài khoản. Tải QR hoặc .ics; nhân viên xác nhận vé một lần.",
                "/tai-khoan",
                "Vé của tôi",
              ],
            ].map(([Icon, title, text, href, label], index) => (
              <article key={href}>
                <div className="guide-step-icon">
                  <Icon size={25} />
                  <span>0{index + 1}</span>
                </div>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                  <Link href={href}>
                    {label}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  return (
    <>
      <PageBanner
        label={
          isPolicy
            ? "NOVA POLICIES"
            : view === "lien-he"
              ? "STAY CONNECTED"
              : "HERE FOR YOUR MOVIE NIGHT"
        }
        title={
          isPolicy ? (
            <>
              Rõ ràng thông tin.
              <br />
              Trọn vẹn trải nghiệm.
            </>
          ) : (
            <>
              Bạn cần hỗ trợ?
              <br />
              NOVA ở ngay đây.
            </>
          )
        }
        description={
          isPolicy
            ? "Những điều cần biết trước khi khám phá, đặt vé và sử dụng tài khoản NOVA."
            : "Tìm câu trả lời, xem lại đơn hoặc chọn rạp phù hợp. Mỗi lựa chọn đều dẫn bạn tới đúng nơi."
        }
        image="/images/cinema-lobby.jpg"
      />
      <section className="content-width discovery-section">
        {!isPolicy && (
          <div className="support-shortcuts">
            {[
              [
                "/tai-khoan",
                Ticket,
                "Đơn & vé của tôi",
                "Kiểm tra trạng thái, tiếp tục đơn và tải vé.",
              ],
              [
                "/huong-dan",
                HelpCircle,
                "Hướng dẫn đặt vé",
                "Đi từng bước từ chọn phim đến nhận QR.",
              ],
              [
                "/rap",
                MapPin,
                "Rạp & phòng chiếu",
                "Xem địa điểm và lựa chọn phòng cho buổi hẹn.",
              ],
            ].map(([href, Icon, title, text]) => (
              <Link key={href} href={href}>
                <Icon size={24} />
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        )}
        <div className="faq-layout">
          <div>
            <p className="nova-kicker">
              {isPolicy ? "THÔNG TIN & QUYỀN RIÊNG TƯ" : "CÂU HỎI THƯỜNG GẶP"}
            </p>
            <h2>
              {isPolicy ? "Những điều nên biết." : "Giải đáp trước buổi hẹn."}
            </h2>
            <p>
              {isPolicy
                ? "Áp dụng cho trải nghiệm minh họa hiện tại của NOVA Cinema."
                : "Bấm một câu hỏi để xem câu trả lời và tiếp tục trải nghiệm."}
            </p>
            <Link href={isPolicy ? "/ho-tro" : "/chinh-sach"}>
              {isPolicy ? "Cần hỗ trợ thêm" : "Xem điều khoản & chính sách"}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="faq-list">
            {(isPolicy ? policies : questions).map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span>+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
