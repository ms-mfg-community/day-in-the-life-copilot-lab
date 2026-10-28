import { Cmd, GitHubTabButton, Note, Snippet } from "./content";
import type { Lab } from "./types";

const ISSUE_CREATE = `gh issue create --title "feat: add maxEnrollment to the Course entity" --body "## Description
Add a maxEnrollment property to the Course entity to support enrollment caps.

## Requirements
- Add a readonly maxEnrollment property (number) to src/entities/course.ts
- Document that the default cap is 30 when a course does not specify one
- Add a Vitest unit test covering the new property (project naming convention)

## Context
Part of the course-prerequisites feature: the property will limit how many students can enroll."`;

export const lab09: Lab = {
  id: "lab09",
  number: "09",
  title: "Coding Agent & Code Review",
  tagline:
    "Write an issue; one AI implements it into a draft PR, another reviews the diff — and you drive the iteration loop.",
  steps: [
    {
      key: "lab09/ruleset",
      title: "Configure automatic reviews",
      kind: "sim",
      verifyId: "lab09/ruleset",
      body: (
        <>
          <p>
            Copilot Code Review is a <strong>native platform feature</strong> —
            no workflow files. You turn it on per-repository with a{" "}
            <strong>ruleset</strong>. Build one in the simulated settings panel:
          </p>
          <p>
            <GitHubTabButton>Open GitHub tab → Settings</GitHubTabButton>
          </p>
          <ol>
            <li>
              Ruleset name: <code>copilot-code-review</code>, Enforcement status{" "}
              <strong>Active</strong> — a ruleset only takes effect once active.
            </li>
            <li>
              Check <strong>Require a pull request before merging</strong>.
            </li>
            <li>
              Check <strong>Automatically request Copilot code review</strong>.
            </li>
            <li>
              Check <strong>Review draft pull requests</strong> — the coding
              agent opens its PR as a <em>draft</em>, and without this the
              review waits until it's marked ready.
            </li>
            <li>
              <strong>Review new pushes</strong> is optional — turn it on if you
              want automatic re-reviews in the iteration step.
            </li>
          </ol>
          <Note>
            Copilot's review is a <strong>Comment</strong> review: it doesn't
            approve, doesn't block merging, and doesn't count toward required
            approvals. Humans keep the merge decision; the AI supplies the first
            pass.
          </Note>
        </>
      ),
    },
    {
      key: "lab09/coding-agent",
      title: "Issue in, draft PR out",
      kind: "mixed",
      verifyId: "lab09/coding-agent",
      body: (
        <>
          <p>
            The Copilot Coding Agent turns issues into pull requests: assign
            Copilot, and it reads the repo (including your custom instructions
            from Lab 02), creates a branch, implements, and opens a draft PR.
            Write an issue worth implementing — specific requirements, file
            paths, context:
          </p>
          <Cmd lines={[ISSUE_CREATE]} label="gh issue create" />
          <p>
            Now assign Copilot — either command works, as does the button on the
            issue:
          </p>
          <Cmd
            lines={["gh issue edit 2 --add-assignee @copilot"]}
            label="use your issue's number"
          />
          <p>
            Watch the issue in the GitHub tab: the agent posts status updates as
            it works. This is a <strong>real Copilot session</strong>{" "}
            implementing your issue in the sandbox — the status lines are its
            actual tool calls. In 1–3 minutes it opens a draft PR with the diff;
            if your ruleset from step 1 is active with drafts enabled, Code
            Review starts on it automatically.
          </p>
          <Note tone="warn">
            Wait for <em>both</em> agents to finish before judging the result:
            the PR link appearing is not the work being done. The issue's status
            feed goes quiet and the PR carries the diff — then read it.
          </Note>
        </>
      ),
    },
    {
      key: "lab09/review",
      title: "Read the automated review",
      kind: "live",
      verifyId: "lab09/review",
      body: (
        <>
          <p>
            Open the PR in the GitHub tab: <strong>Copilot</strong> is listed
            under reviewers, and its review sits under the diff. (No review? The
            ruleset wasn't active when the PR opened — use{" "}
            <strong>Request Copilot review</strong> on the PR.) The reviewer
            read your repository conventions first, so expect project-specific
            findings, not generic lint:
          </p>
          <table>
            <thead>
              <tr>
                <th>Feedback type</th>
                <th>What it can look like</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>✅ Positive</td>
                <td>"Clean property addition with a sensible default"</td>
              </tr>
              <tr>
                <td>⚠️ Suggestion</td>
                <td>"Consider validating the maxEnrollment range"</td>
              </tr>
              <tr>
                <td>🔒 Security</td>
                <td>Missing input validation at a boundary</td>
              </tr>
              <tr>
                <td>🧪 Testing</td>
                <td>A case the new test doesn't cover</td>
              </tr>
            </tbody>
          </table>
          <Note>
            <strong>A clean review is a real result.</strong> On a change this
            small the review may be praise and nothing else — that's the feature
            working: the coding agent followed the instructions both agents
            read.
          </Note>
        </>
      ),
    },
    {
      key: "lab09/iterate",
      title: "Close the loop — and the chain",
      kind: "live",
      verifyId: "lab09/iterate",
      body: (
        <>
          <p>
            Here's the powerful part: comment on the PR mentioning{" "}
            <code>@copilot</code> and the coding agent iterates on its own PR.
            Quote the review's actual wording if it raised something; if it came
            back clean, add a new requirement and say so plainly:
          </p>
          <Cmd
            lines={[
              'gh pr comment 2 --body "@copilot New requirement, not from the review: validate that maxEnrollment is greater than 0, with a unit test covering the invalid case."',
            ]}
            label="use your PR's number — or the comment box on the PR itself"
          />
          <p>
            The agent pushes a second commit addressing the comment; with{" "}
            <strong>Review new pushes</strong> on, the re-review follows
            automatically. Step back and look at what ran:
          </p>
          <Snippet title="the agentic chain">{`you write an issue → Coding Agent implements + opens PR
                     → Code Review checks the diff
                     → your @copilot comment → agent iterates → re-review
                     → you review and decide (merge is yours, not theirs)`}</Snippet>
          <Note>
            Cleanup, like the real lab: close the PR unmerged (
            <strong>Close PR</strong> on the pull request — it deletes the
            branch too) and close the issue. Merging is what you'd do on a
            change you wanted to keep.
          </Note>
        </>
      ),
    },
  ],
};
