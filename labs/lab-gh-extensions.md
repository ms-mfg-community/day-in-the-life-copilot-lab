---
title: "Building a GitHub CLI Extension that Calls an LLM"
lab_number: gh-extensions
pace:
  presenter_minutes: 12
  self_paced_minutes: 30
registry: docs/_meta/registry.yaml
---

# Lab — Building a GitHub CLI Extension that Calls an LLM

> ⏱️ Presenter pace: 12 minutes | Self-paced: 30 minutes

In this lab you will build **`gh clab`** — an *interpreted Node* GitHub CLI
extension that summarizes the working-tree diff into a structured changelog by
calling an LLM. You will run it three ways (primary / fallback / mock), wire it
into a git `pre-commit` hook, and learn how the official distribution model
works.

Reference solution: [`solutions/lab-gh-extensions/gh-clab/`](../solutions/lab-gh-extensions/gh-clab/README.md).

> 🧭 **Track appendices** — stack-specific completion notes live in
> [`labs/appendices/dotnet/lab-gh-extensions.md`](appendices/dotnet/lab-gh-extensions.md) and
> [`labs/appendices/node/lab-gh-extensions.md`](appendices/node/lab-gh-extensions.md).

## Runtime modes — read this first

The extension and this lab support **three** runtime modes, selected
automatically in this priority order. The `--mock` path is the "no credentials"
path — every section of this lab is exercisable with zero secrets.

| Priority | Mode        | Trigger                                                                             | Network? |
|----------|-------------|-------------------------------------------------------------------------------------|----------|
| 1        | `gh models` | `gh` on PATH and `github/gh-models` installed. Auth inherits from `gh auth`.        | Yes      |
| 2        | OpenAI      | `OPENAI_API_KEY` set, **or** `AZURE_OPENAI_API_KEY` + `_ENDPOINT` + `_DEPLOYMENT`.  | Yes      |
| 3        | Mock        | `GH_CLAB_MOCK=1`, `--mock`, or neither upstream available. Canned deterministic.    | No       |

If you have no access to GitHub Models and no API key, **skip straight to the
mock path** (`gh clab --mock`) — every later section still works.

## 1 — Concept: what is a `gh extension`?

> "GitHub CLI extensions are custom GitHub CLI commands that anyone can create
> and use. Extensions are locally installed and are scoped to the user."
> — [Using GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions)

The docs enumerate **three** official extension types and one hard naming rule.

| Type                         | Created with                                 | What ships                                                               |
|------------------------------|-----------------------------------------------|---------------------------------------------------------------------------|
| **Interpreted**              | `gh extension create <name>`                  | A single executable script at repo root (bash by default; any interpreter works if installed). |
| **Precompiled in Go**        | `gh extension create --precompiled=go <name>` | A Go project using `github.com/cli/go-gh`; release binaries per OS/arch. |
| **Precompiled, other**       | `gh extension create --precompiled=other <name>` | You supply `script/build.sh`; release binaries per OS/arch.              |

**The `gh-` rule.** The repository (or directory) name **must** start with
`gh-`. The prefix is stripped to form the command: `gh-clab/` → `gh clab`. An
installed extension with the same name will make `gh extension install` fail.

Sources:
[Using GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions),
[Creating GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions).

## 2 — Why interpreted Node is interesting

Node-based extensions are a *subtype of interpreted extensions*
([source](https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions)).
The docs do not carve out Node as its own category, but an interpreted script
with a `#!/usr/bin/env node` shebang and `chmod +x` is a first-class extension
the moment the user has Node on their PATH.

For this workshop that matters because:

- **No compile step.** Edit the script, re-run — exactly like a bash hook.
- **Shells out to other `gh` commands.** `gh api` (REST/GraphQL, auth via
  `gh auth`) and `gh models run <model> "<prompt>"` (a first-party extension
  from the [GitHub Models](https://docs.github.com/en/github-models) catalog).
  That is how we get "LLM-powered hook" behavior without writing auth code.
- **Portable.** No release pipeline, no per-OS binaries — everyone with
  Node ≥ 20 on PATH runs the same script.

> ⚠️ **Accuracy flag.** There is no documented first-party "Copilot API" surface
> for arbitrary extensions. If you need an LLM call from an extension, the
> documented paths are `gh models` or MCP. Do not teach an undocumented Copilot
> chat endpoint here.

## 3 — Hands-on: scaffold, install, run `gh clab`

### 3.1 Scaffold a new extension

From anywhere on your filesystem (the extension is **not** part of this repo's
build — it is installed into your `gh` user profile):

```bash
cd /tmp   # or any workspace of your choice
gh extension create clab        # interactive: choose "Script (Bash)"
cd gh-clab
```

`gh extension create clab` creates a `gh-clab/` directory (note the `gh-`
prefix) with a bash entrypoint named `gh-clab`.

### 3.2 Replace the entrypoint with Node

The reference implementation is in
[`solutions/lab-gh-extensions/gh-clab/gh-clab`](../solutions/lab-gh-extensions/gh-clab/gh-clab)
in this workshop repo. Copy it over the scaffolded bash entrypoint:

```bash
# From inside gh-clab/, with the workshop repo checked out at $WORKSHOP
cp "$WORKSHOP/solutions/lab-gh-extensions/gh-clab/gh-clab" ./gh-clab
cp "$WORKSHOP/solutions/lab-gh-extensions/gh-clab/package.json" ./package.json
chmod +x ./gh-clab
```

The entrypoint is a plain Node script with `#!/usr/bin/env node`. There are no
runtime dependencies outside Node ≥ 20 — it uses `child_process` and the
global `fetch` only.

### 3.3 Install and run

```bash
gh extension install .           # installs the cwd as a local extension
gh extension list | grep gh-clab # confirm it loaded

# Exercise the mock path — no credentials required
gh clab --mock

# If you have access, try the primary path:
gh extension install github/gh-models
gh clab
```

Expected: a 12-bullet structured changelog, grouped Added / Changed / Fixed /
Removed, summarizing your working-tree diff.

### 3.4 How the three modes are picked

Selection logic lives in `pickMode()` in the script and is kept under 30 lines:

```js
function pickMode(argv) {
  if (argv.includes('--mock') || process.env.GH_CLAB_MOCK === '1') return 'mock';
  if (ghModelsAvailable()) return 'gh-models';
  if (process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY) return 'openai';
  return 'mock';
}
```

Any mode failure (network error, quota, etc.) is caught and falls back to the
mock output so the extension never leaves the terminal in a broken state.

## 4 — "Hook-like" pattern: trigger from a git pre-commit hook

> This is a **git** hook (local `.git/hooks/pre-commit`), **not** a Copilot CLI
> hook. Copilot CLI hooks (`preToolUse`, `postToolUse`, `userPromptSubmitted`,
> `sessionStart`, `errorOccurred`) are a different surface and are covered in
> [`lab06.md`](lab06.md) and in the Copilot CLI extensions lab. Do not conflate
> the two.

Wire `gh clab` into your repo's local pre-commit hook so every commit gets an
auto-summarized changelog appended to the commit message template:

```bash
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
# Run gh clab in mock mode by default so the hook never blocks on network.
MODE_FLAG="${GH_CLAB_HOOK_MODE:---mock}"
gh clab "$MODE_FLAG" --allow-empty > .git/CLAB_SUMMARY.md || true
echo "[pre-commit] gh clab summary written to .git/CLAB_SUMMARY.md"
HOOK
chmod +x .git/hooks/pre-commit
```

Flip `GH_CLAB_HOOK_MODE=` (empty) in your shell to let the hook use the
auto-selected live mode instead of forcing `--mock`. The hook is intentionally
**non-blocking** (`|| true`) — a commit never fails because the LLM did.

## 5 — Distribution

Two distribution paths matter in production; only the first is in scope for
this lab.

**Local install (what you just did).** `gh extension install .` is perfect for
internal tools, prototypes, and this workshop. The extension stays on your
laptop; no release needed.

**Tagged release.** `gh extension install owner/repo` pulls the latest tag from
a GitHub repository whose name starts with `gh-`. For **precompiled**
extensions the release must attach binaries following the documented naming
scheme:

```
gh-<name>-<os>-<arch>[.exe]
```

e.g. `gh-clab-linux-amd64`, `gh-clab-darwin-arm64`, `gh-clab-windows-amd64.exe`.
The `gh` CLI selects the matching asset at install time.

Interpreted extensions (this lab) do **not** need release binaries — the
shebang'd script at repo root is enough, and `gh extension upgrade` just
pulls the updated script.

Source:
[Creating GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions).

## 6 — Accuracy sidebar: three things that sound alike, aren't

The word "extension" is overloaded across the GitHub + Copilot surface. Do not
conflate these three:

| Surface                  | Managed by                                                     | Where it runs                        | Canonical docs                                                                 |
|--------------------------|----------------------------------------------------------------|--------------------------------------|--------------------------------------------------------------------------------|
| **`gh extension`** (this lab) | `gh` CLI — `gh extension install/list/upgrade/remove`           | External process, invoked by `gh`    | [docs.github.com/en/github-cli/github-cli/using-github-cli-extensions](https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions) |
| **Copilot CLI extensions** | Copilot CLI runtime via `extensions_manage` / `extensions_reload` | *Inside* the Copilot CLI agent process | [`labs/lab-copilot-cli-extensions.md`](lab-copilot-cli-extensions.md) (workshop lab) |
| **`gh-aw`** (Agentic Workflows) | Installed as a `gh` extension (`gh extension install githubnext/gh-aw`) but a separate product | Compiles markdown → GitHub Actions YAML that runs in CI | Repo only — **no canonical `docs.github.com` page.** Source: <https://github.com/githubnext/gh-aw> |

Key takeaways:

- This lab teaches `gh extension` — an external binary/script invoked by `gh`.
- Copilot CLI extensions are **in-process** JS/TS modules that expose tools to
  the Copilot agent. Different runtime, different authoring model. Treat them
  as siblings, not variants.
- `gh-aw` uses `gh extension` only as a *delivery mechanism*. It is orthogonal
  to Copilot CLI and has no documented integration with `~/.copilot/*`. Because
  `gh-aw` docs live outside `docs.github.com`, treat any `gh-aw` claim in a
  workshop as "verify against the repo README."

## References

- Using GitHub CLI extensions — <https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions>
- Creating GitHub CLI extensions — <https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions>
- GitHub Models — <https://docs.github.com/en/github-models>
- `gh-models` source — <https://github.com/github/gh-models>
- `gh-aw` source — <https://github.com/githubnext/gh-aw>
