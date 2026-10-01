import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BUNDLE_DIR = join(ROOT, "enterprise-harness-bundle");
const INSTALL_SCRIPT = join(BUNDLE_DIR, "scripts", "install.mjs");

describe("enterprise-harness-bundle: installer dry-run", () => {
  it("resolves the declared agents and skills", async () => {
    const mod = await import(pathToFileURL(INSTALL_SCRIPT).href);
    const result = await mod.dryRun(BUNDLE_DIR);

    expect(result.ok, `dry-run errors: ${JSON.stringify(result.errors)}`).toBe(
      true,
    );
    expect(result.errors).toEqual([]);
    expect(result.resolved.agents).toHaveLength(3);
    expect(result.resolved.skills).toHaveLength(3);
  });

  it("prints ok=true when run as a CLI", () => {
    const result = spawnSync("node", [INSTALL_SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
    });

    expect(
      result.status,
      `installer failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    ).toBe(0);
    expect(result.stdout).toMatch(/\bok=true\b/);
  });
});
