# Lab spec — `labs/lab03.md`

| | |
|---|---|
| **Lab** | `labs/lab03.md` (201 lines) — "Creating a .NET Development Agent" |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 |

---

## 1. Target state

After this lab a learner can write a custom agent file with valid frontmatter and start it
with the command the CLI actually documents. The single teaching idea is *"an agent is a
file: frontmatter declares what it may touch, the body is its system prompt."*

This is a correctness pass. Every section stays. What changes is the invocation form, the
shape of the one optional frontmatter key the lab demonstrates, and two claims the
published reference does not support.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` |
| **Tier** | `beginner` |
| **Presenter minutes** | 4 (unchanged) |
| **Self-paced minutes** | 15 (unchanged — see §5) |
| **Prerequisites** | `labs/setup.md`. The lab declares none; §3.4 calls a model twice. Lab 07 depends on **this** lab's output (`dotnet-dev`), so it is load-bearing for the series. |
| **Write steps** | **Yes, two families.** (a) the appendix creates `.github/agents/<track>-dev.agent.md` — a tracked repository path, and an agent definition a running agent may itself load; (b) §3.4 runs `copilot --prompt … --allow-all-tools` and an interactive session — model calls with blanket tool approval. §3.3 additionally **reads** `~/.copilot/mcp-config.json`, outside the repo. A person rehearses these; **`lab-forge` must not execute any of them** (§7). |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | No `@agent-name` user-facing invocation survives; the documented `--agent` / `/agent` form is used | `npx vitest run tests/lab-structure/lab03-contract` |
| AC5 | The §3.5 "Invocation" row names the documented form | `npx vitest run tests/lab-structure/lab03-contract` |
| AC6 | `mcp-servers` is shown as an object, not an array of strings | `npx vitest run tests/lab-structure/lab03-contract` |
| AC7 | §3.3 names the repository's own `.copilot/mcp-config.json`, not only the home-directory path | `npx vitest run tests/lab-structure/lab03-contract` |
| AC8 | The unsourced absolute "a plain `.md` file will not be picked up" is gone | `npx vitest run tests/lab-structure/lab03-contract` |
| AC9 | `name` is no longer described as how users invoke the agent | `npx vitest run tests/lab-structure/lab03-contract` |
| AC10 | The tools table still lists all six documented aliases | `npx vitest run tests/lab-structure/lab03-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | L134/L139: `copilot --prompt "@dotnet-dev List the files…" --allow-all-tools` | `free-check` — **wrong flag** | `copilot --help` (1.0.96) documents **`--agent`** for selecting a custom agent, and `copilot help commands` documents `/agent   Browse and select agents: /agent [name]`. Neither the CLI help nor GitHub Docs *Custom agents configuration* documents an `@agent-name` mention. The documented command is `copilot --agent dotnet-dev --prompt "…"`. Third lab in this wave with the same `@` error (lab04's `@prompt-name`, lab07's `@lab-orchestrator`). |
| C2 | L43: `name: "agent-name"   # How users invoke: @agent-name` | `free-check` — **FALSE on both halves** | *Custom agents configuration*, frontmatter table, opened 2026-10-12: `name` is *"Display name for the custom agent. **Optional**."* and *"The configuration file's name (minus `.md` or `.agent.md`) is used for deduplication between levels."* So `name` is optional and is **not** the invocation handle, and the `@` form is unsupported (C1). |
| C3 | L116: `mcp-servers: ["context7"]` | `free-check` — **wrong shape** | Same frontmatter table: `mcp-servers` — Type **`object`** — *"Additional MCP servers and tools that should be used by the custom agent. **Not used in VS Code and other IDE custom agents.**"* An array of strings is not an object. Same class of error lab16 warns about at length. |
| C4 | L87: "confirm the filename ends in `.agent.md` (**not** `.md`)" and L72 "a plain `.md` file **will not be picked up**" | `free-check` — **overstated / unsourced** | The same reference explicitly contemplates both suffixes: *"The configuration file's name (minus **`.md` or `.agent.md`**)…"*. Nothing published says a `.md` agent file is ignored by Copilot CLI. The repo's own three agents all use `.agent.md`, so **recommending** it is right; asserting the absolute negative is not. Soften to the convention, or scope and source the claim. |
| C5 | L120: "`mcp-servers` references servers defined in **`~/.copilot/mcp-config.json`**"; L108/L112 `cat ~/.copilot/mcp-config.json` | `free-check` — **incomplete and fragile** | This repository ships **`.copilot/mcp-config.json`** (4 servers — it is what `labs/lab01.md`'s count and `tests/lab-structure/lab01-contract.test.ts` read). The home-directory file exists on a maintainer's machine but a learner on a fresh install may have no `~/.copilot/mcp-config.json`, so step 1 `cat`s a file that is not there. Name the repo-local config the learner actually has. |
| C6 | §3.1 tools table: `read`, `edit`, `execute`, `search`, `agent`, `web` | `free-check` — **CORRECT** | Same doc, *Tool aliases*: `execute`, `read`, `edit`, `search`, `agent`, `web`, plus `todo`. All six the lab lists are real, with the documented purposes. (`todo` is simply omitted — not an error.) |
| C7 | §3.2: the `.agent.md` body is the system prompt; frontmatter declares `name`, `description`, `tools` | `free-check` — **CORRECT** | Same doc: *"Define the agent's behavior, expertise, and instructions in the Markdown content below the YAML frontmatter."* `description` is the one **Required** property. |
| C8 | §3.2 🔄: agent definitions are discovered once at session start and are not hot-reloaded | `research` — **unverified, parked** | GitHub Docs documents this for **custom instructions** (*"exit the current session and then either resume it … or start a new session"*), and documents `/skills reload` for **skills**. No published statement covers agent-definition reload in Copilot CLI. The advice is plausible and harmless; the remedy given (exit and restart) is strictly sufficient whatever the truth. **Parked — §5.** |
| C9 | §3.4 `--allow-all-tools` on a read-only analysis prompt | `free-check` for the flag; **parked** for the advice | `copilot --help` documents `--allow-all-tools`. Whether an early lab should teach blanket tool approval is a product/safety question, parked identically in `specs/labs/lab01.md` C12. Keep the dispositions aligned across labs. |
| C10 | Reference L18: *MCP servers in agents* → `custom-agents-configuration#mcp-servers` | `free-check` — anchor is thin | The page covers `mcp-servers` only as one row of the frontmatter table; there is no `#mcp-servers` section. Low severity, and §3.3 already defers to Lab 05 as canonical. Record, do not chase. |
| C11 | Solution link `solutions/lab03-dotnet-dev-agent/dotnet-dev.agent.md` | `free-check` | Covered by `links-resolve`; AC2 observes it. |

## 5. Non-goals

- Do not change pacing (`presenter_minutes: 4`, `self_paced_minutes: 15`) or the registry's `lab03` rows. If a gate reports the 15 is wrong, that finding is **recorded, not fixed**.
- Do not renumber sections. `3.1`–`3.5` stay.
- Do not rewrite the 🔄 restart callout's substance (C8). It is unverified in both directions and its advice is safe. Leave it.
- Do not change `--allow-all-tools` (C9) — parked identically in lab01. Teaching a narrower approval flag is a design change across several labs, not a lab03 edit.
- Do not edit the appendices (`labs/appendices/dotnet/lab03.md`, `labs/appendices/node/lab03.md`) or `solutions/lab03-dotnet-dev-agent/`, even though the agent body lives there. This pass corrects what **the lab** claims.
- Do not add `todo` to the tools table or expand it. Six aliases is enough for a beginner lab.
- Do not turn §3.3 into an MCP lab. It is explicitly a preview that defers to Lab 05.
- Do not edit any file other than `labs/lab03.md`, this spec and `tests/lab-structure/lab03-contract.test.ts`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | L134, L139 (§3.4 step 1) | `copilot --prompt "@dotnet-dev …"` uses an undocumented mention instead of the documented flag (C1). Use `copilot --agent dotnet-dev --prompt "…"` in both the Bash and PowerShell variants. |
| D2 | L151, L161 (§3.4 steps 2 and 4) | `@dotnet-dev …` typed into the REPL (C1). Select the agent with `/agent dotnet-dev`, then give it the request. |
| D3 | L79, L87 (§3.2 callouts) | `@<track>-dev` as the invocation and the quoted *"unknown agent"* failure mode (C1). Rephrase around `/agent <name>` / `--agent <name>`; keep the restart advice and the "check the filename and location" troubleshooting, subject to D5. |
| D4 | L181 (§3.5 table, Invocation row) | "`@agent-name` in Copilot Chat or CLI" (C1). Name `/agent <name>` and `copilot --agent <name>` for the CLI. |
| D5 | L43 (frontmatter comment) | `name` is marked as the invocation handle; it is **Optional** and is not how an agent is invoked (C2). Drop "How users invoke: @agent-name"; describe `name` as the display name, with `description` the required field. |
| D6 | L116 (§3.3 snippet) | `mcp-servers: ["context7"]` is an array; the published type is an **object** (C3). Show the object shape. |
| D7 | L108–L120 (§3.3) | Points only at `~/.copilot/mcp-config.json` (C5). Name this repository's `.copilot/mcp-config.json` — the file the learner actually has, and the one `labs/lab01.md` counts — and mention the home-level file as the personal alternative. |
| D8 | L72 and L87 | "a plain `.md` file **will not be picked up**" / "(not `.md`)" states an absolute the reference contradicts by naming both suffixes (C4). Keep `.agent.md` as the repo convention and the recommendation; drop the unsourced claim that `.md` fails. |

## 7. Out of scope for `lab-forge`

**None of §2's write or model-calling steps may be executed by any stage.** The run gate
reports each UNVERIFIED — not "could not run":

- **Any write under `.github/agents/`** — `dotnet-dev.agent.md`, `node-dev.agent.md`, or any other agent definition, including both appendix heredocs;
- Interactive `copilot`, and any `copilot -p` / `copilot --prompt` / `copilot --agent` invocation — including the §3.4 smoke test, which carries `--allow-all-tools` and would run with blanket tool approval in the live tree;
- `/agent`, `/new`, and any slash command typed into a session;
- **any read or write of `~/.copilot/`** — `mcp-config.json` or otherwise. It is the maintainer's real home directory, not a lab fixture;
- every GitHub-side write.

**May** be executed, because they are read-only and local: `npm test`, the vitest
invocations in §3, `copilot --version`, `copilot --help`, `copilot help commands`,
`head -30 .github/agents/planner.agent.md` and equivalent reads of files that already
exist, reading the repository's own `.copilot/mcp-config.json`, HTTP `GET` of the
reference URLs, and plain file reads.

> There is no sandbox. `lab-forge` runs in the live working tree (`loop.mjs:889`). §3.4 is
> the sharpest step in the wave so far: a single `copilot --prompt … --allow-all-tools`
> executed by a stage would spawn a second agent with blanket tool approval inside the
> same working tree the run is editing.
