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
copilot --allow-all-tools \
        --agent=tight-reviewer \
        --prompt "Review dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs against current ASP.NET Core controller guidance. Cite Microsoft Learn sources."
```

Expected: a review that quotes the file (proving the read worked — the hook
sees this as `view`) and cites `learn.microsoft.com` URLs (proving the Learn
search worked — the hook sees this as `microsoft-learn-microsoft_docs_search`,
the hyphen-joined runtime name). No build ran. No file was modified.

## 2 — Confirm `shell`/`execute` is blocked

`dotnet build` requires the `shell`/`execute`/`bash` tool alias, which is
**not** in the agent's `tools:` allow-list and — under any of its runtime
spellings — **not** in the `deny-unlisted-tools.json` hook's allow-list
either. (The hook is keyed on concrete runtime tool names; see the namespace
callout in [`labs/lab-hardening.md`](../../lab-hardening.md) §2.)

```bash
copilot --allow-all-tools \
        --agent=tight-reviewer \
        --prompt "Run 'dotnet build dotnet/ContosoUniversity.sln' and report the result."
```

Expected: the hook emits `deny`, with the reason naming the blocked shell
tool (`shell`/`execute`/`bash`). Build does not run. This is the
defense-in-depth win.

## 3 — Verify

- Positive: prompt in step 1 produces a Learn-cited review.
- Negative: prompt in step 2 produces a hook-sourced deny message.
- Neither invocation modifies any file under `dotnet/`.
