---
on: create
if: startsWith(github.ref, 'refs/heads/feature/') || startsWith(github.ref, 'refs/heads/story/')
permissions: contents-read-issues-read
tools: github-edit-bash
runtimes: node-22
safe-outputs: create-pull-request
description: Generates a Product Requirements Document when a feature/** or story/** branch is created.
---

## Generate a Product Requirements Document

A feature branch was just created. Produce a first-draft PRD for the feature
it names.

1. Derive the feature from the branch name (and the linked issue, if one
   exists — prefer the issue's user stories and acceptance criteria over
   guessing).
2. Analyze the ContosoUniversity codebase: entities in `src/entities/`,
   repositories in `src/repos/`, route handlers in `src/routes/`, tests in
   `tests/`.
3. Write the PRD to `docs/prd/PRD-{branch-name-with-dashes}.md` with these
   sections:
   - **Feature Overview** (include a `Related Issues:` line — the issue
     number if linked, `#N/A` otherwise)
   - **User Stories**
   - **Acceptance Criteria** (measurable; cover every criterion from the
     linked issue)
   - **Technical Considerations** (name the real files and layers affected)
   - **Testing Requirements** (Vitest; the project's naming convention)
   - **Out of Scope**
   - **Dependencies**

Keep it under 120 lines. Propose — do not implement.
