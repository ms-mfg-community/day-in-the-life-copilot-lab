---
name: continuous-learning
description: Automatically extract reusable patterns from coding sessions and save them as learned skills for future use.
---

# Continuous Learning Skill

Automatically evaluates coding sessions on end to extract reusable patterns that can be saved as learned skills.

## How It Works

This skill runs as a **sessionEnd hook** at the end of each session:

1. **Session Evaluation**: Checks if session has enough messages (default: 10+)
2. **Pattern Detection**: Identifies extractable patterns from the session
3. **Skill Extraction**: Saves useful patterns to `~/.copilot/skills/learned/`

## Configuration

```json
{
  "min_session_length": 10,
  "extraction_threshold": "medium",
  "auto_approve": false,
  "learned_skills_path": "~/.copilot/skills/learned/",
  "patterns_to_detect": [
    "error_resolution",
    "user_corrections",
    "workarounds",
    "debugging_techniques",
    "project_specific"
  ],
  "ignore_patterns": [
    "simple_typos",
    "one_time_fixes",
    "external_api_issues"
  ]
}
```

## Pattern Types

| Pattern | Description |
|---------|-------------|
| `error_resolution` | How specific errors were resolved |
| `user_corrections` | Patterns from user corrections |
| `workarounds` | Solutions to framework/library quirks |
| `debugging_techniques` | Effective debugging approaches |
| `project_specific` | Project-specific conventions |

## Hook Setup

Add to your `.github/hooks/default.json`:

```json
{
  "version": 1,
  "hooks": {
    "sessionEnd": [{
      "type": "command",
      "bash": "scripts/hooks/evaluate-session.sh"
    }]
  }
}
```

## Why sessionEnd Hook?

- **Lightweight**: Runs once at session end
- **Non-blocking**: Doesn't add latency to every message
- **Complete context**: Has access to full session transcript

## Comparison with v2

| Feature | v1 (This Skill) | v2 (Instinct-Based) |
|---------|------------------|----|
| Observation | sessionEnd hook (end of session) | preToolUse/postToolUse (continuous) |
| Analysis | Main context | Background analysis |
| Granularity | Full skills | Atomic "instincts" |
| Confidence | None | 0.3–0.9 weighted |
| Evolution | Direct to skill | Instincts cluster into skills/commands/agents |

See `continuous-learning-v2` for the instinct-based approach.
