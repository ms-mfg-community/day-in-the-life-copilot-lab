---
title: "Node Appendix — gh extensions lab"
lab_number: gh-extensions
track: node
parent_lab: lab-gh-extensions.md
---

# Node Appendix — `gh clab` on the Node track

This appendix is the stack-specific completion path for
[`labs/lab-gh-extensions.md`](../../lab-gh-extensions.md). Pair with the .NET
variant: [`labs/appendices/dotnet/lab-gh-extensions.md`](../dotnet/lab-gh-extensions.md).

## 1 — Pin the Node version the extension requires

`gh-clab/package.json` declares `engines.node = ">=20"`. If your Node track
uses `nvm`, pin the same floor locally so the shebang resolves consistently:

```bash
echo "20" > .nvmrc
nvm use        # or: corepack use node@20
node --version # v20.x or newer
```

## 2 — Chain with the Node workspace test

Run the Node workspace tests, then summarize the delta:

```bash
npm run -s test --workspaces --if-present \
  && gh clab --mock > .git/CLAB_SUMMARY.md \
  && echo "[ok] tests green + changelog at .git/CLAB_SUMMARY.md"
```

Use `--mock` in CI and when you have no GitHub Models access; drop `--mock`
to let `pickMode()` pick `gh models` (preferred) or the OpenAI fallback.

## 3 — Scope the diff to the Node project

Constrain the diff to the `node/` subtree by invoking `gh models run` directly
with a tailored prompt:

```bash
gh models run openai/gpt-4o-mini \
  "$(printf 'Summarize as Added/Changed/Fixed/Removed:\n\n%s' \
     "$(git diff HEAD -- node/)")"
```

## 4 — Verify

Expected output: a structured changelog whose bullets reference files under
`node/` only. Empty diff? Add `--allow-empty` to force a run (mock mode always
exits 0, so this is the safest smoke test).
