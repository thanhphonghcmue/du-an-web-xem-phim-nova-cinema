async function cleanupRows(prisma, prefix) {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  const orders = await prisma.booking.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const ids = orders.map((o) => o.id);
  const tickets = await prisma.eTicket.findMany({
    where: { bookingId: { in: ids } },
    select: { id: true },
  });
  await prisma.outboxEvent.deleteMany({
    where: { aggregateId: { in: [...ids, ...tickets.map((t) => t.id)] } },
  });
  await prisma.eTicket.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.payment.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.bookingCombo.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.bookingSeat.deleteMany({ where: { bookingId: { in: ids } } });
  await prisma.booking.deleteMany({ where: { id: { in: ids } } });
  await prisma.refreshToken.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  const cinemas = await prisma.cinema.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const cinemaIds = cinemas.map((c) => c.id);
  const rooms = await prisma.room.findMany({
    where: { cinemaId: { in: cinemaIds } },
    select: { id: true },
  });
  const roomIds = rooms.map((r) => r.id);
  await prisma.showtime.deleteMany({ where: { roomId: { in: roomIds } } });
  await prisma.seat.deleteMany({ where: { roomId: { in: roomIds } } });
  await prisma.room.deleteMany({ where: { id: { in: roomIds } } });
  await prisma.cinema.deleteMany({ where: { id: { in: cinemaIds } } });
  await prisma.movie.deleteMany({
    where: { description: { startsWith: prefix } },
  });
  await prisma.combo.deleteMany({
    where: {
      OR: [
        { name: { startsWith: prefix } },
        { description: { startsWith: prefix + " menu · " } },
      ],
    },
  });
}
module.exports = { cleanupRows };
