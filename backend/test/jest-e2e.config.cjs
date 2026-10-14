module.exports = {
  rootDir: "..",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  setupFiles: ["<rootDir>/test/setup-environment.cjs"],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 15000,
};
