import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  SANDBOX_DIR,
  SANDBOX_ROOT,
  TEMPLATE_DIR,
  fileExists,
  parseFrontmatter,
  readMcpConfig,
  readWorkspaceFile,
  resetSandbox,
  safePath,
  scanAgentFiles,
  scanInstructionSources,
  writeWorkspaceFile,
} from "../src/sandbox.js";

beforeEach(() => {
  resetSandbox();
});

describe("safePath", () => {
  it("rejects.pathTraversal.throws", () => {
    expect(() => safePath("../../etc/passwd")).toThrow(/escapes/);
  });

  it("accepts.workspaceRelativePaths.resolves", () => {
    expect(safePath("src/entities/student.ts")).toContain("workspace");
  });
});

describe("resetSandbox", () => {
  it("reset.copiesTemplate.filesExist", () => {
    expect(fileExists("AGENTS.md")).toBe(true);
    expect(fileExists(".github/copilot-instructions.md")).toBe(true);
    expect(fileExists(".github/agents/planner.agent.md")).toBe(true);
    expect(fileExists(".copilot/mcp/lab-docs.mjs")).toBe(true);
  });

  it("reset.discardsLearnerChanges.fileGone", () => {
    writeWorkspaceFile("scratch.txt", "hello");
    expect(fileExists("scratch.txt")).toBe(true);
    resetSandbox();
    expect(fileExists("scratch.txt")).toBe(false);
  });

  it("reset.cachesSeedWorkspaceAndPreservesIsolatedGitRepo", () => {
    expect(existsSync(join(SANDBOX_ROOT, ".seed-workspace", ".git"))).toBe(true);
    expect(existsSync(join(SANDBOX_DIR, ".git"))).toBe(true);
    rmSync(join(SANDBOX_DIR, ".git"), { recursive: true, force: true });
    resetSandbox();
    expect(existsSync(join(SANDBOX_DIR, ".git"))).toBe(true);
    const topLevel = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: SANDBOX_DIR,
      encoding: "utf8",
    }).trim();
    expect(resolve(topLevel)).toBe(resolve(SANDBOX_DIR));
  });

  it("reset.reusesWarmSeedWithoutReinitializingGitAndRestoresTemplate", () => {
    const seedIndex = join(SANDBOX_ROOT, ".seed-workspace", ".git", "index");
    const seedIndexMtime = statSync(seedIndex).mtimeMs;
    const original = readFileSync(join(TEMPLATE_DIR, "AGENTS.md"), "utf8");
    writeWorkspaceFile("AGENTS.md", "learner changes");

    resetSandbox();

    expect(statSync(seedIndex).mtimeMs).toBe(seedIndexMtime);
    expect(readWorkspaceFile("AGENTS.md")).toBe(original);
    expect(execFileSync("git", ["status", "--porcelain"], {
      cwd: SANDBOX_DIR,
      encoding: "utf8",
    }).trim()).toBe("");
  });

  it("reset.recreatesRemovedSeedAndKeepsWorkspaceGitIsolated", () => {
    const seedDir = join(SANDBOX_ROOT, ".seed-workspace");
    rmSync(seedDir, { recursive: true, force: true });

    resetSandbox();

    expect(existsSync(join(seedDir, ".git", "HEAD"))).toBe(true);
    expect(fileExists("AGENTS.md")).toBe(true);
    expect(resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: SANDBOX_DIR,
      encoding: "utf8",
    }).trim())).toBe(resolve(SANDBOX_DIR));
  });
});

describe("worker event-loop yield between synchronous tests", () => {
  let macrotaskTurnedBetweenSyncTests = false;

  it("syncTest1.schedulesImmediateCallback", () => {
    macrotaskTurnedBetweenSyncTests = false;
    setImmediate(() => {
      macrotaskTurnedBetweenSyncTests = true;
    });
    expect(macrotaskTurnedBetweenSyncTests).toBe(false);
  });

  it("syncTest2.observesMacrotaskTurnSoBirpcRepliesDrain", () => {
    expect(macrotaskTurnedBetweenSyncTests).toBe(true);
  });
});

describe("parseFrontmatter", () => {
  it("parse.withFrontmatter.extractsKeysAndBody", () => {
    const { data, body } = parseFrontmatter(
      '---\nname: test\ndescription: "A thing"\n---\n\n# Body\n',
    );
    expect(data.name).toBe("test");
    expect(data.description).toBe("A thing");
    expect(body).toContain("# Body");
  });

  it("parse.withoutFrontmatter.returnsWholeBody", () => {
    const { data, body } = parseFrontmatter("# Just markdown\n");
    expect(Object.keys(data)).toHaveLength(0);
    expect(body).toContain("Just markdown");
  });
});

describe("readMcpConfig", () => {
  it("read.templateConfig.hasMicrosoftLearn", () => {
    const servers = readMcpConfig();
    expect(Object.keys(servers)).toContain("microsoft-learn");
  });

  it("read.relativeArgs.resolvedAgainstWorkspace", () => {
    writeWorkspaceFile(
      ".copilot/mcp-config.json",
      JSON.stringify({
        mcpServers: {
          "lab-docs": {
            type: "local",
            command: "node",
            args: ["./.copilot/mcp/lab-docs.mjs"],
            tools: ["*"],
          },
        },
      }),
    );
    const servers = readMcpConfig() as Record<string, { args: string[] }>;
    const arg = servers["lab-docs"]?.args[0] ?? "";
    expect(isAbsolute(arg)).toBe(true);
    expect(arg).toContain("lab-docs.mjs");
  });

  it("read.invalidJson.throwsActionableError", () => {
    writeWorkspaceFile(".copilot/mcp-config.json", "{ not json");
    expect(() => readMcpConfig()).toThrow(/not valid JSON/);
  });
});

describe("scanInstructionSources", () => {
  it("scan.templateState.alwaysOnSourcesExist", () => {
    const sources = scanInstructionSources();
    const paths = sources.filter((s) => s.exists).map((s) => s.path);
    expect(paths).toContain(".github/copilot-instructions.md");
    expect(paths).toContain("AGENTS.md");
  });

  it("scan.afterCreatingPathRule.includesApplyToScope", () => {
    writeWorkspaceFile(
      ".github/instructions/routes.instructions.md",
      "---\ndescription: \"x\"\napplyTo: '**/src/routes/*.ts'\n---\n\n# Rules\n",
    );
    const sources = scanInstructionSources();
    const rule = sources.find((s) => s.path.endsWith("routes.instructions.md"));
    expect(rule?.scope).toContain("**/src/routes/*.ts");
  });
});

describe("scanAgentFiles", () => {
  it("scan.templateState.findsPlanner", () => {
    const agents = scanAgentFiles();
    expect(agents.map((a) => a.name)).toContain("planner");
  });

  it("scan.afterCreatingAgent.includesIt", () => {
    writeWorkspaceFile(
      ".github/agents/contoso-dev.agent.md",
      '---\nname: "contoso-dev"\ndescription: "Dev agent"\ntools: ["read"]\n---\n\nBody\n',
    );
    expect(scanAgentFiles().map((a) => a.name)).toContain("contoso-dev");
  });
});

it("readWorkspaceFile.missingFile.throws", () => {
  expect(() => readWorkspaceFile("nope/missing.txt")).toThrow();
});
