import { bridge } from "./copilot-bridge.js";
import {
  fileExists,
  parseFrontmatter,
  readMcpConfig,
  readWorkspaceFile,
} from "./sandbox.js";
import { commandHistory } from "./sim-terminal.js";
import { installedPlugins } from "./sim-registry.js";

export interface VerifyResult {
  pass: boolean;
  message: string;
}

type Check = () => VerifyResult;

const pass = (message: string): VerifyResult => ({ pass: true, message });
const fail = (message: string): VerifyResult => ({ pass: false, message });

function ranCommand(pattern: RegExp, mode?: "shell" | "copilot"): boolean {
  return commandHistory.some(
    (c) => (mode ? c.mode === mode : true) && pattern.test(c.line),
  );
}

const checks: Record<string, Check> = {
  // ---------------------------------------------------------------- Lab 01
  "lab01/explore": () => {
    if (
      ranCommand(
        /^(ls|tree|cat|head)\b.*\.github\/(agents|skills|instructions)/,
      ) ||
      ranCommand(/^(cat|head)\b.*copilot-instructions\.md/) ||
      ranCommand(/^tree\b.*\.github/)
    ) {
      return pass(
        "You explored the configuration ecosystem from the terminal.",
      );
    }
    return fail(
      "Run one of the exploration commands in the terminal first — try `ls .github/agents` or `cat .github/agents/planner.agent.md`.",
    );
  },
  "lab01/marketplace": () => {
    const installed = installedPlugins();
    if (installed.length > 0) {
      return pass(
        `Plugin installed: ${installed.map((p) => p.name).join(", ")}. Confirm it with \`copilot plugin list\`.`,
      );
    }
    return fail(
      "No plugin installed yet. Browse with `copilot plugin marketplace browse awesome-copilot`, then `copilot plugin install awesome-copilot@awesome-copilot`.",
    );
  },
  "lab01/try-planner": () => {
    const hit = bridge.promptHistory.find((p) => p.agent === "planner");
    if (hit)
      return pass(
        "The planner agent answered using the workspace's configuration files.",
      );
    return fail(
      "Select the planner first (`/agent planner` inside a session, or run `copilot --agent planner`), then ask it a question.",
    );
  },

  // ---------------------------------------------------------------- Lab 02
  "lab02/repo-rules": () => {
    if (!fileExists(".github/copilot-instructions.md"))
      return fail(
        "`.github/copilot-instructions.md` is missing from the workspace.",
      );
    const content = readWorkspaceFile(".github/copilot-instructions.md");
    if (
      /ContosoUniversity Conventions/i.test(content) &&
      /repository pattern/i.test(content)
    ) {
      return pass(
        "The conventions section is in copilot-instructions.md — every new session will load it.",
      );
    }
    return fail(
      "copilot-instructions.md doesn't contain the `## ContosoUniversity Conventions` section yet. Add it in the Files tab (or use Insert for me).",
    );
  },
  "lab02/path-rule": () => {
    const path = ".github/instructions/routes.instructions.md";
    if (!fileExists(path))
      return fail(
        `Create \`${path}\` first — the Files tab has the content ready to insert.`,
      );
    const { data } = parseFrontmatter(readWorkspaceFile(path));
    if (!data.applyTo)
      return fail(
        "The file exists but its frontmatter has no `applyTo:` glob — Copilot would never load it.",
      );
    if (!data.description)
      return fail(
        "Add a `description:` line to the frontmatter so the file documents itself.",
      );
    return pass(
      `Path-specific rule created. It loads only when files matching ${data.applyTo} are in context.`,
    );
  },
  "lab02/agents-md": () => {
    if (!fileExists("AGENTS.md"))
      return fail("AGENTS.md is missing from the workspace.");
    const content = readWorkspaceFile("AGENTS.md");
    if (/ADR-001/.test(content) && /Architecture Decisions/i.test(content)) {
      return pass(
        "ADR-001 recorded in AGENTS.md — context, not rules, exactly where it belongs.",
      );
    }
    return fail(
      "AGENTS.md doesn't contain the `ADR-001` architecture decision record yet.",
    );
  },
  "lab02/reload": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No Copilot session is running. Start one in the terminal with `copilot`.",
      );
    const loaded = meta.instructionSnapshot.some(
      (s) => s.exists && s.path.endsWith("routes.instructions.md"),
    );
    if (!loaded) {
      return fail(
        "The running session started before routes.instructions.md existed. Restart it (`/new`, or `/exit` then `copilot`) so the discovery pass re-reads the workspace.",
      );
    }
    if (!ranCommand(/^\/instructions/, "copilot")) {
      return fail(
        "The session sees the new file — now prove it deterministically: run `/instructions` inside the session.",
      );
    }
    return pass(
      "The restarted session discovered your instruction file, and /instructions confirmed it — no guesswork.",
    );
  },

  // ---------------------------------------------------------------- Lab 03
  "lab03/anatomy": () => {
    if (ranCommand(/^(cat|head)\b.*\.github\/agents\/planner\.agent\.md/)) {
      return pass(
        "You read the planner's frontmatter — name, description, tools, then the system prompt.",
      );
    }
    return fail(
      "Read the existing agent first: `head -30 .github/agents/planner.agent.md`.",
    );
  },
  "lab03/create-agent": () => {
    const path = ".github/agents/contoso-dev.agent.md";
    if (!fileExists(path))
      return fail(
        `Create \`${path}\` first — the step card has the full agent body.`,
      );
    const { data, body } = parseFrontmatter(readWorkspaceFile(path));
    if (!data.name || !data.description)
      return fail(
        "The agent file needs `name:` and `description:` in its YAML frontmatter.",
      );
    if (!data.tools)
      return fail(
        "Add a `tools:` list to the frontmatter — without it the agent has no capabilities.",
      );
    if (
      !/##\s*Coding Standards/i.test(body) ||
      !/##\s*Review Checklist/i.test(body)
    ) {
      return fail(
        "The body is incomplete — paste the whole agent prompt, including `## Coding Standards` and `## Review Checklist`.",
      );
    }
    return pass(
      "contoso-dev.agent.md is complete: frontmatter plus a full system prompt.",
    );
  },
  "lab03/select-agent": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No session running. The session discovers agents at start — run `copilot` in the terminal.",
      );
    if (!meta.agents.some((a) => a.name === "contoso-dev")) {
      return fail(
        "The running session doesn't know contoso-dev. Agent files are discovered once at session start — restart with `/new` or `/exit` + `copilot`.",
      );
    }
    if (meta.selectedAgent !== "contoso-dev") {
      return fail(
        "contoso-dev is discovered — now select it: `/agent contoso-dev`.",
      );
    }
    return pass("contoso-dev is live and selected in this session.");
  },
  "lab03/test-agent": () => {
    const hit = bridge.promptHistory.find((p) => p.agent === "contoso-dev");
    if (hit)
      return pass(
        "Your agent answered with its own system prompt steering the response.",
      );
    return fail(
      "With `/agent contoso-dev` selected, ask it to analyze the workspace — for example: `Analyze src/. What entities exist and how do they relate?`",
    );
  },

  // ---------------------------------------------------------------- Lab 04
  "lab04/skill-anatomy": () => {
    if (
      ranCommand(/^(cat|head)\b.*\.github\/skills\/coding-standards\/SKILL\.md/)
    ) {
      return pass(
        "The description field is what drives auto-activation — you just read the one that ships here.",
      );
    }
    return fail(
      "Read the shipped skill's frontmatter first: `head -5 .github/skills/coding-standards/SKILL.md`.",
    );
  },
  "lab04/create-skill": () => {
    const path = ".github/skills/contoso-testing/SKILL.md";
    if (!fileExists(path))
      return fail(
        `Create \`${path}\` first — use the Files tab or Insert for me.`,
      );
    const { data, body } = parseFrontmatter(readWorkspaceFile(path));
    if (data.name !== "contoso-testing")
      return fail(
        "The skill frontmatter must declare `name: contoso-testing`.",
      );
    if (!data.description || data.description.length < 20) {
      return fail(
        "Write a specific `description:` — it is the only thing Copilot reads up-front to decide when the skill applies.",
      );
    }
    if (!/naming convention/i.test(body) || !/createInMemory/i.test(body))
      return fail(
        "The skill body should carry the testing patterns from the step card — the naming convention and the in-memory repo pattern.",
      );
    return pass(
      "contoso-testing/SKILL.md created — a knowledge pack with an activation-worthy description.",
    );
  },
  "lab04/activate": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No session running. Start one with `copilot` so the new skill gets discovered.",
      );
    if (!meta.skills.some((s) => s.name === "contoso-testing")) {
      return fail(
        "The running session loaded before the skill existed. Restart (`/new`) and check `/skills list`.",
      );
    }
    const invoked = bridge.skillInvocations.some(
      (s) => s.name === "contoso-testing",
    );
    if (!invoked) {
      return fail(
        "The skill is loaded — now trigger it: ask `How should I write unit tests for the student repository in src/repos/student-repo.ts?` and watch for the skill chip in the terminal.",
      );
    }
    return pass(
      "Copilot auto-activated contoso-testing from your prompt — that's the skill.invoked event, not a guess.",
    );
  },

  // ---------------------------------------------------------------- Lab 05
  "lab05/inspect": () => {
    if (ranCommand(/^(cat|head)\b.*\.copilot\/mcp-config\.json/)) {
      return pass(
        "That file is the session's MCP wiring: local (stdio subprocess) and http (remote URL) servers.",
      );
    }
    return fail(
      "Inspect the current MCP configuration first: `cat .copilot/mcp-config.json`.",
    );
  },
  "lab05/add-server": () => {
    let servers: Record<string, unknown>;
    try {
      servers = readMcpConfig();
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
    const entry = servers["lab-docs"] as Record<string, unknown> | undefined;
    if (!entry)
      return fail(
        "`.copilot/mcp-config.json` has no `lab-docs` entry yet — add it inside the existing mcpServers object (mind the comma).",
      );
    if (entry.type !== "local")
      return fail(
        'The lab-docs server must be `"type": "local"` — it runs as a stdio subprocess.',
      );
    if (entry.command !== "node")
      return fail(
        'The lab-docs server should be started with `"command": "node"`.',
      );
    return pass(
      "lab-docs is configured. Config loads at session start — restart the session to connect it.",
    );
  },
  "lab05/use-mcp": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No session running — start one with `copilot` so the new MCP server connects.",
      );
    if (!meta.mcpServers.some((s) => s.name === "lab-docs")) {
      return fail(
        "The running session predates your config change. Restart it (`/new`), then check `/mcp list`.",
      );
    }
    const used = bridge.toolCalls.some((t) =>
      t.toolName.startsWith("lab-docs-"),
    );
    if (!used) {
      return fail(
        "lab-docs is connected — now make Copilot call it: `Use the lab-docs MCP server's get_contoso_fact tool to look up the topic 'data layer'.`",
      );
    }
    return pass(
      "Copilot called a lab-docs tool over MCP — you watched a real tool round-trip.",
    );
  },
  "lab05/lessons": () => {
    if (!fileExists(".copilot/lessons/log.md"))
      return fail("`.copilot/lessons/log.md` is missing from the workspace.");
    const content = readWorkspaceFile(".copilot/lessons/log.md");
    if (/repository pattern/i.test(content) && /in-memory/i.test(content)) {
      return pass(
        "The lesson is in git-trackable markdown — diffable, reviewable, no memory server required.",
      );
    }
    return fail(
      "Ask Copilot to append the lesson from the step card to `.copilot/lessons/log.md`, then verify again.",
    );
  },
};

export function runVerify(id: string): VerifyResult {
  const check = checks[id];
  if (!check) return fail(`Unknown verification id: ${id}`);
  try {
    return check();
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export const VERIFY_IDS = Object.keys(checks);
