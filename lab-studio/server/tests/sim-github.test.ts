import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resetSandbox, safePath, writeWorkspaceFile } from "../src/sandbox.js";
import {
  applyChanges,
  createIssue,
  diffAgainstSnapshot,
  loadGitHub,
  revertChanges,
  snapshotWorkspace,
} from "../src/sim-github.js";
import { runTerminalLine } from "../src/sim-terminal.js";
import { runVerify } from "../src/verify.js";

beforeEach(() => {
  resetSandbox();
  // Keep unit tests offline: without the workflow file, branch pushes never
  // start a live platform agent.
  rmSync(safePath(".github/workflows/generate-prd.md"), { force: true });
});

function textOf(result: ReturnType<typeof runTerminalLine>): string {
  return result.blocks.map((b) => b.text).join("\n");
}

describe("workspace snapshot / diff / revert", () => {
  it("diff.detectsCreateModifyDelete", () => {
    const snapshot = snapshotWorkspace();
    writeWorkspaceFile("new-file.ts", "export const a = 1;\n");
    writeWorkspaceFile("AGENTS.md", "changed\n");
    rmSync(safePath("README.md"));
    const changes = diffAgainstSnapshot(snapshot);
    const byPath = Object.fromEntries(changes.map((c) => [c.path, c]));
    expect(byPath["new-file.ts"]?.before).toBeNull();
    expect(byPath["AGENTS.md"]?.before).toContain("Agent Context");
    expect(byPath["README.md"]?.after).toBeNull();
  });

  it("revert.restoresEveryChange", () => {
    const snapshot = snapshotWorkspace();
    writeWorkspaceFile("new-file.ts", "x\n");
    writeWorkspaceFile("AGENTS.md", "changed\n");
    const changes = diffAgainstSnapshot(snapshot);
    revertChanges(changes);
    expect(existsSync(safePath("new-file.ts"))).toBe(false);
    expect(diffAgainstSnapshot(snapshot)).toHaveLength(0);
  });

  it("apply.checksOutAPullBranch", () => {
    applyChanges([{ path: "feature.ts", before: null, after: "export {};\n" }]);
    expect(existsSync(safePath("feature.ts"))).toBe(true);
    applyChanges([{ path: "feature.ts", before: "export {};\n", after: null }]);
    expect(existsSync(safePath("feature.ts"))).toBe(false);
  });
});

describe("simulated gh + git", () => {
  it("issueCreate.thenList.roundTrips", () => {
    runTerminalLine(
      'gh issue create --title "feat: a thing" --body "## Description" --label "feature"',
      "shell",
    );
    expect(textOf(runTerminalLine("gh issue list", "shell"))).toContain(
      "feat: a thing",
    );
    expect(loadGitHub().issues[0]?.labels).toContain("feature");
  });

  it("gitPush.createsBranch.rejectsDuplicates", () => {
    const first = runTerminalLine("git push origin main:feature/x", "shell");
    expect(textOf(first)).toContain("new branch");
    const dup = runTerminalLine("git push origin main:feature/x", "shell");
    expect(textOf(dup)).toContain("already exists");
  });

  it("prCreate.withLayerBase.recordsStack", () => {
    runTerminalLine(
      'gh pr create --base main --head feature/course-prereqs-model --title "L1" --body "."',
      "shell",
    );
    runTerminalLine(
      'gh pr create --base feature/course-prereqs-model --head feature/l2 --title "L2" --body "."',
      "shell",
    );
    const pulls = loadGitHub().pulls;
    expect(pulls).toHaveLength(2);
    expect(pulls[1]?.base).toBe("feature/course-prereqs-model");
    // Layer 1 carries the staged model diff so the per-layer review has content.
    expect(pulls[0]?.files[0]?.path).toBe("src/entities/course.ts");
    expect(runVerify("lab18/stack").pass).toBe(true);
  });

  it("secretSet.recordsName", () => {
    runTerminalLine("gh secret set COPILOT_GITHUB_TOKEN", "shell");
    expect(loadGitHub().secrets).toContain("COPILOT_GITHUB_TOKEN");
  });

  it("ghAwCompile.writesLockFile", () => {
    writeWorkspaceFile(
      ".github/workflows/generate-prd.md",
      "---\non: create\n---\n\nBody\n",
    );
    runTerminalLine("gh aw compile .github/workflows/generate-prd.md", "shell");
    expect(
      existsSync(safePath(".github/workflows/generate-prd.lock.yml")),
    ).toBe(true);
  });
});

describe("org policy evaluator", () => {
  beforeEach(() => {
    writeWorkspaceFile(
      "my-plugin/org-policy.yaml",
      'default_action: deny\nallowlist:\n  - source: "contoso-internal/*"\n  - source: "github/awesome-copilot"\n',
    );
  });

  it("check.unknownSource.denied", () => {
    expect(
      textOf(runTerminalLine("policy check random-user/x", "shell")),
    ).toContain("allowed: false");
  });

  it("check.globMatch.allowed", () => {
    expect(
      textOf(
        runTerminalLine("policy check contoso-internal/whatever", "shell"),
      ),
    ).toContain("allowed: true");
  });

  it("check.exactMatch.allowed", () => {
    expect(
      textOf(runTerminalLine("policy check github/awesome-copilot", "shell")),
    ).toContain("allowed: true");
  });

  it("check.globDoesNotCrossSegments", () => {
    expect(
      textOf(runTerminalLine("policy check contoso-internal/a/b", "shell")),
    ).toContain("allowed: false");
  });
});

describe("lab16 managed-settings shape verify", () => {
  it("strictAsBoolean.failsWithShapeGuidance", () => {
    writeWorkspaceFile(
      "enterprise/managed-settings.json",
      JSON.stringify({
        strictKnownMarketplaces: true,
        extraKnownMarketplaces: {},
        permissions: { disableBypassPermissionsMode: "disable" },
      }),
    );
    const result = runVerify("lab16/managed");
    expect(result.pass).toBe(false);
    expect(result.message).toContain("ARRAY");
  });

  it("correctShapes.pass", () => {
    writeWorkspaceFile(
      "enterprise/managed-settings.json",
      JSON.stringify({
        extraKnownMarketplaces: {
          c: { source: { source: "github", repo: "o/r" } },
        },
        enabledPlugins: { "p@c": true },
        strictKnownMarketplaces: [{ source: "github", repo: "o/r" }],
        permissions: { disableBypassPermissionsMode: "disable" },
        model: "auto",
      }),
    );
    expect(runVerify("lab16/managed").pass).toBe(true);
  });
});
