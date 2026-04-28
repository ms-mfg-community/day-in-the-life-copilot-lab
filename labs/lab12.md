---
title: "Fabric MCP with Copilot CLI & VS Code"
lab_number: 12
pace:
  presenter_minutes: 8
  self_paced_minutes: 30
registry: docs/_meta/registry.yaml
---

# 12 — Fabric MCP with Copilot CLI & VS Code

In this lab you will wire **Microsoft Fabric** into Copilot, enumerate
lakehouses from the CLI, run a notebook cell, and refactor a notebook in
VS Code with inline chat and agent mode — all while keeping secrets out
of source control.

> ⏱️ Presenter pace: 8 minutes | Self-paced: 30 minutes

> 🛤️ **Choose your path** before you start:
>
> - **Live Fabric path** — you have a Fabric workspace and can mint a token
>   with `az account get-access-token`. You'll talk to a real lakehouse.
> - **Offline simulator path** — Codespaces / no-Fabric-tenant learners.
>   You'll run every step against a local **Parquet fixture** that mimics
>   a Fabric lakehouse query result. No auth needed.
>
> Both paths reach the same learning outcomes. The live path is preferred
> when available because Part B (VS Code agent mode) is markedly richer
> against a real notebook host.

References:

- [Fabric MCP server config (CLI)](../mcp-configs/copilot-cli/individual/fabric.json)
- [Fabric MCP server config (VS Code)](../mcp-configs/vscode/individual/fabric.json)
- [`scripts/hooks/pre-commit-strip-notebook-outputs.sh`](../scripts/hooks/pre-commit-strip-notebook-outputs.sh)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — MCP version pins
- [Microsoft Fabric REST API](https://learn.microsoft.com/rest/api/fabric/articles/) (Microsoft Learn)
- [Papermill parameterised notebooks](https://papermill.readthedocs.io/en/latest/)

---

## Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh. Versions, model tiers, and MCP server pins live in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — labs reference
> the registry rather than hardcoding values, so a single registry update
> propagates everywhere.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `Shift+Tab` toggles plan mode; autopilot mode is the default | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. |
| **Local tool discovery** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | Discovering which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Note: `extensions_manage` is an MCP tool, **not** a slash command — invoke it via the MCP surface, not via `/extensions_manage`. |
<!-- @end-include docs/_partials/currency.md -->

## 12.0 Why a separate Fabric MCP?

Fabric exposes lakehouses, notebooks, pipelines, and SQL endpoints behind a
single REST surface. Wrapping it as an MCP server lets Copilot:

| Capability | What it unlocks |
|------------|-----------------|
| **List workspaces / lakehouses** | "Which lakehouse holds last quarter's sales?" |
| **Read OneLake tables** | KQL-or-SQL-style queries from chat |
| **Trigger notebooks** | "Run the freshness check notebook on the prod workspace" |
| **Inspect notebook cells** | Cell-level edits via inline chat without copy-paste |
| **Pipeline status** | One-shot health summaries across runs |

The shipped configs assume the published `@microsoft/fabric-mcp` server. If
your org pins a different fork (common in regulated tenants), update the
`args` array — everything else in this lab still applies.

---

## 12.1 Prerequisites

> 📎 **Builds on [Lab 11](lab11.md).** Lab 11 introduced the
> "configuration as a product" / plugin-distribution mindset; this lab
> extends the same mindset to the data plane via Fabric MCP. Lab 11
> is not a hard prerequisite, but the packaging instincts carry over.

| Path | Prerequisite |
|------|--------------|
| Live | Azure CLI (`az`) signed in to your Fabric tenant; access to one workspace |
| Live | `node` 20+ (the MCP server is npm-published) |
| Both | `jq` (used by the strip-outputs hook) |
| Regenerate | `python3` 3.11+ with `pandas` and `pyarrow` (only when rebuilding `sales.parquet` via the snippet in §12.2 or `scripts/generate-lab12-fixture.py`) |
| Offline (read) | `python3` 3.11+ with `pandas` (the §A.3 reader snippet uses `pd.read_parquet`); pyarrow is pulled in transitively |
| Both | This repo cloned with the `feature/modernize` (or `main`) branch checked out |

Quick check:

```bash
node --version    # >= v20
jq --version
# Use python3 explicitly — stock Ubuntu 24.04 and macOS ship only `python3`,
# not an unversioned `python` symlink.
python3 -c "import pandas, pyarrow; print('ok')"
```

---

## 12.2 Set up the offline simulator (do this even on the Live path)

Even live-path learners should generate the fixture — Part A's offline
section is a useful smoke test, and demos rarely have reliable Wi-Fi.

```bash
mkdir -p labs/fixtures/lab12
python3 - <<'PY'
import pandas as pd
from pathlib import Path
df = pd.DataFrame({
    "order_id":   [1001, 1002, 1003, 1004, 1005],
    "region":     ["NA",  "EU",  "NA",  "APAC", "EU"],
    "amount_usd": [129.0, 84.5,  220.0, 47.25,  301.10],
    "ts":         pd.to_datetime([
        "2026-01-04", "2026-01-05", "2026-02-12",
        "2026-02-28", "2026-03-15",
    ]),
})
out = Path("labs/fixtures/lab12/sales.parquet")
out.parent.mkdir(parents=True, exist_ok=True)
df.to_parquet(out, index=False)
print(f"wrote {out} ({out.stat().st_size} bytes)")
PY
```

> 🧊 **Why Parquet?** Fabric's OneLake stores Delta Lake (Parquet under the
> hood). A small Parquet file is the closest local analogue to a real
> lakehouse query result, so the offline path teaches the same data-shape
> intuition as the live path.

The canonical `labs/fixtures/lab12/sales.parquet` is **committed** to the
repo (~3 KiB) so the offline path works out of the box — no pandas install
required just to read the lab. Regenerate it any time with the snippet
above or via `python scripts/generate-lab12-fixture.py` (pandas + pyarrow
required only when regenerating). Any *additional* parquet files you drop
into `labs/fixtures/lab12/` while experimenting stay local — see
`.gitignore`.

> 📎 **Parquet binary diff hygiene.** The repo ships a `.gitattributes` rule that marks `*.parquet` as `binary` — `git diff` won't try to render it as text, and `git merge` won't attempt a textual three-way merge. See [§12.5.1](#1251-configure-a-notebook-aware-git-diff) for the full hygiene block (notebooks + parquet) and the test that pins it (`tests/lab-structure/gitattributes-parquet-binary.test.ts`).

---

## Part A — Copilot CLI

### A.1 Wire the MCP entry into your CLI config

Open your Copilot CLI MCP config (`~/.copilot/mcp-config.json`) and merge
in the entry from [`mcp-configs/copilot-cli/individual/fabric.json`](../mcp-configs/copilot-cli/individual/fabric.json):

```json
{
  "mcpServers": {
    "fabric": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@microsoft/fabric-mcp@latest"],
      "tools": ["*"],
      "env": {
        "FABRIC_AUTH_TOKEN":  "${env:FABRIC_AUTH_TOKEN}",
        "FABRIC_TENANT_ID":   "${env:FABRIC_TENANT_ID}",
        "FABRIC_WORKSPACE_ID":"${env:FABRIC_WORKSPACE_ID}"
      }
    }
  }
}
```

> 🔐 **Auth callout:** the config NEVER contains a token. The Copilot CLI
> resolves `${env:FABRIC_AUTH_TOKEN}` at launch from your shell. If the
> var is empty, the MCP process fails fast — that's intentional.

### A.2 Mint a Fabric token (Live path only)

```bash
export FABRIC_TENANT_ID="<your-tenant-guid>"
export FABRIC_WORKSPACE_ID="<your-workspace-guid>"
export FABRIC_AUTH_TOKEN="$(az account get-access-token \
  --resource https://api.fabric.microsoft.com \
  --query accessToken -o tsv)"
```

For long-lived setups, store these in **Azure Key Vault** and export them
at shell start, e.g.:

```bash
export FABRIC_AUTH_TOKEN="$(az keyvault secret show \
  --vault-name contoso-secrets --name fabric-token --query value -o tsv)"
```

### A.3 Live Fabric: enumerate lakehouses and run a cell

Launch the CLI and ask Copilot to introspect:

```text
> /agents fabric
> List the lakehouses in my Fabric workspace, then summarize the
  schema of the largest one in 5 bullet points.
```

> 🎯 **Filter by capacity SKU when you have many workspaces.** Fabric workspaces are bound to a capacity (e.g. `F2`, `F8`, `P1`). When the agent enumerates, ask it to filter so you only see the SKUs you can actually run notebooks on:
>
> ```text
> > List my Fabric workspaces where the capacity SKU is F8 or higher,
>   showing workspace name, ID, region, and capacity SKU.
> ```
>
> Under the hood the MCP server calls `GET /v1/workspaces` and pages results; the `capacityAssignmentProgress.capacitySku` field is what the agent filters on. Without the filter you'll see every Power BI workspace your account touches, which on enterprise tenants is often hundreds.

> 🌐 **OneLake URL shape.** When the agent quotes a lakehouse path it uses the OneLake DFS endpoint with an explicit `https://` scheme: `https://onelake.dfs.fabric.microsoft.com/<workspace-guid>/<lakehouse-guid>/Tables/<table>`. The bare `onelake.dfs.fabric.microsoft.com` host without a scheme is **not** a valid URL — you'll see auth-handler errors if you paste it into `az storage` or `curl` without prepending `https://`.

Then trigger a notebook cell:

```text
> Run cell 3 of the "freshness-check" notebook in the analytics
  lakehouse and tell me whether the row count exceeds 1,000,000.
```

Copilot will call the `fabric` MCP server, which talks to the Fabric REST
API on your behalf using the env-var token.

> ⏳ **Rate limits & back-off (live path).** The Fabric REST API enforces per-tenant 429s — typically ~200 requests/minute per workspace, lower for `GET /workspaces` enumeration. If you fan out queries from a `task`-tool sub-agent, expect throttling. The MCP server honors the `Retry-After` header and back-offs exponentially (1s → 2s → 4s, capped at 30s). When you see the agent pause mid-loop, that's the back-off — let it ride; cancelling and re-running just resets the budget. For heavy enumeration, prefer one well-shaped query that returns 50 rows over 50 single-row queries.

### A.3 (Offline path) Same steps, against the Parquet fixture

If `$FABRIC_AUTH_TOKEN` is empty, the MCP server will refuse to start.
That's the right behavior. For the **offline simulator**, skip the MCP
server entirely and let Copilot use plain bash + Python against the
fixture. This is the **mock command set** equivalent of the calls above:

```bash
# "Enumerate lakehouses"
python -c "
import pandas as pd, pathlib
fixtures = pathlib.Path('labs/fixtures/lab12').glob('*.parquet')
for p in fixtures:
    df = pd.read_parquet(p)
    print(f'{p.stem}: rows={len(df)} cols={list(df.columns)}')
"

# "Run cell 3 — summarize the lakehouse"
python -c "
import pandas as pd
df = pd.read_parquet('labs/fixtures/lab12/sales.parquet')
print(df.groupby('region')['amount_usd'].agg(['count', 'sum']))
"
```

Now ask Copilot to do the same work conversationally:

```text
> The Fabric MCP isn't available in this environment. Read
  labs/fixtures/lab12/sales.parquet with pandas and produce the
  same per-region summary. Use this output to mock the response
  Fabric would have returned.
```

> 🧪 **Why a mock command set instead of a stub MCP server?** Lower
> moving parts. Learners see exactly what data shape the live MCP
> would return, without having to install/maintain a fake stdio server.

### A.4 Pull results into a summary

Whichever path you used, finish with:

```text
> Take the per-region summary above and draft a 3-paragraph email
  for the analytics stakeholders, including a callout for any
  region whose total exceeds $200.
```

You've now driven a data → insight → narrative loop entirely from the
CLI.

---

## Part B — VS Code

### B.1 Wire the MCP entry into VS Code

Merge the entry from [`mcp-configs/vscode/individual/fabric.json`](../mcp-configs/vscode/individual/fabric.json)
into your `.vscode/mcp.json` (or user `settings.json` MCP section):

```json
{
  "inputs": [
    { "id": "fabric-auth-token",   "type": "promptString", "password": true,  "description": "Fabric API token" },
    { "id": "fabric-workspace-id", "type": "promptString",                    "description": "Fabric workspace GUID" }
  ],
  "servers": {
    "fabric": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@microsoft/fabric-mcp@latest"],
      "env": {
        "FABRIC_AUTH_TOKEN":   "${input:fabric-auth-token}",
        "FABRIC_WORKSPACE_ID": "${input:fabric-workspace-id}"
      }
    }
  }
}
```

VS Code's `inputs` block prompts once, stores the value in the OS secret
vault, and re-injects it into the MCP process per session. **Never** type
a token into a notebook cell or commit one to settings.

### B.2 Open a notebook and use **inline chat** for cell-level edits

1. Open `labs/fixtures/lab12/explore.ipynb` (Live path) or any local
   `.ipynb` you have. Offline-path learners can `jupyter notebook
   --generate-config` and create a scratch notebook in `~/scratch/`.
2. Click into a code cell. Press `Ctrl+I` (`Cmd+I` on macOS) to invoke
   inline chat.
3. Try cell-scoped edits:

   ```text
   Refactor this cell to read sales.parquet via pyarrow.dataset and
   filter to rows where ts >= 2026-02-01.
   ```

4. Accept the diff. Re-run the cell. Iterate.

> 🐍 **Pin the interpreter so VS Code, Copilot, and your shell agree.** Inline chat and agent mode both call the active Python kernel for cell evaluation; if VS Code falls back to a system `python` that doesn't have `pandas`/`pyarrow` you'll see import errors that the lab text doesn't predict. Lock it down per-workspace by adding to `.vscode/settings.json`:
>
> ```jsonc
> {
>   // Point at the venv you used for §12.1 — adjust the path.
>   "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
>   "jupyter.notebookFileRoot": "${workspaceFolder}"
> }
> ```
>
> On Windows use `${workspaceFolder}/.venv/Scripts/python.exe`. After saving, run **Python: Select Interpreter** once to confirm VS Code picked it up; the kernel selector at the top of the notebook should show the same path.

> ✏️ **Inline chat shines** at single-cell rewrites where you want fast,
> reviewed diffs without leaving the editor.

### B.3 Use **agent mode** for cross-cell refactors

Open Copilot Chat in agent mode (the chat panel's mode selector). Ask:

```text
Look across all cells in this notebook. The "amount" column is
referenced inconsistently (sometimes amount_usd, sometimes amount).
Pick one canonical name, refactor every cell, and update markdown
explanations to match. Add a parameter cell at the top exposing
the input parquet path.
```

Agent mode will plan, edit multiple cells, and present a single review.
This is where the **Papermill parameter cell pattern** comes in (see
12.5).

### B.4 Manage secrets via Azure Key Vault — never inline

```python
# DON'T:  fabric_token = "eyJ..."   # leaks into outputs[] on every run
# DO:
import os, subprocess
fabric_token = os.environ.get("FABRIC_AUTH_TOKEN") or subprocess.check_output(
    ["az", "keyvault", "secret", "show",
     "--vault-name", "contoso-secrets",
     "--name", "fabric-token",
     "--query", "value", "-o", "tsv"],
    text=True,
).strip()
```

Couple this with the strip-outputs hook (next section) and a leaked
token is structurally hard.

---

## 12.5 Notebook hygiene best practices

These four conventions, applied together, make notebooks reviewable like
regular code.

### 12.5.1 Configure a notebook-aware Git diff

Add to `.gitattributes` — both rules together (notebooks get a structured diff, parquet stays binary so the fixture in §12.2 doesn't blow up `git diff`):

```gitattributes
*.ipynb   diff=jupyternotebook merge=jupyternotebook
*.parquet binary
```

And register the driver once per machine:

```bash
git config diff.jupyternotebook.command 'git-nbdiffdriver diff'
git config merge.jupyternotebook.driver  'git-nbmergedriver merge %O %A %B %L %P'
```

(`pip install 'nbdime>=4'` first — nbdime 4.x ships both `git-nbdiffdriver` and `git-nbmergedriver`; older 3.x only ships the diff driver.) Now `git diff notebook.ipynb` shows
cell-level changes instead of JSON noise.

> 🧹 **Alternative one-liner — `nbstripout`.** If you'd rather strip outputs declaratively (as a `.gitattributes` filter) instead of via the pre-commit hook in §12.5.4, install `nbstripout` and let it write the `.gitattributes` block for you:
>
> ```bash
> pip install nbstripout
> nbstripout --install --attributes .gitattributes
> ```
>
> That appends `*.ipynb filter=nbstripout` plus the matching `[diff]`/`[merge]` config. Pick **one** strategy per repo — the pre-commit hook (§12.5.4) and the nbstripout filter both work, but stacking them produces double-strips on every commit and confuses `git diff`. The hook is preferred for this workshop because it lets you preview what's about to be stripped before it lands.

### 12.5.2 Papermill parameter cells

Tag the top cell `parameters`. Papermill, Fabric's notebook runner, and
most CI runners will inject overrides into that cell at execution time.
Treat the rest of the notebook as a pure function of those parameters.

```python
# parameters
input_parquet = "labs/fixtures/lab12/sales.parquet"
region_filter = None     # set to "NA"|"EU"|"APAC" to narrow
min_amount    = 0.0
```

This pattern is what makes the same notebook runnable both by you in
VS Code and by a Fabric pipeline later.

### 12.5.3 Reproducibility — pin your environment

Every notebook lab folder should ship with one of:

- `requirements.txt` (pip)
- `environment.yml` (conda)
- A `%pip install` cell at the top (acceptable for one-off demos only)

Pin exact versions for `pandas`, `pyarrow`, `papermill`. Fabric's runtime
versions are documented in the registry — see
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

### 12.5.4 Do-not-commit-outputs policy (enforced by the hook)

Wire up [`scripts/hooks/pre-commit-strip-notebook-outputs.sh`](../scripts/hooks/pre-commit-strip-notebook-outputs.sh):

```bash
mkdir -p .githooks
cat > .githooks/pre-commit <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# `while read` form is portable to bash 3.2 (macOS stock); `mapfile`
# would require bash 4+ and silently fails on Apple's bundled /bin/bash.
notebooks=()
while IFS= read -r f; do
  notebooks+=("$f")
done < <(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ipynb$' || true)
[ "${#notebooks[@]}" -eq 0 ] && exit 0
scripts/hooks/pre-commit-strip-notebook-outputs.sh "${notebooks[@]}"
git add -- "${notebooks[@]}"
SH
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

Now any `git commit` that includes a notebook will silently strip
outputs and re-stage. Combined with the Key Vault pattern in B.4, a
secret pasted into a cell output cannot escape your machine.

---

## 12.6 Wrap-up checklist

- [ ] Fabric MCP entry merged into CLI **and** VS Code configs
- [ ] `FABRIC_AUTH_TOKEN` exported from a Key Vault command (or you
      explicitly chose the offline path)
- [ ] Enumerated lakehouses (live) **or** the Parquet fixture (offline)
      from Copilot CLI
- [ ] Did a cell-level edit with inline chat in VS Code
- [ ] Did a cross-cell refactor with agent mode in VS Code
- [ ] `.gitattributes` updated with `*.ipynb diff=jupyternotebook`
- [ ] Top cell of any new notebook tagged `parameters` (Papermill)
- [ ] Pre-commit hook installed and verified by committing a notebook
      with outputs and seeing them stripped

When all boxes are ticked, you've shipped the Fabric workflow Prism (the
Fabric Data Architect agent — see [AGENTS.md](../AGENTS.md)) expects on
every PR.

## 12.7 Cleanup

> 🛠️ **Lab 12 specifics — revert before the generic sweep below.**
>
> - **Fabric env vars (live path):** `unset FABRIC_AUTH_TOKEN FABRIC_TENANT_ID FABRIC_WORKSPACE_ID` (PowerShell: `Remove-Item Env:FABRIC_AUTH_TOKEN, Env:FABRIC_TENANT_ID, Env:FABRIC_WORKSPACE_ID -ErrorAction SilentlyContinue`). The token is short-lived, but unsetting it stops MCP from auto-launching `@microsoft/fabric-mcp` on your next `copilot` session.
> - **Pre-commit hook:** if §12.5.4 set `core.hooksPath` to `.githooks`, revert with `git config --unset core.hooksPath` (or restore your previous value if you had one). Delete `.githooks/pre-commit` if you no longer want the strip-outputs behavior.
> - **`.gitattributes` edits:** if you added the notebook/parquet rules from §12.5.1 only to try them, `git checkout -- .gitattributes` returns the file to its committed state. The repo already ships `*.parquet binary`, so you can leave that even if you remove the notebook rules.
> - **Offline fixtures stay committed.** `labs/fixtures/lab12/sales.parquet` is **part of the repo** — do not delete it. Any *additional* `*.parquet` files you generated (e.g. `sales-2.parquet`) sit in the directory but are git-ignored; remove them with `git clean -fdX -- labs/fixtures/lab12/` if you want a pristine fixtures dir without touching the canonical file.
> - **Scratch notebook (offline path):** `rm -rf ~/scratch/` (review first if you also use that dir for other work).
> - **MCP config:** if you merged the `fabric` block into `~/.copilot/mcp-config.json` or `.vscode/mcp.json` and want to remove it, edit the file and delete just that entry — not the whole `mcpServers` object.

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
