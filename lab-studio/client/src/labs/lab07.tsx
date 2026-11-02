import { Cmd, FileCard, Note, PromptCard, Snippet } from "./content";
import type { Lab } from "./types";

const CONTOSO_QA_AGENT = `---
name: "contoso-qa"
description: "Testing specialist for ContosoUniversity: writes Vitest unit tests for repositories and route handlers, following the project's naming convention and edge-case checklist."
tools: ["read", "edit", "search"]
---

# ContosoUniversity QA Agent

You write tests — you do not change production code. Vitest, in tests/.

## Standards

- Test names follow \`<unit>.<scenario>.<expected>\` — e.g.
  \`createStudent.withValidPayload.returnsStudentWithId\`.
- Fresh in-memory repo per test; never share state between tests.
- Arrange-Act-Assert, one behavior per test.
- Cover the unhappy paths first: invalid ids (400), missing resources (404),
  empty repositories.

## Handoff

When asked to test a change, start from what the previous agent reports it
changed. Finish by naming the test file(s) you created and what they cover.
`;

const ORCHESTRATOR_AGENT = `---
name: "lab-orchestrator"
description: "Orchestrates a development workflow: delegates implementation to contoso-dev, testing to contoso-qa, and review to code-reviewer. Coordinates handoffs between agents."
tools: ["read", "search", "agent"]
---

# Lab Orchestrator Agent

You coordinate a sequential pipeline for ContosoUniversity:
**contoso-dev → contoso-qa → code-reviewer**.

You do NOT implement code yourself. You delegate with your agent tool and
manage the handoff between agents.

## Workflow

### Phase 1: Planning
Break the request into tasks, name the affected files, define acceptance
criteria.

### Phase 2: Implementation — dispatch contoso-dev
Delegate with a clear task, the files to modify, and the acceptance criteria.
Wait for completion before proceeding.

### Phase 3: Testing — dispatch contoso-qa
Delegate with a summary of what contoso-dev changed and the test
requirements (project naming convention, edge cases).

### Phase 4: Review — dispatch code-reviewer
Delegate a review of the change and the tests: convention compliance,
error handling, coverage adequacy.

### Phase 5: Summary
Summarize what happened across all phases, repeating at least one concrete
point from the reviewer's report.

## Delegation Rules

- Never write code yourself — always delegate.
- Wait for each phase to complete before the next.
- Pass context forward: each agent needs to know what the previous one did.
`;

export const lab07: Lab = {
  id: "lab07",
  number: "07",
  title: "Multi-Agent Orchestration",
  tagline:
    "One agent coordinates, three specialists execute — and you watch the real dispatch entries prove it.",
  steps: [
    {
      key: "lab07/design",
      title: "Design the orchestration flow",
      kind: "read",
      body: (
        <>
          <p>
            Multi-agent orchestration lets one agent coordinate work across
            specialized agents. Each worker has a focused role; the orchestrator
            manages the pipeline and never implements anything itself:
          </p>
          <Snippet title="the five-phase pipeline">{`User request
    │
    ▼
lab-orchestrator (coordinates)
    ├─ Phase 1  Planning (tasks, files, acceptance criteria)
    ├─ Phase 2  contoso-dev      — implement
    ├─ Phase 3  contoso-qa       — write tests
    ├─ Phase 4  code-reviewer    — review
    └─ Phase 5  Summary back to you`}</Snippet>
          <p>
            The key enabler is one tool: <code>agent</code>. An agent whose
            tools include it can dispatch other agents:
          </p>
          <Snippet>{`tools: ["read", "search", "agent"]   # 'agent' enables delegation`}</Snippet>
          <Note>
            <strong>Why orchestrate?</strong> Each worker holds deep, narrow
            expertise and its own tool scope — the reviewer can't edit, the
            orchestrator can't execute. The pipeline's quality comes from those
            constraints, not despite them.
          </Note>
        </>
      ),
    },
    {
      key: "lab07/workers",
      title: "Assemble the worker agents",
      kind: "mixed",
      verifyId: "lab07/workers",
      body: (
        <>
          <p>
            The pipeline needs three workers. <code>code-reviewer</code> ships
            with the workspace, <code>contoso-dev</code> is yours from Lab 03,
            and <code>contoso-qa</code> is new — create it now:
          </p>
          <FileCard
            path=".github/agents/contoso-qa.agent.md"
            content={CONTOSO_QA_AGENT}
          />
          <p>Check all three exist:</p>
          <Cmd lines={["ls .github/agents"]} />
          <Note>
            Skipped Lab 03? The verify will tell you <code>contoso-dev</code> is
            missing — hop back to Lab 03 step 2, insert it, and return here.
          </Note>
        </>
      ),
    },
    {
      key: "lab07/orchestrator",
      title: "Create the orchestrator",
      kind: "mixed",
      verifyId: "lab07/orchestrator",
      body: (
        <>
          <p>
            The orchestrator's frontmatter is the design decision:{" "}
            <code>agent</code> for delegation, <code>read</code>/
            <code>search</code> for planning — and deliberately <em>no</em>{" "}
            <code>edit</code> or <code>execute</code>. An orchestrator that can
            implement will; one that can't, delegates.
          </p>
          <FileCard
            path=".github/agents/lab-orchestrator.agent.md"
            content={ORCHESTRATOR_AGENT}
          />
        </>
      ),
    },
    {
      key: "lab07/delegate",
      title: "Run the pipeline — dispatches, not narration",
      kind: "live",
      verifyId: "lab07/delegate",
      body: (
        <>
          <p>
            Restart so all four agents are discovered, select the orchestrator,
            and hand it a small feature:
          </p>
          <Cmd lines={["copilot", "/agent lab-orchestrator"]} restart />
          <PromptCard
            agent="lab-orchestrator"
            prompt="The students API already supports a search query. Add an optional 'limit' parameter to listStudents in src/routes/students.ts that caps how many students are returned, then have tests written and the change reviewed."
          />
          <Note tone="warn">
            <strong>Narration is not delegation.</strong> An orchestrator can
            write "Delegating to contoso-dev…" without dispatching anything. The
            proof is the green <strong>⇄ dispatch</strong> chips in the bench —
            each one is a real <code>subagent.started</code> event with its own
            context window, tool calls, and token count. The Verify below counts
            actual dispatches, not phase headings.
          </Note>
          <p>
            Expect several minutes: each phase is a full agent run. Watch the
            chips arrive — <code>contoso-dev</code> (with edit tools), then{" "}
            <code>contoso-qa</code> (writing the test file), then{" "}
            <code>code-reviewer</code> (read-only). The Phase 5 summary should
            repeat something the reviewer actually said.
          </p>
          <Note>
            <strong>Going further:</strong> this pipeline is sequential inside
            one session. For true parallelism the workshop's answer is git
            worktrees — one isolated checkout and one Copilot session per
            workstream, with you as the orchestrator. Lab 14 operationalizes
            that pattern.
          </Note>
        </>
      ),
    },
  ],
};
