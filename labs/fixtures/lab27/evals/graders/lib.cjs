"use strict";

/*
 * lib.cjs: the shared helper for the Lab 27 Vally `program` graders.
 *
 * A Vally `program` grader is an ordinary child process. Vally gives it two
 * environment variables it always sets:
 *   EVALUATE_GRADER_INPUT  path to a temp JSON file holding the GraderInput:
 *                          { trajectory, stimulus, config, diffBaseDir, goldenPatch }
 *   EVALUATE_WORKSPACE     the workspace root the grader is judging
 * and reads one GraderResult object from stdout:
 *   { name, kind: "code", passed, score (0..1), evidence }
 * Anything else on stdout, or a score outside 0..1, turns the grade into an
 * ERROR. Diagnostics therefore go to stderr, and every failure path in this
 * file still prints a schema-valid, failing GraderResult so the verdict is a
 * structured FAIL with an explanation rather than an unparseable-stdout ERROR.
 *
 * The staged location is .vally-grading/graders/lib.cjs: the eval specs copy
 * this file there with grading_environment.files so the agent never sees it.
 */

const fs = require("node:fs");

const GRADER_KIND = "code";

/** Read and parse the GraderInput JSON that Vally points EVALUATE_GRADER_INPUT at. */
function readGraderInput(env = process.env) {
  const inputPath = env.EVALUATE_GRADER_INPUT;
  if (!inputPath) {
    throw new Error(
      "EVALUATE_GRADER_INPUT is not set: run this file as a Vally program grader (or point the variable at a GraderInput JSON file)",
    );
  }

  let raw;
  try {
    raw = fs.readFileSync(inputPath, "utf8");
  } catch (error) {
    throw new Error("cannot read the GraderInput file named by EVALUATE_GRADER_INPUT (" + (error.code || error.message) + ")");
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error("the GraderInput file is not valid JSON: " + error.message);
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("the GraderInput file must hold a JSON object");
  }

  const workspaceRoot =
    env.EVALUATE_WORKSPACE || (payload.trajectory && payload.trajectory.workDir) || process.cwd();
  return Object.assign({}, payload, { workspaceRoot });
}

/**
 * Build the schema-valid GraderResult for a result-shaped object. `kind` is
 * always "code": these graders are deterministic. A score that is not a finite
 * number in 0..1 would make Vally throw, so it becomes a failing result that
 * says so instead.
 */
function toGraderResult(result) {
  const source = result || {};
  const name = String(source.name || "program");
  const score = Number(source.score);
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    return {
      name,
      kind: GRADER_KIND,
      passed: false,
      score: 0,
      evidence: "Invalid grader score " + String(source.score) + ": a score must be a finite number between 0 and 1 (inclusive)",
    };
  }

  const out = {
    name,
    kind: GRADER_KIND,
    passed: Boolean(source.passed),
    score,
    evidence: String(source.evidence || ""),
  };
  if (source.details !== undefined && source.details !== null) out.details = source.details;
  if (source.metadata !== undefined && source.metadata !== null) out.metadata = source.metadata;
  return out;
}

/** Print one GraderResult as a single JSON line on stdout and return it. */
function writeGraderResult(result, stdout = process.stdout) {
  const out = toGraderResult(result);
  stdout.write(JSON.stringify(out) + "\n");
  return out;
}

/**
 * Run a grader entry point. `fn` receives the parsed GraderInput and returns a
 * result-shaped object. Any exception is reported on stderr and becomes a
 * failing GraderResult on stdout; the process still exits 0 so Vally records a
 * FAIL it can show, not an ERROR it cannot explain.
 */
function runGraderMain(name, fn, io = {}) {
  const env = io.env || process.env;
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  try {
    const input = readGraderInput(env);
    const result = fn(input);
    return writeGraderResult(Object.assign({ name }, result), stdout);
  } catch (error) {
    stderr.write("[" + name + "] grader failure: " + (error && error.stack ? error.stack : String(error)) + "\n");
    return writeGraderResult(
      {
        name,
        passed: false,
        score: 0,
        evidence: "Grader input/execution failure: " + (error && error.message ? error.message : String(error)),
      },
      stdout,
    );
  }
}

module.exports = { GRADER_KIND, readGraderInput, runGraderMain, toGraderResult, writeGraderResult };
