---
description: "Extract patterns from multiple sources and generate instincts with confidence scoring"
agent: "agent"
---

# Multi-Source Pattern Extraction

Analyze multiple data sources and extract reusable instincts with evidence-based confidence.

## Data Sources (check in order)

1. **Session logs**: `~/.copilot/logs/*.log`
2. **Memory MCP**: Use `memory-read_graph` tool
3. **Observations**: `~/.copilot/homunculus/observations.jsonl`
4. **Existing instincts**: `~/.copilot/homunculus/instincts/personal/*.md`

## Pattern Extraction

For each source, identify:

| Pattern Type | What to Look For |
|--------------|------------------|
| User corrections | Agent proposed X, user said "no, do Y" |
| Error resolutions | Error → investigation → fix |
| Repeated workflows | Same tool sequence used 3+ times |
| Tool preferences | Preferred tools for specific task types |
| **Token waste** | Redundant tool calls, verbose output, repeated searches |
| **Ineffective behaviors** | Failed approaches, retries, dead ends |
| **Optimization opportunities** | Commands that could be chained, parallel calls missed |

### Token Optimization Patterns

Look specifically for:
- **Sequential calls that could be parallel** - Multiple `view` or `grep` calls that were independent
- **Verbose command output** - Commands without `--quiet`, `| head`, or output limiting
- **Repeated searches** - Same grep/glob pattern run multiple times
- **Failed then succeeded** - Initial approach failed, different approach worked (learn the better path)
- **Large file reads** - Full file views when only a section was needed
- **Unnecessary confirmations** - Steps that didn't need user confirmation

## Confidence Scoring

Calculate confidence based on evidence count:
- 1 source: 0.3 (low)
- 2 sources: 0.5 (medium)  
- 3+ sources: 0.7+ (high)

Domains: `code-style`, `testing`, `git`, `debugging`, `workflow`, `tooling`, `token-efficiency`

## Process

1. Read observations file: `cat ~/.copilot/homunculus/observations.jsonl | tail -50`
2. Query Memory MCP for related entities
3. Scan existing instincts for related patterns
4. Cluster similar observations into instinct candidates
5. Calculate confidence from evidence count
6. Generate instinct files for patterns with 2+ evidence points
7. Ask user to confirm before saving

## Output Format

Save to: `~/.copilot/homunculus/instincts/personal/[instinct-name].md`

```markdown
---
id: instinct-name
trigger: "when [condition]"
confidence: 0.X
domain: "domain-tag"
source: "multi-source"
---

# Instinct Title

## Action
[What to do when trigger fires]

## Evidence
- Session: [observation from logs]
- Observation: [from observations.jsonl]
- Memory: [from knowledge graph]
```

## Quality Filters

- Skip trivial patterns (typos, one-time issues)
- Require reproducible trigger conditions
- Merge duplicates with existing instincts (increase confidence)
- One focused behavior per instinct
