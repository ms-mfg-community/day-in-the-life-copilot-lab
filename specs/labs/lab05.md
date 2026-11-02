# Lab spec — `labs/lab05.md`

| | |
|---|---|
| **Lab** | `labs/lab05.md` (11.3 KB) — "MCP Server Configuration" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13, batch lab05/08/09/11/12) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 05 teaches what an MCP server is, how the two transports differ (`local` stdio
subprocess vs `http` remote URL), how to read and extend `~/.copilot/mcp-config.json`, and —
the lab's single teaching idea — that **MCP gives you live tools, not memory**: cross-session
persistence in this repo is plain markdown the agent maintains itself, not a knowledge-graph
server.

After the refresh the lab teaches exactly the same thing, but **the server list it prints is
derived from `docs/_meta/registry.yaml` instead of being a hand-maintained count that has
drifted**, its CLI-currency table agrees with the two already-refreshed labs that carry the
same table (`lab01`, `lab07`) instead of contradicting them, it tells the learner how to undo
the two things it mutates, and its declared self-paced time is one a learner can actually hit.
No section is added or renamed. This is a currency and honesty pass, not a rewrite.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — the lab runs `copilot`, reads and edits `~/.copilot/mcp-config.json`, and restarts the CLI twice. Not drivable from VS Code Copilot alone. |
| **Tier** | `intermediate` |
| **Presenter minutes** | 3 (unchanged — registry `lab05.pace_presenter_minutes: 3`) |
| **Self-paced minutes** | 15 — **under review. Derived estimate ≈30**, see D6. This is a guideline for the editing stage, *not* a floor: the teachability gate re-derives duration from the material and its number wins. The contract test asserts only that frontmatter, registry and the inline callout agree. |
| **Prerequisites** | **Lab 01** (it establishes `~/.copilot/` layout and the CLI-currency table this lab repeats) and **Lab 02** (§5.3 reads `.github/instructions/lessons.instructions.md`, which Lab 02 introduces). Lab 10 is *referenced forward*, not a prerequisite. |
| **Write steps** | **Yes — outside the working tree, and inside it.** §5.2/§5.4 run `copilot` and open `~/.copilot/mcp-config.json` in an editor; §5.4 adds a server entry there and restarts the session. §5.3 step 2 has the agent **append to `.copilot/lessons/log.md`, a git-tracked file in this repo**. §5.4 step 5 fetches a URL over the network. |

> **`lab-forge` verdict: `run with §7 fenced`.** The edit this spec commissions is prose,
> table and frontmatter work that needs no execution. The run gate must report every §7 item
> UNVERIFIED and execute none of them. The Lab 10 precedent applies: a keyword scan would miss
> the `.copilot/lessons/log.md` append because it is a *prompt*, not a shell command.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The lab still names all five current CLI capabilities and still references the registry | `npx vitest run tests/content-currency/cli-commands-current` |
| AC5 | §5.1 names no MCP server that `docs/_meta/registry.yaml` `mcp_servers:` does not list | `npx vitest run tests/lab-structure/lab05-contract` |
| AC6 | The lab states no hardcoded server count ("ships with 6 MCP servers"); if it states a count at all, it equals `mcp_servers.length` | `npx vitest run tests/lab-structure/lab05-contract` |
| AC7 | §5.0's "Plan mode vs autopilot mode" row names `/plan` **and** `/autopilot`, matching `labs/lab01.md` and `labs/lab07.md` | `npx vitest run tests/lab-structure/lab05-contract` |
| AC8 | §5.0's "Mid-session model switch" row does not use the `<tier-or-id>` form — tier names are registry keys, not `/model` arguments | `npx vitest run tests/lab-structure/lab05-contract` |
| AC9 | The lab contains a cleanup section that names **both** things it mutates: `~/.copilot/mcp-config.json` and `.copilot/lessons/log.md` | `npx vitest run tests/lab-structure/lab05-contract` |
| AC10 | Frontmatter `pace.self_paced_minutes` equals registry `labs.lab05.pace_self_minutes`, and the inline `⏱️` callout states the same number | `npx vitest run tests/lab-structure/lab05-contract` |
| AC11 | Every backticked repo-relative path in the lab resolves on disk | `npx vitest run tests/lab-structure/lab05-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | "This repository ships with 6 MCP servers (kept in sync with `registry.yaml` `mcp_servers:`)" (L66) | `free-check` | `docs/_meta/registry.yaml` `mcp_servers:` has **7** entries; the lab lists 6, omitting `filesystem`. **The defect is the sync claim, not the omission.** The registry pins `filesystem` as "Prepared core only; restricted to this checkout's synthetic fixture directory" — it is not a server a learner gets, so dragging it into a learner-facing table would make the lab *less* accurate. Cheapest correct fix: **delete the count and soften "kept in sync with `mcp_servers:`" to a pointer** ("see `mcp_servers:` for pins"). A third list exists at `mcp-configs/copilot-cli/individual/` (5 files: azure-mcp, context7, fabric, microsoft-learn, sequential-thinking) and matches neither — worth one sentence, not a reconciliation. |
| C2 | MCP revision `2026-07-28` removed protocol sessions, the `initialize` handshake and `Mcp-Session-Id`; `server/discover` replaces negotiation (§5.0, §5.3) | `free-check` | `docs/_meta/registry.yaml` `mcp_protocol_spec_version: "2026-07-28"` plus its comment block, which names exactly these breaking changes. Already consistent. Keep; no change. |
| C3 | `Shift+Tab` is the plan-mode surface and "autopilot mode" is the ambient state (L44) | `free-check` | Contradicted *inside this repo* by two already-refreshed labs: `labs/lab01.md:35` and `labs/lab07.md:47` both say `/plan` or `Shift+Tab` for plan mode, `/autopilot` to toggle, and "Autopilot is a toggle you switch on — it is not the default." Lab 05 is the stale one. |
| C4 | `/model <tier-or-id>` (L45), i.e. a registry tier name is a valid `/model` argument | `free-check` | `labs/lab07.md:48`: "`/model MODEL-ID` (or `/model auto`) … The tier names are registry keys, not `/model` arguments." The `lab07` contract test already bans `tier-or-id` in that lab (`tests/lab-structure/lab07-contract.test.ts`, AC6). |
| C5 | `@kazuph/mcp-fetch` is an installable fetch MCP server (L223) | `free-check` | Present in `mcp-configs/copilot-cli/CATALOG.json` as `fetch`, pinned there to `@kazuph/mcp-fetch@1.6.2`. The lab's unpinned form is acceptable for a teaching example; **cite the catalog** so the example has a home in the repo. No version claim to verify. |
| C6 | `tools: ["*"]` exposes all tools from a server; it can be narrowed to named tools | `free-check` | `mcp-configs/copilot-cli/CATALOG.json` `_key_differences` states `tools` is required and is an array. Consistent. Keep. |
| C7 | Context7 exposes `resolve-library-id` and `query-docs` (§5.2, §5.5) | `free-check` | `.github/copilot-instructions.md` documents exactly this two-step call. Consistent. Keep. |

**Research required: none.** Every claim above is settled by a file in this repository.

## 5. Non-goals

- **Do not edit `docs/_partials/currency.md`.** Lab 05 deliberately carries its own inline
  currency table (as do `lab01`, `lab07`, `lab18`, `lab19`, `lab20`); 10 other labs include the
  shared partial. The partial still carries the superseded `Shift+Tab`/`<tier-or-id>` wording —
  that is a separate, repo-wide sync, not this lab's job. Touching it here changes 10 labs.
- Do not convert Lab 05 to use the shared partial. See above.
- Do not restructure, renumber or add sections. §5.3's "markdown, not a server" argument is
  the lab's thesis and stays where it is.
- Do not expand §5.3 into Lab 10's three-layer model. §5.3 exists to *point at* Lab 10.
- Do not change `pace_presenter_minutes` or `pace_workshop_minutes`. Only the self-paced
  figure is under review (D6), because only the workshop figure is budgeted against the
  4-hour ceiling in `tests/workshop/time-budget.test.ts`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab05.md:66` + the table at 68–75 | "ships with 6 MCP servers (kept in sync with `registry.yaml` `mcp_servers:`)" — the registry lists **7**. The lab asserts sync with a file it is out of sync with. **Fix the claim, not the table**: drop the count and point at `mcp_servers:` for pins rather than asserting the table mirrors it. Adding `filesystem` to the learner-facing table is *not* required and is probably wrong — the registry marks it prepared-core-only. |
| D2 | `labs/lab05.md:44` | Plan/autopilot row contradicts `lab01.md:35` and `lab07.md:47`, both already refreshed. Omits `/plan` and `/autopilot` entirely and implies autopilot is the ambient default. |
| D3 | `labs/lab05.md:45` | `/model <tier-or-id>` — the exact form `tests/lab-structure/lab07-contract.test.ts` bans in Lab 07. Teaches a learner to type a registry key at a prompt that will not accept it. |
| D4 | end of file (after "**Next:** Lab 06") | **No cleanup section at all.** The lab adds a `fetch` server to `~/.copilot/mcp-config.json` and has the agent append to the git-tracked `.copilot/lessons/log.md`, and tells the learner to undo neither. 9 labs carry `@include docs/_partials/cleanup.md`; the 8 already-refreshed labs do not, so **do not add the partial** — add a short, targeted revert block naming these two files only. |
| D5 | `labs/lab05.md:208–232` (§5.4) | The illustrative `mcpServers` block omits `memory` and `fabric`, so it silently disagrees with §5.1's own table two screens earlier. Either show `...` consistently or include every server §5.1 names. |
| D6 | frontmatter + `⏱️` callout + registry `labs.lab05.pace_self_minutes` | Declared 15 self-paced minutes. Rough derivation from the actual steps: read config (1) + 2 live Context7 queries (4–6) + inspect wiki, write a lesson, verify the append (5–7) + **full CLI restart and re-query** (3–5) + edit `mcp-config.json`, **second restart**, test the fetch server (6–10) = **≈25–35**. **This is an estimate, not a measurement, and not a gate.** Treat ≈30 as the suggested value; the teachability gate re-derives duration from the material and its number is the one that counts. Only `pace_self_minutes` moves — `pace_workshop_minutes` is budgeted against the 4-hour ceiling in `tests/workshop/time-budget.test.ts`. |
| D7 | `labs/lab05.md:223` | `@kazuph/mcp-fetch` is unpinned here but pinned to `@1.6.2` in `mcp-configs/copilot-cli/CATALOG.json`. Link the catalog entry so the example is anchored in the repo. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them:

- §5.1 step 1 — `cat ~/.copilot/mcp-config.json` (reads the maintainer's real config; harmless to read but out of the tree).
- §5.2 — `copilot` interactive session and both Context7 queries (network, live MCP).
- §5.3 step 2 — the prompt that **appends to `.copilot/lessons/log.md`**. This is a write to a *git-tracked file in this repository*. It is a prompt, not a shell command, so a keyword scan does not see it.
- §5.3 step 4 — `/exit` and restart.
- §5.4 steps 1–5 — `code ~/.copilot/mcp-config.json`, adding the `fetch` entry, restart, and the live `https://raw.githubusercontent.com/...` fetch.
