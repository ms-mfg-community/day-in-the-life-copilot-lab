import { existsSync, readdirSync, statSync } from "node:fs";
import { bridge } from "./copilot-bridge.js";
import {
  fileExists,
  parseFrontmatter,
  readWorkspaceFile,
  safePath,
  scanAgentFiles,
  scanInstructionSources,
  SANDBOX_DIR,
} from "./sandbox.js";
import {
  CATALOG,
  installedPlugins,
  installPlugin,
  MARKETPLACES,
} from "./sim-registry.js";

export interface TermBlock {
  text: string;
  tone?: "normal" | "error" | "dim" | "accent" | "success";
  /** Rendered with the amber SIMULATED tag in the terminal. */
  sim?: boolean;
}

export type TermResult =
  | { blocks: TermBlock[] }
  | { action: "enter-copilot"; blocks: TermBlock[] }
  | { action: "exit-copilot"; blocks: TermBlock[] }
  | { action: "new-session"; blocks: TermBlock[] }
  | { action: "prompt"; prompt: string; agent?: string; blocks: TermBlock[] }
  | { action: "select-agent"; agent: string; blocks: TermBlock[] };

const text = (
  t: string,
  tone?: TermBlock["tone"],
  sim?: boolean,
): TermBlock => ({ text: t, tone, sim });

/** Track every executed line so verify checks can see what the learner ran. */
export const commandHistory: {
  line: string;
  mode: "shell" | "copilot";
  at: number;
}[] = [];

export function runTerminalLine(
  line: string,
  mode: "shell" | "copilot",
): TermResult {
  const trimmed = line.trim();
  if (!trimmed) return { blocks: [] };
  commandHistory.push({ line: trimmed, mode, at: Date.now() });
  return mode === "copilot"
    ? runCopilotSessionLine(trimmed)
    : runShellLine(trimmed);
}

// ---------------------------------------------------------------- shell mode

function runShellLine(line: string): TermResult {
  const argv = tokenize(line);
  const cmd = argv[0] ?? "";
  const args = argv.slice(1);
  switch (cmd) {
    case "help":
      return {
        blocks: [
          text("Lab workspace shell — the commands the labs use:"),
          text(
            "  ls [path]        list files            cat <file>   print a file",
            "dim",
          ),
          text(
            "  head -n N <file> first N lines         tree [path]  directory tree",
            "dim",
          ),
          text(
            "  grep <pat> <file> search in a file     pwd          working directory",
            "dim",
          ),
          text(
            "  copilot          start a Copilot session (live, via the Copilot SDK)",
            "dim",
          ),
          text(
            '  copilot -p "…"   one-shot prompt       copilot plugin …  marketplace (simulated)',
            "dim",
          ),
        ],
      };
    case "pwd":
      return { blocks: [text("~/labs/contoso-university")] };
    case "ls":
    case "ll":
      return lsCommand(args[0] ?? ".");
    case "tree":
      return treeCommand(args[0] ?? ".");
    case "cat":
      return catCommand(args);
    case "head":
      return headCommand(args);
    case "grep":
      return grepCommand(args);
    case "echo":
      return { blocks: [text(args.join(" "))] };
    case "copilot":
      return copilotCliCommand(args);
    case "gh":
      return {
        blocks: [
          text(
            "gh: remote GitHub operations are simulated in Lab Studio.",
            "dim",
            true,
          ),
          text(
            "Everything labs 01–05 need runs against the local lab workspace instead.",
            "dim",
            true,
          ),
        ],
      };
    case "cd":
      return {
        blocks: [
          text(
            "The lab shell always runs from the workspace root — no cd needed.",
            "dim",
          ),
        ],
      };
    default:
      return {
        blocks: [
          text(
            `${cmd}: command not found. Type 'help' for the commands the labs use.`,
            "error",
          ),
        ],
      };
  }
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out;
}

function lsCommand(path: string): TermResult {
  try {
    const abs = safePath(path);
    if (!existsSync(abs))
      return {
        blocks: [text(`ls: ${path}: no such file or directory`, "error")],
      };
    if (statSync(abs).isFile()) return { blocks: [text(path)] };
    const entries = readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.name !== ".DS_Store")
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      blocks: entries.map((e) =>
        text(
          e.isDirectory() ? `${e.name}/` : e.name,
          e.isDirectory() ? "accent" : "normal",
        ),
      ),
    };
  } catch (error) {
    return {
      blocks: [
        text(String(error instanceof Error ? error.message : error), "error"),
      ],
    };
  }
}

function treeCommand(path: string): TermResult {
  const lines: TermBlock[] = [];
  const walk = (rel: string, prefix: string): void => {
    const abs = safePath(rel);
    const entries = readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.name !== ".DS_Store" && e.name !== "node_modules")
      .sort((a, b) =>
        a.isDirectory() === b.isDirectory()
          ? a.name.localeCompare(b.name)
          : a.isDirectory()
            ? -1
            : 1,
      );
    entries.forEach((e, i) => {
      const last = i === entries.length - 1;
      lines.push(
        text(
          `${prefix}${last ? "└── " : "├── "}${e.name}${e.isDirectory() ? "/" : ""}`,
        ),
      );
      if (e.isDirectory() && lines.length < 200)
        walk(`${rel}/${e.name}`, `${prefix}${last ? "    " : "│   "}`);
    });
  };
  try {
    if (!existsSync(safePath(path)))
      return { blocks: [text(`tree: ${path}: no such directory`, "error")] };
    lines.push(text(path === "." ? "." : path, "accent"));
    walk(path, "");
    return { blocks: lines };
  } catch (error) {
    return {
      blocks: [
        text(String(error instanceof Error ? error.message : error), "error"),
      ],
    };
  }
}

function catCommand(args: string[]): TermResult {
  const file = args[0];
  if (!file) return { blocks: [text("cat: missing file argument", "error")] };
  if (!fileExists(file))
    return { blocks: [text(`cat: ${file}: no such file`, "error")] };
  return {
    blocks: readWorkspaceFile(file)
      .split("\n")
      .map((l) => text(l)),
  };
}

function headCommand(args: string[]): TermResult {
  let count = 10;
  let file: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-n") {
      count = Number(args[++i] ?? 10);
    } else if (a?.startsWith("-") && !Number.isNaN(Number(a.slice(1)))) {
      count = Number(a.slice(1));
    } else {
      file = a;
    }
  }
  if (!file) return { blocks: [text("head: missing file argument", "error")] };
  if (!fileExists(file))
    return { blocks: [text(`head: ${file}: no such file`, "error")] };
  return {
    blocks: readWorkspaceFile(file)
      .split("\n")
      .slice(0, count)
      .map((l) => text(l)),
  };
}

function grepCommand(args: string[]): TermResult {
  const [pattern, file] = args.filter((a) => !a.startsWith("-"));
  if (!pattern || !file)
    return { blocks: [text("usage: grep <pattern> <file>", "error")] };
  if (!fileExists(file))
    return { blocks: [text(`grep: ${file}: no such file`, "error")] };
  const matches = readWorkspaceFile(file)
    .split("\n")
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.toLowerCase().includes(pattern.toLowerCase()));
  if (matches.length === 0) return { blocks: [text("(no matches)", "dim")] };
  return { blocks: matches.map(({ l, i }) => text(`${i + 1}: ${l}`)) };
}

// ------------------------------------------------------------- copilot CLI

function copilotCliCommand(args: string[]): TermResult {
  if (args.length === 0) {
    return {
      action: "enter-copilot",
      blocks: [
        text(
          "Starting GitHub Copilot session (live, via @github/copilot-sdk)…",
          "accent",
        ),
      ],
    };
  }
  const first = args[0] ?? "";
  if (first === "--version" || first === "-v") {
    return {
      blocks: [
        text(
          "GitHub Copilot CLI 1.0.103 — bridged through @github/copilot-sdk by Lab Studio",
        ),
      ],
    };
  }
  if (first === "login") {
    return {
      blocks: [
        text(
          "Lab Studio reuses the Copilot login on this machine — you are already signed in.",
          "success",
        ),
        text(
          "(In a real terminal, `copilot login` opens a browser device-code flow.)",
          "dim",
        ),
      ],
    };
  }
  if (first === "plugin") {
    return pluginCommand(args.slice(1));
  }
  if (
    first === "-p" ||
    first === "--prompt" ||
    args.includes("-p") ||
    args.includes("--prompt")
  ) {
    let agent: string | undefined;
    let prompt: string | undefined;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "--agent") agent = args[++i];
      if (a === "-p" || a === "--prompt") prompt = args[++i];
    }
    if (!prompt)
      return {
        blocks: [
          text("copilot: --prompt requires a quoted prompt text", "error"),
        ],
      };
    const blocks: TermBlock[] = [];
    if (!args.includes("--allow-all-tools")) {
      blocks.push(
        text(
          "note: non-interactive mode normally requires --allow-all-tools; Lab Studio adds it for you.",
          "dim",
        ),
      );
    }
    return { action: "prompt", prompt, agent, blocks };
  }
  if (first === "--agent") {
    const agent = args[1];
    if (!agent)
      return {
        blocks: [text("copilot: --agent requires an agent name", "error")],
      };
    return {
      action: "select-agent",
      agent,
      blocks: [
        text(`Starting Copilot session with agent '${agent}'…`, "accent"),
      ],
    };
  }
  return {
    blocks: [
      text(
        `copilot: unsupported arguments in Lab Studio: ${args.join(" ")}`,
        "error",
      ),
    ],
  };
}

function pluginCommand(args: string[]): TermResult {
  const sub = args[0] ?? "";
  if (sub === "marketplace") {
    const op = args[1] ?? "list";
    if (op === "list") {
      return {
        blocks: [
          text("Registered marketplaces:", "accent", true),
          ...MARKETPLACES.map((m) =>
            text(`  ${m.name}  (${m.url}) — ${m.description}`, "normal", true),
          ),
        ],
      };
    }
    if (op === "browse") {
      const name = args[2] ?? "awesome-copilot";
      const plugins = CATALOG.filter((p) => p.marketplace === name);
      if (plugins.length === 0)
        return {
          blocks: [text(`marketplace '${name}' not found`, "error", true)],
        };
      return {
        blocks: [
          text(`Plugins in ${name}:`, "accent", true),
          ...plugins.flatMap((p) => [
            text(
              `  ${p.name}@${p.marketplace}  v${p.version}  [${p.components}]`,
              "normal",
              true,
            ),
            text(`    ${p.description}`, "dim", true),
          ]),
        ],
      };
    }
  }
  if (sub === "install") {
    const spec = args[1];
    if (!spec)
      return {
        blocks: [
          text(
            "usage: copilot plugin install <plugin>[@marketplace]",
            "error",
            true,
          ),
        ],
      };
    const result = installPlugin(spec);
    return {
      blocks: [
        text(result.message, result.ok ? "success" : "error", true),
        ...(result.ok && result.plugin
          ? [
              text(
                `  adds: ${result.plugin.components} — use them via /agent and /skills in a session`,
                "dim",
                true,
              ),
            ]
          : []),
      ],
    };
  }
  if (sub === "list") {
    const installed = installedPlugins();
    if (installed.length === 0) {
      return {
        blocks: [
          text(
            "No plugins installed. Try: copilot plugin install awesome-copilot@awesome-copilot",
            "dim",
            true,
          ),
        ],
      };
    }
    return {
      blocks: [
        text("Installed plugins:", "accent", true),
        ...installed.map((p) =>
          text(
            `  ${p.name}  v${p.version}  (from ${p.marketplace})  [${p.components}]`,
            "normal",
            true,
          ),
        ),
      ],
    };
  }
  return {
    blocks: [
      text(
        "usage: copilot plugin <marketplace list|marketplace browse NAME|install SPEC|list>",
        "error",
        true,
      ),
    ],
  };
}

// --------------------------------------------------------- copilot session

function runCopilotSessionLine(line: string): TermResult {
  if (!line.startsWith("/")) {
    return { action: "prompt", prompt: line, blocks: [] };
  }
  const argv = tokenize(line);
  const cmd = argv[0] ?? "";
  switch (cmd) {
    case "/exit":
    case "/quit":
      return {
        action: "exit-copilot",
        blocks: [text("Session closed. Back at the workspace shell.", "dim")],
      };
    case "/new":
      return {
        action: "new-session",
        blocks: [
          text(
            "Starting a fresh session — configuration is re-read from the workspace…",
            "accent",
          ),
        ],
      };
    case "/agent": {
      const name = argv[1];
      if (name) return { action: "select-agent", agent: name, blocks: [] };
      const meta = bridge.getMeta();
      const agents =
        meta && meta.agents.length > 0
          ? meta.agents
          : scanAgentFiles().map((a) => ({
              name: a.name,
              description: a.description,
            }));
      return {
        blocks: [
          text("Custom agents discovered from .github/agents/:", "accent"),
          ...agents.map((a) =>
            text(
              `  ${a.name === meta?.selectedAgent ? "●" : "○"} ${a.name} — ${a.description.slice(0, 90)}`,
              a.name === meta?.selectedAgent ? "success" : "normal",
            ),
          ),
          text("Select one with /agent <name>.", "dim"),
        ],
      };
    }
    case "/skills":
      return skillsCommand(argv.slice(1));
    case "/mcp":
      return mcpCommand(argv.slice(1));
    case "/instructions":
      return instructionsCommand();
    case "/model": {
      const meta = bridge.getMeta();
      return {
        blocks: [
          text(`Model: ${meta?.model ?? "auto (CLI default)"}`),
          text(
            "Lab Studio keeps the default model; the real CLI lets you switch with /model <id>.",
            "dim",
          ),
        ],
      };
    }
    case "/env": {
      const meta = bridge.getMeta();
      return {
        blocks: [
          text("Session environment:", "accent"),
          text(`  session id    ${meta?.sessionId ?? "—"}`),
          text(`  agents        ${meta?.agents.length ?? 0} discovered`),
          text(`  skills        ${meta?.skills.length ?? 0} loaded`),
          text(`  mcp servers   ${meta?.mcpServers.length ?? 0} configured`),
          text(
            `  instructions  ${meta?.instructionSnapshot.filter((i) => i.exists).length ?? 0} sources`,
          ),
        ],
      };
    }
    default:
      return {
        blocks: [
          text(
            `${cmd}: unknown slash command. Try /agent, /skills list, /mcp list, /instructions, /new, /exit.`,
            "error",
          ),
        ],
      };
  }
}

function skillsCommand(args: string[]): TermResult {
  const meta = bridge.getMeta();
  const skills = meta?.skills ?? [];
  const op = args[0] ?? "list";
  if (op === "info") {
    const name = args[1];
    const skill = skills.find((s) => s.name === name);
    if (!skill)
      return {
        blocks: [
          text(`skill '${name ?? ""}' is not loaded in this session`, "error"),
        ],
      };
    return {
      blocks: [
        text(`${skill.name}  (${skill.source})`, "accent"),
        text(`  description: ${skill.description}`),
        ...(skill.path
          ? [
              text(
                `  location: ${skill.path.replace(SANDBOX_DIR + "/", "")}`,
                "dim",
              ),
            ]
          : []),
      ],
    };
  }
  const custom = skills.filter((s) => s.source === "custom");
  const builtin = skills.filter((s) => s.source !== "custom");
  return {
    blocks: [
      text(`Skills loaded in this session (${skills.length}):`, "accent"),
      ...(custom.length > 0
        ? [text("  from this workspace (.github/skills/):", "dim")]
        : []),
      ...custom.map((s) =>
        text(`    ${s.name} — ${s.description.slice(0, 80)}`),
      ),
      text(
        `  built in: ${builtin.map((s) => s.name).join(", ") || "(none)"}`,
        "dim",
      ),
      text("Details: /skills info <name>", "dim"),
    ],
  };
}

function mcpCommand(args: string[]): TermResult {
  const meta = bridge.getMeta();
  const servers = meta?.mcpServers ?? [];
  const op = args[0] ?? "list";
  if (op === "show") {
    const name = args[1];
    const server = servers.find((s) => s.name === name);
    if (!server)
      return {
        blocks: [
          text(
            `mcp server '${name ?? ""}' is not configured in this session`,
            "error",
          ),
        ],
      };
    return {
      blocks: [
        text(`${server.name}`, "accent"),
        text(
          `  status: ${server.status}`,
          server.status === "connected" ? "success" : "normal",
        ),
        text(`  source: ${server.source}`),
        text(`  tools:  ${server.toolCount ?? "unknown"}`),
      ],
    };
  }
  return {
    blocks: [
      text(`MCP servers in this session (${servers.length}):`, "accent"),
      ...servers.map((s) =>
        text(
          `  ${s.status === "connected" ? "●" : "○"} ${s.name}  [${s.status}]  ${s.toolCount ?? "?"} tools  (${s.source})`,
          s.status === "connected" ? "success" : "normal",
        ),
      ),
      text("Details: /mcp show <name>", "dim"),
    ],
  };
}

function instructionsCommand(): TermResult {
  const meta = bridge.getMeta();
  const snapshot = meta?.instructionSnapshot ?? [];
  const current = scanInstructionSources();
  const blocks: TermBlock[] = [
    text("Instruction sources discovered at session start:", "accent"),
  ];
  for (const s of snapshot.filter((s) => s.exists)) {
    blocks.push(text(`  ✓ ${s.path}  (${s.scope})`, "success"));
  }
  const added = current.filter(
    (c) => c.exists && !snapshot.some((s) => s.exists && s.path === c.path),
  );
  for (const a of added) {
    blocks.push(
      text(
        `  ! ${a.path} — created after this session started. Restart (/new) to load it.`,
        "error",
      ),
    );
  }
  if (snapshot.filter((s) => s.exists).length === 0 && added.length === 0) {
    blocks.push(text("  (none found)", "dim"));
  }
  blocks.push(
    text(
      "Copilot combines every loaded source — it does not rank them.",
      "dim",
    ),
  );
  return { blocks };
}
