// lib/canvasDefs.mjs — the pure, SDK-free factory the rubber-duck review
// asked for: builds plain canvas descriptor objects (id/description/
// inputSchema/actions-with-handlers) with no dependency on
// @github/copilot-sdk/extension. Tests import this directly and invoke
// handlers to exercise the real canvas contract; extension.mjs is the only
// file that imports the SDK, wrapping each descriptor in `createCanvas()`.

import { buildSdlcBoardCanvas } from "./canvases/sdlcBoardCanvas.mjs";
import { buildCodeMapCanvas } from "./canvases/codeMapCanvas.mjs";
import { buildReleaseComposerCanvas } from "./canvases/releaseComposerCanvas.mjs";

/**
 * @param {{ repoRoot: string, fixturePath: string }} options
 * @returns {Array<object>} canvas descriptors ready for createCanvas()
 */
export function buildCanvasDefs({ repoRoot, fixturePath }) {
    return [
        buildSdlcBoardCanvas({ fixturePath }),
        buildCodeMapCanvas({ repoRoot }),
        buildReleaseComposerCanvas({ repoRoot }),
    ];
}
