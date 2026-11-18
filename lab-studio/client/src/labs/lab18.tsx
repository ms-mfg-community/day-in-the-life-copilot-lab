import { Cmd, GitHubTabButton, Note, PromptCard, Snippet } from "./content";
import type { Lab } from "./types";

export const lab18: Lab = {
  id: "lab18",
  number: "18",
  title: "Spec-Driven Design & Stacked PRs",
  tagline:
    "A spec, not an issue → an independent PRD check → a stack of small reviewable PRs, each with its own Copilot review.",
  steps: [
    {
      key: "lab18/spec",
      title: "Write a spec, not just an issue",
      kind: "live",
      verifyId: "lab18/spec",
      body: (
        <>
          <p>
            GitHub Spec Kit gives spec-driven development a repeatable structure
            — <code>/speckit-constitution</code>, <code>/speckit-specify</code>,{" "}
            <code>/speckit-plan</code>, <code>/speckit-tasks</code>,{" "}
            <code>/speckit-implement</code> — commands that run in your coding
            agent's chat, not a shell. The point: an unambiguous, testable
            specification <em>before</em> any code. Have Copilot write one using
            the conventions:
          </p>
          <PromptCard prompt="Using GitHub Spec Kit conventions (acceptance-criteria-first), write a spec for course prerequisite enforcement in ContosoUniversity and save it to docs/specs/course-prerequisites.md. Sections: Problem, Acceptance Criteria (a Course declares zero or more prerequisite courses; enrollment blocked with a clear validation error when prerequisites are unmet; existing enrollments unaffected; prerequisite chains must not allow cycles), and Out of scope (waiver workflow, cross-department equivalency)." />
          <Note>
            A spec is the opposite of "open an issue and hope the agent infers
            the details." The acceptance criteria are the contract everything
            downstream gets measured against.
          </Note>
        </>
      ),
    },
    {
      key: "lab18/prd",
      title: "Spec → PRD, as an independent check",
      kind: "mixed",
      verifyId: "lab18/prd",
      body: (
        <>
          <p>
            Create the branch that carries your spec — Lab 08's workflow fires
            on it:
          </p>
          <Cmd lines={["git push origin main:feature/course-prerequisites"]} />
          <p>
            Be precise about what the workflow reads: the{" "}
            <strong>branch name</strong>, any matching issue, and its own
            codebase analysis. It does <strong>not</strong> read your spec file.
            That makes the PRD an <em>independent check</em>: when the run
            finishes, put your spec's acceptance criteria beside the PRD's and
            mark each one <strong>covered / changed / missing</strong> — and
            note anything the PRD adds that your spec never asked for.
          </p>
          <p>
            <GitHubTabButton>
              Watch the run, then open the [prd] PR
            </GitHubTabButton>
          </p>
        </>
      ),
    },
    {
      key: "lab18/stack",
      title: "When one spec is too big for one PR",
      kind: "sim",
      verifyId: "lab18/stack",
      body: (
        <>
          <p>
            This spec touches the model, cycle detection, validation, and tests
            — a 2,000-line PR nobody reviews well.{" "}
            <strong>Stacked pull requests</strong>: a bottom-to-top chain of
            small PRs, each targeting the branch below it, only the bottom
            targeting main:
          </p>
          <Snippet title="the layering">{`layer 1 (bottom)  feature/course-prereqs-model            → main
layer 2           feature/course-prereqs-cycle-detection  → layer 1's branch
layer 3           feature/course-prereqs-validation       → layer 2's branch
layer 4 (top)     feature/course-prereqs-tests            → layer 3's branch`}</Snippet>
          <p>
            Build the first two layers — watch the <code>--base</code> values:
          </p>
          <Cmd
            lines={[
              'gh pr create --base main --head feature/course-prereqs-model --title "Course prerequisites: model + schema change" --body "Layer 1 of the course-prerequisites stack."',
            ]}
            label="layer 1 — targets main; the studio stages its model diff (simulated commit)"
          />
          <Cmd
            lines={[
              'gh pr create --base feature/course-prereqs-model --head feature/course-prereqs-cycle-detection --title "Course prerequisites: cycle detection" --body "Layer 2 of the course-prerequisites stack."',
            ]}
            label="layer 2 — base is layer 1's BRANCH, not main"
          />
          <Note>
            GitHub's native stacks add navigation,{" "}
            <strong>cascading merge</strong> (merging a layer merges everything
            below it, atomically), and server-side cascading rebase. Rules of
            thumb: only stack <em>genuinely dependent</em> work; never rebase a
            layer you don't own; re-sync upper layers after a lower one changes.
          </Note>
        </>
      ),
    },
    {
      key: "lab18/layer-review",
      title: "Code review on every layer",
      kind: "live",
      verifyId: "lab18/layer-review",
      body: (
        <>
          <p>
            Each stack layer is an ordinary PR — Code Review neither knows nor
            cares about the stack. Request a Copilot review on{" "}
            <strong>layer 1</strong> (its PR in the GitHub tab → Request Copilot
            review) and read what comes back against the model diff.
          </p>
          <p>
            <GitHubTabButton>
              Open layer 1's PR and request the review
            </GitHubTabButton>
          </p>
          <p>The payoff over one giant PR:</p>
          <ul>
            <li>
              Layer 1's review is a fast, focused pass on just the model change.
            </li>
            <li>
              A concern caught here is fixed <em>before</em> layer 2's
              cycle-detection code assumes the wrong shape — the mistake this
              lab exists to prevent.
            </li>
            <li>
              Copilot's review stays advice: branch protection and human
              approvals are the real gate, on every layer, even mid-stack.
            </li>
          </ul>
          <Note>
            <strong>STOP discipline from the lab:</strong> review layer 1 and
            address its feedback before layer 2 exists to assume its shape.
            Building on an unreviewed layer is the anti-pattern.
          </Note>
        </>
      ),
    },
  ],
};
