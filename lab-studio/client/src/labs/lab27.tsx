import { Cmd, FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const ISSUED_GRADER_MJS = `export function gradeIssuedToolCalls(trajectory, config) {
  const cfg = config || {};
  const events = (trajectory && Array.isArray(trajectory.events)) ? trajectory.events : [];
  const toolCalls = events.filter(function (e) { return e && e.type === "tool_call"; });
  const skillEvents = events.filter(function (e) { return e && e.type === "skill_activation"; });
  const failures = [];
  const hits = [];

  function hasAgent(call, agent) {
    const data = (call && call.data) ? call.data : {};
    if (Array.isArray(data.launchedAgentIds) && data.launchedAgentIds.indexOf(agent) !== -1) return true;
    if (call && call.agentId === agent) return true;
    const tool = String(data.toolName || "");
    if (tool === "task" || tool === "dispatch_agent" || tool === "subagent" || tool === "run_subagent") {
      const args = (data.arguments && typeof data.arguments === "object") ? data.arguments : {};
      const target = args.agent || args.agent_type || args.subagent_type || args.agentName || "";
      if (target === agent) return true;
    }
    return false;
  }

  (cfg.requiredTools || []).forEach(function (tool) {
    const ok = toolCalls.some(function (e) { return e.data && e.data.toolName === tool; });
    if (ok) hits.push("requiredTool:" + tool);
    else failures.push("Missing required tool_call: " + tool);
  });

  (cfg.forbiddenTools || []).forEach(function (tool) {
    const bad = toolCalls.some(function (e) { return e.data && e.data.toolName === tool; });
    if (bad) failures.push("Forbidden tool_call issued: " + tool);
    else hits.push("noForbiddenTool:" + tool);
  });

  (cfg.requiredArgSubstrings || []).forEach(function (rule) {
    const ok = toolCalls.some(function (e) {
      if (!e.data || e.data.toolName !== rule.toolName) return false;
      return JSON.stringify(e.data.arguments || {}).indexOf(rule.substring) !== -1;
    });
    if (ok) hits.push("requiredArg:" + rule.toolName + "~" + rule.substring);
    else failures.push("Missing required arg substring on " + rule.toolName + ": " + rule.substring);
  });

  (cfg.forbiddenArgSubstrings || []).forEach(function (rule) {
    const bad = toolCalls.some(function (e) {
      if (!e.data || e.data.toolName !== rule.toolName) return false;
      return JSON.stringify(e.data.arguments || {}).indexOf(rule.substring) !== -1;
    });
    if (bad) failures.push("Forbidden arg substring on " + rule.toolName + ": " + rule.substring);
    else hits.push("noForbiddenArg:" + rule.toolName + "~" + rule.substring);
  });

  (cfg.requiredAgents || []).forEach(function (agent) {
    const ok = toolCalls.some(function (e) { return hasAgent(e, agent); });
    if (ok) hits.push("requiredAgent:" + agent);
    else failures.push("Missing required agent dispatch: " + agent);
  });

  (cfg.forbiddenAgents || []).forEach(function (agent) {
    const bad = toolCalls.some(function (e) { return hasAgent(e, agent); });
    if (bad) failures.push("Forbidden agent dispatched: " + agent);
    else hits.push("noForbiddenAgent:" + agent);
  });

  (cfg.requiredSkills || []).forEach(function (skill) {
    const ok = skillEvents.some(function (e) { return e.data && e.data.name === skill; });
    if (ok) hits.push("requiredSkill:" + skill);
    else failures.push("Missing required skill_activation: " + skill);
  });

  (cfg.forbiddenSkills || []).forEach(function (skill) {
    const bad = skillEvents.some(function (e) { return e.data && e.data.name === skill; });
    if (bad) failures.push("Forbidden skill_activation: " + skill);
    else hits.push("noForbiddenSkill:" + skill);
  });

  const passed = failures.length === 0;
  const score = passed ? 1 : 0;
  const evidence = passed
    ? ("All issued-call checks passed (" + (hits.join(", ") || "no constraints") + ")")
    : failures.join("; ");
  return {
    name: "tool-calls-issued",
    kind: "code",
    passed: passed,
    score: score,
    evidence: evidence,
  };
}

if (typeof process !== "undefined" && process.env && process.env.EVALUATE_GRADER_INPUT) {
  import("node:fs").then(function (fs) {
    const raw = JSON.parse(fs.readFileSync(process.env.EVALUATE_GRADER_INPUT, "utf8"));
    const envStr = (process.env && process.env.ISSUED_CALL_CONFIG)
      || (raw && raw.config && raw.config.env && raw.config.env.ISSUED_CALL_CONFIG)
      || process.argv[2]
      || "";
    const cfg = envStr ? JSON.parse(envStr) : ((raw && raw.config) ? raw.config : {});
    const res = gradeIssuedToolCalls(raw ? raw.trajectory : { events: [] }, cfg);
    process.stdout.write(JSON.stringify(res));
  });
}
`;

const VALLY_CONFIG_YAML = `metadata:
  project: contoso-node-sandbox
  track: track5-enterprise-harness
  lab: lab27

paths:
  skills:
    - ".github/skills"
  evals:
    - "evals"
  results: "vally-results"
  evalFilenames:
    - "eval.yaml"
    - "eval.yml"

params:
  MODEL: "gpt-5-mini"
  EVALS_DIR: "evals"
  RUN_DIR: "vally-results"
  AGENTS_DIR: ".github/agents"

suites:
  pr-gate:
    description: "Fast hermetic P0 reviewer-routing and skill-trigger checks for pull requests"
    evals:
      - "evals/hermetic/*/eval.yaml"
    filter:
      priority: "p0"
  full:
    description: "All hermetic agent-routing and skill-trigger evaluations"
    evals:
      - "evals/hermetic/*/eval.yaml"
  pr-gate-guards:
    description: "Fast P0 preToolUse hook guard evaluations"
    evals:
      - "evals/guards/*/eval.yaml"
    filter:
      priority: "p0"
  full-guards:
    description: "All deterministic preToolUse guard evaluations"
    evals:
      - "evals/guards/*/eval.yaml"
`;

const REVIEWER_ROUTING_EVAL_YAML = `name: contoso-reviewer-routing
description: "Verify Contoso Node sandbox agent routing and skill activation"
version: "1.0.0"
type: capability

grading_environment:
  files:
    - src: "../../../.github/evals/graders/tool-calls-issued.mjs"
      dest: ".vally-grading/graders/tool-calls-issued.mjs"

defaults:
  model: "gpt-5-mini"
  timeout: "2m"
  runs: 1

scoring:
  threshold: 1.0
  weights:
    program: 1.0

stimuli:
  - name: route-pr-diff-to-code-reviewer
    prompt: "Review the pull request diff in src/routes/courses.ts and tests/courses.test.ts for logic bugs using code-reviewer and contoso-testing without editing files."
    tags:
      priority: "p0"
      kind: "positive"
    constraints:
      max_agent_duration: "30s"
      max_turns: 4
    graders:
      - type: program
        name: check-code-reviewer-dispatch
        config:
          program: "node"
          args:
            - ".vally-grading/graders/tool-calls-issued.mjs"
          env:
            ISSUED_CALL_CONFIG: '{"requiredAgents":["code-reviewer"],"forbiddenAgents":["contoso-dev"],"requiredSkills":["contoso-testing"],"forbiddenTools":["create","edit"],"forbiddenArgSubstrings":[{"toolName":"bash","substring":"git push"}]}'

  - name: negative-direct-read-no-mutation-or-push
    prompt: "Read src/entities/course.ts and report the Course properties without dispatching contoso-dev, editing files, or running git push."
    tags:
      priority: "p0"
      kind: "negative"
    constraints:
      max_agent_duration: "30s"
      max_turns: 3
    graders:
      - type: program
        name: check-negative-no-mutation-or-push
        config:
          program: "node"
          args:
            - ".vally-grading/graders/tool-calls-issued.mjs"
          env:
            ISSUED_CALL_CONFIG: '{"forbiddenAgents":["contoso-dev","code-reviewer"],"forbiddenTools":["create","edit"],"forbiddenArgSubstrings":[{"toolName":"bash","substring":"git push"}]}'
`;

const BRIDGE_SNIPPET = `# AgentEvals EVAL.yaml (v1.0): evaluators live under top-level assert:
name: contoso-agent-and-skill-evals
version: "1.0"
assert:
  - name: issued_tool_calls
    type: tool_trajectory
    required: true
  - name: routing_budget
    type: execution_metrics
    max_duration_ms: 30000
tests:
  - id: route-pr-diff-to-code-reviewer
    input: "Review the pull request diff in src/routes/courses.ts"

# What an OpenTelemetry-native evaluator emits for that test: a log event
# attached to the invoke_agent span from Lab 25's span tree
event_name:                    gen_ai.evaluation.result
gen_ai.evaluation.name:        issued_tool_calls
gen_ai.evaluation.score.value: 1.0
gen_ai.evaluation.score.label: pass
gen_ai.response.id:            <copied from the span that was scored>

# Cost stays where Lab 25 put it: sum github.copilot.nano_aiu on the ROOT
# invoke_agent span only. Adding its chat children counts every AIU twice.`;

export const lab27: Lab = {
  id: "lab27",
  number: "27",
  title: "Evaluating Agents, Skills, and Models with Vally and AgentEvals",
  tagline:
    "Vally eval specs, issued tool-call program graders, hook guard evals, AgentEvals EVAL.yaml, and OTel evaluation events.",
  steps: [
    {
      key: "lab27/graders",
      title: "Build the issued tool-call and skill-activation program grader",
      kind: "mixed",
      verifyId: "lab27/graders",
      body: (
        <>
          <p>
            Lab 19 scans your agents for drift once a week, and the{" "}
            <code>eval-harness</code> skill gives you the vocabulary (
            <code>[CAPABILITY EVAL]</code>, <code>[REGRESSION EVAL]</code>,{" "}
            <code>pass@k</code> versus <code>pass^k</code>). Neither can fail a
            pull request. <strong>Vally</strong> can: every eval runs the same
            five stages, <code>Stimulus → Executor → Trajectory → Graders →
            Score</code>, and the cheapest grader that can decide is a program
            you can read.
          </p>
          <p>
            Grade what the agent <em>issued</em>, not what completed. A
            stimulus with <code>constraints.max_agent_duration</code> is stopped
            cleanly when its working-time limit expires and its partial work is
            graded as a finished run, so a subagent that was dispatched
            correctly but had not returned yet still has to pass. That means
            reading <code>tool_call</code> and <code>skill_activation</code>{" "}
            events the moment they appear, never waiting for a{" "}
            <code>tool_result</code>. Hooks need the same care:{" "}
            <code>.github/hooks/default.json</code> registers seven handlers and
            none of them blocks <code>git push</code>, and a Copilot trace has no{" "}
            <code>execute_hook</code> span, so a guard has to be proven by a
            deterministic check, not read from documentation.
          </p>
          <table>
            <thead>
              <tr>
                <th>Setting</th>
                <th>Matched against</th>
                <th>In the Node sandbox</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>requiredAgents</code> / <code>forbiddenAgents</code>
                </td>
                <td>
                  <code>tool_call</code> <code>launchedAgentIds</code>,{" "}
                  <code>agentId</code>, or the serialized arguments
                </td>
                <td>
                  <code>code-reviewer</code>, <code>contoso-dev</code>,{" "}
                  <code>contoso-qa</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>requiredSkills</code> / <code>forbiddenSkills</code>
                </td>
                <td>
                  <code>skill_activation</code> <code>data.name</code>
                </td>
                <td>
                  <code>contoso-testing</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>requiredTools</code> / <code>forbiddenTools</code>
                </td>
                <td>
                  <code>tool_call</code> <code>data.toolName</code>
                </td>
                <td>
                  <code>create</code>, <code>edit</code>, <code>bash</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>requiredArgSubstrings</code> /{" "}
                  <code>forbiddenArgSubstrings</code>
                </td>
                <td>the text of one named tool&apos;s arguments</td>
                <td>
                  <code>git push</code> on <code>bash</code>; files under{" "}
                  <code>src/entities</code>, <code>src/repos</code>,{" "}
                  <code>src/routes</code> and <code>tests/</code>
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Create the grader in the workspace and click <strong>Verify</strong>.
            The server runs your <code>gradeIssuedToolCalls(trajectory,
            config)</code> in a bounded VM against three trajectories: a
            subagent dispatched and a skill activated but cut off before any{" "}
            <code>tool_result</code> (must pass), a run that never dispatched
            the required agent (must fail), and a run that issued{" "}
            <code>git push</code> (must fail).
          </p>
          <FileCard
            path=".github/evals/graders/tool-calls-issued.mjs"
            content={ISSUED_GRADER_MJS}
            label=".github/evals/graders/tool-calls-issued.mjs"
          />
        </>
      ),
    },
    {
      key: "lab27/eval-spec",
      title:
        "Configure .vally.yaml, stage grading_environment, and run vally lint, eval, and grade",
      kind: "sim",
      verifyId: "lab27/eval-spec",
      body: (
        <>
          <Note tone="sim">
            <strong>Simulated.</strong> The Vally CLI is simulated in the bench
            terminal (every line is badged). It is not canned, though:{" "}
            <code>vally lint</code>, <code>vally eval</code> and{" "}
            <code>vally grade</code> read your real <code>.vally.yaml</code> and{" "}
            <code>eval.yaml</code>, run <em>your</em>{" "}
            <code>tool-calls-issued.mjs</code> against each stimulus, and write{" "}
            <code>vally-results/2026-11-24T15-00-00Z/results.jsonl</code>. Break
            your grader and the simulated run fails too.
          </Note>
          <p>
            <code>.vally.yaml</code> tells Vally where everything is:{" "}
            <code>paths</code>, the <code>params</code> an eval can use as{" "}
            <code>{"${KEY}"}</code> (<code>MODEL</code>, <code>RUN_DIR</code>) and the
            named <code>suites</code>. Each suite&apos;s <code>filter</code> picks
            stimuli by tag, so <code>pr-gate</code> runs only the P0 ones. The
            eval itself stages your grader through{" "}
            <code>grading_environment</code>, never through the agent&apos;s
            environment, so the agent cannot read or edit the code that judges
            it. <code>scoring.threshold: 1.0</code> turns any failed check into
            a failed trial.
          </p>
          <p>
            Every eval needs two halves. The positive stimulus fails an agent
            that never routes to <code>code-reviewer</code>; the negative one
            fails an agent that sends everything everywhere. A negative stimulus
            passes for an agent that does nothing, so it proves nothing alone.
            Offline <code>vally grade</code> re-grades saved trajectories from
            standard input with no agent and no model. Its{" "}
            <code>--workspace .</code> flag points file-based graders at a real
            folder and overrides every trajectory&apos;s recorded{" "}
            <code>workDir</code>; the grader here reads only the trajectory, so
            the flag changes nothing but the warning it prints.
          </p>
          <FileCard
            path=".vally.yaml"
            content={VALLY_CONFIG_YAML}
            label=".vally.yaml"
          />
          <FileCard
            path="evals/hermetic/reviewer-routing/eval.yaml"
            content={REVIEWER_ROUTING_EVAL_YAML}
            label="evals/hermetic/reviewer-routing/eval.yaml"
          />
          <Cmd
            label="Lint, evaluate, and re-grade in the bench terminal"
            lines={[
              "vally --version",
              "vally lint -e evals/hermetic/reviewer-routing/eval.yaml --strict",
              "vally eval --suite pr-gate",
              "vally grade -e evals/hermetic/reviewer-routing/eval.yaml --workspace . < vally-results/2026-11-24T15-00-00Z/results.jsonl",
            ]}
          />
        </>
      ),
    },
    {
      key: "lab27/agentevals-otel",
      title:
        "Bridge Vally, AgentEvals EVAL.yaml v1.0, and Lab 25 OpenTelemetry evaluation events",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Three different things share the name &ldquo;AgentEvals&rdquo;, and
            only one of them is a trace evaluator:
          </p>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>What it is</th>
                <th>What to remember</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Vally</strong>
                </td>
                <td>
                  <code>eval.yaml</code> in, <code>results.jsonl</code> and{" "}
                  <code>otel-spans.jsonl</code> out
                </td>
                <td>
                  Gates a trial on one score against one threshold. It emits no{" "}
                  <code>gen_ai.evaluation.result</code> event itself
                </td>
              </tr>
              <tr>
                <td>
                  <strong>agentevals.io</strong>
                </td>
                <td>
                  The declarative <code>EVAL.yaml</code> v1.0 specification:{" "}
                  <code>name</code>, <code>version</code>, <code>assert</code>,{" "}
                  <code>tests</code>
                </td>
                <td>
                  Seven headline evaluator types, twelve in the reference;{" "}
                  <code>assert:</code> supersedes the deprecated{" "}
                  <code>execution.evaluators</code>; its schema URL returns 404;
                  the &ldquo;canonical implementation&rdquo; (AgentV) is archived
                </td>
              </tr>
              <tr>
                <td>
                  <strong>agentevals-dev/agentevals</strong>
                </td>
                <td>
                  An unrelated, OpenTelemetry-native tool that scores recorded
                  traces
                </td>
                <td>
                  Emits <code>gen_ai.evaluation.result</code> log events carrying{" "}
                  <code>gen_ai.evaluation.name</code>,{" "}
                  <code>gen_ai.evaluation.score.value</code>,{" "}
                  <code>gen_ai.evaluation.score.label</code> and{" "}
                  <code>gen_ai.response.id</code>
                </td>
              </tr>
            </tbody>
          </table>
          <Snippet title="AgentEvals EVAL.yaml and OTel gen_ai.evaluation.result bridge">
            {BRIDGE_SNIPPET}
          </Snippet>
          <Quiz
            stepKey="lab27/agentevals-otel"
            question="When bridging Vally trial runs, AgentEvals EVAL.yaml specs, and Lab 25 OpenTelemetry traces, how do evaluation results and AIU cost relate on the trace?"
            options={[
              "An evaluation event replaces the AIU attribute, so cost is read from the gen_ai.evaluation.result event instead of the span",
              "The gen_ai.evaluation.result log event attaches the score and label to the invoke_agent (or chat) span it judged, while AIU cost is still summed from the root invoke_agent span only, because adding its chat children counts every AIU twice",
              "Vally writes gen_ai.evaluation.result events into otel-spans.jsonl automatically, so no cost rule and no separate evaluator is needed",
            ]}
            correct={1}
            explain="An evaluation event is a result attached to a span, not a cost record. Lab 25's rule is unchanged: a root invoke_agent span already totals its chat children, so only the root is summed."
          />
          <Note>
            <strong>Track 5 &amp; Series Complete!</strong> All 27 labs across 5
            learning tracks — from core customizations and cloud agents to
            multi-agent orchestration, enterprise governance, and the end-to-end
            agentic SDLC harness with Vally and AgentEvals evaluation gates.
          </Note>
        </>
      ),
    },
  ],
};
