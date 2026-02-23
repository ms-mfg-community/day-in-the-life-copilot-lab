---
name: continuous-learning-v2
description: Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and evolves them into skills/commands/agents.
---

# Continuous Learning v2 - Instinct-Based Architecture

An advanced learning system that turns your coding sessions into reusable knowledge through atomic "instincts" - small learned behaviors with confidence scoring.

## What's New in v2

| Feature | v1 | v2 |
|---------|----|----|
| Observation | sessionEnd hook (session end) | preToolUse/postToolUse (100% reliable) |
| Analysis | Main context | Background analysis |
| Granularity | Full skills | Atomic "instincts" |
| Confidence | None | 0.3-0.9 weighted |
| Evolution | Direct to skill | Instincts to cluster to skill/command/agent |
| Sharing | None | Export/import instincts |

## The Instinct Model

An instinct is a small learned behavior:

```yaml
---
id: prefer-functional-style
trigger: "when writing new functions"
confidence: 0.7
domain: "code-style"
source: "session-observation"
---

# Prefer Functional Style

## Action
Use functional patterns over classes when appropriate.

## Evidence
- Observed 5 instances of functional pattern preference
- User corrected class-based approach to functional on 2025-01-15
```

**Properties:**
- **Atomic** - one trigger, one action
- **Confidence-weighted** - 0.3 = tentative, 0.9 = near certain
- **Domain-tagged** - code-style, testing, git, debugging, workflow, etc.
- **Evidence-backed** - tracks what observations created it

## How It Works

```
Session Activity
      │
      │ Hooks capture prompts + tool use (100% reliable)
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
│   - prefer-functional.md (0.7)          │
│   - always-test-first.md (0.9)          │
│   - use-zod-validation.md (0.6)         │
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

## Quick Start

### 1. Enable Observation Hooks

Add to your `.github/hooks/default.json`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [{
      "type": "command",
      "bash": ".github/skills/continuous-learning-v2/hooks/observe.sh pre"
    }],
    "postToolUse": [{
      "type": "command",
      "bash": ".github/skills/continuous-learning-v2/hooks/observe.sh post"
    }]
  }
}
```

### 2. Initialize Directory Structure

```bash
mkdir -p ~/.copilot/homunculus/{instincts/{personal,inherited},evolved/{agents,skills,commands}}
touch ~/.copilot/homunculus/observations.jsonl
```

### 3. Run the Observer (Optional)

The observer can run in the background analyzing observations:

```bash
.github/skills/continuous-learning-v2/agents/start-observer.sh
```

## Commands

| Command | Description |
|---------|-------------|
| `instinct-status` | Show all learned instincts with confidence |
| `evolve` | Cluster related instincts into skills/commands |
| `instinct-export` | Export instincts for sharing |
| `instinct-import <file>` | Import instincts from others |

## Configuration

Edit `config.json`:

```json
{
  "version": "2.0",
  "observation": {
    "enabled": true,
    "store_path": "~/.copilot/homunculus/observations.jsonl",
    "max_file_size_mb": 10,
    "archive_after_days": 7
  },
  "instincts": {
    "personal_path": "~/.copilot/homunculus/instincts/personal/",
    "inherited_path": "~/.copilot/homunculus/instincts/inherited/",
    "min_confidence": 0.3,
    "auto_approve_threshold": 0.7,
    "confidence_decay_rate": 0.05
  },
  "observer": {
    "enabled": true,
    "run_interval_minutes": 5,
    "patterns_to_detect": [
      "user_corrections",
      "error_resolutions",
      "repeated_workflows",
      "tool_preferences"
    ]
  },
  "evolution": {
    "cluster_threshold": 3,
    "evolved_path": "~/.copilot/homunculus/evolved/"
  }
}
```

## File Structure

```
~/.copilot/homunculus/
├── identity.json           # Your profile, technical level
├── observations.jsonl      # Current session observations
├── observations.archive/   # Processed observations
├── instincts/
│   ├── personal/           # Auto-learned instincts
│   └── inherited/          # Imported from others
└── evolved/
    ├── agents/             # Generated specialist agents
    ├── skills/             # Generated skills
    └── commands/           # Generated commands
```

## Confidence Scoring

Confidence evolves over time:

| Score | Meaning | Behavior |
|-------|---------|----------|
| 0.3 | Tentative | Suggested but not enforced |
| 0.5 | Moderate | Applied when relevant |
| 0.7 | Strong | Auto-approved for application |
| 0.9 | Near-certain | Core behavior |

**Confidence increases** when:
- Pattern is repeatedly observed
- User doesn't correct the suggested behavior
- Similar instincts from other sources agree

**Confidence decreases** when:
- User explicitly corrects the behavior
- Pattern isn't observed for extended periods
- Contradicting evidence appears

## Why Hooks vs Skills for Observation?

> "v1 relied on skills to observe. Skills are probabilistic - they fire based on prompt matching. Hooks fire 100% of the time, deterministically."

This means:
- Every tool call is observed
- No patterns are missed
- Learning is comprehensive

## Backward Compatibility

v2 is fully compatible with v1:
- Existing `~/.copilot/skills/learned/` skills still work
- sessionEnd hook still runs (but now also feeds into v2)
- Gradual migration path: run both in parallel

## Privacy

- Observations stay **local** on your machine
- Only **instincts** (patterns) can be exported
- No actual code or conversation content is shared
- You control what gets exported

## Related

- [Skill Creator](https://skill-creator.app) - Generate instincts from repo history
- [Homunculus](https://github.com/humanplane/homunculus) - Inspiration for v2 architecture
- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - Continuous learning section

---

*Instinct-based learning: teaching your AI assistant your patterns, one observation at a time.*
