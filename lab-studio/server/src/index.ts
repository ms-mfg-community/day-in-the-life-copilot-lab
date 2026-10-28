import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bridge } from "./copilot-bridge.js";
import { registerOriginGuard } from "./origin-guard.js";
import { registerRoutes } from "./routes.js";
import { ensureSandbox } from "./sandbox.js";

const here = dirname(fileURLToPath(import.meta.url));
const clientDist = resolve(here, "..", "..", "client", "dist");

const PORT = Number(process.env.LAB_STUDIO_PORT ?? 5180);
// Loopback by default: the studio is single-user and unauthenticated, and its
// terminal drives a live Copilot session. Opt into a network bind (e.g. inside
// a container or behind a reverse proxy) with LAB_STUDIO_HOST=0.0.0.0.
const HOST = process.env.LAB_STUDIO_HOST ?? "127.0.0.1";

const app = Fastify({ logger: { level: "warn" } });

// 5190 is the Vite dev server (client/vite.config.ts), which proxies /api here.
// LAB_STUDIO_ORIGINS adds the origins a network bind is reached on.
registerOriginGuard(app, {
  ports: [PORT, 5190],
  extraOrigins: (process.env.LAB_STUDIO_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
});
registerRoutes(app);

if (existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api/")) {
      void reply.code(404).send({ error: "Not found" });
    } else {
      void reply.sendFile("index.html");
    }
  });
}

ensureSandbox();

await app.listen({ port: PORT, host: HOST });
console.log(`\n  Copilot Lab Studio server → http://localhost:${PORT}\n`);
if (HOST !== "127.0.0.1" && HOST !== "localhost") {
  console.log(
    `  ⚠ Bound to ${HOST} — the studio has no authentication and runs a live\n` +
      `    Copilot session with tool access on this machine. Only expose it on\n` +
      `    networks you trust, or put it behind an authenticating proxy/VPN.\n`,
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void bridge
      .shutdown()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  });
}
