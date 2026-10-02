import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";

const ROOT = process.cwd();
const LAB = readFileSync(join(ROOT, "labs", "lab21.md"), "utf8");

describe("Lab 21 governance guidance", () => {
  it("links the EPIC-001 tracking issue", () => {
    expect(LAB).toContain(
      "https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/47",
    );
  });

  it("keeps Spec Kit out of bypass mode pending controlled validation", () => {
    expect(LAB).toContain(
      "Do **not** add `permissions.disableBypassPermissionsMode` to this baseline yet.",
    );
    expect(LAB).toContain("SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0");
    expect(LAB).toContain("github/copilot-cli#4528");
  });

  it("keeps the Spec Kit version in the registry", () => {
    const registry = yaml.load(
      readFileSync(join(ROOT, "docs", "_meta", "registry.yaml"), "utf8"),
    ) as Record<string, unknown>;

    expect(registry.spec_kit_version).toBe("1.0.12");
    expect(LAB).not.toContain("Spec Kit v1.0.12");
  });

  it("labels JetBrains managed-setting support as ambiguous", () => {
    expect(LAB).toMatch(/\| JetBrains IDEs\s+.*\|\s+Ambiguous\s+\|/);
  });
});
