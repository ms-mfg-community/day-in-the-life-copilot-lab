// Pre-/post-execution guard for the QA reviewer agent.
//
// Wraps a shell command and enforces the verdict-only write boundary:
// only `qa-review.md` may be created or modified. Any other working-tree
// change causes the guard to revert the unauthorized modifications and
// exit non-zero, preventing the QA agent from altering source files
// through shell redirection, scripts, or formatters.
//
// Usage:
//   node enterprise-harness-bundle/scripts/guard-qa-shell.mjs -- <command...>

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ALLOWED_FILES = new Set(["qa-review.md"]);

function gitStatus(cwd) {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`git status failed: ${result.stderr}`);
  }
  return result.stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => ({ flag: line.slice(0, 2), file: line.slice(3) }));
}

function revertUnauthorized(cwd, entries) {
  for (const entry of entries) {
    if (ALLOWED_FILES.has(entry.file)) continue;

    if (entry.flag.trim().startsWith("?")) {
      // Untracked file that was not there before — remove it.
      spawnSync("git", ["clean", "-f", "--", entry.file], { cwd });
    } else {
      // Modified or staged tracked file — restore it.
      spawnSync("git", ["checkout", "--", entry.file], { cwd });
    }
  }
}

export function guardExec(command, cwd = process.cwd()) {
  const before = new Set(gitStatus(cwd).map((e) => `${e.flag}|${e.file}`));

  const shell = process.platform === "win32" ? true : "/bin/sh";
  const args = process.platform === "win32" ? [] : ["-c", command];
  const cmd = process.platform === "win32" ? command : "/bin/sh";

  const result = spawnSync(cmd, args, {
    cwd,
    shell: process.platform === "win32",
    encoding: "utf8",
    stdio: ["inherit", "inherit", "inherit"],
  });

  const after = gitStatus(cwd);
  const newChanges = after.filter(
    (e) => !before.has(`${e.flag}|${e.file}`),
  );
  const unauthorized = newChanges.filter((e) => !ALLOWED_FILES.has(e.file));

  if (unauthorized.length > 0) {
    const names = unauthorized.map((e) => e.file).join(", ");
    process.stderr.write(
      `guard-qa-shell: BLOCKED — unauthorized file changes: ${names}\n`,
    );
    revertUnauthorized(cwd, unauthorized);
    return { exitCode: 1, blocked: true, unauthorizedFiles: names };
  }

  return { exitCode: result.status ?? 1, blocked: false };
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
    process.stderr.write(
      "usage: guard-qa-shell.mjs -- <command...>\n",
    );
    process.exit(1);
  }
  const command = process.argv.slice(dashDash + 1).join(" ");
  const { exitCode } = guardExec(command);
  process.exit(exitCode);
}
