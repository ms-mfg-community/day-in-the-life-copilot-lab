import { beforeEach, describe, expect, it } from "vitest";
import {
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
    expect(arg.startsWith("/")).toBe(true);
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
