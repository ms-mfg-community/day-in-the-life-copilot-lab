import { Cmd, FileCard, Note, PromptCard, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

// One hooks file, three hook types — an illustration for the "hook types"
// step. Display-only: Lab Studio never registers it (a command preToolUse
// registration whose script goes missing denies every matching tool call).
const HOOK_TYPES_EXAMPLE = `{
  "version": 1,
  "hooks": {
    "sessionStart": [
      { "type": "prompt", "prompt": "Summarize the git status of this repository" }
    ],
    "preToolUse": [
      {
        "type": "command",
        "exec": "node",
        "args": ["scripts/hooks/guard-env.mjs"],
        "matcher": "edit|create|write|apply_patch",
        "timeoutSec": 5
      }
    ],
    "postToolUse": [
      {
        "type": "http",
        "url": "https://audit.example.com/copilot-hooks",
        "headers": { "X-Source": "copilot-cli" },
        "allowedEnvVars": ["AUDIT_TOKEN"],
        "timeoutSec": 10
      }
    ]
  }
}
`;

const CONSOLE_WARN_HOOK = `#!/usr/bin/env bash
# postToolUse hook: warn when an edited TypeScript file contains console.log.
# The event arrives as JSON on stdin — NOT env vars. (The workshop repo
# parses with jq; the studio's scripts use node so nothing extra installs.)

INPUT="$(cat)"

FILE=$(printf '%s' "$INPUT" | node -e '
let raw = "";
process.stdin.on("data", (d) => (raw += d)).on("end", () => {
  let e = {}; try { e = JSON.parse(raw); } catch {}
  const tool = e.toolName ?? "";
  if (!["edit", "create", "write"].includes(tool)) return;
  const args = e.toolArgs ?? {};
  const file = args.file_path ?? args.path ?? "";
  if (/\\.(ts|tsx)$/.test(file)) console.log(file);
});')

[ -z "$FILE" ] && exit 0

if grep -n "console\\.log" "$FILE" >/dev/null 2>&1; then
  echo "⚠ console.log found in $FILE — this project forbids it (copilot-instructions)."
else
  echo "✓ $FILE clean of console.log"
fi
exit 0
`;

const HOOKS_JSON_BOTH = `{
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "./scripts/hooks/pre-tool-use-secret-scan.sh",
        "timeoutSec": 10,
        "comment": "Block file changes that contain hardcoded secrets"
      }
    ],
    "postToolUse": [
      {
        "type": "command",
        "bash": "./scripts/hooks/post-tool-use-console-warn.sh",
        "timeoutSec": 10,
        "comment": "Warn when an edited TypeScript file contains console.log"
      }
    ]
  }
}
`;

const MATCHING_EVENT = `echo '{"sessionId":"smoke","timestamp":1,"cwd":".","toolName":"edit","toolArgs":{"file_path":"src/routes/students.ts"},"toolResult":{"resultType":"ok"}}' | bash scripts/hooks/post-tool-use-console-warn.sh`;

const NON_MATCHING_EVENT = `echo '{"toolName":"bash","toolArgs":{"command":"ls"},"cwd":"."}' | bash scripts/hooks/post-tool-use-console-warn.sh`;

export const lab06: Lab = {
  id: "lab06",
  number: "06",
  title: "Hooks",
  tagline:
    "Lifecycle guardrails: learn all 15 hook events and the three hook types in any language, write a postToolUse hook, watch it fire on a live session — then learn to see what Copilot did.",
  steps: [
    {
      key: "lab06/config",
      title: "The hook configuration",
      kind: "mixed",
      verifyId: "lab06/config",
      body: (
        <>
          <p>
            Hooks are scripts that run automatically at specific points in the
            Copilot lifecycle — guardrails and automation that don't depend on
            the model deciding to cooperate. The registration lives in{" "}
            <code>.github/hooks/default.json</code>; the scripts live in{" "}
            <code>scripts/hooks/</code>:
          </p>
          <Cmd
            lines={[
              "cat .github/hooks/default.json",
              "cat scripts/hooks/pre-tool-use-secret-scan.sh",
            ]}
          />
          <p>
            This workspace's <code>default.json</code> registers one hook so far
            — a <code>preToolUse</code> secret scan; you'll add a{" "}
            <code>postToolUse</code> hook below. The table shows four of
            Copilot's 15 lifecycle events, the ones the workshop's own hooks
            use. It is <strong>non-exhaustive</strong>: open the deep dive under
            it for all 15.
          </p>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>When it fires</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>userPromptSubmitted</code>
                </td>
                <td>After the user sends a message</td>
              </tr>
              <tr>
                <td>
                  <code>preToolUse</code>
                </td>
                <td>
                  Before Copilot executes a tool — can <strong>block</strong> it
                </td>
              </tr>
              <tr>
                <td>
                  <code>postToolUse</code>
                </td>
                <td>After a tool finishes — verification, formatting</td>
              </tr>
              <tr>
                <td>
                  <code>errorOccurred</code>
                </td>
                <td>When an error happens</td>
              </tr>
            </tbody>
          </table>
          <details open>
            <summary>Deep dive: all 15 hook lifecycle interrupts</summary>
            <p>
              Copilot defines <strong>15 hook lifecycle events</strong>. Think
              of them as <em>interrupts</em>: each is a point where Copilot
              hands control to your hook so it can look, decide or add context.
              Most run synchronously and make the agent wait;{" "}
              <code>notification</code> is fire-and-forget and never blocks.{" "}
              <strong>Fourteen</strong> are listed in GitHub's{" "}
              <code>hooks-reference</code> (the <code>#hook-events</code>{" "}
              table). The fifteenth, <code>preMcpToolCall</code>, is documented
              only in the Copilot CLI's built-in documentation — the CLI build
              setting <code>hooks.preMcpToolCall</code> — and is not in the
              hooks reference's event table.
            </p>
            <p>
              Write an event name in camelCase (<code>preToolUse</code>) to get
              a camelCase payload, or in PascalCase (<code>PreToolUse</code>) to
              get the VS Code and Claude compatible snake_case payload. Only 11
              events document a PascalCase alias, shown in brackets below;{" "}
              <code>userPromptTransformed</code>, <code>preMcpToolCall</code>,{" "}
              <code>subagentStart</code> and <code>notification</code> have
              none, so always write those four in camelCase.
            </p>
            <p>
              <strong>Session interrupts</strong>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Event (alias)</th>
                  <th>Fires when</th>
                  <th>A hook can</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>sessionStart</code> (<code>SessionStart</code>)
                  </td>
                  <td>A new or resumed session begins</td>
                  <td>
                    Add context with <code>additionalContext</code> (up to 10
                    MiB accumulated across matching hooks), or auto-submit a
                    prompt with a <code>"type": "prompt"</code> hook
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>preCompact</code> (<code>PreCompact</code>)
                  </td>
                  <td>Just before manual or automatic context compaction</td>
                  <td>
                    Observe only — it can't block compaction. A{" "}
                    <code>matcher</code> picks <code>manual</code> or{" "}
                    <code>auto</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>notification</code> (no alias)
                  </td>
                  <td>
                    The CLI emits a system notification — a finished background
                    shell, an idle agent, a permission prompt
                  </td>
                  <td>
                    Inject <code>additionalContext</code> as a user message.
                    Fire-and-forget: it never blocks, and it doesn't fire in the
                    cloud agent
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>errorOccurred</code> (<code>ErrorOccurred</code>)
                  </td>
                  <td>
                    An error occurs. The reference lists four contexts (
                    <code>model_call</code>, <code>tool_execution</code>,{" "}
                    <code>system</code>, <code>user_input</code>); the CLI's own
                    setting text says it runs when a model call fails
                  </td>
                  <td>Log or notify only</td>
                </tr>
                <tr>
                  <td>
                    <code>sessionEnd</code> (<code>SessionEnd</code>)
                  </td>
                  <td>
                    The session ends: <code>complete</code>, <code>error</code>,{" "}
                    <code>abort</code>, <code>timeout</code> or{" "}
                    <code>user_exit</code>
                  </td>
                  <td>Clean up or log only</td>
                </tr>
              </tbody>
            </table>
            <p>
              <strong>Turn and prompt interrupts</strong>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Event (alias)</th>
                  <th>Fires when</th>
                  <th>A hook can</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>userPromptSubmitted</code> (
                    <code>UserPromptSubmit</code>)
                  </td>
                  <td>The user submits a prompt</td>
                  <td>
                    Observe or log — a command or HTTP hook's output is dropped
                    here. In the cloud agent it fires at most once per job
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>userPromptTransformed</code> (no alias)
                  </td>
                  <td>
                    After Copilot turns the prompt into model-facing content,
                    before it is saved to history
                  </td>
                  <td>
                    Rewrite what the model sees with{" "}
                    <code>modifiedTransformedPrompt</code>; it can't block the
                    turn
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>agentStop</code> (<code>Stop</code>)
                  </td>
                  <td>The main agent finishes a turn</td>
                  <td>
                    <code>{'{"decision": "block", "reason": "..."}'}</code>{" "}
                    forces another turn
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              <strong>Subagent interrupts</strong>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Event (alias)</th>
                  <th>Fires when</th>
                  <th>A hook can</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>subagentStart</code> (no alias)
                  </td>
                  <td>
                    A subagent is spawned (the built-in{" "}
                    <code>general-purpose</code> agent is excluded)
                  </td>
                  <td>
                    Add <code>additionalContext</code> to its first message (up
                    to 10 MiB accumulated); it can't block creation. A{" "}
                    <code>matcher</code> picks the agent name
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>subagentStop</code> (<code>SubagentStop</code>)
                  </td>
                  <td>
                    A subagent finishes, before the parent sees its result
                  </td>
                  <td>
                    <code>block</code> plus a <code>reason</code> to make it
                    continue, or <code>modifiedResponse</code> to redact or
                    reformat the result
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              <strong>Tool-execution interrupts</strong>
            </p>
            <table>
              <thead>
                <tr>
                  <th>Event (alias)</th>
                  <th>Fires when</th>
                  <th>A hook can</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>permissionRequest</code> (
                    <code>PermissionRequest</code>)
                  </td>
                  <td>Before Copilot's permission service runs</td>
                  <td>
                    Allow or deny programmatically with <code>behavior</code>.
                    It fires in the CLI; the cloud agent pre-approves tool
                    calls, so it has no effect there
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>preToolUse</code> (<code>PreToolUse</code>)
                  </td>
                  <td>Before each tool runs</td>
                  <td>
                    <code>allow</code>, <code>deny</code> or <code>ask</code>,
                    or rewrite the arguments with <code>modifiedArgs</code>. A{" "}
                    <code>matcher</code> picks the tool name; the cloud agent
                    treats <code>ask</code> as <code>deny</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>preMcpToolCall</code> (no alias)
                  </td>
                  <td>Before an MCP tool request is sent</td>
                  <td>
                    Adjust the request's metadata (per the CLI documentation)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>postToolUse</code> (<code>PostToolUse</code>)
                  </td>
                  <td>After a tool succeeds</td>
                  <td>
                    Replace the result with <code>modifiedResult</code>, or add{" "}
                    <code>additionalContext</code> (the combined context is
                    capped at 10 KB)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>postToolUseFailure</code> (
                    <code>PostToolUseFailure</code>)
                  </td>
                  <td>After a tool fails</td>
                  <td>
                    Add recovery guidance with <code>additionalContext</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              <code>agentStop</code> and <code>subagentStop</code> can both{" "}
              <code>block</code>, and both are subject to a runaway guard: after
              8 consecutive blocks Copilot ends the turn anyway. The{" "}
              <code>stop_hook_active</code> flag is documented on the{" "}
              <code>agentStop</code> input, so a hook can stop itself sooner.
            </p>
            <p>
              The cloud agent runs a subset of these events and has no user to
              answer an <code>ask</code>. Payload fields, outputs, matchers and
              exit codes for every event are in the workshop's{" "}
              <code>docs/copilot-config-reference.md</code> §4.3, the exhaustive
              event catalogue.
            </p>
          </details>
          <Note>
            <strong>Where hooks load from:</strong> policy hooks (admin,
            machine-wide — <code>disableAllHooks</code> can't turn them off) →
            user hooks (<code>~/.copilot/hooks/</code>) → project hooks (
            <code>.github/hooks/*.json</code>) → plugin hooks. They{" "}
            <em>combine</em>: every entry from every source runs.
          </Note>
        </>
      ),
    },
    {
      key: "lab06/ipc",
      title: "The stdin IPC contract",
      kind: "read",
      body: (
        <>
          <p>
            The single most common hook-writing trap: Copilot CLI delivers the
            event payload <strong>as JSON on stdin</strong> — it does{" "}
            <em>not</em> set <code>TOOL_NAME</code> or <code>FILE_PATH</code>{" "}
            environment variables. Blog posts written for older shapes read env
            vars, and those scripts silently no-op forever. What the runtime
            actually provides:
          </p>
          <table>
            <thead>
              <tr>
                <th>Surface</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>stdin</code>
                </td>
                <td>
                  JSON event: <code>sessionId</code>, <code>cwd</code>,{" "}
                  <code>toolName</code>, <code>toolArgs</code>,{" "}
                  <code>toolResult</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>COPILOT_PROJECT_DIR</code> /{" "}
                  <code>CLAUDE_PROJECT_DIR</code>
                </td>
                <td>workspace cwd (set)</td>
              </tr>
              <tr>
                <td>
                  <code>TOOL_NAME</code>, <code>FILE_PATH</code>
                </td>
                <td>
                  <strong>NOT SET</strong> — do not read
                </td>
              </tr>
            </tbody>
          </table>
          <p>Blocking semantics, which only pre-hooks have:</p>
          <Snippet title="how a preToolUse hook denies a tool call">{`# exit 0 and write a JSON decision to stdout:
{"permissionDecision":"deny","permissionDecisionReason":"…why…"}`}</Snippet>
          <Note tone="warn">
            Command <code>preToolUse</code> hooks are{" "}
            <strong>fail-closed</strong>: a crash or non-zero exit is a denial
            even if stdout said allow — so a pre-hook with no objection must{" "}
            <code>exit 0</code>. Timeouts, and empty or unparseable stdout, fall
            through to the normal permission flow instead (fail-open). HTTP
            hooks fail differently — see the next steps. Post-hooks run after
            the tool and can never stop it. One asymmetry to remember: in{" "}
            <code>preToolUse</code>, <code>toolArgs</code> is a JSON-encoded{" "}
            <em>string</em>; in <code>postToolUse</code> it's already a parsed
            object.
          </Note>
          <Note>
            <strong>Event-name casing picks the payload.</strong> Configure{" "}
            <code>preToolUse</code> (camelCase) and the hook receives{" "}
            <code>toolName</code> and <code>toolArgs</code>. Configure{" "}
            <code>PreToolUse</code> (PascalCase) and it receives the VS Code and
            Claude compatible snake_case shape instead: <code>tool_name</code>,{" "}
            <code>tool_input</code>, and Claude tool names such as{" "}
            <code>Bash</code>, <code>Read</code> and <code>Edit</code>. Pick one
            per hook and read the matching fields.
          </Note>
          <p>
            And the contract is <strong>language-neutral</strong>: the event
            arrives as JSON on stdin, the hook may print one JSON decision on
            stdout, and its exit code matters. Any program that can do that is a
            valid hook — which is the next step.
          </p>
        </>
      ),
    },
    {
      key: "lab06/types",
      title: "Three hook types, any language",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Every hook so far has been a <code>"type": "command"</code> hook —
            but there are three types, and the stdin/stdout contract is
            language-neutral:
          </p>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>What runs</th>
                <th>Use it to</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>"type": "command"</code>
                </td>
                <td>
                  A program on your machine — a shell command, or a shell-free{" "}
                  <code>"exec"</code> + <code>"args"</code>
                </td>
                <td>Guard, format, verify, log locally</td>
              </tr>
              <tr>
                <td>
                  <code>"type": "http"</code>
                </td>
                <td>
                  Nothing local — Copilot <code>POST</code>s the event JSON to a{" "}
                  <code>url</code>, and the JSON in the response is the hook's
                  output
                </td>
                <td>
                  Send events to an audit log, a policy service or a webhook
                </td>
              </tr>
              <tr>
                <td>
                  <code>"type": "prompt"</code>
                </td>
                <td>
                  Nothing — Copilot submits a prompt for you, on{" "}
                  <code>sessionStart</code> only
                </td>
                <td>Open every interactive session with a standing request</td>
              </tr>
            </tbody>
          </table>
          <h2>Command hooks: polyglot, with or without a shell</h2>
          <p>
            The workshop's own hooks use Bash with <code>jq</code> and
            PowerShell only because those ship with the two shells. Because the
            contract is language-neutral, command hooks can be{" "}
            <strong>polyglot</strong>: the same guard can be written in any of
            these:
          </p>
          <table>
            <thead>
              <tr>
                <th>Language</th>
                <th>Reads stdin with</th>
                <th>Registers as</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Node.js</strong> (<code>node</code>) — same on every
                  OS, no <code>jq</code>
                </td>
                <td>
                  <code>JSON.parse(readFileSync(0, "utf8"))</code>
                </td>
                <td>
                  <code>
                    "exec": "node", "args": ["scripts/hooks/guard-env.mjs"]
                  </code>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Python 3</strong> (<code>python3</code>; usually{" "}
                  <code>python</code> on Windows)
                </td>
                <td>
                  <code>json.load(sys.stdin)</code>
                </td>
                <td>
                  separate <code>"bash"</code> and <code>"powershell"</code>{" "}
                  entries that run the script
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Bash</strong> (needs <code>jq</code>)
                </td>
                <td>
                  <code>INPUT="$(cat)"</code>, then <code>jq</code>
                </td>
                <td>
                  <code>"bash": "./scripts/hooks/guard-env.sh"</code>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>PowerShell 7</strong> (<code>pwsh</code>)
                </td>
                <td>
                  <code>$input</code>, then <code>ConvertFrom-Json</code>
                </td>
                <td>
                  <code>"powershell": "./scripts/hooks/guard-env.ps1"</code>
                </td>
              </tr>
              <tr>
                <td>Ruby, Go, Rust, any compiled binary</td>
                <td>Its own JSON library</td>
                <td>
                  <code>"exec": "./bin/guard"</code>
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>
              Shell-free <code>"exec"</code> + <code>"args"</code>.
            </strong>{" "}
            An entry can launch an executable directly: <code>exec</code> runs
            it without a shell and <code>args</code> is its argument list,
            passed verbatim. That removes shell quoting and injection surface,
            and the <code>bash</code>-versus-<code>powershell</code> choice.
            Don't combine <code>exec</code> with <code>bash</code>,{" "}
            <code>powershell</code> or <code>command</code>. It works in Copilot
            CLI and in VS Code's Copilot harness, which share one hook format;
            the cloud agent uses shell-command and HTTP hooks, so a hook file
            that must also run there needs a <code>command</code> or{" "}
            <code>bash</code> entry too. The event still arrives on stdin —{" "}
            <code>args</code> are ordinary command-line arguments, not the
            event.
          </p>
          <h2>HTTP hooks: calling another service</h2>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>url</code>
                </td>
                <td>
                  Where Copilot POSTs. Only <code>https://</code> is accepted by
                  default
                </td>
              </tr>
              <tr>
                <td>
                  <code>headers</code>
                </td>
                <td>Extra request headers, for example a source tag</td>
              </tr>
              <tr>
                <td>
                  <code>allowedEnvVars</code>
                </td>
                <td>
                  Names of environment variables that may be expanded inside{" "}
                  <code>headers</code> values, so a token comes from your
                  environment instead of a committed file. Needs an{" "}
                  <code>https://</code> url
                </td>
              </tr>
              <tr>
                <td>
                  <code>timeoutSec</code>
                </td>
                <td>Seconds before the call is abandoned (default 30)</td>
              </tr>
            </tbody>
          </table>
          <p>
            Two environment variables relax the URL rules — for local
            experiments only, never for shared configuration:
          </p>
          <ul>
            <li>
              <code>COPILOT_HOOK_ALLOW_LOCALHOST=1</code> lets HTTP hooks post
              to <code>localhost</code> and other loopback addresses, which are
              otherwise blocked, and accepts plain <code>http://</code> for
              them.
            </li>
            <li>
              <code>COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1</code> lets{" "}
              <code>preToolUse</code>, <code>preMcpToolCall</code> and{" "}
              <code>permissionRequest</code> HTTP hooks use plain{" "}
              <code>http://</code>. Without it those three events must use{" "}
              <code>https://</code>, because the response can grant tool
              permissions.
            </li>
          </ul>
          <Note tone="warn">
            <strong>Fail-open vs fail-closed.</strong> HTTP{" "}
            <code>preToolUse</code> hooks are <strong>fail-open</strong>: a
            network error, a timeout or a non-2xx response falls through to the
            normal permission flow. Command <code>preToolUse</code> hooks are{" "}
            <strong>fail-closed</strong> on a crash or non-zero exit (timeouts,
            and empty or unparseable output, fall through instead). If an outage
            of your policy service must not silently allow everything, enforce
            the rule in a command hook, or in both.
          </Note>
          <p>
            <strong>Cloud Agent.</strong> A Cloud Agent job runs in an ephemeral
            sandbox that is destroyed when the job ends, so a log file written
            by a command hook disappears with it, and the job's firewall reaches
            only GitHub and Copilot hosts by default. GitHub's reference says to
            retain hook output by sending it through an <code>http</code> hook
            entry: treat <code>"type": "http"</code> as the{" "}
            <strong>recommended built-in hook type</strong> for persistent audit
            logs from ephemeral Cloud Agent jobs, once an admin has allow-listed
            the destination host.
          </p>
          <h2>Prompt hooks</h2>
          <p>
            A prompt hook types for you. It is allowed on{" "}
            <code>sessionStart</code> only, and it fires only when a new{" "}
            <strong>interactive</strong> Copilot CLI session starts — not on
            resume, and not in non-interactive <code>-p</code> mode. Cloud agent
            jobs are non-interactive, so a prompt entry may not fire there.
          </p>
          <Snippet title=".github/hooks/example.json — one file, three hook types (illustration only)">
            {HOOK_TYPES_EXAMPLE}
          </Snippet>
          <Note tone="sim">
            Lab Studio doesn't register this example in your workspace. A
            command <code>preToolUse</code> registration must never outlive its
            script: it is fail-closed, so if the script is deleted while the
            hooks file still points at it, Copilot denies every matching{" "}
            <code>edit</code>, <code>create</code>, <code>write</code> and{" "}
            <code>apply_patch</code> call. That is also why you pipe-test a hook
            before you register it. The bench pipes events into <code>.sh</code>{" "}
            scripts (you'll do that next); to try the Node or Python versions,
            run{" "}
            <code>
              echo '&lt;event json&gt;' | node scripts/hooks/guard-env.mjs
            </code>{" "}
            in your own terminal.
          </Note>
          <Quiz
            stepKey="lab06/types"
            question="Your HTTP preToolUse policy service goes down and every request times out. What happens to each tool call?"
            options={[
              "Every tool call is denied — hooks are always fail-closed",
              "Copilot falls through to its normal permission flow — HTTP preToolUse hooks are fail-open",
              "Copilot retries the request until the service answers",
            ]}
            correct={1}
            explain="HTTP preToolUse hooks fall through to the normal permission flow on network errors, timeouts and non-2xx responses. A command preToolUse hook is the fail-closed one: a crash or non-zero exit denies the call. If an outage must not silently allow everything, enforce the rule in a command hook, or in both."
          />
        </>
      ),
    },
    {
      key: "lab06/create",
      title: "Create and register a hook",
      kind: "mixed",
      verifyId: "lab06/create-hook",
      body: (
        <>
          <p>
            Build a <code>postToolUse</code> hook that checks every edited
            TypeScript file for <code>console.log</code> (this workspace's
            instructions forbid it). The studio marks hook scripts executable on
            save — in a real terminal, don't skip <code>chmod +x</code>:
          </p>
          <FileCard
            path="scripts/hooks/post-tool-use-console-warn.sh"
            content={CONSOLE_WARN_HOOK}
          />
          <p>Register it — the full file with both hooks:</p>
          <FileCard
            path=".github/hooks/default.json"
            mode="replace"
            content={HOOKS_JSON_BOTH}
          />
          <p>
            Now test it the way the lab teaches: pipe a sample event into the
            script. This executes your actual script, with the JSON on stdin,
            exactly like the runtime does. A matching event (an{" "}
            <code>edit</code> on a <code>.ts</code> file):
          </p>
          <Cmd
            lines={[MATCHING_EVENT]}
            label="matching event — should scan the file"
          />
          <p>And a non-matching event, which must early-return with exit 0:</p>
          <Cmd
            lines={[NON_MATCHING_EVENT]}
            label="non-matching event — early-return OK"
          />
        </>
      ),
    },
    {
      key: "lab06/live",
      title: "Watch hooks fire on a live session",
      kind: "live",
      verifyId: "lab06/live",
      body: (
        <>
          <p>
            Hooks load from <code>.github/hooks/</code> at session start.
            Restart, then make Copilot edit a TypeScript file — and watch the
            amber <strong>⛓ hook</strong> chips appear in the bench as the
            lifecycle runs:
          </p>
          <Cmd
            lines={["copilot"]}
            restart
            label="restart so the new hook registers"
          />
          <PromptCard prompt="Add a console.log statement that prints the student count at the top of the listStudents function in src/routes/students.ts." />
          <Note>
            Every tool call now fires your <code>postToolUse</code> hook —
            including the one that just planted a <code>console.log</code>,
            which the hook flags. Ask Copilot to remove it again afterwards if
            you like.
          </Note>
          <p>
            Now watch a <strong>pre-hook block</strong> something. The shipped
            secret-scan hook denies any file change containing an API-key-shaped
            string:
          </p>
          <PromptCard prompt="Create a file src/config.ts that exports const apiKey = 'sk-test1234567890abcdef' as a hardcoded constant." />
          <Note tone="warn">
            The write is denied by <code>pre-tool-use-secret-scan</code> before
            it happens — Copilot sees the denial reason and reports it. That's
            the guardrail model: the hook doesn't ask the model to behave, it
            makes the misbehavior impossible.
          </Note>
          <Note>
            The amber chips are Lab Studio's view of the session's hook events.
            In the real CLI every hook that runs is also recorded in the
            session's <code>events.jsonl</code> as a <code>hook.start</code> and
            a <code>hook.end</code> event (field names observed on a current
            build) — the last step of this lab shows how to read it.
          </Note>
        </>
      ),
    },
    {
      key: "lab06/debug",
      title: "Debugging & observability: see what Copilot did",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            A hook runs without a window of its own, so you can't tell one that
            ran and approved from one that never started. Four tools answer that
            — and the same four answer it for instructions, agents, skills and
            MCP servers. (Labs 01–05 and 07 each carry a{" "}
            <strong>🔍 Debug It</strong> note that points here.)
          </p>
          <Note tone="sim">
            The bench can't open VS Code panels or your real{" "}
            <code>~/.copilot</code> folder, so this step is reading plus a
            check: run these on your own machine. Lab Studio's closest
            equivalents are the amber <strong>⛓ hook</strong> chips and the{" "}
            <code>/env</code> command.
          </Note>
          <h2>1. VS Code: Agent Debug Logs and the Chat Debug View</h2>
          <p>
            <strong>Turn capture on before you reproduce the problem</strong> —
            it isn't retroactive. For sessions managed by the Agent Host, which
            is how the Copilot harness runs, set{" "}
            <code>chat.agentHost.agentDebugLog.enabled</code>. Local harness
            sessions need{" "}
            <code>github.copilot.chat.agentDebugLog.fileLogging.enabled</code>{" "}
            instead, plus a window reload before <code>/troubleshoot</code>; VS
            Code documents the Local harness as deprecated, so most setups need
            only the first.
          </p>
          <p>
            Open the Chat view's <strong>...</strong> menu and choose{" "}
            <strong>Show Agent Debug Logs</strong> (or run{" "}
            <strong>Developer: Open Agent Debug Logs</strong>). The panel has
            four views:
          </p>
          <ul>
            <li>
              <strong>Logs view</strong> — every event in order. Filter to{" "}
              <strong>Discovery</strong> to see whether a customization was
              loaded, skipped or rejected, and to model requests, tool calls and
              errors.
            </li>
            <li>
              <strong>Summary view</strong> — tool calls, token usage, errors
              and total duration.
            </li>
            <li>
              <strong>Agent Flow Chart</strong> — which agent delegated to
              which. Open it from the Summary view.
            </li>
            <li>
              <strong>Cache Explorer</strong> — use it only when the Summary
              view shows low cache reuse.
            </li>
          </ul>
          <p>
            The <strong>Export</strong> icon saves a session as an OpenTelemetry
            JSON file in OTLP format — review it before you share it.{" "}
            <strong>Show Chat Debug View</strong> (or{" "}
            <strong>Developer: Show Chat Debug View</strong>) shows what reached
            the model for one request: the <strong>System prompt</strong>,{" "}
            <strong>User prompt</strong>, <strong>Context</strong>,{" "}
            <strong>Response</strong> and <strong>Tool responses</strong>. To
            hand the captured events to chat, use the sparkle icon in the panel
            or type <code>#debugEventsSnapshot</code> (for example{" "}
            <code>
              #debugEventsSnapshot which customization files were loaded?
            </code>
            ), or run{" "}
            <code>
              /troubleshoot Which customizations were loaded, and did any fail?
            </code>
          </p>
          <h2>2. Copilot CLI: the session folder</h2>
          <p>
            Every local session leaves a folder at{" "}
            <code>~/.copilot/session-state/&lt;session-id&gt;/</code> (under{" "}
            <code>$COPILOT_HOME</code> when that is set):
          </p>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>What it holds</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>events.jsonl</code>
                </td>
                <td>
                  The session's chronological event log. Each hook that ran
                  appears as a <code>hook.start</code> and a{" "}
                  <code>hook.end</code> event (observed on a current build — the
                  CLI documentation names the file but doesn't publish its
                  fields)
                </td>
              </tr>
              <tr>
                <td>
                  <code>workspace.yaml</code>
                </td>
                <td>
                  Session metadata: <code>id</code>, <code>cwd</code>,{" "}
                  <code>repository</code>, <code>branch</code>,{" "}
                  <code>created_at</code> and <code>updated_at</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>plan.md</code>
                </td>
                <td>The session plan, created when the session uses plans</td>
              </tr>
              <tr>
                <td>
                  <code>session.db</code>
                </td>
                <td>
                  The SQLite database behind the agent's <code>sql</code> tool,
                  created when the session uses that tool
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            <code>~/.copilot/session-store.db</code> sits beside those folders
            and indexes your sessions for search; its <code>sessions</code>{" "}
            table holds each session's <code>summary</code> —{" "}
            <code>workspace.yaml</code> does not. These files aren't encrypted:
            anything that reached a tool result is saved in them.
          </p>
          <h2>3. Ask Copilot what happened</h2>
          <ul>
            <li>
              <code>/diagnose [prompt]</code> analyzes the current session's
              logs, including why a permission request needed approval — for
              example{" "}
              <code>/diagnose Why did that tool call ask me for approval?</code>
            </li>
            <li>
              <code>/collect-debug-logs</code> collects debug logs to a local{" "}
              <code>.tgz</code> file, shares them with GitHub after you consent,
              or creates a secret gist. Debug logs can contain prompts and
              source code, so review a bundle before you send it anywhere.
            </li>
            <li>
              <code>session_store_sql</code> lets Copilot query its own history
              (<em>"Show my five most recent sessions with their summaries"</em>
              ). It has two stores: the <strong>cloud</strong> store (the
              default) has the materialized views <code>sessions</code>,{" "}
              <code>turns</code>, <code>checkpoints</code>,{" "}
              <code>session_files</code>, <code>session_refs</code>,{" "}
              <code>session_usage</code>, <code>tool_executions</code> and{" "}
              <code>events</code>; the <strong>local</strong> store (
              <code>source: "local"</code>) is the SQLite file{" "}
              <code>~/.copilot/session-store.db</code>, with{" "}
              <code>sessions</code>, <code>turns</code>,{" "}
              <code>checkpoints</code>, <code>session_files</code>,{" "}
              <code>session_refs</code> and <code>search_index</code>. Token
              totals and tool failures are only in the cloud views.
            </li>
          </ul>
          <h2>4. OpenTelemetry: traces from a real session</h2>
          <p>
            OpenTelemetry is off until you set one of three things:{" "}
            <code>COPILOT_OTEL_ENABLED=true</code>,{" "}
            <code>OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318</code> (it
            sends to a collector that you run), or{" "}
            <code>COPILOT_OTEL_FILE_EXPORTER_PATH</code> set to a file (it
            writes one JSON record per line, so it needs no collector — keep the
            file outside your repository). By default only metadata is recorded,
            so your prompt isn't in the file.{" "}
            <code>OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY</code>{" "}
            adds the full prompt and response messages, the system instructions,
            tool call arguments and results, and sandbox decisions to the spans
            (<code>SPAN_AND_EVENT</code> also enables span content capture,
            because separate content events aren't exported). The file is then
            sensitive: use content capture only in a trusted environment. The
            documented trace shape is <code>invoke_agent</code>, then{" "}
            <code>plan</code> in plan mode only, then <code>chat</code> and{" "}
            <code>execute_tool</code> beneath it.
          </p>
          <p>
            Before you share any session folder, debug bundle, exported log or
            trace file, read it: they can hold prompts, source code, file paths
            and secrets. The workshop repository's{" "}
            <code>docs/debugging-and-observability.md</code> is the full
            reference.
          </p>
          <Quiz
            stepKey="lab06/debug"
            question="OpenTelemetry is writing spans to a file, but your prompt text isn't anywhere in it. What is the most likely reason?"
            options={[
              "The file exporter drops prompts that are longer than one line",
              "By default only metadata is recorded; prompt and tool content is opt-in with OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY",
              "Prompts are only ever sent to an OTLP collector, never to the file exporter",
            ]}
            correct={1}
            explain="The default records metadata only. SPAN_ONLY adds prompts, responses, system instructions, tool arguments and results, and sandbox decisions to the spans — which makes the file sensitive, so use it only in a trusted environment and keep the file out of your repository."
          />
        </>
      ),
    },
  ],
};
