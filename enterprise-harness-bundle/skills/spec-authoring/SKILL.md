---
name: spec-authoring
description: Create concise, testable requirements with explicit assumptions and review.
---

# Spec Authoring

Use this skill to bind the bundle's spec-author agent to Spec Kit's
`speckit.specify` command. Spec Kit owns the stage command and template; this
skill does not duplicate them.

## Binding

1. Confirm the repository has initialized Spec Kit.
2. Invoke `speckit.specify`, or `/speckit-specify` in the default skills
   layout, with the approved feature request.
3. Review the resulting specification for explicit uncertainties and
   observable acceptance criteria.
4. Request human review before treating the specification as approved.

The workflow is optional and may start at a different stage when the work
already has adequate requirements or begins as a bug investigation.
