---
title: "Skills & Prompts"
lab_number: 4
pace:
  presenter_minutes: 4
  self_paced_minutes: 15
registry: docs/_meta/registry.yaml
---

# 4 — Skills & Prompts

In this lab you will learn the two ways a **skill** is used — loaded automatically from its `description`, or run on demand as a `/name` command — using the testing skill and the test-generator command for your track. Prompt files (`.prompt.md`), the older IDE-only way to store a reusable command, have been migrated to skills in this repository, so everything here runs in Copilot CLI.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

**Prerequisite:** finish [Setup](setup.md) first — `copilot --version` prints a version number, and you are signed in to GitHub Copilot.

**Node track only:** the Node appendix creates its two skills with Bash commands (`mkdir -p` and heredocs) and has no complete PowerShell route, so you also need a Bash shell — on Windows, a WSL2 terminal opened at the root of the same repository checkout that your Copilot CLI and IDE use. macOS and Linux already have one. Use it for the Node steps in 4.2 and 4.3. The .NET track needs no Bash: its two skills already ship in this repository, and the lab's own commands each come with a PowerShell form.

References:
- [Agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [Add skills to Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills)
- [Prompt files](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files) (IDE-only; superseded by skills in this repository)

## 4.1 Skills: Auto-Activating Knowledge

Skills are knowledge packs that Copilot loads **automatically** when your prompt matches a skill's `description`. You can also ask for one by name: put its name in your prompt, preceded by a forward slash — for example, `Use the /dotnet-testing skill to review these tests` (the `/skill-name` form).

🖥️ **In your terminal:**

1. Look at a skill's frontmatter — the `description` drives activation:

**WSL/Bash:**
```bash
head -5 .github/skills/coding-standards/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/coding-standards/SKILL.md -Head 5
```

The `description` field is critical. A clear, specific description means better auto-activation.

> 💡 **Progressive disclosure:** Copilot only reads the skill `name` and `description` upfront. The full body loads only when relevant — so you can have dozens of skills without overwhelming the model's context window.

## 4.2 Create a Skill (per track)

Each track has a testing-flavored skill that Copilot picks up when you talk about writing tests in that stack. The two tracks start from different places, so read this before you run anything from an appendix:

- **.NET track:** `dotnet-testing` (xUnit + Moq + WebApplicationFactory) **already ships** in this repository at `.github/skills/dotnet-testing/SKILL.md`, with the full unit and integration patterns. The command block in [`labs/appendices/dotnet/lab04.md`](appendices/dotnet/lab04.md) **overwrites** that tracked file with a shorter stub — activation guidance and the test naming convention, pointing back to the full skill. Because the skill is already there, the skill-loaded check in 4.4 succeeds whether or not you run that block.
- **Node track:** [`labs/appendices/node/lab04.md`](appendices/node/lab04.md) creates the new `node-testing` skill (Vitest + Fastify `inject()`) with its naming convention, unit and integration patterns, and an edge-case checklist. It does not ship in this repository, so you create it. The appendix is written for Bash — work in your Bash (WSL2) terminal at the repository root:
  1. Do **section A** of the appendix (create the skill).
  2. Run only the **first** line of **section C. Verify** — the `head -5` check on the skill file. It should print the skill's frontmatter, including `name: node-testing`.
  3. Leave section B and the second line of section C for 4.3: they create and check the prompt, which does not exist yet.

To look at the .NET skill that already ships — its `description` is what drives activation:

**WSL/Bash:**
```bash
head -5 .github/skills/dotnet-testing/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/dotnet-testing/SKILL.md -Head 5
```

Why per track? The `description` field is what drives auto-activation. `xUnit + Moq` and `Vitest + Fastify inject()` need separate descriptions or one will swallow the other.

## 4.3 Create a Command Skill (per track)

A skill can also be a reusable **command**: one you run yourself by typing `/` and its name, and that Copilot never loads on its own. You create it exactly the way you created a skill in 4.2 — a folder under `.github/skills/` with a `SKILL.md` — and add one frontmatter key, `disable-model-invocation: true`. That flag is the whole difference: Copilot reads the skill only when you name it. This is also how you now create what used to be a *prompt file*. This repository's command skills (`/commit`, `/handoff`, `/cost-check` and the rest) were VS Code prompt files (`.prompt.md`), which only run in an IDE's chat view; as skills in `.github/skills/` they run in Copilot CLI, in VS Code's Copilot harness and in the coding agent.

> 💡 **Which kind should you write?** Leave the flag off when the skill is *knowledge* that Copilot should bring in whenever the topic comes up — conventions, patterns, gotchas — because being picked up unprompted is the point. Set `disable-model-invocation: true` when either of these is true:
>
> - **You do not want the model deciding when it runs.** The skill has side effects or a cost — it writes files, runs builds or tests, commits, reshapes the wiki, posts a handoff — or it is specific enough that firing from a loosely matching `description` would be wrong. Discovery is a judgement call the model makes each turn; a command runs only when a person types `/name`, so *whether* and *when* it ran is never in question.
> - **It is a fixed workflow, not reference material.** Steps in a set order with arguments the user supplies (`/tdd`: red → green → refactor; `/checkpoint create <name>`; `/consolidate-lessons --dry-run`) work best loaded whole, on demand, instead of competing with other skills for selection halfway through a task.
>
> Most of this repository's command skills are both. `create-dotnet-test` is a command because it writes a test file and runs `dotnet test`; `dotnet-testing` stays discoverable because it only describes what a good test looks like. When in doubt, make it a command: you can always type the name, but you cannot un-run a skill the model chose for you.

The test-generator command for your track lives in your track's appendix:

- **.NET track:** [`labs/appendices/dotnet/lab04.md`](appendices/dotnet/lab04.md) — `/create-dotnet-test`, which emits xUnit test classes. As with `dotnet-testing`, `.github/skills/create-dotnet-test/SKILL.md` **already ships** in this repository, and the appendix's command block **overwrites** it with a shorter version.
- **Node track:** [`labs/appendices/node/lab04.md`](appendices/node/lab04.md) — `/create-node-test`, which emits Vitest test files. It does not ship in this repository, so you create it now: run **section B** of the appendix in the same Bash (WSL2) terminal you used in 4.2.

To look at the .NET command skill that already ships:

**WSL/Bash:**
```bash
head -7 .github/skills/create-dotnet-test/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/create-dotnet-test/SKILL.md -Head 7
```

For the Node command, once section B has created it, run the **second** line of the appendix's "C. Verify" block — the `head -7` check on the new skill file. It should print its frontmatter, including `name: create-node-test` and `disable-model-invocation: true`.

## 4.4 Test Skill Auto-Activation

Let's verify the skill is loaded, then see how a knowledge skill and a command skill behave differently. Each step shows the .NET and Node versions together — follow the one for your track. On the Node track, this section checks the two skills you created in 4.2 and 4.3, so finish those first.

🖥️ **In your terminal:**

1. From the repository root, start Copilot CLI:
```bash
copilot
```
**Node track:** start it *after* you created `node-testing` in 4.2 and `create-node-test` in 4.3, so both new skills are picked up. If a session is already open from earlier, type `/exit` and run `copilot` again.

2. Inside the session, confirm your track's skill is loaded. Type these one at a time — this check does not depend on what the model decides to say:

**.NET track:**
```text
/skills list
/skills info dotnet-testing
```
**Node track:**
```text
/skills list
/skills info node-testing
```
`/skills list` should include your skill, and `/skills info` shows its details, including its location. `dotnet-testing` ships in the repository, so it is listed either way. `node-testing` is the skill you created in 4.2 — if it is not listed, it is not at `.github/skills/node-testing/SKILL.md`, so go back to 4.2. On both tracks the list also shows the command skill from 4.3 (`create-dotnet-test` or `create-node-test`): a command skill is discovered from the same folder as any other.

3. Now ask a question that should draw on your track's skill:

**.NET track:**
```text
How should I write unit tests for the StudentsController in ContosoUniversity?
```
**Node track:**
```text
How should I write unit tests for the student repository in node/infra/repos/student-repo.ts?
```

4. Copilot should reference patterns from the skill:
   - **.NET track:**
     - `MethodName_Condition_ExpectedResult` naming
     - Moq for mocking `IRepository<Student>`
     - Arrange-Act-Assert pattern
   - **Node track:**
     - `<unit-under-test>.<scenario>.<expected-outcome>` naming, for example `createStudent.withValidPayload.returns201`
     - Vitest `describe` / `it` / `expect`
     - An in-memory database from `createInMemoryDb()`

> 💡 **What you should see:** The response should reference patterns from your skill — on the .NET track, look for `MethodName_Condition_ExpectedResult()` naming, Moq for mocking, or WebApplicationFactory; on the Node track, look for the `<unit-under-test>.<scenario>.<expected-outcome>` naming, Vitest, or `createInMemoryDb()`. Treat this as corroboration, not proof: Copilot chooses a skill from your prompt and the skill's `description`, and an answer that sounds right does not show the skill loaded — `/skills list` does. If none of the patterns appear, name the skill in your prompt (for example, `Use the /dotnet-testing skill to …` or `Use the /node-testing skill to …`) or mention "testing", "xUnit" or "Vitest" explicitly.

**Now run the command skill — in the same CLI session:**

5. Type your track's command, followed by what to test:

**.NET track:**
```text
/create-dotnet-test for dotnet/ContosoUniversity.Web/Controllers/CoursesController.cs
```
**Node track:**
```text
/create-node-test for node/infra/repos/course-repo.ts
```

The .NET command should generate a complete test class for the CoursesController; the Node command should generate a Vitest file for the course repository. Notice that the plain question in step 3 never pulled this skill in: `disable-model-invocation: true` means it runs only when you name it. If Copilot does not pick up `/create-node-test`, check that `.github/skills/create-node-test/SKILL.md` exists (4.3) and run `/skills reload`, or start a new session. The same `/create-dotnet-test` works in a VS Code Copilot harness session, which reads `.github/skills/` too.

> 💡 **Expected output:** On the .NET track, a complete xUnit test class with `[Fact]` methods following the naming convention. On the Node track, a Vitest file (for example `node/tests/unit/course-repo.test.ts`) with `describe` / `it` / `expect` cases that build an in-memory database with `createInMemoryDb()`. Copilot asks before it writes the file or runs the tests — read what it proposes before you approve any change.

> 💡 **Skills vs Prompts**: Both kinds of skill live in `.github/skills/<name>/SKILL.md` and are discovered by Copilot CLI, VS Code's Copilot harness and the coding agent. A *knowledge* skill (`dotnet-testing`) loads when your prompt matches its `description`, or when you name it as `/skill-name`. A *command* skill (`create-dotnet-test`) sets `disable-model-invocation: true`, so it runs only when you type `/name`. Prompt files (`.prompt.md`) are the older way to store a command and are IDE-only — VS Code's Local chat still reads them, Copilot CLI and the Copilot harness do not — which is why this repository migrated all of its prompts to skills.

## 4.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | File | Purpose |
|---------|------|---------|
| **Knowledge skills** | `.github/skills/{name}/SKILL.md` | Auto-activating — Copilot picks one from its `description`, or you name it as `/skill-name` |
| **Command skills** | `.github/skills/{name}/SKILL.md` with `disable-model-invocation: true` | Run only when you type `/name`; the replacement for IDE-only `.prompt.md` files |

**Skill frontmatter:**
- `name` — lowercase with hyphens, used as identifier
- `description` — drives auto-activation. Be specific!
- `disable-model-invocation` — `true` turns a skill into a command: Copilot loads it only when you type `/name`
- `allowed-tools` — pre-approves tools (for example `shell`) so the skill can run them without a confirmation prompt. It does **not** restrict the skill to those tools, so it is not the old prompt-file `tools:` list under a new name — the migrated commands deliberately carry no `allowed-tools`, and you keep approving each file write and command they propose

**Best practices:**
- Write clear, specific descriptions — they drive activation/discovery
- Keep skills focused on one domain (testing, security, architecture)
- Use command skills for repeatable workflows (generate tests, review code) and for anything with side effects; keep knowledge skills discoverable
- Test activation by asking natural questions about the topic, and confirm a skill is loaded with `/skills list` or `/skills info <name>`

</details>

<details>
<summary>Solutions</summary>

- Skill: [`solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md`](../solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md)
- Command skill: [`solutions/lab04-skill-and-prompt/create-dotnet-test/SKILL.md`](../solutions/lab04-skill-and-prompt/create-dotnet-test/SKILL.md)

</details>

**Next:** [Lab 05 — MCP Server Configuration](lab05.md)
