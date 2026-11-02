import { Cmd, FileCard, Note, PromptCard, Snippet } from "./content";
import type { Lab } from "./types";

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
    "Lifecycle guardrails: examine the hook system, write a postToolUse hook, and watch it fire on a live session.",
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
            <code>exit 0</code>. The one exception is a timeout, which is
            fail-open. Post-hooks run after the tool and can never stop it. One
            asymmetry to remember: in <code>preToolUse</code>,{" "}
            <code>toolArgs</code> is a JSON-encoded <em>string</em>; in{" "}
            <code>postToolUse</code> it's already a parsed object.
          </Note>
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
        </>
      ),
    },
  ],
};
