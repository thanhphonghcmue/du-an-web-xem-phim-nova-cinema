/**
 * ==============================================================================
 * TỆP TIN: src/i18n.js
 * VAI TRÒ / NHIỆM VỤ CHÍNH:
 *   - Quản lý từ điển đa ngôn ngữ Song ngữ Việt - Anh (Internationalization i18n).
 *   - Cung cấp Hook `useI18n` và hàm dịch `t(key)` để dịch linh hoạt các nhãn giao diện.
 *   - Lưu trữ bản đồ dịch các thuật ngữ điện ảnh, trạng thái ghế, thông báo hệ thống.
 *
 * TIẾN TRÌNH HOẠT ĐỘNG (WORKFLOW):
 *   1. Mặc định hệ thống dùng tiếng Việt (`language = "vi"`).
 *   2. Khi người dùng bấm chuyển sang tiếng Anh ("EN"): `t("Đặt vé ngay")` -> "Book now".
 *   3. Nếu chuỗi chưa có trong từ điển tiếng Anh: tự động trả về nguyên bản tiếng Việt (Fallback an toàn).
 *
 * ĐỐI TƯỢNG SỬ DỤNG:
 *   - Khách hàng trong nước và quốc tế truy cập website.
 *
 * 💡 SUY NGHĨ & HƯỚNG MỞ RỘNG (TODO / GỢI Ý PHÁT TRIỂN TIẾP):
 *   - Mở rộng thêm ngôn ngữ tiếng Nhật (JA) và tiếng Hàn (KO) cho khách du lịch.
 *   - Hỗ trợ file JSON riêng biệt cho từng ngôn ngữ (`locales/vi.json`, `locales/en.json`) khi dự án lớn hơn.
 * ==============================================================================
 */

import { createContext, useContext } from "react";
export const LanguageContext = createContext({
  language: "vi",
  t: (text) => text,
});
export const useI18n = () => useContext(LanguageContext);
export const english = {
  "Lịch chiếu": "Showtimes",
  "Rạp Cinema": "Cinemas",
  "Ưu đãi": "Offers",
  "Ưu đãi & Khuyến mãi": "Offers & deals",
  "Đặt vé ngay": "Book now",
  "Đăng nhập": "Sign in",
  "Đăng ký thành viên": "Join C’MEMBER",
  "Sự kiện": "Events",
  "Xếp cụm nhóm": "Group seating",
  "Tài khoản": "Account",
  "Khuyến mãi 69K": "Combo deals",
  "Tìm phim, rạp...": "Search films, cinemas…",
  "Tìm câu chuyện của bạn": "Find your next story",
  "Tên phim, đạo diễn…": "Movie or director…",
  Đóng: "Close",
  "Mở menu": "Open menu",
  "Đóng menu": "Close menu",
  "Đặt vé nhanh": "Quick booking",
  "30 giây để chạm đến điện ảnh": "Your next cinema escape, in 30 seconds",
  "Chọn cụm rạp": "Choose cinema",
  "Chọn phim": "Choose film",
  "Chọn ngày": "Choose date",
  "Chọn suất chiếu": "Choose showtime",
  "Tìm ghế đẹp": "Find best seats",
  "Ngồi cạnh nhau, vui cùng nhau · ≤ 20 ghế":
    "Together in one row · Up to 20 seats",
  "Giữ ghế an toàn trong 5 phút": "Your seats held safely for 5 minutes",
  "Câu chuyện tiếp theo": "Your next story",
  "của bạn.": "starts here.",
  "Những thước phim đáng xem. Những cảm xúc đáng nhớ.":
    "Films worth seeing. Moments worth remembering.",
  "Khám phá tất cả": "Explore all films",
  "Đang chiếu": "Now showing",
  "Sắp chiếu": "Coming soon",
  "Suất chiếu đặc biệt": "Special screenings",
  "Tất cả phim": "All films",
  "Đặt vé suất này": "Book this film",
  "Thông tin phim": "Film details",
  "Xem Trailer": "Watch trailer",
  "Đặt Vé": "Book tickets",
  "ĐẠO DIỄN": "DIRECTOR",
  "DIỄN VIÊN": "CAST",
  "Đặt vé bây giờ": "Book tickets now",
  "Xem trailer 4K": "Watch trailer 4K",
  "KHÁM PHÁ TRẢI NGHIỆM": "EXPLORE THE EXPERIENCE",
  "Không chỉ xem phim.": "More than a movie.",
  "Sống trong từng khung hình.": "Live every frame.",
  "5 phút giữ ghế": "5-minute seat hold",
  "Vé điện tử QR": "Digital QR tickets",
  "MÀN ẢNH VÔ CỰC": "INFINITY SCREEN",
  "ÂM THANH ĐA CHIỀU": "IMMERSIVE SOUND",
  "AN TÂM MỖI LỰA CHỌN": "PEACE OF MIND",
  "CHẠM LÀ VÀO RẠP": "YOUR PASS TO THE BIG SCREEN",
  "Phim hay.": "Great films.",
  "Bắp ngon.": "Fresh popcorn.",
  "Vui hết cỡ.": "Even better together.",
  "Một bắp lớn, hai ly mát lạnh.": "One large popcorn, two ice-cold drinks.",
  "Đủ vị cho một buổi hẹn hoàn hảo.": "The perfect pairing for a cinema date.",
  "Thêm combo vào vé": "Add combo to tickets",
  "CHO CẢ COMBO": "FOR THE WHOLE COMBO",
  "Một nhóm bạn.": "One group of friends.",
  "Vạn niềm vui.": "Endless good times.",
  "Cùng một hàng ghế.": "Together in one row.",
  "Cùng một thế giới điện ảnh.": "Together in a world of cinema.",
  "Đặt vé cho cả nhóm": "Book for your group",
  "Xếp cụm tối đa 20 ghế liền nhau": "Up to 20 adjacent seats",
  "Điện ảnh là đam mê.": "Cinema is your passion.",
  "Đặc quyền là của bạn.": "The privileges are yours.",
  "Gia nhập C’MEMBER. Để mỗi lần đến rạp": "Join C’MEMBER. Make every visit",
  "đều là một trải nghiệm xứng đáng hơn.": "a more rewarding experience.",
  "Ưu đãi dành riêng": "Exclusive rewards",
  "Tích điểm mỗi vé": "Points with every ticket",
  "Lưu vé trong tài khoản": "Your tickets in one place",
  "Trở thành C’MEMBER": "Become a C’MEMBER",
  "Khám phá tài khoản của bạn": "Explore your account",
  "Màn ảnh lớn.": "The big screen.",
  "Ngay gần bạn.": "Closer than ever.",
  "Xem lịch chiếu": "View showtimes",
  "Những thước phim.": "Special films.",
  "Không thể bỏ lỡ.": "Unmissable moments.",
  "Oppenheimer.": "Oppenheimer.",
  "Trở lại, hoành tráng hơn.": "Back, bigger than ever.",
  "Kiệt tác của Christopher Nolan trên màn ảnh IMAX.":
    "Christopher Nolan’s masterpiece on the IMAX screen.",
  "Khám phá suất chiếu": "Explore screenings",
  "Cả rạp phim, trong tầm tay.": "Your cinema, in your pocket.",
  "Khám phá NOVA Mobile": "Discover NOVA Mobile",
  "Chọn vị trí của bạn": "Choose your seats",
  "Hoàn tất trải nghiệm": "Complete your experience",
  "Hẹn gặp bạn tại rạp!": "See you at the cinema!",
  "Chưa chọn ghế": "No seats selected",
  "Tiếp tục thanh toán": "Continue to payment",
  "Thanh toán mô phỏng": "Simulate payment",
  "Đang xử lý…": "Processing…",
  "Tóm tắt đặt vé": "Booking summary",
  "TRẢI NGHIỆM CỦA BẠN": "YOUR EXPERIENCE",
  "TỔNG THANH TOÁN": "TOTAL PAYMENT",
  "Hủy đặt vé & giải phóng ghế": "Cancel booking & release seats",
  "Giảm combo": "Remove a combo",
  "Tăng combo": "Add a combo",
  "Bắp nước": "Popcorn & drinks",
  "Số người trong nhóm": "Group size",
  "Xếp ghế": "Find adjacent seats",
  "Quay lại chọn ghế": "Back to seat selection",
  "Chọn nhanh 3 ghế liền nhau": "Find 3 adjacent seats",
  "Combo & Ưu đãi": "Combos & rewards",
  "Chọn Ghế": "Select seats",
  "Chọn Rạp & Suất": "Cinema & showtime",
  "Thanh toán": "Payment",
  "Tiếp tục chọn combo": "Continue to combos",
  "Họ và tên": "Full name",
  Email: "Email",
  "Mật khẩu": "Password",
  "Xác nhận mật khẩu": "Confirm password",
  "Ghi nhớ đăng nhập": "Remember me",
  "Quên mật khẩu?": "Forgot password?",
  "Chào mừng trở lại.": "Welcome back.",
  "Điện ảnh, dành riêng cho bạn.": "Cinema, made for you.",
  "Tạo tài khoản demo": "Create demo profile",
  "Đăng nhập demo": "Sign in to demo",
  "Hoặc tiếp tục với": "Or continue with",
  "Ưu đãi chào bạn mới": "Your welcome reward",
  "Giảm 5% tiền vé": "5% off movie tickets",
  "Đặt vé, thật đơn giản": "Booking made simple",
  "Vé của bạn": "Your tickets",
  "Đặc quyền của bạn": "Your privileges",
  "Tải QR": "Download QR",
  "Đăng xuất hồ sơ demo": "Sign out of demo profile",
  "Hướng dẫn đặt vé": "Booking guide",
  "Điều khoản & chính sách": "Terms & policies",
  "Tra cứu vé đã đặt": "My tickets",
  "KHÁM PHÁ NOVA": "EXPLORE NOVA",
  "ĐỒNG HÀNH CÙNG BẠN": "HERE FOR YOU",
  "THANH TOÁN SANDBOX": "SANDBOX PAYMENTS",
  "Phim & lịch chiếu": "Films & showtimes",
  "Hệ thống rạp": "Our cinemas",
  "Ưu đãi & bắp nước": "Deals & concessions",
  "Thành viên C’MEMBER": "C’MEMBER loyalty",
  "VỀ ĐẦU TRANG": "BACK TO TOP",
};
Object.assign(english, {
  phút: "min",
  "phút ·": "min ·",
  "Ghế:": "Seats:",
  "Vé mô phỏng ·": "Demo ticket ·",
  "Màn ảnh lớn đang chờ bạn.": "The big screen is waiting for you.",
  "Vé điện tử sẽ xuất hiện tại đây sau khi bạn hoàn tất đặt vé mô phỏng.":
    "Your digital tickets will appear here after a successful demo booking.",
  "TRẢI NGHIỆM ĐIỆN ẢNH ĐỈNH CAO": "THE ULTIMATE CINEMA EXPERIENCE",
  "SPOTLIGHT / TRÊN MÀN ẢNH LỚN": "SPOTLIGHT / ON THE BIG SCREEN",
  "Lịch chiếu và dữ liệu phim minh họa cho trải nghiệm NOVA Cinema.":
    "Illustrative film listings and showtimes for the NOVA Cinema demo.",
  "Phân loại: P · K · T13 · T16 · T18": "Age ratings: P · K · T13 · T16 · T18",
  "Giá combo minh họa · Áp dụng khi đặt cùng vé xem phim":
    "Demo combo price · Available with movie tickets",
  "NOVA đồng hành trên mọi màn hình. Đặt vé trực tiếp từ trình duyệt điện thoại.":
    "NOVA fits every screen. Book directly from your mobile browser.",
  "Không giới hạn cảm xúc.": "Limitless emotions.",
  "Không giới hạn trải nghiệm.": "Limitless experiences.",
  "NOVA Cinema · Đồ án Nhóm 03": "NOVA Cinema · Group 03 academic project",
  "Giao dịch mô phỏng, không thu tiền thật.":
    "Simulated transactions. No real charges.",
  "DỰ ÁN HỌC PHẦN / HCMUE": "ACADEMIC PROJECT / HCMUE",
  "Dữ liệu rạp, giá vé và quyền lợi được dùng để minh họa.":
    "Cinemas, prices and benefits are illustrative demo data.",
  "Chưa có phim phù hợp. Hãy thử tên phim hoặc đạo diễn khác.":
    "No matching films. Try another title or director.",
  "Xin chào,": "Hello,",
  "Ưu đãi minh họa: giảm 5% tiền vé. Điểm demo đã tích:":
    "Demo benefit: 5% off tickets. Your reward points:",
  "Thể loại": "Genre",
  "Đạo diễn": "Director",
  "Diễn viên": "Cast",
  "Định dạng": "Format",
  "Chất lượng phát phụ thuộc video gốc và kết nối mạng.":
    "Playback quality depends on the original video and your connection.",
  "Mở trailer trên YouTube": "Open trailer on YouTube",
  "Đặt vé": "Book tickets",
  "Trải nghiệm NOVA trên điện thoại": "Experience NOVA on mobile",
  "Bắt đầu đặt vé": "Start booking",
  "Thông tin dự án": "About the project",
  "Dữ liệu & quyền riêng tư": "Data & privacy",
  "Giữ ghế & thanh toán": "Seat holds & payments",
  "Hình ảnh & nội dung": "Images & content",
  "NOVA trên mọi màn hình": "NOVA on every screen",
  "Điều khoản & thông tin dự án": "Terms & project information",
  "Chào mừng đến C’MEMBER": "Welcome to C’MEMBER",
  "Khám phá tài khoản của bạn": "Explore your account",
  "Giao diện tự điều chỉnh cho điện thoại, máy tính bảng và máy tính. Mở địa chỉ website trong trình duyệt và bắt đầu đặt vé. Dự án hiện chưa phát hành ứng dụng iOS/Android.":
    "The interface adapts to phones, tablets and desktop. Open the website in your browser to start booking. No native iOS or Android app has been released.",
  "NOVA Cinema (Infinity) là giao diện minh họa cho đồ án Website Đặt Vé Xem Phim Trực Tuyến, Nhóm 03, HCMUE. Hệ thống không vận hành rạp thật, không thu tiền và chưa có chứng nhận Bộ Công Thương.":
    "NOVA Cinema (Infinity) is a frontend demo for the HCMUE Group 03 online cinema booking project. It does not operate a real cinema, charge money or hold official commerce certification.",
  "Hồ sơ demo, trạng thái ghế và vé được lưu bằng localStorage trên thiết bị. Không nhập thông tin nhạy cảm. Xóa dữ liệu website trong trình duyệt để xóa toàn bộ thông tin demo.":
    "Demo profiles, seats and tickets are stored locally on your device. Do not enter sensitive data. Clear this site’s browser storage to remove all demo information.",
  "Ghế được giữ 5 phút và giải phóng khi hết hạn, hủy hoặc thanh toán thất bại. Đồng bộ demo chỉ giữa các tab cùng trình duyệt; hệ thống thực cần backend để khóa ghế giữa nhiều người dùng. Giá, ưu đãi và lịch chiếu là dữ liệu minh họa.":
    "Seats are held for 5 minutes and released on expiry, cancellation or payment failure. Demo synchronization is limited to tabs in one browser. Multi-user locking requires a backend. Prices, rewards and showtimes are illustrative.",
  "Hình ảnh phim từ TMDB; trailer từ YouTube. Nội dung và hình ảnh thuộc chủ sở hữu tương ứng. Điểm đánh giá được dùng để minh họa giao diện.":
    "Primary images are from TMDB and trailers from YouTube. Content belongs to its respective rights holders. Ratings are illustrative.",
  "Dune: Hành Tinh Cát 2": "Dune: Part Two",
  "Godzilla x Kong: Đế Chế Mới": "Godzilla x Kong: The New Empire",
  "Quật Mộ Trùng Ma": "Exhuma",
  "Khoa học viễn tưởng": "Science fiction",
  "Hành động": "Action",
  "Tâm lý · Tình cảm": "Drama · Romance",
  "Hoạt hình · Gia đình": "Animation · Family",
  "Kinh dị · Bí ẩn": "Horror · Mystery",
  "Tiểu sử · Chính kịch": "Biography · Drama",
  "Hành động · Bí ẩn": "Action · Mystery",
  "Theo chân Paul Atreides trên hành trình báo thù, khi anh sát cánh cùng Chani và người Fremen để lựa chọn giữa tình yêu và vận mệnh của cả vũ trụ.":
    "Follow Paul Atreides as he joins Chani and the Fremen on a journey of revenge, torn between love and the fate of the universe.",
  "Godzilla và Kong đối mặt với một mối đe dọa khổng lồ ẩn sâu trong lòng Trái Đất, thách thức sự tồn tại của cả hai và nhân loại.":
    "Godzilla and Kong confront a colossal threat hidden deep within the Earth, challenging their existence and that of humanity.",
  "Câu chuyện về một người phụ nữ tên Mai và khát khao tìm kiếm hạnh phúc giữa những định kiến và tổn thương của quá khứ.":
    "The story of Mai, a woman searching for happiness while confronting prejudice and the wounds of her past.",
  "Po bắt đầu hành trình tìm người kế nhiệm vị trí Thần Long Đại Hiệp và đối đầu với một kẻ phản diện có khả năng biến hóa.":
    "Po seeks a successor as Dragon Warrior while facing a formidable shape-shifting villain.",
  "Một nhóm chuyên gia tâm linh khai quật ngôi mộ bí ẩn và đánh thức thế lực cổ xưa, kéo họ vào chuỗi sự kiện kinh hoàng.":
    "A team of spiritual experts excavates a mysterious grave, awakening an ancient force and a terrifying chain of events.",
  "Kiệt tác của Christopher Nolan trở lại màn ảnh rộng. Khám phá câu chuyện về J. Robert Oppenheimer và khoảnh khắc thay đổi thế giới mãi mãi.":
    "Christopher Nolan’s masterpiece returns to the big screen. Discover J. Robert Oppenheimer and the moment that changed the world forever.",
  "ĐỊNH MỆNH CỦA MỘT NGƯỜI. TƯƠNG LAI CỦA CẢ VŨ TRỤ.":
    "ONE MAN’S DESTINY. THE FUTURE OF THE UNIVERSE.",
  "HAI HUYỀN THOẠI. MỘT ĐẾ CHẾ MỚI.": "TWO LEGENDS. ONE NEW EMPIRE.",
  "TRẢI NGHIỆM KIỆT TÁC. THEO CÁCH NÓ ĐƯỢC TẠO RA.":
    "EXPERIENCE THE MASTERPIECE. THE WAY IT WAS CREATED.",
});

Object.assign(english, { "Tất cả": "All cities" });
