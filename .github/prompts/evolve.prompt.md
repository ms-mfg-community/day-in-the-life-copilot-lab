---
description: "Cluster related instincts into higher-level skills, commands, or agents based on pattern similarity"
agent: "agent"
argument-hint: "--domain <name> | --dry-run | --threshold <n>"
---

# Evolve Command

Analyze instincts and cluster related ones into higher-level structures:
- **Commands**: When instincts describe user-invoked actions
- **Skills**: When instincts describe auto-triggered behaviors
- **Agents**: When instincts describe complex, multi-step processes

## Usage

```
/evolve                    # Analyze all instincts and suggest evolutions
/evolve --domain testing   # Only evolve instincts in testing domain
/evolve --dry-run          # Show what would be created without creating
/evolve --threshold 5      # Require 5+ related instincts to cluster
```

## Evolution Rules

### To Command (User-Invoked)
When instincts describe actions a user would explicitly request:
- Multiple instincts about "when user asks to..."
- Instincts with triggers like "when creating a new X"
- Instincts that follow a repeatable sequence

### To Skill (Auto-Triggered)
When instincts describe behaviors that should happen automatically:
- Pattern-matching triggers
- Error handling responses
- Code style enforcement

### To Agent (Needs Depth/Isolation)
When instincts describe complex, multi-step processes:
- Debugging workflows
- Refactoring sequences
- Research tasks

## What to Do

1. Read all instincts from `~/.copilot/homunculus/instincts/`
2. Group instincts by:
   - Domain similarity
   - Trigger pattern overlap
   - Action sequence relationship
3. For each cluster of 3+ related instincts:
   - Determine evolution type (command/skill/agent)
   - Generate the appropriate file
   - Save to `~/.copilot/homunculus/evolved/{commands,skills,agents}/`
4. Link evolved structure back to source instincts

## Output Format

```
Evolve Analysis
==================

Found N clusters ready for evolution:

## Cluster 1: [Name]
Instincts: [list]
Type: Command|Skill|Agent
Confidence: X% (based on N observations)
Would create: [file path]
```

## Flags

- `--execute`: Actually create the evolved structures (default is preview)
- `--dry-run`: Preview without creating
- `--domain <name>`: Only evolve instincts in specified domain
- `--threshold <n>`: Minimum instincts required to form cluster (default: 3)
- `--type <command|skill|agent>`: Only create specified type

