require("dotenv").config({
  path: require("node:path").resolve(__dirname, "../.env"),
  quiet: true,
});
const { PrismaClient } = require("@prisma/client");
const { seedAdmissionFixtures } = require("./admission-fixtures.cjs");
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development only.");
  const db = new PrismaClient();
  try {
    const owner = await db.user.findFirst({
      where: { role: "CUSTOMER", cMemberTier: "GOLD" },
    });
    const staff = await db.user.findFirst({ where: { role: "STAFF" } });
    if (!owner || !staff)
      throw new Error("Run the development account seed first.");
    await seedAdmissionFixtures(db, { userId: owner.id, staffId: staff.id });
    console.log(
      "Admission fixtures ready: V1 / 8F9A / V1B, V2 (USED), V3 (21:45). Owner: " +
        owner.email +
        ". Demo-only; real tickets retain their admission time window.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Cannot seed admission fixtures; check native development DB and accounts.",
  );
  process.exitCode = 1;
});
