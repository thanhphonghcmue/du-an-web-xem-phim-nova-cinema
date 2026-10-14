BEGIN;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'CUSTOMER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "CMemberTier" AS ENUM ('SILVER', 'GOLD', 'DIAMOND');

-- CreateEnum
CREATE TYPE "AgeRating" AS ENUM ('P', 'K', 'T13', 'T16', 'T18');

-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('NOW_SHOWING', 'COMING_SOON', 'ENDED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('STANDARD_2D', 'IMAX_70MM_LASER', 'DOLBY_ATMOS');

-- CreateEnum
CREATE TYPE "SeatType" AS ENUM ('STANDARD', 'VIP', 'SWEETBOX');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'HOLDING', 'PAID', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingSeatStatus" AS ENUM ('AVAILABLE', 'HOLDING', 'SOLD');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('SANDBOX', 'MOMO', 'ZALOPAY', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20),
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "c_member_points" INTEGER NOT NULL DEFAULT 0,
    "c_member_tier" "CMemberTier" NOT NULL DEFAULT 'SILVER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "release_date" TIMESTAMPTZ(3) NOT NULL,
    "trailer_url" TEXT,
    "poster_url" TEXT,
    "age_rating" "AgeRating" NOT NULL,
    "status" "MovieStatus" NOT NULL DEFAULT 'COMING_SOON',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cinemas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cinemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cinema_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "room_type" "RoomType" NOT NULL,
    "total_seats" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "seat_row" VARCHAR(8) NOT NULL,
    "seat_column" INTEGER NOT NULL,
    "seat_type" "SeatType" NOT NULL,
    "price_modifier" DECIMAL(4,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showtimes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "movie_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ(3) NOT NULL,
    "end_time" TIMESTAMPTZ(3) NOT NULL,
    "base_ticket_price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "showtimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_code" VARCHAR(40) NOT NULL,
    "user_id" UUID NOT NULL,
    "showtime_id" UUID NOT NULL,
    "total_ticket_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_combo_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "expired_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_seats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "showtime_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "status" "BookingSeatStatus" NOT NULL DEFAULT 'HOLDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "booking_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_combos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "combo_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "ticket_hash" VARCHAR(64) NOT NULL,
    "qr_code_base64" TEXT NOT NULL,
    "is_checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMPTZ(3),
    "checked_in_by_staff_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'SANDBOX',
    "transaction_code" VARCHAR(96) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "request_payload" JSONB,
    "response_payload" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(64) NOT NULL,
    "aggregate_type" VARCHAR(32) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "available_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "locked_at" TIMESTAMPTZ(3),
    "locked_by" VARCHAR(100),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "movies_status_idx" ON "movies"("status");

-- CreateIndex
CREATE INDEX "movies_release_date_idx" ON "movies"("release_date");

-- CreateIndex
CREATE INDEX "cinemas_city_idx" ON "cinemas"("city");

-- CreateIndex
CREATE INDEX "rooms_cinema_id_idx" ON "rooms"("cinema_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_cinema_id_name_key" ON "rooms"("cinema_id", "name");

-- CreateIndex
CREATE INDEX "seats_room_id_idx" ON "seats"("room_id");

-- CreateIndex
CREATE INDEX "seats_room_id_seat_type_idx" ON "seats"("room_id", "seat_type");

-- CreateIndex
CREATE UNIQUE INDEX "seats_room_id_seat_row_seat_column_key" ON "seats"("room_id", "seat_row", "seat_column");

-- CreateIndex
CREATE UNIQUE INDEX "seats_id_room_id_key" ON "seats"("id", "room_id");

-- CreateIndex
CREATE INDEX "showtimes_movie_id_idx" ON "showtimes"("movie_id");

-- CreateIndex
CREATE INDEX "showtimes_room_id_idx" ON "showtimes"("room_id");

-- CreateIndex
CREATE INDEX "showtimes_start_time_idx" ON "showtimes"("start_time");

-- CreateIndex
CREATE INDEX "showtimes_room_id_start_time_idx" ON "showtimes"("room_id", "start_time");

-- CreateIndex
CREATE INDEX "showtimes_movie_id_start_time_idx" ON "showtimes"("movie_id", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "showtimes_id_room_id_key" ON "showtimes"("id", "room_id");

-- CreateIndex
CREATE INDEX "combos_is_active_idx" ON "combos"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_order_code_key" ON "bookings"("order_code");

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_showtime_id_idx" ON "bookings"("showtime_id");

-- CreateIndex
CREATE INDEX "bookings_status_expired_at_idx" ON "bookings"("status", "expired_at");

-- CreateIndex
CREATE INDEX "bookings_status_created_at_showtime_id_idx" ON "bookings"("status", "created_at", "showtime_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_id_showtime_id_key" ON "bookings"("id", "showtime_id");

-- CreateIndex
CREATE INDEX "booking_seats_booking_id_idx" ON "booking_seats"("booking_id");

-- CreateIndex
CREATE INDEX "booking_seats_showtime_id_idx" ON "booking_seats"("showtime_id");

-- CreateIndex
CREATE INDEX "booking_seats_seat_id_idx" ON "booking_seats"("seat_id");

-- CreateIndex
CREATE INDEX "booking_seats_showtime_id_seat_id_idx" ON "booking_seats"("showtime_id", "seat_id");

-- CreateIndex
CREATE INDEX "booking_seats_showtime_id_seat_id_status_idx" ON "booking_seats"("showtime_id", "seat_id", "status");

-- CreateIndex
CREATE INDEX "booking_combos_combo_id_idx" ON "booking_combos"("combo_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_combos_booking_id_combo_id_key" ON "booking_combos"("booking_id", "combo_id");

-- CreateIndex
CREATE UNIQUE INDEX "e_tickets_booking_id_key" ON "e_tickets"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "e_tickets_ticket_hash_key" ON "e_tickets"("ticket_hash");

-- CreateIndex
CREATE INDEX "e_tickets_checked_in_by_staff_id_idx" ON "e_tickets"("checked_in_by_staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_code_key" ON "payments"("transaction_code");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "outbox_events_processed_at_available_at_idx" ON "outbox_events"("processed_at", "available_at");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "outbox_events"("aggregate_type", "aggregate_id");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_cinema_id_fkey" FOREIGN KEY ("cinema_id") REFERENCES "cinemas"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "showtimes" ADD CONSTRAINT "showtimes_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_showtime_id_fkey" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_booking_id_showtime_id_fkey" FOREIGN KEY ("booking_id", "showtime_id") REFERENCES "bookings"("id", "showtime_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_seat_id_room_id_fkey" FOREIGN KEY ("seat_id", "room_id") REFERENCES "seats"("id", "room_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_showtime_id_room_id_fkey" FOREIGN KEY ("showtime_id", "room_id") REFERENCES "showtimes"("id", "room_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "booking_combos" ADD CONSTRAINT "booking_combos_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "booking_combos" ADD CONSTRAINT "booking_combos_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combos"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "e_tickets" ADD CONSTRAINT "e_tickets_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "e_tickets" ADD CONSTRAINT "e_tickets_checked_in_by_staff_id_fkey" FOREIGN KEY ("checked_in_by_staff_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- BR01: retain released history while permitting exactly one active owner.
CREATE UNIQUE INDEX uq_active_showtime_seat
ON booking_seats(showtime_id, seat_id)
WHERE status IN ('HOLDING', 'SOLD');

-- BR03: adjacent half-open intervals are allowed; overlaps in one room are not.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE showtimes ADD CONSTRAINT showtimes_no_room_overlap
EXCLUDE USING gist (
  room_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
);

-- Monetary snapshots and physical/domain invariants, independent of API validation.
ALTER TABLE users
  ADD CONSTRAINT users_points_nonnegative CHECK (c_member_points >= 0),
  ADD CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1),
  ADD CONSTRAINT users_full_name_nonempty CHECK (length(btrim(full_name)) > 0);
ALTER TABLE movies
  ADD CONSTRAINT movies_duration_positive CHECK (duration_minutes > 0),
  ADD CONSTRAINT movies_title_nonempty CHECK (length(btrim(title)) > 0);
ALTER TABLE cinemas ADD CONSTRAINT cinemas_name_nonempty CHECK (length(btrim(name)) > 0);
ALTER TABLE rooms
  ADD CONSTRAINT rooms_seat_count_nonnegative CHECK (total_seats >= 0),
  ADD CONSTRAINT rooms_name_nonempty CHECK (length(btrim(name)) > 0);
ALTER TABLE seats
  ADD CONSTRAINT seats_column_positive CHECK (seat_column > 0),
  ADD CONSTRAINT seats_row_valid CHECK (seat_row ~ '^[A-Z]{1,8}$'),
  ADD CONSTRAINT seats_type_modifier CHECK (
    (seat_type = 'STANDARD' AND price_modifier = 1.00) OR
    (seat_type = 'VIP' AND price_modifier = 1.20) OR
    (seat_type = 'SWEETBOX' AND price_modifier = 1.50)
  );
ALTER TABLE showtimes
  ADD CONSTRAINT showtimes_positive_interval CHECK (end_time > start_time),
  ADD CONSTRAINT showtimes_price_positive CHECK (base_ticket_price > 0);
ALTER TABLE combos ADD CONSTRAINT combos_price_nonnegative CHECK (price >= 0);
ALTER TABLE bookings
  ADD CONSTRAINT bookings_money_nonnegative CHECK (
    total_ticket_amount >= 0 AND total_combo_amount >= 0 AND discount_amount >= 0 AND final_amount >= 0
  ),
  ADD CONSTRAINT bookings_amount_consistent CHECK (
    final_amount = total_ticket_amount + total_combo_amount - discount_amount
  ),
  ADD CONSTRAINT bookings_expiry_after_creation CHECK (expired_at > created_at);
ALTER TABLE booking_seats ADD CONSTRAINT booking_seats_price_nonnegative CHECK (price >= 0);
ALTER TABLE booking_combos
  ADD CONSTRAINT booking_combos_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT booking_combos_price_nonnegative CHECK (unit_price >= 0);
ALTER TABLE e_tickets
  ADD CONSTRAINT e_tickets_hash_valid CHECK (ticket_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT e_tickets_check_in_consistent CHECK (
    (is_checked_in AND checked_in_at IS NOT NULL AND checked_in_by_staff_id IS NOT NULL) OR
    (NOT is_checked_in AND checked_in_at IS NULL AND checked_in_by_staff_id IS NULL)
  );
ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_positive_lifetime CHECK (expires_at > created_at);
ALTER TABLE payments ADD CONSTRAINT payments_amount_nonnegative CHECK (amount >= 0);
ALTER TABLE outbox_events
  ADD CONSTRAINT outbox_attempts_nonnegative CHECK (attempts >= 0),
  ADD CONSTRAINT outbox_lock_consistent CHECK ((locked_at IS NULL) = (locked_by IS NULL));
CREATE INDEX outbox_pending_delivery ON outbox_events(available_at, created_at)
WHERE processed_at IS NULL;

COMMIT;
