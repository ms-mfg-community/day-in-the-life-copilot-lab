import { Cmd, FileCard, Note, PromptCard, Snippet } from "./content";
import type { Lab } from "./types";

const INSTRUCTIONS_WITH_CONVENTIONS = `# ContosoUniversity — Repository Instructions

- TypeScript strict mode everywhere; no \`any\`.
- Prefer immutable data: spread to update, never mutate in place.
- All async code uses async/await — no raw promise chains.
- Tests use Vitest with \`describe\` / \`it\` / \`expect\`.

## ContosoUniversity Conventions

- All route handlers are async and return an \`HttpResponse\` envelope
  (\`{ status, body: { success, data?, error? } }\`).
- Use the repository pattern via the interfaces in \`src/repos\` — never let a
  route handler hold entity arrays or share state directly.
- Student names are displayed as "LastName, FirstMidName" throughout the UI —
  always via the \`displayName()\` helper.
- Course IDs are department-assigned integers in the range 1000-9999 —
  validate the range, never auto-generate them.
`;

const ROUTES_INSTRUCTIONS = `---
description: "Route handler conventions for ContosoUniversity"
applyTo: '**/src/routes/*.ts'
---

# Route Handler Guidelines

- Every handler is async and returns an \`HttpResponse\` envelope.
- Validate inputs at the boundary: reject bad ids with status 400 before
  touching a repository.
- Missing resources return status 404 with \`success: false\` and a
  human-readable \`error\`.
- Display student names with \`displayName()\` — never format names inline.
- No direct entity-array access — handlers depend on repository interfaces only.
`;

// The anti-pattern the lab shows and then declines to add: an ADR that repeats
// a rule copilot-instructions.md already carries and describes folders Copilot
// can list for itself. Display-only — no card writes it.
const ADR_ANTI_PATTERN = `## Architecture Decisions

### ADR-001: Repository Pattern for Data Access

**Status**: Accepted

**Context**: Route handlers need data access but should not depend on any
concrete storage mechanism or share mutable state.

**Decision**: All data access goes through the repository interfaces in
\`src/repos\` (e.g. \`StudentRepo\`). Implementations live beside them
(\`in-memory-student-repo.ts\` today; a database-backed repo later).

**Consequences**:
- Handlers are testable with in-memory repositories
- Storage can be swapped without touching route handlers
- Every query goes through a single abstraction layer
`;

// What the card writes instead: the non-obvious facts the workspace already
// had, plus operational notes — nothing Copilot can discover by listing src/.
const AGENTS_WITH_OPERATIONAL_NOTES = `# ContosoUniversity — Agent Context

ContosoUniversity is a small university administration app: students enroll in
courses, instructors teach them, enrollments carry grades.

## Non-obvious context

- Repositories return **immutable copies** — callers must never see shared state.
- IDs are assigned by the repository, not the caller.
- \`enrollmentDate\` is always stored as an ISO date string, never a \`Date\` object,
  because the original data import produced strings and the app round-trips them.

## Operational Notes

- **No database.** Repositories are in-memory and start empty every time the
  process starts, so a test that needs students builds its own repo
  (\`createInMemoryStudentRepo(seed)\`) and nothing persists between runs.
- **Tests.** \`npm test\` runs Vitest (\`vitest run\`). The package is ESM, so
  relative imports keep the \`.js\` suffix even though the files are \`.ts\`.
- **Never hand-edit generated or skill-maintained files.**
  \`.github/workflows/*.lock.yml\` is compiled from the matching \`.md\` — edit
  the \`.md\`, then run \`gh aw compile\`. Lessons move from
  \`.copilot/lessons/log.md\` into topic files and \`index.md\` through the
  \`consolidate-lessons\` skill, never by hand.
`;

export const lab02: Lab = {
  id: "lab02",
  number: "02",
  title: "Custom Instructions & AGENTS.md",
  tagline:
    "Change Copilot's behavior repo-wide, scope rules to file types, and prove the reload actually happened.",
  steps: [
    {
      key: "lab02/repo-rules",
      title: "Modify copilot-instructions.md",
      kind: "mixed",
      verifyId: "lab02/repo-rules",
      body: (
        <>
          <p>
            <code>.github/copilot-instructions.md</code> is loaded automatically
            at the start of <strong>every</strong> session, so adding a rule
            here is the fastest way to change Copilot's behavior across the
            whole repository. You'll add a project-conventions section.
          </p>
          <p>
            Edit the file in the <strong>Files</strong> tab and add the{" "}
            <code>## ContosoUniversity Conventions</code> section below — or let
            the studio write the complete file for you:
          </p>
          <FileCard
            path=".github/copilot-instructions.md"
            mode="replace"
            content={INSTRUCTIONS_WITH_CONVENTIONS}
          />
          <Note tone="warn">
            <strong>Restart required after editing config files.</strong>{" "}
            Copilot loads instructions, agents, skills and MCP configs{" "}
            <em>once at session start</em> — they are not hot-reloaded on save.
            After any edit in this lab: <code>/exit</code> the session, then
            start <code>copilot</code> again (or <code>/new</code> inside it).
            Skip this and you'll be debugging stale config — and blaming Copilot
            for following yesterday's rules. Step 4 proves the reload
            deterministically.
          </Note>
        </>
      ),
    },
    {
      key: "lab02/path-rule",
      title: "Create a path-specific instruction",
      kind: "mixed",
      verifyId: "lab02/path-rule",
      body: (
        <>
          <p>
            Path-specific instructions apply rules only to matching files. Each
            one is markdown with a YAML frontmatter header whose{" "}
            <code>applyTo</code> glob selects the files it governs —{" "}
            <code>**/src/routes/*.ts</code> matches every route handler, nothing
            else.
          </p>
          <FileCard
            path=".github/instructions/routes.instructions.md"
            content={ROUTES_INSTRUCTIONS}
          />
          <p>
            Confirm the frontmatter landed — the first four lines are the switch
            that scopes the rule:
          </p>
          <Cmd
            lines={["head -4 .github/instructions/routes.instructions.md"]}
          />
          <Note>
            <strong>Instructions combine.</strong> When Copilot works on{" "}
            <code>src/routes/students.ts</code> it now loads{" "}
            <code>copilot-instructions.md</code> + <code>AGENTS.md</code> +{" "}
            <code>routes.instructions.md</code> — all three at once, no
            precedence. That's why rules must not contradict each other.
          </Note>
          <Note tone="warn">
            <strong>
              🚫 Spot the Anti-Pattern: bloated domain instructions.
            </strong>{" "}
            Set the five short rules you just wrote beside the prompt many teams
            paste into a <code>**/*.ts</code> instruction file:
            <ul>
              <li>
                ✅ <strong>Stack-matched, about 40 lines</strong> — the
                conventions the app really follows and nothing else (the
                workshop repository's own <code>dotnet.instructions.md</code>
                is this size).
              </li>
              <li>
                ❌ <strong>Copy-pasted, about 230 lines</strong> — a "DDD for
                financial systems" compliance prompt: PCI-DSS and SOX
                attestations, currency value objects, saga patterns and a
                mandatory planning ritual before every edit, for a university
                app that takes no payments.
              </li>
            </ul>
            <code>applyTo</code> decides <em>when</em> a file loads, not what it
            costs. Every line of a matching file spends context tokens on every
            file match and steers the model toward rules your code never
            follows. Before you add a rule, ask whether a reviewer would
            actually enforce it in this repository.
          </Note>
        </>
      ),
    },
    {
      key: "lab02/agents-md",
      title: "AGENTS.md — operational notes, not an ADR",
      kind: "mixed",
      verifyId: "lab02/agents-md",
      body: (
        <>
          <p>
            <code>AGENTS.md</code> gives Copilot project context it{" "}
            <strong>cannot work out by reading the repository</strong> — how the
            project runs, what is generated, what not to touch. Use it for that
            operational context; use <code>copilot-instructions.md</code> for
            the <em>rules</em>.
          </p>
          <Note tone="warn">
            <strong>
              🚫 Spot the Anti-Pattern: what does NOT belong in AGENTS.md.
            </strong>{" "}
            The most common first entry in an <code>AGENTS.md</code> is an
            Architecture Decision Record (ADR). Read the one below and mark
            every line Copilot could learn without it — because step 1 already
            put it in <code>copilot-instructions.md</code>, or because Copilot
            can read it straight from the repository. Then do{" "}
            <strong>not</strong> add it.
          </Note>
          <Snippet title="❌ Do not add this — ADR-001 (display only)">
            {ADR_ANTI_PATTERN}
          </Snippet>
          <table>
            <thead>
              <tr>
                <th>Part of ADR-001</th>
                <th>Why it does not belong in AGENTS.md</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  "All data access goes through the repository interfaces in{" "}
                  <code>src/repos</code>"
                </td>
                <td>
                  <strong>Duplicated.</strong> The rule you added to{" "}
                  <code>copilot-instructions.md</code> in step 1 already says
                  "use the repository pattern via the interfaces in{" "}
                  <code>src/repos</code>". Two always-loaded files now state the
                  same thing, so Copilot reads it twice.
                </td>
              </tr>
              <tr>
                <td>
                  "Implementations live beside them (
                  <code>in-memory-student-repo.ts</code> today…)"
                </td>
                <td>
                  <strong>Discoverable.</strong> Where the files are is a
                  repository overview, and Copilot learns it by listing{" "}
                  <code>src/repos</code>.
                </td>
              </tr>
              <tr>
                <td>Status, Context, Consequences</td>
                <td>
                  <strong>History for people.</strong> Nothing here changes what
                  the agent does next.
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            This is the pattern <em>Evaluating AGENTS.md</em> (arXiv:2602.11988)
            measured: repository overviews did not help, and context files
            raised inference cost by over 20% on average. Lines Copilot already
            has, or can find itself, add cost without adding information.
          </p>
          <p>
            <strong>✅ Add this instead</strong> — operational context Copilot
            can't discover by reading files, and would otherwise learn by
            failing. The card writes the complete file: it keeps the non-obvious
            facts this workspace's <code>AGENTS.md</code> already has, drops its
            old <code>## Layout</code> block (the same discoverable-overview
            mistake in miniature — <code>ls src</code> tells Copilot the same
            thing for free), and adds <code>## Operational Notes</code>:
          </p>
          <FileCard
            path="AGENTS.md"
            mode="replace"
            content={AGENTS_WITH_OPERATIONAL_NOTES}
          />
          <Note>
            <strong>AGENTS.md vs copilot-instructions.md:</strong> use{" "}
            <code>copilot-instructions.md</code> for <em>rules</em> ("always use
            async"). Use <code>AGENTS.md</code> for{" "}
            <em>context the agent can't discover</em> ("tests build their own
            in-memory repo; never hand-edit generated files"). Copilot discovers
            both automatically and combines them.
          </Note>
          <Note>
            <strong>What research says:</strong> context files don't generally
            improve task success and raise inference cost by over 20% on average
            — and that held for developer-committed files as well as
            LLM-generated ones. Agents do follow a context file's instructions,
            but repository overviews, though popular, weren't helpful. Context
            files earn their keep on <em>non-standard practices</em> (like this
            workspace's "enrollmentDate is a string" rule, or "never edit
            generated files"). Keep AGENTS.md short: only things the agent can't
            discover on its own.
          </Note>
        </>
      ),
    },
    {
      key: "lab02/reload",
      title: "Restart and prove it loaded",
      kind: "live",
      verifyId: "lab02/reload",
      body: (
        <>
          <p>
            Your three edits are on disk, but any session started before them is
            still running on yesterday's rules. Restart, then check what the
            discovery pass actually found:
          </p>
          <Cmd
            lines={["copilot", "/instructions"]}
            label="restart + deterministic check"
            restart
          />
          <p>
            <code>/instructions</code> reports what Copilot <em>found</em>{" "}
            rather than asking a model to describe itself — that's the proof.
            (If a file shows a <code>!</code> marker, it was created after the
            session started: restart with <code>/new</code>.) Now watch the
            conventions shape a real answer:
          </p>
          <PromptCard prompt="What patterns should I follow when adding a new route handler to ContosoUniversity?" />
          <Note>
            Expect the envelope convention, the repository-pattern rule, and the
            "LastName, FirstMidName" display rule to surface — verbatim from the
            files you just wrote. A generic answer means a stale session: run{" "}
            <code>/new</code> and ask again.
          </Note>
          <p>
            Then probe the notes you added to <code>AGENTS.md</code> with a
            question only they answer well:
          </p>
          <PromptCard prompt="What should I never edit by hand in this workspace, and how are the generated workflow files produced?" />
          <Note>
            Expect <code>.lock.yml</code> files compiled from the matching{" "}
            <code>.md</code> with <code>gh aw compile</code>, and lessons
            promoted by the <code>consolidate-lessons</code> skill. Copilot can
            dig some of this out of the repository too, so treat the answer as a
            hint — <code>/instructions</code> listing <code>AGENTS.md</code> is
            the proof that it loaded.
          </Note>
          <Note>
            <strong>
              🔍 Debug It — is the new rule in the request, or only on disk?
            </strong>{" "}
            <code>/instructions</code> tells you Copilot <em>found</em> the
            file. Two questions come after it: did the text reach the model, and
            did the model follow it? Discovery, inclusion and following are
            three different checks.
            <ul>
              <li>
                <strong>Copilot CLI:</strong> type these inside a running
                session. <code>/env</code> lists everything the session loaded,
                instructions included, and <code>/context</code> splits the
                context window into System Prompt, Custom Instructions, System
                Tools, MCP Tools, Messages, Free Space and Buffer, so you can
                see what your instructions cost. (The bench terminal emulates{" "}
                <code>/instructions</code> and <code>/env</code>;{" "}
                <code>/context</code> is real-CLI only.)
              </li>
              <li>
                <strong>VS Code:</strong> run{" "}
                <strong>Chat: Open Customizations</strong> and select{" "}
                <strong>Instructions</strong> to see each file's source and any
                error. Then use <strong>Show Agent Debug Logs</strong> and
                filter to <strong>Discovery</strong> to see whether the file was
                loaded, skipped or rejected, and{" "}
                <strong>Show Chat Debug View</strong> to look for its text in
                the <strong>System prompt</strong>. If the text reached the
                model and the answer still ignores it, look for conflicting
                rules: a rule can be loaded and not followed.
              </li>
            </ul>
          </Note>
        </>
      ),
    },
  ],
};
