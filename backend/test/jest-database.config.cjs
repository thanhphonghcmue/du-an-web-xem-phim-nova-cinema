const { testDatabaseTarget } = require("../scripts/test-database-target.cjs");
testDatabaseTarget();
module.exports = {
  rootDir: "..",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.database-spec.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};
