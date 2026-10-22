---
title: "Skills & Prompts"
lab_number: 4
pace:
  presenter_minutes: 4
  self_paced_minutes: 15
registry: docs/_meta/registry.yaml
---

# 4 — Skills & Prompts

In this lab you will learn how a **skill** and a **prompt file** differ — where each one works and how each one is invoked — using the testing skill and prompt for your track.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

**Prerequisite:** finish [Setup](setup.md) first — `copilot --version` prints a version number, and you are signed in to GitHub Copilot. The last step in 4.4 also needs Copilot Chat in VS Code, Visual Studio or a JetBrains IDE, because prompt files do not run in the terminal.

**Node track only:** the Node appendix creates its skill and prompt with Bash commands (`mkdir -p` and heredocs) and has no complete PowerShell route, so you also need a Bash shell — on Windows, a WSL2 terminal opened at the root of the same repository checkout that your Copilot CLI and IDE use. macOS and Linux already have one. Use it for the Node steps in 4.2 and 4.3. The .NET track needs no Bash: its skill and prompt already ship in this repository, and the lab's own commands each come with a PowerShell form.

References:
- [Agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [Prompt files](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files)

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

## 4.3 Create a Prompt Template (per track)

Prompt files (`.prompt.md`) are **IDE-only**. GitHub's documentation says they are only available in VS Code, Visual Studio and JetBrains IDEs: you run one from Copilot Chat by typing `/` and its name. The Copilot CLI session in 4.4 cannot run them. In VS Code, use a normal Chat view session (the Local agent) — VS Code does not load prompt files in Agent Host sessions.

Prompts are reusable templates that you run by typing `/prompt-name`. The track-specific test-generator prompt body also lives in your track's appendix:

- **.NET track:** [`labs/appendices/dotnet/lab04.md`](appendices/dotnet/lab04.md) — `/create-dotnet-test` prompt that emits xUnit test classes. As with the skill, `.github/SKILLS/create-dotnet-test.SKILL.md` **already ships** in this repository, and the appendix's prompt block **overwrites** it.
- **Node track:** [`labs/appendices/node/lab04.md`](appendices/node/lab04.md) — `/create-node-test` prompt that emits Vitest test files. It does not ship in this repository, so you create it now: run **section B** of the appendix in the same Bash (WSL2) terminal you used in 4.2.

To look at the .NET prompt that already ships:

**WSL/Bash:**
```bash
head -7 .github/SKILLS/create-dotnet-test.SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/SKILLS/create-dotnet-test.SKILL.md -Head 7
```

For the Node prompt, once section B has created it, run the **second** line of the appendix's "C. Verify" block — the `head -7` check on the prompt file. It should print the prompt's frontmatter, including `name: create-node-test`.

## 4.4 Test Skill Auto-Activation

Let's verify the skill is loaded, then see how a skill and a prompt behave differently. Each step shows the .NET and Node versions together — follow the one for your track. On the Node track, this section checks the skill and prompt you created in 4.2 and 4.3, so finish those first.

🖥️ **In your terminal:**

1. From the repository root, start Copilot CLI:
```bash
copilot
```
**Node track:** start it *after* you created `node-testing` in 4.2, so the new skill is picked up. If a session is already open from earlier, type `/exit` and run `copilot` again.

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
`/skills list` should include your skill, and `/skills info` shows its details, including its location. `dotnet-testing` ships in the repository, so it is listed either way. `node-testing` is the skill you created in 4.2 — if it is not listed, it is not at `.github/skills/node-testing/SKILL.md`, so go back to 4.2.

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

**IDE-only — in Copilot Chat in VS Code, Visual Studio or JetBrains (not the terminal):**

Prompt files do not run in the CLI session above, so the last step happens in your IDE.

1. Open this repository folder in your IDE, so Copilot Chat can find `.github/SKILLS/`.
2. In Copilot Chat, type your track's prompt name as a slash command, followed by what to test:

**.NET track:**
```text
/create-dotnet-test for dotnet/ContosoUniversity.Web/Controllers/CoursesController.cs
```
**Node track:**
```text
/create-node-test for node/infra/repos/course-repo.ts
```

The .NET prompt should generate a complete test class for the CoursesController; the Node prompt should generate a Vitest file for the course repository. If Copilot Chat does not offer `/create-node-test`, check that `.github/SKILLS/create-node-test.SKILL.md` exists (4.3) and that you opened the repository folder in step 1.

> 💡 **Expected output:** On the .NET track, a complete xUnit test class with `[Fact]` methods following the naming convention. On the Node track, a Vitest file (for example `node/tests/unit/course-repo.test.ts`) with `describe` / `it` / `expect` cases that build an in-memory database with `createInMemoryDb()`. Depending on your chat mode and enabled tools, Copilot may only show the code or may also write the file and run the tests — read what it proposes before you accept any change.

> 💡 **Skills vs Prompts**: Skills carry knowledge (patterns, conventions). Copilot loads one when your prompt matches its `description`, or you name it as `/skill-name`, and skills work in the CLI and in agent mode in VS Code and JetBrains IDEs. Prompts carry actions (generate code, run workflows). You always run them yourself as `/prompt-name`, and only in an IDE.

## 4.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | File | Purpose |
|---------|------|---------|
| **Skills** | `.github/skills/{name}/SKILL.md` | Auto-activating knowledge bases — Copilot picks one from its `description`, or you name it as `/skill-name`; works in the CLI and in agent mode in VS Code and JetBrains IDEs |
| **Prompts** | `.github/prompts/{name}.prompt.md` | Explicitly invoked templates — you run one as `/prompt-name`; IDE-only |

**Skill frontmatter:**
- `name` — lowercase with hyphens, used as identifier
- `description` — drives auto-activation. Be specific!

**Prompt frontmatter:**
- `description` — what the prompt does
- `mode` — `"agent"` for multi-step workflows
- `tools` — which tools the prompt can use

**Best practices:**
- Write clear, specific descriptions — they drive activation/discovery
- Keep skills focused on one domain (testing, security, architecture)
- Use prompts for repeatable workflows (generate tests, review code)
- Test activation by asking natural questions about the topic, and confirm a skill is loaded with `/skills list` or `/skills info <name>`

</details>

<details>
<summary>Solutions</summary>

- Skill: [`solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md`](../solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md)
- Prompt: [`solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md`](../solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md)

</details>

**Next:** [Lab 05 — MCP Server Configuration](lab05.md)
