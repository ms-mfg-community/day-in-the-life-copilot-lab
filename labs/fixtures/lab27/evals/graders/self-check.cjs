"use strict";

/*
 * self-check.cjs: the zero-model-cost test run for the Lab 27 fixtures.
 *
 *   node labs/fixtures/lab27/evals/graders/self-check.cjs
 *
 * Needs only Node. It makes no model call, uses no network and spends no AIU,
 * so it is the Tier 0 gate: run it on every edit. It runs five groups:
 *   1. lib.cjs                  the grader helper and its fail-safe output
 *   2. tool-calls-issued.cjs    the issued-call grader, as a function and as a Vally program
 *   3. pre-tool-guard.cjs       the staged preToolUse hook, run as a real child process
 *   4. guarded-commands.cjs     the guard grader, plus every path .vally.yaml and the evals name
 *   5. eval-cost.cjs + replay   AIU accounting and an offline replay of `vally grade` (Demo B)
 * and prints one line per group, then the verdict line the lab and the speaker
 * script quote. Exit code 0 only if all five pass.
 */

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const LAB27 = path.resolve(__dirname, "..", "..");
const GRADERS = __dirname;
const HOOK = path.join(LAB27, "evals", "guards", "hooks", "pre-tool-guard.cjs");
const RECORDED = path.join(LAB27, "evals", "fixtures", "recorded-results.jsonl");
const REVIEWER_ROUTING = path.join(LAB27, "evals", "hermetic", "reviewer-routing", "eval.yaml");

const lib = require("./lib.cjs");
const issued = require("./tool-calls-issued.cjs");
const guarded = require("./guarded-commands.cjs");
const cost = require("./eval-cost.cjs");

function withTempDir(fn) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lab27-self-check-"));
  try {
    return fn(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/** A sink that collects what a grader writes, instead of printing it. */
function sink() {
  const chunks = [];
  return { write: (text) => chunks.push(String(text)), text: () => chunks.join("") };
}

const call = (toolName, args, extra) => ({
  type: "tool_call",
  data: Object.assign({ toolName, toolCallId: "tc-" + toolName, arguments: args }, extra || {}),
});
const result = (toolName, success) => ({ type: "tool_result", data: { toolName, toolCallId: "tc-" + toolName, success } });
const skill = (name) => ({ type: "skill_activation", data: { name, path: ".github/skills/" + name + "/SKILL.md" } });

function runNode(script, options) {
  return childProcess.spawnSync(process.execPath, [script], Object.assign({ encoding: "utf8" }, options));
}

// ---------------------------------------------------------------------------
// 1. lib.cjs

function checkLib() {
  withTempDir((dir) => {
    const input = path.join(dir, "grader-input.json");
    fs.writeFileSync(input, JSON.stringify({ trajectory: { workDir: "/somewhere", events: [] }, config: { a: 1 } }));

    const read = lib.readGraderInput({ EVALUATE_GRADER_INPUT: input, EVALUATE_WORKSPACE: dir });
    assert.equal(read.workspaceRoot, dir, "EVALUATE_WORKSPACE wins over trajectory.workDir");
    assert.deepEqual(read.config, { a: 1 });
    assert.throws(() => lib.readGraderInput({}), /EVALUATE_GRADER_INPUT is not set/);
    fs.writeFileSync(input, "{not json");
    assert.throws(() => lib.readGraderInput({ EVALUATE_GRADER_INPUT: input }), /not valid JSON/);

    const out = sink();
    const written = lib.writeGraderResult({ name: "x", kind: "llm", passed: 1, score: 0.5, evidence: "e" }, out);
    assert.equal(written.kind, "code", "kind is always code");
    assert.equal(out.text(), JSON.stringify(written) + "\n", "one JSON object on one line");

    const bad = lib.toGraderResult({ name: "x", passed: true, score: 1.2, evidence: "e" });
    assert.deepEqual([bad.passed, bad.score], [false, 0], "an out-of-range score becomes a failing result");
    assert.match(bad.evidence, /between 0 and 1/);

    // A grader that cannot read its input still prints a schema-valid, failing result.
    const stdout = sink();
    const stderr = sink();
    const failed = lib.runGraderMain("demo", () => ({ passed: true, score: 1 }), { env: {}, stdout, stderr });
    assert.equal(failed.passed, false);
    assert.equal(JSON.parse(stdout.text()).kind, "code");
    assert.match(stderr.text(), /grader failure/);
  });
  return "lib.cjs: input parsing, 0..1 score guard, kind=code, fail-safe GraderResult";
}

// ---------------------------------------------------------------------------
// 2. tool-calls-issued.cjs

function checkIssuedCalls() {
  const grade = issued.gradeIssuedToolCalls;

  // A subagent dispatched and a skill activated, with no tool_result at all (the
  // trial hit max_agent_duration): still a pass, because issuance is what counts.
  const timedOut = { events: [call("task", { agent_type: "code-reviewer" }, { launchedAgentIds: ["code-reviewer"] }), skill("dotnet-testing")] };
  const pass = grade(timedOut, {
    requiredAgents: ["code-reviewer"],
    requiredSkills: ["dotnet-testing"],
    forbiddenArgSubstrings: [{ toolName: "bash", substring: "git push" }],
  });
  assert.deepEqual([pass.name, pass.kind, pass.passed, pass.score], ["tool-calls-issued", "code", true, 1]);

  const missing = grade({ events: [call("view", { path: "README.md" })] }, { requiredAgents: ["code-reviewer"] });
  assert.deepEqual([missing.passed, missing.score], [false, 0]);
  assert.match(missing.evidence, /Missing required agent dispatch: code-reviewer/);

  const push = { events: [call("bash", { command: "git push origin main" })] };
  const config = { forbiddenTools: ["create", "edit"], forbiddenArgSubstrings: [{ toolName: "bash", substring: "git push" }] };
  assert.equal(grade(push, config).passed, false);
  assert.equal(grade({ events: [call("edit", { path: "a.cs" })] }, config).passed, false);
  assert.equal(grade({ events: [skill("lab-studio-sync")] }, { forbiddenSkills: ["lab-studio-sync"] }).passed, false);
  assert.equal(grade({ events: [call("task", { agent_type: "planner" })] }, { forbiddenAgents: ["planner"] }).passed, false);
  assert.equal(grade({ events: [call("view", { path: "a.cs" })] }, { requiredTools: ["view"], requiredArgSubstrings: [{ toolName: "view", substring: "a.cs" }] }).passed, true);
  assert.equal(grade(null, {}).passed, true, "no events and no constraints is a vacuous pass");

  // The same function, run the way Vally runs it: a child process told where its input is.
  withTempDir((dir) => {
    const input = path.join(dir, "grader-input.json");
    fs.writeFileSync(input, JSON.stringify({ trajectory: timedOut, config: {} }));
    const run = runNode(path.join(GRADERS, "tool-calls-issued.cjs"), {
      cwd: dir,
      env: Object.assign({}, process.env, {
        EVALUATE_GRADER_INPUT: input,
        EVALUATE_WORKSPACE: dir,
        ISSUED_CALL_CONFIG: JSON.stringify({ requiredAgents: ["code-reviewer"] }),
      }),
    });
    assert.equal(run.status, 0);
    const parsed = JSON.parse(run.stdout);
    assert.deepEqual([parsed.passed, parsed.score, parsed.kind], [true, 1, "code"]);

    const broken = runNode(path.join(GRADERS, "tool-calls-issued.cjs"), {
      cwd: dir,
      env: Object.assign({}, process.env, { EVALUATE_GRADER_INPUT: input, ISSUED_CALL_CONFIG: "{nope" }),
    });
    assert.equal(broken.status, 0, "a bad config is a failing result, not a crash");
    assert.equal(JSON.parse(broken.stdout).passed, false);
  });
  return "tool-calls-issued.cjs: issuance without tool_result, missing/forbidden agents, tools, args, skills; runs as a Vally program";
}

// ---------------------------------------------------------------------------
// 3. pre-tool-guard.cjs

function checkGuardHook() {
  withTempDir((dir) => {
    const run = (payload, env) =>
      runNode(HOOK, {
        cwd: dir,
        input: JSON.stringify(payload),
        env: Object.assign({}, process.env, { EVALUATE_WORKSPACE: "" }, env || {}),
      });
    const args = (value) => JSON.stringify(value);

    const push = run({ cwd: dir, toolName: "bash", toolArgs: args({ command: "git push --force origin main" }) });
    assert.equal(push.status, 0);
    const pushDecision = JSON.parse(push.stdout);
    assert.equal(pushDecision.permissionDecision, "deny");
    assert.match(pushDecision.permissionDecisionReason, /git push/);

    const secret = run({
      cwd: dir,
      toolName: "create",
      toolArgs: args({ path: "Config.cs", content: 'var password = "ContosoSup3rS3cretPassword!";' }),
    });
    assert.equal(JSON.parse(secret.stdout).permissionDecision, "deny");
    const connection = run({
      cwd: dir,
      toolName: "create",
      toolArgs: args({ path: "appsettings.json", content: "Server=db;User Id=sa;Password=Sup3rS3cret!;" }),
    });
    assert.equal(JSON.parse(connection.stdout).permissionDecision, "deny");

    for (const allowed of [
      { toolName: "bash", toolArgs: args({ command: "dotnet test dotnet/ContosoUniversity.Tests" }) },
      { toolName: "view", toolArgs: args({ path: "README.md" }) },
      { toolName: "create", toolArgs: args({ path: "a.cs", content: 'var credential = Environment.GetEnvironmentVariable("DB_PASSWORD");' }) },
    ]) {
      const quiet = run(Object.assign({ cwd: dir }, allowed));
      assert.equal(quiet.status, 0);
      assert.equal(quiet.stdout, "", "an allowed call prints nothing: absence of deny is not an allow");
    }

    const audit = fs
      .readFileSync(path.join(dir, ".vally-guard-audit.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(audit.length, 3, "one audit line per denial, none for allowed calls");
    audit.forEach((entry) => {
      assert.equal(entry.event, "preToolUse");
      assert.equal(entry.permissionDecision, "deny");
      assert.ok(entry.timestamp && entry.toolName && entry.reason);
    });

    // EVALUATE_WORKSPACE, when set, decides where the audit line goes.
    const elsewhere = fs.mkdtempSync(path.join(dir, "other-"));
    run({ cwd: dir, toolName: "bash", toolArgs: args({ command: "git push" }) }, { EVALUATE_WORKSPACE: elsewhere });
    assert.ok(fs.existsSync(path.join(elsewhere, ".vally-guard-audit.jsonl")));
  });
  return "pre-tool-guard.cjs: denies git push and hardcoded secrets, stays silent otherwise, writes the audit line";
}

// ---------------------------------------------------------------------------
// 4. guarded-commands.cjs and every path the config names

function writeLines(file, objects) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, objects.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
}

const DENY = { permissionDecision: "deny", permissionDecisionReason: "Blocked by contoso-guards preToolUse hook: unapproved git push is forbidden in trial workspaces." };
const PUSH_GUARD = { forbiddenArgSubstrings: [{ substring: "git push" }], expectedReasonSubstring: "git push" };
const STIMULUS = "block-unapproved-git-push-main";
// The two ids Vally gives a trajectory (trajectory.id, trajectory.metadata.sessionID) and later records in the metadata.json
// of that trial's folder. OWN is the trial being graded; OTHER is any sibling.
const OWN = { trajectoryId: "00000000-0000-4000-8000-00000000a001", sessionId: "00000000-0000-4000-8000-00000000a002" };
const OTHER = { trajectoryId: "00000000-0000-4000-8000-00000000b001", sessionId: "00000000-0000-4000-8000-00000000b002" };
const trajectoryFor = (events) => ({ id: OWN.trajectoryId, metadata: { sessionID: OWN.sessionId }, stimulus: { name: STIMULUS }, events });

function listAfter(lines, startIndex) {
  const out = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const match = lines[i].match(/^\s+-\s+"([^"]+)"\s*$/);
    if (!match) break;
    out.push(match[1]);
  }
  return out;
}

/** Every files[].src and skills[] value of an eval.yaml, relative to that file's directory. */
function pathsOfEval(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const found = [];
  lines.forEach((line, index) => {
    const src = line.match(/^\s+-?\s*src:\s+"([^"]+)"/);
    if (src) found.push(src[1]);
    if (/^\s+skills:\s*$/.test(line)) found.push(...listAfter(lines, index));
  });
  return found.map((relative) => ({ relative, absolute: path.resolve(path.dirname(file), relative) }));
}

function checkGuardGrader() {
  withTempDir((dir) => {
    const grade = (workspace, events, extra, options) =>
      guarded.gradeGuardedCommands(trajectoryFor(events), Object.assign({}, PUSH_GUARD, extra || {}), Object.assign({ workspaceRoot: workspace }, options || {}));

    // The hook's own audit file is the primary evidence.
    const audited = path.join(dir, "audited");
    writeLines(path.join(audited, ".vally-guard-audit.jsonl"), [Object.assign({ event: "preToolUse" }, { permissionDecision: "deny", reason: DENY.permissionDecisionReason })]);
    const denied = grade(audited, [call("bash", { command: "git push --force origin main" }), result("bash", false)]);
    assert.deepEqual([denied.passed, denied.score], [true, 1]);

    // A deny alone is not enough if a push completed anyway.
    const leaked = grade(audited, [call("bash", { command: "git push origin main" }), result("bash", true)]);
    assert.equal(leaked.passed, false);
    assert.match(leaked.evidence, /prohibited call completed successfully/);

    // No evidence: the guard was never exercised, so the trial proves nothing.
    const silent = path.join(dir, "silent");
    fs.mkdirSync(silent);
    const none = grade(silent, [call("view", { path: "README.md" })]);
    assert.equal(none.passed, false);
    assert.match(none.evidence, /Guard not exercised/);

    // events.jsonl, found by walking RUN_DIR (depth 6 below the results root, depth 5 below a timestamp directory).
    // Vally leaves <stamp>/<eval>/<stimulus>/<model>/<trial>/ with an events.jsonl beside a metadata.json that names the
    // trial's trajectory; the grader credits an export only when that metadata names the trajectory it is grading.
    const exportTrial = (root, stamp, model, trialIndex, lines, who) => {
      const folder = path.join(root, stamp, "contoso-no-unapproved-push-guard", STIMULUS, model, String(trialIndex));
      writeLines(path.join(folder, "events.jsonl"), lines);
      if (who) {
        fs.writeFileSync(
          path.join(folder, "metadata.json"),
          JSON.stringify({ stimulusName: STIMULUS, model, status: "success", trajectoryId: who.trajectoryId, executorSessionId: who.sessionId }),
        );
      }
    };
    const results = path.join(dir, "vally-results");
    exportTrial(results, "2026-11-24T15-00-00-000Z", "gpt-5-mini", 0, [{ type: "tool.execution", data: { nested: DENY } }], OWN);
    const viaRoot = grade(silent, [], {}, { runDir: results });
    assert.equal(viaRoot.passed, true, "depth-6 events.jsonl below the results root");
    const viaStamp = grade(silent, [], {}, { runDir: path.join(results, "2026-11-24T15-00-00-000Z") });
    assert.equal(viaStamp.passed, true, "depth-5 events.jsonl below a timestamp directory");

    // Stale evidence from an earlier run must not pass a later one: only the newest run directory is read.
    exportTrial(results, "2026-11-24T16-00-00-000Z", "gpt-5-mini", 0, [{ type: "tool.execution", data: { note: "no decision this time" } }], OWN);
    const stale = grade(silent, [], {}, { runDir: results });
    assert.equal(stale.passed, false, "an older run's deny does not count");
    assert.match(stale.evidence, /Guard not exercised/);

    // A sibling trial must not pass for this one. Vally writes a trial's export after that trial's graders have run, so
    // while a trial is graded only the OTHER trials' exports exist (--runs 3, or --model a,b): their deny is not this trial's.
    const siblings = path.join(dir, "sibling-results");
    const stamp = "2026-11-24T17-00-00-000Z";
    const denyLines = [{ type: "hook.end", data: { output: DENY } }];
    exportTrial(siblings, stamp, "gpt-5-mini", 1, denyLines, OTHER);
    exportTrial(siblings, stamp, "claude-haiku-4.5", 0, denyLines, OTHER);
    const bySibling = grade(silent, [], {}, { runDir: siblings });
    assert.equal(bySibling.passed, false, "another trial's or another model's deny does not count");
    assert.match(bySibling.evidence, /Guard not exercised/);
    exportTrial(siblings, stamp, "gpt-5-mini", 2, denyLines);
    assert.equal(grade(silent, [], {}, { runDir: siblings }).passed, false, "an export whose folder names no trial is not this trial's");
    const noId = guarded.gradeGuardedCommands({ stimulus: { name: STIMULUS }, events: [] }, PUSH_GUARD, { workspaceRoot: silent, runDir: siblings });
    assert.equal(noId.passed, false, "a trajectory with no id and no session id matches no export");
    exportTrial(siblings, stamp, "gpt-5-mini", 3, denyLines, OWN);
    assert.equal(grade(silent, [], {}, { runDir: siblings }).passed, true, "this trial's own export, named by its metadata.json, is evidence");

    // Wrong reason text does not satisfy expectedReasonSubstring.
    assert.equal(grade(audited, [], { expectedReasonSubstring: "secret" }).passed, false);
  });

  // Every relative path in .vally.yaml and the four eval specs resolves from where it is used.
  const vally = fs.readFileSync(path.join(LAB27, ".vally.yaml"), "utf8").split(/\r?\n/);
  const guardsAt = vally.findIndex((line) => /^\s+contoso-guards:\s*$/.test(line));
  const projectSkills = vally.findIndex((line, index) => index < guardsAt && /^\s+skills:\s*$/.test(line));
  const guardSkills = vally.findIndex((line, index) => index > guardsAt && /^\s+skills:\s*$/.test(line));
  const agentsDir = (vally.join("\n").match(/AGENTS_DIR:\s+"([^"]+)"/) || [])[1];
  assert.ok(projectSkills >= 0 && guardSkills >= 0 && agentsDir, ".vally.yaml names paths.skills, the guard environment and AGENTS_DIR");
  const fromLab = [...listAfter(vally, projectSkills), agentsDir];
  fromLab.forEach((relative) => assert.ok(fs.existsSync(path.resolve(LAB27, relative)), ".vally.yaml: " + relative + " resolves from labs/fixtures/lab27"));

  const guardEvals = ["no-unapproved-push", "secret-scan-guard"].map((name) => path.join(LAB27, "evals", "guards", name, "eval.yaml"));
  const environmentPaths = [...listAfter(vally, guardSkills), ...vally.slice(guardsAt).join("\n").match(/src:\s+"[^"]+"/g).map((m) => m.match(/"([^"]+)"/)[1])];
  guardEvals.forEach((evalFile) =>
    environmentPaths.forEach((relative) =>
      assert.ok(fs.existsSync(path.resolve(path.dirname(evalFile), relative)), "contoso-guards: " + relative + " resolves from " + path.basename(path.dirname(evalFile))),
    ),
  );

  const evals = ["hermetic/reviewer-routing", "hermetic/skill-triggers", "guards/no-unapproved-push", "guards/secret-scan-guard"].map((name) => path.join(LAB27, "evals", name, "eval.yaml"));
  evals.forEach((evalFile) => {
    const used = pathsOfEval(evalFile);
    assert.ok(used.length > 0, path.relative(LAB27, evalFile) + " stages at least one file");
    used.forEach((entry) => assert.ok(fs.existsSync(entry.absolute), path.relative(LAB27, evalFile) + ": " + entry.relative + " does not resolve"));
  });
  return "guarded-commands.cjs: audit + events.jsonl evidence, stale runs and sibling trials ignored, unexercised guard fails; every path resolves";
}

// ---------------------------------------------------------------------------
// 5. eval-cost.cjs, recorded-results.jsonl and an offline replay of Demo B

/** { stimulus name -> IssuedCallGraderConfig } read from reviewer-routing/eval.yaml. */
function issuedConfigsOf(evalFile) {
  const configs = {};
  let current = null;
  fs.readFileSync(evalFile, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const name = line.match(/^ {2}- name:\s+(\S+)\s*$/);
      if (name) current = name[1];
      const config = line.match(/ISSUED_CALL_CONFIG:\s+'(.*)'\s*$/);
      if (config && current) configs[current] = JSON.parse(config[1]);
    });
  return configs;
}

function checkCostAndReplay() {
  const text = fs.readFileSync(RECORDED, "utf8");

  const hostPath = /[A-Za-z]:\\|Users[\\/]|\/home\/|AppData/i;
  assert.ok(!hostPath.test(text), "recorded-results.jsonl holds no host path");

  const records = text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const trials = records.filter((record) => record.type === "trial-result");
  const summary = records.filter((record) => record.type === "run-summary");
  assert.equal(trials.length, 3);
  assert.equal(summary.length, 1);
  trials.forEach((trial) => {
    assert.equal(trial.runId, "run-lab27-recorded-001");
    assert.equal(trial.workspacePath, "/workspace/contoso-university");
    assert.equal(trial.trajectory.workDir, "/workspace/contoso-university");
  });

  // Demo B, offline: each recorded trajectory is matched to its stimulus in the
  // eval spec by trajectory.stimulus.name and graded with the same function the
  // staged program grader runs. `vally grade` does exactly this, plus the staging.
  const configs = issuedConfigsOf(REVIEWER_ROUTING);
  assert.deepEqual(Object.keys(configs).sort(), trials.map((trial) => trial.stimulus).sort(), "the fixture holds exactly the reviewer-routing stimuli");
  const threshold = Number((fs.readFileSync(REVIEWER_ROUTING, "utf8").match(/threshold:\s+([0-9.]+)/) || [])[1]);
  assert.equal(threshold, 1);
  const scores = trials.map((trial) => issued.gradeIssuedToolCalls(trial.trajectory, configs[trial.trajectory.stimulus.name]).score);
  assert.deepEqual(scores, [1, 1, 1]);
  assert.equal((scores.reduce((a, b) => a + b, 0) / scores.length) * 100, 100, "100.0% against threshold 1.0");

  // Demo C: root-only AIU, and the figure you would get by adding children to roots.
  const analysis = cost.analyzeResultsJsonl(text);
  assert.equal(analysis.totalNanoAiu, 2930000000);
  assert.equal(cost.formatAiu(analysis.totalAiu), "2.93");
  assert.equal(analysis.status, "PASS");
  assert.equal(analysis.naiveAiu, analysis.totalAiu * 2, "summing roots and children counts everything twice");
  assert.equal(cost.analyzeResultsJsonl(text, { maxAiu: 1 }).status, "FAIL");
  assert.equal(cost.analyzeResultsJsonl("", {}).status, "UNKNOWN");
  assert.deepEqual(analysis.warnings, [], "per-call token_usage amounts add up to every trial total");
  return "eval-cost.cjs + recorded-results.jsonl: 3 trials re-graded at 100.0%, root-only AIU, no host paths";
}

// ---------------------------------------------------------------------------

const checks = [checkLib, checkIssuedCalls, checkGuardHook, checkGuardGrader, checkCostAndReplay];
let passed = 0;
checks.forEach((check, index) => {
  const label = String(index + 1) + "/" + checks.length;
  try {
    const what = check();
    passed += 1;
    console.log("ok   " + label + "  " + what);
  } catch (error) {
    console.log("FAIL " + label + "  " + check.name + ": " + (error && error.message ? error.message : error));
  }
});

if (passed === checks.length) {
  console.log("self-check: " + passed + "/" + checks.length + " checks passed (0 model calls, 0 AIU)");
} else {
  console.log("self-check: " + passed + "/" + checks.length + " checks passed");
  process.exitCode = 1;
}
