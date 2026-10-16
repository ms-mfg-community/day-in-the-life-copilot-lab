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

  it.each([
    ["soft hyphen", "\u00AD", "U+00AD"],
    ["Arabic letter mark", "\u061C", "U+061C"],
    ["Mongolian vowel separator", "\u180E", "U+180E"],
    ["zero-width space", "\u200B", "U+200B"],
    ["bidi override", "\u202E", "U+202E"],
    ["variation selector", "\uFE0F", "U+FE0F"],
    ["tag character", "\u{E0049}", "U+E0049"],
    ["supplementary variation selector", "\u{E0100}", "U+E0100"],
  ])("detects %s", async (_name, character, codePoint) => {
    const fixture = mkdtempSync(join(tmpdir(), "unicode-scan-"));
    tempDirs.push(fixture);
    writeFileSync(join(fixture, "unsafe.sh"), `safe${character}hidden`);
    const { scan } = await import(pathToFileURL(SCANNER).href);

    expect(scan(fixture)).toEqual([{ file: "unsafe.sh", line: 1, codePoint }]);
  });

  it("scans PowerShell files and skips binary files", async () => {
    const fixture = mkdtempSync(join(tmpdir(), "unicode-scan-"));
    tempDirs.push(fixture);
    writeFileSync(join(fixture, "unsafe.ps1"), 'Write-Host "safe\u202Ehidden"');
    writeFileSync(
      join(fixture, "image.bin"),
      Buffer.from([0, 0xe2, 0x80, 0xae]),
    );
    const { scan } = await import(pathToFileURL(SCANNER).href);

    expect(scan(fixture)).toEqual([
      { file: "unsafe.ps1", line: 1, codePoint: "U+202E" },
    ]);
  });
});
