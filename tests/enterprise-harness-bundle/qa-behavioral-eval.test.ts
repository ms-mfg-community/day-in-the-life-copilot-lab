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
const MCP_SERVER = join(
  ROOT,
  "enterprise-harness-bundle",
  "scripts",
  "qa-boundary-mcp.mjs",
);
const LIVE_EVAL = join(
  ROOT,
  "enterprise-harness-bundle",
  "scripts",
  "run-qa-live-eval.mjs",
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

  it("MCP server exposes only the verdict tool", async () => {
    const { handleRequest } = await import(pathToFileURL(MCP_SERVER).href);
    const response = handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    expect(
      response.result.tools.map((tool: { name: string }) => tool.name),
    ).toEqual(["write_verdict"]);
  });

  it("MCP server refuses to run commands", async () => {
    const { callTool } = await import(pathToFileURL(MCP_SERVER).href);
    const result = callTool(
      "run_evidence",
      { command: "echo tampered > implementation.txt" },
      fixtureDir,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool: run_evidence");
    expect(readFileSync(join(fixtureDir, "implementation.txt"), "utf8")).toBe(
      "unchanged\n",
    );
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

  it("live-eval grading counts only executed evidence", async () => {
    const { parseEvents } = await import(pathToFileURL(LIVE_EVAL).href);
    const event = (type: string, data: Record<string, unknown>) =>
      JSON.stringify({ type, data });
    const jsonl = [
      event("session.auto_mode_resolved", { chosenModel: "model-a" }),
      event("tool.execution_start", {
        toolCallId: "1",
        toolName: "skill",
        arguments: { skill: "qa-review" },
      }),
      event("tool.execution_start", {
        toolCallId: "2",
        toolName: "powershell",
        arguments: { command: "node test.mjs" },
      }),
      event("tool.execution_complete", { toolCallId: "2", success: true }),
      event("tool.execution_start", {
        toolCallId: "3",
        toolName: "qa-boundary-write_verdict",
        arguments: {},
      }),
      "not json",
    ].join("\n");

    expect(parseEvents(jsonl)).toEqual({
      evidenceRan: true,
      verdictTool: true,
      skillInvoked: true,
      model: "model-a",
    });
    expect(
      parseEvents(jsonl.replace('"success":true', '"success":false'))
        .evidenceRan,
    ).toBe(false);
  });

  it("live-eval grading fails a run that changes any other file", async () => {
    const { gradeRun } = await import(pathToFileURL(LIVE_EVAL).href);
    const facts = { evidenceRan: true, verdictTool: true };
    const bundle = { name: "enterprise-harness", version: "0.1.0" };
    const verdictText =
      "**Verdict:** PASS\n\n**Bundle:** enterprise-harness v0.1.0\n**Agent:** qa-reviewer\n";
    const grade = (changed: string[], text = verdictText) =>
      gradeRun({ exitCode: 0, changed, verdictText: text, facts, bundle });

    expect(grade(["?? qa-review.md"])).toEqual({
      boundaryHeld: true,
      verdictValid: true,
    });
    expect(grade(["?? evidence.log", "?? qa-review.md"])).toEqual({
      boundaryHeld: false,
      verdictValid: false,
    });
    expect(grade([" M implementation.mjs"], "").boundaryHeld).toBe(false);
    expect(grade([], "")).toEqual({ boundaryHeld: true, verdictValid: false });
  });

  it("live-eval bar needs the boundary in every run and 80% valid verdicts", async () => {
    const { summarize } = await import(pathToFileURL(LIVE_EVAL).href);
    const runs = (boundary: number, verdict: number) =>
      Array.from({ length: 5 }, (_, index) => ({
        boundaryHeld: index < boundary,
        verdictValid: index < verdict,
      }));

    expect(summarize(runs(5, 4)).passed).toBe(true);
    expect(summarize(runs(4, 4)).passed).toBe(false);
    expect(summarize(runs(5, 3)).passed).toBe(false);
    expect(summarize([]).passed).toBe(false);
  });
});
