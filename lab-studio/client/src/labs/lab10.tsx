import { Cmd, FileCard, Note, PromptCard, Snippet } from "./content";
import type { Lab } from "./types";

const REPOS_INSTRUCTIONS = `---
description: "Repository-layer conventions for ContosoUniversity"
applyTo: '**/src/repos/*.ts'
---

# Repository Layer Rules

- Every new repository implementation must have a corresponding Vitest test
  file under tests/, following the \`<unit>.<scenario>.<expected>\` naming
  convention.
- Repositories return immutable copies; callers never see shared state.
- IDs are assigned by the repository, never by the caller.
`;

export const lab10: Lab = {
  id: "lab10",
  number: "10",
  title: "Agent Memory",
  tagline:
    "Three layers of memory — raw sources, a markdown wiki, a binding schema — and the consolidation loop that promotes between them.",
  steps: [
    {
      key: "lab10/layer1",
      title: "Layer 1 — raw sources (one task)",
      kind: "live",
      verifyId: "lab10/layer1",
      body: (
        <>
          <p>
            The capstone of the local Copilot surface:{" "}
            <strong>how Copilot remembers across sessions</strong> — with
            nothing but markdown in git. Three layers, promotion flows upward,
            nothing lives in two layers at once:
          </p>
          <table>
            <thead>
              <tr>
                <th>Layer</th>
                <th>Surface</th>
                <th>Lifetime</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 — Raw sources</td>
                <td>plan.md, session SQL todos, transcripts</td>
                <td>One task (kept on disk, never curated)</td>
              </tr>
              <tr>
                <td>2 — The Wiki</td>
                <td>
                  <code>.copilot/lessons/</code>
                </td>
                <td>Across sessions, in markdown</td>
              </tr>
              <tr>
                <td>3 — The Schema</td>
                <td>
                  <code>AGENTS.md</code>, <code>.github/instructions/</code>,
                  agent personalities
                </td>
                <td>Forever, binding</td>
              </tr>
            </tbody>
          </table>
          <p>
            Layer 1 is the work-in-flight. Each session carries its own SQLite
            store with a <code>todos</code> table the agent reads and writes
            through its <code>sql</code> tool — try it:
          </p>
          <PromptCard prompt="Create a small plan for adding a Department dashboard page. Track 3 todos in the session database with id, title, description — then show me the list." />
          <Note>
            <strong>Rule of thumb:</strong> if a teammate joining tomorrow would
            need it, it does <em>not</em> belong in Layer 1. After{" "}
            <code>/new</code>, this session's todos are invisible to the next —
            anything durable has to be promoted before you clear.
          </Note>
        </>
      ),
    },
    {
      key: "lab10/wiki",
      title: "Layer 2 — the wiki, and recall",
      kind: "live",
      verifyId: "lab10/wiki",
      body: (
        <>
          <p>
            The wiki is a directory of markdown the agent writes{" "}
            <em>to itself</em>: a catalog (<code>index.md</code>), an
            append-only journal (<code>log.md</code>), and one topic file per
            durable lesson. Its shape is enforced by{" "}
            <code>.github/instructions/lessons.instructions.md</code>, whose{" "}
            <code>applyTo</code> glob targets the wiki. Inspect what ships, then
            record a lesson:
          </p>
          <Cmd
            lines={[
              "ls .copilot/lessons",
              "cat .copilot/lessons/example-lesson.md",
            ]}
          />
          <PromptCard prompt="I just discovered that running a single test file (vitest run tests/student-repo.test.ts) never typechecks the route handlers, so a type error in src/routes only surfaces under a full tsc --noEmit. Append a lesson to .copilot/lessons/log.md following the schema in .github/instructions/lessons.instructions.md. Leave 'Promoted to' blank." />
          <p>
            Now the payoff — recall from a session that never saw any of that.
            Restart, then ask:
          </p>
          <Cmd lines={["copilot"]} restart label="fresh session" />
          <PromptCard prompt="What have we learned about verifying changes in this repo? Check .copilot/lessons/, including log.md, before answering." />
          <Note>
            Read the answer critically: <code>example-lesson.md</code> shipped
            with the workspace, so citing it proves only that the agent can
            read. The <code>log.md</code> entry surviving the restart is{" "}
            <em>your</em> lesson demonstrating the layer.
          </Note>
        </>
      ),
    },
    {
      key: "lab10/schema",
      title: "Layer 3 — the schema that binds",
      kind: "live",
      verifyId: "lab10/schema",
      body: (
        <>
          <p>
            Layer 3 is not a memory of what happened — it's a memory of{" "}
            <em>how to behave</em>. Add a binding rule where its{" "}
            <code>applyTo</code> glob covers the work it governs:
          </p>
          <FileCard
            path=".github/instructions/repos.instructions.md"
            content={REPOS_INSTRUCTIONS}
          />
          <p>
            Now watch it fire. Restart (instructions load at session start) and
            ask for a scaffold — <em>without mentioning tests</em>:
          </p>
          <Cmd lines={["copilot"]} restart />
          <PromptCard prompt="Scaffold an in-memory CourseRepo implementation for the ContosoUniversity data layer, following the existing student repo patterns." />
          <Note>
            <strong>The observable:</strong> a matching Vitest test file created{" "}
            <em>without being asked for</em> — the rule firing because the files
            being written match the glob. A miss isn't proof of failure (models
            skip rules sometimes); it's a prompt to check{" "}
            <code>/instructions</code> lists your file.
          </Note>
          <Note>
            <strong>Rules of thumb:</strong> useful recall → Layer 2. A rule
            every task must obey → Layer 3. Lessons are advisory; schema is
            binding.
          </Note>
        </>
      ),
    },
    {
      key: "lab10/consolidate",
      title: "Consolidation — and the loop, drawn",
      kind: "live",
      verifyId: "lab10/consolidate",
      body: (
        <>
          <p>
            The wiki accumulates entropy: duplicates, stale entries, log items
            never promoted. This workspace's answer is the{" "}
            <code>consolidate-lessons</code> skill — and the discipline is{" "}
            <strong>dry run first</strong>:
          </p>
          <PromptCard prompt="Follow .github/skills/consolidate-lessons/SKILL.md with --dry-run --scope project. Do not write any files." />
          <p>Read its plan. When it looks right, run it for real:</p>
          <PromptCard prompt="Follow .github/skills/consolidate-lessons/SKILL.md with --scope project." />
          <p>
            Then check the result: your <code>log.md</code> entry's{" "}
            <code>Promoted to:</code> line is filled in, a topic file carries
            the lesson with its evidence, and <code>index.md</code> gained one
            bullet:
          </p>
          <Cmd lines={["cat .copilot/lessons/log.md", "ls .copilot/lessons"]} />
          <Snippet title="the loop, drawn">{`Layer 1              Layer 2                 Layer 3
Raw sources ───────► The Wiki ─────────────► The Schema
(plan, todos)        (.copilot/lessons/)     (AGENTS.md, instructions)

one task             consolidate-lessons     hardens into a rule
                     promotes log → topic    when it must bind
                                             every task`}</Snippet>
          <Note>
            One more pattern worth knowing: the <code>handoff</code> skill
            writes a file a fresh conversation can resume from — Lab 14 drills
            it. Three layers, one direction of promotion, zero servers to
            operate.
          </Note>
        </>
      ),
    },
  ],
};
