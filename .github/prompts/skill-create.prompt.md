---
description: "Analyze local git history to extract coding patterns and generate SKILL.md files for your team's practices"
agent: "agent"
tools: ["search/codebase"]
argument-hint: "--commits <n> | --output <dir>"
---

# Local Skill Generation

Analyze your repository's git history to extract coding patterns and generate SKILL.md files.

## Usage

```bash
/skill-create                    # Analyze current repo
/skill-create --commits 100      # Analyze last 100 commits
/skill-create --output ./skills  # Custom output directory
```

## What It Does

1. **Parses Git History** — Analyzes commits, file changes, and patterns.
2. **Detects Patterns** — Identifies recurring workflows and conventions.
3. **Generates SKILL.md** — Creates valid skill files.
4. **Records a lesson (optional)** — Append a note to `.copilot/lessons/log.md`
   describing why the skill exists, so future sessions can find it without
   re-deriving the analysis. Follow
   [`.github/instructions/lessons.instructions.md`](../instructions/lessons.instructions.md).

## Analysis Steps

### Step 1: Gather Git Data

```bash
# Get recent commits with file changes
git log --oneline -n ${COMMITS:-200} --name-only --pretty=format:"%H|%s|%ad" --date=short

# Get commit frequency by file
git log --oneline -n 200 --name-only | grep -v "^$" | grep -v "^[a-f0-9]" | sort | uniq -c | sort -rn | head -20

# Get commit message patterns
git log --oneline -n 200 | cut -d' ' -f2- | head -50
```

### Step 2: Detect Patterns

| Pattern | Detection Method |
|---------|-----------------|
| **Commit conventions** | Regex on commit messages |
| **File co-changes** | Files that always change together |
| **Workflow sequences** | Repeated file change patterns |
| **Architecture** | Folder structure and naming |
| **Testing patterns** | Test file locations, naming, coverage |

### Step 3: Generate SKILL.md

```markdown
---
name: {repo-name}-patterns
description: Coding patterns extracted from {repo-name}
---

# {Repo Name} Patterns

## Commit Conventions
{detected patterns}

## Code Architecture
{detected structure}

## Workflows
{detected patterns}

## Testing Patterns
{detected conventions}
```

## Related

- `/consolidate-lessons` — promote durable findings from the project wiki
  into the global wiki or flag them for the schema (`AGENTS.md` /
  `.github/instructions/`).
- [`.copilot/lessons/`](../../.copilot/lessons/) — the in-repo markdown
  wiki where lessons live.
