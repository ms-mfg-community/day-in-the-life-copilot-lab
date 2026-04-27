---
title: "Node Appendix — Hardening lab"
lab_number: hardening
track: node
parent_lab: lab-hardening.md
---

# Node Appendix — `tight-reviewer` on the Node track

This appendix is the stack-specific completion path for
[`labs/lab-hardening.md`](../../lab-hardening.md). Pair with the .NET
variant: [`labs/appendices/dotnet/lab-hardening.md`](../dotnet/lab-hardening.md).

## 1 — Point the reviewer at a Node workspace file

`tight-reviewer` can only `read` files and search Microsoft Learn. That is
enough to get a prose review of a Node module against current Node / npm
guidance, but it cannot run `npm test`, edit sources, or shell out.

```bash
copilot --agent=tight-reviewer \
        --prompt "Review node/ for async/await correctness and cite any Microsoft Learn guidance on Node 20+ best practices."
```

Expected: a review that references specific files in `node/` (proving
`read` worked) and cites `learn.microsoft.com` URLs (proving
`microsoft-learn/microsoft_docs_search` worked). No test ran; no file was
modified.

## 2 — Confirm `shell`/`execute` is blocked

`npm test` requires the `shell`/`execute` tool alias, which is **not** in
the agent's `tools:` allow-list and **not** in the
`deny-unlisted-tools.json` hook's allow-list.

```bash
copilot --agent=tight-reviewer \
        --prompt "Run 'npm test --workspaces' and report failures."
```

Expected: the hook emits `deny` with the reason referencing `shell`. The
test suite does not run. This is the defense-in-depth win.

## 3 — Verify

- Positive: prompt in step 1 produces a Learn-cited review.
- Negative: prompt in step 2 produces a hook-sourced deny message.
- Neither invocation modifies any file under `node/`.
