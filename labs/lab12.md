---
title: "Fabric MCP with Copilot CLI & VS Code"
lab_number: 12
pace:
  presenter_minutes: 8
  self_paced_minutes: 120
registry: docs/_meta/registry.yaml
---

# 12 — Fabric MCP with Copilot CLI & VS Code

In this lab you will wire **Microsoft Fabric** into Copilot, enumerate
lakehouses from the CLI, run a notebook cell, and refactor a notebook in
VS Code with inline chat and agent mode — all while keeping secrets out
of source control.

> ⏱️ Presenter pace: 8 minutes | Self-paced: 120 minutes

> 🛤️ **Choose your path** before you start:
>
> - **Live Fabric path** — you have a Fabric workspace and can sign in to
>   its tenant with `az login`, and that workspace has a lakehouse you can
>   read with a `sales` table in it (§12.1 gives the exact shape). You'll talk
>   to a real lakehouse through the Fabric MCP server. Work Part A in the
>   order A.1 → A.2 → A.3 → A.5, then Part B in the order B.1 → B.2 → B.3
>   (B.4 is optional).
> - **Offline simulator path** — Codespaces / no-Fabric-tenant learners, or
>   anyone whose lakehouse isn't ready. You'll run every step against a local
>   **Parquet fixture** that mimics a Fabric lakehouse query result. No Azure
>   sign-in, no Node and no MCP server are needed: **skip A.1–A.3 and B.1**,
>   and work A.4 → A.5, then B.2 → B.3. Skip B.4 too. Everything in §12.5
>   (notebook hygiene) applies to both paths.
>
> Both paths reach the same learning outcomes. The live path is preferred
> when available because Part B (VS Code agent mode) is markedly richer
> against a real notebook host.

References:

- [Fabric MCP server config (CLI)](../mcp-configs/copilot-cli/individual/fabric.json)
- [Fabric MCP server config (VS Code)](../mcp-configs/vscode/individual/fabric.json)
- [`scripts/hooks/pre-commit-strip-notebook-outputs.sh`](../scripts/hooks/pre-commit-strip-notebook-outputs.sh)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — the Fabric MCP pin and note (`mcp_servers.fabric`, covering both the local and the remote surface) and the repo's pandas/pyarrow pins (`prepared_core.python`)
- [Microsoft Fabric REST API](https://learn.microsoft.com/rest/api/fabric/articles/) (Microsoft Learn)
- [Throttling in Microsoft Fabric](https://learn.microsoft.com/rest/api/fabric/articles/throttling) (Microsoft Learn)
- [Get started with the local Fabric MCP Server](https://learn.microsoft.com/rest/api/fabric/articles/mcp-servers/pro-dev-local/get-started-local) (Microsoft Learn)
- [Papermill parameterised notebooks](https://papermill.readthedocs.io/en/latest/)

---

## 12.8 Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (confirmed GA, ~Aug 2026):** `/plugin`, `/mcp`, and
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

> 🧭 **Which Fabric MCP is this?** There are two distinct Fabric MCP
> surfaces in the wild — this lab uses the **local/open-source** one:
>
> | Variant | What it is | Used by |
> |---------|------------|---------|
> | **`Fabric.Mcp.Server` (local/OSS)** — the `@microsoft/fabric-mcp` npm package this lab configures | Runs on your machine via `npx`, authenticates through your `az login` session (`DefaultAzureCredential`). Source: [github.com/microsoft/mcp/tree/main/servers/Fabric.Mcp.Server](https://github.com/microsoft/mcp/tree/main/servers/Fabric.Mcp.Server). | The **Live** path only — A.1–A.3 in Part A (CLI) and B.1 in Part B (VS Code). The Offline path never starts this server: Offline learners work A.4, A.5, B.2 and B.3, which need no MCP server, no Node and no Azure sign-in. |
> | **Fabric Core MCP Server (remote)** | Microsoft-hosted endpoint at `https://api.fabric.microsoft.com/v1/mcp/core`, Entra ID auth + RBAC, no local process to run. Public preview since March 2026. | *Not used in this lab.* Mentioned here only so you don't confuse the two when reading Fabric docs — see [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) `mcp_servers.fabric.note` for the full pin rationale. |
>
> If your org has standardized on the remote Fabric Core MCP Server instead,
> the concepts in this lab (lakehouse enumeration, OneLake table reads,
> notebook hygiene) still transfer, but the MCP config block in §A.1/§B.1
> and the `az login`-based auth flow do not — swap in the remote endpoint's
> Entra ID app registration flow instead.
>
> **Where the facts live.** The registry's `mcp_servers.fabric` entry in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) is the single
> home for both surfaces: the pinned version, the `npm_package` name, the
> `last_verified` date, and a note describing the local server and the
> remote Fabric Core MCP Server. This lab hardcodes no version of its own.
> The committed configs track `@latest`, so a newer server can differ from
> the pin — tool names in particular vary a little between versions.

---

## 12.1 Prerequisites

> 📌 **Start with [Lab 05](lab05.md) if you are taking the Live path.** Steps
> A.1 and B.1 ask you to merge a server entry into an MCP config file, and they
> assume you already know the difference between a `local` (stdio) server and an
> `http` one. Lab 05 teaches both; this lab does not re-teach them. The Offline
> path skips A.1 and B.1 and never starts the MCP server, so Lab 05 is not
> required for it.

> 📎 **Builds on [Lab 11](lab11.md).** Lab 11 introduced the
> "configuration as a product" / plugin-distribution mindset; this lab
> extends the same mindset to the data plane via Fabric MCP. Lab 11
> is not a hard prerequisite, but the packaging instincts carry over.

| Path | Prerequisite |
|------|--------------|
| Both | A **Bash-compatible terminal**. On macOS and Linux that is your normal terminal. On Windows use **Git Bash** (installed with Git for Windows) or **WSL**: PowerShell and `cmd` can't run this lab's command blocks as written, because they use `export`, heredocs, arrays, process substitution and `chmod`. Where a command says `python3` and your Windows install calls it `python` (or `py -3`), use that name instead |
| Both | Every terminal command in this lab runs from the **repository root** — the folder that contains `labs/` and `scripts/`. `cd` there first and stay there |
| Both | Basic Git: you can stage a file (`git add`), make a commit (`git commit`), and read `git status` and `git diff`. §12.5.4 has you make one practice commit |
| Live | Azure CLI (`az`) signed in to your Fabric tenant; at least the **Contributor** role on one workspace |
| Live | A lakehouse in that workspace that you can read **and that already holds data**: a table named `sales` with at least a `region` column and a numeric `amount_usd` column — the same shape as the committed fixture. Contributor on an empty workspace is not enough, and neither is a lakehouse without that table. If you don't have one, take the Offline path; A.3 has a checkpoint for exactly this |
| Live | `node` 20+ (the MCP server is npm-published) |
| Live (optional, B.4 only) | To try the B.4 example you need **either** a Fabric token exported as `FABRIC_AUTH_TOKEN` (A.2 shows how) in the shell that launches VS Code, **or** an Azure Key Vault you can read secrets from that holds a secret named `fabric-token` containing such a token. With neither, skip B.4 — nothing else in the lab uses it |
| Both | `jq` (used by the strip-outputs hook, and by the notebook checks in B.3 and §12.5.4) |
| Both (read the fixture) | `python3` 3.11+ with `pandas` **and** `pyarrow`. `pandas` does not install a Parquet engine for you, and both the §A.4 reader snippet and the first cell in B.2 call `pd.read_parquet`, which fails without one. `pyarrow` is the engine to install because the Part B `pyarrow.dataset` example needs it specifically (`fastparquet` would cover `pd.read_parquet` alone). Use a virtual environment — you point VS Code at it in B.2; the repo's own pins are under `prepared_core.python` in `docs/_meta/registry.yaml` |
| Both (Part B) | VS Code with the GitHub Copilot Chat, Python and Jupyter extensions installed |
| Regenerate | The same `python3` + `pandas` + `pyarrow`, but **only** if you rebuild `sales.parquet` with the snippet in §12.2 or `scripts/generate-lab12-fixture.py`. Regenerating **overwrites** the committed `labs/fixtures/lab12/sales.parquet`; you do not need to do it to follow this lab |
| Both | This repo cloned, with the `main` branch checked out |

Quick check, run from the repository root:

```bash
node --version    # Live path only: >= v20
jq --version
# Use python3 explicitly — stock Ubuntu 24.04 and macOS ship only `python3`,
# not an unversioned `python` symlink.
python3 -c "import pandas, pyarrow; print('ok')"
```

Every check you need must succeed before you go on. A failure means a
prerequisite isn't installed on **this machine** — it isn't a defect in the lab
— so install it now rather than working around it. Install `jq` with your
package manager (Homebrew, apt, winget, …). For Python, use a virtual
environment; VS Code needs it in B.2 anyway:

```bash
python3 -m venv .venv
source .venv/bin/activate      # Git Bash on Windows: source .venv/Scripts/activate
pip install pandas pyarrow     # the repo's own pins are under prepared_core.python in docs/_meta/registry.yaml
python3 -c "import pandas, pyarrow; print('ok')"
```

---

## 12.2 Set up the offline simulator (the fixture is already committed)

The offline simulator reads one small Parquet file,
`labs/fixtures/lab12/sales.parquet`, and that file is **already committed**
to this repo. You do not need to generate anything to follow either the Live
or the Offline path — this section shows how the file is built, in case you
ever want to rebuild it.

> ⚠️ **Regenerating overwrites the committed fixture.** Both the snippet below
> and `python3 scripts/generate-lab12-fixture.py` write to
> `labs/fixtures/lab12/sales.parquet` — the same file the repo commits and
> that `tests/lab-structure/lab12-fixture-exists.test.ts` checks (Parquet
> magic bytes, size bounds, four columns). The bytes you produce can differ
> from the committed ones depending on your `pandas` and `pyarrow` versions,
> so `git status` will then list the file as modified. If you ran it by
> accident, `git restore labs/fixtures/lab12/sales.parquet` puts the
> committed copy back. If you only want to follow the lab, skip the snippet
> and go on to Part A.

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
repo (~3 KiB), so the offline path works out of the box — there is nothing
to generate. (Reading it still needs `pandas` plus a Parquet engine; see
§12.1.) Rebuild it only if you must, with the snippet above or via
`python3 scripts/generate-lab12-fixture.py` (`pandas` + `pyarrow` are
required only for that), and remember that this overwrites the committed
file. Any *additional* parquet files you drop into `labs/fixtures/lab12/`
while experimenting stay local — see `.gitignore`.

> 📎 **Parquet binary diff hygiene.** The repo ships a `.gitattributes` rule that marks `*.parquet` as `binary` — `git diff` won't try to render it as text, and `git merge` won't attempt a textual three-way merge. See [§12.5.1](#1251-configure-a-notebook-aware-git-diff) for the full hygiene block (notebooks + parquet) and the test that pins it (`tests/lab-structure/gitattributes-parquet-binary.test.ts`).

---

## 12.3 Part A — Copilot CLI

### A.1 Wire the MCP entry into your CLI config (Live path only)

> 🛤️ **Offline path: skip A.1, A.2 and A.3 and go straight to
> [A.4](#a4-offline-path-same-steps-against-the-parquet-fixture).** The
> Offline path never starts the Fabric MCP server, so there is nothing to
> configure here, and no Azure sign-in or Node to set up. Come back to A.1
> only if you later get a Fabric tenant.

Open your Copilot CLI MCP config (`~/.copilot/mcp-config.json`) and merge
in the entry from [`mcp-configs/copilot-cli/individual/fabric.json`](../mcp-configs/copilot-cli/individual/fabric.json):

```json
{
  "mcpServers": {
    "fabric": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@microsoft/fabric-mcp@latest", "server", "start", "--mode", "all"],
      "tools": ["*"],
      "env": {
        "FABRIC_TENANT_ID":   "${env:FABRIC_TENANT_ID}",
        "FABRIC_WORKSPACE_ID":"${env:FABRIC_WORKSPACE_ID}",
        "AZURE_TENANT_ID":    "${env:AZURE_TENANT_ID}",
        "AZURE_TOKEN_CREDENTIALS": "AzureCliCredential"
      }
    }
  }
}
```

> 🔐 **Auth callout:** the `server start --mode all` args are required for
> the live tools to load. The server authenticates through your `az login`
> session (`DefaultAzureCredential`), not a token environment variable.
> `FABRIC_AUTH_TOKEN` is optional: the MCP server does not read it, and only
> the Python example in B.4 uses it.
>
> 🧭 **Multi-tenant trap (read this if you're a Microsoft employee).**
> `DefaultAzureCredential` tries a chain of credentials (environment
> variables, managed identity, developer-tool sign-ins, the Azure CLI, and
> others) and uses the first one that works. On a multi-tenant identity that
> first match can be a sign-in to your **home tenant** rather than your
> Fabric tenant — so the server lists the *wrong* workspaces (or returns 404
> on yours). The two env vars above prevent that:
> `AZURE_TOKEN_CREDENTIALS=AzureCliCredential` narrows the chain to the
> silent `az login` credential, and `AZURE_TENANT_ID` pins it to your Fabric
> tenant. Setting `AZURE_TENANT_ID` alone is **not** enough. Remove
> `AZURE_TOKEN_CREDENTIALS` only if you intend to use a managed
> identity / service principal instead of `az login`.

### A.2 Sign in with Azure CLI (Live path only)

```bash
az login
# If your Fabric tenant differs from your default tenant:
# az login --tenant <your-tenant-guid>
az account show --query tenantId -o tsv

export FABRIC_TENANT_ID="<your-tenant-guid>"
export FABRIC_WORKSPACE_ID="<your-workspace-guid>"

# Pin the MCP server to your az login session + Fabric tenant (see the
# multi-tenant trap in A.1). These two make auth silent and correct-tenant:
export AZURE_TENANT_ID="<your-tenant-guid>"     # same GUID as FABRIC_TENANT_ID
export AZURE_TOKEN_CREDENTIALS="AzureCliCredential"

# Optional: only the Python example in B.4 reads this token. The MCP
# server itself uses your az login session, not this token.
export FABRIC_AUTH_TOKEN="$(az account get-access-token \
  --resource https://api.fabric.microsoft.com \
  --query accessToken -o tsv)"
```

You need at least the **Contributor** role on the Fabric workspace. For
long-lived setups, you can source the optional `FABRIC_AUTH_TOKEN` from
**Azure Key Vault** at shell start instead of minting it by hand, e.g.:

```bash
# Replace the vault and secret names with your own.
export FABRIC_AUTH_TOKEN="$(az keyvault secret show \
  --vault-name contoso-secrets --name fabric-token --query value -o tsv)"
```

### A.3 Live Fabric: enumerate lakehouses and run a cell

Launch the CLI from the shell where you exported the A.2 variables, run
`/env`, and confirm that `fabric` is listed among the loaded MCP servers
(`/mcp` manages the same servers). `fabric` is an MCP server, not an agent,
so there is nothing to select with `/agent` — its tools are available to
Copilot as soon as the server connects. Then ask Copilot to list your
lakehouses:

```text
> List the lakehouses in my Fabric workspace, showing each lakehouse's
  name and ID.
```

> 🎯 **Narrow the list by capacity when you have many workspaces.** Fabric workspaces are bound to a capacity (e.g. `F2`, `F8`, `P1`). When the agent enumerates, ask it to show each workspace's capacity so you can focus on the ones you can actually run notebooks on:
>
> ```text
> > List my Fabric workspaces, showing workspace name, ID, and capacity ID.
>   If you can look up each capacity's SKU, keep only F8 or higher.
> ```
>
> A workspace record carries a `capacityId` but no SKU: the SKU lives on the capacity itself (the Fabric REST API's `GET https://api.fabric.microsoft.com/v1/capacities` returns it, and only to callers permitted to read capacities). The local MCP server may not expose a capacities call, so ask Copilot which `fabric` tools it has before relying on one; if there isn't one, group the workspaces by `capacityId` and look that capacity up in the Fabric portal. Without any narrowing you'll see every Power BI workspace your account touches, which on enterprise tenants is often hundreds.

> 🌐 **OneLake URL shape.** When the agent quotes a lakehouse path it uses the OneLake DFS endpoint with an explicit `https://` scheme: `https://onelake.dfs.fabric.microsoft.com/<workspace-guid>/<lakehouse-guid>/Tables/<table>`. The bare `onelake.dfs.fabric.microsoft.com` host without a scheme is **not** a valid URL — you'll see auth-handler errors if you paste it into `az storage` or `curl` without prepending `https://`.

**Pick one lakehouse.** From that list, choose the lakehouse that should hold
your `sales` table — the one with `region` and `amount_usd` columns (§12.1) —
and write down its **name or ID**. Every request from here on names that
lakehouse, so Copilot never has to guess which one you mean. If no lakehouse in
your workspace has a `sales` table, you can't finish the Live exercise: take the
Offline path and carry on from
[A.4](#a4-offline-path-same-steps-against-the-parquet-fixture).

Then inspect the table through OneLake, putting your lakehouse's name or ID in
place of `<name-or-ID>`:

```text
> In the lakehouse <name-or-ID>, list the tables, then show the schema of
  the `sales` table.
```

Copilot calls the `fabric` MCP server's `onelake_*` tools, which reach
OneLake using your `az login` session.

> 🗂️ **Tables live under a namespace (default `dbo`).** The
> `onelake_list-tables` and `onelake_get-table` tools **require** a
> `namespace` — for a standard lakehouse it's `dbo`. Without it the call
> returns `400 "Namespace is required. Provide --namespace or --schema."`
> The agent normally discovers it via `onelake_list-table-namespaces` and
> retries with `dbo`; if you call a tool directly, pass `namespace=dbo`
> (e.g., the schema of `sales` lives at namespace `dbo`, table `sales`).
> Exact tool names and availability can differ between server versions — ask
> Copilot to list its `fabric` tools to see the names yours exposes.

> ✅ **Checkpoint — do you have the right table?** The schema Copilot printed
> should list a `region` column and a numeric `amount_usd` column. If you got an
> error, or `sales` is missing or has other columns, try another lakehouse from
> your list. If none works, take the Offline path:
> [A.4](#a4-offline-path-same-steps-against-the-parquet-fixture).

**Read the rows and aggregate them.** A schema describes the table; it isn't
the data. Before you ask for numbers, find out whether the server can read rows
at all — the local server's documented tools cover workspaces, items, files and
table metadata, so it may have no tool that reads table rows:

```text
> Which of your `fabric` tools can read the rows of a lakehouse table, not
  just its schema? List their names.
```

If Copilot names no such tool, you can't do the aggregation Live: take the
Offline path ([A.4](#a4-offline-path-same-steps-against-the-parquet-fixture)).
If it names one, ask for the aggregate, again naming your lakehouse:

```text
> In the lakehouse <name-or-ID>, read the rows of the `sales` table and, for
  each `region`, count the rows and add up `amount_usd`. Show the result as a
  table with the columns region, count and total, and show me the first 5 rows
  you read so I can check where the numbers came from.
```

**Inspect the result before you use it.** You should see two things: the first
rows of `sales`, with the columns from the schema above, and a table with one
line per region. Check that each region appears once, the counts are whole
numbers and the totals are plausible dollar amounts. If Copilot returns a table
but no source rows, or can't say where the numbers came from, don't trust them:
ask again for the rows it read, or take the Offline path. Keep this table — A.5
uses it.

> 📝 **Notebook execution note:** The server has **no single-cell execution
> tool**. To run a notebook cell, use VS Code inline chat in Part B. The
> REST equivalent of running a whole notebook is a job submission
> (`POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/items/{itemId}/jobs/RunNotebook/instances`),
> not a single cell.

> ⏳ **Rate limits & back-off (live path).** The Fabric REST API throttles per caller identity — you as the signed-in user, or a service principal — not per workspace or per tenant, and a throttled call comes back as `429` with a `Retry-After` header. The `errorCode` tells you why: `RequestBlocked` means wait out the `Retry-After` period and retry, while `CapacityLimitExceeded` means the capacity itself is saturated, so retrying straight away won't help. If you fan out queries from a `task`-tool sub-agent, expect throttling. Don't assume the MCP server retries for you: honor `Retry-After` yourself — pause, then re-run the request. For heavy enumeration, prefer one well-shaped query that returns many rows over many single-row queries, and reuse metadata you have already fetched. The limits themselves change over time; see [Throttling in Microsoft Fabric](https://learn.microsoft.com/rest/api/fabric/articles/throttling) for the current ones.

### A.4 (Offline path) Same steps, against the Parquet fixture

> 🛤️ **This is the Offline route.** Nothing in A.4 needs an Azure sign-in, Node
> or an MCP server — only the `python3` + `pandas` + `pyarrow` setup from §12.1.
> Offline learners come straight here from the "Choose your path" callout at the
> top. A Live learner arrives from an A.3 checkpoint (no readable `sales` table,
> or no `fabric` tool that can read its rows) and works the same steps here.
> When you've seen the per-region table below, go on to
> [A.5](#a5-pull-results-into-a-summary).

With no usable Azure credential (for example, you haven't run `az login`), the
MCP server fails fast — that's the right behavior. For the **offline
simulator**, skip the MCP server entirely and let Copilot use plain bash +
Python against the fixture. This is the **mock command set** equivalent of the
calls in A.3. It needs `pandas` plus a Parquet engine (`pyarrow` or
`fastparquet`) — see §12.1:

```bash
# "Enumerate lakehouses"
python3 -c "
import pandas as pd, pathlib
fixtures = pathlib.Path('labs/fixtures/lab12').glob('*.parquet')
for p in fixtures:
    df = pd.read_parquet(p)
    print(f'{p.stem}: rows={len(df)} cols={list(df.columns)}')
"

# "Run cell 3 — summarize the lakehouse"
python3 -c "
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

Keep the per-region table (region, count, total) this prints — A.5 uses it.

> 🧪 **Why a mock command set instead of a stub MCP server?** Lower
> moving parts. Learners see exactly what data shape the live MCP
> would return, without having to install/maintain a fake stdio server.

### A.5 Pull results into a summary

Whichever path you used, you should now have a per-region table of counts and
totals on screen — from the Live aggregation at the end of A.3, or from the
Offline commands in A.4. Copy that table, paste it where the prompt says, and
finish with:

```text
> Here is the per-region summary:
  <paste the region / count / total table here>
  Using only these numbers, draft a 3-paragraph email for the analytics
  stakeholders, including a callout for any region whose total exceeds $200.
```

If you have no table to paste, go back to A.3 (Live) or A.4 (Offline) first —
otherwise Copilot has nothing to summarize but numbers it made up.

You've now driven a data → insight → narrative loop entirely from the
CLI.

---

## 12.4 Part B — VS Code

### B.1 Wire the MCP entry into VS Code (Live path only)

> 🛤️ **Offline path: skip B.1 and go straight to
> [B.2](#b2-open-a-notebook-and-use-inline-chat-for-cell-level-edits).** B.1 sets
> up and starts the Fabric MCP server, which needs Node, an `az login` session
> and a Fabric tenant — none of which the Offline path uses. B.2 and B.3 read the
> committed Parquet fixture and don't need the server.

Merge the entry from [`mcp-configs/vscode/individual/fabric.json`](../mcp-configs/vscode/individual/fabric.json)
into your workspace's `.vscode/mcp.json` — or, to make it available in every
workspace, into your user-profile MCP configuration (Command Palette →
**MCP: Open User Configuration**). Current VS Code reads MCP servers from
these dedicated `mcp.json` files, under a top-level `servers` key — not from
`settings.json`. If the file doesn't exist yet, create it with the JSON below
as-is; if it does, add the `fabric` entry under its existing `servers` (and
the input under `inputs`):

```json
{
  "inputs": [
    { "id": "fabric-workspace-id", "type": "promptString", "description": "Fabric workspace GUID (informational; the server authenticates via your az login session)" }
  ],
  "servers": {
    "fabric": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@microsoft/fabric-mcp@latest", "server", "start", "--mode", "all"],
      "env": {
        "FABRIC_WORKSPACE_ID": "${input:fabric-workspace-id}",
        "FABRIC_TENANT_ID":    "${env:FABRIC_TENANT_ID}",
        "AZURE_TENANT_ID":     "${env:AZURE_TENANT_ID}",
        "AZURE_TOKEN_CREDENTIALS": "AzureCliCredential"
      }
    }
  }
}
```

The server uses your `az login` session for auth, so no token prompt is
needed; the workspace GUID input is informational. **Never** type a token
into a notebook cell or commit one to any config file. The `AZURE_TENANT_ID` /
`AZURE_TOKEN_CREDENTIALS` pair pins auth to your Fabric tenant via `az login`
(same multi-tenant trap as A.1) — export `AZURE_TENANT_ID` in the shell that
launches VS Code, or replace `${env:AZURE_TENANT_ID}` with your tenant GUID.
Then run **MCP: List Servers** from the Command Palette and confirm `fabric`
is listed; start it from there if it isn't running.

### B.2 Open a notebook and use **inline chat** for cell-level edits

1. Create a notebook to work in (or open any `.ipynb` you already have):
   Command Palette → **Create: New Jupyter Notebook**, then save it in the
   repo root as `my-explore.ipynb` (later steps use that name; if you work in a
   different notebook, substitute its name). Click
   **Select Kernel** at the top right and pick the Python interpreter that
   has `pandas` and `pyarrow` (see the interpreter callout below). Put this
   in the first code cell and run it:

   ```python
   import pandas as pd
   df = pd.read_parquet("labs/fixtures/lab12/sales.parquet")
   df.head()
   ```

   Add a second code cell with the per-region summary from A.4, so there is
   more than one cell to work across in B.3:

   ```python
   df.groupby("region")["amount_usd"].agg(["count", "sum"])
   ```

   (The fixture is committed, so this works on both the Live and the Offline
   path.)
2. Click into the first code cell. Press `Ctrl+I` (`Cmd+I` on macOS) to invoke
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
>   // Point at the virtual environment that has your §12.1 packages — adjust the path.
>   "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
>   "jupyter.notebookFileRoot": "${workspaceFolder}"
> }
> ```
>
> On Windows use `${workspaceFolder}/.venv/Scripts/python.exe`. After saving, run **Python: Select Interpreter** once to confirm VS Code picked it up; the kernel selector at the top of the notebook should show the same path.

> ✏️ **Inline chat shines** at single-cell rewrites where you want fast,
> reviewed diffs without leaving the editor.

### B.3 Use **agent mode** for cross-cell refactors

> 🏷️ **First, what is a "parameter cell"?** It is the one cell at the top of a notebook that holds its inputs as plain variables with default values. A runner such as Papermill executes the notebook with different values by injecting overrides in a new cell *right after* the cell whose **metadata** carries the tag `parameters`. Two things trip people up. A `# parameters` comment is only a label for human readers; it is **not** the tag. And the tag is not part of the cell's code: it is a field in the cell's metadata (`"tags": ["parameters"]` in the `.ipynb` JSON). If no cell has the tag, Papermill injects its overrides at the very top of the notebook and your untagged defaults then overwrite them, so the override silently does nothing. Copilot can write the cell; you add the tag yourself, below.

Open Copilot Chat in agent mode (the chat panel's mode selector). Ask:

```text
Look across all cells in this notebook. Check that they refer to the
loaded data and to the amount column (amount_usd) consistently; where
they don't, pick one canonical name, refactor every cell, and update
any markdown explanations to match. Add a new first cell that sets
input_parquet = "labs/fixtures/lab12/sales.parquet", and change the
cell that reads the data to read from input_parquet.
```

Agent mode will plan, edit multiple cells, and present a single review.
Accept it, then add the tag and prove it landed:

1. Check that the `input_parquet` cell is the **first** cell and that the
   reader cell now reads from `input_parquet`, whichever library it uses
   (`pd.read_parquet(input_parquet)` or the `pyarrow.dataset` reader from
   B.2), and still applies the date filter from B.2. If the new cell isn't
   first, ask Copilot to move it to the top.
2. Select the `input_parquet` cell, open the Command Palette and run
   **Mark Cell as Parameters**; it writes the `parameters` tag for you. (Or
   run **Add Cell Tag** and type `parameters`. The same commands are usually
   in the cell toolbar's **More Actions** `…` menu. If none are listed, check
   that the Jupyter extension from §12.1 is installed.)
3. Save the notebook, then read the tag back out of the file:

   ```bash
   jq -c '.cells[0].metadata.tags' my-explore.ipynb
   ```

   It should print `["parameters"]`. `null` means the tag didn't land: repeat
   step 2 on the first cell.

This is the **Papermill parameter cell pattern**; §12.5.2 explains what else
belongs in that cell.

### B.4 (Optional, Live path only) Manage secrets via Azure Key Vault — never inline

> 🚫 **Offline learners: do not run this example. Skip to §12.5.** It reads a Fabric access token, and the Offline path has none.
>
> **Live learners: this is optional**, and the example needs one of these:
>
> - `FABRIC_AUTH_TOKEN` exported by the optional step in A.2, in the shell that launches VS Code, as in B.1 (restart VS Code from that shell if it was already open); **or**
> - an Azure Key Vault you can read: a vault (the code below uses the placeholder name `contoso-secrets`; use your own), a secret in it named `fabric-token`, and an `az login` identity that is allowed to read secrets in that vault. This lab doesn't create any of these.
>
> With neither, skip B.4. Nothing later depends on it.

A notebook saves two different things, and a secret can end up in either:

- **Source cells** are saved exactly as written, every time you save, even if the cell never runs. `fabric_token = "eyJ..."` puts the token in the file's source.
- **Outputs** are saved for cells that ran. `print(fabric_token)`, or a cell that ends with the bare variable name, puts the value in the file's `outputs`.

The hook in §12.5.4 clears outputs only; it never touches source. So keep the token out of both: read it at run time and never display it.

```python
# DON'T:  fabric_token = "eyJ..."   # the token is now saved in the notebook's source
# DO:
import os, shutil, subprocess
fabric_token = os.environ.get("FABRIC_AUTH_TOKEN") or subprocess.check_output(
    [shutil.which("az"), "keyvault", "secret", "show",   # which() finds az.cmd on Windows
     "--vault-name", "contoso-secrets",
     "--name", "fabric-token",
     "--query", "value", "-o", "tsv"],
    text=True,
).strip()
```

Don't `print(fabric_token)` and don't end a cell with the variable name:
either one writes the token into `outputs`. §12.5.4 spells out what the
hook does and doesn't clear, and the review to do before you stage a
notebook.

---

## 12.5 Notebook hygiene best practices

These four conventions, applied together, make notebooks reviewable like
regular code. They apply on both paths. 12.5.1–12.5.3 are quick setup;
12.5.4 ends with a short practice commit that proves the hook works, so keep
the `my-explore.ipynb` notebook from B.2 and B.3 handy.

### 12.5.1 Configure a notebook-aware Git diff

Add to `.gitattributes` — both rules together (notebooks get a structured diff, parquet stays binary so the fixture in §12.2 doesn't blow up `git diff`):

```gitattributes
*.ipynb   diff=jupyternotebook merge=jupyternotebook
*.parquet binary
```

And register the drivers once per machine. `nbdime` provides both commands,
so install it first:

```bash
pip install 'nbdime>=4'
git config diff.jupyternotebook.command 'git-nbdiffdriver diff'
git config merge.jupyternotebook.driver  'git-nbmergedriver merge %O %A %B %L %P'
```

Now `git diff` on a tracked notebook shows cell-level changes instead of
JSON noise.

### 12.5.2 Papermill parameter cells

B.3 had you put `input_parquet` in the first cell and tag that cell
`parameters`. Papermill, Fabric's notebook runner, and most CI runners look
for the tagged cell and override its values at execution time, so the same
notebook runs against different inputs without being edited. (Papermill does
it by inserting a new cell right after the tagged one.) Treat the rest of the
notebook as a pure function of those parameters. Once you add the optional
values below, the cell looks like this:

```python
# parameters
input_parquet = "labs/fixtures/lab12/sales.parquet"
region_filter = None     # optional: "NA"|"EU"|"APAC" to narrow
min_amount    = 0.0      # optional: smallest amount_usd to keep
```

Three rules for that cell:

- **The tag is metadata, not the comment.** The `# parameters` line above is
  only a label for people. What a runner reads is the `parameters` tag in the
  cell's metadata, which you set in B.3 step 2 and checked with `jq`.
- **`input_parquet` is the value the notebook must use.** The reader cell
  reads from it (that is what you asked agent mode for in B.3), so overriding
  it changes the data every later cell sees.
- **`region_filter` and `min_amount` are optional.** They do nothing until the
  processing cells use them. Add them only if you also filter on them,
  otherwise leave them out: a parameter that nothing reads looks like a
  control and changes nothing.

This pattern is what makes the same notebook runnable both by you in
VS Code and by a Fabric pipeline later.

### 12.5.3 Reproducibility — pin your environment

Every notebook lab folder should ship with one of:

- `requirements.txt` (pip)
- `environment.yml` (conda)
- A `%pip install` cell at the top (acceptable for one-off demos only)

Pin exact versions for `pandas`, `pyarrow` and `papermill`. This repo's own
`pandas` and `pyarrow` pins live under `prepared_core.python` in
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml); it has no
`papermill` pin, so choose one and pin it yourself.

### 12.5.4 Do-not-commit-outputs policy (enforced by the hook)

> ⚠️ **This step overwrites a committed file.** The repo already ships `.githooks/pre-commit` (`make setup-hooks` activates it). The `cat` block below replaces it with a variant that avoids `mapfile` (bash 4+), so `git status` will show the file as modified. When you're done, `git restore .githooks/pre-commit` puts the committed copy back (§12.7).

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

Now any `git commit` that includes a notebook runs the hook first. A commit
records what is **staged**, not what is on disk, so the hook strips the
notebook's outputs, re-stages it, and the cleaned copy is what gets
committed. Prove it with one practice commit.

**Practice commit.** Use the notebook from B.2 and B.3 (substitute its name if
you called it something else). Run everything from the repository root in
your Bash terminal. The commit goes on a throwaway branch, so `main` stays
clean for the next lab.

1. Run all the cells and save, then confirm the file really holds outputs.
   At least one number should be above `0`:

   ```bash
   jq -c '[.cells[] | select(.cell_type=="code") | .outputs | length]' my-explore.ipynb
   ```

2. Create the branch and stage **only** the notebook:

   ```bash
   git switch -c lab12-practice
   git add my-explore.ipynb
   ```

   Don't use `git add .` or `git add -A`. `git status` also lists the hook and
   `.gitattributes` edits you made in this lab as modified, and the `.venv`
   folder from §12.1 as untracked; none of them belongs in this commit.

3. Review what is staged. In the notebook's JSON a cell's code or text sits
   under `"source"` and its results under `"outputs"`; read both, and the
   markdown cells too, looking for tokens, keys, connection strings and IDs
   (press `q` to leave the pager when you're done):

   ```bash
   git diff --cached --no-ext-diff my-explore.ipynb
   ```

   If anything sensitive shows up, run `git restore --staged my-explore.ipynb`,
   remove it from the notebook, save, and stage it again.

4. Commit. The hook runs now:

   ```bash
   git commit -m "lab12 practice notebook"
   ```

5. Count the outputs in the **committed** copy. Every number should now be
   `0`:

   ```bash
   git show HEAD:my-explore.ipynb | jq -c '[.cells[] | select(.cell_type=="code") | .outputs | length]'
   ```

   The hook cleaned the file on disk too, so VS Code may offer to reload the
   notebook. If any number is still above `0`, the hook didn't run: check that
   `git config core.hooksPath` prints `.githooks` and that `jq --version`
   works.

**What the hook does, and what it doesn't.** It clears `outputs` and
`execution_count` on code cells, and nothing else. A token in a source cell or
a markdown cell, one sitting in the notebook's metadata, and one committed with
`git commit --no-verify` or while `core.hooksPath` is unset all go straight
into the commit. So treat the hook as a safety net for accidental output, not
as a guarantee that a secret can't leave your machine. The review in step 3 is
the other half (and B.4 shows how to keep a token out of the notebook in the
first place).

> 📎 **Optional reference — a different way to strip outputs (`nbstripout`).** Skip this on a first read; the practice commit above doesn't need it. If you'd rather strip outputs declaratively (as a `.gitattributes` filter) instead of via the pre-commit hook above, install `nbstripout` and let it write the `.gitattributes` block for you:
>
> ```bash
> pip install nbstripout
> nbstripout --install --attributes .gitattributes
> ```
>
> That appends `*.ipynb filter=nbstripout` and installs `nbstripout`'s clean/smudge filter configuration plus a diff text converter; it does not register a merge driver. Pick **one** strategy per repo — the pre-commit hook and the nbstripout filter both work, but stacking them produces double-strips on every commit and confuses `git diff`. The hook is preferred for this workshop because it lets you preview what's about to be stripped before it lands.

---

## 12.6 Wrap-up checklist

Tick every box that applies to your path. The Offline path skips the boxes
marked **(Live)**.

- [ ] **(Live)** Fabric MCP entry merged into the Copilot CLI config (A.1) **and** the VS Code config (B.1)
- [ ] **(Live)** Signed in with `az login` (at least Contributor on the workspace)
- [ ] Produced the per-region count and sum — from the lakehouse table (A.3, Live) or the Parquet fixture (A.4, Offline) — and used it for the A.5 summary
- [ ] Did a cell-level edit with inline chat in VS Code
- [ ] Did a cross-cell refactor with agent mode in VS Code, and the reader cell now reads from `input_parquet`
- [ ] `.gitattributes` updated with `*.ipynb diff=jupyternotebook`
- [ ] The `input_parquet` cell is the first cell of the notebook and `jq -c '.cells[0].metadata.tags' my-explore.ipynb` printed `["parameters"]`
- [ ] Pre-commit hook installed and verified with the §12.5.4 practice commit: outputs present before it, every count `0` in the committed copy
- [ ] Reviewed the staged notebook's source and markdown cells, not just its outputs, for tokens, keys and connection strings before committing

When every box that applies to your path is ticked, you've shipped the Fabric
workflow Prism (the Fabric Data Architect agent — see
[AGENTS.md](../AGENTS.md)) expects on every PR.

## 12.7 Cleanup

> 🛠️ **Lab 12 specifics — revert before the generic sweep below.**
>
> - **Fabric env vars (live path):** `unset FABRIC_AUTH_TOKEN FABRIC_TENANT_ID FABRIC_WORKSPACE_ID AZURE_TENANT_ID AZURE_TOKEN_CREDENTIALS` (PowerShell: `Remove-Item Env:FABRIC_AUTH_TOKEN, Env:FABRIC_TENANT_ID, Env:FABRIC_WORKSPACE_ID, Env:AZURE_TENANT_ID, Env:AZURE_TOKEN_CREDENTIALS -ErrorAction SilentlyContinue`). `FABRIC_AUTH_TOKEN` is the optional token the B.4 example reads; `FABRIC_TENANT_ID` and `FABRIC_WORKSPACE_ID` are informational values your `fabric` config passes through; `AZURE_TENANT_ID`/`AZURE_TOKEN_CREDENTIALS` pin the server to your `az login` session. Run `az logout` too if you want to clear that session.
> - **Pre-commit hook:** if §12.5.4 set `core.hooksPath` to `.githooks`, revert with `git config --unset core.hooksPath` (or restore your previous value if you had one). `.githooks/pre-commit` is a committed repo file, so don't delete it; if you ran the §12.5.4 `cat` block, `git restore .githooks/pre-commit` puts the committed copy back.
> - **`.gitattributes` edits:** if you added the notebook/parquet rules from §12.5.1 only to try them, `git checkout -- .gitattributes` returns the file to its committed state. The repo already ships `*.parquet binary`, so you can leave that even if you remove the notebook rules.
> - **Offline fixtures stay committed.** `labs/fixtures/lab12/sales.parquet` is **part of the repo** — do not delete it. Any *additional* `*.parquet` files you generated (e.g. `sales-2.parquet`) sit in the directory but are git-ignored; remove them with `git clean -fdX -- labs/fixtures/lab12/` if you want a pristine fixtures dir without touching the canonical file.
> - **Notebook from B.2 and the §12.5.4 practice branch:** the `lab12-practice` branch and its one commit exist only on your machine; nothing was pushed. If you want to keep `my-explore.ipynb`, copy it out of the repo first. Then switch back with `git switch main` (or whichever branch you started on) and delete the practice branch with `git branch -D lab12-practice` (capital `-D`, because the branch was never merged). Because that commit is the only place the notebook is tracked, switching away also removes it from the working folder. If Git refuses to switch because you saved changes to the notebook after the practice commit, copy it out, run `git restore my-explore.ipynb`, and switch again. If you skipped §12.5.4, the notebook you created is still untracked: delete it if you don't want it, and `git status --short` stops listing it. None of this applies if you worked in a notebook that was already tracked in the repo before the lab — that one stays where it was; just undo any edits you don't want to keep.
> - **MCP config:** if you merged the `fabric` block into `~/.copilot/mcp-config.json`, `.vscode/mcp.json` or your VS Code user-profile MCP configuration (Command Palette → **MCP: Open User Configuration**) and want to remove it, edit the file and delete just that entry (plus the `fabric-workspace-id` input in the VS Code files) — not the whole `mcpServers` (Copilot CLI) or `servers` (VS Code) object.

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
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or a
   workspace `.mcp.json`. If you stashed the original, restore it now.
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
