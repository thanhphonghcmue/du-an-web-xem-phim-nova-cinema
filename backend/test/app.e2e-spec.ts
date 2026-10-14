import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Server } from "node:http";
import { createApplication } from "../src/bootstrap";

describe("Phase 0 HTTP bootstrap", () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await createApplication({ logger: false });
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the versioned bootstrap endpoint without claiming DB readiness", async () => {
    await request(server)
      .get("/api/v1")
      .expect(200)
      .expect({
        success: true,
        data: {
          application: "NOVA CINEMA (INFINITY)",
          phase: 0,
          status: "bootstrap-ready",
          apiPrefix: "/api/v1",
          database: "not-configured",
          redis: "not-configured",
        },
        message: "NOVA Cinema backend bootstrap is running.",
      });
  });

  it("does not expose an unversioned API", async () => {
    await request(server).get("/").expect(404);
  });

  it("does not advertise unimplemented business or health routes", async () => {
    await request(server).get("/api/v1/bookings").expect(404);
    await request(server).get("/api/v1/health").expect(404);
  });

  it("permits the configured frontend origin", async () => {
    await request(server)
      .get("/api/v1")
      .set("Origin", "http://localhost:3000")
      .expect("Access-Control-Allow-Origin", "http://localhost:3000")
      .expect(200);
  });

  it("does not grant cross-origin access to an unlisted origin", async () => {
    const response = await request(server)
      .get("/api/v1")
      .set("Origin", "https://unlisted.example")
      .expect(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
