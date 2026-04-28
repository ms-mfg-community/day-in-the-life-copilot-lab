---
name: continuous-learning-v2
description: Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents.
---

# Continuous Learning v2 — Instinct-Based Architecture

An advanced learning system that turns coding sessions into reusable knowledge through atomic "instincts" — small learned behaviors with confidence scoring.

## What Changed from v1

| Feature | v1 | v2 |
|---------|----|----|
| Observation | sessionEnd hook (session end) | preToolUse/postToolUse (continuous) |
| Analysis | Main context | Background analysis |
| Granularity | Full skills | Atomic "instincts" |
| Confidence | None | 0.3–0.9 weighted |
| Evolution | Direct to skill | Instincts cluster into skills/commands/agents |

## The Instinct Model

An instinct is a small learned behavior:

```yaml
---
id: prefer-immutable-patterns
trigger: "when writing new C# DTOs or models"
confidence: 0.7
domain: "code-style"
source: "session-observation"
---

# Prefer Immutable Patterns

## Action
Use records or init-only setters instead of mutable properties.

## Evidence
- Observed 5 instances of immutable pattern preference
- User corrected mutable DTO to record on 2025-01-15
```

**Properties:**
- **Atomic** — one trigger, one action
- **Confidence-weighted** — 0.3 = tentative, 0.9 = near certain
- **Domain-tagged** — code-style, testing, git, debugging, workflow, etc.
- **Evidence-backed** — tracks what observations created it

## How It Works

```
Session Activity
      │
      │ Hooks capture prompts + tool use
      ▼
┌─────────────────────────────────────────┐
│         observations.jsonl              │
│   (prompts, tool calls, outcomes)       │
└─────────────────────────────────────────┘
      │
      │ Observer reads (background)
      ▼
┌─────────────────────────────────────────┐
│          PATTERN DETECTION              │
│   - User corrections -> instinct        │
│   - Error resolutions -> instinct       │
│   - Repeated workflows -> instinct      │
└─────────────────────────────────────────┘
      │
      │ Creates/updates
      ▼
┌─────────────────────────────────────────┐
│         instincts/personal/             │
│   - prefer-immutable.md (0.7)           │
│   - always-test-first.md (0.9)          │
│   - use-data-annotations.md (0.6)       │
└─────────────────────────────────────────┘
      │
      │ Clustering and evolution
      ▼
┌─────────────────────────────────────────┐
│              evolved/                   │
│   - commands/new-feature.md             │
│   - skills/testing-workflow.md          │
│   - agents/refactor-specialist.md       │
└─────────────────────────────────────────┘
```

## Hook Setup

Add to your `.github/hooks/default.json`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [{
      "type": "command",
      "bash": "scripts/hooks/observe.sh pre"
    }],
    "postToolUse": [{
      "type": "command",
      "bash": "scripts/hooks/observe.sh post"
    }]
  }
}
```

## Directory Structure

```
~/.copilot/homunculus/
├── observations.jsonl      # Current session observations
├── observations.archive/   # Processed observations
├── instincts/
│   ├── personal/           # Auto-learned instincts
│   └── inherited/          # Imported from others
└── evolved/
    ├── skills/             # Generated skills
    ├── commands/           # Generated commands
    └── agents/             # Generated specialist agents
```

## Observer Script

The `start-observer.sh` script in this skill's directory runs as a background process analyzing `observations.jsonl` for patterns:

```bash
# Run once
./start-observer.sh --once

# Run continuously (checks every 5 minutes)
./start-observer.sh
```

It detects:
- Repeated identical tool calls (token waste)
- Sequential reads that could be parallelized
- Verbose commands without output limiting
- Failed operations to learn from

## Commands

| Command | Description |
|---------|-------------|
| `instinct-status` | Show all learned instincts with confidence |
| `evolve` | Cluster related instincts into skills/commands |
| `instinct-export` | Export instincts for sharing |
| `instinct-import <file>` | Import instincts from others |

## Confidence Scoring

| Score | Meaning | Behavior |
|-------|---------|----------|
| 0.3 | Tentative | Suggested but not enforced |
| 0.5 | Moderate | Applied when relevant |
| 0.7 | Strong | Auto-approved for application |
| 0.9 | Near-certain | Core behavior |

**Increases** when: pattern repeatedly observed, user doesn't correct, other sources agree.
**Decreases** when: user explicitly corrects, pattern not seen for extended periods, contradicting evidence appears.

## Privacy

- Observations stay **local** on your machine
- Only **instincts** (patterns) can be exported — no code or conversation content
- You control what gets exported
