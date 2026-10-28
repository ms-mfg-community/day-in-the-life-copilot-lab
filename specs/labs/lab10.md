# Lab spec — `labs/lab10.md`

| | |
|---|---|
| **Lab** | `labs/lab10.md` (668 lines) — "Agent Memory: Personalities, Lessons, and Consolidation" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-10) |
| **Last updated** | 2026-10-10 |

---

## 1. Target state

Lab 10 teaches file-based agent memory in three layers — raw session sources, an
LLM-maintained markdown wiki under `.copilot/lessons/`, and the binding schema in
`AGENTS.md` and `.github/instructions/` — and shows promotion upward through them. The
teaching idea is that memory can be a file you can `cat`, diff, revert and commit rather
than a service you host.

After the refresh the lab teaches the same three layers, but **every model name, version
and tier it mentions comes from `docs/_meta/registry.yaml` rather than being written into
the prose**, and every claim it makes about the outside world is either cited or gone. No
new section is added and no layer is renamed; this is a currency pass, not a rewrite.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — the lab calls `copilot --prompt`, reads `~/.copilot/session-state/`, and writes `~/.copilot/lessons/`. It is not drivable from VS Code Copilot alone. |
| **Tier** | `advanced` |
| **Presenter minutes** | 5 (unchanged — frontmatter already declares it) |
| **Self-paced minutes** | 20 (unchanged) |
| **Prerequisites** | Lab 02 (instructions files) and Lab 04 (prompt files), because §10.3 extends an instructions file and §10.4 invokes a prompt file. Lab 14 is referenced but is *not* a prerequisite. |
| **Write steps** | **None that touch GitHub or install globally — but the lab writes outside the repository.** §10.2c `mkdir -p ~/.copilot/lessons`; §10.4b `copilot --prompt '/consolidate-lessons --scope both' --allow-all-tools`; §10.6 `rm -rf ~/.copilot/lessons`. See §7. |

> The write-step classification in the earlier plan called Lab 10 "no write step" from a
> regex that looked only for GitHub writes and global installs. That regex does not see
> home-directory mutation, and this lab creates, fills and deletes a directory in the
> maintainer's real `~/.copilot/`.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The lab still names all five current CLI capabilities and still references the registry | `npx vitest run tests/content-currency/cli-commands-current` |
| AC5 | Every model identifier appearing in `labs/lab10.md` also appears in the `models:` block of `docs/_meta/registry.yaml` | `npx vitest run tests/lab-structure/lab10-contract` |
| AC6 | `labs/lab10.md` contains no hardcoded cost multiplier or relative-price claim (`1/15×`, `30–40 % more expensive`, and similar) | `npx vitest run tests/lab-structure/lab10-contract` |
| AC7 | Every file path the lab cites in backticks resolves on disk | `npx vitest run tests/lab-structure/lab10-contract` |
| AC8 | The `models:` block of the registry names only models the installed CLI can serve | `copilot --help` model list, recorded in the PR body — **manual, see §4 C1** |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | The model lineup: `claude-opus-4.7`, `claude-sonnet-4.6`, `claude-opus-4.6`, `claude-haiku-4.5`, `gpt-5-mini` are the current tiers (lines 38–54) | `free-check` | Observable from the installed CLI's own model list, not a web search. `claude-opus-4.7`, `claude-sonnet-4.6` and `gpt-5.2` are no longer served. Fix the registry first, then have the lab cite it. |
| C2 | Relative cost: cheap tier is "≈ 1/15×" of Opus 4.7; "Opus 4.7 is roughly 30–40 % more expensive per token than 4.6" (lines 49–54) | `cut` | Vendor-attributed numbers with no source in the file. No published per-token price table is cited and none is linked. Delete the multipliers; keep the ordering ("cheap / standard / premium") which the registry does support. |
| C3 | "Andrej Karpathy observed that LLMs compound knowledge dramatically better when they maintain their own notes instead of re-deriving context on every session via retrieval" (lines 17–21) | `cut` or `research` | No source given. It is load-bearing framing for the whole lab, so either cite the primary source or restate it as the lab's own claim rather than an attributed one. **Cheapest correct move: restate without attribution.** |
| C4 | `AGENTS.md` is the binding Layer 3 schema and agents read the nearest file in the directory tree | `cite F-nn` | `specs/001-research-sota/memory.md` F63–F68. F66 covers nested discovery; F67 covers the conflict rule (closest file wins, explicit user prompts override). |
| C5 | MCP protocol revision taught is `2026-07-28` | `free-check` | `docs/_meta/registry.yaml` → `mcp_protocol_spec_version`. Already consistent; no change needed. |
| C6 | "Terminal UX refresh (confirmed GA, ~Aug 2026)": `/plugin`, `/mcp`, `/skills` are interactive dashboards | `free-check` | Lives in the shared partial, not this lab — see D6. Out of scope for this lab's edit. |

## 5. Non-goals

- Do not restructure the three-layer model or renumber any section.
- Do not add a fourth layer, a new exercise, or coverage of a knowledge-graph MCP server — the lab's thesis is that none is required.
- Do not edit `docs/_partials/currency.md`; it is shared (see D6).
- Do not change the declared pacing. The 5/20 split is not under review here.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | lines 44–54 | The model tier table hardcodes `claude-haiku-4.5`, `gpt-5-mini`, `claude-sonnet-4.6`, `gpt-5.4`, `claude-opus-4.6`, `claude-opus-4.7`. This directly contradicts the lab's own §10.0, which says "model tiers … live in the registry — labs reference it rather than hardcoding values." The lab contradicts itself on the same page. |
| D2 | line 51 | Claims `task`-tool sub-agent dispatches are pinned to `claude-opus-4.6` "per repo `copilot-instructions.md`". No such pin exists in `.github/copilot-instructions.md`. Dangling citation. |
| D3 | lines 38–41, 54 | Cost multipliers and the 4.7-vs-4.6 price comparison — see C2. |
| D4 | `docs/_meta/registry.yaml` `models:` | The registry itself is stale: `claude-sonnet-4.6`, `claude-opus-4.7`, `gpt-5.2`. Editing only the lab moves the staleness rather than removing it, and AC5 cannot pass against a stale registry. **Fix the registry in the same change.** |
| D5 | `AGENTS.md` line 86 | Also names `claude-opus-4.7` / `claude-haiku-4.5`. Same root cause; fix with D4 so the repo is internally consistent. |
| D6 | lines 63–89 | §10.0 is `@include docs/_partials/currency.md`, a partial included by **11 labs**. An inline edit here is wrong and will be re-synced away. Any §10.0 change belongs in the partial and is a separate, wider change. |
| D7 | `labs/lab10.md:907` | A learner-facing file contains `rm -rf ~/.copilot/lessons`. It is opt-in, guarded by a `.created-by-lab10` marker, and skips a pre-existing wiki — but `~/.copilot/lessons` does **not** exist on the maintainer's workstation, so the guard protects a stranger and not the maintainer. Recorded as a defect, not fixed: a destructive command in a learner file is a design choice for a later pass. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them. They mutate state
outside the repository working tree:

- §10.2c `mkdir -p ~/.copilot/lessons` and anything that writes into it.
- §10.4b `copilot --prompt '/consolidate-lessons --scope both' --allow-all-tools` — spawns a nested agent session with every tool pre-approved.
- §10.6 `rm -f`/`rm -rf ~/.copilot/lessons` — deletes from the maintainer's home directory.
- Any `/consolidate-lessons` invocation, dry run or not.

> `~/.copilot/lessons/` does not currently exist on this workstation, so creating and
> removing it is recoverable. That is luck, not a safeguard. If the pilot run needs these
> steps exercised, point `HOME` at a scratch directory for the run rather than trusting a
> prompt rule to skip them.
