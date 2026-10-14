# Lab spec — `labs/lab13.md`

| | |
|---|---|
| **Lab** | `labs/lab13.md` (391 lines, 24.1 KB) — "A2A Concepts with Copilot CLI ACP" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 13 teaches agent-to-agent (A2A) collaboration: what a peer agent is, how it differs
from a `task` sub-agent, how to drive an implementer + critic loop on either the live ACP
path or the in-process concept path, and the three failure modes (looping, context drift,
hand-off ambiguity) with their mitigations. The teaching idea is that **a peer is a trust
boundary and a sub-agent is not**.

After the refresh the lab teaches the same thing, but: ACP is expanded correctly, every
`##`/`###` section carries a unique `13.x` number so the lab's own cross-references
resolve, every model id comes from `docs/_meta/registry.yaml`, and no command depends on an
environment variable the CLI does not document. Scope, structure and exercises are
unchanged — this is a currency and numbering pass, not a rewrite.

**This lab's pass additionally owns the repo-wide fix to `docs/_partials/currency.md`.**
See §4 C1, §6 D5 and the scope allowance in §5.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — the lab spawns peer agents, calls `task` / `write_agent` / `read_agent`, and on the live path starts a second `copilot --acp` process. Not drivable from VS Code Copilot alone. |
| **Tier** | `advanced` |
| **Presenter minutes** | 10 (unchanged) |
| **Self-paced minutes** | 35 (unchanged) |
| **Prerequisites** | Lab 07 (multi-agent orchestration — the single-session pattern this lab extends) and Lab 10 (the `.copilot/lessons/` wiki §13.5 relies on). Labs 11 and 12 are explicitly **background, not prerequisites** — the lab already says so and that stays. |
| **Write steps** | **Yes.** (a) Part A edits `node/web/routes/students-api.ts`, a **committed** source file, and commits. (b) Part A spawns background agents that consume AI credits. (c) §13.3.3 starts a second `copilot --acp` process. (d) §13.3.4 writes `node/.a2a-transcript-<date>.md`; §13.4.2 writes `node/.a2a/handoff.md`. (e) `pnpm -C node install` populates `node/node_modules`. (f) The cleanup partial runs `git config --unset core.hooksPath`. See §7. |
| **`lab-forge` verdict** | **`run with §7 fenced`.** The edit this lab needs is prose, numbering and a shared partial — none of it requires executing the two-agent loop. Every item in §7 must be reported UNVERIFIED and executed none. Everything outside §7 (reading files, `copilot --help`, `copilot help environment`, `npm test`, `npx vitest`) may be executed. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | Every `##` section heading is numbered `13.<n>`, uniquely, and `13.0` is the currency section | `npx vitest run tests/lab-structure/lab13-contract` |
| AC5 | Every `§13.x` / `§13.x.y` cross-reference in the lab names a section that exists in the lab | `npx vitest run tests/lab-structure/lab13-contract` |
| AC6 | No `§A.n` / `§B.n` / "Part A" / "Part B" section references survive | `npx vitest run tests/lab-structure/lab13-contract` |
| AC7 | ACP is expanded as "Agent Client Protocol"; the string "Agent Communication Protocol" does not appear | `npx vitest run tests/lab-structure/lab13-contract` |
| AC8 | Every model identifier in the lab appears in the `models:` block of the registry | `npx vitest run tests/lab-structure/lab13-contract` |
| AC9 | The lab does not set or mention `COPILOT_AGENT_NAME` | `npx vitest run tests/lab-structure/lab13-contract` |
| AC10 | `docs/_partials/currency.md` states `/model MODEL-ID` (or `/model auto`), never `<tier-or-id>`, and says autopilot is a toggle rather than the default | `npx vitest run tests/lab-structure/lab13-contract` |
| AC11 | **All ten** including labs carry a currency block byte-identical to the partial | `npx vitest run tests/lab-structure/lab13-contract` |
| AC12 | The four pre-existing byte-identity contracts still pass | `npx vitest run tests/lab-structure/lab08-contract tests/lab-structure/lab09-contract tests/lab-structure/lab11-contract tests/lab-structure/lab12-contract` |
| AC13 | Frontmatter, registry and the inline `⏱️` callout state the same pacing numbers | `npx vitest run tests/lab-structure/lab13-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | The shared partial: "`Shift+Tab` toggles plan mode; autopilot mode is the default" and "`/model <tier-or-id>`" | `free-check` — **both false** | `copilot --help`: `--autopilot  Start in autopilot mode` and `--mode <mode> [possible values: interactive, plan, autopilot]` — a flag that *starts* autopilot proves it is not the default; `copilot help` lists `shift+tab - switch modes` (three modes, not a two-way toggle) and `/autopilot - Toggle autopilot mode`. For `/model`: `copilot help` says "Select the AI model for this session (use 'auto' …)" and `--model <model>` says "Set the AI model to use (use 'auto' …)". There is no tier argument. Verified against CLI **1.0.98-1** on 2026-10-13. |
| C2 | ACP = "Agent Communication Protocol" (title, intro, §13.0 table) | `free-check` — **false** | `copilot --help`: `--acp  Start as Agent Client Protocol server`. The CLI's own help names it **Agent Client Protocol**. Fix the expansion; the `--acp` flag itself is real and the lab's `copilot --help \| grep -q -- '--acp'` check is valid. |
| C3 | `COPILOT_AGENT_NAME=critic copilot …` (§13.3.3) | `free-check` — **undocumented** | `copilot help environment` enumerates the `COPILOT_*` variables (ALLOW_ALL, AUTO_TIER, AUTO_UPDATE, CLI_VERSION, CUSTOM_INSTRUCTIONS_DIRS, EDITOR, GITHUB_TOKEN, HOME, MODEL, MULTIPLEXER, OFFLINE, PROVIDER_*). `COPILOT_AGENT_NAME` is not among them. Drop the assignment — it is set-dressing; the `--agent` flag already names the agent. |
| C4 | Model ids `claude-opus-4.6`, `claude-opus-4.7` | `free-check` — **not served** | `docs/_meta/registry.yaml` `models:` = cheap[`claude-haiku-4.5`, `gpt-5-mini`, `gpt-5.4-mini`], standard[`claude-sonnet-5`, `gpt-5.4`], premium[`claude-opus-5`, `gpt-5.3-codex`, `grok-4.6`]. The registry comment records that `claude-opus-4.7` was dropped because the CLI no longer serves it. Replace with a registry tier reference or a listed id. |
| C5 | `--available-tools='view,grep,glob,lsp'` and `--allow-tool='shell(git:*)'` (§13.3.3) | `free-check` — **correct** | Both appear in `copilot --help`. Leave them. |
| C6 | `--acp` exists on the installed CLI | `free-check` — **correct** | `copilot --help`: `--acp  Start as Agent Client Protocol server`. The lab's preflight grep is honest. |
| C7 | `make test-node`, `pnpm -C node install`, `node/web/routes/students-api.ts` | `free-check` — **all resolve** | `Makefile` declares `test-node`; `node/pnpm-lock.yaml` exists (pnpm, not npm); `node/web/routes/students-api.ts` exists. No change. |
| C8 | "`/orchestrate` command … refuses to spawn workers until the plan has acceptance criteria" (§13.5) | `free-check` — **resolves** | `.github/prompts/orchestrate.prompt.md` exists. Keep, but it is a repo prompt file, not a built-in CLI slash command — the sentence must not imply the latter. |

> No `research` disposition. Every claim above was settled by running the installed tool or
> reading a file in this repo. **Do not commission a `spec-forge` run for this lab.**

## 5. Non-goals

- Do not restructure the lab's teaching arc: §13.0 concepts → prerequisites → Part A
  two-agent loop → Part B failure modes → where-it-fits → wrap-up → cleanup. Renumbering is
  required; **reordering is not permitted**.
- Do not add a fourth failure mode, a new exercise, or a real ACP transport walkthrough.
- Do not change the declared pacing (10 / 35). It is not under review.
- Do not edit `labs/lab14.md`. Its cross-references into this lab are fixed by **lab14's own
  pass**, against the numbering map in §6 D2, which both specs state identically.
- Do not edit `docs/_partials/cleanup.md` or any lab's cleanup block.

### Scope allowance — this pass may edit the shared currency partial

> **This clause deliberately overrides the standing instruction carried in
> `specs/labs/lab05.md`, `lab08.md`, `lab09.md`, `lab10.md`, `lab11.md` and `lab12.md`,
> each of which says "Do not edit `docs/_partials/currency.md`."** Those specs fenced the
> partial because a single-lab pass must not change a file ten labs share. This pass is the
> designated owner of that change. Without this override a `lab-forge` run will refuse the
> edit, and the defect in §6 D5 will survive another batch.

This pass **may and must** edit, beyond `labs/lab13.md` itself:

1. `docs/_partials/currency.md` — the two defective rows, and the stale "toggle" wording in
   the user-side discovery row.
2. **Every one of the ten including labs**, re-synced so the body between its
   `@include` / `@end-include` markers is byte-identical to the partial:
   `labs/lab06.md`, `labs/lab08.md`, `labs/lab09.md`, `labs/lab11.md`, `labs/lab12.md`,
   `labs/lab13.md`, `labs/lab15.md`, `labs/lab-hardening.md`, `labs/lab-gh-extensions.md`,
   `labs/lab-copilot-cli-extensions.md`.
3. Nothing else. In particular, **no other content in those nine other labs may change** —
   only the bytes between the two include markers.

**There is no re-sync tool.** No script, no npm task. Re-syncing means copying the
partial's body (from its first `> ` line to end of file) into each consumer between its
markers, by hand. Verify with AC11, which checks all ten.

**Byte-identity is defined by the existing tests**, which this pass must not change: the
partial's body starts at its **first line beginning with `> `** (the leading HTML comment is
excluded) and both sides are `\r\n`-normalized and `.trim()`-ed. See
`tests/lab-structure/lab12-contract.test.ts`.

**Accepted consequence:** `labs/lab15.md` currently carries a locally-reworded LSP row
("This lab is where you configure and observe it.") instead of the partial's
("See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md)"). Re-syncing replaces it, which
leaves Lab 15 with a link to itself. That is accepted: the link resolves, the markers say
"do not edit inline", and a sanctioned per-lab deviation is exactly the drift that produced
this defect. A lab that genuinely must deviate detaches the partial outright, as `lab10`
did — it does not quietly edit its copy.

### Stage-2 ordering constraint (not a content requirement)

**This lab's worktree must merge before `lab15`'s worktree starts.** Both labs are in batch
3 and both include the partial; this pass rewrites `labs/lab15.md`'s currency block, and
Lab 15's own pass edits the same file. Running them concurrently produces a merge conflict
in `labs/lab15.md`. `lab14`, `lab18` and `lab19` do not include the partial and may run in
parallel with this one.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | line 11–13 (intro), line 94 (§13.0 table) | ACP expanded as "**Agent Communication Protocol**". The CLI's own help calls it "**Agent Client Protocol**" (`--acp  Start as Agent Client Protocol server`). The lab's title and its central definition are wrong about the protocol it is named after. |
| D2 | headings throughout | **Section numbering is broken, and the lab's own cross-references depend on it.** `## Copilot CLI currency (2026 refresh)` (L62) is unnumbered while every sibling lab numbers it `<n>.0`; `## Part A` (L154) and `## Part B` (L279) are unnumbered and sit where 13.2/13.3 belong; `### Next steps` (L399) is unnumbered. The result: L223 cites **§13.3.1, which does not exist**, and the cost-budget block cites a vague "§13's failure-modes section". Apply this map exactly. |
| D3 | L199, L206 (table "Model hint"), L186, L35–L37 (cost budget), L218 | Names `claude-opus-4.6` (×3) and `claude-opus-4.7` (×1) — neither is in the registry's `models:` block, and the registry records `claude-opus-4.7` as dropped because the CLI no longer serves it. The 💸 callout's "often `claude-opus-4.7`" sends a learner to a model they cannot select. `claude-haiku-4.5` and `gpt-5-mini` are fine — both are registry `cheap`. |
| D4 | L229 | `COPILOT_AGENT_NAME=critic copilot \` — not a documented environment variable (`copilot help environment`). Remove the assignment; keep the `--agent rubber-duck --available-tools=… --acp` invocation, which is valid. |
| D5 | L64–L88 (the included block) + `docs/_partials/currency.md` L32–L33 | **The shared partial is wrong in two rows, and ten labs inherit it.** (a) "`Shift+Tab` toggles plan mode; autopilot mode is the default" — autopilot is **not** the default (`--autopilot` *starts* it; `--mode` defaults to `interactive`), and `shift+tab` *switches* among three modes rather than toggling one. (b) "`/model <tier-or-id>`" — there is no tier argument; `/model` takes a model id or `auto`. Labs 01 and 07 were each corrected in their own pass and now contradict the partial, and `lab07-contract` already **bans** the `tier-or-id` string. Fix per the wording map below, then re-sync all ten per §5. |
| D6 | L55, L223, L274, and §A./§B. cites at L206, L292, L312, L321, L340, L348, L396, L403 | Eleven internal cross-references use the old scheme or point at a non-existent section. All must be rewritten with D2's map. |
| D7 | L406 | "the `/orchestrate` command" reads as a built-in CLI slash command. It is `.github/prompts/orchestrate.prompt.md`, a repo prompt file. Phrase it as such; the file resolves, so this is wording only. |

### D2 — the numbering map (authoritative; `lab14`'s spec restates it)

| Old heading | New heading |
|---|---|
| `## Copilot CLI currency (2026 refresh)` | `## 13.0 Copilot CLI currency (2026 refresh)` |
| `## 13.0 What is A2A — and what is ACP?` | `## 13.1 What is A2A — and what is ACP?` |
| `### When to reach for A2A vs a single agent with sub-agents` | `### 13.1.1 When to reach for A2A vs a single agent with sub-agents` |
| `## 13.1 Prerequisites` | `## 13.2 Prerequisites` |
| `## Part A — A two-agent task: implementer + critic` | `## 13.3 Part A — A two-agent task: implementer + critic` |
| `### A.1 Pick a target change` | `### 13.3.1 Pick a target change` |
| `### A.2 Drive the flow from your main Copilot CLI session (concept path)` | `### 13.3.2 Drive the flow from your main Copilot CLI session (concept path)` |
| `### A.3 Drive the flow on the live ACP path` | `### 13.3.3 Drive the flow on the live ACP path` |
| `### A.4 Inspect the transcript` | `### 13.3.4 Inspect the transcript` |
| `## Part B — Failure modes and mitigations` | `## 13.4 Part B — Failure modes and mitigations` |
| `### B.1 Looping (the critic that never says yes)` | `### 13.4.1 Looping (the critic that never says yes)` |
| `### B.2 Context drift (the peer working from stale assumptions)` | `### 13.4.2 Context drift (the peer working from stale assumptions)` |
| `### B.3 Hand-off ambiguity (the under-specified contract)` | `### 13.4.3 Hand-off ambiguity (the under-specified contract)` |
| `## 13.4 Where this fits in the wider toolkit` | `## 13.5 Where this fits in the wider toolkit` |
| `## 13.5 Wrap-up checklist` | `## 13.6 Wrap-up checklist` |
| `### Next steps` | `### 13.6.1 Next steps` |
| `## 13.6 Cleanup` | `## 13.7 Cleanup` |

Cross-reference rewrites inside `labs/lab13.md`:

| Line | Old | New |
|---|---|---|
| 55 | `(cited in §13.4)` | `(cited in §13.5)` |
| 206 | `§A.3` | `§13.3.3` |
| 223 | `(see §13.3.1)` | `(see §13.4.1)` |
| 274 | `again in §13.4` | `again in §13.5` |
| 292, 312, 321, 340 | `§A.1` | `§13.3.1` |
| 348, 403 | `§B.2` | `§13.4.2` |
| 396 | `§A.4` | `§13.3.4` |
| 35–37 (cost budget) | "the turn limit you set in §13's failure-modes section" | "the turn limit you set in §13.4.1" |

### D5 — the partial's replacement wording

Derived from `labs/lab01.md:35-36` and `labs/lab07.md:47-48`, which were corrected in their
own passes and are the standard the rest of the curriculum must match.

| Row | Replace with |
|---|---|
| **Plan mode vs autopilot mode** (command cell) | ``/plan`` or ``Shift+Tab`` for plan mode vs ``/autopilot`` to toggle autopilot mode |
| **Plan mode vs autopilot mode** (use-when cell) | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** (command cell) | ``/model MODEL-ID`` (or ``/model auto`` to let Copilot choose) |
| **Mid-session model switch** (use-when cell) | Keep the existing registry-tier guidance and the Lab 17 default-availability note **verbatim**, and append: The tier names are registry keys, not ``/model`` arguments. |
| **Local tool discovery (user-side)** (use-when cell) | Change the trailing "use `Shift+Tab` to toggle plan/autopilot modes" to "use `Shift+Tab` to switch modes" — there are three modes (`interactive`, `plan`, `autopilot`), so "toggle" is wrong for the same reason row 3 was. |

Everything else in the partial — the 💡 and 🆕 callouts, the plugin / `/fleet` /
`extensions_manage` / LSP rows — is **unchanged**. Minimal diff; the four existing
byte-identity contracts must stay green after the re-sync.

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED and execute none:

- Any `task(...)`, `write_agent(...)`, `read_agent(...)` or `list_agents()` call from
  §13.3.2 — these spawn background agents and consume AI credits.
- `COPILOT_AGENT_NAME=critic copilot --agent rubber-duck --available-tools=… --acp`
  (§13.3.3) — starts a second CLI process.
- Any edit to `node/web/routes/students-api.ts` or the `?limit=N` implementation — it is a
  **committed** source file and the lab's exercise is to change it.
- `pnpm -C node install` — populates `node/node_modules`.
- Writes to `node/.a2a/handoff.md`, `node/.a2a-transcript-<date>.md`.
- The whole of §13.7 Cleanup: `git config --unset core.hooksPath`, `Stop-Job`/`Remove-Job`,
  `mv ~/.copilot/config.json.bak`, and any `ls ~/.copilot/lessons/` follow-up deletion.
- `make test-node`, `dotnet build dotnet/ContosoUniversity.sln`.

Safe to execute, and useful for verifying this spec: `copilot --help`,
`copilot help environment`, `copilot --version`, `npm test`, `npx vitest run …`, and any
read of a repo file.
