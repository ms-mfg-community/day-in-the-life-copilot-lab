import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const WRITER = join(
  ROOT,
  "enterprise-harness-bundle",
  "scripts",
  "write-qa-verdict.mjs",
);

let fixtureDir: string;

beforeEach(() => {
  fixtureDir = mkdtempSync(join(tmpdir(), "qa-review-eval-"));
  writeFileSync(join(fixtureDir, "implementation.txt"), "unchanged\n");
  spawnSync("git", ["init", "--quiet"], { cwd: fixtureDir });
  spawnSync("git", ["add", "implementation.txt"], { cwd: fixtureDir });
  spawnSync(
    "git",
    [
      "-c",
      "user.name=QA Eval",
      "-c",
      "user.email=qa-eval@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ],
    { cwd: fixtureDir },
  );
});

afterEach(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

describe("enterprise-harness-bundle: QA behavioral eval", () => {
  it("writes only the fixed verdict file", () => {
    writeFileSync(
      join(fixtureDir, "verdict.json"),
      JSON.stringify({
        status: "reject",
        summary: "The behavioral acceptance check failed.",
        findings: ["Expected exit code 0; observed exit code 1."],
      }),
    );
    spawnSync("git", ["add", "verdict.json"], { cwd: fixtureDir });
    spawnSync(
      "git",
      [
        "-c",
        "user.name=QA Eval",
        "-c",
        "user.email=qa-eval@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "eval input",
      ],
      { cwd: fixtureDir },
    );

    const result = spawnSync("node", [WRITER, "--input", "verdict.json"], {
      cwd: fixtureDir,
      encoding: "utf8",
    });
    const status = spawnSync("git", ["status", "--porcelain"], {
      cwd: fixtureDir,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(status.stdout.trim()).toBe("?? qa-review.md");
    expect(readFileSync(join(fixtureDir, "implementation.txt"), "utf8")).toBe(
      "unchanged\n",
    );
    expect(readFileSync(join(fixtureDir, "qa-review.md"), "utf8")).toContain(
      "**Verdict:** REJECT",
    );
  });

  it("rejects an invalid verdict without writing output", () => {
    writeFileSync(
      join(fixtureDir, "verdict.json"),
      JSON.stringify({ status: "maybe", summary: "Ambiguous." }),
    );

    const result = spawnSync("node", [WRITER, "--input", "verdict.json"], {
      cwd: fixtureDir,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('status must be "pass" or "reject"');
  });
});
