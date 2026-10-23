import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bridge } from "./copilot-bridge.js";
import { registerRoutes } from "./routes.js";
import { ensureSandbox } from "./sandbox.js";

const here = dirname(fileURLToPath(import.meta.url));
const clientDist = resolve(here, "..", "..", "client", "dist");

const PORT = Number(process.env.LAB_STUDIO_PORT ?? 5180);

const app = Fastify({ logger: { level: "warn" } });

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

await app.listen({ port: PORT, host: "127.0.0.1" });
console.log(`\n  Copilot Lab Studio server → http://localhost:${PORT}\n`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void bridge
      .shutdown()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  });
}
