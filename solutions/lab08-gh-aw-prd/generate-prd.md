---
on:
  create:
    branches:
      - 'feature/**'
      - 'story/**'
permissions:
  contents: write
  issues: read
tools:
  github:
    toolsets: [repos, issues]
  edit:
  bash: ["dotnet"]
runtimes:
  dotnet:
    version: "8.0"
strict: false
description: "Generate a PRD document when a feature or story branch is created"
---
## Generate PRD for Feature Branch

You are a Product Manager agent. When a new feature or story branch is created, generate a Product Requirements Document (PRD).

### Instructions

1. Read the branch name from `${{ github.event.ref }}` and extract the feature description
2. Analyze the ContosoUniversity codebase to understand the current architecture
3. Generate a PRD document at `docs/prd/PRD-${{ github.event.ref }}.md`

### PRD Template

The PRD must include these sections:

1. **Feature Overview** — What this feature does, derived from the branch name
2. **User Stories** — 2-3 user stories in "As a [role], I want [action], so that [benefit]" format
3. **Acceptance Criteria** — Measurable criteria for each user story
4. **Technical Considerations**
   - Which ContosoUniversity projects are affected (Core, Infrastructure, Web, Tests)
   - Database changes needed (Entity Framework migrations)
   - API endpoints to add or modify
   - Views and UI changes
5. **Testing Requirements**
   - Unit tests (xUnit)
   - Integration tests (WebApplicationFactory)
   - E2E tests (Playwright)
6. **Out of Scope** — What this feature explicitly does NOT include
7. **Dependencies** — Any prerequisites or related features

### Constraints

- Keep the PRD focused and actionable (under 200 lines)
- Use the ContosoUniversity domain language (Students, Courses, Instructors, Departments, Enrollments)
- Reference specific files and patterns from the existing codebase
