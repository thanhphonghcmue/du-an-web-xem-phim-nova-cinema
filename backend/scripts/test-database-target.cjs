const { config } = require("dotenv");
const { resolve } = require("node:path");
config({ path: resolve(__dirname, "../.env"), quiet: true });
function testDatabaseTarget(environment = process.env) {
  const value = environment.TEST_DATABASE_URL;
  if (!value)
    throw new Error(
      "TEST_DATABASE_URL is required; configure a dedicated PostgreSQL test database.",
    );
  let target;
  let development;
  try {
    target = new URL(value);
    development = environment.DATABASE_URL
      ? new URL(environment.DATABASE_URL)
      : undefined;
  } catch {
    throw new Error(
      "Database connection URLs must be valid; secret values are not included in this error.",
    );
  }
  if (
    !["postgresql:", "postgres:"].includes(target.protocol) ||
    !decodeURIComponent(target.pathname).endsWith("_test")
  ) {
    throw new Error("Test database name must end in _test.");
  }
  if (development) {
    // Require distinct database names even when hostname aliases hide the same server.
    if (target.pathname === development.pathname) {
      throw new Error(
        "Test database must be different from the application database.",
      );
    }
  }
  return value;
}
module.exports = { testDatabaseTarget };
