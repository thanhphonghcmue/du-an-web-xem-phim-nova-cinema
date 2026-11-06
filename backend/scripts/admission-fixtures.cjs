// Bộ fixture tự chứa, không sửa đơn/vé thật; chạy seed lại không reset vé đã USED.
const { randomUUID, randomBytes, createHmac } = require("node:crypto");
async function seedAdmissionFixtures(
  db,
  { userId, staffId, prefix = "nova-admission-demo" },
) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Admission fixtures are disabled in production.");
  const existing = await db.eTicket.findFirst({ where: { shortCode: "V1" } });
  if (existing) return { existing: true, ticketId: existing.id };
  const now = new Date(),
    today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(`${today}T19:30:00+07:00`),
    late = new Date(`${today}T21:45:00+07:00`);
  const { ticketQrPng } = require("../dist/modules/tickets/ticket-qr.js");
  return db.$transaction(
    async (tx) => {
      const cinema = await tx.cinema.create({
        data: {
          name: prefix + " · NOVA Landmark 81",
          address: "720A Điện Biên Phủ",
          city: "TP. Hồ Chí Minh",
        },
      });
      const movie = await tx.movie.create({
        data: {
          title: `Dune: Hành Tinh Cát 2 · Demo UC14 · ${prefix}`,
          description: prefix + " demo only",
          durationMinutes: 120,
          ageRating: "T16",
          status: "ENDED",
          releaseDate: now,
        },
      });
      const room = await tx.room.create({
        data: {
          cinemaId: cinema.id,
          name: "Hall 1 (IMAX 70mm Laser)",
          roomType: "IMAX_70MM_LASER",
          totalSeats: 4,
        },
      });
      const seats = [];
      for (const column of [8, 9, 10, 11])
        seats.push(
          await tx.seat.create({
            data: {
              roomId: room.id,
              seatRow: "F",
              seatColumn: column,
              seatType: "VIP",
              priceModifier: "1.20",
            },
          }),
        );
      const shows = [];
      for (const date of [start, late])
        shows.push(
          await tx.showtime.create({
            data: {
              status: "LOCKED",
              movieId: movie.id,
              roomId: room.id,
              startTime: date,
              endTime: new Date(date.getTime() + 120 * 60000),
              baseTicketPrice: "112500",
            },
          }),
        );
      const combo = await tx.combo.findFirst({
        where: { isActive: true, price: "69000" },
      });
      const result = [];
      for (let index = 0; index < 3; index++) {
        const order = await tx.booking.create({
          data: {
            userId,
            showtimeId: shows[index === 2 ? 1 : 0].id,
            orderCode: "NOVA-" + randomBytes(16).toString("hex"),
            status: "PAID",
            membershipTier: "GOLD",
            baseTicketPrice: "112500",
            discountRate: "0.070",
            discountAmount: index === 0 ? (combo ? "23730" : "18900") : "9450",
            totalTicketAmount: index === 0 ? "270000" : "135000",
            totalComboAmount: index === 0 && combo ? "69000" : "0",
            finalAmount: index === 0 ? (combo ? "315270" : "251100") : "125550",
            expiredAt: new Date(now.getTime() + 300000),
          },
        });
        if (index === 0 && combo)
          await tx.bookingCombo.create({
            data: {
              bookingId: order.id,
              comboId: combo.id,
              quantity: 1,
              unitPrice: combo.price,
            },
          });
        const codes =
          index === 0
            ? [
                ["NOVA-20261102-8F9A", "V1", ["8F9A"]],
                ["NOVA-20261102-8F9B", "V1B", ["8F9B"]],
              ]
            : [
                [
                  index === 1 ? "NOVA-20261102-USED" : "NOVA-20261102-LATE",
                  index === 1 ? "V2" : "V3",
                  [],
                ],
              ];
        for (let j = 0; j < codes.length; j++) {
          const seat = seats[index === 0 ? j : index + 1];
          const line = await tx.bookingSeat.create({
            data: {
              bookingId: order.id,
              showtimeId: order.showtimeId,
              roomId: room.id,
              seatId: seat.id,
              status: "SOLD",
              price: "135000",
            },
          });
          const hash = randomBytes(32).toString("hex"),
            url = `${(process.env.CORS_ORIGINS || "http://localhost:3000").split(",")[0]}/ve#${hash}`;
          const ticket = await tx.eTicket.create({
            data: {
              id: randomUUID(),
              bookingId: order.id,
              bookingSeatId: line.id,
              ticketCode: codes[j][0],
              shortCode: codes[j][1],
              aliases: codes[j][2],
              ticketHash: hash,
              qrPayload: url,
              qrCodeBase64: ticketQrPng(url),
              hmacSignature: createHmac("sha256", process.env.JWT_ACCESS_SECRET)
                .update(`nova-ticket:v1:${order.id}:${hash}`)
                .digest("hex"),
              demoOnly: true,
              isCheckedIn: index === 1,
              checkedInAt:
                index === 1 ? new Date(now.getTime() - 16 * 60000) : null,
              checkedInByStaffId: index === 1 ? staffId : null,
            },
          });
          result.push({
            code: ticket.shortCode,
            id: ticket.id,
            showtimeId: order.showtimeId,
          });
        }
      }
      return { tickets: result, showtimeId: shows[0].id };
    },
    { timeout: 20000 },
  );
}
module.exports = { seedAdmissionFixtures };
