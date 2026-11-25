import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import {
  fileExists,
  readWorkspaceFile,
  resetSandbox,
  writeWorkspaceFile,
} from "../src/sandbox.js";
import { runTerminalLine } from "../src/sim-terminal.js";
import { runVerify } from "../src/verify.js";

const here = dirname(fileURLToPath(import.meta.url));
const studio = resolve(here, "../..");

const GRADER_PATH = ".github/evals/graders/tool-calls-issued.mjs";
const VALLY_PATH = ".vally.yaml";
const EVAL_PATH = "evals/hermetic/reviewer-routing/eval.yaml";
const RESULTS_PATH = "vally-results/2026-11-24T15-00-00Z/results.jsonl";

/** The body of `const NAME = \`...\`;` in lab27.tsx: exactly what a FileCard writes. */
function shipped(name: string): string {
  const source = readFileSync(
    resolve(studio, "client/src/labs/lab27.tsx"),
    "utf8",
  );
  const match = new RegExp(`const ${name} = \`((?:[^\`\\\\]|\\\\.)*)\`;`).exec(
    source,
  );
  if (!match) throw new Error(`no template-literal const ${name}`);
  // A template literal's value has LF line breaks whatever the file on disk uses.
  return (match[1] ?? "").replace(/\r\n/g, "\n");
}

const VALID_GRADER = shipped("ISSUED_GRADER_MJS");
const VALID_VALLY = shipped("VALLY_CONFIG_YAML");
const VALID_EVAL = shipped("REVIEWER_ROUTING_EVAL_YAML");
/** The shipped spec with the comma dropped after `requiredAgents` in the first stimulus's ISSUED_CALL_CONFIG. */
const MALFORMED_CONFIG_EVAL = VALID_EVAL.replace(
  '"requiredAgents":["code-reviewer"],',
  '"requiredAgents":["code-reviewer"] ',
);

const ALWAYS_PASS = `export function gradeIssuedToolCalls(trajectory, config) {
  return { name: "tool-calls-issued", kind: "code", passed: true, score: 1, evidence: "always passes" };
}`;

const REGRESSED_GRADER = `export function gradeIssuedToolCalls(trajectory, config) {
  return { name: "tool-calls-issued", kind: "code", passed: false, score: 0, evidence: "Simulated regression in learner grader" };
}`;

/** Only believes a tool_result: a dispatch that was cut off before returning does not count. */
const WAITS_FOR_TOOL_RESULT = `export function gradeIssuedToolCalls(trajectory, config) {
  const results = (trajectory.events || []).filter(function (e) { return e.type === "tool_result"; });
  const passed = results.length > 0;
  return { name: "tool-calls-issued", kind: "code", passed: passed, score: passed ? 1 : 0, evidence: passed ? "ok" : "no tool_result" };
}`;

const text = (blocks: { text: string }[]): string =>
  blocks.map((b) => b.text).join("\n");

function run(line: string): { text: string; allSim: boolean; empty: boolean } {
  const result = runTerminalLine(line, "shell");
  return {
    text: text(result.blocks),
    allSim: result.blocks.every((b) => b.sim === true),
    empty: result.blocks.length === 0,
  };
}

function writeValidWorkspace(): void {
  writeWorkspaceFile(GRADER_PATH, VALID_GRADER);
  writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
  writeWorkspaceFile(EVAL_PATH, VALID_EVAL);
}

beforeEach(() => {
  resetSandbox();
});

describe("lab27/graders verify", () => {
  it("missingFile.failsWithCreateInstruction", () => {
    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toContain(GRADER_PATH);
  });

  it("missingExport.failsWithExportInstruction", () => {
    writeWorkspaceFile(GRADER_PATH, "function gradeIssuedToolCalls() {}");

    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("gradeIssuedToolCalls");
  });

  it("shippedGraderCard.passesAllThreeSyntheticTrajectories", () => {
    writeWorkspaceFile(GRADER_PATH, VALID_GRADER);

    const result = runVerify("lab27/graders");

    expect(result.pass, result.message).toBe(true);
  });

  it("graderIgnoringToolCallsWithoutToolResult.failsTheTimedOutDispatchCase", () => {
    writeWorkspaceFile(GRADER_PATH, WAITS_FOR_TOOL_RESULT);

    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("gradeIssuedToolCalls(trajectory, config)");
    expect(result.message).toMatch(/even without a tool_result/);
  });

  it("graderThatAlwaysPasses.failsTheMissingAgentAndGitPushCases", () => {
    writeWorkspaceFile(GRADER_PATH, ALWAYS_PASS);

    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/must fail/);
  });

  it("graderReturningAString.failsWithTheRequiredResultShape", () => {
    writeWorkspaceFile(
      GRADER_PATH,
      'export function gradeIssuedToolCalls() { return "passed"; }',
    );

    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toContain('kind: "code"');
  });

  it("graderThatCountsReadingAnAgentProfileAsDispatchingIt.fails", () => {
    writeWorkspaceFile(
      GRADER_PATH,
      VALID_GRADER.replace(
        'if (tool === "task" || tool === "dispatch_agent" || tool === "subagent" || tool === "run_subagent") {',
        "if (JSON.stringify(data.arguments || {}).indexOf(agent) !== -1) return true;\n    if (false) {",
      ),
    );

    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/reading `.github\/agents\/<name>\.agent\.md` with `view` is not a dispatch/);
  });

  it("graderThatThrows.failsCleanlyNamingTheModuleError", () => {
    writeWorkspaceFile(
      GRADER_PATH,
      "export function gradeIssuedToolCalls(trajectory) { return trajectory.missing.events; }",
    );

    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/Module execution error/);
  });

  it("nonTerminatingGraderLoop.failsWithinTimeoutAndAllowsCorrectedRetry", () => {
    // Cap the runaway loop at 4000ms (> LEARNER_CODE_TIMEOUT_MS = 2000ms) so an
    // unguarded implementation fails the timing assertions instead of wedging the worker.
    writeWorkspaceFile(
      GRADER_PATH,
      `export function gradeIssuedToolCalls(trajectory, config) {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {}
  return { name: "tool-calls-issued", kind: "code", passed: true, score: 1, evidence: "late" };
}`,
    );

    const started = Date.now();
    const result = runVerify("lab27/graders");
    const elapsedMs = Date.now() - started;

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/timed out.*2000\s*ms/i);
    expect(elapsedMs).toBeLessThan(3500);
    writeWorkspaceFile(GRADER_PATH, VALID_GRADER);
    expect(runVerify("lab27/graders").pass).toBe(true);
  });

  it("moduleSyntaxError.failsCleanlyAndAllowsCorrectedRetry", () => {
    writeWorkspaceFile(
      GRADER_PATH,
      "export function gradeIssuedToolCalls(trajectory, config) {\n  return trajectory.;\n}",
    );

    const result = runVerify("lab27/graders");

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/Module execution error|Unexpected token/i);
    writeWorkspaceFile(GRADER_PATH, VALID_GRADER);
    expect(runVerify("lab27/graders").pass).toBe(true);
  });
});

describe("lab27/eval-spec verify", () => {
  it("missingVallyConfig.failsNamingVallyYaml", () => {
    const result = runVerify("lab27/eval-spec");

    expect(result.pass).toBe(false);
    expect(result.message).toContain(".vally.yaml");
  });

  it("vallyConfigMissingRunDir.failsNamingTheParam", () => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY.replace("  RUN_DIR:", "  RUN_FOLDER:"));
    writeWorkspaceFile(EVAL_PATH, VALID_EVAL);

    const result = runVerify("lab27/eval-spec");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("RUN_DIR");
  });

  it("missingEvalSpec.failsNamingTheEvalPath", () => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);

    const result = runVerify("lab27/eval-spec");

    expect(result.pass).toBe(false);
    expect(result.message).toContain(EVAL_PATH);
  });

  it("missingGradingEnvironment.failsNamingGradingEnvironment", () => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
    writeWorkspaceFile(
      EVAL_PATH,
      VALID_EVAL.replace(/^grading_environment:[\s\S]*?\n\ndefaults:/m, "defaults:"),
    );

    const result = runVerify("lab27/eval-spec");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("grading_environment");
  });

  it.each(["0.8", "1.5", "10", "0.99"])(
    "threshold %s.failsNamingThresholdOne",
    (value) => {
      writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
      writeWorkspaceFile(
        EVAL_PATH,
        VALID_EVAL.replace("threshold: 1.0", `threshold: ${value}`),
      );

      const result = runVerify("lab27/eval-spec");

      expect(result.pass).toBe(false);
      expect(result.message).toContain("threshold: 1.0");
    },
  );

  it.each(["1", "1.0", "1.00"])("threshold %s.passes", (value) => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
    writeWorkspaceFile(
      EVAL_PATH,
      VALID_EVAL.replace("threshold: 1.0", `threshold: ${value}`),
    );

    const result = runVerify("lab27/eval-spec");

    expect(result.pass, result.message).toBe(true);
  });

  it("stimulusWithoutMaxAgentDuration.failsNamingTheConstraint", () => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
    // Remove the cap from the second stimulus only: the first still has one.
    const lastCap = VALID_EVAL.lastIndexOf('      max_agent_duration: "30s"\n');
    writeWorkspaceFile(
      EVAL_PATH,
      VALID_EVAL.slice(0, lastCap) +
        VALID_EVAL.slice(lastCap).replace('      max_agent_duration: "30s"\n', ""),
    );

    const result = runVerify("lab27/eval-spec");

    expect(result.pass).toBe(false);
    expect(result.message).toContain("max_agent_duration");
  });

  it("onlyAPositiveStimulus.failsNamingTheNegativeStimulus", () => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
    const cut = VALID_EVAL.indexOf("  - name: negative-direct-read");
    writeWorkspaceFile(EVAL_PATH, VALID_EVAL.slice(0, cut));

    const result = runVerify("lab27/eval-spec");

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/negative stimulus/);
  });

  it("aSecondPositiveWearingNegativeVocabulary.stillFails", () => {
    // The impostor is not marked kind: "negative" and still requires an agent, even though
    // it forbids mutating tools and git push and the word "negative" appears in its name.
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
    const cut = VALID_EVAL.indexOf("  - name: negative-direct-read");
    const impostor = `  - name: negative-looking-but-positive
    prompt: "Review src/routes/courses.ts without editing files."
    tags:
      priority: "p0"
      kind: "positive"
    constraints:
      max_agent_duration: "30s"
    graders:
      - type: program
        name: check-impostor
        config:
          program: "node"
          args:
            - ".vally-grading/graders/tool-calls-issued.mjs"
          env:
            ISSUED_CALL_CONFIG: '{"requiredAgents":["code-reviewer"],"forbiddenAgents":["contoso-dev"],"forbiddenTools":["create","edit"],"forbiddenArgSubstrings":[{"toolName":"bash","substring":"git push"}]}'
`;
    writeWorkspaceFile(EVAL_PATH, VALID_EVAL.slice(0, cut) + impostor);

    const result = runVerify("lab27/eval-spec");

    expect(result.pass).toBe(false);
    expect(result.message).toMatch(/negative stimulus/);
  });

  it("malformedIssuedCallConfigJson.failsVerifyAndLint", () => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
    writeWorkspaceFile(EVAL_PATH, MALFORMED_CONFIG_EVAL);

    const verifyResult = runVerify("lab27/eval-spec");
    const lintResult = run(`vally lint -e ${EVAL_PATH} --strict`);

    expect(verifyResult.pass).toBe(false);
    expect(verifyResult.message).toContain("ISSUED_CALL_CONFIG");
    expect(lintResult.allSim).toBe(true);
    expect(lintResult.text).toContain("✘ error [invalid-grader-config]");
    expect(lintResult.text).toContain("ISSUED_CALL_CONFIG is not valid JSON");
  });

  it("shippedCards.pass", () => {
    writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
    writeWorkspaceFile(EVAL_PATH, VALID_EVAL);

    const result = runVerify("lab27/eval-spec");

    expect(result.pass, result.message).toBe(true);
  });
});

describe("sim-terminal vally CLI", () => {
  it("vallyVersion.emitsSimulatedBadgeAndPinnedVersion", () => {
    const out = run("vally --version");

    expect(out.empty).toBe(false);
    expect(out.allSim).toBe(true);
    expect(out.text).toContain("0.21.0 (simulated — @microsoft/vally-cli)");
  });

  it.each(["vally", "vally frobnicate", "vally --help"])(
    "%s.printsUsageBadgedAsSimulated",
    (line) => {
      const out = run(line);

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("vally (simulated) — supported:");
    },
  );

  it("help.listsVally", () => {
    expect(run("help").text).toContain("vally --version | lint | eval | grade");
  });

  describe("vally lint", () => {
    it("missingSpec.failsAndBadgesEveryBlock", () => {
      const out = run(`vally lint -e ${EVAL_PATH} --strict`);

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("Error: --eval-spec path does not exist");
    });

    it("validSpec.reportsValidAndBadgesEveryBlock", () => {
      writeValidWorkspace();

      const out = run(`vally lint -e ${EVAL_PATH} --strict`);

      expect(out.allSim).toBe(true);
      expect(out.text).toContain(`✔ ${EVAL_PATH} is valid`);
    });

    it("unknownProgramGraderConfigKey.reportsInvalidGraderConfig", () => {
      writeWorkspaceFile(
        EVAL_PATH,
        VALID_EVAL.replace('          program: "node"\n', '          program: "node"\n          foo: "bar"\n'),
      );

      const out = run(`vally lint -e ${EVAL_PATH} --strict`);

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("✘ error [invalid-grader-config]");
      expect(out.text).toContain("Unrecognized config field 'foo'");
      expect(out.text).toContain("at stimuli[0].graders[0].config.foo");
      expect(out.text).toContain("1 error(s)");
    });

    it("reservedEnvVariable.reportsInvalidGraderConfig", () => {
      writeWorkspaceFile(
        EVAL_PATH,
        VALID_EVAL.replace(
          "          env:\n",
          "          env:\n            EVALUATE_WORKSPACE: \"/tmp\"\n",
        ),
      );

      const out = run(`vally lint -e ${EVAL_PATH}`);

      expect(out.text).toContain("[invalid-grader-config]");
      expect(out.text).toContain("reserved variable(s): EVALUATE_WORKSPACE");
    });

    it("thresholdOutOfRange.reportsScoringThresholdRange", () => {
      writeWorkspaceFile(EVAL_PATH, VALID_EVAL.replace("threshold: 1.0", "threshold: 1.5"));

      const out = run(`vally lint -e ${EVAL_PATH}`);

      expect(out.text).toContain("[scoring-threshold-range]");
      expect(out.text).toContain("scoring.threshold must be between 0 and 1 (got 1.5)");
    });

    it("weightsNotSummingToOne.reportsScoringWeightSum", () => {
      writeWorkspaceFile(EVAL_PATH, VALID_EVAL.replace("    program: 1.0", "    program: 0.5"));

      const out = run(`vally lint -e ${EVAL_PATH}`);

      expect(out.text).toContain("[scoring-weight-sum]");
      expect(out.text).toContain("scoring.weights must sum to 1.0 (got 0.50)");
    });

    it("duplicateStimulusName.reportsEvalLoadError", () => {
      writeValidWorkspace();
      writeWorkspaceFile(
        EVAL_PATH,
        VALID_EVAL.replace("name: negative-direct-read-no-mutation-or-push", "name: route-pr-diff-to-code-reviewer"),
      );

      const out = run(`vally lint -e ${EVAL_PATH}`);

      expect(out.text).toContain("[eval-load-error]");
      expect(out.text).toContain('duplicate name "route-pr-diff-to-code-reviewer"');
      expect(out.text).toContain("MODEL=gpt-5-mini");
    });
  });

  describe("vally eval and vally grade", () => {
    it("evalSuite.runsTheLearnersGraderAndWritesResultsJsonl", () => {
      writeValidWorkspace();

      const out = run("vally eval --suite pr-gate");

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("Loaded 2 stimuli from contoso-reviewer-routing");
      expect(out.text).toContain("contoso-reviewer-routing  ✓ 2/2 (score 100% ≥ 100%)");
      expect(out.text).toMatch(/Saved {2}\.\/vally-results\/2026-11-24T15-00-00Z\//);
      expect(fileExists(RESULTS_PATH)).toBe(true);
      const records = readWorkspaceFile(RESULTS_PATH)
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { type: string; passed?: boolean; stimulus?: string });
      expect(records.map((r) => r.type)).toEqual(["trial-result", "trial-result", "run-summary"]);
      expect(records[2]?.passed).toBe(true);
    });

    it("gradeOfTheSavedRun.passesThenFlipsWhenTheLearnersGraderRegresses", () => {
      writeValidWorkspace();
      run("vally eval --suite pr-gate");
      const grade = `vally grade -e ${EVAL_PATH} --workspace . < ${RESULTS_PATH}`;

      const before = run(grade);
      writeWorkspaceFile(GRADER_PATH, REGRESSED_GRADER);
      const after = run(grade);

      expect(before.allSim).toBe(true);
      expect(before.text).toContain("Warning: --workspace applied to all 2 input trajectories");
      expect(before.text).toContain("━━━ route-pr-diff-to-code-reviewer ━━━");
      expect(before.text).toContain("✅ route-pr-diff-to-code-reviewer (1/1 graders passed)");
      expect(before.text).toContain("Score: 100.0% | PASSED (threshold: 100.0%)");
      expect(before.text).not.toContain("❌");
      // Proof that grade runs the workspace code: the same results, a different verdict.
      expect(after.allSim).toBe(true);
      expect(after.text).toContain("❌ route-pr-diff-to-code-reviewer (0/1 graders passed, 1 failed)");
      expect(after.text).toContain("✗ [check-code-reviewer-dispatch] Simulated regression in learner grader");
      expect(after.text).toContain("Score: 0.0% | FAILED (threshold: 100.0%)");
      expect(after.text).not.toContain("✅");
    });

    it("evalWithARegressedGrader.failsEveryStimulusAndSaysWhy", () => {
      writeValidWorkspace();
      writeWorkspaceFile(GRADER_PATH, REGRESSED_GRADER);

      const out = run("vally eval --suite pr-gate");

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("FAIL  route-pr-diff-to-code-reviewer");
      expect(out.text).toContain("✘ check-code-reviewer-dispatch  Simulated regression in learner grader");
      expect(out.text).toContain("Summary   1 failed · 1 evals");
      expect(out.text).toContain("contoso-reviewer-routing  ✘ 0/2 (score 0% < 100%)");
      expect(readWorkspaceFile(RESULTS_PATH)).toContain('"type":"run-summary","runId":"run-lab27-sim-001","passed":false');
    });

    it("graderThatWaitsForAToolResult.failsThePositiveStimulus", () => {
      writeValidWorkspace();
      writeWorkspaceFile(GRADER_PATH, WAITS_FOR_TOOL_RESULT);

      const out = run("vally eval --suite pr-gate");

      // The simulated agent dispatches the required agent and never returns a tool_result,
      // so a grader that waits for one fails the positive stimulus.
      expect(out.text).toContain("FAIL  route-pr-diff-to-code-reviewer");
    });

    it("evalWithAMalformedIssuedCallConfig.failsThePositiveStimulusAndSaysWhy", () => {
      writeValidWorkspace();
      writeWorkspaceFile(EVAL_PATH, MALFORMED_CONFIG_EVAL);

      const out = run("vally eval --suite pr-gate");

      // Real Vally hands the program a value its JSON.parse rejects, so the grader exits 1.
      expect(out.allSim).toBe(true);
      expect(out.text).toContain("FAIL  route-pr-diff-to-code-reviewer");
      expect(out.text).toContain("Grader exited with exit code 1");
      expect(out.text).toContain("ISSUED_CALL_CONFIG is not valid JSON");
      expect(out.text).toContain("contoso-reviewer-routing  ✘ 1/2");
      expect(out.text).not.toContain("✓ 2/2");
      const records = readWorkspaceFile(RESULTS_PATH)
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      const failed = records.find(
        (record) => record.type === "trial-result" && record.stimulus === "route-pr-diff-to-code-reviewer",
      );
      expect(failed).toMatchObject({
        passed: false,
        score: 0,
        graderResult: [{
          name: "check-code-reviewer-dispatch",
          passed: false,
          evidence: expect.stringContaining("ISSUED_CALL_CONFIG is not valid JSON"),
        }],
      });
      expect(records.at(-1)).toMatchObject({ type: "run-summary", passed: false });
    });

    it("gradeWithAMalformedIssuedCallConfig.failsThePositiveStimulusAndSaysWhy", () => {
      writeValidWorkspace();
      run("vally eval --suite pr-gate");
      writeWorkspaceFile(EVAL_PATH, MALFORMED_CONFIG_EVAL);

      const out = run(`vally grade -e ${EVAL_PATH} --workspace . < ${RESULTS_PATH}`);

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("❌ route-pr-diff-to-code-reviewer (0/1 graders passed, 1 failed)");
      expect(out.text).toContain("Grader exited with exit code 1");
      expect(out.text).toContain("ISSUED_CALL_CONFIG is not valid JSON");
      expect(out.text).toContain("Score: 0.0% | FAILED (threshold: 100.0%)");
    });

    it("suiteFilter.runsOnlyP0StimuliInPrGateAndEverythingInFull", () => {
      writeValidWorkspace();
      const p1 = `
  - name: p1-extra-read
    prompt: "Read src/repos/course-repo.ts."
    tags:
      priority: "p1"
      kind: "negative"
    constraints:
      max_agent_duration: "30s"
    graders:
      - type: program
        name: check-p1
        config:
          program: "node"
          args:
            - ".vally-grading/graders/tool-calls-issued.mjs"
          env:
            ISSUED_CALL_CONFIG: '{"forbiddenTools":["edit"]}'
`;
      writeWorkspaceFile(EVAL_PATH, VALID_EVAL.trimEnd() + "\n" + p1);

      const gate = run("vally eval --suite pr-gate");
      const full = run("vally eval --suite full");

      expect(gate.text).toContain("Running 2 of 3 stimuli (1 filtered by tags)");
      expect(gate.text).toContain("Loaded 2 stimuli from contoso-reviewer-routing");
      expect(full.text).not.toContain("filtered by tags");
      expect(full.text).toContain("contoso-reviewer-routing  ✓ 3/3");
    });

    it("unknownSuite.listsTheSuitesInVallyYaml", () => {
      writeValidWorkspace();

      const out = run("vally eval --suite nightly");

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("unknown suite 'nightly'");
      expect(out.text).toContain("pr-gate");
      expect(out.text).toContain("full-guards");
    });

    it("suiteCombinedWithEvalSpec.isRejected", () => {
      writeValidWorkspace();

      const out = run(`vally eval --suite pr-gate -e ${EVAL_PATH}`);

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("--suite cannot be combined with --eval-spec");
    });

    it("evalWithoutTheGrader.tellsTheLearnerToCreateItFirst", () => {
      writeWorkspaceFile(VALLY_PATH, VALID_VALLY);
      writeWorkspaceFile(EVAL_PATH, VALID_EVAL);

      const out = run("vally eval --suite pr-gate");

      expect(out.allSim).toBe(true);
      expect(out.text).toContain(GRADER_PATH);
      expect(fileExists(RESULTS_PATH)).toBe(false);
    });

    it("gradeBeforeEval.tellsTheLearnerToRunEvalFirst", () => {
      writeValidWorkspace();

      const out = run(`vally grade -e ${EVAL_PATH} --workspace . < ${RESULTS_PATH}`);

      expect(out.allSim).toBe(true);
      expect(out.text).toContain("vally eval --suite pr-gate");
    });

    it("nonTerminatingGrader.timesOutWithoutWritingResults", () => {
      writeValidWorkspace();
      writeWorkspaceFile(
        GRADER_PATH,
        `export function gradeIssuedToolCalls() {
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {}
  return { name: "tool-calls-issued", kind: "code", passed: true, score: 1, evidence: "late" };
}`,
      );

      const started = Date.now();
      const out = run("vally eval --suite pr-gate");

      expect(out.allSim).toBe(true);
      expect(out.text).toMatch(/grader timed out after 2000ms/);
      expect(Date.now() - started).toBeLessThan(3500);
      expect(fileExists(RESULTS_PATH)).toBe(false);
    });

    it("graderQueueingARunawayPromiseCallback.timesOutWithoutWritingResults", () => {
      writeValidWorkspace();
      writeWorkspaceFile(GRADER_PATH, QUEUES_A_RUNAWAY_PROMISE_CALLBACK);

      const started = Date.now();
      const out = run("vally eval --suite pr-gate");

      expect(out.allSim).toBe(true);
      expect(out.text).toMatch(/grader timed out after 2000ms/);
      expect(Date.now() - started).toBeLessThan(3500);
      expect(fileExists(RESULTS_PATH)).toBe(false);
    }, 15_000);

    it("everyVallyCommand.badgesEveryBlockAsSimulated", () => {
      writeValidWorkspace();

      for (const line of [
        "vally",
        "vally --version",
        "vally -V",
        `vally lint -e ${EVAL_PATH} --strict`,
        "vally lint",
        "vally eval --suite pr-gate",
        `vally eval -e ${EVAL_PATH}`,
        `vally grade -e ${EVAL_PATH} --workspace . < ${RESULTS_PATH}`,
        "vally grade",
        "vally eval --suite nope",
      ]) {
        const out = run(line);
        expect(out.empty, line).toBe(false);
        expect(out.allSim, line).toBe(true);
      }
    });
  });
});

describe("lab27 studio deliverables", () => {
  const files = [
    "client/src/labs/lab27.tsx",
    "client/src/labs/lab20.tsx",
    "client/src/labs/lab26.tsx",
    "client/src/labs/index.ts",
    "client/src/labs/tracks.ts",
    "client/src/components/Home.tsx",
    "package.json",
    "README.md",
    "scripts/check-lab-drift.mjs",
    "server/src/verify.ts",
    "server/src/sim-terminal.ts",
    "server/tests/verify-lab27-evals.test.ts",
  ];
  const read = (rel: string): string => readFileSync(resolve(studio, rel), "utf8");

  // Assembled from fragments so this file never contains the strings it forbids.
  const NAMES = [
    ["Saz", "ed"], ["Vash", "er"], ["Kala", "din"], ["V", "in"], ["Khr", "iss"], ["Ho", "id"], ["Sig", "zil"],
    ["Way", "ne"], ["Ste", "ris"], ["Seba", "rial"], ["Nav", "ani"], ["Na", "le"], ["Tre", "ss"], ["Han", "dy"], ["Ya", "lb"],
  ].map((parts) => new RegExp(`\\b${parts.join("")}\\b`));
  const USER = new RegExp(["john", "hain"].join(""), "i");
  const PATHS = [
    new RegExp("Users" + "[\\\\/]", "i"),
    new RegExp("/" + "home" + "/", "i"),
    /(?<![A-Za-z0-9])[A-Za-z]:[\\/]/,
  ];

  it("containNoHostPathUserNameOrPersonalAgentName", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      read(rel)
        .split("\n")
        .forEach((line, i) => {
          if (PATHS.some((re) => re.test(line)) || USER.test(line) || NAMES.some((re) => re.test(line))) {
            offenders.push(`${rel}:${i + 1}`);
          }
        });
    }

    expect(offenders).toEqual([]);
  });

  it("packageAndStudioReadme.reflectTwentySevenLabsAndTheTrackFiveRange", () => {
    const pkg = read("package.json");
    const readme = read("README.md");

    expect(pkg).toMatch(/27 labs/i);
    expect(readme).toMatch(/27 labs/i);
    expect(readme).toContain("Labs 01–27");
    expect(readme).toContain("21–27");
    expect(readme).toContain("`lab01`–`lab27`");
    for (const stale of [/\b26 labs\b/i, /01–26/, /21–26/, /`lab01`–`lab26`/]) {
      expect(pkg, String(stale)).not.toMatch(stale);
      expect(readme, String(stale)).not.toMatch(stale);
    }
  });
});
