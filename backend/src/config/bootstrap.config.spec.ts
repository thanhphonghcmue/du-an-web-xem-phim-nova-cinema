import { readBootstrapConfig } from "./bootstrap.config";

describe("Bootstrap configuration", () => {
  it("defaults to a backend port separate from Next.js", () => {
    expect(readBootstrapConfig({})).toEqual({
      port: 4000,
      host: "0.0.0.0",
      corsOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    });
  });

  it.each(["abc", "0", "-1", "65536", "4000.5", "4000garbage", ""])(
    "rejects invalid PORT %s before binding a server",
    (port) => {
      expect(() => readBootstrapConfig({ PORT: port })).toThrow("PORT");
    },
  );

  it("uses the configured port and normalized origins", () => {
    expect(
      readBootstrapConfig({
        PORT: "4100",
        HOST: "127.0.0.1",
        CORS_ORIGINS: " https://nova.example,https://nova.example ",
      }),
    ).toEqual({
      port: 4100,
      host: "127.0.0.1",
      corsOrigins: ["https://nova.example"],
    });
  });

  it("allows an explicit empty origin list to disable browser CORS access", () => {
    expect(readBootstrapConfig({ CORS_ORIGINS: "" }).corsOrigins).toEqual([]);
  });

  it.each([
    "*",
    "https://nova.example/path",
    "https://user:password@nova.example",
    "file:///tmp/a",
  ])("rejects invalid CORS origin %s", (origin) => {
    expect(() => readBootstrapConfig({ CORS_ORIGINS: origin })).toThrow(
      "CORS_ORIGINS",
    );
  });

  it("rejects an empty bind host", () => {
    expect(() => readBootstrapConfig({ HOST: " " })).toThrow("HOST");
  });
});
