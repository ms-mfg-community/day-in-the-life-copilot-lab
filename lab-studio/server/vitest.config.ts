import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The suites reset the sandbox on every test; give them their own root so
    // `npm test` never touches the .sandbox/workspace a running studio uses.
    env: { LAB_STUDIO_SANDBOX: mkdtempSync(join(tmpdir(), "lab-studio-test-")) },
    // The suites share that root — keep runs serial.
    fileParallelism: false,
  },
});
