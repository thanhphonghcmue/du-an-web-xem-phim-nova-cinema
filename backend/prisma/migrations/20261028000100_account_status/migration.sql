-- Additive: existing accounts remain active; no user data or identifiers change.
BEGIN;
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'LOCKED', 'INACTIVE');
ALTER TABLE "users" ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
COMMIT;
