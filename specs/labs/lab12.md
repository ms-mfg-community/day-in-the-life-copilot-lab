# Lab spec — `labs/lab12.md`

| | |
|---|---|
| **Lab** | `labs/lab12.md` (31.8 KB) — "Fabric MCP with Copilot CLI & VS Code" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13, batch lab05/08/09/11/12) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 12 takes MCP into the data plane: it wires the **local/OSS `@microsoft/fabric-mcp`**
server into both Copilot CLI and VS Code, enumerates lakehouses (or a committed Parquet
fixture on the offline path), does cell-level and cross-cell notebook work in VS Code, and
closes with four notebook-hygiene conventions that make a `.ipynb` reviewable like code. The
teaching idea is that a notebook becomes reviewable when you give it a structured diff,
parameterize it, pin its environment and refuse to commit its outputs.

After the refresh the lab teaches the same thing with **a navigable structure** — today it has
an unnumbered section, two sections both numbered `A.3`, and a gap where `12.3` and `12.4`
should be — **every path it tells a learner to open actually on disk**, no dangling citation
to registry data that does not exist, no unsourced vendor numbers, and a declared duration in
the same order of magnitude as the work. No exercise is added or removed; both the Live and
Offline paths stay.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — Part A is Copilot CLI, Part B is VS Code (inline chat and agent mode), §12.5 is git/shell. Neither part alone covers the lab. |
| **Tier** | `advanced` |
| **Presenter minutes** | 8 (unchanged) |
| **Self-paced minutes** | **30 → 75.** See D7. This is the largest correction in the batch and the lab most like Lab 10 was: a factor-of-two-plus understatement on an advanced lab with an `az login`, two MCP config merges, two editors, a `pip install` and a git-hook install. |
| **Prerequisites** | **Lab 05** (hard — §A.1 and §B.1 assume the learner can merge an entry into an MCP config and knows `local`/stdio vs `http`). **Lab 11** is explicitly *not* a hard prerequisite and the lab already says so at §12.1 — keep that honest framing. Plus the real tooling floor already in §12.1: `node` ≥ 20, `jq`, `python3` ≥ 3.11 with `pandas`/`pyarrow`, and for the Live path an `az`-authenticated Fabric tenant with **Contributor** on a workspace. |
| **Write steps** | **Yes — the heaviest in the batch, and several mutate committed state.** §12.2's heredoc **overwrites the committed `labs/fixtures/lab12/sales.parquet`**. §12.5.1 runs `git config diff.jupyternotebook.command` / `merge.jupyternotebook.driver` and edits `.gitattributes` (committed). §12.5.4 writes `.githooks/pre-commit` and sets `git config core.hooksPath`. §A.1/§B.1 merge entries into `~/.copilot/mcp-config.json` and `.vscode/mcp.json`. §A.2 runs `az login` (**interactive browser auth against a real tenant**) and mints a Fabric access token. §12.5.1 suggests `pip install 'nbdime>=4'` and `pip install nbstripout` (**global installs**). §12.7 runs `rm -rf ~/scratch/` and `git clean -fdX`. |

> **`lab-forge` verdict: `run with §7 fenced`, and the fence is load-bearing.** The
> commissioned edit is structural and textual — renumbering, path fixes, cut claims,
> frontmatter. The run gate must execute **nothing** in §7. Two items would do real damage if
> executed: §12.2 silently overwrites a committed binary fixture that
> `tests/lab-structure/lab12-fixture-exists.test.ts` pins, and §12.5.4 redirects
> `core.hooksPath` for the whole repository. This is the Lab 10 lesson in a worse form — read
> the commands, do not trust a keyword count.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | Every `##`-level section outside a code fence carries a `12.N` number, and no two share one | `npx vitest run tests/lab-structure/lab12-contract` |
| AC5 | Every `###`-level Part A/Part B section carries a unique `A.N`/`B.N` number — the duplicate `A.3` is gone | `npx vitest run tests/lab-structure/lab12-contract` |
| AC6 | Every backticked repo-relative path resolves on disk — excluding the two the learner creates (`.vscode/settings.json`, `.vscode/mcp.json`) — and in particular `labs/fixtures/lab12/explore.ipynb` either exists or is no longer cited | `npx vitest run tests/lab-structure/lab12-contract` |
| AC7 | The lab asserts no numeric Fabric rate-limit or back-off figure it does not source | `npx vitest run tests/lab-structure/lab12-contract` |
| AC8 | The lab claims the registry documents something only if the registry has a key for it — specifically, "Fabric's runtime versions are documented in the registry" is gone unless such a key exists | `npx vitest run tests/lab-structure/lab12-contract` |
| AC9 | The lab does not instruct a learner to check out `feature/modernize` | `npx vitest run tests/lab-structure/lab12-contract` |
| AC10 | The offline Parquet fixture still ships and still carries the four columns the lab's snippets read | `npx vitest run tests/lab-structure/lab12-fixture-exists` |
| AC11 | The Fabric MCP config shape the lab shows still matches the committed configs | `npx vitest run tests/mcp-configs/fabric-config-shape` |
| AC12 | Frontmatter `pace.self_paced_minutes` equals registry `labs.lab12.pace_self_minutes`, and the inline `⏱️` callout states the same number | `npx vitest run tests/lab-structure/lab12-contract` |
| AC13 | The currency block is byte-identical to `docs/_partials/currency.md`'s body — no inline drift | `npx vitest run tests/lab-structure/lab12-contract` |
| AC14 | §12.2 warns that re-running the generator overwrites the committed fixture | `npx vitest run tests/lab-structure/lab12-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | "Fabric's runtime versions are documented in the registry — see `docs/_meta/registry.yaml`" (§12.5.3, L505–507) | `free-check` → **dangling citation, cut it** | `Select-String -Path docs/_meta/registry.yaml -Pattern 'runtime'` → **0 matches**. The registry documents no Fabric runtime versions. This is the Lab 10 D2 defect exactly: a citation pointing at a file that does not contain the claim. Either delete the sentence or replace it with the advice that already stands on its own ("pin exact versions for pandas, pyarrow, papermill"). |
| C2 | "The Fabric REST API enforces per-tenant 429s — typically ~200 requests/minute per workspace"; "back-offs exponentially (1s → 2s → 4s, capped at 30s)" (L292) | `cut` | Two vendor-attributed numeric claims with no source in the file: a rate limit and an internal retry schedule. Same class as Lab 10's C2 cost multipliers, same disposition. Keep the shape — 429s happen, the server honours `Retry-After`, prefer one wide query over fifty narrow ones — and delete the numbers. |
| C3 | Two distinct Fabric MCP surfaces exist; this lab uses the local/OSS `@microsoft/fabric-mcp`; the remote Fabric Core MCP Server is at `https://api.fabric.microsoft.com/v1/mcp/core`, Entra ID + RBAC, public preview since March 2026 (§12.0) | `free-check` → keep, and cite | `docs/_meta/registry.yaml` `mcp_servers` → `fabric.note` states all of it: the local variant, the GitHub source path, the remote endpoint URL, Entra ID auth + RBAC, "public preview since 2026-03", and the instruction that "Lab 12 should make explicit which variant each exercise uses." The lab already does. Add the registry cite so the fact has one home. |
| C4 | The pinned server is `@microsoft/fabric-mcp` and `server start --mode all` is required for the live tools to load (§A.1) | `free-check` | Registry pins `fabric` to `1.1.0`, `npm_package: "@microsoft/fabric-mcp"`, with the inline note "1.1.0 verified live 2026-06-15 (28 tools, `server start --mode all`)". Cross-check the `args` array against `mcp-configs/copilot-cli/individual/fabric.json` and `mcp-configs/vscode/individual/fabric.json`; `tests/mcp-configs/fabric-config-shape.test.ts` already pins the shape. |
| C5 | The multi-tenant trap: `DefaultAzureCredential` falls back to interactive browser auth against the home tenant; `AZURE_TOKEN_CREDENTIALS=AzureCliCredential` + `AZURE_TENANT_ID` are both required (§A.1) | `free-check` → keep | Load-bearing, field-derived, and settled in-repo: both committed Fabric configs carry `AZURE_TOKEN_CREDENTIALS: "AzureCliCredential"`. The lab's own framing ("read this if you're a Microsoft employee") is honest about where it comes from. Keep verbatim. |
| C6 | `onelake_list_tables`/`onelake_get_table` require a `namespace`, `dbo` for a standard lakehouse, else `400 "Namespace is required."` (§A.3) | `free-check` → keep | Specific enough to be a recorded observation rather than a guess, and it is operationally load-bearing — without it the learner's first table call fails. Confirm the tool names against the committed config's declared toolset if it enumerates them; otherwise keep as a field note. |
| C7 | The server has **no single-cell execution tool**; running a notebook is a job submission to `.../jobs/RunNotebook/instances` (§A.3) | `free-check` → keep | Load-bearing: it is the reason Part B exists. Consistent with the registry's "28 tools" note. Keep. |
| C8 | nbdime 4.x ships both `git-nbdiffdriver` and `git-nbmergedriver`; 3.x ships only the diff driver (§12.5.1) | `cut` the version comparison, keep the `>=4` pin | A package-internals claim with no source. The actionable half — `pip install 'nbdime>=4'` — survives on its own. Delete the 3.x-versus-4.x sentence. |
| C9 | "This repo cloned with the `feature/modernize` (or `main`) branch checked out" (§12.1, L117) | `free-check` → **cut** | `feature/modernize` exists as a local and remote branch, so the claim is not false — but instructing a learner onto a development branch as a prerequisite is wrong, and it will rot. `main` is the answer. Delete the `feature/modernize` half. |

**Research required: none.** The two genuinely external claims (C2's rate limits, C8's nbdime
internals) are both incidental and both get cut — which is cheaper and better teaching than
verifying them.

## 5. Non-goals

- **Do not edit `docs/_partials/currency.md`.** The currency block is an `@include`; 10 labs
  share it. AC13 exists to stop an inline "fix" of its stale `Shift+Tab`/`<tier-or-id>`
  wording, which would be re-synced away. Repo-wide pass, not this lab.
- **Do not regenerate or modify `labs/fixtures/lab12/sales.parquet`.** It is committed, it is
  pinned by `tests/lab-structure/lab12-fixture-exists.test.ts` (magic bytes, size bounds and
  four column names), and §12.2's snippet overwrites it. AC10 is the fence.
- **Do not edit `.gitattributes`.** The `*.parquet binary` rule is pinned by
  `tests/lab-structure/gitattributes-parquet-binary.test.ts` and §12.5.1 tells the learner to
  add rules to it. The lab describes an edit the learner makes in their own checkout.
- **Do not remove either path.** The Live/Offline split is the lab's accessibility design and
  the Offline path is the Codespaces story.
- **Do not merge Lab 12 into Lab 05.** Lab 05 is in this same batch and is being refreshed
  standalone; Lab 12 is the data-plane application of it, not a duplicate.
- Do not restructure Part A / Part B into numbered `12.3` / `12.4` sections. AC4 asks for the
  unnumbered **currency** heading to be numbered and for `##` numbers to be unique — the
  Part A/Part B device is deliberate and stays. If numbering `12.3`/`12.4` onto the Parts is
  the cleanest fix, that is acceptable; renaming or merging the Parts is not.
- Do not change `pace_presenter_minutes` or `pace_workshop_minutes` — only `pace_self_minutes`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab12.md:385` | §B.2 step 1 says "Open `labs/fixtures/lab12/explore.ipynb` (Live path)". **The file does not exist.** Verified: `Test-Path labs/fixtures/lab12/explore.ipynb` → `False`. The only committed fixture is `sales.parquet`. Every Live-path learner hits a file-not-found at the first step of Part B. Either ship the notebook or rewrite the step to create one. |
| D2 | `labs/lab12.md:248` and `:294` | **Two sections both numbered `A.3`** — "A.3 Live Fabric: enumerate lakehouses and run a cell" and "A.3 (Offline path) Same steps, against the Parquet fixture". §A.2 then cross-references "the curl smoke-test in A.3" ambiguously, and §A.1 does too. Renumber the offline one. |
| D3 | `labs/lab12.md:42` | `## Copilot CLI currency (2026 refresh)` is the only unnumbered `##` in the file; every sibling is `12.0`–`12.7`, and every other lab in the curriculum numbers this section (`5.0`, `8.0`, `9.0`, `11.0`). There is also a numbering **hole**: the file goes `12.2` → Part A → Part B → `12.5`, so `12.3` and `12.4` do not exist. |
| D4 | `labs/lab12.md:505–507` | "Fabric's runtime versions are documented in the registry" — the registry contains zero `runtime` keys. Dangling citation; see C1. |
| D5 | `labs/lab12.md:292` | Unsourced `~200 requests/minute` rate limit and `1s → 2s → 4s, capped at 30s` back-off schedule. See C2. |
| D6 | `labs/lab12.md:117` | Prerequisite table tells the learner to check out `feature/modernize`. A development branch has no business in a learner prerequisite. See C9. |
| D7 | frontmatter + `⏱️` callout + registry `labs.lab12.pace_self_minutes` | Declared 30 self-paced minutes. Derived: §12.0–§12.1 read and tool checks (5–7) + §12.2 generate the fixture (3–4) + §A.1 merge the CLI MCP entry (4–5) + §A.2 `az login`, possibly tenant-scoped, export five vars (6–10) + §A.3 live enumeration, plus the namespace and rate-limit asides (8–12) + §A.3 offline (5–6) + §A.4 (3) + §B.1 merge the VS Code entry (4–5) + §B.2 open a notebook, pin the interpreter, inline chat (8–12) + §B.3 agent-mode refactor (6–8) + §B.4 (3) + §12.5.1 `pip install nbdime`, two `git config` (5–7) + §12.5.2–§12.5.4 the hook install and verification (8–10) + §12.6 checklist (2) = **70–95**. Set 75. |
| D8 | `labs/lab12.md:131–160` (§12.2) | The heredoc writes `labs/fixtures/lab12/sales.parquet` — a **committed** file — and the prose below it says the canonical file "is **committed** to the repo … Regenerate it any time with the snippet above." It never says that regenerating dirties the working tree against a file a committed test pins. One sentence fixes it. AC14. |
| D9 | §12.5.1 | Offers two mutually-exclusive strategies (the pre-commit hook in §12.5.4 and the `nbstripout` filter) and correctly says "pick one" — but the `nbdime` 3.x-vs-4.x sentence is an unsourced package-internals claim riding along. See C8. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them. The first two will
damage the working tree if run:

- §12.2 — the `python3 - <<'PY' … PY` heredoc. **Overwrites the committed `labs/fixtures/lab12/sales.parquet`.** Also `python3 scripts/generate-lab12-fixture.py`.
- §12.5.4 — writing `.githooks/pre-commit`, `chmod +x`, and `git config core.hooksPath .githooks`. **Redirects git hooks for the whole repository.**
- §12.5.1 — `git config diff.jupyternotebook.command`, `git config merge.jupyternotebook.driver`, `pip install 'nbdime>=4'`, `pip install nbstripout`, `nbstripout --install --attributes .gitattributes` (**writes to a committed file**).
- §A.1 / §B.1 — merging the `fabric` entry into `~/.copilot/mcp-config.json` (outside the tree) and `.vscode/mcp.json`.
- §A.2 — `az login` (**interactive browser auth against a real tenant**), `az account show`, `az account get-access-token`, `az keyvault secret show`.
- §A.3 — every `/agents fabric` prompt and every live MCP/OneLake call; the `curl` smoke test.
- §A.3 (offline) — the two `python3 -c` snippets. Read-only, but they require `pandas`/`pyarrow` in the run environment; report UNVERIFIED rather than installing anything.
- §B.2–§B.4 — all VS Code inline-chat and agent-mode steps (**GUI**), `jupyter notebook --generate-config`, and editing `.vscode/settings.json`.
- §12.7 — `rm -rf ~/scratch/`, `git clean -fdX -- labs/fixtures/lab12/`, `git checkout -- .gitattributes`, `az logout`, and the `unset`/`Remove-Item Env:` block.
