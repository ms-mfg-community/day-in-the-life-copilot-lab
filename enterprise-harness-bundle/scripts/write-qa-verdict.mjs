import {
  existsSync,
  lstatSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  resolve,
  join,
  dirname,
  isAbsolute,
  relative,
  sep,
} from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const OUTPUT_FILE = "qa-review.md";
const VALID_STATUSES = new Set(["approve", "reject"]);
const VALID_CLASSIFICATIONS = new Set(["implementation", "spec-scope"]);
const VALID_CRITERION_RESULTS = new Set([
  "met",
  "partial",
  "unmet",
  "unverified",
]);

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function nonNegativeInt(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("counts values must be non-negative integers");
  }
  return value;
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

export function renderVerdict(input, { featureDir = "." } = {}) {
  const status = requireString(input?.status, "status").toLowerCase();
  if (!VALID_STATUSES.has(status)) {
    throw new Error('status must be "approve" or "reject"');
  }

  let classification;
  if (status === "reject") {
    if (input?.classification === undefined || input?.classification === null) {
      throw new Error(
        'classification ("implementation" or "spec-scope") is required when status is "reject"',
      );
    }
    classification = requireString(
      input.classification,
      "classification",
    ).toLowerCase();
    if (!VALID_CLASSIFICATIONS.has(classification)) {
      throw new Error('classification must be "implementation" or "spec-scope"');
    }
  } else if (
    input?.classification !== undefined &&
    input?.classification !== null
  ) {
    throw new Error('classification is only valid when status is "reject"');
  }

  const summary = requireString(input?.summary, "summary");
  const findings = Array.isArray(input?.findings) ? input.findings : [];
  const reviewed =
    typeof input?.reviewed === "string" && input.reviewed.trim() !== ""
      ? input.reviewed.trim()
      : new Date().toISOString().slice(0, 10);
  const criteria = Array.isArray(input?.criteria) ? input.criteria : [];
  const normalizedCriteria = criteria.map((c) => {
    const crit = requireString(c?.criterion, "criterion").replace(/\|/g, "\\|");
    const res = requireString(c?.result, "result").toLowerCase();
    if (!VALID_CRITERION_RESULTS.has(res)) {
      throw new Error(
        'criterion result must be "met", "partial", "unmet", or "unverified"',
      );
    }
    const ev = requireString(c?.evidence, "evidence").replace(/\|/g, "\\|");
    return { criterion: crit, result: res, evidence: ev };
  });
  const derivedCounts = {
    met: normalizedCriteria.filter((c) => c.result === "met").length,
    partial: normalizedCriteria.filter((c) => c.result === "partial").length,
    unmet: normalizedCriteria.filter((c) => c.result === "unmet").length,
    unverified: normalizedCriteria.filter((c) => c.result === "unverified")
      .length,
  };
  const counts = {
    met: nonNegativeInt(input?.counts?.met, derivedCounts.met),
    partial: nonNegativeInt(input?.counts?.partial, derivedCounts.partial),
    unmet: nonNegativeInt(input?.counts?.unmet, derivedCounts.unmet),
    unverified: nonNegativeInt(
      input?.counts?.unverified,
      derivedCounts.unverified,
    ),
  };
  if (
    status === "approve" &&
    (counts.unmet > 0 ||
      counts.unverified > 0 ||
      normalizedCriteria.some(
        (c) => c.result === "unmet" || c.result === "unverified",
      ))
  ) {
    throw new Error(
      'status cannot be "approve" when unmet or unverified criteria are present',
    );
  }
  const tasks = Array.isArray(input?.tasks) ? input.tasks : [];
  const manifest = loadManifest();
  const lines = [
    "# QA Review",
    "",
    `**Feature directory:** \`${featureDir}\``,
    `**Reviewed:** ${reviewed}`,
    `**Reviewer:** qa-reviewer (${manifest.name} v${manifest.version})`,
    `**Bundle:** ${manifest.name} v${manifest.version}`,
    `**Agent:** qa-reviewer`,
    `**Verdict:** ${status}`,
    ...(classification ? [`**Classification:** ${classification}`] : []),
    "",
    "## Verdict",
    "",
    `**${status}**`,
    "",
    "| Result | Count |",
    "|---|---|",
    `| Met | ${counts.met} |`,
    `| Partial | ${counts.partial} |`,
    `| Unmet | ${counts.unmet} |`,
    `| Unverified | ${counts.unverified} |`,
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Acceptance criteria",
    "",
    "| # | Criterion (from `spec.md`) | Result | Evidence |",
    "|---|---|---|---|",
  ];

  if (normalizedCriteria.length === 0) {
    lines.push("| - | (not itemized in call; see Summary) | - | - |");
  } else {
    normalizedCriteria.forEach((c, idx) => {
      lines.push(`| ${idx + 1} | ${c.criterion} | ${c.result} | ${c.evidence} |`);
    });
  }

  lines.push(
    "",
    "## Task list check",
    "",
    "| Task ID | Marked | Evidence found | Note |",
    "|---|---|---|---|",
  );
  if (tasks.length === 0) {
    lines.push("| - | (not itemized in call; see Summary) | - | - |");
  } else {
    for (const t of tasks) {
      const id = requireString(t?.id, "task.id").replace(/\|/g, "\\|");
      const marked = requireString(t?.marked ?? "complete", "task.marked").replace(
        /\|/g,
        "\\|",
      );
      const ev = t?.evidenceFound ? "yes" : "**no**";
      const note = requireString(t?.note ?? "-", "task.note").replace(/\|/g, "\\|");
      lines.push(`| ${id} | ${marked} | ${ev} | ${note} |`);
    }
  }

  lines.push("", "## Findings", "");

  if (findings.length === 0) {
    lines.push("- None.");
  } else {
    for (const finding of findings) {
      lines.push(`- ${requireString(finding, "finding")}`);
    }
  }

  if (status === "reject") {
    const VALID_RETURNS_TO = new Set([
      "epic",
      "specify",
      "plan",
      "tasks",
      "implement",
    ]);
    let returnsTo =
      classification === "spec-scope" ? "specify" : "implement";
    if (input?.returnsTo !== undefined && input?.returnsTo !== null) {
      returnsTo = requireString(input.returnsTo, "returnsTo").toLowerCase();
      if (!VALID_RETURNS_TO.has(returnsTo)) {
        throw new Error(
          'returnsTo must be one of "epic", "specify", "plan", "tasks", or "implement"',
        );
      }
    }
    const whatChanges =
      typeof input?.whatChanges === "string" && input.whatChanges.trim() !== ""
        ? input.whatChanges.trim()
        : classification === "spec-scope"
          ? "Update spec.md / plan.md and obtain review-spec / review-plan approval before resuming."
          : "Add a superseding rework task in tasks.md and fix the implementation under review.";
    const rerunNeeded =
      typeof input?.rerunNeeded === "string" && input.rerunNeeded.trim() !== ""
        ? input.rerunNeeded.trim()
        : "Re-run speckit.contoso-review.qa-review in a fresh session, then specify workflow resume <run-id>.";
    lines.push(
      "",
      "## Rework routing",
      "",
      `- **Classification:** ${classification}`,
      `- **Returns to:** ${returnsTo}`,
      `- **What changes:** ${whatChanges}`,
      `- **Re-run needed:** ${rerunNeeded}`,
    );
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

// The verdict belongs inside the repository even when the session started in
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

function defaultFeatureDirFromSpecify(repoRoot) {
  const envDir = process.env.SPECIFY_FEATURE_DIRECTORY;
  if (typeof envDir === "string" && envDir.trim() !== "") {
    const trimmed = envDir.trim();
    if (isAbsolute(trimmed)) {
      const rel = relative(repoRoot, resolve(trimmed));
      return rel === "" ? "." : rel;
    }
    return trimmed;
  }
  const specifyDir = existingEntry(join(repoRoot, ".specify"));
  if (!specifyDir || !specifyDir.isDirectory()) return ".";
  const featureJsonPath = join(repoRoot, ".specify", "feature.json");
  const entry = existingEntry(featureJsonPath);
  if (!entry || !entry.isFile() || entry.nlink > 1) return ".";
  try {
    const parsed = JSON.parse(readFileSync(featureJsonPath, "utf8"));
    if (
      typeof parsed?.feature_directory === "string" &&
      parsed.feature_directory.trim() !== ""
    ) {
      return parsed.feature_directory.trim();
    }
  } catch {
    // Ignore malformed .specify/feature.json and fall back to repo root.
  }
  return ".";
}

// Validates that `rawFeatureDir` resolves to an existing, non-symlinked
// directory inside `repoRoot` and never inside `.git`.
export function resolveFeatureDirectory(rawFeatureDir, cwd = process.cwd()) {
  const repoRoot = verdictDirectory(cwd);
  const candidate =
    rawFeatureDir !== undefined && rawFeatureDir !== null
      ? requireString(rawFeatureDir, "featureDir")
      : defaultFeatureDirFromSpecify(repoRoot);

  if (isAbsolute(candidate) || /^[a-zA-Z]:/.test(candidate)) {
    throw new Error("featureDir must be relative to the repository root");
  }

  const targetDir = resolve(repoRoot, candidate);
  const fromRoot = relative(repoRoot, targetDir);
  if (
    isAbsolute(fromRoot) ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`)
  ) {
    throw new Error(`featureDir escapes repository root: ${candidate}`);
  }

  if (fromRoot !== "") {
    const parts = fromRoot.split(sep).filter(Boolean);
    if (parts.some((p) => p.toLowerCase() === ".git")) {
      throw new Error(`featureDir may not target .git: ${candidate}`);
    }
    let current = repoRoot;
    for (const part of parts) {
      current = join(current, part);
      const stat = existingEntry(current);
      if (!stat) {
        throw new Error(`featureDir does not exist: ${candidate}`);
      }
      if (!stat.isDirectory()) {
        throw new Error(
          `featureDir must be a real directory inside the repository: ${candidate}`,
        );
      }
    }
  }

  return {
    repoRoot,
    targetDir,
    featureDir: fromRoot === "" ? "." : fromRoot.replace(/\\/g, "/"),
  };
}

// Writing through a symlink or a hard link would change another file, so an
// existing qa-review.md must be a plain file with a single link.
export function writeVerdictData(input, cwd = process.cwd()) {
  const { targetDir, featureDir } = resolveFeatureDirectory(
    input?.featureDir,
    cwd,
  );
  const outputPath = resolve(targetDir, OUTPUT_FILE);
  const content = renderVerdict(input, { featureDir });
  const existing = existingEntry(outputPath);
  if (existing && (!existing.isFile() || existing.nlink > 1)) {
    throw new Error(
      `${OUTPUT_FILE} is a link or not a regular file; refusing to write through it`,
    );
  }
  writeFileSync(outputPath, content, "utf8");
  return outputPath;
}

export function writeVerdict(
  inputPath,
  cwd = process.cwd(),
  featureDir = undefined,
) {
  const input = JSON.parse(readFileSync(resolve(cwd, inputPath), "utf8"));
  return writeVerdictData(
    featureDir !== undefined ? { ...input, featureDir } : input,
    cwd,
  );
}

function main(argv) {
  const inputIndex = argv.indexOf("--input");
  const inputPath = inputIndex >= 0 ? argv[inputIndex + 1] : undefined;
  const featureDirIndex = argv.indexOf("--feature-dir");
  const featureDir =
    featureDirIndex >= 0 ? argv[featureDirIndex + 1] : undefined;
  if (!inputPath) {
    throw new Error(
      "usage: write-qa-verdict.mjs --input <verdict.json> [--feature-dir <dir>]",
    );
  }
  const outputPath = writeVerdict(inputPath, process.cwd(), featureDir);
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
