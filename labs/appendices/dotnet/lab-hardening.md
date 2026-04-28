---
title: ".NET Appendix — Hardening lab"
lab_number: hardening
track: dotnet
parent_lab: lab-hardening.md
---

# .NET Appendix — `tight-reviewer` on the .NET track

This appendix is the stack-specific completion path for
[`labs/lab-hardening.md`](../../lab-hardening.md). Pair with the Node
variant: [`labs/appendices/node/lab-hardening.md`](../node/lab-hardening.md).

## 1 — Point the reviewer at a .NET controller

`tight-reviewer` is locked down to `read` and
`microsoft-learn/microsoft_docs_search`. That is exactly the right toolset
for reviewing a .NET controller against current EF Core / ASP.NET guidance
without letting the agent run `dotnet build` or edit source.

```bash
copilot --agent=tight-reviewer \
        --prompt "Review dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs against current ASP.NET Core controller guidance. Cite Microsoft Learn sources."
```

Expected: a review that quotes the file (proving `read` worked) and cites
`learn.microsoft.com` URLs (proving `microsoft-learn/microsoft_docs_search`
worked). No build ran. No file was modified.

## 2 — Confirm `shell`/`execute` is blocked

`dotnet build` requires the `shell`/`execute` tool alias, which is **not**
in the agent's `tools:` allow-list and **not** in the
`deny-unlisted-tools.json` hook's allow-list.

```bash
copilot --agent=tight-reviewer \
        --prompt "Run 'dotnet build dotnet/ContosoUniversity.sln' and report the result."
```

Expected: the hook emits `deny` with the reason referencing `shell`.
Build does not run. This is the defense-in-depth win.

## 3 — Verify

- Positive: prompt in step 1 produces a Learn-cited review.
- Negative: prompt in step 2 produces a hook-sourced deny message.
- Neither invocation modifies any file under `dotnet/`.
