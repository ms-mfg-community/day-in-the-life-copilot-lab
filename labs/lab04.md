---
title: "Skills & Prompts"
lab_number: 4
pace:
  presenter_minutes: 4
  self_paced_minutes: 15
registry: docs/_meta/registry.yaml
---

# 4 — Skills & Prompts

In this lab you will create a new skill and prompt template for .NET testing.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

References:
- [Agent skills](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-agent-skills)
- [Prompt files](https://docs.github.com/en/copilot/using-github-copilot/using-prompt-files)

## 4.1 Skills: Auto-Activating Knowledge

Skills are knowledge packs that Copilot loads **automatically** when the conversation topic matches their description. You don't invoke them — they activate on their own.

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

Each track creates a testing-flavored skill that auto-activates when learners discuss writing tests in that stack. The full skill body lives in your track's appendix:

- **.NET track:** [`labs/appendices/dotnet/lab04.md`](appendices/dotnet/lab04.md) — `dotnet-testing` skill (xUnit + Moq + WebApplicationFactory).
- **Node track:** [`labs/appendices/node/lab04.md`](appendices/node/lab04.md) — `node-testing` skill (Vitest + Fastify `inject()`).

Both appendices give you copy-paste WSL/Bash and PowerShell commands that:

1. `mkdir -p .github/skills/<track>-testing`
2. Heredoc the SKILL.md with the right `name`, `description`, naming convention, unit/integration patterns, and edge-case checklist.
3. Verify with `head -5 .github/skills/<track>-testing/SKILL.md`.

Why per track? The `description` field is what drives auto-activation. `xUnit + Moq` and `Vitest + Fastify inject()` need separate descriptions or one will swallow the other.

## 4.3 Create a Prompt Template (per track)

> ⚠️ **Note (2026-04-24):** Per [docs.github.com](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file), prompt files (`.prompt.md`) are an **IDE-only** customization (VS Code, Visual Studio, JetBrains) — Copilot CLI exposes no `@prompt-name` or `/prompt-name` invocation for user-authored prompt files today. Run the `@create-<track>-test` invocation from Copilot Chat in your IDE; the prompt body itself is still useful as a reusable copy-paste template if you live in the CLI.

Prompts are reusable templates invoked with `@prompt-name`. The track-specific test-generator prompt body also lives in your track's appendix:

- **.NET track:** [`labs/appendices/dotnet/lab04.md`](appendices/dotnet/lab04.md) — `@create-dotnet-test` prompt that emits xUnit test classes.
- **Node track:** [`labs/appendices/node/lab04.md`](appendices/node/lab04.md) — `@create-node-test` prompt that emits Vitest test files.

After running the appendix-provided heredoc, verify with `head -7 .github/prompts/create-<track>-test.prompt.md`.

> 💡 **Skills vs Prompts**: Skills activate automatically based on topic. Prompts are invoked explicitly with `@name`. Use skills for knowledge (patterns, conventions) and prompts for actions (generate code, run workflows).

## 4.4 Test Skill Auto-Activation

Let's verify the skill activates when discussing .NET testing.

🖥️ **In your terminal:**

1. Start Copilot CLI:
```bash
copilot
```

2. Ask a question that should trigger the `dotnet-testing` skill:
```
How should I write unit tests for the StudentsController in ContosoUniversity?
```

3. Copilot should reference patterns from your skill:
   - `MethodName_Condition_ExpectedResult` naming
   - Moq for mocking `IRepository<Student>`
   - Arrange-Act-Assert pattern

> 💡 **What you should see:** The response should reference patterns from your skill — look for mentions of `MethodName_Condition_ExpectedResult()` naming, Moq for mocking, or WebApplicationFactory. If none appear, the skill may not have auto-activated — try mentioning "testing" or "xUnit" explicitly.

4. Now try the prompt:
```
@create-dotnet-test for dotnet/ContosoUniversity.Web/Controllers/CoursesController.cs
```

The prompt should generate a complete test class for the CoursesController.

> 💡 **Expected output:** A complete xUnit test class with `[Fact]` methods following the naming convention. The file won't be created until you explicitly ask Copilot to save it.

> 💡 **Skills vs Prompts**: Skills activate automatically based on topic. Prompts are invoked explicitly with `/name`. Use skills for knowledge (patterns, conventions) and prompts for actions (generate code, run workflows).

## 4.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | File | Purpose |
|---------|------|---------|
| **Skills** | `.github/skills/{name}/SKILL.md` | Auto-activating knowledge bases |
| **Prompts** | `.github/prompts/{name}.prompt.md` | Explicitly invoked templates |

**Skill frontmatter:**
- `name` — lowercase with hyphens, used as identifier
- `description` — drives auto-activation (max 1024 chars). Be specific!

**Prompt frontmatter:**
- `description` — what the prompt does
- `mode` — `"agent"` for multi-step workflows
- `tools` — which tools the prompt can use

**Best practices:**
- Write clear, specific descriptions — they drive activation/discovery
- Keep skills focused on one domain (testing, security, architecture)
- Use prompts for repeatable workflows (generate tests, review code)
- Test activation by asking natural questions about the topic

</details>

<details>
<summary>Solutions</summary>

- Skill: [`solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md`](../solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md)
- Prompt: [`solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md`](../solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md)

</details>

**Next:** [Lab 05 — MCP Server Configuration](lab05.md)
