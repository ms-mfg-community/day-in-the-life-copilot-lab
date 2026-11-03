import { Cmd, FileCard, Note, PromptCard, Quiz, Snippet } from "./content";
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
  title: "Agent Memory: Copilot Memory, Lessons, and Custom Memory Services",
  tagline:
    "Three layers of memory — raw sources, advisory recall (Copilot Memory, a markdown wiki, or a service you run), a binding schema — and the curation that promotes between them.",
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
            <strong>how Copilot remembers across sessions</strong>, and the one
            idea underneath every option —{" "}
            <strong>memory is advisory; instruction files are binding.</strong>{" "}
            Three layers, promotion flows upward, nothing lives in two layers at
            once:
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
                <td>2 — Recall (advisory), native</td>
                <td>
                  GitHub Copilot Memory: repository-level facts + user-level
                  preferences (Copilot Dreaming curation is in preview)
                </td>
                <td>Across sessions and Copilot surfaces, hosted by GitHub; expires unless reinforced</td>
              </tr>
              <tr>
                <td>2 — Recall (advisory), DIY</td>
                <td>
                  The wiki: <code>.copilot/lessons/</code>
                </td>
                <td>Across sessions, in markdown and in git</td>
              </tr>
              <tr>
                <td>2 — Recall (advisory), custom</td>
                <td>A memory service you run (SCNS is the worked example)</td>
                <td>Whatever the service's own rules allow</td>
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
            anything durable has to be promoted into Recall before you clear.
          </Note>
        </>
      ),
    },
    {
      key: "lab10/copilot-memory",
      title: "Layer 2, native — GitHub Copilot Memory",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            The first flavour of Recall is{" "}
            <strong>GitHub Copilot Memory</strong> (generally available on paid
            plans). Copilot stores small, durable notes <em>on GitHub</em> — on
            its own as you work, or when you ask — in two kinds that are
            stored, shared and deleted differently:
          </p>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Repository-level fact</th>
                <th>User-level preference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Holds</td>
                <td>A fact about one codebase: a convention, a build command</td>
                <td>How <em>you</em> like to work, across projects</td>
              </tr>
              <tr>
                <td>Applies</td>
                <td>Only in that repository (not copied to forks)</td>
                <td>In your sessions across all your repositories</td>
              </tr>
              <tr>
                <td>Who uses it</td>
                <td>Anyone with read access who has Memory on</td>
                <td>You</td>
              </tr>
              <tr>
                <td>Deleted in</td>
                <td>The repository's settings</td>
                <td>Your personal settings</td>
              </tr>
            </tbody>
          </table>
          <ul>
            <li>
              <strong>Your words choose the scope.</strong> Say "In this
              repository, …" for a fact and "In all my projects, …" for a
              preference; don't rely on "always" or "going forward" to imply
              one. Copilot may still decline to store anything.
            </li>
            <li>
              <strong>It forgets on a clock, not on request.</strong> An
              unreinforced memory expires (90 days by default). Asking Copilot
              to "forget" only <em>downvotes</em> it — deleting happens in your
              github.com settings.
            </li>
            <li>
              <strong>It is advisory.</strong> Copilot decides whether to use a
              memory. GitHub's own guidance: to get consistent behaviour, use
              custom instructions — Layer 3 — rather than relying on memory.
            </li>
          </ul>
          <Note tone="warn">
            <strong>Not run in Lab Studio.</strong> Storing a memory writes to
            your real GitHub account (and a repository-level fact is shared
            with that repository's readers), so the sandbox never does it. In
            the full workshop you check <code>/memory</code>, store one
            preference and one fact in your own fork, recall them in a fresh
            session, validate a bulk file with{" "}
            <code>copilot memories import … --dry-run</code> (never without{" "}
            <code>--dry-run</code>), and delete what you stored in settings.
            Here, the knowledge check is the step.
          </Note>
          <Quiz
            stepKey="lab10/copilot-memory"
            question="You want Copilot to remember where the Node track's tests live in this repo, and you want every agent to always add a test for new repositories. Which plan is right?"
            options={[
              'Say "Always remember the tests live in node/tests/" — "always" makes it a binding, repo-wide memory; later ask Copilot to forget it to remove it',
              'Say "In this repository, the Node tests live in node/tests/" for a repository-level fact; put the always-add-a-test rule in an instruction file, because memory is advisory; delete the fact in the repo\'s settings, since "forget" only downvotes it',
              'Say "In all my projects, the Node tests live in node/tests/" so every teammate gets it; a stored memory binds like AGENTS.md once you approve it',
            ]}
            correct={1}
            explain="Scope comes from your words (“in this repository” → a repo-level fact readers of that repo share; “in all my projects” → a preference only you get). Memory is a hint Copilot may or may not use, so a must-always rule belongs in Layer 3. And Copilot can't delete a memory from a prompt — “forget” downvotes; deleting happens in settings."
          />
        </>
      ),
    },
    {
      key: "lab10/wiki",
      title: "Layer 2, DIY — the wiki, and recall",
      kind: "live",
      verifyId: "lab10/wiki",
      body: (
        <>
          <p>
            The second flavour of Recall — and the one this workspace ships —
            is a directory of markdown the agent writes <em>to itself</em>: a
            catalog (<code>index.md</code>), an append-only journal (
            <code>log.md</code>), and one topic file per durable lesson. Set
            against Copilot Memory it trades convenience for control: nothing
            to host, and every lesson is a file you can diff, review and
            revert. Its shape is enforced by{" "}
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
          <PromptCard prompt="I just discovered that running a single test file (vitest run tests/student-repo.test.ts) never typechecks the route handlers, so a type error in src/routes only surfaces under a full tsc --noEmit. Append a lesson to .copilot/lessons/log.md following the schema in .github/instructions/lessons.instructions.md. Leave 'Promoted to' blank. Write it to the wiki only; do not store it as a Copilot memory." />
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
            <em>your</em> lesson demonstrating the layer. Note the prompt had
            to name <code>.copilot/lessons/</code>: the wiki is not loaded
            automatically, so a session reads it only when told to.
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
            <em>how to behave</em>, and it is the one layer that{" "}
            <strong>binds</strong>: an instruction file loads whenever its
            scope matches, while a memory is used only when Copilot judges it
            relevant. No Layer 2 option — hosted, DIY or custom — replaces it.
            Add a binding rule where its <code>applyTo</code> glob covers the
            work it governs:
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
            every task must obey → Layer 3. Recall is advisory; schema is
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
            <code>consolidate-lessons</code> skill (in the CLI it's a command
            skill you run as <code>/consolidate-lessons</code>; here you ask
            the session to follow it) — and the discipline is{" "}
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
          <Snippet title="the loop, drawn">{`Layer 1           Layer 2 · Recall (advisory)              Layer 3
Raw sources ────► native  Copilot Memory  ───────────► The Schema
(plan, todos)     DIY     .copilot/lessons/            (AGENTS.md,
                  custom  a service you run             instructions)

one task          promoted when durable:               hardens into a rule
                  consolidate-lessons log → topic;     when it must bind
                  Copilot votes, unused memories expire every task`}</Snippet>
          <Note tone="warn">
            <strong>Copilot Dreaming — explained, not enabled.</strong> It is
            GitHub's hosted curation pass for Copilot Memory, still in{" "}
            <strong>public preview</strong> (Memory itself is GA). It runs in
            the background on GitHub's schedule, adds/updates/deletes memories{" "}
            <em>without asking per change</em>, and proposes instruction or
            skill updates only as pull requests a human merges. It needs your
            sessions synced to GitHub, and{" "}
            <strong>every run bills AI credits — even one that changes nothing</strong>.
            Turning it off stops future runs but does <em>not</em> undo what
            earlier runs changed. Neither this lab nor the full workshop turns
            it on. The trade versus <code>consolidate-lessons</code>: control
            (dry run, every change a diff in git) versus convenience — and
            Dreaming does not curate your <code>.copilot/</code> wiki.
          </Note>
          <Note>
            One more pattern worth knowing: the <code>handoff</code> skill
            writes a file a fresh conversation can resume from — Lab 14 drills
            it. Three layers, one direction of promotion, three ways to recall
            — and only Layer 3 binds.
          </Note>
        </>
      ),
    },
    {
      key: "lab10/custom-memory",
      title: "Layer 2, custom — when a memory service pays off",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>
            The third flavour of Recall is a{" "}
            <strong>memory service you run yourself</strong>. The workshop's
            worked example is{" "}
            <a href="https://github.com/johnhain-msft/scns" target="_blank" rel="noreferrer">
              SCNS
            </a>{" "}
            — an <strong>alpha</strong>, local-first background service: a
            broker per registered repository, a local SQLite vault with
            full-text and local-embedding search, and Copilot CLI hooks that can
            add relevant memories to your prompts. By its own README it is{" "}
            <em>not</em> a replacement for instruction files, not hosted, and
            not magic retrieval. This step is read-and-compare: nothing is
            installed or run, here or in the full workshop.
          </p>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Copilot Memory</th>
                <th>The wiki</th>
                <th>Custom (SCNS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Who runs it</td>
                <td>GitHub</td>
                <td>You, with git — nothing to host</td>
                <td>You: install, secure, back up, upgrade (alpha)</td>
              </tr>
              <tr>
                <td>Inspect it</td>
                <td>Settings page; delete, can't edit</td>
                <td>
                  <code>cat</code>, <code>git diff</code>, PR review
                </td>
                <td>Its local DB/files; injected context is hidden</td>
              </tr>
              <tr>
                <td>Curated by</td>
                <td>Copilot votes + expiry; optionally Dreaming</td>
                <td>
                  You, with <code>consolidate-lessons</code>
                </td>
                <td>Its scheduled jobs + your prune/delete commands</td>
              </tr>
              <tr>
                <td>Binds?</td>
                <td>No — advisory</td>
                <td>No — advisory</td>
                <td>No — advisory</td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>When it pays off.</strong> Not for keeping data local (the
                        global wiki in your home folder already does — a pushed project
                        wiki does not), not for isolating repositories (repo-level facts
            and the project wiki already are), and never for a rule that must
            always hold (that's Layer 3). A service earns its operating cost
            only when you <em>require</em> retrieval a markdown index can't give
            (semantic search with auto-injection), automated retention under
            your own rules, or coordination across many agents/sessions or
            repositories — and someone will actually run it.
          </p>
          <Quiz
            stepKey="lab10/custom-memory"
            question="Your team wants (a) lessons kept off any hosted service, and (b) a rule that every PR description links its spec, enforced on every task. Should you stand up a custom memory service like SCNS?"
            options={[
              "Yes — a local service is the only way to keep memory off GitHub, and it will enforce the rule on every prompt",
              "No — the global wiki in your home folder already keeps lessons local, and an always-holds rule belongs in an instruction file; a service only pays off for retrieval, retention or coordination needs the simpler options can't meet",
              "Yes — but only once Copilot Dreaming is enabled to curate it",
            ]}
            correct={1}
            explain="Neither need justifies operating a service: the global wiki is local markdown that is never pushed, and every Layer 2 option — custom included — is advisory, so binding rules go in Layer 3. Reach for a service when semantic retrieval, automated retention, or multi-agent coordination is a real requirement and you'll own its upkeep."
          />
        </>
      ),
    },
  ],
};
