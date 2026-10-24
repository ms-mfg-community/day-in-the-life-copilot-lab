import { bridge } from "./copilot-bridge.js";
import {
  fileExists,
  parseFrontmatter,
  readMcpConfig,
  readWorkspaceFile,
} from "./sandbox.js";
import { commandHistory } from "./sim-terminal.js";
import { installedPlugins } from "./sim-registry.js";

export interface VerifyResult {
  pass: boolean;
  message: string;
}

type Check = () => VerifyResult;

const pass = (message: string): VerifyResult => ({ pass: true, message });
const fail = (message: string): VerifyResult => ({ pass: false, message });

function ranCommand(pattern: RegExp, mode?: "shell" | "copilot"): boolean {
  return commandHistory.some(
    (c) => (mode ? c.mode === mode : true) && pattern.test(c.line),
  );
}

const checks: Record<string, Check> = {
  // ---------------------------------------------------------------- Lab 01
  "lab01/explore": () => {
    if (
      ranCommand(
        /^(ls|tree|cat|head)\b.*\.github\/(agents|skills|instructions)/,
      ) ||
      ranCommand(/^(cat|head)\b.*copilot-instructions\.md/) ||
      ranCommand(/^tree\b.*\.github/)
    ) {
      return pass(
        "You explored the configuration ecosystem from the terminal.",
      );
    }
    return fail(
      "Run one of the exploration commands in the terminal first — try `ls .github/agents` or `cat .github/agents/planner.agent.md`.",
    );
  },
  "lab01/marketplace": () => {
    const installed = installedPlugins();
    if (installed.length > 0) {
      return pass(
        `Plugin installed: ${installed.map((p) => p.name).join(", ")}. Confirm it with \`copilot plugin list\`.`,
      );
    }
    return fail(
      "No plugin installed yet. Browse with `copilot plugin marketplace browse awesome-copilot`, then `copilot plugin install awesome-copilot@awesome-copilot`.",
    );
  },
  "lab01/try-planner": () => {
    const hit = bridge.promptHistory.find((p) => p.agent === "planner");
    if (hit)
      return pass(
        "The planner agent answered using the workspace's configuration files.",
      );
    return fail(
      "Select the planner first (`/agent planner` inside a session, or run `copilot --agent planner`), then ask it a question.",
    );
  },

  // ---------------------------------------------------------------- Lab 02
  "lab02/repo-rules": () => {
    if (!fileExists(".github/copilot-instructions.md"))
      return fail(
        "`.github/copilot-instructions.md` is missing from the workspace.",
      );
    const content = readWorkspaceFile(".github/copilot-instructions.md");
    if (
      /ContosoUniversity Conventions/i.test(content) &&
      /repository pattern/i.test(content)
    ) {
      return pass(
        "The conventions section is in copilot-instructions.md — every new session will load it.",
      );
    }
    return fail(
      "copilot-instructions.md doesn't contain the `## ContosoUniversity Conventions` section yet. Add it in the Files tab (or use Insert for me).",
    );
  },
  "lab02/path-rule": () => {
    const path = ".github/instructions/routes.instructions.md";
    if (!fileExists(path))
      return fail(
        `Create \`${path}\` first — the Files tab has the content ready to insert.`,
      );
    const { data } = parseFrontmatter(readWorkspaceFile(path));
    if (!data.applyTo)
      return fail(
        "The file exists but its frontmatter has no `applyTo:` glob — Copilot would never load it.",
      );
    if (!data.description)
      return fail(
        "Add a `description:` line to the frontmatter so the file documents itself.",
      );
    return pass(
      `Path-specific rule created. It loads only when files matching ${data.applyTo} are in context.`,
    );
  },
  "lab02/agents-md": () => {
    if (!fileExists("AGENTS.md"))
      return fail("AGENTS.md is missing from the workspace.");
    const content = readWorkspaceFile("AGENTS.md");
    if (/ADR-001/.test(content) && /Architecture Decisions/i.test(content)) {
      return pass(
        "ADR-001 recorded in AGENTS.md — context, not rules, exactly where it belongs.",
      );
    }
    return fail(
      "AGENTS.md doesn't contain the `ADR-001` architecture decision record yet.",
    );
  },
  "lab02/reload": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No Copilot session is running. Start one in the terminal with `copilot`.",
      );
    const loaded = meta.instructionSnapshot.some(
      (s) => s.exists && s.path.endsWith("routes.instructions.md"),
    );
    if (!loaded) {
      return fail(
        "The running session started before routes.instructions.md existed. Restart it (`/new`, or `/exit` then `copilot`) so the discovery pass re-reads the workspace.",
      );
    }
    if (!ranCommand(/^\/instructions/, "copilot")) {
      return fail(
        "The session sees the new file — now prove it deterministically: run `/instructions` inside the session.",
      );
    }
    return pass(
      "The restarted session discovered your instruction file, and /instructions confirmed it — no guesswork.",
    );
  },

  // ---------------------------------------------------------------- Lab 03
  "lab03/anatomy": () => {
    if (ranCommand(/^(cat|head)\b.*\.github\/agents\/planner\.agent\.md/)) {
      return pass(
        "You read the planner's frontmatter — name, description, tools, then the system prompt.",
      );
    }
    return fail(
      "Read the existing agent first: `head -30 .github/agents/planner.agent.md`.",
    );
  },
  "lab03/create-agent": () => {
    const path = ".github/agents/contoso-dev.agent.md";
    if (!fileExists(path))
      return fail(
        `Create \`${path}\` first — the step card has the full agent body.`,
      );
    const { data, body } = parseFrontmatter(readWorkspaceFile(path));
    if (!data.name || !data.description)
      return fail(
        "The agent file needs `name:` and `description:` in its YAML frontmatter.",
      );
    if (!data.tools)
      return fail(
        "Add a `tools:` list to the frontmatter — without it the agent has no capabilities.",
      );
    if (
      !/##\s*Coding Standards/i.test(body) ||
      !/##\s*Review Checklist/i.test(body)
    ) {
      return fail(
        "The body is incomplete — paste the whole agent prompt, including `## Coding Standards` and `## Review Checklist`.",
      );
    }
    return pass(
      "contoso-dev.agent.md is complete: frontmatter plus a full system prompt.",
    );
  },
  "lab03/select-agent": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No session running. The session discovers agents at start — run `copilot` in the terminal.",
      );
    if (!meta.agents.some((a) => a.name === "contoso-dev")) {
      return fail(
        "The running session doesn't know contoso-dev. Agent files are discovered once at session start — restart with `/new` or `/exit` + `copilot`.",
      );
    }
    if (meta.selectedAgent !== "contoso-dev") {
      return fail(
        "contoso-dev is discovered — now select it: `/agent contoso-dev`.",
      );
    }
    return pass("contoso-dev is live and selected in this session.");
  },
  "lab03/test-agent": () => {
    const hit = bridge.promptHistory.find((p) => p.agent === "contoso-dev");
    if (hit)
      return pass(
        "Your agent answered with its own system prompt steering the response.",
      );
    return fail(
      "With `/agent contoso-dev` selected, ask it to analyze the workspace — for example: `Analyze src/. What entities exist and how do they relate?`",
    );
  },

  // ---------------------------------------------------------------- Lab 04
  "lab04/skill-anatomy": () => {
    if (
      ranCommand(/^(cat|head)\b.*\.github\/skills\/coding-standards\/SKILL\.md/)
    ) {
      return pass(
        "The description field is what drives auto-activation — you just read the one that ships here.",
      );
    }
    return fail(
      "Read the shipped skill's frontmatter first: `head -5 .github/skills/coding-standards/SKILL.md`.",
    );
  },
  "lab04/create-skill": () => {
    const path = ".github/skills/contoso-testing/SKILL.md";
    if (!fileExists(path))
      return fail(
        `Create \`${path}\` first — use the Files tab or Insert for me.`,
      );
    const { data, body } = parseFrontmatter(readWorkspaceFile(path));
    if (data.name !== "contoso-testing")
      return fail(
        "The skill frontmatter must declare `name: contoso-testing`.",
      );
    if (!data.description || data.description.length < 20) {
      return fail(
        "Write a specific `description:` — it is the only thing Copilot reads up-front to decide when the skill applies.",
      );
    }
    if (!/naming convention/i.test(body) || !/createInMemory/i.test(body))
      return fail(
        "The skill body should carry the testing patterns from the step card — the naming convention and the in-memory repo pattern.",
      );
    return pass(
      "contoso-testing/SKILL.md created — a knowledge pack with an activation-worthy description.",
    );
  },
  "lab04/activate": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No session running. Start one with `copilot` so the new skill gets discovered.",
      );
    if (!meta.skills.some((s) => s.name === "contoso-testing")) {
      return fail(
        "The running session loaded before the skill existed. Restart (`/new`) and check `/skills list`.",
      );
    }
    const invoked = bridge.skillInvocations.some(
      (s) => s.name === "contoso-testing",
    );
    if (!invoked) {
      return fail(
        "The skill is loaded — now trigger it: ask `How should I write unit tests for the student repository in src/repos/student-repo.ts?` and watch for the skill chip in the terminal.",
      );
    }
    return pass(
      "Copilot auto-activated contoso-testing from your prompt — that's the skill.invoked event, not a guess.",
    );
  },

  // ---------------------------------------------------------------- Lab 05
  "lab05/inspect": () => {
    if (ranCommand(/^(cat|head)\b.*\.copilot\/mcp-config\.json/)) {
      return pass(
        "That file is the session's MCP wiring: local (stdio subprocess) and http (remote URL) servers.",
      );
    }
    return fail(
      "Inspect the current MCP configuration first: `cat .copilot/mcp-config.json`.",
    );
  },
  "lab05/add-server": () => {
    let servers: Record<string, unknown>;
    try {
      servers = readMcpConfig();
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
    const entry = servers["lab-docs"] as Record<string, unknown> | undefined;
    if (!entry)
      return fail(
        "`.copilot/mcp-config.json` has no `lab-docs` entry yet — add it inside the existing mcpServers object (mind the comma).",
      );
    if (entry.type !== "local")
      return fail(
        'The lab-docs server must be `"type": "local"` — it runs as a stdio subprocess.',
      );
    if (entry.command !== "node")
      return fail(
        'The lab-docs server should be started with `"command": "node"`.',
      );
    return pass(
      "lab-docs is configured. Config loads at session start — restart the session to connect it.",
    );
  },
  "lab05/use-mcp": () => {
    const meta = bridge.getMeta();
    if (!meta)
      return fail(
        "No session running — start one with `copilot` so the new MCP server connects.",
      );
    if (!meta.mcpServers.some((s) => s.name === "lab-docs")) {
      return fail(
        "The running session predates your config change. Restart it (`/new`), then check `/mcp list`.",
      );
    }
    const used = bridge.toolCalls.some((t) =>
      t.toolName.startsWith("lab-docs-"),
    );
    if (!used) {
      return fail(
        "lab-docs is connected — now make Copilot call it: `Use the lab-docs MCP server's get_contoso_fact tool to look up the topic 'data layer'.`",
      );
    }
    return pass(
      "Copilot called a lab-docs tool over MCP — you watched a real tool round-trip.",
    );
  },
  "lab05/lessons": () => {
    if (!fileExists(".copilot/lessons/log.md"))
      return fail("`.copilot/lessons/log.md` is missing from the workspace.");
    const content = readWorkspaceFile(".copilot/lessons/log.md");
    if (/repository pattern/i.test(content) && /in-memory/i.test(content)) {
      return pass(
        "The lesson is in git-trackable markdown — diffable, reviewable, no memory server required.",
      );
    }
    return fail(
      "Ask Copilot to append the lesson from the step card to `.copilot/lessons/log.md`, then verify again.",
    );
  },
};

export function runVerify(id: string): VerifyResult {
  const check = checks[id];
  if (!check) return fail(`Unknown verification id: ${id}`);
  try {
    return check();
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export const VERIFY_IDS = Object.keys(checks);

// Checks for labs 06-20 live in this registry too. They consult the same
// sources: workspace files, terminal history, bridge session state, and the
// simulated GitHub state.
import { loadGitHub } from "./sim-github.js";
import { policyChecks } from "./sim-terminal.js";

const advancedChecks: Record<string, Check> = {
  // ---------------------------------------------------------------- Lab 06
  "lab06/config": () => {
    if (ranCommand(/^(cat|head)\b.*\.github\/hooks\/default\.json/) || ranCommand(/^(cat|head)\b.*scripts\/hooks\//)) {
      return pass("You read the hook registration and a hook script — config in .github/hooks, scripts in scripts/hooks.");
    }
    return fail("Inspect the hook system first: `cat .github/hooks/default.json`, then `cat scripts/hooks/pre-tool-use-secret-scan.sh`.");
  },
  "lab06/create-hook": () => {
    const script = "scripts/hooks/post-tool-use-console-warn.sh";
    if (!fileExists(script)) return fail(`Create \`${script}\` first — the step card has it ready.`);
    if (!fileExists(".github/hooks/default.json")) return fail("`.github/hooks/default.json` is missing.");
    const config = readWorkspaceFile(".github/hooks/default.json");
    if (!config.includes("post-tool-use-console-warn")) {
      return fail("The script exists but isn't registered — add it to the postToolUse array in .github/hooks/default.json.");
    }
    if (!ranCommand(/\|\s*bash\s+scripts\/hooks\/post-tool-use-console-warn\.sh/)) {
      return fail("Registered — now test it by hand: run the `echo '<event json>' | bash " + script + "` card. The script executes for real.");
    }
    return pass("Hook created, registered, and manually tested with a piped event — the exact IPC the runtime uses.");
  },
  "lab06/live": () => {
    const meta = bridge.getMeta();
    if (!meta) return fail("Start a Copilot session (`copilot`) — hooks load from .github/hooks at session start.");
    const fired = bridge.hookFirings.filter((h) => h.at >= meta.startedAt);
    if (fired.length === 0) {
      return fail("No hook has fired in this session yet. Ask Copilot to edit a file (the step card has a prompt) and watch for the hook chips.");
    }
    return pass(`Hooks fired ${fired.length} time(s) in this session — you watched the lifecycle run for real.`);
  },

  // ---------------------------------------------------------------- Lab 07
  "lab07/workers": () => {
    const missing = ["contoso-dev", "contoso-qa", "code-reviewer"].filter(
      (name) => !fileExists(`.github/agents/${name}.agent.md`)
    );
    if (missing.length > 0) {
      return fail(`Missing worker agent(s): ${missing.join(", ")}. The step cards create them (contoso-dev comes from Lab 03).`);
    }
    return pass("All three workers exist: contoso-dev (implements), contoso-qa (tests), code-reviewer (reviews).");
  },
  "lab07/orchestrator": () => {
    const path = ".github/agents/lab-orchestrator.agent.md";
    if (!fileExists(path)) return fail(`Create \`${path}\` first.`);
    const { data, body } = parseFrontmatter(readWorkspaceFile(path));
    if (!data.tools?.includes("agent")) {
      return fail('The orchestrator needs "agent" in its tools list — that is the tool that enables delegation.');
    }
    if (data.tools.includes("edit") || data.tools.includes("execute")) {
      return fail("Drop edit/execute from the orchestrator's tools — it coordinates, it never implements.");
    }
    if (!/Phase/i.test(body)) return fail("Paste the whole body — the five-phase workflow is the system prompt.");
    return pass("Orchestrator defined: agent tool for delegation, no edit/execute, five phases in the prompt.");
  },
  "lab07/delegate": () => {
    const workers = new Set(
      bridge.subagentRuns.filter((r) => ["contoso-dev", "contoso-qa", "code-reviewer"].includes(r.agentName)).map((r) => r.agentName)
    );
    if (workers.size === 0) {
      return fail("No dispatch entries yet. Select the orchestrator (`/agent lab-orchestrator`) and give it the feature request — then watch for subagent chips. Narration alone is not delegation.");
    }
    if (workers.size < 2) {
      return fail(`Only ${[...workers].join(", ")} was dispatched so far. A real pipeline run dispatches at least two workers — let the orchestrator finish, or ask it to continue with the remaining phases.`);
    }
    return pass(`Real delegation observed: ${[...workers].join(" → ")} each ran as its own subagent (dispatch entries, not narration).`);
  },

  // ---------------------------------------------------------------- Lab 08
  "lab08/format": () => {
    if (ranCommand(/^(cat|head)\b.*\.github\/workflows\/generate-prd\.md/)) {
      return pass("Frontmatter = configuration, markdown body = the AI prompt. That file is the whole workflow.");
    }
    return fail("Read the workflow first: `cat .github/workflows/generate-prd.md`.");
  },
  "lab08/compile": () => {
    if (!fileExists(".github/workflows/generate-prd.lock.yml")) {
      return fail("No lock file yet — run `gh aw compile .github/workflows/generate-prd.md`.");
    }
    return pass("Compiled. The .lock.yml is what Actions actually runs — note the branch-filter fence, the read-only agent job, and the pinned actions.");
  },
  "lab08/backlog": () => {
    const issues = loadGitHub().issues.filter((i) => i.state === "open");
    if (issues.length === 0) return fail("Create the feature issue first — the `gh issue create` card seeds your backlog.");
    return pass(`Backlog seeded: ${issues.map((i) => `#${i.number}`).join(", ")}. See it in the GitHub tab → Issues.`);
  },
  "lab08/run": () => {
    const github = loadGitHub();
    const run = github.runs.find((r) => r.workflow === "Generate PRD");
    if (!run) return fail("No workflow run yet. Create a feature/** branch (the Create-a-branch button on the issue, or the git push card).");
    if (run.status !== "completed") return fail("The run is still in progress — watch it in the GitHub tab → Actions.");
    if (run.conclusion !== "success") {
      return fail("The latest run failed — open its log in the Actions view. (Most common cause: 'Allow GitHub Actions to create PRs' is off in Settings.)");
    }
    return pass("The workflow ran: branch filter → activation → a real Copilot agent wrote the PRD → safe_outputs opened the PR.");
  },
  "lab08/review-prd": () => {
    const pr = loadGitHub().pulls.find((p) => p.labels.includes("prd"));
    if (!pr) return fail("No [prd] pull request yet — finish the previous step's workflow run.");
    const prdFile = pr.files[0]?.path;
    if (!prdFile || !fileExists(prdFile)) return fail("The PRD file is missing from the workspace.");
    const prd = readWorkspaceFile(prdFile);
    if (!/user stories/i.test(prd) || !/acceptance criteria/i.test(prd)) {
      return fail("Open the PRD and check it — it should carry User Stories and Acceptance Criteria sections.");
    }
    return pass("PRD reviewed. Check its Related Issues line: an issue number means the agent used your issue; #N/A means branch-name-only.");
  },

  // ---------------------------------------------------------------- Lab 09
  "lab09/ruleset": () => {
    const ruleset = loadGitHub().settings.rulesets.find((r) => r.name === "copilot-code-review");
    if (!ruleset) return fail("Create the `copilot-code-review` ruleset in the GitHub tab → Settings.");
    if (!ruleset.active) return fail("The ruleset exists but Enforcement status is not Active — a ruleset only takes effect once active.");
    if (!ruleset.requirePullRequest || !ruleset.autoRequestCopilotReview) {
      return fail("Check both branch rules: Require a pull request, and Automatically request Copilot code review.");
    }
    if (!ruleset.reviewDrafts) {
      return fail("Turn on 'Review draft pull requests' — the coding agent opens its PR as a draft, and without this option it won't get reviewed.");
    }
    return pass("Ruleset active: every PR to main now gets a Copilot review automatically, drafts included.");
  },
  "lab09/coding-agent": () => {
    const pr = loadGitHub().pulls.find((p) => p.head.startsWith("copilot/") && p.linkedIssue !== undefined);
    if (!pr) {
      return fail("No coding-agent PR yet. Create the issue, then assign Copilot to it (`gh issue edit <n> --add-assignee @copilot`, or the button on the issue).");
    }
    if (pr.files.length === 0) return fail("The PR exists but carries no changes — re-assign the issue for a fresh attempt.");
    return pass(`The coding agent opened PR #${pr.number} with ${pr.files.length} changed file(s) — a real Copilot session implemented your issue.`);
  },
  "lab09/review": () => {
    const pr = loadGitHub().pulls.find((p) => p.head.startsWith("copilot/") && p.reviews.some((r) => r.author === "Copilot"));
    if (!pr) {
      return fail("No Copilot review on the coding-agent PR yet. If the ruleset was active it reviews automatically; otherwise use Request review on the PR.");
    }
    return pass(`PR #${pr.number} has a Copilot review — read it in the GitHub tab. A clean review is a real result too.`);
  },
  "lab09/iterate": () => {
    const pr = loadGitHub().pulls.find((p) => p.comments.some((c) => /@copilot/i.test(c.body)) && p.commits.length >= 2);
    if (!pr) {
      return fail("Drive one iteration: comment on the PR mentioning @copilot with a concrete request, and wait for the agent's new commit.");
    }
    return pass(`The loop closed on PR #${pr.number}: your @copilot comment → the agent pushed commit ${pr.commits.length} → ${loadGitHub().settings.rulesets.some((r) => r.active && r.reviewNewPushes) ? "re-review ran (Review new pushes is on)" : "re-review would run if 'Review new pushes' were on"}.`);
  },

  // ---------------------------------------------------------------- Lab 10
  "lab10/layer1": () => {
    const hit = bridge.promptHistory.find((p) => /todo/i.test(p.prompt));
    if (!hit) return fail("Try the Layer 1 surfaces: send the todos prompt and watch the session SQL store at work.");
    return pass("Layer 1 exercised — plan and todos live one task, in the session's own state, not in the wiki.");
  },
  "lab10/wiki": () => {
    if (!fileExists(".copilot/lessons/log.md")) return fail("`.copilot/lessons/log.md` is missing.");
    const log = readWorkspaceFile(".copilot/lessons/log.md");
    if (!/^## \d{4}-\d{2}-\d{2}/m.test(log)) {
      return fail("No dated lesson entry in log.md yet — send the append-a-lesson prompt from the step card.");
    }
    if (!bridge.promptHistory.some((p) => /\.copilot\/lessons/.test(p.prompt) && /check|learned|what/i.test(p.prompt))) {
      return fail("The lesson landed — now prove recall: restart the session (/new) and ask the recall question from the card.");
    }
    return pass("A fresh session read a lesson an earlier session wrote — markdown memory, no server.");
  },
  "lab10/schema": () => {
    if (!fileExists(".github/instructions/repos.instructions.md")) {
      return fail("Create `.github/instructions/repos.instructions.md` first — the schema rule the scaffold test depends on.");
    }
    const created = ["src/repos/in-memory-course-repo.ts", "src/repos/course-repo.ts"].some((p) => fileExists(p));
    if (!created) {
      return fail("Rule in place — now restart (/new) and ask Copilot to scaffold a CourseRepo. Watch whether it also creates the test unprompted: that is Layer 3 firing.");
    }
    return pass("Copilot scaffolded the repository — and the schema rule you wrote steered what it created without being in your prompt.");
  },
  "lab10/consolidate": () => {
    if (!fileExists(".copilot/lessons/log.md")) return fail("`.copilot/lessons/log.md` is missing.");
    const log = readWorkspaceFile(".copilot/lessons/log.md");
    if (!/Promoted to:\s*[^\s<\n][^\n]*/.test(log)) {
      return fail("No promotion recorded yet. Run the dry run first, then the live consolidation prompt — it fills in `Promoted to:` and updates the index.");
    }
    return pass("Consolidation ran: the log entry is promoted, the index gained its bullet. Weekly, this is one cheap prompt.");
  },

  // ---------------------------------------------------------------- Lab 11
  "lab11/scaffold": () => {
    if (!fileExists("my-plugin/manifest.yaml")) return fail("Create `my-plugin/manifest.yaml` first — the plugin's manifest.");
    const manifest = readWorkspaceFile("my-plugin/manifest.yaml");
    if (!/^name:/m.test(manifest) || !/^version:/m.test(manifest)) {
      return fail("The manifest needs at least `name:` and `version:`.");
    }
    if (!fileExists("my-plugin/agents/greeter.agent.md")) {
      return fail("Add the bundled agent at `my-plugin/agents/greeter.agent.md` — a plugin ships components, not commands.");
    }
    const installed = installedPlugins().some((p) => p.marketplace.startsWith("local:"));
    if (!installed) return fail("Now install it: `copilot plugin install ./my-plugin`, then `copilot plugin list`.");
    return pass("Plugin scaffolded and installed from a local source — the same shape a private org registry serves.");
  },
  "lab11/policy": () => {
    if (!fileExists("my-plugin/org-policy.yaml")) return fail("Create `my-plugin/org-policy.yaml` — the deny-by-default allowlist.");
    const policy = readWorkspaceFile("my-plugin/org-policy.yaml");
    if (!/default_action:\s*deny/.test(policy)) return fail("The policy must declare `default_action: deny` — allow-by-default is not a policy.");
    const allowed = policyChecks.some((c) => c.allowed);
    const denied = policyChecks.some((c) => !c.allowed);
    if (!allowed || !denied) {
      return fail("Evaluate both sides: `policy check contoso-internal/anything` should allow, `policy check random-user/untrusted` should deny.");
    }
    return pass("Deny-by-default verified in both directions. Remember: require: lines are declared intent — enforce signing/SBOM in the release pipeline.");
  },

  // ---------------------------------------------------------------- Lab 12
  "lab12/wire": () => {
    let servers: Record<string, unknown>;
    try {
      servers = readMcpConfig();
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
    if (!servers["fabric-sim"]) {
      return fail("Add the `fabric-sim` entry to `.copilot/mcp-config.json` — the offline Fabric simulator ships at .copilot/mcp/fabric-sim.mjs.");
    }
    const meta = bridge.getMeta();
    if (!meta?.mcpServers.some((s) => s.name === "fabric-sim")) {
      return fail("Config is in place — restart the session (/new) so it connects, then check `/mcp show fabric-sim`.");
    }
    return pass("fabric-sim connected: real MCP wiring, offline fixture data — exactly the lab's offline path.");
  },
  "lab12/query": () => {
    if (!bridge.toolCalls.some((t) => t.toolName.startsWith("fabric-sim-"))) {
      return fail("Make Copilot call the data plane: ask it to list lakehouses with fabric-sim and query gold_enrollment_stats.");
    }
    return pass("Copilot queried the lakehouse over MCP — the data plane answered without a tenant or a network.");
  },

  // ---------------------------------------------------------------- Lab 13
  "lab13/critic": () => {
    const path = ".github/agents/critic.agent.md";
    if (!fileExists(path)) return fail(`Create the read-only critic at \`${path}\` first.`);
    const { data } = parseFrontmatter(readWorkspaceFile(path));
    if (data.tools?.includes("edit") || data.tools?.includes("execute")) {
      return fail("The critic must be read-only — drop edit/execute from its tools. Opposing incentives need a narrower allowlist.");
    }
    if (!bridge.subagentRuns.some((r) => r.agentName === "critic")) {
      return fail("Critic defined — now run the two-role flow (restart first so the critic is discovered) and watch for its dispatch chip.");
    }
    return pass("Implementer and critic both ran as separate dispatches — two roles, opposing incentives, one auditable transcript.");
  },

  // ---------------------------------------------------------------- Lab 14
  "lab14/handoff": () => {
    if (!fileExists(".copilot/handoff.md")) {
      return fail("No handoff yet — ask Copilot to follow .github/skills/handoff/SKILL.md and save to .copilot/handoff.md.");
    }
    const handoff = readWorkspaceFile(".copilot/handoff.md");
    if (!/fresh context prompt/i.test(handoff)) {
      return fail("The handoff is missing its Fresh Context Prompt section — that paragraph is what a successor session runs on.");
    }
    const meta = bridge.getMeta();
    const resumed = meta && bridge.promptHistory.some((p) => p.at >= meta.startedAt && /handoff/i.test(p.prompt));
    if (!resumed) {
      return fail("Handoff written — now prove it works: restart (/new) and ask the fresh session to resume from .copilot/handoff.md.");
    }
    return pass("A fresh session resumed from the handoff file — the orchestrator cycle's clear step, survived.");
  },

  // ---------------------------------------------------------------- Lab 15
  "lab15/fallback": () => {
    const prompt = bridge.promptHistory.find((p) => /displayName/.test(p.prompt));
    if (!prompt) return fail("Send the find-references prompt from the card and watch which tools Copilot reaches for.");
    const textSearch = bridge.toolCalls.some((t) => t.at >= prompt.at && /grep|glob|search/i.test(t.toolName));
    if (!textSearch) {
      return fail("Watch the tool chips on that reply — the point is observing which search layer answered.");
    }
    return pass("You watched the fallback: with no language server configured, Copilot used text search (grep/glob). An LSP would answer those queries from the symbol graph instead.");
  },

  // ---------------------------------------------------------------- Lab 16
  "lab16/managed": () => {
    const path = "enterprise/managed-settings.json";
    if (!fileExists(path)) return fail(`Create \`${path}\` — the step card has the five-key example.`);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(readWorkspaceFile(path)) as Record<string, unknown>;
    } catch {
      return fail("The file is not valid JSON.");
    }
    if (!Array.isArray(parsed.strictKnownMarketplaces)) {
      return fail("`strictKnownMarketplaces` must be an ARRAY of marketplace objects — `true` is the most common mistake this lab exists to prevent.");
    }
    const extra = parsed.extraKnownMarketplaces as Record<string, unknown> | undefined;
    if (!extra || Array.isArray(extra)) {
      return fail("`extraKnownMarketplaces` is a named-object map (each entry has a source object), not a list of strings.");
    }
    const permissions = parsed.permissions as Record<string, unknown> | undefined;
    if (permissions?.disableBypassPermissionsMode !== "disable") {
      return fail('`disableBypassPermissionsMode` is nested under `permissions` and string-valued: `"disable"`.');
    }
    return pass("Every key in its correct shape — the shapes are where real rollouts go wrong, and yours are right.");
  },

  // ---------------------------------------------------------------- Lab 18
  "lab18/spec": () => {
    if (!fileExists("docs/specs/course-prerequisites.md")) {
      return fail("No spec yet — send the card's prompt and let Copilot write docs/specs/course-prerequisites.md.");
    }
    const spec = readWorkspaceFile("docs/specs/course-prerequisites.md");
    if (!/acceptance criteria/i.test(spec)) return fail("The spec needs an explicit Acceptance Criteria section — that is what makes it a spec, not an issue.");
    return pass("Spec written, acceptance-criteria-first — before any code exists.");
  },
  "lab18/prd": () => {
    const github = loadGitHub();
    if (!github.branches.includes("feature/course-prerequisites")) {
      return fail("Push the spec branch: `git push origin main:feature/course-prerequisites` — the PRD workflow fires on branch creation.");
    }
    const run = github.runs.find((r) => r.branch === "feature/course-prerequisites" && r.conclusion === "success");
    if (!run) return fail("The branch exists — wait for (or re-check) its Generate PRD run in the Actions view.");
    return pass("Spec → PRD pipeline ran. Remember: the workflow never read your spec file — its PRD is an independent check on your criteria.");
  },
  "lab18/stack": () => {
    const pulls = loadGitHub().pulls.filter((p) => p.state === "open");
    const stacked = pulls.find((p) => p.base !== "main" && pulls.some((q) => q.head === p.base));
    if (!stacked) {
      return fail("Build the two-layer stack: layer 1 targets main; layer 2's --base is layer 1's BRANCH, not main. The cards have both commands.");
    }
    return pass(`Stack built: #${stacked.number} targets '${stacked.base}' — each layer reviewable on its own, mergeable as a cascade.`);
  },
  "lab18/layer-review": () => {
    const reviewed = loadGitHub().pulls.find(
      (p) => p.head.startsWith("feature/course-prereqs") && p.reviews.some((r) => r.author === "Copilot")
    );
    if (!reviewed) {
      return fail("Request a Copilot review on layer 1's PR (the Request review button). Each stack layer is an ordinary PR — review it before building on it.");
    }
    return pass(`Layer PR #${reviewed.number} got its own review — feedback caught before the next layer assumes the wrong shape.`);
  },

  // ---------------------------------------------------------------- Lab 19
  "lab19/workflow": () => {
    const path = ".github/workflows/self-improving-agents.md";
    if (!fileExists(path)) return fail(`Create \`${path}\` — the card has the portable workflow.`);
    const workflow = readWorkspaceFile(path);
    if (!/agents_dir/.test(workflow)) return fail("Keep the Portability config block (agents_dir, skills_dir, …) — it is what makes the workflow reusable.");
    if (!fileExists(".github/workflows/self-improving-agents.lock.yml")) {
      return fail("Now compile it: `gh aw compile .github/workflows/self-improving-agents.md`.");
    }
    return pass("Workflow authored and compiled — bounded, draft-only, and forbidden from editing itself.");
  },
  "lab19/dryrun": () => {
    if (!bridge.promptHistory.some((p) => /drift/i.test(p.prompt))) {
      return fail("Rehearse locally first: send the drift-evaluator prompt and review its report before any scheduled run.");
    }
    return pass("Dry run reviewed — you judged the drift report before letting any automation act on it. That order is the pattern.");
  },
};

Object.assign(checks, advancedChecks);
