---
title: ".NET Appendix — gh extensions lab"
lab_number: gh-extensions
track: dotnet
parent_lab: lab-gh-extensions.md
---

# .NET Appendix — `gh clab` on the .NET track

This appendix is the stack-specific completion path for
[`labs/lab-gh-extensions.md`](../../lab-gh-extensions.md). Pair with the Node
variant: [`labs/appendices/node/lab-gh-extensions.md`](../node/lab-gh-extensions.md).

> `gh clab` itself is a **Node** interpreted extension regardless of your
> workshop track — the extension runtime requirement is Node ≥ 20 on PATH. The
> .NET track just adds a stack-flavored invocation.

## 1 — Rebuild + summarize after a .NET change

Chain `dotnet build` with `gh clab` so a successful build produces a structured
changelog for the new delta:

```bash
dotnet build dotnet/ContosoUniversity.sln --nologo --verbosity quiet \
  && gh clab --mock > .git/CLAB_SUMMARY.md \
  && echo "[ok] build green + changelog written to .git/CLAB_SUMMARY.md"
```

Use `--mock` in CI and on air-gapped dev boxes; drop `--mock` to let
`pickMode()` choose the live path (`gh models` → OpenAI → mock).

## 2 — Scope the diff to the .NET project

`gh clab` summarizes `git diff HEAD` by default. To scope to the `dotnet/`
subtree, pipe a constrained diff through the same prompt template via
`gh models run`:

```bash
gh models run openai/gpt-4o-mini \
  "$(printf 'Summarize as Added/Changed/Fixed/Removed:\n\n%s' \
     "$(git diff HEAD -- dotnet/)")"
```

If `gh models` is unavailable, keep `gh clab --mock` — the extension's whole
point is to be teachable without credentials.

## 3 — Verify

Expected output: a structured changelog (Added / Changed / Fixed / Removed)
whose bullets reference files under `dotnet/` only. If the diff is empty
(`git diff HEAD -- dotnet/` is blank), add `--allow-empty` to force a run.
