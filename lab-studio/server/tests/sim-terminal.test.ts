import { beforeEach, describe, expect, it } from "vitest";
import { resetSandbox, writeWorkspaceFile } from "../src/sandbox.js";
import { runTerminalLine, type TermBlock } from "../src/sim-terminal.js";
import { runVerify } from "../src/verify.js";

beforeEach(() => {
  resetSandbox();
});

function blocksOf(result: ReturnType<typeof runTerminalLine>): TermBlock[] {
  return result.blocks;
}

function textOf(result: ReturnType<typeof runTerminalLine>): string {
  return blocksOf(result)
    .map((b) => b.text)
    .join("\n");
}

describe("shell commands", () => {
  it("ls.agentsDir.listsPlanner", () => {
    expect(textOf(runTerminalLine("ls .github/agents", "shell"))).toContain(
      "planner.agent.md",
    );
  });

  it("cat.existingFile.printsContent", () => {
    expect(textOf(runTerminalLine("cat AGENTS.md", "shell"))).toContain(
      "Agent Context",
    );
  });

  it("cat.missingFile.errors", () => {
    const result = runTerminalLine("cat nope.txt", "shell");
    expect(blocksOf(result)[0]?.tone).toBe("error");
  });

  it("head.withDashN.limitsLines", () => {
    const result = runTerminalLine("head -n 2 AGENTS.md", "shell");
    expect(blocksOf(result)).toHaveLength(2);
  });

  it("grep.matchingPattern.showsLineNumbers", () => {
    expect(
      textOf(runTerminalLine("grep repository AGENTS.md", "shell")),
    ).toMatch(/\d+:/);
  });

  it("unknownCommand.reportsNotFound", () => {
    expect(textOf(runTerminalLine("frobnicate", "shell"))).toContain(
      "command not found",
    );
  });
});

describe("simulated copilot plugin commands", () => {
  it("marketplaceBrowse.builtinCatalog.listsPluginsWithSimTag", () => {
    const result = runTerminalLine(
      "copilot plugin marketplace browse awesome-copilot",
      "shell",
    );
    expect(textOf(result)).toContain("dotnet-essentials");
    expect(blocksOf(result).every((b) => b.sim)).toBe(true);
  });

  it("install.thenList.showsInstalledPlugin", () => {
    runTerminalLine(
      "copilot plugin install testing-toolkit@awesome-copilot",
      "shell",
    );
    expect(textOf(runTerminalLine("copilot plugin list", "shell"))).toContain(
      "testing-toolkit",
    );
  });

  it("install.unknownPlugin.errors", () => {
    const result = runTerminalLine(
      "copilot plugin install does-not-exist",
      "shell",
    );
    expect(textOf(result)).toContain("not found");
  });
});

describe("copilot CLI argument parsing", () => {
  it("bareCopilot.entersSession", () => {
    const result = runTerminalLine("copilot", "shell");
    expect("action" in result && result.action).toBe("enter-copilot");
  });

  it("promptFlag.withAgent.parsesBoth", () => {
    const result = runTerminalLine(
      'copilot --agent planner -p "plan a feature" --allow-all-tools',
      "shell",
    );
    if (!("action" in result) || result.action !== "prompt")
      throw new Error("expected prompt action");
    expect(result.prompt).toBe("plan a feature");
    expect(result.agent).toBe("planner");
  });

  it("sessionMode.plainText.becomesPrompt", () => {
    const result = runTerminalLine("what is this repo?", "copilot");
    expect("action" in result && result.action).toBe("prompt");
  });

  it("sessionMode.exit.leavesSession", () => {
    const result = runTerminalLine("/exit", "copilot");
    expect("action" in result && result.action).toBe("exit-copilot");
  });

  it("sessionMode.agentWithName.selectsAgent", () => {
    const result = runTerminalLine("/agent contoso-dev", "copilot");
    if (!("action" in result) || result.action !== "select-agent")
      throw new Error("expected select-agent");
    expect(result.agent).toBe("contoso-dev");
  });
});

describe("verify checks against workspace state", () => {
  it("lab02RepoRules.templateState.fails", () => {
    expect(runVerify("lab02/repo-rules").pass).toBe(false);
  });

  it("lab02RepoRules.afterConventionsAdded.passes", () => {
    writeWorkspaceFile(
      ".github/copilot-instructions.md",
      "# Rules\n\n## ContosoUniversity Conventions\n\n- Use the repository pattern via src/repos.\n",
    );
    expect(runVerify("lab02/repo-rules").pass).toBe(true);
  });

  it("lab05AddServer.templateState.failsWithGuidance", () => {
    const result = runVerify("lab05/add-server");
    expect(result.pass).toBe(false);
    expect(result.message).toContain("lab-docs");
  });

  it("lab05AddServer.withLabDocsEntry.passes", () => {
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
    expect(runVerify("lab05/add-server").pass).toBe(true);
  });

  it("lab05AddServer.invalidJson.failsWithParseError", () => {
    writeWorkspaceFile(".copilot/mcp-config.json", "{ broken");
    const result = runVerify("lab05/add-server");
    expect(result.pass).toBe(false);
    expect(result.message).toContain("not valid JSON");
  });

  it("lab03CreateAgent.frontmatterOnly.failsOnMissingBody", () => {
    writeWorkspaceFile(
      ".github/agents/contoso-dev.agent.md",
      '---\nname: "contoso-dev"\ndescription: "Dev"\ntools: ["read"]\n---\n\n(placeholder)\n',
    );
    const result = runVerify("lab03/create-agent");
    expect(result.pass).toBe(false);
    expect(result.message).toContain("Coding Standards");
  });

  it("unknownVerifyId.failsGracefully", () => {
    expect(runVerify("nope/nothing").pass).toBe(false);
  });
});
