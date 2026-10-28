import { Cmd, FileCard, Note, PromptCard } from "./content";
import type { Lab } from "./types";

const CONTOSO_DEV_AGENT = `---
name: "contoso-dev"
description: "TypeScript development agent for ContosoUniversity: implements features and fixes following the project's repository pattern, immutability rules, and testing conventions."
tools: ["read", "edit", "search"]
---

# ContosoUniversity Dev Agent

You are a senior TypeScript developer on the ContosoUniversity project. You
implement features, fix bugs, and refactor code — always following this
project's established conventions.

## Project Layout

\`\`\`
src/entities/   # Domain types: Student, Course, Instructor
src/repos/      # Repository interfaces + in-memory implementations
src/routes/     # HTTP route handlers (framework-agnostic)
tests/          # Vitest unit tests
\`\`\`

## Coding Standards

- **Async all the way** — every handler and repository method is async and
  awaited; no raw promise chains.
- **Immutability** — repositories return copies; handlers never mutate
  entities in place. Spread to update.
- **Repository pattern** — all data access goes through the interfaces in
  \`src/repos\`; handlers never hold entity arrays directly.
- **ISO dates** — \`enrollmentDate\` is an ISO date string, never a \`Date\`.
- **Validation at the boundary** — reject bad input with status 400 before
  touching a repository.

## Review Checklist

Before presenting any change, confirm:

1. Does every new function have explicit parameter and return types?
2. Are errors handled with useful messages (never swallowed)?
3. Does the change need a Vitest test, and does the test name follow
   \`<unit>.<scenario>.<expected>\`?
4. Is the public behavior of \`HttpResponse\` envelopes preserved?
`;

export const lab03: Lab = {
  id: "lab03",
  number: "03",
  title: "Creating a Dev Agent",
  tagline:
    "Build a custom agent with its own system prompt, restart to discover it, and put it to work.",
  steps: [
    {
      key: "lab03/anatomy",
      title: "Agent anatomy",
      kind: "mixed",
      verifyId: "lab03/anatomy",
      body: (
        <>
          <p>
            Before writing your own agent, dissect the one that ships here. An
            agent file has exactly two parts — read the planner's opening lines:
          </p>
          <Cmd lines={["head -30 .github/agents/planner.agent.md"]} />
          <p>
            <strong>YAML frontmatter</strong> (between the <code>---</code>{" "}
            markers): <code>name</code>, <code>description</code> — which
            Copilot uses for routing — and <code>tools</code>, the agent's
            capabilities. <strong>The markdown body</strong> is the system
            prompt: personality, expertise, rules.
          </p>
          <table>
            <thead>
              <tr>
                <th>Tool</th>
                <th>Grants</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>read</code>
                </td>
                <td>Read files from the workspace</td>
              </tr>
              <tr>
                <td>
                  <code>edit</code>
                </td>
                <td>Create and modify files</td>
              </tr>
              <tr>
                <td>
                  <code>execute</code>
                </td>
                <td>Run shell commands</td>
              </tr>
              <tr>
                <td>
                  <code>search</code>
                </td>
                <td>Search across files with grep/glob</td>
              </tr>
              <tr>
                <td>
                  <code>agent</code>
                </td>
                <td>Delegate to other agents</td>
              </tr>
              <tr>
                <td>
                  <code>web</code>
                </td>
                <td>Search the web</td>
              </tr>
            </tbody>
          </table>
          <Note>
            The planner declares only <code>read</code> and <code>search</code>{" "}
            — it plans, it doesn't build. Your dev agent will add{" "}
            <code>edit</code>. Scoping tools to the agent's job is the cheapest
            guardrail you have.
          </Note>
        </>
      ),
    },
    {
      key: "lab03/create",
      title: "Create contoso-dev.agent.md",
      kind: "mixed",
      verifyId: "lab03/create-agent",
      body: (
        <>
          <p>
            Now build a <strong>track-specific dev agent</strong> — one that
            knows this codebase's layout, build conventions, and review bar. The
            convention: <code>.github/agents/&lt;name&gt;.agent.md</code>.
          </p>
          <FileCard
            path=".github/agents/contoso-dev.agent.md"
            content={CONTOSO_DEV_AGENT}
          />
          <Note tone="warn">
            <strong>Paste the whole file, not a placeholder.</strong> The body
            below the frontmatter — all the way down to the Review Checklist —{" "}
            <em>is</em> the agent. A frontmatter-only file produces a perfectly
            discoverable agent with no idea how this project works. The Verify
            check reads the body.
          </Note>
          <p>Confirm both halves landed:</p>
          <Cmd
            lines={[
              "head -5 .github/agents/contoso-dev.agent.md",
              "grep 'Coding Standards' .github/agents/contoso-dev.agent.md",
            ]}
          />
        </>
      ),
    },
    {
      key: "lab03/select",
      title: "Restart, discover, select",
      kind: "live",
      verifyId: "lab03/select-agent",
      body: (
        <>
          <p>
            Copilot discovers <code>.github/agents/</code>{" "}
            <strong>once at session start</strong> — agent files are not
            hot-reloaded. If a session is running, your new agent is invisible
            to it. Restart, list, select:
          </p>
          <Cmd
            lines={["copilot", "/agent"]}
            label="restart + list agents"
            restart
          />
          <p>
            You should see <code>planner</code> and <code>contoso-dev</code>.
            Select yours:
          </p>
          <Cmd lines={["/agent contoso-dev"]} />
          <Note>
            If <code>contoso-dev</code> is missing, the file name or location is
            wrong — it must be exactly{" "}
            <code>.github/agents/contoso-dev.agent.md</code> — or you skipped
            the restart. Those two causes cover nearly every "my agent doesn't
            load" report in the workshop.
          </Note>
        </>
      ),
    },
    {
      key: "lab03/test",
      title: "Put the agent to work",
      kind: "live",
      verifyId: "lab03/test-agent",
      body: (
        <>
          <p>
            With your agent selected, ask it to analyze the codebase it claims
            to know:
          </p>
          <PromptCard
            agent="contoso-dev"
            prompt="Analyze src/. What entities exist, and what are their relationships?"
          />
          <p>Then give it a development task:</p>
          <PromptCard
            agent="contoso-dev"
            prompt="What would I need to change to add a search feature to the students API routes?"
          />
          <Note>
            <strong>
              Trace one instruction from your file into the answer.
            </strong>{" "}
            Your agent's standards demand async handlers, boundary validation,
            and the repository pattern — find at least one of those shaping the
            proposal. Can't find it? That's not failure — a model doesn't apply
            every rule every time. Ask:{" "}
            <em>
              "Which of the coding standards in your instructions apply to this
              change?"
            </em>{" "}
            and compare its list to your file.
          </Note>
        </>
      ),
    },
  ],
};
