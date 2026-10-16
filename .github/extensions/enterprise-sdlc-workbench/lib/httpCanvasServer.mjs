// lib/httpCanvasServer.mjs — tiny shared helper: binds a loopback-only HTTP
// server on an ephemeral port and serves whatever `getHtml()` returns for
// every GET /. Used by all three canvases so each `open()` call is a couple
// of lines instead of repeating server bootstrap three times.

import { createServer } from "node:http";

export async function startInstanceServer(getHtml) {
    const server = createServer((req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(getHtml());
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return {
        url: `http://127.0.0.1:${port}/`,
        close: () => new Promise((resolve) => server.close(() => resolve())),
    };
}
