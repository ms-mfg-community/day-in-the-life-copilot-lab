import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LAB = readFileSync(join(process.cwd(), "labs", "lab21.md"), "utf8");

describe("Lab 21 governance guidance", () => {
  it("links the EPIC-001 Handbook alignment issue", () => {
    expect(LAB).toContain(
      "https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/66",
    );
  });

  it("keeps Spec Kit out of bypass mode pending controlled validation", () => {
    expect(LAB).toContain(
      "Do **not** add `permissions.disableBypassPermissionsMode` to this baseline yet.",
    );
    expect(LAB).toContain("SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0");
    expect(LAB).toContain("github/copilot-cli#4528");
  });

  it("labels JetBrains managed-setting support as ambiguous", () => {
    expect(LAB).toMatch(/\| JetBrains IDEs\s+.*\|\s+Ambiguous\s+\|/);
  });
});
