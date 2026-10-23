import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const TEMPLATE_DIR = resolve(here, "..", "template");
export const SANDBOX_ROOT = resolve(here, "..", "..", ".sandbox");
export const SANDBOX_DIR = join(SANDBOX_ROOT, "workspace");

export interface TreeNode {
  name: string;
  path: string;
  kind: "file" | "dir";
  children?: TreeNode[];
}

/** Resolve a workspace-relative path, refusing anything that escapes the sandbox. */
export function safePath(relPath: string): string {
  const abs = resolve(SANDBOX_DIR, relPath);
  if (abs !== SANDBOX_DIR && !abs.startsWith(SANDBOX_DIR + sep)) {
    throw new Error(`Path escapes the lab workspace: ${relPath}`);
  }
  return abs;
}

export function resetSandbox(): void {
  rmSync(SANDBOX_DIR, { recursive: true, force: true });
  mkdirSync(SANDBOX_ROOT, { recursive: true });
  cpSync(TEMPLATE_DIR, SANDBOX_DIR, { recursive: true });
}

export function ensureSandbox(): void {
  if (!existsSync(SANDBOX_DIR)) resetSandbox();
}

export function readTree(relPath = "."): TreeNode[] {
  const abs = safePath(relPath);
  const entries = readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.name !== "node_modules" && e.name !== ".DS_Store")
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  return entries.map((e) => {
    const childRel = relative(SANDBOX_DIR, join(abs, e.name));
    if (e.isDirectory()) {
      return {
        name: e.name,
        path: childRel,
        kind: "dir" as const,
        children: readTree(childRel),
      };
    }
    return { name: e.name, path: childRel, kind: "file" as const };
  });
}

export function readWorkspaceFile(relPath: string): string {
  return readFileSync(safePath(relPath), "utf8");
}

export function fileExists(relPath: string): boolean {
  try {
    return statSync(safePath(relPath)).isFile();
  } catch {
    return false;
  }
}

export function writeWorkspaceFile(relPath: string, content: string): void {
  const abs = safePath(relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

/** Parse the sandbox's .copilot/mcp-config.json into SDK session mcpServers. */
export function readMcpConfig(): Record<string, unknown> {
  if (!fileExists(".copilot/mcp-config.json")) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(readWorkspaceFile(".copilot/mcp-config.json"));
  } catch (error) {
    throw new Error(
      `.copilot/mcp-config.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const servers =
    (parsed as { mcpServers?: Record<string, Record<string, unknown>> })
      .mcpServers ?? {};
  const out: Record<string, unknown> = {};
  for (const [name, config] of Object.entries(servers)) {
    const normalized: Record<string, unknown> = { ...config };
    // Relative script paths in args resolve against the sandbox workspace, so
    // entries like "./.copilot/mcp/lab-docs.mjs" work regardless of runtime cwd.
    if (Array.isArray(normalized.args)) {
      normalized.args = normalized.args.map((arg: unknown) =>
        typeof arg === "string" &&
        (arg.startsWith("./") || arg.startsWith("../"))
          ? safePath(arg)
          : arg,
      );
    }
    out[name] = normalized;
  }
  return out;
}

/** Simple YAML-frontmatter splitter for .agent.md / SKILL.md / *.instructions.md files. */
export function parseFrontmatter(content: string): {
  data: Record<string, string>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  if (!match) return { data: {}, body: content };
  const data: Record<string, string> = {};
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(line);
    if (kv && kv[1] !== undefined && kv[2] !== undefined) {
      data[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
    }
  }
  return { data, body: match[2] ?? "" };
}

export interface InstructionSource {
  path: string;
  scope: string;
  exists: boolean;
}

/** The instruction sources Copilot CLI would discover in this workspace. */
export function scanInstructionSources(): InstructionSource[] {
  const sources: InstructionSource[] = [
    {
      path: ".github/copilot-instructions.md",
      scope: "whole repository — always loaded",
      exists: fileExists(".github/copilot-instructions.md"),
    },
    {
      path: "AGENTS.md",
      scope: "whole repository — always loaded",
      exists: fileExists("AGENTS.md"),
    },
  ];
  const dir = safePath(".github/instructions");
  if (existsSync(dir)) {
    for (const entry of readdirSync(dir).sort()) {
      if (!entry.endsWith(".instructions.md")) continue;
      const rel = `.github/instructions/${entry}`;
      const { data } = parseFrontmatter(readWorkspaceFile(rel));
      sources.push({
        path: rel,
        scope: `files matching ${data.applyTo ?? "(no applyTo glob)"}`,
        exists: true,
      });
    }
  }
  return sources;
}

export function scanAgentFiles(): {
  name: string;
  description: string;
  tools: string;
  path: string;
}[] {
  const dir = safePath(".github/agents");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".agent.md"))
    .sort()
    .map((f) => {
      const rel = `.github/agents/${f}`;
      const { data } = parseFrontmatter(readWorkspaceFile(rel));
      return {
        name: data.name ?? f.replace(/\.agent\.md$/, ""),
        description: data.description ?? "",
        tools: data.tools ?? "",
        path: rel,
      };
    });
}
