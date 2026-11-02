import { Cmd, FileCard, Note, PromptCard } from "./content";
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

const AGENTS_WITH_ADR = `# ContosoUniversity — Agent Context

ContosoUniversity is a small university administration app: students enroll in
courses, instructors teach them, enrollments carry grades.

## Layout

\`\`\`
src/entities/   # Domain types: Student, Course, Instructor
src/repos/      # Repository interfaces + in-memory implementations
src/routes/     # HTTP route handlers (framework-agnostic)
tests/          # Vitest unit tests
\`\`\`

## Non-obvious context

- Repositories return **immutable copies** — callers must never see shared state.
- IDs are assigned by the repository, not the caller.
- \`enrollmentDate\` is always stored as an ISO date string, never a \`Date\` object,
  because the original data import produced strings and the app round-trips them.

## Architecture Decisions

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
        </>
      ),
    },
    {
      key: "lab02/agents-md",
      title: "AGENTS.md — context, not rules",
      kind: "mixed",
      verifyId: "lab02/agents-md",
      body: (
        <>
          <p>
            <code>AGENTS.md</code> carries project <em>context</em> —
            architecture, decisions, domain knowledge. Use it for the{" "}
            <em>what</em> and <em>why</em>; use{" "}
            <code>copilot-instructions.md</code> for the <em>rules</em>. You'll
            record an Architecture Decision Record:
          </p>
          <FileCard path="AGENTS.md" mode="replace" content={AGENTS_WITH_ADR} />
          <Note>
            <strong>What research says:</strong> context files don't generally
            improve task success and raise inference cost ~20% — agents can
            discover repo structure themselves. They earn their keep on{" "}
            <em>non-obvious</em> facts (like this workspace's "enrollmentDate is
            a string" rule). Keep AGENTS.md short: only things the agent can't
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
        </>
      ),
    },
  ],
};
