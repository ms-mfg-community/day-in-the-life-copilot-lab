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
| Both | `python` 3.11+ with `pandas` and `pyarrow` (offline fixture build) |
| Both | This repo cloned with the `feature/modernize` (or `main`) branch checked out |

Quick check:

```bash
node --version    # >= v20
jq --version
python -c "import pandas, pyarrow; print('ok')"
```

---

## 12.2 Set up the offline simulator (do this even on the Live path)

Even live-path learners should generate the fixture — Part A's offline
section is a useful smoke test, and demos rarely have reliable Wi-Fi.

```bash
mkdir -p labs/fixtures/lab12
python - <<'PY'
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

Then trigger a notebook cell:

```text
> Run cell 3 of the "freshness-check" notebook in the analytics
  lakehouse and tell me whether the row count exceeds 1,000,000.
```

Copilot will call the `fabric` MCP server, which talks to the Fabric REST
API on your behalf using the env-var token.

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

Add to `.gitattributes`:

```gitattributes
*.ipynb diff=jupyternotebook merge=jupyternotebook
```

And register the driver once per machine:

```bash
git config diff.jupyternotebook.command 'git-nbdiffdriver diff'
git config merge.jupyternotebook.driver  'git-nbmergedriver merge %O %A %B %L %P'
```

(`pip install nbdime` first.) Now `git diff notebook.ipynb` shows
cell-level changes instead of JSON noise.

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
mapfile -t notebooks < <(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ipynb$' || true)
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
