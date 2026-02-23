---
agent: 'agent'
description: 'Analyze uncommitted changes and organize into logical commits'
---

Analyze all my uncommitted changes and organize them into logical, coherent commits.

## Context

Feature/work context: ${input:context:What feature or work were you doing?}
Grouping preference: ${input:preference:Any specific grouping preferences? (leave empty for automatic grouping)}

## Task

Perform the following analysis and create a commit plan:

### 1. Gather All Changes

Check git status and diffs:
- Run `git status --porcelain` to see all changes
- Run `git diff` for unstaged changes
- Run `git diff --cached` for staged changes
- Run `git log --oneline -10` to understand commit message style
- Read untracked files to understand their purpose

### 2. Analyze and Group Changes

Group changes using these strategies:

**Grouping by:**
- **Feature/Purpose**: Changes serving the same goal together
- **Domain/Module**: Changes within the same component/system
- **Dependencies**: Changes that must go together (e.g., function rename + call sites)

**Grouping Rules:**
- ✅ Keep related changes together
- ✅ Keep dependent changes together (atomic commits)
- ✅ Separate unrelated changes into different commits
- ✅ Ensure each commit doesn't break the build
- ❌ Don't mix unrelated features
- ❌ Don't split atomic changes across commits
- ❌ Don't create one massive commit for everything

### 3. Create Commit Plan

Present a structured plan:

```markdown
## Commit Plan

### Summary
- [X] files to commit
- [Y] commits proposed
- [Z] files staged, [W] files unstaged

---

### Commit 1: [PREFIX]: [description]
**Files ([N]):**
- `path/to/file1.ts` (new)
- `path/to/file2.ts` (modified, +50/-20 lines)
- `path/to/file3.ts` (deleted)

**Rationale:**
[Why these files are grouped together]

---

### Commit 2: [PREFIX]: [description]
**Files ([N]):**
- `path/to/file4.ts` (modified, +10/-5 lines)

**Rationale:**
[Why this is separate]

---

[Continue for all commits...]
```

### 4. Safety Checks

**Before presenting plan:**
- ⚠️ **Warn if sensitive files detected:** `.env`, `.env.*`, `*credentials*`, `*secret*`, `*password*`, `*.key`, `*.pem`
- ⚠️ **Check for merge conflicts:** Run `git diff --check` for conflict markers
- ⚠️ **Note obvious errors:** console.error, unresolved TODOs, etc.

### 5. Present Plan and Wait for Approval

Show the commit plan with:
- Number of commits
- Files per commit with change stats
- Rationale for each grouping
- Any warnings from safety checks

**Then ask:**
```
Does this grouping make sense?

Options:
1. ✅ Proceed - Execute this commit plan
2. ✏️ Modify - Adjust grouping or messages
3. ❌ Cancel - Abort without committing

Your decision:
```

**CRITICAL: DO NOT COMMIT UNTIL EXPLICITLY APPROVED**

### 6. Execute If Approved

If user approves with "proceed", "yes", "approve", or "go ahead":

**For each commit:**

1. Stage files individually (one at a time):
   ```bash
   git add path/to/file1.ts
   git add path/to/file2.ts
   ```
   **NEVER use:** `git add .` or `git add -A` or `git add --all`

2. Create commit with proper message format:
   ```bash
   git commit -m "[PREFIX]: [description]

   [Optional body with details]"
   ```

3. Verify each commit:
   ```bash
   git log -1 --stat
   git status
   ```

**After all commits:**
```bash
git status
git log --oneline -n [number_of_commits_created]
```

## Commit Message Guidelines

### Semantic Prefixes

Use these prefixes based on change type:

| Prefix | Use For | Example |
|--------|---------|---------|
| `ADD` | New files, features, functionality | `ADD: user authentication service` |
| `UP` | Updates, enhancements to existing code | `UP: improve error handling in API` |
| `FIX` | Bug fixes | `FIX: correct off-by-one error in pagination` |
| `DEL` | Deletions (files, features, dead code) | `DEL: remove deprecated payment methods` |
| `REFACTOR` | Code restructuring without behavior change | `REFACTOR: extract validation to utility` |
| `MOVE` | File renames or relocations | `MOVE: relocate auth utils to shared directory` |
| `CONFIG` | Configuration file changes | `CONFIG: add production database settings` |
| `TEST` | Test additions or updates | `TEST: add integration tests for auth flow` |
| `DOCS` | Documentation changes | `DOCS: update API endpoint documentation` |
| `PERF` | Performance improvements | `PERF: optimize query with database indexing` |
| `STYLE` | Code formatting, linting | `STYLE: apply prettier to TypeScript files` |
| `BUILD` | Build system or tooling changes | `BUILD: update webpack configuration` |
| `CI` | Continuous integration changes | `CI: add GitHub Actions workflow` |
| `CHORE` | Maintenance tasks | `CHORE: update dependencies` |

### Message Format

- ✅ Use imperative mood: "add feature" not "added feature"
- ✅ Be specific and descriptive
- ✅ Subject line under 72 characters
- ✅ Capitalize subject line
- ✅ No period at end of subject line
- ❌ No vague messages: "fix stuff", "update code"
- ❌ No AI attribution: "Co-Authored-By: Claude"
- ❌ No past tense

## Edge Cases to Handle

**Already staged changes:**
- Ask if user wants to respect staging or regroup
- If regrouping: `git reset` first, then regroup

**Partially staged files:**
- Ask: commit staged only, or include unstaged?

**No changes:**
- Inform: "No uncommitted changes found"
- Exit gracefully

**Binary files:**
- Include in commit
- Note in message if significant

## Example Output

```markdown
## Commit Plan

### Summary
- 5 files to commit
- 3 commits proposed
- 0 files staged, 5 files unstaged

---

### Commit 1: ADD: JWT authentication service
**Files (3):**
- `src/auth/jwt.service.ts` (new, +150 lines)
- `src/auth/auth.middleware.ts` (modified, +45/-10 lines)
- `tests/auth/jwt.test.ts` (new, +95 lines)

**Rationale:**
New JWT authentication feature - service implementation, middleware integration, and tests form a cohesive unit.

---

### Commit 2: UP: improve Button component accessibility
**Files (1):**
- `src/ui/Button.tsx` (modified, +20/-5 lines)

**Rationale:**
Unrelated UI improvement - separate from auth work.

---

### Commit 3: DOCS: document authentication endpoints
**Files (1):**
- `docs/API.md` (modified, +30/-0 lines)

**Rationale:**
Documentation update - separate from implementation.

---

Does this grouping make sense?

Options:
1. ✅ Proceed - Execute this commit plan
2. ✏️ Modify - Adjust grouping or messages
3. ❌ Cancel - Abort without committing

Your decision:
```

---

## Important Notes

- Individual file staging only (never `git add .`)
- Wait for explicit approval before any commits
- No history rewriting (no `--amend`, `--force`, rebase)
- No skipping hooks (no `--no-verify`)
- Verify each commit after creation
- This prompt only creates commits locally - never pushes
