const { testDatabaseTarget } = jest.requireActual<{
  testDatabaseTarget: (environment: NodeJS.ProcessEnv) => string;
}>("../../scripts/test-database-target.cjs");

describe("Database test target isolation", () => {
  it("requires a configured test target", () => {
    expect(() => testDatabaseTarget({})).toThrow("TEST_DATABASE_URL");
  });
  it("refuses the development database name", () => {
    expect(() =>
      testDatabaseTarget({
        TEST_DATABASE_URL: "postgresql://db.invalid/nova_development",
      }),
    ).toThrow("_test");
  });
  it("refuses the same database even with a different hostname alias", () => {
    expect(() =>
      testDatabaseTarget({
        DATABASE_URL: "postgresql://localhost/nova_test",
        TEST_DATABASE_URL: "postgresql://127.0.0.1/nova_test",
      }),
    ).toThrow("different");
  });
  it("returns a separately named PostgreSQL test target", () => {
    const target = "postgresql://db.invalid/nova_test";
    expect(
      testDatabaseTarget({
        DATABASE_URL: "postgresql://db.invalid/nova_development",
        TEST_DATABASE_URL: target,
      }),
    ).toBe(target);
  });
  it("rejects non-PostgreSQL targets", () => {
    expect(() =>
      testDatabaseTarget({ TEST_DATABASE_URL: "https://db.invalid/nova_test" }),
    ).toThrow("_test");
  });
  it("reports invalid URLs without including connection input", () => {
    expect(() =>
      testDatabaseTarget({ TEST_DATABASE_URL: "malformed-connection-input" }),
    ).toThrow(
      /^Database connection URLs must be valid; secret values are not included in this error\.$/,
    );
  });
});
