import { FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const QA_REVIEWER_AGENT = `---
name: qa-reviewer
description: Check an implementation against its requirements and test evidence.
model: auto
tools: ["read", "search", "execute", "qa-boundary/write_verdict"]
mcp-servers:
  qa-boundary:
    command: node
    args: ["\${PLUGIN_ROOT}/scripts/qa-boundary-mcp.mjs"]
    tools: ["write_verdict"]
---

# QA Reviewer

Run the bundled \`qa-review\` skill against the proposed changes, their
specification, tasks, and deterministic test evidence.

- \`qa-boundary/write_verdict\` is the only sanctioned write. It validates the
  verdict (\`approve\` or \`reject\`) and writes \`<FEATURE_DIR>/qa-review.md\`.
- Never use \`execute\` to create, modify, or delete a file.
`;

export const lab21: Lab = {
  id: "lab21",
  number: "21",
  title: "The Tech Lead's Plugin & Marketplace Lockdown",
  tagline:
    "Role-scoped SDLC agents, MCP write-boundary enforcement, and centrally locked marketplaces.",
  steps: [
    {
      key: "lab21/bundle",
      title: "Role separation and the QA write boundary",
      kind: "mixed",
      verifyId: "lab21/bundle",
      body: (
        <>
          <p>
            Track 5 scales Copilot from single-repo customization to an{" "}
            <strong>enterprise agentic SDLC harness</strong>. Lab 21 starts with
            the tech lead&apos;s plugin bundle (
            <code>enterprise-harness-bundle/</code>), which separates three
            roles so the implementer never grades its own work:
          </p>
          <table>
            <thead>
              <tr>
                <th>Role agent</th>
                <th>Load mode</th>
                <th>Allowed tools</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>spec-author</code>
                </td>
                <td>Dispatcher-mediated</td>
                <td>
                  <code>read</code>, <code>search</code>, <code>edit</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>task-executor</code>
                </td>
                <td>Dispatcher-mediated</td>
                <td>
                  <code>read</code>, <code>search</code>, <code>edit</code>,{" "}
                  <code>execute</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>qa-reviewer</code>
                </td>
                <td>Dispatcher-mediated</td>
                <td>
                  <code>read</code>, <code>search</code>, <code>execute</code>,{" "}
                  <code>qa-boundary/write_verdict</code> (no <code>edit</code>)
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Notice how <code>qa-reviewer</code> holds its write boundary: it has{" "}
            <strong>
              no <code>edit</code> tool
            </strong>
            , and its only sanctioned write is{" "}
            <code>qa-boundary/write_verdict</code> from a bundled agent-scoped
            MCP server that validates a lowercase <code>approve</code> or{" "}
            <code>reject</code> verdict and writes{" "}
            <code>&lt;FEATURE_DIR&gt;/qa-review.md</code> inside the repository
            root. Author the agent definition in the sandbox to inspect its
            shape:
          </p>
          <FileCard
            path="enterprise/qa-reviewer.agent.md"
            content={QA_REVIEWER_AGENT}
            label="enterprise/qa-reviewer.agent.md"
          />
          <Note>
            Because <code>execute</code> can still run shell commands at
            runtime, the bundle pairs this tool list with a live behavioral eval
            (<code>evals/qa-review.md</code>) that hashes every file outside{" "}
            <code>.git</code> and fails if a QA run changes anything except{" "}
            <code>qa-review.md</code>.
          </Note>
        </>
      ),
    },
    {
      key: "lab21/lockdown",
      title: "Load lifecycle, strict marketplaces, and the --yolo guard",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            Three governance rules anchor the baseline policy before you roll
            the bundle out to teams:
          </p>
          <Snippet title="three load modes — and what belongs where">{`Instructions (eager preload)       → non-negotiable rules that must apply every turn
Skills       (lazy / on-demand)    → reusable playbooks; never hide mandatory policy here
Agents       (dispatcher-mediated) → role boundaries with explicit tools: lists`}</Snippet>
          <ul>
            <li>
              <strong>No first-party marketplace exemption:</strong>{" "}
              <code>strictKnownMarketplaces</code> is an array of allowed source
              objects. If your org wants GitHub&apos;s built-in marketplaces (
              <code>github/copilot-plugins</code> and{" "}
              <code>github/awesome-copilot</code>), list them explicitly;{" "}
              <code>[]</code> means total marketplace lockdown.
            </li>
            <li>
              <strong>Telemetry content stays off by default:</strong>{" "}
              <code>captureContent: false</code> and{" "}
              <code>lockCaptureContent: true</code> until a named
              privacy/security approver authorizes content capture.
            </li>
            <li>
              <strong>Spec Kit bypass-mode guard:</strong> Spec Kit appends{" "}
              <code>--yolo</code> by default unless{" "}
              <code>SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0</code> is set in the
              environment. Keep that variable set to <code>0</code> until a
              controlled enterprise test verifies{" "}
              <code>permissions.disableBypassPermissionsMode</code> against{" "}
              <code>github/copilot-cli#4528</code>.
            </li>
          </ul>
          <Quiz
            stepKey="lab21/lockdown"
            question="Why does qa-reviewer route its output through qa-boundary/write_verdict instead of keeping the edit tool, and why is evals/qa-review.md still required?"
            options={[
              "write_verdict is faster than edit, and the eval only checks markdown formatting",
              "Dropping edit removes general file mutation and restricts sanctioned output to a validated approve/reject qa-review.md; because execute can still write via the shell at runtime, the behavioral eval verifies the agent leaves every other file untouched",
              "MCP tools automatically block shell redirections inside execute",
            ]}
            correct={1}
            explain="qa-boundary/write_verdict validates the approve/reject verdict and writes only <FEATURE_DIR>/qa-review.md, while the behavioral eval tests that the agent does not abuse execute to mutate source files."
          />
        </>
      ),
    },
  ],
};
