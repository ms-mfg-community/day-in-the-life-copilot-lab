// Extension: enterprise-sdlc-workbench
// SDLC board, code map, and release composer canvases for EPIC-001
// enterprise harness operations (Lab 26).
//
// This file only wires `buildCanvasDefs()` (SDK-free, independently testable
// -- see lib/canvasDefs.mjs) into the real `@github/copilot-sdk/extension`
// session. Keep it thin: business logic lives in lib/*.mjs.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";
import { buildCanvasDefs } from "./lib/canvasDefs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .github/extensions/enterprise-sdlc-workbench -> repo root is three levels up.
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const fixturePath = path.join(__dirname, "fixtures", "epic-001-board.json");

const canvasDefs = buildCanvasDefs({ repoRoot, fixturePath });

await joinSession({
    canvases: canvasDefs.map((def) => createCanvas(def)),
});
