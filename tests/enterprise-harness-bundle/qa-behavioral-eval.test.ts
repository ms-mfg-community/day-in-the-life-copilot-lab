import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const WRITER = join(
  ROOT,
  "enterprise-harness-bundle",
  "scripts",
  "write-qa-verdict.mjs",
);
const GUARD = join(
  ROOT,
  "enterprise-harness-bundle",
  "scripts",
  "guard-qa-shell.mjs",
);
const MCP_SERVER = join(
  ROOT,
  "enterprise-harness-bundle",
  "scripts",
  "qa-boundary-mcp.mjs",
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
    const verdictContent = readFileSync(
      join(fixtureDir, "qa-review.md"),
      "utf8",
    );
    expect(verdictContent).toContain("**Verdict:** REJECT");
    expect(verdictContent).toContain("**Bundle:** enterprise-harness v0.1.0");
    expect(verdictContent).toContain("**Agent:** qa-reviewer");
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

  it("guard blocks unauthorized source edits via shell redirection", () => {
    // Attempt to modify a tracked source file through the guard
    const result = spawnSync(
      "node",
      [GUARD, "--", "echo tampered > implementation.txt"],
      {
        cwd: fixtureDir,
        encoding: "utf8",
        shell: false,
      },
    );

    // Guard must exit non-zero
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("BLOCKED");
    expect(result.stderr).toContain("implementation.txt");

    // Source file must be reverted to its original content
    const restored = readFileSync(
      join(fixtureDir, "implementation.txt"),
      "utf8",
    );
    expect(restored.replace(/\r\n/g, "\n")).toBe("unchanged\n");
  });

  it("guard preserves pre-existing dirty source changes", () => {
    writeFileSync(join(fixtureDir, "implementation.txt"), "review candidate\n");

    const result = spawnSync(
      "node",
      [GUARD, "--", "echo tampered > implementation.txt"],
      { cwd: fixtureDir, encoding: "utf8", shell: false },
    );

    expect(result.status).not.toBe(0);
    expect(readFileSync(join(fixtureDir, "implementation.txt"), "utf8")).toBe(
      "review candidate\n",
    );
  });

  it("MCP server exposes only evidence and verdict tools", async () => {
    const { handleRequest } = await import(pathToFileURL(MCP_SERVER).href);
    const response = handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    expect(
      response.result.tools.map((tool: { name: string }) => tool.name),
    ).toEqual(["run_evidence", "write_verdict"]);
  });

  it("MCP verdict tool writes the fixed artifact without input files", async () => {
    const { callTool } = await import(pathToFileURL(MCP_SERVER).href);
    const result = callTool(
      "write_verdict",
      { status: "pass", summary: "Checks passed.", findings: [] },
      fixtureDir,
    );

    expect(result.isError).toBe(false);
    expect(readFileSync(join(fixtureDir, "qa-review.md"), "utf8")).toContain(
      "**Verdict:** PASS",
    );
  });

  it("MCP tool failures preserve the request id and return a tool error", async () => {
    const { handleRequest } = await import(pathToFileURL(MCP_SERVER).href);
    const response = handleRequest(
      {
        jsonrpc: "2.0",
        id: 42,
        method: "tools/call",
        params: {
          name: "write_verdict",
          arguments: { status: "maybe", summary: "Invalid.", findings: [] },
        },
      },
      fixtureDir,
    );

    expect(response.id).toBe(42);
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0].text).toContain(
      'status must be "pass" or "reject"',
    );
  });

  it("guard permits the verdict file through shell", () => {
    writeFileSync(
      join(fixtureDir, "verdict.json"),
      JSON.stringify({
        status: "pass",
        summary: "All checks pass.",
        findings: [],
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

    const writerCmd = `node ${JSON.stringify(WRITER)} --input verdict.json`;
    const result = spawnSync("node", [GUARD, "--", writerCmd], {
      cwd: fixtureDir,
      encoding: "utf8",
      shell: false,
    });

    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(fixtureDir, "qa-review.md"), "utf8")).toContain(
      "**Verdict:** PASS",
    );
  });
});
