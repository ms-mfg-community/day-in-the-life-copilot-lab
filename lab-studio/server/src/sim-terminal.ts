import { runInNewContext } from "node:vm";
import { existsSync, readdirSync, statSync } from "node:fs";
import { bridge } from "./copilot-bridge.js";
import {
  fileExists,
  parseFrontmatter,
  readWorkspaceFile,
  safePath,
  scanAgentFiles,
  scanInstructionSources,
  writeWorkspaceFile,
  SANDBOX_DIR,
} from "./sandbox.js";
import {
  CATALOG,
  installedPlugins,
  installLocalPlugin,
  installPlugin,
  MARKETPLACES,
} from "./sim-registry.js";
import { createIssue, loadGitHub, mutateGitHub } from "./sim-github.js";
import {
  isPlatformBusy,
  iterateOnPull,
  runCodingAgent,
  triggerBranchCreate,
} from "./sim-actions.js";

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
  | { action: "select-agent"; agent: string; blocks: TermBlock[] }
  | { action: "hook-pipe"; script: string; json: string; blocks: TermBlock[] };

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
  // `echo '<json>' | bash scripts/hooks/<script>` — the lab's manual hook
  // test. The script runs for real (spawned by the server) with the JSON on
  // stdin, exactly like the Copilot runtime invokes it.
  const pipe =
    /^echo\s+'([\s\S]+)'\s*\|\s*bash\s+(scripts\/hooks\/[\w.-]+\.sh)\s*$/.exec(
      line,
    );
  if (pipe && pipe[1] !== undefined && pipe[2] !== undefined) {
    return { action: "hook-pipe", script: pipe[2], json: pipe[1], blocks: [] };
  }
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
          text(
            "  vally --version | lint | eval | grade  Vally evaluation CLI (Lab 27, simulated)",
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
      return ghCommand(args);
    case "git":
      return gitCommand(args);
    case "policy":
      return policyCommand(args);
    case "vally":
      return vallyCommand(args);
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
            "usage: copilot plugin install <plugin>[@marketplace] | <./local-dir>",
            "error",
            true,
          ),
        ],
      };
    if (spec.startsWith("./") || spec.startsWith("my-plugin")) {
      const local = installLocalPlugin(spec);
      return {
        blocks: [
          text(local.message, local.ok ? "success" : "error", true),
          ...(local.ok
            ? [
                text(
                  "  Confirm with `copilot plugin list`. (Real CLI installs take owner/repo or a git URL — the local-path form here mirrors a directory-source marketplace entry.)",
                  "dim",
                  true,
                ),
              ]
            : []),
        ],
      };
    }
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
  // `get` is the spelling the current CLI documents; `show` is what earlier
  // labs taught. Both open one server's details.
  if (op === "show" || op === "get") {
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
      text("Details: /mcp get <name>  (/mcp show <name> works too)", "dim"),
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

// -------------------------------------------------- simulated git + gh (lab 08-09)

function flagValue(args: string[], ...names: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a !== undefined && names.includes(a)) return args[i + 1];
  }
  return undefined;
}

function gitCommand(args: string[]): TermResult {
  const sub = args[0] ?? "";
  if (sub === "push") {
    // git push origin main:feature/x   |  git push [-u] origin feature/x
    const refspec = args
      .filter((a) => !a.startsWith("-"))
      .slice(2)
      .pop();
    if (!refspec)
      return {
        blocks: [text("usage: git push origin main:<branch>", "error", true)],
      };
    const branch = refspec.includes(":")
      ? (refspec.split(":")[1] ?? "")
      : refspec;
    if (!branch)
      return { blocks: [text("git: empty branch name", "error", true)] };
    const state = loadGitHub();
    if (state.branches.includes(branch) || branch === "main") {
      return {
        blocks: [
          text(
            `git: branch '${branch}' already exists on origin`,
            "error",
            true,
          ),
        ],
      };
    }
    mutateGitHub((s) => {
      s.branches.push(branch);
    });
    const blocks: TermBlock[] = [
      text(`To github.com/you/contoso-university.git`, "dim", true),
      text(` * [new branch]      main -> ${branch}`, "normal", true),
    ];
    if (
      /^(feature|story)\//.test(branch) &&
      fileExists(".github/workflows/generate-prd.md")
    ) {
      blocks.push(
        text(
          `create event → "Generate PRD" workflow queued. Watch it in the GitHub tab → Actions.`,
          "accent",
          true,
        ),
      );
      void triggerBranchCreate(branch).catch(() => undefined);
    } else {
      blocks.push(
        text(
          "Branch created. No workflow matches this branch name (filters: feature/**, story/**).",
          "dim",
          true,
        ),
      );
    }
    bridge.broadcast({ kind: "github-updated" });
    return { blocks };
  }
  if (sub === "checkout" || sub === "switch") {
    return {
      blocks: [
        text(
          "Local branch created — but the gh-aw `create` trigger fires on the REMOTE branch creation.",
          "dim",
          true,
        ),
        text(
          "Push it to trigger workflows: git push origin main:<branch>",
          "dim",
          true,
        ),
      ],
    };
  }
  if (sub === "status") {
    return {
      blocks: [
        text(
          "On branch main — the workspace is a real local git repo; remote GitHub operations are simulated.",
          "dim",
          true,
        ),
      ],
    };
  }
  return {
    blocks: [
      text(
        `git: '${sub}' is not simulated in Lab Studio. Supported: push, checkout, status.`,
        "error",
        true,
      ),
    ],
  };
}

function ghCommand(args: string[]): TermResult {
  const sub = args[0] ?? "";
  const sub2 = args[1] ?? "";

  if (sub === "aw") return ghAwCommand(args.slice(1));
  if (sub === "secret" && sub2 === "set") {
    const name = args[2];
    if (!name)
      return { blocks: [text("usage: gh secret set NAME", "error", true)] };
    mutateGitHub((s) => {
      if (!s.secrets.includes(name)) s.secrets.push(name);
    });
    return {
      blocks: [
        text(
          `✓ Set Actions secret ${name} for you/contoso-university`,
          "success",
          true,
        ),
      ],
    };
  }
  if (sub === "repo" && sub2 === "set-default") {
    return {
      blocks: [
        text("you/contoso-university (your fork — simulated)", "normal", true),
      ],
    };
  }

  if (sub === "issue") {
    if (sub2 === "create") {
      const title = flagValue(args, "--title") ?? "(untitled)";
      const body = flagValue(args, "--body") ?? "";
      const labels = (flagValue(args, "--label") ?? "")
        .split(",")
        .filter(Boolean);
      const issue = createIssue(title, body, labels);
      bridge.broadcast({ kind: "github-updated" });
      return {
        blocks: [
          text(`✓ Created issue #${issue.number}: ${title}`, "success", true),
          text("  View it in the GitHub tab → Issues.", "dim", true),
        ],
      };
    }
    if (sub2 === "list") {
      const issues = loadGitHub().issues.filter((i) => i.state === "open");
      if (issues.length === 0)
        return { blocks: [text("no open issues", "dim", true)] };
      return {
        blocks: issues.map((i) =>
          text(
            `#${i.number}  ${i.title}  [${i.labels.join(",") || "no labels"}]`,
            "normal",
            true,
          ),
        ),
      };
    }
    if (sub2 === "edit") {
      const num = Number(args[2]);
      const assignee = flagValue(args, "--add-assignee");
      const issue = loadGitHub().issues.find((i) => i.number === num);
      if (!issue)
        return {
          blocks: [text(`issue #${args[2] ?? "?"} not found`, "error", true)],
        };
      if (assignee && /copilot/i.test(assignee)) {
        if (isPlatformBusy())
          return {
            blocks: [
              text(
                "A platform agent is already running — wait for it to finish.",
                "error",
                true,
              ),
            ],
          };
        mutateGitHub((s) => {
          const target = s.issues.find((i) => i.number === num);
          if (target && !target.assignees.includes("Copilot"))
            target.assignees.push("Copilot");
        });
        void runCodingAgent(num).catch(() => undefined);
        bridge.broadcast({ kind: "github-updated" });
        return {
          blocks: [
            text(`✓ Assigned Copilot to issue #${num}.`, "success", true),
            text(
              "  The coding agent session is starting — watch the issue in the GitHub tab (live Copilot).",
              "accent",
              true,
            ),
          ],
        };
      }
      return {
        blocks: [
          text(
            "supported here: gh issue edit <num> --add-assignee @copilot",
            "error",
            true,
          ),
        ],
      };
    }
    if (sub2 === "close") {
      const num = Number(args[2]);
      mutateGitHub((s) => {
        const target = s.issues.find((i) => i.number === num);
        if (target) target.state = "closed";
      });
      bridge.broadcast({ kind: "github-updated" });
      return { blocks: [text(`✓ Closed issue #${num}`, "success", true)] };
    }
  }

  if (sub === "pr") {
    const state = loadGitHub();
    if (sub2 === "create") {
      const base = flagValue(args, "--base") ?? "main";
      const head = flagValue(args, "--head") ?? "";
      const title = flagValue(args, "--title") ?? "(untitled)";
      const body = flagValue(args, "--body") ?? "";
      if (!head)
        return {
          blocks: [
            text(
              "usage: gh pr create --base <branch> --head <branch> --title … --body …",
              "error",
              true,
            ),
          ],
        };
      mutateGitHub((s) => {
        if (!s.branches.includes(head)) s.branches.push(head);
      });
      // Lab 18's stack exercise: the studio stages layer 1's model change so
      // the per-layer review in the next step has a real diff to look at.
      const files =
        head === "feature/course-prereqs-model" &&
        fileExists("src/entities/course.ts")
          ? [
              {
                path: "src/entities/course.ts",
                before: readWorkspaceFile("src/entities/course.ts"),
                after:
                  readWorkspaceFile("src/entities/course.ts").replace(
                    "  readonly instructorId: number | null;",
                    "  readonly instructorId: number | null;\n  /** Course ids that must be completed before enrolling. */\n  readonly prerequisiteCourseIds: readonly number[];",
                  ) + "",
              },
            ]
          : [];
      const pr = createPullFromTerminal({ title, body, base, head, files });
      bridge.broadcast({ kind: "github-updated" });
      return {
        blocks: [
          text(
            `✓ Created pull request #${pr} — ${title}  (${head} → ${base})`,
            "success",
            true,
          ),
          ...(base !== "main"
            ? [
                text(
                  `  Stacked: this PR targets branch '${base}', not main — it sits on top of that layer.`,
                  "accent",
                  true,
                ),
              ]
            : []),
          ...(files.length > 0
            ? [
                text(
                  "  The studio staged layer 1's model change as the PR's diff (simulated commit).",
                  "dim",
                  true,
                ),
              ]
            : []),
        ],
      };
    }
    if (sub2 === "list") {
      const open = state.pulls.filter((p) => p.state === "open");
      if (open.length === 0)
        return { blocks: [text("no open pull requests", "dim", true)] };
      return {
        blocks: open.map((p) =>
          text(
            `#${p.number}  ${p.draft ? "[draft] " : ""}${p.title}  (${p.head} → ${p.base})${p.reviews.length > 0 ? "  · reviewed by Copilot" : ""}`,
            "normal",
            true,
          ),
        ),
      };
    }
    if (sub2 === "view") {
      const pr = state.pulls.find((p) => p.number === Number(args[2]));
      if (!pr)
        return {
          blocks: [
            text(`pull request #${args[2] ?? "?"} not found`, "error", true),
          ],
        };
      return {
        blocks: [
          text(
            `#${pr.number} ${pr.title} ${pr.draft ? "(draft)" : ""}`,
            "accent",
            true,
          ),
          text(
            `  ${pr.head} → ${pr.base} · ${pr.state} · labels: ${pr.labels.join(", ") || "none"}`,
            "dim",
            true,
          ),
          text(
            `  files: ${pr.files.map((f) => f.path).join(", ")}`,
            "normal",
            true,
          ),
          text(
            `  reviews: ${pr.reviews.length} · comments: ${pr.comments.length} — full view in the GitHub tab`,
            "dim",
            true,
          ),
        ],
      };
    }
    if (sub2 === "comment") {
      const num = Number(args[2]);
      const body = flagValue(args, "--body") ?? "";
      const pr = state.pulls.find((p) => p.number === num);
      if (!pr)
        return {
          blocks: [
            text(`pull request #${args[2] ?? "?"} not found`, "error", true),
          ],
        };
      if (/@copilot/i.test(body)) {
        if (isPlatformBusy())
          return {
            blocks: [
              text(
                "A platform agent is already running — wait for it to finish.",
                "error",
                true,
              ),
            ],
          };
        void iterateOnPull(num, body).catch(() => undefined);
        return {
          blocks: [
            text(
              `✓ Commented on #${num}. @copilot mentioned — the coding agent is iterating (live Copilot).`,
              "success",
              true,
            ),
            text(
              "  Watch the PR in the GitHub tab for the new commit.",
              "dim",
              true,
            ),
          ],
        };
      }
      mutateGitHub((s) => {
        s.pulls
          .find((p) => p.number === num)
          ?.comments.push({ author: "you", body, at: Date.now() });
      });
      bridge.broadcast({ kind: "github-updated" });
      return { blocks: [text(`✓ Commented on #${num}`, "success", true)] };
    }
    if (sub2 === "ready") {
      const num = Number(args[2]);
      mutateGitHub((s) => {
        const target = s.pulls.find((p) => p.number === num);
        if (target) target.draft = false;
      });
      bridge.broadcast({ kind: "github-updated" });
      return {
        blocks: [text(`✓ Marked #${num} ready for review`, "success", true)],
      };
    }
    if (sub2 === "close") {
      const num = Number(args[2]);
      const deleteBranch = args.includes("--delete-branch");
      mutateGitHub((s) => {
        const target = s.pulls.find((p) => p.number === num);
        if (target) {
          target.state = "closed";
          if (deleteBranch)
            s.branches = s.branches.filter((b) => b !== target.head);
        }
      });
      bridge.broadcast({ kind: "github-updated" });
      return {
        blocks: [
          text(
            `✓ Closed pull request #${num}${deleteBranch ? " and deleted its branch" : ""}`,
            "success",
            true,
          ),
        ],
      };
    }
  }

  return {
    blocks: [
      text(
        "gh (simulated) — supported: issue create|list|edit|close · pr list|view|comment|ready|close · secret set · aw …",
        "dim",
        true,
      ),
    ],
  };
}

function ghAwCommand(args: string[]): TermResult {
  const sub = args[0] ?? "";
  if (sub === "version") {
    return {
      blocks: [
        text(
          "gh-aw v0.37.0 (simulated — matches this workspace's committed lock files)",
          "normal",
          true,
        ),
      ],
    };
  }
  if (sub === "secrets" && args[1] === "set") {
    const name = args[2];
    if (!name)
      return {
        blocks: [
          text("usage: gh aw secrets set NAME --value VALUE", "error", true),
        ],
      };
    mutateGitHub((s) => {
      if (!s.secrets.includes(name)) s.secrets.push(name);
    });
    return { blocks: [text(`✓ Set Actions secret ${name}`, "success", true)] };
  }
  if (sub === "compile") {
    const target = args[1] ?? ".github/workflows/generate-prd.md";
    if (!fileExists(target))
      return {
        blocks: [
          text(`compile: ${target}: no such workflow file`, "error", true),
        ],
      };
    const { data } = parseFrontmatter(readWorkspaceFile(target));
    const lockPath = target.replace(/\.md$/, ".lock.yml");
    writeWorkspaceFile(lockPath, generateLockYml(target, data));
    return {
      blocks: [
        text(`✓ Compiled ${target}`, "success", true),
        text(
          `  → ${lockPath} — the standard Actions YAML that GitHub actually runs`,
          "dim",
          true,
        ),
        text(
          "  Open it in the Files tab: note the branch-filter fence, the read-only agent job, and the pinned actions.",
          "dim",
          true,
        ),
      ],
    };
  }
  return {
    blocks: [
      text(
        "gh aw (simulated) — supported: version, compile [file], secrets set NAME",
        "dim",
        true,
      ),
    ],
  };
}

function generateLockYml(
  sourcePath: string,
  frontmatter: Record<string, string>,
): string {
  const name = sourcePath.split("/").pop()?.replace(/\.md$/, "") ?? "workflow";
  const title = name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `# This file was automatically generated by gh-aw (simulated by Lab Studio).
# Source: ${sourcePath} — edit the .md, recompile, commit both files.
name: "${title}"
on:
  create:

permissions: {}

jobs:
  pre_activation:
    if: startsWith(github.ref, 'refs/heads/feature/') || startsWith(github.ref, 'refs/heads/story/')
    runs-on: ubuntu-slim
    steps:
      - name: Evaluate activation filters
        run: echo "branch filter matched"

  activation:
    needs: pre_activation
    runs-on: ubuntu-slim
    steps:
      - name: Check daily AI credits
        run: echo "credits OK"

  agent:
    needs: activation
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
    steps:
      - name: Setup Scripts
        uses: github/gh-aw-actions/setup@6aab9e5b5c91c615506061f09bedd81a23babe3c # v0.86.2
      - name: Checkout repository
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Run Copilot agent with the markdown instructions
        run: gh-aw-agent --instructions ${sourcePath}
        env:
          COPILOT_GITHUB_TOKEN: \${{ secrets.COPILOT_GITHUB_TOKEN }}

  safe_outputs:
    needs: [activation, agent]
    runs-on: ubuntu-slim
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - name: Create pull request from agent output
        run: gh-aw-safe-outputs create-pull-request
`;
}

// ------------------------------------------------ org allowlist policy (lab 11/16)

/** Policy decisions the learner has run — the lab16 verify reads these. */
export const policyChecks: { source: string; allowed: boolean; at: number }[] =
  [];

function globMatches(pattern: string, source: string): boolean {
  // Segment wildcard: contoso-internal/* matches contoso-internal/anything.
  const re = new RegExp(
    "^" +
      pattern
        .split("*")
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]*") +
      "$",
  );
  return re.test(source);
}

function policyCommand(args: string[]): TermResult {
  const [sub, source] = args;
  if (sub !== "check" || !source) {
    return {
      blocks: [
        text(
          "usage: policy check <owner/repo>  — evaluates my-plugin/org-policy.yaml",
          "error",
        ),
      ],
    };
  }
  const policyPath = fileExists("my-plugin/org-policy.yaml")
    ? "my-plugin/org-policy.yaml"
    : fileExists("org-policy.yaml")
      ? "org-policy.yaml"
      : null;
  if (!policyPath) {
    return {
      blocks: [
        text(
          "No policy file found — create my-plugin/org-policy.yaml first.",
          "error",
        ),
      ],
    };
  }
  const policy = readWorkspaceFile(policyPath);
  const defaultDeny = /default_action:\s*deny/.test(policy);
  const allowlist = [
    ...policy.matchAll(/-\s*source:\s*["']?([^"'\n]+?)["']?\s*$/gm),
  ].map((m) => (m[1] ?? "").trim());
  const matched = allowlist.find((entry) => globMatches(entry, source));
  const allowed = matched !== undefined ? true : !defaultDeny;
  policyChecks.push({ source, allowed, at: Date.now() });
  return {
    blocks: [
      text(
        `policy: ${policyPath}  (default_action: ${defaultDeny ? "deny" : "allow"})`,
        "dim",
      ),
      text(
        allowed
          ? `✓ ${source} → allowed: true${matched ? `  (matched "${matched}")` : ""}`
          : `✗ ${source} → allowed: false  (no allowlist entry matched)`,
        allowed ? "success" : "error",
      ),
      text(
        "Local decision simulation — central enforcement is managed-settings.json (Lab 16).",
        "dim",
      ),
    ],
  };
}

function createPullFromTerminal(input: {
  title: string;
  body: string;
  base: string;
  head: string;
  files: { path: string; before: string | null; after: string | null }[];
}): number {
  return mutateGitHub((s) => {
    const number = ++s.counters.pull;
    s.pulls.push({
      number,
      title: input.title,
      body: input.body,
      state: "open",
      draft: false,
      head: input.head,
      base: input.base,
      labels: [],
      reviewers: [],
      files: input.files,
      commits: [{ message: input.title, at: Date.now() }],
      comments: [],
      reviews: [],
    });
    return number;
  });
}

// ---------------------------------------------------- simulated vally CLI (lab 27)
//
// `vally` is simulated, but nothing it prints is canned: `lint` reads the learner's
// eval.yaml, and `eval` / `grade` execute the learner's OWN grader module in a
// bounded VM against trajectories built from the stimuli the learner wrote, so a
// broken grader fails here the way it would fail in a real run. Every block goes
// through `vtext`, which sets `sim: true`, so the terminal badges all of it as
// SIMULATED. Output shapes follow what the real CLI printed when the lab was
// written (the lint diagnostic layout, `Score: 100.0% | PASSED (threshold:
// 100.0%)`, `Saved  <dir>`); only the diagnostic codes the real linter has are used.

const VALLY_VERSION = "0.21.0";
const VALLY_DEFAULT_SPEC = "evals/hermetic/reviewer-routing/eval.yaml";
const VALLY_GRADER_FILE = ".github/evals/graders/tool-calls-issued.mjs";
const VALLY_RUN_DIR = "vally-results/2026-11-24T15-00-00Z";
const VALLY_RESULTS_FILE = `${VALLY_RUN_DIR}/results.jsonl`;
const VALLY_GRADER_TIMEOUT_MS = 2000;
const VALLY_USAGE =
  "vally (simulated) — supported: --version, lint [-e <eval.yaml>] [--strict], eval (--suite <name> | -e <eval.yaml>), grade -e <eval.yaml> [--workspace <dir>] [< results.jsonl]";
/** The only keys a `program` grader's `config` accepts. */
const PROGRAM_GRADER_CONFIG_KEYS = [
  "program",
  "args",
  "shell",
  "sub_path",
  "timeout",
  "env",
];
/** Names Vally reserves for itself in a program grader's environment. */
const RESERVED_GRADER_ENV = [
  "EVALUATE_WORKSPACE",
  "EVALUATE_GRADER_INPUT",
  "EVALUATE_ASSETS",
  "EVALUATE_ARTIFACT_DIR",
  "EVALUATE_ARTIFACT_DIR_STRICT",
];
const ISSUED_CONFIG_LIST_KEYS = [
  "requiredTools",
  "forbiddenTools",
  "requiredAgents",
  "forbiddenAgents",
  "requiredSkills",
  "forbiddenSkills",
];

/** A simulated block: the only way `vally` builds output, so `sim` is never forgotten. */
const vtext = (t: string, tone?: TermBlock["tone"]): TermBlock =>
  text(t, tone, true);
const vresult = (...blocks: TermBlock[]): TermResult => ({ blocks });
const vlines = (
  lines: string[],
  tone?: TermBlock["tone"],
): TermBlock[] => lines.map((l) => vtext(l, tone));

// ---- the learner's grader, run in a bounded VM

export interface IssuedGradeCase {
  trajectory: unknown;
  config: unknown;
}

/** A grader's return value reduced to plain data, so nothing from the VM realm escapes. */
export interface IssuedGrade {
  name: string | null;
  kind: string | null;
  passed: boolean | null;
  score: number | null;
  evidence: string | null;
}

export type IssuedGraderRun =
  | { ok: true; grades: IssuedGrade[] }
  | { ok: false; timedOut: boolean; message: string };

/**
 * Run the learner's `gradeIssuedToolCalls(trajectory, config)` once per case inside
 * `runInNewContext`, with no host globals and a hard timeout, after stripping `export `
 * from its function declarations. One VM run, so one timeout budget covers every case.
 */
export function runIssuedGraderCases(
  code: string,
  cases: IssuedGradeCase[],
  timeoutMs: number = VALLY_GRADER_TIMEOUT_MS,
): IssuedGraderRun {
  const runnable = `(function () {
${code.replace(/\bexport\s+function\s+/g, "function ")}
function __norm(r) {
  if (r === null || typeof r !== "object") {
    return { name: null, kind: null, passed: null, score: null, evidence: null };
  }
  return {
    name: typeof r.name === "string" ? r.name : null,
    kind: typeof r.kind === "string" ? r.kind : null,
    passed: typeof r.passed === "boolean" ? r.passed : null,
    score: typeof r.score === "number" && isFinite(r.score) ? r.score : null,
    evidence: typeof r.evidence === "string" ? r.evidence : null,
  };
}
const __cases = ${JSON.stringify(cases)};
return JSON.stringify(__cases.map(function (c) {
  return __norm(gradeIssuedToolCalls(c.trajectory, c.config));
}));
})()`;
  try {
    const out = runInNewContext(runnable, Object.create(null), {
      timeout: timeoutMs,
    });
    return { ok: true, grades: JSON.parse(String(out)) as IssuedGrade[] };
  } catch (err) {
    const errCode = (err as { code?: string } | null)?.code;
    const message = err instanceof Error ? err.message : String(err);
    const timedOut =
      errCode === "ERR_SCRIPT_EXECUTION_TIMEOUT" ||
      /Script execution timed out/i.test(message);
    return { ok: false, timedOut, message };
  }
}

/** A grader result is usable only when it has the shape Vally requires. */
function validGrade(
  g: IssuedGrade | undefined,
): g is IssuedGrade & {
  passed: boolean;
  score: number;
  evidence: string;
} {
  return (
    g !== undefined &&
    g.kind === "code" &&
    typeof g.passed === "boolean" &&
    typeof g.score === "number" &&
    g.score >= 0 &&
    g.score <= 1 &&
    typeof g.evidence === "string"
  );
}

// ---- reading the learner's YAML (indentation-aware, no YAML library)

const indentOf = (line: string): number => line.length - line.trimStart().length;
const isBlank = (line: string): boolean =>
  line.trim() === "" || line.trim().startsWith("#");

/** The lines nested under the first line matching `header`, or undefined when absent. */
function childLines(lines: string[], header: RegExp): string[] | undefined {
  const at = lines.findIndex((l) => header.test(l));
  if (at === -1) return undefined;
  const base = indentOf(lines[at] ?? "");
  const out: string[] = [];
  for (const line of lines.slice(at + 1)) {
    if (isBlank(line)) {
      out.push(line);
      continue;
    }
    if (indentOf(line) <= base) break;
    out.push(line);
  }
  return out;
}

/** The body under a top-level `key:`; stops at the next top-level key. */
function topLevelBlock(yaml: string, key: string): string[] | undefined {
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex((l) => new RegExp(`^${key}:\\s*(?:#.*)?$`).test(l));
  if (at === -1) return undefined;
  const out: string[] = [];
  for (const line of lines.slice(at + 1)) {
    if (!isBlank(line) && indentOf(line) === 0) break;
    out.push(line);
  }
  return out;
}

/** Split nested lines into list items at the indent of the first `- ` entry. */
function listItems(lines: string[]): string[][] {
  const first = lines.find((l) => /^\s*-\s/.test(l));
  if (first === undefined) return [];
  const itemStart = new RegExp(`^ {${indentOf(first)}}-\\s`);
  const items: string[][] = [];
  let current: string[] | undefined;
  for (const line of lines) {
    if (itemStart.test(line)) {
      current = [line];
      items.push(current);
    } else if (current) {
      current.push(line);
    }
  }
  return items;
}

/** The keys directly under a block of nested lines (the block's own indent level). */
function mapKeys(lines: string[]): string[] {
  const first = lines.find((l) => !isBlank(l));
  if (first === undefined) return [];
  const level = indentOf(first);
  const keys: string[] = [];
  for (const line of lines) {
    if (isBlank(line) || indentOf(line) !== level) continue;
    const key = /^\s*-?\s*([A-Za-z_][\w.-]*)\s*:/.exec(line)?.[1];
    if (key) keys.push(key);
  }
  return keys;
}

const scalarOf = (text: string, key: string): string | undefined =>
  new RegExp(`\\b${key}:\\s*["']?([^\\s"'#]+)`).exec(text)?.[1];

export interface VallyGrader {
  name: string;
  type: string;
  script: string | undefined;
  config: Record<string, unknown>;
  invalidConfigJson: string | undefined;
  unknownConfigKeys: string[];
  reservedEnvKeys: string[];
}

export interface VallyStimulus {
  name: string;
  /** The stimulus's own `tags:`; a suite `filter` matches against these. */
  tags: Record<string, string>;
  graders: VallyGrader[];
  /** The stimulus's raw YAML, for checks that need a setting anywhere inside it. */
  text: string;
}

export interface VallyEval {
  path: string;
  name: string;
  threshold: number;
  thresholdRaw: string | undefined;
  weights: Record<string, number>;
  stimuli: VallyStimulus[];
  /** Every `name:` of a stimulus, in order, so duplicates can be reported by index. */
  stimulusNames: string[];
  maxTurns: { index: number; raw: string }[];
}

/** The per-stimulus checks config: from ISSUED_CALL_CONFIG JSON, else inline lists. */
function parseIssuedConfig(graderText: string): {
  config: Record<string, unknown>;
  invalidConfigJson: string | undefined;
} {
  const hasIssuedKey = /\bISSUED_CALL_CONFIG\s*:/.test(graderText);
  const single = /ISSUED_CALL_CONFIG:\s*'((?:[^']|'')*)'/.exec(graderText)?.[1];
  const double = /ISSUED_CALL_CONFIG:\s*"((?:[^"\\]|\\.)*)"/.exec(graderText)?.[1];
  if (hasIssuedKey) {
    let raw: string | undefined;
    if (single !== undefined) raw = single.replace(/''/g, "'");
    else if (double !== undefined) {
      try {
        raw = JSON.parse(`"${double}"`) as string;
      } catch (err) {
        return {
          config: {},
          invalidConfigJson: err instanceof Error ? err.message : String(err),
        };
      }
    } else {
      return {
        config: {},
        invalidConfigJson: "ISSUED_CALL_CONFIG must be a quoted JSON string",
      };
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { config: parsed as Record<string, unknown>, invalidConfigJson: undefined };
      }
      return { config: {}, invalidConfigJson: "ISSUED_CALL_CONFIG must be a JSON object" };
    } catch (err) {
      return {
        config: {},
        invalidConfigJson: err instanceof Error ? err.message : String(err),
      };
    }
  }
  const out: Record<string, unknown> = {};
  for (const key of [
    ...ISSUED_CONFIG_LIST_KEYS,
    "requiredArgSubstrings",
    "forbiddenArgSubstrings",
  ]) {
    const list = new RegExp(`"?${key}"?\\s*:\\s*(\\[[^\\]]*\\])`).exec(
      graderText,
    )?.[1];
    if (list === undefined) continue;
    try {
      out[key] = JSON.parse(list);
    } catch {
      // ignore a list that is not JSON-shaped
    }
  }
  return { config: out, invalidConfigJson: undefined };
}

function parseGrader(item: string[]): VallyGrader {
  const text = item.join("\n");
  const configLines = childLines(item, /^\s*(?:-\s+)?config:\s*$/) ?? [];
  const envLines = childLines(configLines, /^\s*env:\s*$/) ?? [];
  const issued = parseIssuedConfig(text);
  return {
    name: scalarOf(text, "name") ?? "(unnamed)",
    type: scalarOf(text, "type") ?? "",
    script: /\.vally-grading\/graders\/([\w.-]+)/.exec(text)?.[1],
    config: issued.config,
    invalidConfigJson: issued.invalidConfigJson,
    unknownConfigKeys: mapKeys(configLines).filter(
      (k) => !PROGRAM_GRADER_CONFIG_KEYS.includes(k),
    ),
    reservedEnvKeys: mapKeys(envLines).filter((k) =>
      RESERVED_GRADER_ENV.includes(k.toUpperCase()),
    ),
  };
}

/** Read a Vally eval spec's stimuli, graders and scoring from its YAML text. */
export function parseVallyEval(path: string, yaml: string): VallyEval {
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");
  const stimulusItems = listItems(topLevelBlock(yaml, "stimuli") ?? []);
  const scoring = topLevelBlock(yaml, "scoring") ?? [];
  const thresholdRaw = /^\s*threshold:\s*([^\s#]+)/m.exec(scoring.join("\n"))?.[1];
  const weights: Record<string, number> = {};
  for (const line of childLines(scoring, /^\s*weights:\s*$/) ?? []) {
    const m = /^\s*([A-Za-z_][\w-]*)\s*:\s*([^\s#]+)/.exec(line);
    if (m?.[1] !== undefined && m[2] !== undefined) weights[m[1]] = Number(m[2]);
  }
  const stimuli = stimulusItems.map((item): VallyStimulus => {
    const graderLines = childLines(item, /^\s*graders:\s*$/) ?? [];
    const tags: Record<string, string> = {};
    for (const line of childLines(item, /^\s*tags:\s*$/) ?? []) {
      const m = /^\s*([A-Za-z_][\w-]*)\s*:\s*["']?([^"'#\s]+)/.exec(line);
      if (m?.[1] !== undefined && m[2] !== undefined) tags[m[1]] = m[2];
    }
    return {
      name: scalarOf(item.join("\n"), "name") ?? "(unnamed)",
      tags,
      graders: listItems(graderLines).map(parseGrader),
      text: item.join("\n"),
    };
  });
  const maxTurns: { index: number; raw: string }[] = [];
  stimulusItems.forEach((item, index) => {
    const raw = /^\s*max_turns:\s*([^\s#]+)/m.exec(item.join("\n"))?.[1];
    if (raw !== undefined) maxTurns.push({ index, raw });
  });
  return {
    path,
    name: scalarOf(lines.join("\n"), "name") ?? path,
    threshold: thresholdRaw !== undefined ? Number(thresholdRaw) : 1,
    thresholdRaw,
    weights,
    stimuli,
    stimulusNames: stimuli.map((s) => s.name),
    maxTurns,
  };
}

const pct1 = (n: number): string => `${(n * 100).toFixed(1)}%`;
/** `100%`, `0%`, `33.3%`: the compact form the run summary uses. */
const pctCompact = (n: number): string => {
  const p = n * 100;
  return Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`;
};

// ---- vally lint

interface LintDiagnostic {
  code: string;
  message: string;
  at: string;
}

function lintDiagnostics(spec: VallyEval, modelParam: string): LintDiagnostic[] {
  const out: LintDiagnostic[] = [];
  const seen = new Map<string, number>();
  spec.stimulusNames.forEach((name, index) => {
    if (seen.has(name)) {
      out.push({
        code: "eval-load-error",
        message: `${spec.path.split("/").pop() ?? spec.path}: stimuli[${index}]: duplicate name "${name}" (combination: MODEL=${modelParam})`,
        at: spec.path,
      });
    } else {
      seen.set(name, index);
    }
  });
  spec.stimuli.forEach((stimulus, si) => {
    stimulus.graders.forEach((grader, gi) => {
      if (grader.type !== "program") return;
      for (const key of grader.unknownConfigKeys) {
        out.push({
          code: "invalid-grader-config",
          message: `${grader.name}: Unrecognized config field '${key}'`,
          at: `stimuli[${si}].graders[${gi}].config.${key}`,
        });
      }
      if (grader.reservedEnvKeys.length > 0) {
        out.push({
          code: "invalid-grader-config",
          message: `${grader.name}: 'env' cannot set reserved variable(s): ${grader.reservedEnvKeys.join(", ")}`,
          at: `stimuli[${si}].graders[${gi}].config.env`,
        });
      }
      if (grader.invalidConfigJson !== undefined) {
        out.push({
          code: "invalid-grader-config",
          message: `${grader.name}: ISSUED_CALL_CONFIG is not valid JSON (${grader.invalidConfigJson})`,
          at: `stimuli[${si}].graders[${gi}].config.env.ISSUED_CALL_CONFIG`,
        });
      }
    });
  });
  for (const { index, raw } of spec.maxTurns) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      out.push({
        code: "invalid-constraint-value",
        message: `max_turns must be a finite positive number, got ${JSON.stringify(raw)}`,
        at: `stimuli[${index}].constraints.max_turns`,
      });
    }
  }
  if (spec.thresholdRaw !== undefined) {
    const t = Number(spec.thresholdRaw);
    if (!Number.isFinite(t) || t < 0 || t > 1) {
      out.push({
        code: "scoring-threshold-range",
        message: `scoring.threshold must be between 0 and 1 (got ${spec.thresholdRaw})`,
        at: "scoring.threshold",
      });
    }
  }
  const weightValues = Object.values(spec.weights);
  if (weightValues.length > 0) {
    const sum = Math.round(weightValues.reduce((a, b) => a + b, 0) * 100) / 100;
    if (!Number.isFinite(sum) || Math.abs(Math.round(sum * 100) - 100) > 1) {
      out.push({
        code: "scoring-weight-sum",
        message: `scoring.weights must sum to 1.0 (got ${Number.isFinite(sum) ? sum.toFixed(2) : "NaN"})`,
        at: "scoring.weights",
      });
    }
  }
  return out;
}

function modelParamOf(): string {
  if (!fileExists(".vally.yaml")) return "gpt-5-mini";
  const params = topLevelBlock(readWorkspaceFile(".vally.yaml"), "params") ?? [];
  return scalarOf(params.join("\n"), "MODEL") ?? "gpt-5-mini";
}

function vallyLint(args: string[]): TermResult {
  const specPath =
    flagValue(args, "-e", "--eval-spec") ??
    args.find((a) => !a.startsWith("-")) ??
    VALLY_DEFAULT_SPEC;
  if (!fileExists(specPath)) {
    return vresult(
      vtext(`Error: --eval-spec path does not exist: ${specPath}`, "error"),
    );
  }
  const spec = parseVallyEval(specPath, readWorkspaceFile(specPath));
  const diagnostics = lintDiagnostics(spec, modelParamOf());
  if (diagnostics.length === 0) {
    return vresult(vtext(`✔ ${specPath} is valid`, "success"));
  }
  const blocks: TermBlock[] = [vtext(`Eval: ${specPath}`, "accent")];
  for (const d of diagnostics) {
    blocks.push(vtext(`✘ error [${d.code}] ${d.message}`, "error"));
    blocks.push(vtext(`  at ${d.at}`, "dim"));
  }
  blocks.push(vtext(""), vtext(`  ${diagnostics.length} error(s)`, "error"));
  return vresult(...blocks);
}

// ---- trajectories the simulated agent "produces"

/**
 * The simulated agent behaves ideally: it does exactly what the stimulus's required
 * checks ask for and nothing the forbidden checks list. So a stimulus passes if and
 * only if the learner's grader judges that ideal trajectory correctly, which makes the
 * grader the thing under test. A stimulus with no required checks gets one harmless read.
 */
function buildTrajectory(
  stimulus: VallyStimulus,
  config: Record<string, unknown>,
  model: string,
  evalName: string,
): unknown {
  const events: unknown[] = [];
  let n = 0;
  const stamp = (): string =>
    new Date(Date.parse("2026-11-24T15:00:00.000Z") + ++n * 100).toISOString();
  const list = (key: string): string[] =>
    Array.isArray(config[key])
      ? (config[key] as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
  const argRules = (key: string): { toolName: string; substring: string }[] =>
    Array.isArray(config[key])
      ? (config[key] as unknown[]).filter(
          (v): v is { toolName: string; substring: string } =>
            v !== null &&
            typeof v === "object" &&
            typeof (v as { toolName?: unknown }).toolName === "string" &&
            typeof (v as { substring?: unknown }).substring === "string",
        )
      : [];
  const skills = list("requiredSkills");
  for (const agent of list("requiredAgents")) {
    events.push({
      type: "tool_call",
      timestamp: stamp(),
      data: {
        toolName: "dispatch_agent",
        toolCallId: `tc-sim-${n}`,
        launchedAgentIds: [agent],
        arguments: { agent },
      },
    });
  }
  for (const toolName of list("requiredTools")) {
    events.push({
      type: "tool_call",
      timestamp: stamp(),
      data: { toolName, toolCallId: `tc-sim-${n}`, arguments: {} },
    });
  }
  for (const rule of argRules("requiredArgSubstrings")) {
    events.push({
      type: "tool_call",
      timestamp: stamp(),
      data: {
        toolName: rule.toolName,
        toolCallId: `tc-sim-${n}`,
        arguments: { value: rule.substring },
      },
    });
  }
  for (const name of skills) {
    events.push({
      type: "skill_activation",
      timestamp: stamp(),
      data: { name, path: `.github/skills/${name}/SKILL.md` },
    });
  }
  if (events.length === 0) {
    events.push({
      type: "tool_call",
      timestamp: stamp(),
      data: {
        toolName: "view",
        toolCallId: `tc-sim-${n}`,
        arguments: { path: "src/entities/course.ts" },
      },
    });
  }
  return {
    id: `trajectory-${stimulus.name}`,
    stimulus: { name: stimulus.name, prompt: "(simulated)" },
    events,
    metrics: { turns: 1, toolCalls: events.length },
    output: "(simulated agent output)",
    workDir: ".",
    metadata: {
      model,
      executor: "simulated",
      skillsLoaded: skills,
      evalName,
      startedAt: "2026-11-24T15:00:00.000Z",
      completedAt: stamp(),
      sessionID: "session-sim-001",
    },
  };
}

// ---- running graders over (eval, stimulus) pairs

interface GradedStimulus {
  evalName: string;
  stimulus: string;
  threshold: number;
  score: number;
  passed: boolean;
  graders: { name: string; passed: boolean; evidence: string }[];
  trajectory: unknown;
}

const UNSUPPORTED_GRADER =
  "simulated vally runs only program graders that stage tool-calls-issued; this grader was not run";

type GradeOutcome =
  | { ok: true; graded: GradedStimulus[] }
  | { ok: false; blocks: TermBlock[] };

/** Run every grader of every given stimulus against the supplied trajectory. */
function gradeStimuli(
  spec: VallyEval,
  items: { stimulus: VallyStimulus; trajectory: unknown }[],
  graderCode: string,
): GradeOutcome {
  const cases: IssuedGradeCase[] = [];
  const slots: { item: number; grader: number }[] = [];
  items.forEach(({ stimulus, trajectory }, ii) => {
    stimulus.graders.forEach((grader, gi) => {
      if (grader.type === "program" && grader.script === "tool-calls-issued.mjs") {
        cases.push({ trajectory, config: grader.config });
        slots.push({ item: ii, grader: gi });
      }
    });
  });
  const run = runIssuedGraderCases(graderCode, cases);
  if (!run.ok) {
    return {
      ok: false,
      blocks: [
        vtext(
          run.timedOut
            ? `Error: grader timed out after ${VALLY_GRADER_TIMEOUT_MS}ms — check ${VALLY_GRADER_FILE} for a non-terminating loop.`
            : `Error: grader failed to run: ${run.message}`,
          "error",
        ),
      ],
    };
  }
  const graded = items.map(({ stimulus, trajectory }, ii): GradedStimulus => {
    const results = stimulus.graders.map((grader, gi) => {
      const slot = slots.findIndex((s) => s.item === ii && s.grader === gi);
      if (slot === -1) {
        return { name: grader.name, passed: false, score: 0, evidence: UNSUPPORTED_GRADER };
      }
      const g = run.grades[slot];
      if (!validGrade(g)) {
        return {
          name: grader.name,
          passed: false,
          score: 0,
          evidence:
            'grader returned an invalid result: expected { name, kind: "code", passed, score, evidence } with 0 <= score <= 1',
        };
      }
      return { name: grader.name, passed: g.passed, score: g.score, evidence: g.evidence };
    });
    const score =
      results.length === 0
        ? 0
        : results.reduce((sum, r) => sum + r.score, 0) / results.length;
    return {
      evalName: spec.name,
      stimulus: stimulus.name,
      threshold: spec.threshold,
      score,
      passed: results.length > 0 && results.every((r) => r.passed) && score >= spec.threshold,
      graders: results.map(({ name, passed, evidence }) => ({ name, passed, evidence })),
      trajectory,
    };
  });
  return { ok: true, graded };
}

// ---- vally eval

/** Expand an eval glob of the form `<dir>/<any folder>/<file>`, or an exact path, against the workspace. */
function expandEvalGlob(pattern: string): string[] {
  if (!pattern.includes("*")) return fileExists(pattern) ? [pattern] : [];
  const m = /^(.*?)\/\*\/(.+)$/.exec(pattern);
  if (!m || m[1] === undefined || m[2] === undefined) return [];
  try {
    return readdirSync(safePath(m[1]), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => `${m[1]}/${e.name}/${m[2]}`)
      .filter((p) => fileExists(p))
      .sort();
  } catch {
    return [];
  }
}

interface VallySuite {
  evals: string[];
  filter: Record<string, string>;
}

function readSuite(name: string): VallySuite | string {
  const suites = topLevelBlock(readWorkspaceFile(".vally.yaml"), "suites");
  if (!suites) return "no `suites:` section in .vally.yaml";
  const names = mapKeys(suites);
  const body = childLines(suites, new RegExp(`^\\s*${name}:\\s*$`));
  if (!body) {
    return `unknown suite '${name}' (available: ${names.join(", ") || "none"})`;
  }
  const evals = (childLines(body, /^\s*evals:\s*$/) ?? [])
    .map((l) => /^\s*-\s*["']?([^"'#\s]+)/.exec(l)?.[1])
    .filter((v): v is string => v !== undefined);
  const filter: Record<string, string> = {};
  for (const line of childLines(body, /^\s*filter:\s*$/) ?? []) {
    const m = /^\s*([A-Za-z_][\w-]*)\s*:\s*["']?([^"'#\s]+)/.exec(line);
    if (m?.[1] !== undefined && m[2] !== undefined) filter[m[1]] = m[2];
  }
  return { evals, filter };
}

function vallyEval(args: string[]): TermResult {
  const suiteName = flagValue(args, "--suite");
  const specFlag = flagValue(args, "-e", "--eval-spec");
  if (suiteName !== undefined && specFlag !== undefined) {
    return vresult(
      vtext("Error: --suite cannot be combined with --eval-spec", "error"),
    );
  }
  if (args.includes("--suite") && suiteName === undefined) {
    return vresult(vtext("Error: --suite needs a suite name", "error"));
  }
  if (!fileExists(".vally.yaml")) {
    return vresult(
      vtext("Error: .vally.yaml not found — create it from the step card first.", "error"),
    );
  }
  if (!fileExists(VALLY_GRADER_FILE)) {
    return vresult(
      vtext(
        `Error: ${VALLY_GRADER_FILE} not found — create the grader from the first step first.`,
        "error",
      ),
    );
  }

  let specPaths: string[];
  let filter: Record<string, string> = {};
  if (suiteName !== undefined) {
    const suite = readSuite(suiteName);
    if (typeof suite === "string") return vresult(vtext(`Error: ${suite}`, "error"));
    specPaths = suite.evals.flatMap(expandEvalGlob);
    filter = suite.filter;
    if (specPaths.length === 0) {
      return vresult(
        vtext(`Error: suite '${suiteName}' matched no eval files`, "error"),
      );
    }
  } else {
    specPaths = [specFlag ?? VALLY_DEFAULT_SPEC];
    if (!fileExists(specPaths[0] ?? "")) {
      return vresult(
        vtext(`Error: --eval-spec path does not exist: ${specPaths[0] ?? ""}`, "error"),
      );
    }
  }

  const model = modelParamOf();
  const graderCode = readWorkspaceFile(VALLY_GRADER_FILE);
  const specs = specPaths.map((p) => parseVallyEval(p, readWorkspaceFile(p)));
  const blocks: TermBlock[] = [];
  const records: unknown[] = [];
  const perEval: { spec: VallyEval; graded: GradedStimulus[] }[] = [];
  let loaded = 0;

  for (const spec of specs) {
    const selected = spec.stimuli.filter((s) =>
      Object.entries(filter).every(([key, value]) => s.tags[key] === value),
    );
    loaded += spec.stimuli.length;
    if (selected.length === 0) continue;
    const items = selected.map((stimulus) => ({
      stimulus,
      trajectory: buildTrajectory(
        stimulus,
        stimulus.graders[0]?.config ?? {},
        model,
        spec.name,
      ),
    }));
    const outcome = gradeStimuli(spec, items, graderCode);
    if (!outcome.ok) return vresult(...outcome.blocks);
    perEval.push({ spec, graded: outcome.graded });
    if (selected.length < spec.stimuli.length) {
      blocks.push(
        vtext(
          `  WARN ${spec.name} · stimuli-filtered  Running ${selected.length} of ${spec.stimuli.length} stimuli (${spec.stimuli.length - selected.length} filtered by tags)`,
          "dim",
        ),
      );
    }
  }
  if (perEval.length === 0) {
    return vresult(vtext("Error: no stimuli matched the suite filter", "error"));
  }

  const ran = perEval.reduce((n, e) => n + e.graded.length, 0);
  blocks.unshift(
    vtext(
      perEval.length === 1 && specs.length === 1
        ? `Loaded ${ran} stimul${ran === 1 ? "us" : "i"} from ${perEval[0]?.spec.name ?? ""}`
        : `Loaded ${loaded} stimuli from ${specs.length} evals`,
      "dim",
    ),
  );
  const failedEvals: typeof perEval = [];
  for (const { spec, graded } of perEval) {
    const failures = graded.filter((g) => !g.passed);
    if (failures.length > 0) failedEvals.push({ spec, graded });
    if (failures.length > 0) blocks.push(vtext(""), vtext(spec.name, "accent"));
    for (const g of failures) {
      const failedGraders = g.graders.filter((x) => !x.passed);
      blocks.push(
        vtext(
          `  FAIL  ${g.stimulus} · ${g.graders.length - failedGraders.length}/${g.graders.length} graders · 0.0s`,
          "error",
        ),
      );
      for (const x of failedGraders) {
        blocks.push(vtext(`   ✘ ${x.name}  ${x.evidence}`, "error"));
      }
      blocks.push(
        vtext(`   · score ${pct1(g.score)} < threshold ${pct1(g.threshold)} · trial 1`, "dim"),
        vtext(`   score: ${pct1(g.score)} · threshold: ${pct1(g.threshold)}`, "dim"),
      );
    }
    for (const g of graded) {
      records.push({
        type: "trial-result",
        runId: "run-lab27-sim-001",
        evalName: spec.name,
        evalFilePath: spec.path,
        variant: "main",
        stimulus: g.stimulus,
        status: "success",
        passed: g.passed,
        score: g.score,
        graderResult: g.graders,
        trajectory: g.trajectory,
      });
    }
  }
  blocks.push(vtext(""), vtext("─".repeat(56), "dim"), vtext(""));
  blocks.push(
    vtext(
      failedEvals.length > 0
        ? `Summary   ${failedEvals.length} failed · ${perEval.length} evals`
        : "Summary",
      failedEvals.length > 0 ? "error" : "accent",
    ),
  );
  for (const { spec, graded } of perEval) {
    const passedCount = graded.filter((g) => g.passed).length;
    const mean = graded.reduce((s, g) => s + g.score, 0) / graded.length;
    const ok = passedCount === graded.length;
    blocks.push(
      vtext(
        `  ${spec.name}  ${ok ? "✓" : "✘"} ${passedCount}/${graded.length} (score ${pctCompact(mean)} ${ok ? "≥" : "<"} ${pctCompact(spec.threshold)})`,
        ok ? "success" : "error",
      ),
    );
  }
  const allPassed = failedEvals.length === 0;
  records.push({
    type: "run-summary",
    runId: "run-lab27-sim-001",
    passed: allPassed,
    total: ran,
    failed: perEval.reduce(
      (n, e) => n + e.graded.filter((g) => !g.passed).length,
      0,
    ),
  });
  writeWorkspaceFile(
    VALLY_RESULTS_FILE,
    `${records.map((r) => JSON.stringify(r)).join("\n")}\n`,
  );
  blocks.push(vtext(""), vtext(`Saved  ./${VALLY_RUN_DIR}/`, "dim"));
  return vresult(...blocks);
}

// ---- vally grade

function vallyGrade(args: string[]): TermResult {
  const specPath = flagValue(args, "-e", "--eval-spec") ?? VALLY_DEFAULT_SPEC;
  const lt = args.indexOf("<");
  const redirected =
    lt !== -1
      ? args[lt + 1]
      : args.find((a) => a.startsWith("<") && a.length > 1)?.slice(1);
  const resultsPath = redirected ?? VALLY_RESULTS_FILE;

  if (!fileExists(specPath)) {
    return vresult(
      vtext(`Error: --eval-spec path does not exist: ${specPath}`, "error"),
    );
  }
  if (!fileExists(VALLY_GRADER_FILE)) {
    return vresult(
      vtext(
        `Error: ${VALLY_GRADER_FILE} not found — create the grader from the first step first.`,
        "error",
      ),
    );
  }
  if (!fileExists(resultsPath)) {
    return vresult(
      vtext(
        `Error: ${resultsPath} not found — run \`vally eval --suite pr-gate\` first to write it.`,
        "error",
      ),
    );
  }

  const spec = parseVallyEval(specPath, readWorkspaceFile(specPath));
  const trials = readWorkspaceFile(resultsPath)
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .flatMap((l): { stimulus: string; trajectory: unknown }[] => {
      try {
        const r = JSON.parse(l) as {
          type?: string;
          stimulus?: unknown;
          trajectory?: { stimulus?: { name?: string } };
        };
        if (r.type !== "trial-result" || r.trajectory === undefined) return [];
        const name =
          typeof r.stimulus === "string" ? r.stimulus : r.trajectory.stimulus?.name;
        return name === undefined ? [] : [{ stimulus: name, trajectory: r.trajectory }];
      } catch {
        return [];
      }
    });
  if (trials.length === 0) {
    return vresult(vtext(`Error: no trial-result records in ${resultsPath}`, "error"));
  }

  const blocks: TermBlock[] = [];
  if (args.includes("--workspace") && trials.length > 1) {
    blocks.push(
      vtext(
        `Warning: --workspace applied to all ${trials.length} input trajectories; each is graded against the same value. Pass a single trajectory for offline re-grade.`,
        "dim",
      ),
    );
  }
  const matched: { stimulus: VallyStimulus; trajectory: unknown }[] = [];
  const unmatched: string[] = [];
  for (const t of trials) {
    const stimulus = spec.stimuli.find((s) => s.name === t.stimulus);
    if (stimulus) matched.push({ stimulus, trajectory: t.trajectory });
    else unmatched.push(t.stimulus);
  }
  const outcome = gradeStimuli(spec, matched, readWorkspaceFile(VALLY_GRADER_FILE));
  if (!outcome.ok) return vresult(...outcome.blocks);
  for (const g of outcome.graded) {
    const failed = g.graders.filter((x) => !x.passed);
    blocks.push(vtext(""), vtext(`━━━ ${g.stimulus} ━━━`, "accent"));
    if (g.passed) {
      blocks.push(
        vtext(`✅ ${g.stimulus} (${g.graders.length}/${g.graders.length} graders passed)`, "success"),
        vtext(""),
        vtext(`Score: ${pct1(g.score)} | PASSED (threshold: ${pct1(g.threshold)})`, "success"),
      );
    } else {
      blocks.push(
        vtext(
          `❌ ${g.stimulus} (${g.graders.length - failed.length}/${g.graders.length} graders passed, ${failed.length} failed)`,
          "error",
        ),
      );
      for (const x of failed) blocks.push(vtext(`  ✗ [${x.name}] ${x.evidence}`, "error"));
      blocks.push(
        vtext(""),
        vtext(`Score: ${pct1(g.score)} | FAILED (threshold: ${pct1(g.threshold)})`, "error"),
      );
    }
  }
  for (const name of unmatched) {
    blocks.push(
      vtext(`Warning: no stimulus named '${name}' in ${specPath}; its trajectory was skipped.`, "dim"),
    );
  }
  return vresult(...blocks);
}

function vallyCommand(args: string[]): TermResult {
  const sub = args[0];
  if (sub === "--version" || sub === "-V" || sub === "version") {
    return vresult(
      vtext(`${VALLY_VERSION} (simulated — @microsoft/vally-cli)`, "normal"),
    );
  }
  switch (sub) {
    case "lint":
      return vallyLint(args.slice(1));
    case "eval":
      return vallyEval(args.slice(1));
    case "grade":
      return vallyGrade(args.slice(1));
    default:
      return vresult(...vlines([VALLY_USAGE], "dim"));
  }
}
