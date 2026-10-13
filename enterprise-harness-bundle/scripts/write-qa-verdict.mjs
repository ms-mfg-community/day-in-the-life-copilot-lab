import {
  existsSync,
  lstatSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const OUTPUT_FILE = "qa-review.md";
const VALID_STATUSES = new Set(["pass", "reject"]);

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function loadManifest() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const manifestPath = join(scriptDir, "..", "manifest.yaml");
  try {
    const raw = readFileSync(manifestPath, "utf8");
    // Simple YAML parse for name/version without external dependency.
    const nameMatch = raw.match(/^name:\s*(.+)$/m);
    const versionMatch = raw.match(/^version:\s*(.+)$/m);
    return {
      version: versionMatch ? versionMatch[1].trim() : "unknown",
      name: nameMatch ? nameMatch[1].trim() : "unknown",
    };
  } catch {
    return { version: "unknown", name: "unknown" };
  }
}

export function renderVerdict(input) {
  const status = requireString(input?.status, "status").toLowerCase();
  if (!VALID_STATUSES.has(status)) {
    throw new Error('status must be "pass" or "reject"');
  }

  const summary = requireString(input?.summary, "summary");
  const findings = Array.isArray(input?.findings) ? input.findings : [];
  const manifest = loadManifest();
  const lines = [
    "# QA Review",
    "",
    `**Verdict:** ${status.toUpperCase()}`,
    "",
    `**Bundle:** ${manifest.name} v${manifest.version}`,
    `**Agent:** qa-reviewer`,
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Findings",
    "",
  ];

  if (findings.length === 0) {
    lines.push("- None.");
  } else {
    for (const finding of findings) {
      lines.push(`- ${requireString(finding, "finding")}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

// A `.git` directory counts only if it holds HEAD; a `.git` file (worktrees,
// submodules) only if it points somewhere with `gitdir:`.
function isGitEntry(path) {
  try {
    return statSync(path).isDirectory()
      ? existsSync(join(path, "HEAD"))
      : readFileSync(path, "utf8").startsWith("gitdir:");
  } catch {
    return false;
  }
}

// The verdict belongs at the repository root even when the session started in
// a subdirectory. Walk up to the nearest `.git` entry rather than run `git`,
// which could resolve to an executable in the tree under review. Outside a
// repository, stay in the working directory.
export function verdictDirectory(cwd) {
  const start = resolve(cwd);
  const findRoot = (dir) => {
    if (isGitEntry(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    return parent === dir ? start : findRoot(parent);
  };
  return findRoot(start);
}

function existingEntry(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

// Writing through a symlink or a hard link would change another file, so an
// existing qa-review.md must be a plain file with a single link.
export function writeVerdictData(input, cwd = process.cwd()) {
  const outputPath = resolve(verdictDirectory(cwd), OUTPUT_FILE);
  const content = renderVerdict(input);
  const existing = existingEntry(outputPath);
  if (existing && (!existing.isFile() || existing.nlink > 1)) {
    throw new Error(
      `${OUTPUT_FILE} is a link or not a regular file; refusing to write through it`,
    );
  }
  writeFileSync(outputPath, content, "utf8");
  return outputPath;
}

export function writeVerdict(inputPath, cwd = process.cwd()) {
  const input = JSON.parse(readFileSync(resolve(cwd, inputPath), "utf8"));
  return writeVerdictData(input, cwd);
}

function main(argv) {
  const inputIndex = argv.indexOf("--input");
  const inputPath = inputIndex >= 0 ? argv[inputIndex + 1] : undefined;
  if (!inputPath) {
    throw new Error("usage: write-qa-verdict.mjs --input <verdict.json>");
  }
  const outputPath = writeVerdict(inputPath);
  process.stdout.write(`wrote ${outputPath}\n`);
}

const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`write-qa-verdict: ${error.message}\n`);
    process.exit(1);
  }
}
