# Lab spec — `labs/lab01.md`

| | |
|---|---|
| **Lab** | `labs/lab01.md` (229 lines) — "Exploring Copilot Configuration" |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 |

---

## 1. Target state

After this lab a learner can name every Copilot customization surface the repo ships, say
where each one lives and how many there are, and explain that Copilot **combines** the
instruction sources that apply rather than ranking them. The single teaching idea is *"the
configuration is just files, and you can read them."*

This is a currency and correctness pass. The plugin-marketplace section, the CLI-currency
table, the configuration map and the "Try it" step all stay; what changes is that every
count, command and claim in them is true against the repo and the installed CLI today.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — `copilot plugin …`, `copilot --agent … --prompt …`, plus reading files in the repo. Nothing here needs VS Code. |
| **Tier** | `beginner` |
| **Presenter minutes** | 4 (unchanged) |
| **Self-paced minutes** | 10 (unchanged — see §5) |
| **Prerequisites** | Setup complete: `copilot --version` answers and the learner is logged in (`labs/setup.md`). The lab declares none today; §1.4 calls `copilot` and §1.0 installs a plugin. |
| **Write steps** | **Yes, one family.** `copilot plugin install <source>` writes into the learner's `~/.copilot/` (outside the repo). `copilot` (interactive) and `copilot --agent … --prompt …` call a model. A person rehearses these; `lab-forge` must not execute them. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The five CLI-capability markers and the registry reference are still present | `npx vitest run tests/content-currency/cli-commands-current` |
| AC5 | Every count in the §1.1 map (agents, skills, prompts, instructions, workflows, MCP servers, hook events) equals what is on disk | `npx vitest run tests/lab-structure/lab01-contract` |
| AC6 | The §1.2 table has no numbered priority ranking, and the section says the sources are combined | `npx vitest run tests/lab-structure/lab01-contract` |
| AC7 | No install command names `github/awesome-copilot` as a plugin repo; the worked example is `awesome-copilot@awesome-copilot`, which the CLI's own marketplace listing contains | `npx vitest run tests/lab-structure/lab01-contract` (+ `copilot plugin marketplace browse awesome-copilot`) |
| AC8 | No `/plugin-name` invocation form remains | `npx vitest run tests/lab-structure/lab01-contract` |
| AC9 | The plan/autopilot row names `/autopilot`; the `/model` row no longer says `<tier-or-id>` and still points at the registry | `npx vitest run tests/lab-structure/lab01-contract` |
| AC10 | A setup prerequisite links `setup.md` before the first `##` heading | `npx vitest run tests/lab-structure/lab01-contract` |
| AC11 | The code-intelligence table no longer says "(GA)" or "(seconds)", and still names both LSP config paths | `npx vitest run tests/lab-structure/lab01-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | `copilot plugin marketplace list` / `browse awesome-copilot`, `plugin install owner/repo`, `plugin@marketplace`, `plugin list` | `free-check` | `copilot plugin --help`, `… marketplace --help`, `… install --help` (1.0.96): all verbs exist; `awesome-copilot` is the built-in marketplace. Correct. |
| C2 | `copilot plugin install github/awesome-copilot` is "the most reliable method" and "safe to install now" | `free-check` — **FALSE** | `gh api repos/github/awesome-copilot/contents` has no root plugin manifest; it holds `.github/plugin/marketplace.json`, i.e. it is a *marketplace*. A plugin named `awesome-copilot` does exist **inside** it (`browse` output), so `awesome-copilot@awesome-copilot` is the working form. Install was **not** executed (§7). |
| C3 | "Concrete worked example used later in Lab 11" | `free-check` — **FALSE** | `labs/lab11.md:192` uses `github/awesome-copilot` as a marketplace *source*, not an installed plugin. Cut the sentence. |
| C4 | Instructions have a 1–6 "Priority" and load in that order | `free-check` — **CONTRADICTED** | GitHub Docs *Adding custom instructions for Copilot CLI*, opened 2026-10-12: Copilot "combines their instructions … but does not define a general precedence order between these files. Avoid conflicting instructions." Path-specific files load only when `applyTo` matches. `/instructions` lists and toggles the discovered files. |
| C5 | Plugins are invoked as `/plugin-name …` | `free-check` — **unsupported** | `copilot help commands` lists `/plugin` (manage), `/agent`, `/skills`; no `/<plugin-name>` form. Plugins contribute agents, skills, hooks, MCP and LSP servers (`copilot plugin --help`). Reword to what they contribute. |
| C6 | `/fleet`, `/model`, `/plugin`, `extensions_manage` | `free-check` | `copilot help commands`: `/fleet` "parallel subagent execution", `/model` selects a model **or `auto`** (no "tier" argument), `/autopilot` toggles autopilot, `/plan` exists. `extensions_manage` is a model-side tool, as the lab says. |
| C7 | "Plan mode … vs autopilot mode" with `Shift+Tab` | `free-check` | `--plan` / `--autopilot` flags and `/plan` / `/autopilot` exist. Autopilot is a toggle, not a default. Name the commands. |
| C8 | Counts: 3 agents, 6 skills, 19 prompts, 4 instructions, 4 hook events, 4 MCP servers, **3 workflows** | `free-check` | Disk: `.github/agents` 3, `.github/skills` 6, `.github/prompts` 19, `.github/instructions` 4, `.github/hooks/default.json` 4 events, `.copilot/mcp-config.json` 4 servers, `.github/workflows/*.md` **4** (`code-review`, `generate-prd`, `self-improving-agents`, `weekly-content-audit`). Only workflows is wrong. |
| C9 | LSP: project `.github/lsp.json`, personal `~/.copilot/lsp-config.json`, Copilot prefers LSP "automatically" | `free-check` | GitHub Docs *Using LSP servers with Copilot CLI*, opened 2026-10-12: both paths, plugin configs between them, and "uses them automatically". Correct. The docs never say "GA" — that word is Lab 15's claim, not this lab's to make. |
| C10 | Semantic index is "near-instant (seconds)" | `cut` | The docs attribute "near-instant" to LSP indexing, not to a semantic index. Drop the parenthetical and the speed claim. |
| C11 | Six reference links under *References* and two under plugins | `free-check` | All eight returned HTTP 200 on 2026-10-12. |
| C12 | `copilot --agent planner --prompt … --allow-all-tools` | `free-check` for the flags; **parked** for the advice | `copilot --help`: `--agent`, `-p/--prompt`, `--allow-all-tools` exist. Whether a first lab should teach blanket tool approval for a read-only planning question is a safety/product question — see §5. |

## 5. Non-goals

- Do not change pacing (`presenter_minutes: 4`, `self_paced_minutes: 10`) or the registry's `lab01` pace rows. If a gate reports the 10 is wrong, that finding is **recorded, not fixed**.
- Do not renumber sections. The `1.0a` / `1.0` / `1.1` order is cosmetic and `#11-the-configuration-ecosystem` is linked from inside the lab.
- Do not add or remove a section, a table, or a plugin command. Do not add WinGet/Brew/other install paths.
- Do not change `--allow-all-tools` in §1.4 (C12). Recorded for John; teaching a narrower approval flag is a design change.
- Do not keep `/fleet`, `/model`, plan/autopilot, `extensions_manage` or the registry reference out of the lab — AC4 requires them.
- Do not edit any file other than `labs/lab01.md`, this spec and `tests/lab-structure/lab01-contract.test.ts`. No other lab, no registry, no `AGENTS.md`, no other test.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §1.2 table (~lines 150–160) | "Priority 1–6" ranking contradicts the docs (C4). Replace the Priority column with "Scope"; say the sources are **combined**, not ranked, that path files need an `applyTo` match, and mention `/instructions`. Keep the "cascade and stack" key insight. |
| D2 | §1.1 table, `.github/workflows/*.md` row | Count `3` → `4` (C8). |
| D3 | §1.0 "Install a plugin" (~lines 65–70) | `github/awesome-copilot` presented as an installable plugin repo and as "most reliable" (C2); "used later in Lab 11" (C3). Use `awesome-copilot@awesome-copilot`; keep the owner/repo form as the *generic* line only (`OWNER/REPO`). |
| D4 | §1.0 "Use the plugin" (~lines 85–95) | `/plugin-name help me …` (C5), interactive and `--prompt` forms. Reword around what a plugin contributes (agents → `/agent` or `--agent`, skills → `/skills`). |
| D5 | §1.0a table, plan/autopilot row | Name `/plan` and `/autopilot`, keep `Shift+Tab` (C7). Keep the literal phrases "plan mode" and "autopilot mode". |
| D6 | §1.0a table, `/model` row | `/model <tier-or-id>` — `/model` takes a model id or `auto` (C6). Say: pick an id from the registry's `models.cheap` / `models.premium`. |
| D7 | Top of the lab | No prerequisite despite needing an installed, authenticated CLI (§2). Add one line before the first `##` heading linking `setup.md`. |
| D8 | §1.3 table | "(GA)" on the LSP row and "(seconds)" on semantic indexing (C9, C10). |

## 7. Out of scope for `lab-forge`

**None of §2's write or model-calling steps may be executed by any stage.** The run gate
reports each UNVERIFIED — not "could not run":

- `copilot plugin install …`, `copilot plugin uninstall/update/enable/disable`, `copilot plugin marketplace add/remove`;
- interactive `copilot`, and any `copilot -p` / `copilot --prompt` / `copilot --agent` invocation (these call a model and may use tools);
- `/plugin …`, `/fleet`, `/model`, `/autopilot` typed into any session;
- every GitHub-side write.

**May** be executed, because they are read-only and local: `npm test`, the vitest
invocations in §3, `copilot --version`, `copilot --help`, `copilot help commands`,
`copilot plugin --help` and its subcommand `--help`, `copilot plugin list`,
`copilot plugin marketplace list`, `copilot plugin marketplace browse awesome-copilot`,
`gh api repos/github/awesome-copilot/contents`, and plain file reads.

> There is no sandbox. `lab-forge` runs in the live working tree (`loop.mjs:889`); this
> section is the only thing between a green run and a plugin installed into the
> maintainer's real `~/.copilot/`.
