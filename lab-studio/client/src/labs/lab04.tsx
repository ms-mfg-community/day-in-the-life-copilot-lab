import { Cmd, FileCard, Note, PromptCard, Snippet } from "./content";
import type { Lab } from "./types";

// Display-only headers for the "spot the anti-pattern" exercise — nothing
// writes them. The second is a regular string on purpose: it shows the IDE-only
// placeholder, and a template literal would try to interpolate it.
const BROAD_SKILL_HEADER = `---
name: helper
description: "Helps with coding, testing, git, docs and anything else in the repo."
---
`;

const UNINVOCABLE_SKILL_HEADER =
  '---\nname: commit\ndescription: "Commit my changes"\ndisable-model-invocation: true\n---\nWrite a commit message for ${input:scope}, starting with ADD:, UP: or DEL:.\n';

const CONTOSO_TESTING_SKILL = `---
name: contoso-testing
description: Vitest testing patterns for the ContosoUniversity TypeScript project — unit tests for repositories and route handlers, in-memory test doubles, and the project's test naming convention. Use when writing or reviewing tests.
---

# ContosoUniversity Testing Patterns

## Naming convention

Test names follow \`<unit-under-test>.<scenario>.<expected-outcome>\`:

\`\`\`ts
it("createStudent.withValidPayload.returnsStudentWithId", async () => { … });
it("getStudent.withUnknownId.returns404", async () => { … });
\`\`\`

## Unit test pattern (repositories)

- Build a fresh repo per test with \`createInMemoryStudentRepo()\` — never share
  state between tests.
- Arrange-Act-Assert, one behavior per test.
- Assert on returned copies: mutations of a returned entity must NOT leak back
  into the repository.

## Route handler tests

- Call the handler directly with an in-memory repo — no HTTP server needed.
- Assert the full \`HttpResponse\` envelope: \`status\`, \`body.success\`, and
  \`body.data\` / \`body.error\`.
- Cover the unhappy paths first: invalid id (400), missing resource (404).

## Edge-case checklist

- Empty repository
- Duplicate-looking names (two "Alexander, Carson" entries are legal)
- Search terms that match zero students
- IDs that are zero, negative, or non-integer
`;

const EXAMPLE_COMMAND_SKILL = `---
name: create-contoso-test
description: "Generate a Vitest test file for a ContosoUniversity module, following the contoso-testing naming convention and edge-case checklist."
disable-model-invocation: true
---

# Create Contoso Test

Generate a complete Vitest test file for the module the user names. Follow the contoso-testing
skill's naming convention and edge-case checklist. Place it under tests/.
`;

export const lab04: Lab = {
  id: "lab04",
  number: "04",
  title: "Skills & Prompts",
  tagline:
    "Write an auto-activating knowledge pack, watch Copilot pick it up on its own, and learn when a skill should be a /name command instead.",
  steps: [
    {
      key: "lab04/anatomy",
      title: "Skills: auto-activating knowledge",
      kind: "mixed",
      verifyId: "lab04/skill-anatomy",
      body: (
        <>
          <p>
            Skills are knowledge packs Copilot loads{" "}
            <strong>automatically</strong> when your prompt matches a skill's{" "}
            <code>description</code>. You can also ask for one by name (
            <code>/skill-name</code> in a prompt). Look at the frontmatter of
            the skill that ships with this workspace:
          </p>
          <Cmd lines={["head -5 .github/skills/coding-standards/SKILL.md"]} />
          <Note>
            <strong>Progressive disclosure:</strong> Copilot reads only the{" "}
            <code>name</code> and <code>description</code> up front. The full
            body loads only when relevant — so a repo can carry dozens of skills
            without drowning the model's context window. That makes the
            description the single highest-leverage line in the file.
          </Note>
        </>
      ),
    },
    {
      key: "lab04/create",
      title: "Create the contoso-testing skill",
      kind: "mixed",
      verifyId: "lab04/create-skill",
      body: (
        <>
          <p>
            Build a testing skill for this stack. Skills live at{" "}
            <code>.github/skills/&lt;name&gt;/SKILL.md</code> — note the
            directory-per-skill layout:
          </p>
          <FileCard
            path=".github/skills/contoso-testing/SKILL.md"
            content={CONTOSO_TESTING_SKILL}
          />
          <p>
            Why so specific a description? Because the description is what
            drives auto-activation. "Testing patterns" would collide with every
            other testing skill on the machine; "Vitest testing patterns for the
            ContosoUniversity TypeScript project" activates for exactly this
            workspace's testing questions.
          </p>
        </>
      ),
    },
    {
      key: "lab04/activate",
      title: "Watch it auto-activate",
      kind: "live",
      verifyId: "lab04/activate",
      body: (
        <>
          <p>
            Skills are discovered at session start, like everything else in{" "}
            <code>.github/</code>. Restart, then check the skill registered —
            this check reads the session's real state, not the model's opinion:
          </p>
          <Cmd
            lines={["copilot", "/skills list", "/skills info contoso-testing"]}
            restart
          />
          <p>
            Now ask a testing question <em>without naming the skill</em> — and
            watch the bench for the purple <strong>skill activated</strong>{" "}
            chip:
          </p>
          <PromptCard prompt="How should I write unit tests for the student repository in src/repos/student-repo.ts?" />
          <Note>
            The reply should carry your skill's fingerprints: the{" "}
            <code>&lt;unit&gt;.&lt;scenario&gt;.&lt;expected&gt;</code> naming,
            fresh <code>createInMemoryStudentRepo()</code> per test, envelope
            assertions. The chip is the proof — it's the session's{" "}
            <code>skill.invoked</code> event, streamed live. If it didn't fire,
            name the skill explicitly:{" "}
            <em>"Use the /contoso-testing skill to…"</em>.
          </Note>
          <Note>
            <strong>
              🔍 Debug It — was the skill loaded, matched, or skipped?
            </strong>{" "}
            A skill can be loaded and still go unused: a knowledge skill is
            picked by comparing your prompt with its <code>description</code>,
            and a command skill (<code>disable-model-invocation: true</code>) is
            never picked that way at all. So check loading first, then use.
            <ul>
              <li>
                <strong>Copilot CLI:</strong> type these inside the same
                session. <code>/skills list</code> shows what was discovered,{" "}
                <code>/env</code> shows the skills loaded alongside agents, MCP
                servers and hooks, and <code>/context</code> shows what the
                session's context costs. In experimental mode{" "}
                <code>/context</code> also breaks usage down per skill,
                subagent, MCP server, tool and plugin. (The bench emulates{" "}
                <code>/skills list</code> and <code>/env</code>;{" "}
                <code>/context</code> is real-CLI only. The purple chip above is
                Lab Studio's own view of the same evidence.)
              </li>
              <li>
                <strong>VS Code:</strong> open{" "}
                <strong>Show Agent Debug Logs</strong>, switch to the{" "}
                <strong>Logs view</strong> and filter to{" "}
                <strong>Discovery</strong> to see whether the skill was loaded,
                skipped or rejected. Then read the model requests and tool calls
                that follow to see whether the skill's text was used. Turn
                capture on first: it isn't retroactive.
              </li>
            </ul>
          </Note>
        </>
      ),
    },
    {
      key: "lab04/prompts",
      title: "Knowledge skills vs command skills",
      kind: "read",
      body: (
        <>
          <p>
            A skill can also be a reusable <strong>command</strong>: one you
            run yourself as <code>/name</code>, and that Copilot never loads on
            its own. Same folder layout, one extra frontmatter key —{" "}
            <code>disable-model-invocation: true</code>. This is also what
            replaced IDE-only prompt files (<code>.prompt.md</code>): as skills
            in <code>.github/skills/</code>, commands run in Copilot CLI, VS
            Code's Copilot harness and the coding agent. A test-generator
            command for this track would look like:
          </p>
          <Snippet title=".github/skills/create-contoso-test/SKILL.md — a command skill">
            {EXAMPLE_COMMAND_SKILL}
          </Snippet>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Knowledge skill</th>
                <th>Command skill</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Carries</td>
                <td>Knowledge — patterns, conventions, gotchas</td>
                <td>A fixed workflow — generate, run, commit, hand off</td>
              </tr>
              <tr>
                <td>Runs</td>
                <td>
                  When your prompt matches its <code>description</code>, or you
                  name it
                </td>
                <td>
                  Only when you type <code>/name</code> — never from topic
                  matching
                </td>
              </tr>
              <tr>
                <td>Frontmatter</td>
                <td>
                  <code>name</code>, <code>description</code>
                </td>
                <td>
                  …plus <code>disable-model-invocation: true</code>
                </td>
              </tr>
            </tbody>
          </table>
          <Note>
            <strong>Which kind should you write?</strong> Leave the flag off when
            being picked up unprompted is the point (like{" "}
            <code>contoso-testing</code>). Set it when the skill has side
            effects or a cost — writes files, runs tests, commits — or is a
            fixed step-by-step workflow. When in doubt, make it a command: you
            can always type the name, but you can't un-run a skill the model
            chose for you.
          </Note>
          <Note tone="warn">
            <strong>
              🚫 Spot the Anti-Pattern: overly broad skill descriptions &amp;
              uninvocable syntax.
            </strong>{" "}
            Skills copied from other projects often carry one of these defects.
            Find them in the two headers below before you write your own:
          </Note>
          <Snippet title="skill A — display only">{BROAD_SKILL_HEADER}</Snippet>
          <Snippet title="skill B — display only">
            {UNINVOCABLE_SKILL_HEADER}
          </Snippet>
          <ul>
            <li>
              <strong>
                A description that matches everything matches every turn.
              </strong>{" "}
              Copilot picks a knowledge skill by comparing your prompt with its{" "}
              <code>description</code>, so "helps with coding…" activates on
              almost any request. The skill body then loads into context when it
              adds nothing, and you pay for that context each time. Name one job
              in the words someone would actually type, as{" "}
              <code>contoso-testing</code> does (Vitest, in-memory repos, the
              naming convention).
            </li>
            <li>
              <strong>
                <code>{"${input:...}"}</code> is VS Code prompt-file syntax.
              </strong>{" "}
              VS Code's docs say most models "understand this syntax and will
              prompt for these inputs" — that is a habit of the model, not a
              feature of the tool. The Copilot CLI documentation describes no
              such placeholder for skills, so a command skill should read its
              arguments from whatever you type after <code>/name</code>.
            </li>
            <li>
              <strong>
                <code>ADD:</code> / <code>UP:</code> / <code>DEL:</code> fight
                your own rules.
              </strong>{" "}
              If your repository's instructions require{" "}
              <code>&lt;type&gt;: &lt;description&gt;</code> (<code>feat:</code>
              , <code>fix:</code> and so on), a skill that demands other
              prefixes contradicts them. Copilot combines instruction sources
              without ranking them, so nothing says which wins.
            </li>
          </ul>
          <Note tone="sim">
            Lab Studio's bench terminal doesn't route <code>/name</code> to
            skills, so this step is read-only here (later labs translate a
            command skill into "follow <code>.github/skills/…/SKILL.md</code>").
            In the full workshop you'd type{" "}
            <code>/create-contoso-test for src/repos/course-repo.ts</code> in a
            Copilot CLI session.
          </Note>
        </>
      ),
    },
  ],
};
