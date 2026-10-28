import { Badge, Cmd, GitHubTabButton, Note, Snippet } from "./content";
import type { Lab } from "./types";

const ISSUE_CREATE = `gh issue create --title "[Feature]: Add Course Prerequisites" --body "## Feature Description
Allow courses to define prerequisite courses that students must complete before enrolling.

## User Stories
- As an administrator, I want to define prerequisite courses for any course
- As a student, I want to see prerequisite courses on the course detail page
- As the enrollment system, I want to validate prerequisites before enrolling

## Acceptance Criteria
- [ ] Administrators can add prerequisites through the course edit page
- [ ] Course detail page displays prerequisite courses
- [ ] Enrollment blocked when prerequisites not met" --label "feature,story"`;

export const lab08: Lab = {
  id: "lab08",
  number: "08",
  title: "gh-aw: PRD Generation",
  tagline:
    "A branch creation triggers an AI agent in CI that writes a PRD and opens the pull request — plumbing simulated, agent real.",
  steps: [
    {
      key: "lab08/format",
      title: "The gh-aw workflow format",
      kind: "mixed",
      verifyId: "lab08/format",
      body: (
        <>
          <p>
            GitHub Agentic Workflows (gh-aw) are CI pipelines where the runner
            is an AI agent. Unlike traditional Actions YAML, a gh-aw workflow is{" "}
            <strong>markdown with YAML frontmatter</strong>: the frontmatter is
            the configuration (triggers, permissions, tools), the markdown body
            is the agent's prompt. This workspace ships one — read it:
          </p>
          <Cmd lines={["cat .github/workflows/generate-prd.md"]} />
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>on: create</code> + branch <code>if:</code>
                </td>
                <td>
                  Fires when a <code>feature/**</code> or <code>story/**</code>{" "}
                  branch is created
                </td>
              </tr>
              <tr>
                <td>
                  <code>permissions</code>
                </td>
                <td>
                  Least privilege: the agent only reads (
                  <code>contents: read</code>, <code>issues: read</code>)
                </td>
              </tr>
              <tr>
                <td>
                  <code>tools</code> / <code>runtimes</code>
                </td>
                <td>
                  What the agent may do, and what's installed on the runner
                </td>
              </tr>
              <tr>
                <td>
                  <code>safe-outputs</code>
                </td>
                <td>
                  The one mutation it's allowed —{" "}
                  <code>create-pull-request</code> — carried out by a separate
                  job
                </td>
              </tr>
            </tbody>
          </table>
          <Note>
            <strong>Key insight:</strong> the body is a prompt, not a script.
            The agent reasons about the task — same input, possibly different
            output. That's why <code>safe-outputs</code> exists: the
            nondeterministic part runs read-only, and the writes happen in an
            auditable job after it.
          </Note>
        </>
      ),
    },
    {
      key: "lab08/compile",
      title: "Compile: .md → .lock.yml",
      kind: "sim",
      verifyId: "lab08/compile",
      body: (
        <>
          <p>
            GitHub Actions can't run markdown. <code>gh aw compile</code> turns
            the <code>.md</code> into a <code>.lock.yml</code> — a standard
            Actions workflow that is what GitHub actually executes. The two are
            committed together, like <code>package.json</code> and its lock
            file:
          </p>
          <Cmd
            lines={[
              "gh aw version",
              "gh aw compile .github/workflows/generate-prd.md",
            ]}
          />
          <p>Open the generated lock file (Files tab) and find three things:</p>
          <ul>
            <li>
              <strong>One fence at the front</strong> — the branch filter sits
              on <code>pre_activation</code>; everything downstream just
              declares <code>needs:</code>.
            </li>
            <li>
              <strong>The agent job only reads</strong> — write permissions live
              on <code>safe_outputs</code>, a separate job the compiler adds.
            </li>
            <li>
              <strong>Every action pinned</strong> to a full commit SHA, version
              in the trailing comment.
            </li>
          </ul>
          <Note tone="sim">
            <Badge kind="sim" /> &nbsp;The real <code>gh aw</code> is a gh CLI
            extension talking to your checkout; the studio's compiler emits a
            faithful lock file locally. The anatomy you're reading is the real
            shape.
          </Note>
        </>
      ),
    },
    {
      key: "lab08/backlog",
      title: "Seed the issue backlog",
      kind: "sim",
      verifyId: "lab08/backlog",
      body: (
        <>
          <p>
            Features come from issues, not thin air — and the PRD workflow reads
            a linked issue for context. Seed your backlog (the studio's GitHub
            is simulated; no fork, no network):
          </p>
          <Cmd lines={[ISSUE_CREATE]} label="gh issue create" />
          <p>
            <GitHubTabButton>See it in the GitHub tab → Issues</GitHubTabButton>
          </p>
          <Note>
            <strong>Issue quality matters.</strong> The richer the user stories
            and acceptance criteria, the better the PRD the agent writes from
            them — same as briefing a human PM.
          </Note>
        </>
      ),
    },
    {
      key: "lab08/run",
      title: "Create the branch, watch the run",
      kind: "mixed",
      verifyId: "lab08/run",
      body: (
        <>
          <p>
            Two routes, with a real difference. The issue's{" "}
            <strong>Create a branch</strong> button (GitHub tab) links the
            branch to the issue — the agent then reads your user stories. A
            terminal push fires the same workflow but links nothing:
          </p>
          <p>
            <GitHubTabButton>
              Route A — the issue's Create a branch button (linked)
            </GitHubTabButton>
          </p>
          <Cmd
            lines={["git push origin main:feature/add-course-prerequisites"]}
            label="Route B — terminal push (branch-name-only; skip if you used the button)"
          />
          <p>
            Either way, the <code>create</code> event fires and the run appears
            under <strong>GitHub tab → Actions</strong>. Open its log and watch
            the jobs: <code>pre_activation</code> (branch filter) →{" "}
            <code>activation</code> (credit/secret checks) → <code>agent</code>{" "}
            — where a <strong>real Copilot session</strong> analyzes this
            workspace and writes the PRD — → <code>safe_outputs</code>, which
            opens the pull request.
          </p>
          <Note tone="warn">
            If <code>safe_outputs</code> fails with "Allow GitHub Actions to
            create and approve pull requests is OFF": that's the real default on
            GitHub, and the same security guardrail. Flip it under{" "}
            <strong>GitHub tab → Settings → Actions</strong>, then create a
            fresh branch (e.g. <code>feature/add-course-prerequisites-2</code>)
            to re-trigger.
          </Note>
        </>
      ),
    },
    {
      key: "lab08/review-prd",
      title: "Review the generated PRD",
      kind: "mixed",
      verifyId: "lab08/review-prd",
      body: (
        <>
          <p>
            The run opened a pull request labeled <code>prd</code>,{" "}
            <code>ai-generated</code>. Open it in the GitHub tab, show its
            files, and read the PRD the agent wrote into <code>docs/prd/</code>.
            Then do the two checks the lab insists on:
          </p>
          <ol>
            <li>
              <strong>Check it against your issue.</strong> Under Feature
              Overview, find <code>Related Issues</code>. An issue number means
              the agent used your issue; <code>#N/A</code> means
              branch-name-only (likelier after the terminal push). Put your
              issue's acceptance criteria beside the PRD's and mark each one
              covered / changed / missing.
            </li>
            <li>
              <strong>Verify one reference.</strong> Pick a file the PRD names
              as existing — <code>src/entities/course.ts</code>, say — and
              confirm it's real (Files tab). A named thing you can't find was
              invented; a proposed thing should be labeled new.
            </li>
          </ol>
          <Snippet title="what the sections should hold">{`Feature Overview        derived from the branch (+ Related Issues line)
User Stories            prerequisite management stories
Acceptance Criteria     measurable; covering the issue's criteria
Technical Considerations the real layers: entities, repos, routes
Testing Requirements    Vitest + the project naming convention
Out of Scope            explicit boundaries`}</Snippet>
          <Note>
            <strong>Real-world use:</strong> this replaces the blank-page PRD
            step. A branch appears, a draft PRD appears minutes later, and the
            PM reviews instead of writes.
          </Note>
        </>
      ),
    },
  ],
};
