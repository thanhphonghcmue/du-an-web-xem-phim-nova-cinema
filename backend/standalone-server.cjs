/**
 * Standalone Backend Server for NOVA Cinema
 * Listens on port 4000 and serves all /api/v1/* endpoints required by the Next.js BFF proxy.
 * Eliminates external database/Docker dependency when running fullstack locally.
 */
const { createHash } = require("node:crypto");
const { resolve } = require("node:path");
const { readFileSync } = require("node:fs");

const root = resolve(__dirname, "..");
const discovery = JSON.parse(
  readFileSync(resolve(root, "content/cinema.json"), "utf8"),
);
const { programmeWindow, filmDay, dayKey, midnight, DAY } = require(
  resolve(root, "content/programme-calendar.cjs"),
);

const id = (key) => {
  const bytes = createHash("sha256")
    .update(`nova-cinema-demo:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

// 1. Movies (24 titles)
const originalMovies = [
  {
    id: "dune",
    title: "Dune: Hành Tinh Cát 2",
    durationMinutes: 166,
    ageRating: "T16",
    status: "NOW_SHOWING",
    posterUrl: "/images/dune-poster.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    releaseDate: "2024-03-01T00:00:00.000Z",
  },
  {
    id: "kong",
    title: "Godzilla x Kong: Đế Chế Mới",
    durationMinutes: 115,
    ageRating: "T13",
    status: "NOW_SHOWING",
    posterUrl: "/images/kong-art.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=lV1OOlGwExM",
    releaseDate: "2024-03-29T00:00:00.000Z",
  },
  {
    id: "mai",
    title: "Mai",
    durationMinutes: 131,
    ageRating: "T18",
    status: "NOW_SHOWING",
    posterUrl: "/images/mai-title.svg",
    trailerUrl: "https://www.youtube.com/watch?v=EX6clvId19s",
    releaseDate: "2024-02-10T00:00:00.000Z",
  },
  {
    id: "panda",
    title: "Kung Fu Panda 4",
    durationMinutes: 94,
    ageRating: "P",
    status: "NOW_SHOWING",
    posterUrl: "/images/panda-poster.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=_inKs4eeHiI",
    releaseDate: "2024-03-08T00:00:00.000Z",
  },
  {
    id: "exhuma",
    title: "Quật Mộ Trùng Ma",
    durationMinutes: 134,
    ageRating: "T18",
    status: "NOW_SHOWING",
    posterUrl: "/images/exhuma-poster.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=H2O193v3jkM",
    releaseDate: "2024-02-22T00:00:00.000Z",
  },
  {
    id: "oppenheimer",
    title: "Oppenheimer",
    durationMinutes: 180,
    ageRating: "T18",
    status: "NOW_SHOWING",
    posterUrl: "/images/oppenheimer-art.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    releaseDate: "2023-07-21T00:00:00.000Z",
  },
];

const catalogMovies = [
  ...originalMovies.map((m) => ({
    ...m,
    id: id(`movie:${m.id}`),
    key: m.id,
  })),
  ...discovery.movies.map((m) => ({
    id: id(`movie:${m.id}`),
    key: m.id,
    title: m.title,
    durationMinutes: m.duration,
    ageRating: m.age,
    status: m.status === "soon" ? "COMING_SOON" : "NOW_SHOWING",
    posterUrl: m.poster || m.localPoster,
    trailerUrl: m.trailer
      ? `https://www.youtube.com/watch?v=${m.trailer}`
      : undefined,
    releaseDate: `${m.year || 2024}-01-01T00:00:00.000Z`,
  })),
];

// 2. Cinemas
const cinemas = [
  {
    id: id("cinema:landmark"),
    key: "landmark",
    name: "NOVA Landmark 81",
    city: "TP. Hồ Chí Minh",
    address: "720A Điện Biên Phủ, Bình Thạnh",
  },
  {
    id: id("cinema:westlake"),
    key: "westlake",
    name: "NOVA West Lake",
    city: "Hà Nội",
    address: "272 Võ Chí Công, Tây Hồ",
  },
  {
    id: id("cinema:sala"),
    key: "sala",
    name: "NOVA Sala",
    city: "TP. Hồ Chí Minh",
    address: "10 Mai Chí Thọ, Thủ Đức",
  },
  {
    id: id("cinema:danang"),
    key: "danang",
    name: "NOVA Riverside",
    city: "Đà Nẵng",
    address: "910 Ngô Quyền, Sơn Trà",
  },
];

// 3. Rooms & Showtimes Generation
const window = programmeWindow();
const rooms = [];
const showtimes = [];

const nowPlayingFilms = catalogMovies.filter((m) => m.status === "NOW_SHOWING");
const comingSoonFilms = catalogMovies.filter((m) => m.status === "COMING_SOON");

for (const cinema of cinemas) {
  const cRooms = [];
  // 16 halls per cinema for now-showing
  for (let hall = 0; hall < 16; hall++) {
    const roomId = id(`room:advance:${cinema.key}:${hall}`);
    const rType =
      hall % 4 === 0
        ? "IMAX_70MM_LASER"
        : hall % 4 === 1
          ? "DOLBY_ATMOS"
          : "STANDARD_2D";
    const rName = `NOVA ${hall % 4 === 0 ? "IMAX" : hall % 4 === 1 ? "Dolby" : "Laser"} Studio ${String(hall + 1).padStart(2, "0")}`;
    const room = {
      id: roomId,
      cinemaId: cinema.id,
      name: rName,
      roomType: rType,
      totalSeats: 160,
    };
    rooms.push(room);
    cRooms.push(room);

    // 4 periods per day across all days in window
    for (let day = 0; day <= window.daysAhead; day++) {
      const baseDay = window.today + day * DAY;
      const plans = [9, 13, 17, 21].map((hour, slot) => {
        const movie =
          nowPlayingFilms[
            (hall + (slot % 2) * Math.ceil(nowPlayingFilms.length / 2)) %
              nowPlayingFilms.length
          ];
        const startTime = new Date(
          baseDay + (hour * 60 + (hall % 3) * 15) * 60000,
        );
        const endTime = new Date(
          startTime.getTime() + (movie.durationMinutes + 15) * 60000,
        );
        return { movie, startTime, endTime };
      });

      for (const [slot, plan] of plans.entries()) {
        const showId = id(
          `showtime:advance:${roomId}:${dayKey(plan.startTime)}:${slot}`,
        );
        showtimes.push({
          id: showId,
          movieId: plan.movie.id,
          roomId,
          startTime: plan.startTime.toISOString(),
          endTime: plan.endTime.toISOString(),
          baseTicketPrice: rType === "STANDARD_2D" ? "90000.00" : "105000.00",
        });
      }
    }
  }

  // Dedicated rooms for early presale coming-soon films
  for (const [index, movie] of comingSoonFilms.entries()) {
    for (let side = 0; side < 2; side++) {
      const roomId = id(`room:presale:${cinema.key}:${index}:${side}`);
      const rType = side === 0 ? "STANDARD_2D" : "DOLBY_ATMOS";
      const room = {
        id: roomId,
        cinemaId: cinema.id,
        name: `NOVA Presale Hall ${String(index * 2 + side + 1).padStart(2, "0")}`,
        roomType: rType,
        totalSeats: 160,
      };
      rooms.push(room);

      for (let day = 0; day <= window.daysAhead; day++) {
        const baseDay = window.today + day * DAY;
        for (const plan of filmDay(movie, side, baseDay)) {
          const showId = id(
            `showtime:presale:${movie.key}:${roomId}:${dayKey(plan.startTime)}:${side}`,
          );
          showtimes.push({
            id: showId,
            movieId: movie.id,
            roomId,
            startTime: plan.startTime.toISOString(),
            endTime: plan.endTime.toISOString(),
            baseTicketPrice: side === 0 ? "90000.00" : "105000.00",
          });
        }
      }
    }
  }
}

// 4. Combos
// Share the menu and stable UUIDs with the additive PostgreSQL seed.
// This server remains a disposable in-memory demo; response fields stay unchanged.
const defaultCombos = discovery.menu.map((item) => ({
  id: id(`combo:${item.key}`),
  name: item.name,
  description: item.description,
  price: Number(item.price).toFixed(2),
  isActive: true,
}));

// In-Memory Data Stores
const usersStore = new Map([
  [
    "admin@nova.local",
    {
      id: "usr_admin_01",
      email: "admin@nova.local",
      password: "nova@12345",
      fullName: "Quản Trị Viên NOVA",
      role: "ADMIN",
      cMemberTier: "PLATINUM",
      cMemberPoints: 9999,
      phone: "0901234567",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  [
    "staff@nova.local",
    {
      id: "usr_staff_01",
      email: "staff@nova.local",
      password: "nova@12345",
      fullName: "Nhân Viên Soát Vé - NV01",
      role: "STAFF",
      cMemberTier: "GOLD",
      cMemberPoints: 1200,
      phone: "0912345678",
      createdAt: "2026-01-15T00:00:00.000Z",
    },
  ],
  [
    "customer@nova.local",
    {
      id: "usr_cust_01",
      email: "customer@nova.local",
      password: "nova@12345",
      fullName: "Khách Hàng Thân Thiết NOVA",
      role: "CUSTOMER",
      cMemberTier: "SILVER",
      cMemberPoints: 450,
      phone: "0987654321",
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ],
]);

const { createMemoryServer } = require("./standalone/runtime.cjs");
const server = createMemoryServer({
  movies: catalogMovies,
  cinemas,
  rooms,
  showtimes,
  combos: defaultCombos,
  accounts: [...usersStore.values()].map((user) => ({
    ...user,
    password: process.env.NOVA_DEMO_PASSWORD || user.password,
  })),
});
const port = Number(process.env.NOVA_API_PORT || process.env.PORT || 4000);
server.listen(port, "0.0.0.0", () => {
  console.log(
    `[NOVA RAM] Disposable demo API ready on port ${port}; data is not persisted.`,
  );
});
