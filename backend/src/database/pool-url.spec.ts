import { boundedPoolUrl } from "./pool-url";
describe("Prisma connection budget", () => {
  it("bounds default connection count, acquisition and connect time", () => {
    const url = new URL(
      boundedPoolUrl("postgresql://probe:unused@localhost/nova"),
    );
    expect(url.searchParams.get("connection_limit")).toBe("10");
    expect(url.searchParams.get("pool_timeout")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("3");
  });
  it("preserves explicit connection count, TLS and schema without exposing credentials", () => {
    const url = new URL(
      boundedPoolUrl(
        "postgresql://probe:unused@localhost/nova?connection_limit=4&sslmode=require&schema=app&pool_timeout=1",
      ),
    );
    expect(url.searchParams.get("connection_limit")).toBe("4");
    expect(url.searchParams.get("pool_timeout")).toBe("1");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.get("schema")).toBe("app");
  });
  it("does not let disabled or excessive waiting override request deadlines", () => {
    const url = new URL(
      boundedPoolUrl(
        "postgresql://localhost/nova?pool_timeout=0&connect_timeout=60",
      ),
    );
    expect(url.searchParams.get("pool_timeout")).toBe("2");
    expect(url.searchParams.get("connect_timeout")).toBe("3");
  });
});
