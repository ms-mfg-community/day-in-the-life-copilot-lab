import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerOriginGuard } from "../src/origin-guard.js";

function build() {
  const app = Fastify();
  registerOriginGuard(app, {
    ports: [5180, 5190],
    extraOrigins: ["http://lab-host:5180"],
  });
  app.post("/api/sandbox/reset", async () => ({ ok: true }));
  app.get("/api/health", async () => ({ ok: true }));
  return app;
}

const post = (headers: Record<string, string>) =>
  build().inject({ method: "POST", url: "/api/sandbox/reset", headers });

describe("origin guard", () => {
  it("crossSitePost.knownHostUnknownOrigin.403", async () => {
    const res = await post({
      host: "localhost:5180",
      origin: "http://evil.example",
    });
    expect(res.statusCode).toBe(403);
  });

  it("bodylessPostWithoutOrigin.403", async () => {
    const res = await post({ host: "localhost:5180" });
    expect(res.statusCode).toBe(403);
  });

  it("sameOriginPost.apiPort.200", async () => {
    const res = await post({
      host: "127.0.0.1:5180",
      origin: "http://127.0.0.1:5180",
    });
    expect(res.statusCode).toBe(200);
  });

  it("viteDevPost.proxiedWithDevOrigin.200", async () => {
    // Vite's proxy rewrites Host to the API target but forwards Origin as-is.
    const res = await post({
      host: "localhost:5180",
      origin: "http://localhost:5190",
    });
    expect(res.statusCode).toBe(200);
  });

  it("extraOriginPost.networkBind.200", async () => {
    const res = await post({
      host: "lab-host:5180",
      origin: "http://lab-host:5180",
    });
    expect(res.statusCode).toBe(200);
  });

  it("dnsRebinding.unknownHostOnGet.403", async () => {
    const res = await build().inject({
      method: "GET",
      url: "/api/health",
      headers: { host: "attacker.example:5180" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("get.knownHostNoOrigin.200", async () => {
    const res = await build().inject({
      method: "GET",
      url: "/api/health",
      headers: { host: "localhost:5180" },
    });
    expect(res.statusCode).toBe(200);
  });
});
