ALTER TABLE "showtimes" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "showtimes" ADD CONSTRAINT "showtime_status_valid" CHECK ("status" IN ('ACTIVE', 'LOCKED', 'CANCELED'));
