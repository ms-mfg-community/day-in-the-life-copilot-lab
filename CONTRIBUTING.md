# Contributing

Thanks for improving the Day-in-the-Life Copilot Lab. This repo follows strict **TDD-first** contribution rules so the content stays trustworthy as the GitHub Copilot surface evolves.

## TDD-first contribution pattern

Every change that touches labs, workflows, MCP configs, plugin/template code, or registry data follows this loop:

1. **RED — write the failing test first.**
   - Lab/doc changes: add or extend a test under `tests/lab-structure/` or `tests/content-currency/`.
   - App code (Node/.NET): add the failing unit/integration/e2e test in the relevant `tests/` or `*.Tests` project.
   - Workflows: add a schema or dry-run test under `tests/workflows/`.
   - Run the test and confirm it fails for the right reason before writing any implementation.

2. **GREEN — make the smallest change that passes.**
   - Edit the doc/code/config until the failing test (and only that test) turns green.
   - Do not fix unrelated issues in the same commit.

3. **REFACTOR — clean up without changing behavior.**
   - Re-run the full suite (`npm test` and, where relevant, `dotnet test`) and confirm nothing regressed.

4. **Commit.**
   - Conventional-commit prefix: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `perf:`, `ci:`.
   - Individual `git add <path>` per file — **never** `git add .` or `git add -A`.
   - Include the required `Co-authored-by` trailer when committing from Copilot CLI.

## What the test harness covers

| Directory | Purpose |
|-----------|---------|
| `tests/lab-structure/` | Frontmatter schema, internal link resolution, lab ordering. |
| `tests/content-currency/` | Registry consumption, version drift, model/MCP pins. |

`docs/_meta/registry.yaml` is the **single source of truth** for versions, MCP servers, models, and pacing. Labs must reference it instead of hardcoding versions — the `registry-consumed` test enforces this across at least three labs.

## Running the suite

```bash
npm install
npm test                     # full Vitest suite
npm run test:lab-structure   # frontmatter + link checks only
npm run test:content-currency
```

## Scope discipline

- Read existing code before proposing changes.
- Only make changes that are directly requested or required for the TDD cycle you opened.
- Three similar lines of code is better than a premature abstraction.
- If you discover unrelated bugs, open a separate issue rather than bundling the fix.

## Secrets & safety

- Never commit secrets. Use `COPILOT_GITHUB_TOKEN` and env-based Azure/Fabric auth.
- Error messages must not leak stack traces or internal paths.
- Workflows that mutate the repo must run in draft PR mode above the change threshold in `registry.yaml`.
