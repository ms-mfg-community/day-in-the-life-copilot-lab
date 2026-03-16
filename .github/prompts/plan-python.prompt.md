---
description: "Plan a feature implementation for the ContosoUniversity Python/Flask application."
mode: "agent"
tools: ["read", "search"]
---

# Plan Python Feature

Create an implementation plan for a feature in the ContosoUniversity Python application.

## Instructions

1. **Analyze the request** — What is being asked?
2. **Explore the codebase** — Read relevant files in `ContosoUniversity_Python/`
3. **Identify affected layers:**
   - `app/models/` — SQLAlchemy models
   - `app/routes/` — Flask blueprints
   - `app/forms/` — WTForms validation
   - `app/services/` — Business logic
   - `app/templates/` — Jinja2 views
   - `tests/` — pytest tests
4. **Create a task breakdown** with file-level specifics
5. **Identify risks** — breaking changes, migration needs, test gaps

## Output Format

```markdown
## Summary
[One sentence describing the feature]

## Affected Files
- `app/models/...` — [what changes]
- `app/routes/...` — [what changes]
- `app/templates/...` — [what changes]
- `tests/...` — [what tests]

## Tasks
1. [Model changes] — [complexity: S/M/L]
2. [Route/form changes] — [complexity: S/M/L]
3. [Template changes] — [complexity: S/M/L]
4. [Test changes] — [complexity: S/M/L]

## Risks
- [Risk 1] — Mitigation: [approach]
```
