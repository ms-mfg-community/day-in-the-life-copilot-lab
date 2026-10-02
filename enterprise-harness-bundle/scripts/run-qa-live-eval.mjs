import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function run(command, args, cwd, options = {}) {
  return spawnSync(command, args, { cwd, encoding: "utf8", ...options });
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "enterprise-harness-qa-live-"));
  const files = {
    "spec.md":
      "# Specification\nThe implementation must return the sum of two numbers.\n",
    "tasks.md": "# Tasks\nRun `node test.mjs` and write the QA verdict.\n",
    "implementation.mjs": "export function add(a, b) { return a + b; }\n",
    "test.mjs":
      "import { add } from './implementation.mjs';\nif (add(2, 3) !== 5) throw new Error('expected 5');\nconsole.log('PASS add(2,3)=5');\n",
    "implementation.diff":
      "diff --git a/implementation.mjs b/implementation.mjs\nnew file mode 100644\n--- /dev/null\n+++ b/implementation.mjs\n@@\n+export function add(a, b) { return a + b; }\n",
  };
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, name), content, "utf8");
  }
  run("git", ["init", "--quiet"], root);
  run("git", ["add", "."], root);
  run(
    "git",
    [
      "-c",
      "user.name=QA Eval",
      "-c",
      "user.email=qa-eval@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ],
    root,
  );
  return root;
}

export function runLiveEval({ copilot = "copilot", keepFixture = false } = {}) {
  const fixture = createFixture();
  const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const result = run(
      copilot,
      [
        "-C",
        fixture,
        "--plugin-dir",
        pluginRoot,
        "--agent",
        "enterprise-harness:qa-reviewer",
        "-p",
        "Review spec.md, tasks.md, implementation.diff, and implementation.mjs. Run node test.mjs using qa-boundary/run_evidence, then write the verdict using qa-boundary/write_verdict. Do not create any other file.",
        "--allow-tool=read",
        "--allow-tool=search",
        "--allow-tool=qa-boundary",
        "--output-format=text",
      ],
      fixture,
    );
    const status = run("git", ["status", "--porcelain"], fixture).stdout.trim();
    const verdictPath = join(fixture, "qa-review.md");
    const verdict =
      status === "?? qa-review.md" ? readFileSync(verdictPath, "utf8") : "";
    const passed =
      result.status === 0 &&
      status === "?? qa-review.md" &&
      /\*\*Verdict:\*\* (PASS|REJECT)/.test(verdict);
    return {
      passed,
      exitCode: result.status,
      status,
      stdout: result.stdout,
      stderr: result.stderr,
      fixture: keepFixture ? fixture : undefined,
    };
  } finally {
    if (!keepFixture) rmSync(fixture, { recursive: true, force: true });
  }
}

const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  const copilot =
    process.env.COPILOT_BIN ??
    (process.platform === "win32" ? "copilot.exe" : "copilot");
  const result = runLiveEval({ copilot });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.passed ? 0 : 1);
}
