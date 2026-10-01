import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SCANNER = join(
  ROOT,
  "enterprise-harness-bundle",
  "scripts",
  "scan-unicode.mjs",
);
const tempDirs: string[] = [];

afterEach(() => {
  for (const path of tempDirs.splice(0)) {
    rmSync(path, { recursive: true, force: true });
  }
});

describe("enterprise-harness-bundle: Unicode supply-chain scan", () => {
  it("passes against the bundle", async () => {
    const { scan } = await import(pathToFileURL(SCANNER).href);
    expect(scan(join(ROOT, "enterprise-harness-bundle"))).toEqual([]);
  });

  it("detects bidirectional and zero-width controls", async () => {
    const fixture = mkdtempSync(join(tmpdir(), "unicode-scan-"));
    tempDirs.push(fixture);
    writeFileSync(join(fixture, "unsafe.md"), "safe\u202Ehidden\u200Btext");
    const { scan } = await import(pathToFileURL(SCANNER).href);

    expect(scan(fixture)).toEqual([
      { file: "unsafe.md", line: 1, codePoint: "U+202E" },
      { file: "unsafe.md", line: 1, codePoint: "U+200B" },
    ]);
  });
});
