# Contributing to everything-copilot

Thank you for your interest in contributing. This guide covers the conventions and processes for adding or modifying configurations in this repository.

---

## Getting Started

1. Fork and clone the repository
2. Read `AGENTS.md` for project conventions
3. Read `docs/RESEARCH.md` for verified Copilot capabilities
4. Run `bash tests/validate.sh` to confirm the existing configs are valid

---

## What You Can Contribute

- **New skills** — Agent skills in `.github/skills/`
- **New agents** — Custom agent profiles in `.github/agents/`
- **New prompts** — Prompt files in `.github/prompts/`
- **New hook scripts** — Hook scripts in `scripts/hooks/`
- **Bug fixes** — Corrections to existing configs
- **Documentation** — Improvements to docs

---

## Adding a Skill

1. Create a directory: `.github/skills/<skill-name>/`
2. Add a `SKILL.md` file with required YAML frontmatter:

```yaml
---
name: skill-name
description: Clear description of what this skill does and when Copilot should use it
---

# Skill Name

Skill content here...
```

3. Use lowercase names with hyphens (`backend-patterns`, not `BackendPatterns`)
4. Write a description that helps Copilot match prompts to this skill
5. Remove any Claude-specific terminology

---

## Adding an Agent

1. Create a file: `.github/agents/<agent-name>.agent.md`
2. Include required YAML frontmatter:

```yaml
---
name: Agent Name
description: What this agent does and when to invoke it
tools:
  - execute
  - read
  - edit
  - search
---

# Agent Name

Agent instructions here...
```

3. Use Copilot tool aliases where possible: `execute`, `read`, `edit`, `search`, `agent`
4. Keep the prompt under 30,000 characters
5. Include three-tier boundaries: Always Do / Ask First / Never Do

---

## Adding a Prompt

1. Create a file: `.github/prompts/<prompt-name>.prompt.md`
2. Include YAML frontmatter:

```yaml
---
description: Short description shown in the prompt picker
mode: agent
---

Prompt content here...
```

3. Note: Prompt files work in VS Code only (not Copilot CLI)

---

## Adding a Hook Script

1. Create both bash and PowerShell variants:
   - `scripts/hooks/<hook-name>.sh`
   - `scripts/hooks/<hook-name>.ps1`
2. Bash scripts must have a `#!/usr/bin/env bash` shebang
3. Scripts receive JSON via stdin — parse with `jq` or equivalent
4. Register the script in `.github/hooks/default.json`
5. Default timeout is 30 seconds

---

## Code Style

- **Markdown:** ATX headings (`#`, `##`, `###`)
- **YAML frontmatter:** Lowercase keys
- **JSON files:** 2-space indentation
- **Skill names:** Lowercase with hyphens
- **Shell scripts:** Include both bash (`.sh`) and PowerShell (`.ps1`) variants

---

## Git Workflow

### Commit Format

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Examples:
- `feat: add kubernetes-patterns skill`
- `fix: correct applyTo glob in testing instructions`
- `docs: update migration guide for MCP section`

### Rules

- **Add files individually** — never use `git add .` or `git add -A`
- No hardcoded secrets or API keys in any file
- No Claude-specific references (`Claude Code`, `~/.claude/`, `CLAUDE.md`)

---

## Testing

Before submitting, run the validation suite:

```bash
bash tests/validate.sh
```

This checks:
- YAML frontmatter presence in skills, instructions, and agents
- JSON validity for hooks and MCP configs
- Shell script shebangs

If adding a new config type, add corresponding validation to `tests/validate.sh`.

---

## Pull Request Guidelines

1. Reference any related issues
2. Describe what was added or changed
3. Confirm `bash tests/validate.sh` passes
4. Keep PRs focused — one skill/agent/prompt per PR when possible

---

## Questions

If unsure about a migration mapping or Copilot capability, check `docs/RESEARCH.md` for verified sources before assuming behavior.
