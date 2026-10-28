// Artwork, synopses and currency formatting only. No accounts, cinemas, dates or screenings are generated here.
// Bookable records always come from the NestJS programme API.
import discovery from "../content/cinema.json";

const tmdb = (path, size = "w780") =>
  `https://image.tmdb.org/t/p/${size}/${path}`;
export const movies = [
  {
    id: "dune",
    localPoster: "/images/dune-poster.jpg",
    localBackdrop: "/images/dune-scene.jpg",
    title: "Dune: Hành Tinh Cát 2",
    original: "DUNE: PART TWO",
    short: "DUNE",
    part: "PART TWO",
    genre: "Khoa học viễn tưởng",
    duration: 166,
    age: "T16",
    rating: "8.8",
    format: "IMAX",
    year: 2024,
    director: "Denis Villeneuve",
    cast: "Timothée Chalamet, Zendaya, Rebecca Ferguson",
    poster: tmdb("1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"),
    backdrop: tmdb("xOMo8BRK7PfcJvbd3oU3W8W8N3q.jpg", "original"),
    trailer: "Way9Dexny3w",
    status: "now",
    tagline: "ĐỊNH MỆNH CỦA MỘT NGƯỜI. TƯƠNG LAI CỦA CẢ VŨ TRỤ.",
    description:
      "Theo chân Paul Atreides trên hành trình báo thù, khi anh sát cánh cùng Chani và người Fremen để lựa chọn giữa tình yêu và vận mệnh của cả vũ trụ.",
  },
  {
    id: "kong",
    localPoster: "/images/kong-art.jpg",
    localBackdrop: "/images/kong-banner.jpg",
    title: "Godzilla x Kong: Đế Chế Mới",
    original: "GODZILLA × KONG",
    short: "GODZILLA × KONG",
    part: "THE NEW EMPIRE",
    genre: "Hành động",
    duration: 115,
    age: "T13",
    rating: "7.2",
    format: "IMAX",
    year: 2024,
    director: "Adam Wingard",
    cast: "Rebecca Hall, Brian Tyree Henry, Dan Stevens",
    poster: tmdb("z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg"),
    backdrop: tmdb("qrGtVFxaD8c7et0jUtaYhyTzzPg.jpg", "original"),
    trailer: "lV1OOlGwExM",
    status: "now",
    tagline: "HAI HUYỀN THOẠI. MỘT ĐẾ CHẾ MỚI.",
    description:
      "Godzilla và Kong đối mặt với một mối đe dọa khổng lồ ẩn sâu trong lòng Trái Đất, thách thức sự tồn tại của cả hai và nhân loại.",
  },
  {
    id: "mai",
    localPoster: "/images/mai-title.svg",
    title: "Mai",
    original: "MAI",
    short: "MAI",
    part: "MỘT BỘ PHIM CỦA TRẤN THÀNH",
    genre: "Tâm lý · Tình cảm",
    duration: 131,
    age: "T18",
    rating: "8.0",
    format: "2D",
    year: 2024,
    director: "Trấn Thành",
    cast: "Phương Anh Đào, Tuấn Trần, Hồng Đào",
    poster: "/images/mai-title.svg",
    status: "now",
    trailer: "EX6clvId19s",
    description:
      "Câu chuyện về một người phụ nữ tên Mai và khát khao tìm kiếm hạnh phúc giữa những định kiến và tổn thương của quá khứ.",
  },
  {
    id: "panda",
    localPoster: "/images/panda-poster.jpg",
    title: "Kung Fu Panda 4",
    original: "KUNG FU PANDA 4",
    short: "KUNG FU PANDA",
    part: "4",
    genre: "Hoạt hình · Gia đình",
    duration: 94,
    age: "P",
    rating: "7.3",
    format: "2D",
    year: 2024,
    director: "Mike Mitchell",
    cast: "Jack Black, Awkwafina, Viola Davis",
    poster: tmdb("kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg"),
    status: "now",
    trailer: "_inKs4eeHiI",
    description:
      "Po bắt đầu hành trình tìm người kế nhiệm vị trí Thần Long Đại Hiệp và đối đầu với một kẻ phản diện có khả năng biến hóa.",
  },
  {
    id: "exhuma",
    localPoster: "/images/exhuma-poster.jpg",
    title: "Quật Mộ Trùng Ma",
    original: "EXHUMA",
    short: "EXHUMA",
    part: "QUẬT MỘ TRÙNG MA",
    genre: "Kinh dị · Bí ẩn",
    duration: 134,
    age: "T18",
    rating: "8.1",
    format: "2D",
    year: 2024,
    director: "Jang Jae-hyun",
    cast: "Choi Min-sik, Kim Go-eun, Lee Do-hyun",
    poster: tmdb("pQYHouPsDw32FhDLr7E3jmw0WTk.jpg"),
    status: "now",
    trailer: "H2O193v3jkM",
    description:
      "Một nhóm chuyên gia tâm linh khai quật ngôi mộ bí ẩn và đánh thức thế lực cổ xưa, kéo họ vào chuỗi sự kiện kinh hoàng.",
  },
  {
    id: "oppenheimer",
    localBackdrop: "/images/oppenheimer-art.jpg",
    localPoster: "/images/oppenheimer-art.jpg",
    title: "Oppenheimer",
    original: "OPPENHEIMER",
    short: "OPPENHEIMER",
    part: "70MM SPECIAL RE-RELEASE",
    genre: "Tiểu sử · Chính kịch",
    duration: 180,
    age: "T18",
    rating: "9.4",
    format: "70MM",
    year: 2023,
    director: "Christopher Nolan",
    cast: "Cillian Murphy, Emily Blunt, Robert Downey Jr.",
    poster: tmdb("ptpr0kGAckfQkJeJIt8st5dglvd.jpg"),
    backdrop: tmdb("fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg", "original"),
    status: "special",
    trailer: "uYPbbksJxIg",
    tagline: "TRẢI NGHIỆM KIỆT TÁC. THEO CÁCH NÓ ĐƯỢC TẠO RA.",
    description:
      "Kiệt tác của Christopher Nolan trở lại màn ảnh rộng. Khám phá câu chuyện về J. Robert Oppenheimer và khoảnh khắc thay đổi thế giới mãi mãi.",
  },
];
// Enriched local artwork; availability and booking IDs come from the API.
movies.push(...discovery.movies);
export const money = (value) => {
  const match = String(value ?? "0").match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return "—";
  const [, sign, integer, fraction] = match;
  return (
    sign +
    BigInt(integer).toLocaleString("vi-VN") +
    (fraction && /[1-9]/.test(fraction) ? "," + fraction : "") +
    " ₫"
  );
};
export const formatVNDCurrency = money;
