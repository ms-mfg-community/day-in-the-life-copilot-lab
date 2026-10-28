import type { FastifyInstance } from "fastify";

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export interface OriginGuardOptions {
  /** Ports a browser reaches the studio on: the API port and the Vite dev port. */
  ports: number[];
  /** Extra origins, e.g. http://lab-host:5180 when bound to the network. */
  extraOrigins?: string[];
}

/**
 * A loopback bind keeps other machines out, not other *sites*: any page open in
 * the learner's browser can fire a bodyless POST at /api/sandbox/reset and the
 * browser will deliver it. Browsers always attach Origin to cross-site
 * mutations, so refusing unknown origins on non-GET /api requests closes that
 * hole; pinning Host to the same allow-list closes DNS rebinding.
 *
 * Register before the routes — Fastify binds hooks to routes at registration.
 */
export function registerOriginGuard(
  app: FastifyInstance,
  opts: OriginGuardOptions,
): void {
  const origins = new Set(opts.extraOrigins ?? []);
  for (const host of LOOPBACK_HOSTS) {
    for (const port of opts.ports) origins.add(`http://${host}:${port}`);
  }
  const hosts = new Set([...origins].map((o) => new URL(o).host));

  app.addHook("onRequest", async (req, reply) => {
    if (!req.url.startsWith("/api/")) return;
    const host = req.headers.host ?? "";
    if (!hosts.has(host)) {
      return reply.code(403).send({ error: `Unexpected Host header: ${host}` });
    }
    if (req.method === "GET" || req.method === "HEAD") return;
    const origin = req.headers.origin;
    if (!origin || !origins.has(origin)) {
      return reply
        .code(403)
        .send({ error: "Cross-site request refused: unknown Origin" });
    }
  });
}
