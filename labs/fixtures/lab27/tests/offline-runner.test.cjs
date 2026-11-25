"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const FIXTURE = path.resolve(__dirname, "..");
const ROOT = path.resolve(FIXTURE, "../../..");
const WINDOWS = process.platform === "win32";
const EVALS = [
  "hermetic/reviewer-routing",
  "hermetic/skill-triggers",
  "guards/no-unapproved-push",
  "guards/secret-scan-guard",
];

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function seed(directory) {
  const fixture = path.join(directory, "labs/fixtures/lab27");
  fs.mkdirSync(fixture, { recursive: true });
  for (const name of [".vally.yaml", "scripts", "evals"]) {
    fs.cpSync(path.join(FIXTURE, name), path.join(fixture, name), {
      recursive: true,
      filter: (source) => path.basename(source) !== "eval.broken.yaml",
    });
  }
  copy(path.join(ROOT, "docs/_meta/registry.yaml"), path.join(directory, "docs/_meta/registry.yaml"));
  fs.mkdirSync(path.join(directory, ".github/skills"), { recursive: true });
  fs.mkdirSync(path.join(directory, ".github/agents"), { recursive: true });
  for (const name of EVALS) {
    const relative = `evals/${name}/eval.yaml`;
    const original = path.join(FIXTURE, relative);
    const staged = path.join(fixture, relative);
    for (const match of fs.readFileSync(original, "utf8").matchAll(/^\s+-\s+(?:src:\s*)?"((?:\.\.\/)+[^"]+)"/gm)) {
      const source = path.resolve(path.dirname(original), match[1]);
      if (source.startsWith(FIXTURE + path.sep)) continue;
      copy(source, path.resolve(path.dirname(staged), match[1]));
    }
  }
  return fixture;
}

function writeVally(bin) {
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, "fake.cjs"), [
    'const fs = require("node:fs");',
    "const args = process.argv.slice(2);",
    'const stdin = args[0] === "grade" ? fs.readFileSync(0, "utf8") : "";',
    "fs.appendFileSync(process.env.TEST_CALLS, JSON.stringify({",
    "  args, optout: process.env.VALLY_TELEMETRY_OPTOUT,",
    "  records: stdin.trim() ? stdin.trim().split(/\\r?\\n/).length : 0, cwd: process.cwd(),",
    '}) + "\\n");',
    'if (args[0] === "--version") console.log(process.env.TEST_VERSION);',
  ].join("\n"));
  const shell = path.join(bin, "vally");
  fs.writeFileSync(shell, '#!/usr/bin/env bash\nexec node "$(dirname "$0")/fake.cjs" "$@"\n');
  fs.chmodSync(shell, 0o755);
  fs.writeFileSync(path.join(bin, "vally.cmd"), '@echo off\r\nnode "%~dp0fake.cjs" %*\r\nexit /b %ERRORLEVEL%\r\n');
}

test("offline runners separate Tier 0 from free Tier 1 and never execute agents", { timeout: 120000 }, () => {
  // Arrange: independent files, Node executable, PATH and CLI invocation journal.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lab27-offline-runner-"));
  try {
    const fixture = seed(directory);
    const runtime = path.join(directory, "runtime");
    fs.mkdirSync(runtime);
    copy(process.execPath, path.join(runtime, WINDOWS ? "node.exe" : "node"));
    if (!WINDOWS) fs.chmodSync(path.join(runtime, "node"), 0o755);
    const pin = fs.readFileSync(path.join(ROOT, "docs/_meta/registry.yaml"), "utf8").match(/^vally_cli_version:\s*"([^"]+)"/m)[1];
    const system = process.env.SystemRoot;
    const git = WINDOWS ? spawnSync("where.exe", ["git"], { encoding: "utf8" }).stdout.trim().split(/\r?\n/)
      .flatMap(executable => [path.resolve(executable, "../.."), path.resolve(executable, "../../..")])
      .find(directory => fs.existsSync(path.join(directory, "bin/bash.exe")) && fs.existsSync(path.join(directory, "usr/bin"))) : "";
    if (WINDOWS) assert.ok(git, "Git for Windows with Bash is required to exercise both runners");
    const bash = WINDOWS ? path.join(git, "bin/bash.exe") : "/bin/bash";
    const shells = WINDOWS ? ["bash", "powershell"] : ["bash"];

    for (const shell of shells) {
      for (const mode of ["missing", "mismatched", "pinned"]) {
        const caseDir = path.join(directory, `${shell}-${mode}`);
        const bin = path.join(caseDir, "bin");
        const temp = path.join(caseDir, "tmp");
        fs.mkdirSync(temp, { recursive: true });
        if (mode !== "missing") writeVally(bin);
        const callsFile = path.join(caseDir, "calls.jsonl");
        const env = {
          ...process.env,
          TEMP: temp, TMP: temp, TMPDIR: temp,
          TEST_CALLS: callsFile, TEST_VERSION: mode === "pinned" ? pin : "0.0.1",
        };
        for (const key of Object.keys(env)) if (key.toUpperCase() === "PATH") delete env[key];
        env[WINDOWS ? "Path" : "PATH"] = [
          bin, runtime,
          ...(WINDOWS ? [path.join(git, "usr/bin"), path.join(git, "bin"), path.join(system, "System32"), system] : ["/usr/bin", "/bin"]),
        ].join(path.delimiter);
        delete env.VALLY_TELEMETRY_OPTOUT;

        // Act: run the real script, using a CLI double only at its process boundary.
        const run = shell === "bash"
          ? spawnSync(bash, ["--noprofile", "--norc", "scripts/tier0.sh"], { cwd: fixture, env, encoding: "utf8", timeout: 30000 })
          : spawnSync(path.join(system, "System32/WindowsPowerShell/v1.0/powershell.exe"),
            ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/tier0.ps1"], { cwd: fixture, env, encoding: "utf8", timeout: 30000 });
        const label = `${shell}, ${mode}: ${run.stdout}\n${run.stderr}\n${run.error || ""}`;

        // Assert effects: exact child invocations, input records and absence of run output.
        assert.equal(run.status, 0, label);
        assert.match(run.stdout, /Tier 1 \(free\), step 3 of 3/, label);
        assert.match(run.stdout, /self-check: 5\/5 checks passed/, label);
        assert.match(run.stdout, /Total root-only AIU: 2\.93 AIU \| Budget status: PASS/, label);
        assert.equal(run.stdout.trimEnd().split(/\r?\n/).at(-1), "tier0: OK (0 model calls, 0 AIU)", label);
        assert.equal(fs.existsSync(path.join(fixture, "vally-results")), false, label);
        const calls = fs.existsSync(callsFile)
          ? fs.readFileSync(callsFile, "utf8").trim().split(/\r?\n/).map(JSON.parse) : [];
        if (mode === "missing") {
          assert.match(run.stdout, /SKIP: vally is not on PATH/, label);
          assert.deepEqual(calls, [], label);
        } else if (mode === "mismatched") {
          assert.match(run.stdout, /SKIP: the vally on PATH reports '0\.0\.1'/, label);
          assert.deepEqual(calls.map(call => call.args), [["--version"]], label);
        } else {
          assert.deepEqual(calls.map(call => call.args), [
            ["--version"],
            ...EVALS.map(name => ["lint", "-e", `evals/${name}/eval.yaml`, "--strict"]),
            ["grade", "--eval-spec", "evals/hermetic/reviewer-routing/eval.yaml", "--workspace", ".", "--require-pass"],
          ], label);
          assert.equal(calls.at(-1).records, 4, label);
          assert.ok(calls.every(call => call.optout === "1" && path.resolve(call.cwd) === path.resolve(fixture)), label);
        }
      }
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
