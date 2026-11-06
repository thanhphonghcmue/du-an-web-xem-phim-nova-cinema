const { randomUUID } = require("node:crypto");
module.exports.seedMemoryAdmission = ({
  maps,
  users,
  orders,
  tickets,
  layouts,
  issue,
  now,
}) => {
  if (
    process.env.NODE_ENV === "production" ||
    [...tickets.values()].some((t) => t.shortCode === "V1")
  )
    return;
  const owner = [...users.values()].find(
    (u) => u.role === "CUSTOMER" && u.cMemberTier === "GOLD",
  );
  if (!owner) return;
  const cinemaId = randomUUID(),
    movieId = randomUUID(),
    roomId = randomUUID();
  maps.cinemas.set(cinemaId, {
    id: cinemaId,
    name: "NOVA Landmark 81 · Vé mẫu",
    city: "TP. Hồ Chí Minh",
    address: "720A Điện Biên Phủ",
  });
  maps.movies.set(movieId, {
    id: movieId,
    title: "Dune: Hành Tinh Cát 2 · Vé mẫu",
    durationMinutes: 120,
    status: "ENDED",
    ageRating: "T16",
  });
  maps.rooms.set(roomId, {
    id: roomId,
    cinemaId,
    name: "Hall 1 (IMAX 70mm Laser)",
    roomType: "IMAX_70MM_LASER",
    totalSeats: 4,
  });
  const seats = [8, 9, 10, 11].map((n) => ({
    id: randomUUID(),
    roomId,
    seatRow: "F",
    seatColumn: n,
    seatType: "VIP",
  }));
  layouts.set(roomId, seats);
  const day = new Date(now() + 7 * 3600000).toISOString().slice(0, 10);
  const mainShow = randomUUID(),
    lateShow = randomUUID();
  const combo = [...maps.combos.values()].find(
    (c) => c.isActive && Number(c.price) === 69000,
  );
  for (let i = 0; i < 3; i++) {
    const showtimeId = i === 2 ? lateShow : mainShow,
      startTime = new Date(
        `${day}T${i === 2 ? "21:45" : "19:30"}:00+07:00`,
      ).toISOString();
    maps.showtimes.set(showtimeId, {
      id: showtimeId,
      movieId,
      roomId,
      startTime,
      endTime: new Date(Date.parse(startTime) + 120 * 60000).toISOString(),
      baseTicketPrice: "112500",
      status: "LOCKED",
    });
    const order = {
      id: randomUUID(),
      orderCode: "NOVA-" + randomUUID().replaceAll("-", ""),
      userId: owner.id,
      showtimeId,
      status: "PAID",
      seats: (i === 0 ? seats.slice(0, 2) : [seats[i + 1]]).map((s) => ({
        seatId: s.id,
        price: "135000",
        status: "SOLD",
      })),
      combos:
        i === 0 && combo
          ? [{ comboId: combo.id, quantity: 1, unitPrice: combo.price }]
          : [],
      finalAmount: i === 0 ? (combo ? "315270" : "251100") : "125550",
      totalTicketAmount: i === 0 ? "270000" : "135000",
      totalComboAmount: i === 0 && combo ? "69000" : "0",
      discountAmount: i === 0 ? (combo ? "23730" : "18900") : "9450",
      membershipTier: "GOLD",
      createdAt: new Date(now()).toISOString(),
      expiredAt: new Date(now() + 300000).toISOString(),
    };
    orders.set(order.id, order);
    issue(order);
    const rows = [...tickets.values()].filter((t) => t.bookingId === order.id);
    rows.forEach((t, j) =>
      Object.assign(t, {
        ticketCode:
          i === 0
            ? `NOVA-20261102-8F9${j ? "B" : "A"}`
            : i === 1
              ? "NOVA-20261102-USED"
              : "NOVA-20261102-LATE",
        shortCode: i === 0 ? (j ? "V1B" : "V1") : i === 1 ? "V2" : "V3",
        aliases: i === 0 ? [j ? "8F9B" : "8F9A"] : [],
        demoOnly: true,
        checkedInBy:
          i === 1
            ? [...users.values()].find((u) => u.role === "STAFF")?.id
            : null,
        isCheckedIn: i === 1,
        checkedInAt:
          i === 1 ? new Date(now() - 16 * 60000).toISOString() : null,
      }),
    );
  }
};
