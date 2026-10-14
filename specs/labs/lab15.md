# Lab spec — `labs/lab15.md`

| | |
|---|---|
| **Lab** | `labs/lab15.md` (180 lines, 11.4 KB) — "LSP & Code Intelligence in Copilot CLI" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 15 teaches why a language server beats text search for navigation and refactoring, how
to get one configured for Copilot CLI, how to exercise go-to-definition, find-references,
rename and call hierarchy, and where Copilot still falls back to grep. The teaching idea is
that **code intelligence is compiler-grade symbol resolution, not better pattern matching**.

After the refresh the lab teaches the same thing, but it is honest about what it asks the
learner's machine to absorb: the two global tool installs and the project-wide rename of a
**committed** C# property are called out before they happen and undone afterwards. It also
names the CLI's real LSP configuration surface rather than telling the learner to guess.
No section is added or reordered.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — `copilot lsp` / `/lsp`, language-server installs, and LSP-backed queries from a Copilot CLI session. |
| **Tier** | `intermediate` |
| **Presenter minutes** | 5 (unchanged) |
| **Self-paced minutes** | 20 (unchanged) |
| **Prerequisites** | None hard. The lab is self-contained and deliberately early-ish; it only needs a repo with code in it and an authenticated CLI (Lab 01 setup). State this explicitly rather than leaving it blank — the lab currently declares none at all. |
| **Write steps** | **Yes, and currently unguarded.** (a) §15.2 `dotnet tool install -g csharp-ls` and `npm install -g typescript-language-server typescript` — **global** installs. (b) §15.2 configures an LSP server for the CLI, which persists outside the working tree. (c) §15.3 step 3 renames `FirstMidName` → `FirstName` across the whole `dotnet/` solution — **58 occurrences in committed C# source** — with no restore step. See §7. |
| **`lab-forge` verdict** | **`run with §7 fenced`.** The edit is prose plus a cleanup section; nothing requires installing a language server or performing the rename. Report every §7 item UNVERIFIED and execute none. `copilot lsp --help`, `npm test` and `npx vitest` are outside §7 and may be executed. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | Every `##` section heading is numbered `15.<n>`, uniquely | `npx vitest run tests/lab-structure/lab15-contract` |
| AC5 | The included currency block is byte-identical to `docs/_partials/currency.md` | `npx vitest run tests/lab-structure/lab15-contract` |
| AC6 | §15.2 warns that the installs are global **and** the lab tells the learner how to remove them | `npx vitest run tests/lab-structure/lab15-contract` |
| AC7 | The rename exercise warns it edits committed source **and** gives a named restore command | `npx vitest run tests/lab-structure/lab15-contract` |
| AC8 | The lab names the CLI's real LSP surface (`copilot lsp` and `/lsp`) | `npx vitest run tests/lab-structure/lab15-contract` |
| AC9 | Every model identifier in the lab appears in the `models:` block of the registry | `npx vitest run tests/lab-structure/lab15-contract` |
| AC10 | Every backticked repo-relative path in the lab resolves on disk | `npx vitest run tests/lab-structure/lab15-contract` |
| AC11 | Frontmatter, registry and the inline `⏱️` callout state the same pacing numbers | `npx vitest run tests/lab-structure/lab15-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | The nine supported LSP operations (go-to-def, find-refs, hover, rename, document symbols, workspace symbol search, go-to-implementation, incoming/outgoing calls) | `free-check` — **correct** | Matches this CLI's own `lsp` tool surface exactly (`goToDefinition`, `findReferences`, `hover`, `rename`, `documentSymbol`, `workspaceSymbol`, `goToImplementation`, `incomingCalls`, `outgoingCalls`). No change. |
| C2 | "consult `copilot lsp --help` … the exact config surface is versioned with your CLI build" (§15.2 step 3) | `free-check` — **the subcommand is real** | `copilot --help` lists `lsp  Inspect language server configuration`, and `copilot help` lists `/lsp - Manage language server configuration`. The hedge ("ask Copilot directly", "versioned with your build") is unnecessary vagueness given both surfaces exist and are stable enough to name. Name them. |
| C3 | "Copilot CLI … uses it automatically. You don't request this explicitly" (§15.1) | `free-check` — **correct** | Consistent with the partial's LSP row and with this CLI's documented search order (code intelligence > LSP > glob > grep). No change. |
| C4 | `csharp-ls` and `typescript-language-server` are the servers for the two tracks | `free-check` — **plausible and unload-bearing** | Both are real, widely used servers; the lab does not depend on a version or a flag. **Do not research.** The defect here is not *which* server — it is that the install is global and never removed (D1). |
| C5 | Official docs links: `docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers` and the GitHub blog post | `free-check` | `npx vitest run tests/lab-structure/links-resolve` governs internal links only; these are external and already attributed by name and URL. Leave them. |
| C6 | `dotnet/ContosoUniversity.sln`, the `node/` track, `StudentsController.Index`, `Student.EnrollmentDate`, `Student.FirstMidName`, `CourseRepository.GetByIdAsync` | `free-check` — **mostly resolve; one does not** | `FirstMidName` is real (58 hits in committed C#). **`CourseRepository` does not exist** — the repo has `dotnet/ContosoUniversity.Core/Interfaces/IRepository.cs` and `dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs` (a generic repository). §15.3 step 4's call-hierarchy example names a type that is not there. |

> No `research` disposition. Everything above was settled by running the installed CLI or
> reading this repo. **Do not commission a `spec-forge` run for this lab.**

## 5. Non-goals

- Do not restructure the lab or add sections beyond the cleanup required by AC6/AC7.
- Do not turn this into an LSP-configuration reference. The lab deliberately defers the
  exact config syntax to `copilot lsp --help`; naming the surface is enough.
- Do not add a third language track.
- Do not change the declared pacing (5 / 20).
- **Do not edit `docs/_partials/currency.md`, and do not edit the currency block between
  this lab's `@include` / `@end-include` markers.** That fix is owned by
  `specs/labs/lab13.md`, whose pass re-syncs all ten consumers including this one. AC5 here
  is a **regression fence**: it should already be green when this lab's pass begins, and
  this pass must keep it green without touching the block.
- Do not pick a different rename target to dodge D2. The `FirstMidName` → `FirstName`
  rename is the lab's best demonstration precisely because it is wide (58 sites); the fix
  is to guard and undo it, not to shrink it.

### Stage-2 ordering constraint

**`lab13`'s worktree must merge before this lab's worktree starts.** Lab 13's pass rewrites
the currency block inside `labs/lab15.md`; running the two concurrently produces a merge
conflict in this file. AC5 also cannot be green until Lab 13's pass has landed the corrected
partial and re-synced this lab.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §15.2 step 2 | `dotnet tool install -g csharp-ls` and `npm install -g typescript-language-server typescript` install **globally**, onto the learner's machine, outside the repo. The lab never flags this and never removes them. A learner who runs both labs on a shared or corporate machine has silently gained two global toolchain entries. Flag before, and give `dotnet tool uninstall -g csharp-ls` / `npm uninstall -g typescript-language-server typescript` after. |
| D2 | §15.3 step 3 | The lab instructs a project-wide rename of `Student.FirstMidName` → `FirstName` "across the entire `dotnet/` solution, including all references, views, and DTOs" — **58 occurrences of committed source** — and never tells the learner to undo it. Every later lab that touches `dotnet/` then runs against a mutated tree, and `git status` is dirty for reasons the learner did not anticipate. The step must warn first and end with a named restore (`git restore dotnet/` or `git checkout -- dotnet/`). This is the lab's single highest-impact defect. |
| D3 | §15.3 step 4 | Asks for the call hierarchy of `CourseRepository.GetByIdAsync`. **No `CourseRepository` type exists** — the repo ships a generic `Repository` (`dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs`) behind `IRepository` (`dotnet/ContosoUniversity.Core/Interfaces/IRepository.cs`). The learner's LSP query returns nothing and the exercise appears to prove LSP does not work. Point at a type that exists. |
| D4 | §15.2 step 3 | "consult `copilot lsp --help` or ask Copilot directly — the exact config surface is versioned with your CLI build". Both `copilot lsp` (subcommand) and `/lsp` (slash command) exist and are listed in the CLI's own help. The hedge makes a discoverable, stable surface sound uncertain. Name both. |
| D5 | whole lab | No cleanup section, despite D1 and D2. Unlike Labs 06, 11, 12 and 13 it does not include `docs/_partials/cleanup.md`. Adding that shared partial is the preferred fix because it is mechanical and already carries the "restore config / check `git status`" sweep; a short bespoke cleanup naming the two uninstalls and the `git restore` is acceptable. Either way AC6 and AC7 must pass. |
| D6 | frontmatter | Declares no prerequisites and the lab body states none, yet it is Lab 15 of 24. Declare explicitly that there are none beyond Lab 01 setup — an empty prerequisite list that is *deliberate* reads very differently from one that was forgotten. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED and execute none:

- `dotnet tool install -g csharp-ls` and `dotnet tool uninstall -g csharp-ls`.
- `npm install -g typescript-language-server typescript` and the matching `npm uninstall -g`.
- Any step that configures or starts a language server for the session (§15.2 step 3).
- The §15.3 step 3 rename of `FirstMidName` → `FirstName`, and any `git restore dotnet/` /
  `git checkout -- dotnet/` that undoes it — **the restore is as dangerous as the rename**
  if the tree holds unrelated uncommitted work.
- Any prompt in §15.3 or §15.4 that drives a live LSP query, because each needs a running
  server installed by a fenced step.
- `dotnet build` / `dotnet test` against the mutated solution.

Safe to execute: `copilot lsp --help`, `copilot --help`, `npm test`, `npx vitest run …`,
`git status`, and any read of a repo file.

> **Note for the run gate.** This repo's own LSP tooling currently reports
> `lsp-html … failed: The language server command for 'html' was not found`. That is a
> pre-existing condition of the workstation, unrelated to this lab, and it is **not** a
> finding against Lab 15.
