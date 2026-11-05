import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// Chạy migration nguyên bản trên hai bảng cũ trong schema test riêng, không sửa public.
it("backfills unique readable codes without changing legacy QR, IDs or admission state", async () => {
  const target = process.env.TEST_DATABASE_URL;
  if (!target) throw new Error("TEST_DATABASE_URL is required.");
  const db = new PrismaClient({ datasourceUrl: target });
  const schema = `ticket_migration_${randomUUID().replaceAll("-", "")}`;
  const ids = [randomUUID(), randomUUID()] as const;
  const bookings = [randomUUID(), randomUUID()] as const;
  const staff = randomUUID();
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const migration = readFileSync(
      resolve(
        __dirname,
        "../prisma/migrations/20261105000100_per_seat_tickets/migration.sql",
      ),
      "utf8",
    );
    const result = spawnSync(
      process.execPath,
      [
        require.resolve("prisma/build/index.js"),
        "db",
        "execute",
        "--stdin",
        "--schema",
        "prisma/schema.prisma",
      ],
      {
        cwd: resolve(__dirname, ".."),
        env: { ...process.env, DATABASE_URL: target },
        encoding: "utf8",
        timeout: 20000,
        input: `SET search_path TO "${schema}", public;
        CREATE TABLE booking_seats (id uuid PRIMARY KEY, booking_id uuid NOT NULL);
        CREATE TABLE e_tickets (id uuid PRIMARY KEY, booking_id uuid NOT NULL, ticket_hash text UNIQUE NOT NULL, qr_code_base64 text NOT NULL, is_checked_in boolean NOT NULL, checked_in_at timestamptz, checked_in_by_staff_id uuid);
        CREATE UNIQUE INDEX e_tickets_booking_id_key ON e_tickets(booking_id);
        INSERT INTO e_tickets VALUES ('${ids[0]}','${bookings[0]}','legacy-opaque-one','legacy-png-one',false,NULL,NULL), ('${ids[1]}','${bookings[1]}','legacy-opaque-two','legacy-png-two',true,'2026-11-05T10:00:00Z','${staff}');
        ${migration}`,
      },
    );
    // Không in output CLI có thể chứa cấu hình kết nối.
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    const rows = await db.$queryRawUnsafe<
      Array<{
        id: string;
        ticket_code: string;
        booking_seat_id: string | null;
        ticket_hash: string;
        qr_code_base64: string;
        is_checked_in: boolean;
        checked_in_at: Date | null;
        checked_in_by_staff_id: string | null;
      }>
    >(`SELECT * FROM "${schema}".e_tickets ORDER BY ticket_hash`);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.ticket_code)).size).toBe(2);
    for (const row of rows) {
      expect(row.ticket_code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect(row.booking_seat_id).toBeNull();
    }
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: ids[0],
        ticket_hash: "legacy-opaque-one",
        qr_code_base64: "legacy-png-one",
        is_checked_in: false,
        checked_in_at: null,
      }),
    );
    expect(rows[1]).toEqual(
      expect.objectContaining({
        id: ids[1],
        ticket_hash: "legacy-opaque-two",
        qr_code_base64: "legacy-png-two",
        is_checked_in: true,
        checked_in_at: new Date("2026-11-05T10:00:00Z"),
        checked_in_by_staff_id: staff,
      }),
    );
  } finally {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
