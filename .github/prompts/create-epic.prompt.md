---
description: "Create a structured epic document with stories, tasks, and acceptance criteria"
agent: "agent"
---

# Create Epic Command

Generate a structured epic document for tracking multi-session work.

## Input

- Epic Name: ${input:epic_name:Name of the epic}
- Description: ${input:epic_description:Brief description of what this epic delivers}
- Business Value: ${input:business_value:Why this matters to users/stakeholders}
- Scope: ${input:scope:What's in/out of scope}

## Process

1. **Create directory** if `docs/epics/` doesn't exist
2. **Scan existing epics** in `docs/epics/EPIC-*.md` to determine next number
3. **Generate epic document** using the template below
4. **Use sequential-thinking MCP** for complex workflow decomposition
5. **Create handoff doc** if epic spans multiple sessions

## Epic Template

Create `docs/epics/EPIC-XXX-[kebab-case-name].md`:

```markdown
# EPIC-XXX: [Name]

**Status:** Draft
**Created:** [Date]
**Owner:** TBD

---

## Overview

[Description]

**Business Value:** [Why this matters]

## Scope

**In Scope:**
- [Item 1]
- [Item 2]

**Out of Scope:**
- [Item 1]
- [Item 2]

---

## User Stories

### US-1: [Story Name]

**As a** [user type]
**I want** [feature/capability]
**So that** [benefit/outcome]

**Acceptance Criteria:**
- [ ] Given [context] When [action] Then [result]
- [ ] Given [context] When [action] Then [result]

**Test Criteria:** (TDD required)
- Unit tests for [component]
- Integration tests for [flow]

---

## Technical Tasks

### Phase 1: [Phase Name]
- [ ] Task 1 - [Description]
- [ ] Task 2 - [Description]

### Phase 2: [Phase Name]
- [ ] Task 3 - [Description]
- [ ] Task 4 - [Description]

---

## Dependencies

- [Dependency 1]
- [Dependency 2]

---

## Success Criteria

- [ ] All user stories complete with passing tests
- [ ] Code review approved
- [ ] Documentation updated
- [ ] 80%+ test coverage

---

## Handoff

[Link to handoff doc: docs/SESSION_HANDOFFS/EPIC-XXX-handoff-N.md]
```

## TDD Enforcement

Every story MUST include:
- **Test Criteria** section with specific test types
- Reference `@tdd-guide` agent for implementation guidance
- No code without corresponding tests
- Minimum 80% coverage target

## Output

File created at: `docs/epics/EPIC-XXX-[name].md`

After creation, use `/handoff` when pausing work to generate session handoff documentation.
