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
