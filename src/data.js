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
// Lịch tái chiếu sắp tới là dữ liệu minh họa, chưa mở bán.
movies.push(
  {
    id: "interstellar-return",
    title: "Interstellar: Infinity Return",
    original: "INTERSTELLAR",
    short: "INTERSTELLAR",
    part: "INFINITY RETURN",
    genre: "Khoa học viễn tưởng",
    duration: 169,
    age: "T13",
    rating: "8.7",
    format: "IMAX",
    year: 2014,
    director: "Christopher Nolan",
    cast: "Matthew McConaughey, Anne Hathaway",
    poster: "/images/interstellar-poster.jpg",
    localPoster: "/images/interstellar-poster.jpg",
    status: "soon",
    trailer: "zSWdZVtXT7E",
    description:
      "Hành trình xuyên không gian trở lại màn ảnh Infinity. Suất tái chiếu minh họa sắp mở bán.",
  },
  {
    id: "dark-knight-midnight",
    title: "The Dark Knight: Midnight Screening",
    original: "THE DARK KNIGHT",
    short: "THE DARK KNIGHT",
    part: "MIDNIGHT SCREENING",
    genre: "Hành động · Bí ẩn",
    duration: 152,
    age: "T16",
    rating: "9.0",
    format: "Dolby Vision",
    year: 2008,
    director: "Christopher Nolan",
    cast: "Christian Bale, Heath Ledger",
    poster: "/images/batman-poster.jpg",
    localPoster: "/images/batman-poster.jpg",
    status: "soon",
    trailer: "EXeTwQWrcwY",
    description:
      "Đêm Gotham trở lại trong chương trình chiếu đặc biệt minh họa. Chưa mở bán vé.",
  },
);
export const cinemas = [
  {
    id: "landmark",
    name: "NOVA Landmark 81",
    city: "TP. Hồ Chí Minh",
    address: "720A Điện Biên Phủ, Bình Thạnh",
    formats: "IMAX 70mm Laser · Dolby Atmos 12.1",
    movies: ["dune", "kong", "mai", "panda", "exhuma", "oppenheimer"],
  },
  {
    id: "sala",
    name: "NOVA Sala",
    city: "TP. Hồ Chí Minh",
    address: "10 Mai Chí Thọ, Thủ Đức",
    formats: "Dolby Atmos 12.1 · 2D Laser",
    movies: ["dune", "kong", "mai", "panda", "exhuma"],
  },
  {
    id: "hanoi",
    name: "NOVA West Lake",
    city: "Hà Nội",
    address: "272 Võ Chí Công, Tây Hồ",
    formats: "IMAX Laser · 2D Laser",
    movies: ["dune", "kong", "panda", "oppenheimer"],
  },
  {
    id: "danang",
    name: "NOVA Riverside",
    city: "Đà Nẵng",
    address: "910 Ngô Quyền, Sơn Trà",
    formats: "Dolby Atmos 12.1 · 2D Laser",
    movies: ["mai", "panda", "exhuma", "kong"],
  },
];
export function getDates(language = "vi") {
  const base = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(`${base}T12:00:00+07:00`);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      id: d.toISOString().slice(0, 10),
      label: `${i === 0 ? (language === "en" ? "Today" : "Hôm nay") : i === 1 ? (language === "en" ? "Tomorrow" : "Ngày mai") : new Intl.DateTimeFormat(language, { weekday: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(d)}, ${new Intl.DateTimeFormat("vi", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(d)}`,
    };
  });
}
export function getShowtimes(cinemaId, movieId, dateId) {
  const today = getDates()[0].id;
  const now = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Ho_Chi_Minh",
    })
      .format(new Date())
      .replace(":", ""),
  );
  const film = movies.find((m) => m.id === movieId);
  const format =
    film?.format === "70MM"
      ? "IMAX 70mm"
      : film?.format === "IMAX" && ["landmark", "hanoi"].includes(cinemaId)
        ? "IMAX Laser"
        : "2D Laser";
  return ["10:00", "13:30", "16:45", "19:30", "22:30"]
    .filter((t) => dateId !== today || Number(t.replace(":", "")) > now)
    .map((time) => ({
      id: time,
      label: `${time} · ${format}`,
      room: format.includes("IMAX") ? "IMAX HALL 01" : "INFINITY HALL 01",
    }));
}
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
