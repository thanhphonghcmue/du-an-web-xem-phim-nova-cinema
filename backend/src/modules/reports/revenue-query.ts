import { Prisma } from "@prisma/client";
export interface RevenueFilters {
  fromInclusive: Date;
  toExclusive: Date;
  cinemaId?: string;
  movieId?: string;
}
export interface RevenueAggregate {
  ticketRevenue: string;
  comboRevenue: string;
  discountAmount: string;
  netRevenue: string;
  paidBookingCount: string;
  ticketCount: string;
}
export function revenueQuery(filters: RevenueFilters): Prisma.Sql {
  // Never join seat/combo/payment rows into the monetary SUM: one booking must contribute once.
  return Prisma.sql`
    WITH matching_bookings AS MATERIALIZED (
      SELECT b.id, b.total_ticket_amount, b.total_combo_amount, b.discount_amount, b.final_amount
      FROM bookings AS b
      JOIN showtimes AS s ON s.id = b.showtime_id
      JOIN rooms AS r ON r.id = s.room_id
      WHERE b.status = 'PAID' AND b.created_at >= ${filters.fromInclusive} AND b.created_at < ${filters.toExclusive}
        ${filters.cinemaId ? Prisma.sql`AND r.cinema_id = ${filters.cinemaId}::uuid` : Prisma.empty}
        ${filters.movieId ? Prisma.sql`AND s.movie_id = ${filters.movieId}::uuid` : Prisma.empty}
    )
    SELECT COALESCE(SUM(total_ticket_amount), 0)::text AS "ticketRevenue",
      COALESCE(SUM(total_combo_amount), 0)::text AS "comboRevenue",
      COALESCE(SUM(discount_amount), 0)::text AS "discountAmount",
      COALESCE(SUM(final_amount), 0)::text AS "netRevenue",
      COUNT(*)::text AS "paidBookingCount",
      (SELECT COUNT(*) FROM booking_seats AS seats
        JOIN matching_bookings AS paid ON paid.id = seats.booking_id
        WHERE seats.status = 'SOLD')::text AS "ticketCount"
    FROM matching_bookings`;
}
