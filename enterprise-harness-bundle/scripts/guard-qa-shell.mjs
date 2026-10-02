// Verdict-only command guard used by the QA agent's scoped MCP server.

import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_FILES = new Set(["qa-review.md"]);

function listWorkspaceFiles(cwd) {
  const result = spawnSync(
    "git",
    ["ls-files", "-co", "--exclude-standard", "-z"],
    { cwd, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr}`);
  }
  return result.stdout.split("\0").filter(Boolean);
}

function snapshotWorkspace(cwd) {
  return new Map(
    listWorkspaceFiles(cwd).map((file) => {
      const path = resolve(cwd, file);
      const stat = lstatSync(path);
      return [file, { content: readFileSync(path), mode: stat.mode }];
    }),
  );
}

function changedFiles(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((file) => {
    const previous = before.get(file);
    const current = after.get(file);
    if (!previous || !current) return true;
    return (
      !previous.content.equals(current.content) ||
      previous.mode !== current.mode
    );
  });
}

function restoreFiles(cwd, before, files) {
  for (const file of files) {
    const path = resolve(cwd, file);
    const previous = before.get(file);
    if (!previous) {
      rmSync(path, { recursive: true, force: true });
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, previous.content);
    chmodSync(path, previous.mode);
  }
}

export function guardExec(command, cwd = process.cwd()) {
  if (typeof command !== "string" || command.trim().length === 0) {
    throw new Error("command must be a non-empty string");
  }

  const before = snapshotWorkspace(cwd);
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
  });
  const after = snapshotWorkspace(cwd);
  const unauthorized = changedFiles(before, after).filter(
    (file) => !ALLOWED_FILES.has(file),
  );

  if (unauthorized.length > 0) {
    restoreFiles(cwd, before, unauthorized);
    return {
      exitCode: 1,
      blocked: true,
      unauthorizedFiles: unauthorized,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  return {
    exitCode: result.status ?? 1,
    blocked: false,
    unauthorizedFiles: [],
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  const dashDash = process.argv.indexOf("--");
  if (dashDash < 0 || dashDash + 1 >= process.argv.length) {
    process.stderr.write("usage: guard-qa-shell.mjs -- <command...>\n");
    process.exit(1);
  }
  const result = guardExec(process.argv.slice(dashDash + 1).join(" "));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.blocked) {
    process.stderr.write(
      `guard-qa-shell: BLOCKED unauthorized file changes: ${result.unauthorizedFiles.join(", ")}\n`,
    );
  }
  process.exit(result.exitCode);
}
