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
calling an LLM. You will explore its three runtime modes (`gh models`, OpenAI,
mock — the first is retired, see §3.4), wire it into a git `pre-commit` hook in a
disposable demo repository, and learn how the official distribution model works.

Reference solution: [`solutions/lab-gh-extensions/gh-clab/`](../solutions/lab-gh-extensions/gh-clab/README.md).

> 🧭 **Track appendices** — stack-specific completion notes live in
> [`labs/appendices/dotnet/lab-gh-extensions.md`](appendices/dotnet/lab-gh-extensions.md) and
> [`labs/appendices/node/lab-gh-extensions.md`](appendices/node/lab-gh-extensions.md).

> 🧭 **Which "extension" is this?** This lab is about a **`gh extension`**: a
> script named `gh-<name>` that the GitHub CLI runs as `gh <name>`. It is **not**
> a Copilot CLI extension (a different mechanism — compared in §6 and taught in
> [`lab-copilot-cli-extensions.md`](lab-copilot-cli-extensions.md)) and it is not
> `gh-aw`. Nothing in the exercise needs Copilot CLI itself, so ignore plugins,
> skills, MCP servers and `/fleet` for now. Two warnings up front: the `--mock`
> path needs **no credentials**, and the GitHub Models service that `gh clab`'s
> first mode calls was **retired** on July 30, 2026
> ([changelog](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/));
> §3.4 shows what runs instead.

## Before you start (intermediate)

This lab is **intermediate** and runs in a terminal. It assumes you already use Git
(commits, `git diff`, the idea of a hook) and can read a short Node script. It does
not assume any Copilot CLI experience, and the core route needs no API key.

- **Shell.** Use a Bash-compatible shell: a macOS or Linux terminal, **WSL**, or
  **Git Bash** on Windows — not PowerShell, because the blocks use Bash syntax such
  as `export`, `mktemp` and `<<'HOOK'` heredocs. Open **one** shell and run every
  `bash` block in it, in order: later blocks reuse variables and the folder that
  earlier blocks set.
- **Tools, in that shell.** `gh`, `git` and Node.js **20 or newer**.
- **Authentication.** `gh` must already be logged in. The lab never asks you to
  paste a token.
- **Commit identity.** `gh extension create` (§3.1) makes a first commit, so Git
  must already know your name and email outside this repository; without them it
  stops with an "initial commit" error. (§4 sets its own identity inside its
  throwaway repository.) The check below prints both, or says which one is
  missing; set a missing one once with `git config --global` — ordinary Git setup
  that Cleanup does not undo.
- **The workshop checkout.** Open the shell inside your clone of this repository.
  §3.1 records its location, and §3.2 copies the reference script from it.

Check the tools, your login and your Git identity:

```bash
gh --version
git --version
node --version                    # must be v20 or newer
gh auth status                    # must show you are logged in; if not, run: gh auth login
git config --global user.name  || echo "user.name is NOT set - see Commit identity above"
git config --global user.email || echo "user.email is NOT set - see Commit identity above"
```

**Timed route.** The declared pace — 12 minutes presenter-led, 30 self-paced —
covers the mock-first **core route** only: this section, §1 (read), §3.1–§3.4 with
`--mock`, §4 in the demo repository, then the lab-owned cleanup. It assumes the
check above passes first time; allow extra time if you must install a tool, log in
or set a Git identity. A presenter covers the same route with §1, one
`gh clab --mock` demonstration and one demo-repository commit. Anything labelled
**Optional** — the §3.3 live run, the Copilot CLI currency block below, the §4
PR-diff sidebar, the §5 precompiled-release details and the §6 `gh-aw` row — is not
on the timed route; do it or read it after the lab.

<details>
<summary>Optional reference — Copilot CLI currency (2026 refresh)</summary>

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (GA June 23, 2026):** `/plugin`, `/mcp`, and
> `/skills` are real interactive commands backed by an in-terminal dashboard —
> you can discover, install, and configure plugins, MCP servers, and skills
> without hand-editing config files. The terminal also gained tabs for
> browsing issues/PRs/gists. Config-file editing still works and is what the
> underlying `extensions_manage` MCP tool inspects, but the dashboard is now
> the primary interactive path for a human at the prompt.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` (or the `/plugin` dashboard) | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto` to let Copilot choose) | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. The tier names are registry keys, not `/model` arguments. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to switch modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

</details>

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
- **Shells out to other `gh` commands.** `gh api` (REST/GraphQL) reuses the
  login you already did with `gh auth`, so there is no auth code to write. The
  reference script also shells out to `gh models run <model> "<prompt>"` (the
  `github/gh-models` extension) — but GitHub Models is retired, so see §3.4 for
  what actually runs today.
- **Portable.** No release pipeline, no per-OS binaries — everyone with
  Node ≥ 20 on PATH runs the same script.

> ⚠️ **Accuracy flag.** There is no documented first-party "Copilot API" surface
> for arbitrary extensions. If you need an LLM call from an extension, call a
> model provider you hold a key for (this lab's script uses the OpenAI or Azure
> OpenAI chat-completions API) or use MCP. `gh models` used to be the first-party
> path, but GitHub Models is retired. Do not teach an undocumented Copilot chat
> endpoint here.

## 3 — Hands-on: scaffold, install, run `gh clab`

### 3.1 Scaffold a new extension

The extension is **not** part of this repo's build — it is installed into your
`gh` user profile — so you scaffold it **outside** the workshop checkout. Before
you leave the checkout, record where it is as an absolute path and confirm the
reference script is there (§3.2 copies it from `$WORKSHOP`). Run this block from
inside the workshop checkout:

```bash
WORKSHOP="$(git rev-parse --show-toplevel)"
ls "$WORKSHOP/solutions/lab-gh-extensions/gh-clab/gh-clab"   # must print that path
```

If `ls` says "No such file or directory", you are not inside the workshop checkout:
`cd` into your clone and run the block again. Run it again in any **new** shell
before §3.2, too. Now scaffold from any other folder:

```bash
cd /tmp   # or any workspace of your choice
if [ -e gh-clab ] || gh extension list | grep -q 'gh clab'; then
  echo "Stop: gh-clab already exists in $PWD or in gh extension list. Move or remove it before running this lab." >&2
else
  # non-interactive; creates a bash script extension by default
  gh extension create clab && cd gh-clab && SCAFFOLD="$PWD"   # remember this folder for the Cleanup section
fi
```

`gh extension create clab` creates a `gh-clab/` directory (note the `gh-`
prefix) with a bash entrypoint named `gh-clab`. The command is **not**
interactive in current `gh` versions — it scaffolds a bash script by default.
For a Go project use `--precompiled=go`; for any other language use
`--precompiled=other` and supply your own `script/build.sh`.

`gh extension create` also runs `git init` and makes an initial commit inside
`gh-clab/`, so the scaffold is its own small git repository — outside this
workshop repo, but not outside every repository.

### 3.2 Replace the entrypoint with Node

The reference implementation is in
[`solutions/lab-gh-extensions/gh-clab/gh-clab`](../solutions/lab-gh-extensions/gh-clab/gh-clab)
in this workshop repo. Copy it over the scaffolded bash entrypoint:

```bash
# From inside gh-clab/ (where §3.1 left you); $WORKSHOP is the absolute path set in §3.1
: "${WORKSHOP:?run the WORKSHOP block from section 3.1 first}"
: "${SCAFFOLD:?run the scaffold block from section 3.1 first}" && cd "$SCAFFOLD"
cp "$WORKSHOP/solutions/lab-gh-extensions/gh-clab/gh-clab" ./gh-clab
cp "$WORKSHOP/solutions/lab-gh-extensions/gh-clab/package.json" ./package.json
chmod +x ./gh-clab
```

The entrypoint is a plain Node script with `#!/usr/bin/env node`. There are no
runtime dependencies outside Node ≥ 20 — it uses `child_process` and the
global `fetch` only.

### 3.3 Install and run

```bash
gh extension install . && CLAB_INSTALLED=1   # installs the cwd as a local extension; records that this lab owns it
gh extension list | grep clab || echo "gh clab is NOT installed - re-run the line above"
# A line starting "gh clab" means it loaded; the echo only runs when grep finds nothing.

# Exercise the mock path — no credentials required
gh clab --mock
```

> ⚠️ **Local install is a symlink, not a copy.** `gh extension install .`
> symlinks the current directory into `~/.local/share/gh/extensions/gh-clab/`
> (Linux/macOS) or the equivalent under `%LOCALAPPDATA%` on Windows. If you
> install from a directory inside a git repo, then `git checkout <other-branch>`
> or `git stash` — the **installed extension silently changes** because the
> symlink follows the working tree. This lab avoids the footgun by scaffolding
> in `/tmp/gh-clab/` (outside the workshop repo — `gh extension create` gives
> that folder a small git repository of its own, so do not switch branches
> inside it either); if you instead install from
> `$WORKSHOP/solutions/lab-gh-extensions/gh-clab`, branch switches in the
> workshop repo will mutate the live extension. Use `gh extension remove gh-clab`
> + reinstall, or copy to a stable path, to avoid surprises.

> 🔐 **Do not install `github/gh-models` for this lab.** GitHub Models is retired
> (see §3.4), so the extension cannot produce a live changelog —
> and while it is installed, `gh clab` picks it first, fails, and falls back to
> mock output without ever trying your OpenAI key. The `--mock` path works
> without any credentials; use an OpenAI or Azure OpenAI key for a live run.

Expected from `gh clab --mock`: a short canned changelog — one bullet each under
**Added** and **Changed**, and `- N/A` under **Fixed** and **Removed** (4 bullets
in all). It is identical on every run and is **not** derived from your diff. A
live run asks the model to summarize your working-tree diff into the same four
groups in "under 12 bullets". `gh clab` needs a non-empty diff of tracked files
against `HEAD`: in the scaffold from §3.2 your replaced entrypoint is that diff,
and on a clean tree it exits with an error unless you pass `--allow-empty`.

**Optional live run** — not on the timed route; skip it if you have no key. In this
shell, export your own key (`export OPENAI_API_KEY=` followed by the key; an Azure
OpenAI key plus its endpoint and deployment variables also works, see §3.4) and make
sure `github/gh-models` is **not** installed (GitHub Models is retired). Then run
`gh clab` **without** `--mock`. A live run sends the diff it summarizes to the
provider, so use it only on changes you are free to share. If stderr prints
`gh clab: falling back to mock output.` the live call failed — the line above it
says why — and what you see is the canned mock changelog again.

### 3.4 How the three modes are picked

`gh clab` has **three** runtime modes: `gh models`, OpenAI and mock. The `--mock`
path is the "no credentials" path — every section of this lab is exercisable with
zero secrets. An explicit mock request is checked **first** and overrides
everything: `--mock` or `GH_CLAB_MOCK=1` selects mock mode even when `gh models`
or an API key is available. Only when you have not asked for mock does the
extension pick a mode for you, in this priority order:

| Priority | Mode        | Trigger                                                                             | Network? |
|----------|-------------|-------------------------------------------------------------------------------------|----------|
| 1        | `gh models` | `gh` on PATH and `github/gh-models` installed. **Retired** — see the note below.    | Attempted; fails |
| 2        | OpenAI      | `OPENAI_API_KEY` set, **or** `AZURE_OPENAI_API_KEY` set. Azure also needs `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_DEPLOYMENT`, but only when the request is built. | Yes      |
| 3        | Mock        | Neither of the above is available (automatic fallback). Canned, deterministic.      | No       |

An `AZURE_OPENAI_API_KEY` alone is enough to select OpenAI mode, even without the
endpoint and deployment variables; building the request then fails and `gh clab`
falls back to the mock output.

> ⚠️ **GitHub Models is retired.** GitHub retired GitHub Models on July 30, 2026:
> the inference API, playground, catalog and bring-your-own-key are no longer
> available to any customer
> ([changelog](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)).
> Priority 1 stays in the table because the script still looks for the
> `github/gh-models` extension, but installing it does not bring the service back.
> If that mode is selected its call fails and `gh clab` falls back to the **mock**
> output — it does not go on to try your OpenAI key (`pickMode()` below shows
> why). If `gh extension list` shows `github/gh-models` (for example from an
> earlier run of this lab), remove it with `gh extension remove gh-models` before
> a live run.

For a live run you need an OpenAI or Azure OpenAI key. With no key, **skip
straight to the mock path** (`gh clab --mock`) — every section of this lab still
works.

The selection logic lives in `pickMode()` in the script and is kept under 30 lines:

```js
function pickMode(argv) {
  if (argv.includes('--mock') || process.env.GH_CLAB_MOCK === '1') return 'mock';
  if (ghModelsAvailable()) return 'gh-models';
  if (process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY) return 'openai';
  return 'mock';
}
```

Any mode failure (network error, quota, a retired service, etc.) is caught and
falls back to the **mock** output — not to the next mode in the list — so the
extension never leaves the terminal in a broken state. `ghModelsAvailable()`
only checks that `github/gh-models` is *installed*, not that the service works,
which is why an installed `gh models` blocks the OpenAI row.

## 4 — "Hook-like" pattern: trigger from a git pre-commit hook

> This is a **git** hook (local `.git/hooks/pre-commit`), **not** a Copilot CLI
> hook. Copilot CLI hooks are a different surface and are covered in
> [`lab06.md`](lab06.md) and in the Copilot CLI extensions lab. Do not conflate
> the two.

> ⚠️ **Never overwrite a hook you already have — and hooks are shared across
> worktrees.** If a `pre-commit` hook already exists (husky, lefthook, the
> `pre-commit` framework, or this repo's own
> `scripts/hooks/pre-commit-strip-notebook-outputs.sh` once wired up), writing the
> file replaces it silently. So this lab never asks you to touch an existing hook:
> you will use a **disposable demo repository** that has none (merging a real
> project's hook is a different job and is not part of this lab). Git keeps hooks
> in the repository's *common* git directory, so one hook applies to **every
> worktree** — a hook written from a throwaway worktree is also armed in your
> main checkout and in any other worktree. And inside a linked worktree `.git` is
> a **file** (a pointer to the real git directory), not a directory, so a literal
> `.git/hooks/pre-commit` path does not resolve there. Ask git where the hook
> belongs: `git rev-parse --git-path hooks/pre-commit`.

Wire `gh clab` into a pre-commit hook so every commit refreshes a changelog
summary file. The hook only writes that file and prints a one-line notice — it
does **not** edit your commit message, so read the summary or paste it into your
message yourself. You will do it in a throwaway repository, in three steps: make
a hook-free demo repository (4.1), install the hook (4.2), then commit once and
check the result (4.3).

### 4.1 Make a hook-free demo repository

Do the hands-on part in a **disposable repository** that has no hooks — not in the
workshop checkout, and not in a project you care about. This block creates one
under your temp directory, gives it a throwaway identity and its own hooks folder
(so a global `core.hooksPath` or Git template cannot send your hook somewhere
shared), and makes a first commit so `HEAD` exists:

```bash
DEMO_REPO="$(mktemp -d "${TMPDIR:-/tmp}/clab-demo.XXXXXX")" && cd "$DEMO_REPO" &&
git init -q --template= &&
git config core.hooksPath "$DEMO_REPO/.git/hooks" &&
git config user.name "clab demo" &&
git config user.email "clab-demo@example.invalid" &&
git config commit.gpgsign false &&
echo v1 > notes.txt &&
git add notes.txt &&            # on Windows a harmless "LF will be replaced by CRLF" warning may print
git commit -q -m "demo: first commit" || echo "Demo repo setup failed - fix the error above before continuing" >&2
```

### 4.2 Install the hook

The snippet refuses to overwrite an existing hook and writes to whatever path
`git rev-parse --git-path` reports. Run it **in the demo repository**:

```bash
# Run this in the demo repository from 4.1 (pwd ends in clab-demo.XXXXXX)
hook="$(git rev-parse --git-path hooks/pre-commit)"
if [ -e "$hook" ]; then
  echo "A pre-commit hook already exists at $hook - back it up, or better: use the hook-free demo repo from 4.1." >&2
else
  mkdir -p "$(dirname "$hook")"
  cat > "$hook" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
# Run gh clab in mock mode by default so the hook never blocks on network.
MODE_FLAG="${GH_CLAB_HOOK_MODE:---mock}"
# Resolve the summary path when the hook runs: inside a worktree .git is a file.
SUMMARY="$(git rev-parse --git-path CLAB_SUMMARY.md)"
gh clab "$MODE_FLAG" --allow-empty > "$SUMMARY" || true
echo "[pre-commit] gh clab summary written to $SUMMARY"
HOOK
  chmod +x "$hook"
fi
```

`git rev-parse --git-path CLAB_SUMMARY.md` prints where the summary lands:
`.git/CLAB_SUMMARY.md` in a normal checkout, and a file inside that worktree's own
metadata directory in a linked worktree. The hook is shared by every worktree;
the summary file is not.

By default the hook forces `--mock`, so it never blocks a commit on the network
or spends tokens. The `:-` in `${GH_CLAB_HOOK_MODE:---mock}` substitutes `--mock`
when the variable is unset **or empty**, so setting `GH_CLAB_HOOK_MODE=` to an
empty value does *not* switch to live mode. To let `gh clab` pick a live
provider, set a **non-empty** value, for example `export GH_CLAB_HOOK_MODE=--live`:
`gh clab` only recognizes `--mock` and `--allow-empty` and ignores any other
argument, so `--live` is just a readable placeholder that stops the hook from
forcing mock. Live mode then follows §3.4 — OpenAI or Azure OpenAI if a key is
set, otherwise the mock fallback — and it sends each commit's diff to that
provider. The hook is intentionally **non-blocking**
(`|| true`) — a commit never fails because the LLM did.

**Checkpoint.** A successful install prints nothing. If the block printed "A pre-commit
hook already exists at …" instead, this run wrote nothing. That is expected if you
already installed the hook in this demo repository. If you did not, you ran the block
in some other repository that already has a hook: do 4.1 if you have not yet,
`cd "$DEMO_REPO"`, and run the block again. Start 4.3 only once the demo repository
has the hook.

### 4.3 Prove the wiring (mock only)

Make a change and commit it — the commit is what triggers the hook. The hook
forces `--mock` by default, so this needs no credentials. Run it in the demo
repository, with `gh clab` already installed from §3.3:

```bash
unset GH_CLAB_HOOK_MODE         # use the hook's default, --mock
echo v2 >> notes.txt
git add notes.txt
git commit -q -m "demo: trigger the hook"
```

Expected: the hook prints one notice line while the commit runs. The path in it is
whatever `git rev-parse --git-path CLAB_SUMMARY.md` reports — in this demo
repository, `.git/CLAB_SUMMARY.md`:

```text
[pre-commit] gh clab summary written to .git/CLAB_SUMMARY.md
```

Now read the summary the hook wrote:

```bash
cat "$(git rev-parse --git-path CLAB_SUMMARY.md)"
```

Expected: the canned mock changelog from §3.3 — a `## Changelog (mock)` line, then
the headings `### Added`, `### Changed`, `### Fixed` and `### Removed`, each with its
bullet.

- **No notice line?** The hook did not run. Re-run 4.2 and check that `pwd` prints
  your demo repository.
- **Notice, but an empty summary?** `gh clab` is not installed for this `gh`: redo
  §3.3 and commit again. The hook swallows that error on purpose (`|| true`).

This proves the hook is wired: `git commit` ran it and `gh clab --mock` produced the
file. It does **not** show how good a live summary is — mock output is canned,
identical on every run and not derived from your diff.

> 💡 **Optional reference — reviewing PR diffs? Cap the input yourself.** (Not on
> the timed route: skip it on a first read.) Large diffs can exceed a
> model's input window and then get truncated mid-hunk or rejected, so decide
> where the cut happens instead of letting the model do it. `gh clab` does not
> read pull requests or standard input: it always summarizes
> `git diff --no-color HEAD` and keeps the first 60,000 *characters* (UTF-16 code
> units — not bytes) of it. To apply the same idea to a diff you feed to your own
> summarizer, cap it with `head -c`, which counts bytes:
>
> ```bash
> # The working-tree diff gh clab reads, cut to 60000 bytes; wc -c shows the size
> git diff HEAD | head -c 60000 | wc -c
> ```
>
> To cap a pull-request diff the same way before it reaches your own tool, pipe
> `gh pr diff <pr-number> --patch` through `head -c 60000` (this lab does not run
> it).
>
> `60000` is an example cap, not a published limit: choose and tune it for the
> model you use. A byte cut can land mid-hunk or mid-character, and non-ASCII text
> takes more bytes than characters. For an exhaustive review, paginate by file
> path (`gh pr diff --name-only` → loop) instead of raising the cap.

## 5 — Distribution

Two distribution paths matter in production; only the first is in scope for
this lab.

**Local install (what you just did).** `gh extension install .` is perfect for
internal tools, prototypes, and this workshop. The extension stays on your
laptop; no release needed.

**Remote install.** `gh extension install owner/repo` installs from a GitHub
repository whose name starts with `gh-`, and what you get depends on the
extension type. Interpreted extensions (this lab) do **not** need release
binaries — the shebang'd script at repo root is enough. Installed without
`--pin`, `gh` clones the repository's **default branch**; it does not check out
the latest tag. Pass `--pin <ref>` to choose a specific version instead
(`gh extension install --help` describes it as a tag for precompiled extensions
and a commit for interpreted ones). `gh extension upgrade` just pulls the updated
script.

<details>
<summary>Optional reference — precompiled extensions and release assets</summary>

A **precompiled** extension installs its latest applicable release, and that
release must attach binaries following the documented naming scheme:

```text
gh-<name>-<os>-<arch>[.exe]
```

e.g. `gh-clab-linux-amd64`, `gh-clab-darwin-arm64`, `gh-clab-windows-amd64.exe`.
The `gh` CLI selects the matching asset at install time.

</details>

Source:
[Creating GitHub CLI extensions](https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions).

## 6 — Accuracy sidebar: three things that sound alike, aren't

The word "extension" is overloaded across the GitHub + Copilot surface. Do not
conflate these three. The first two rows are the core comparison; the `gh-aw` row
and its takeaway are **optional reference** — read them after the lab.

| Surface                  | Managed by                                                     | Where it runs                        | Canonical docs                                                                 |
|--------------------------|----------------------------------------------------------------|--------------------------------------|--------------------------------------------------------------------------------|
| **`gh extension`** (this lab) | `gh` CLI — `gh extension install/list/upgrade/remove`           | External process, invoked by `gh`    | [docs.github.com/en/github-cli/github-cli/using-github-cli-extensions](https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions) |
| **Copilot CLI extensions** | Copilot CLI runtime via `extensions_manage` / `extensions_reload` | A separate Node.js process forked by the Copilot CLI, talking to it over JSON-RPC on stdio | [`labs/lab-copilot-cli-extensions.md`](lab-copilot-cli-extensions.md) (workshop lab) |
| **`gh-aw`** (Agentic Workflows) | Installed as a `gh` extension from `github/gh-aw`, pinned to the registry's `gh_aw_schema_version` ([`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml); [Lab 08](lab08.md) has the exact install commands) — but a separate product | Compiles markdown → GitHub Actions YAML that runs in CI, using Copilot CLI as its default engine | [github.github.com/gh-aw](https://github.github.com/gh-aw/) (its own docs site). Source: <https://github.com/github/gh-aw> |

Key takeaways:

- This lab teaches `gh extension` — an external binary/script invoked by `gh`.
- Copilot CLI extensions are JS/TS modules that run as **separate forked Node.js
  processes** and expose tools to the Copilot agent over JSON-RPC on stdio — they
  are not loaded into the agent's own process. Different runtime, different
  authoring model. Treat them as siblings, not variants.
- **Optional reference —** `gh-aw` uses `gh extension` as its *delivery
  mechanism* but is a separate product, and it does connect to Copilot CLI:
  Copilot CLI is its
  [default engine](https://github.github.com/gh-aw/reference/engines/), and this
  repo's generated workflows (`.github/workflows/*.lock.yml`) write
  `$HOME/.copilot/settings.json` and point Copilot CLI at
  `$HOME/.copilot/mcp-config.json` on the CI runner. Pin `gh-aw` to the
  `gh_aw_schema_version` in the registry, as [Lab 08](lab08.md) does, so
  recompiling does not rewrite those lock files with a different compiler. Check
  `gh-aw` claims against its own docs site, not `docs.github.com`.

## References

- Using GitHub CLI extensions — <https://docs.github.com/en/github-cli/github-cli/using-github-cli-extensions>
- Creating GitHub CLI extensions — <https://docs.github.com/en/github-cli/github-cli/creating-github-cli-extensions>
- GitHub Models retirement notice — <https://github.blog/changelog/2026-07-30-github-models-is-now-retired/>
- `gh-aw` documentation — <https://github.github.com/gh-aw/>
- `gh-aw` source — <https://github.com/github/gh-aw>

## Cleanup

### Undo this lab's own changes first

The shared checklist below says per-lab specifics should already be reverted, and a
clean `git status` does not prove that: the extension lives in your `gh` profile and
the hook lives in Git metadata. So first undo what *this* lab created, in the shell
you used above. Nothing here edits your global Git config or any hook you had
before, and every command exits 0 whether or not there was anything to undo:

```bash
# 1. Step out of the folders you are about to delete.
cd "${WORKSHOP:-$HOME}"

# 2. Uninstall the extension (it lives in your gh profile, not in this repo).
#    If the last line prints a "gh clab" row instead of "confirmed", the removal failed.
if [ "${CLAB_INSTALLED:-}" = "1" ] && gh extension list | grep -q 'gh clab'; then gh extension remove gh-clab; else echo "this lab did not install gh-clab: nothing to remove"; fi
gh extension list | grep 'gh clab' || echo "confirmed: gh clab is gone from the extension list"

# 3. Delete the demo repo from section 4 - its hook and CLAB_SUMMARY.md go with it.
case "${DEMO_REPO:-}" in
  */clab-demo.*) rm -rf "$DEMO_REPO" && echo "removed $DEMO_REPO" ;;
  *) echo "DEMO_REPO is not set: delete the clab-demo.* folder from section 4 by hand" ;;
esac

# 4. Delete the scaffold from section 3.1 (it was its own throwaway git repository).
case "${SCAFFOLD:-}" in
  */gh-clab) rm -rf "$SCAFFOLD" && echo "removed $SCAFFOLD" ;;
  *) echo "SCAFFOLD is not set: delete the gh-clab/ folder from section 3.1 by hand" ;;
esac

# 5. Forget this lab's shell variables (OPENAI_API_KEY only matters if you exported it in 3.3).
unset WORKSHOP DEMO_REPO SCAFFOLD CLAB_INSTALLED GH_CLAB_HOOK_MODE OPENAI_API_KEY
```

Two things this block deliberately leaves alone:

- **`github/gh-models`.** This lab never installs it. If it appears in
  `gh extension list`, remove it (`gh extension remove gh-models`) only if *you*
  installed it; if it was there before the lab, it is not yours to remove.
- **Any hook outside the demo repo.** If you wrote the hook into some other
  repository (you should not have), undo only that: from inside that repo, delete
  the file that `git rev-parse --git-path hooks/pre-commit` prints **only if its
  body calls `gh clab`**, and delete the `CLAB_SUMMARY.md` that
  `git rev-parse --git-path CLAB_SUMMARY.md` prints. Leave every other hook, and
  every `core.hooksPath` setting, as it was.

Then continue with the shared checklist. A few of its probes — `ls … 2>/dev/null`,
`git config --get core.hooksPath` and the `[ -f … ] && mv …` restore — exit non-zero
when there is nothing to find or restore. That is the expected "nothing to clean"
result, not a failure.

<!-- @include docs/_partials/cleanup.md — do not edit inline; edit the partial and re-sync. -->
> 🧹 **Cleanup — leave the machine the way you found it.**
> Run this checklist before moving to the next lab. Per-lab specifics (named
> agent / hook / extension files this lab created) should already have been
> reverted in the steps above; this is the generic sweep that catches the
> long-tail.

🖥️ **In your terminal:**

1. **Stop background processes.** Anything you started in the foreground with
   `&` or in another tmux pane (dev servers, watchers, `gh aw` long-runs,
   tail-follows). If you used the bash tool in async mode, make sure those
   shells are stopped.

   **WSL/Bash:**
   ```bash
   jobs -l                       # any background jobs in this shell?
   # kill them by PID — never `pkill`/`killall`
   ```

   **PowerShell:**
   ```powershell
   Get-Job                       # any background jobs?
   Get-Job | Stop-Job; Get-Job | Remove-Job
   ```

2. **Restore Copilot CLI config if you mutated it.** Some labs ask you to
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json`. If you stashed the original, restore it now.
   If you edited in place without backing up, check `git status` in the lab
   repo (workspace configs) and revert anything you didn't mean to keep.

   **WSL/Bash:**
   ```bash
   # If you saved a backup like ~/.copilot/config.json.bak:
   [ -f ~/.copilot/config.json.bak ] && mv ~/.copilot/config.json.bak ~/.copilot/config.json
   ```

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** These directories accumulate
   across labs and are safe to clean once you've finished:

   ```bash
   # Per-session scratch (safe to inspect; delete only what this lab created):
   ls ~/.copilot/lessons/        2>/dev/null
   ls node/.a2a/                  2>/dev/null
   ls node/.a2a-transcript-*.md   2>/dev/null
   ls .git/CLAB_SUMMARY.md        2>/dev/null
   ```

   Delete only files that this lab created. Do not blanket-delete
   `~/.copilot/lessons/` if other sessions wrote to it.

5. **Revert any `core.hooksPath` or other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise.

   ```bash
   git config --get core.hooksPath
   # if set to a lab path, unset:
   git config --unset core.hooksPath
   ```

6. **Confirm working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Any unexpected files (untracked agents, hooks, extensions, scratch
   notebooks) should be removed or moved out of the repo before continuing.

7. **Verify build is still green.** Optional but recommended after labs that
   touched hooks, agents, or skills:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept) and the build is clean, you're ready for the next lab.
<!-- @end-include docs/_partials/cleanup.md -->
