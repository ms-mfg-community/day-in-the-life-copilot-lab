import { Cmd, FileCard, Note, PromptCard, Snippet } from "./content";
import type { Lab } from "./types";

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

const EXAMPLE_PROMPT_FILE = `---
description: "Generate a Vitest test file for a ContosoUniversity module"
mode: "agent"
tools: ["read", "edit", "search"]
---

Generate a complete Vitest test file for the module the user names. Follow the contoso-testing
skill's naming convention and edge-case checklist. Place it under tests/.
`;

export const lab04: Lab = {
  id: "lab04",
  number: "04",
  title: "Skills & Prompts",
  tagline:
    "Write an auto-activating knowledge pack, watch Copilot pick it up on its own, and learn where prompt files fit.",
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
        </>
      ),
    },
    {
      key: "lab04/prompts",
      title: "Prompts vs skills",
      kind: "read",
      body: (
        <>
          <p>
            Prompt files (<code>.prompt.md</code>) are the other reusable
            template. The difference that trips everyone up:{" "}
            <strong>prompt files are IDE-only.</strong> They run in Copilot Chat
            in VS Code, Visual Studio, or JetBrains IDEs — typed as{" "}
            <code>/prompt-name</code> — and have no CLI equivalent. A prompt
            file for this track would look like:
          </p>
          <Snippet title=".github/prompts/create-contoso-test.prompt.md — runs in IDE chat only">
            {EXAMPLE_PROMPT_FILE}
          </Snippet>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Skills</th>
                <th>Prompts</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Carry</td>
                <td>Knowledge — patterns, conventions</td>
                <td>Actions — generate, run, review</td>
              </tr>
              <tr>
                <td>Invoked</td>
                <td>
                  Automatically by description match, or{" "}
                  <code>/skill-name</code> in a prompt
                </td>
                <td>
                  Always by you, as <code>/prompt-name</code>
                </td>
              </tr>
              <tr>
                <td>Works in</td>
                <td>CLI and IDE agent mode</td>
                <td>IDE chat only</td>
              </tr>
            </tbody>
          </table>
          <Note tone="sim">
            Lab Studio's bench is a CLI session, so there is nothing live to run
            here — exactly the lesson. In the full workshop you'd open the repo
            in VS Code and type{" "}
            <code>/create-contoso-test for src/repos/course-repo.ts</code> in
            Copilot Chat.
          </Note>
        </>
      ),
    },
  ],
};
