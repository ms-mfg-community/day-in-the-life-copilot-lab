---
name: iterative-retrieval
description: Pattern for progressively refining context retrieval to solve the subagent context problem in multi-agent workflows.
deprecated: true
deprecated_since: "2026-04"
redirect: ../continuous-learning-v2/SKILL.md
see_also:
  - docs/memory-decision-tree.md
  - .github/skills/continuous-learning-v2/SKILL.md
---

> ⚠️ **Deprecated — kept for teaching context.** The iterative-retrieval
> pattern is now folded into the v2 instinct loop: subagents request
> additional context as instincts fire, rather than discovering it through
> ad-hoc retrieval rounds. Use
> [`continuous-learning-v2`](../continuous-learning-v2/SKILL.md) and the
> [memory decision tree](../../../docs/memory-decision-tree.md) instead.

# Iterative Retrieval Pattern

Solves the "context problem" in multi-agent workflows where subagents don't know what context they need until they start working.

## The Problem

Subagents are spawned with limited context. They don't know:
- Which files contain relevant code
- What patterns exist in the codebase
- What terminology the project uses

Standard approaches fail:
- **Send everything**: Exceeds context limits
- **Send nothing**: Agent lacks critical information
- **Guess what's needed**: Often wrong

## The Solution: Iterative Retrieval

A 4-phase loop that progressively refines context:

```
┌─────────────────────────────────────────────┐
│                                             │
│   ┌──────────┐      ┌──────────┐            │
│   │ DISPATCH │─────▶│ EVALUATE │            │
│   └──────────┘      └──────────┘            │
│        ▲                  │                 │
│        │                  ▼                 │
│   ┌──────────┐      ┌──────────┐            │
│   │   LOOP   │◀─────│  REFINE  │            │
│   └──────────┘      └──────────┘            │
│                                             │
│        Max 3 cycles, then proceed           │
└─────────────────────────────────────────────┘
```

### Phase 1: DISPATCH

Initial broad query to gather candidate files:

```
Start with high-level intent:
  patterns: ['**/*.cs', 'ContosoUniversity.Core/**/*.cs']
  keywords: ['Student', 'Enrollment', 'Repository']
  excludes: ['*Tests*.cs', 'Migrations/*.cs']

Dispatch to retrieval agent to find candidate files.
```

### Phase 2: EVALUATE

Assess retrieved content for relevance:

```
For each file, score relevance:
  path: file path
  relevance: 0.0 - 1.0 score against the task
  reason: why this file matters
  missingContext: what gaps remain
```

Scoring criteria:
- **High (0.8-1.0)**: Directly implements target functionality
- **Medium (0.5-0.7)**: Contains related patterns or types
- **Low (0.2-0.4)**: Tangentially related
- **None (0-0.2)**: Not relevant, exclude

### Phase 3: REFINE

Update search criteria based on evaluation:

```
Refine the query:
  - Add new patterns discovered in high-relevance files
  - Add terminology found in the codebase (e.g., discovered "SchoolContext" instead of "DbContext")
  - Exclude confirmed irrelevant paths (relevance < 0.2)
  - Target specific gaps identified in Phase 2
```

### Phase 4: LOOP

Repeat with refined criteria (max 3 cycles):

```
For up to 3 cycles:
  1. Retrieve files matching refined query
  2. Evaluate relevance of each candidate
  3. If 3+ files score >= 0.7 and no critical gaps remain → done
  4. Otherwise, refine query and repeat
  5. After 3 cycles, return best context collected so far
```

## Practical Examples

### Example 1: Bug Fix Context

```
Task: "Fix the enrollment date validation bug"

Cycle 1:
  DISPATCH: Search for "Enrollment", "Date", "Validation" in **/*.cs
  EVALUATE: Found Enrollment.cs (0.9), StudentController.cs (0.8), Student.cs (0.3)
  REFINE: Add "DataAnnotations", "ModelState" keywords; exclude Student.cs

Cycle 2:
  DISPATCH: Search refined terms
  EVALUATE: Found CreateStudentDto.cs (0.95), ValidationHelper.cs (0.85)
  REFINE: Sufficient context (2 high-relevance files)

Result: Enrollment.cs, StudentController.cs, CreateStudentDto.cs, ValidationHelper.cs
```

### Example 2: Feature Implementation

```
Task: "Add pagination to the Students index page"

Cycle 1:
  DISPATCH: Search "Student", "Index", "List" in Controllers/ and Views/
  EVALUATE: Found StudentsController.cs (0.9), Index.cshtml (0.7)
  REFINE: Need PaginatedList helper

Cycle 2:
  DISPATCH: Search "Paginate", "PageSize", "PageIndex"
  EVALUATE: Found PaginatedList.cs (0.95), found PageSize in appsettings (0.6)
  REFINE: Sufficient context

Result: StudentsController.cs, Index.cshtml, PaginatedList.cs
```

## Integration with Agents

Use in agent prompts:

```markdown
When retrieving context for this task:
1. Start with broad keyword search
2. Evaluate each file's relevance (0-1 scale)
3. Identify what context is still missing
4. Refine search criteria and repeat (max 3 cycles)
5. Return files with relevance >= 0.7
```

## Best Practices

1. **Start broad, narrow progressively** - Don't over-specify initial queries
2. **Learn codebase terminology** - First cycle often reveals naming conventions
3. **Track what's missing** - Explicit gap identification drives refinement
4. **Stop at "good enough"** - 3 high-relevance files beats 10 mediocre ones
5. **Exclude confidently** - Low-relevance files won't become relevant

## Related

- [The Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) - Subagent orchestration section
- `continuous-learning` skill - For patterns that improve over time
- Agent definitions in `.github/agents/`
