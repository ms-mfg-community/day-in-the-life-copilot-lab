# Lab spec — `labs/lab07.md`

| | |
|---|---|
| **Lab** | `labs/lab07.md` (436 lines) — "Multi-Agent Orchestration" |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 · amended 2026-11-12 (Phase 2: `dotnet-qa` created before the delegation test — AC11, §2, §5; Phase 4: Debug It callout — AC12, C13–C15, D8, §5, §7) · amended 2026-11-13 (Phase 5 3-Surface facelift — AC13, §2, §5, §7; see `specs/labs/three-surfaces.md`) |

---

## 1. Target state

After this lab a learner can write an orchestrator agent that delegates to other agents
via the `agent` tool, start it with the command the CLI actually documents, and say which
agents ship with the repo versus which they created. The single teaching idea is *"one
agent coordinates; the `agent` tool is what lets it hand work to another."*

This is a currency and correctness pass. Every section stays. What changes is that the
lab stops naming a model the CLI cannot serve, stops repeating the CLI-table errors that
`labs/lab01.md` has already corrected, and stops telling the learner to type an
invocation form the CLI does not document.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — **Amended 2026-11-13 (Phase 5):** was `cli`. The agent files are created editor-first (💠 In VS Code) with the §7.2 heredoc and here-string folded into one collapsed 🐚 *Shell alternative*; §7.1 gains a 💠 **Agents**-tab note; §7.4 splits into 🐚 launch and 🤖 `/agent` steps plus a 💠 **Agent**-dropdown step. |
| **Tier** | `intermediate` |
| **Presenter minutes** | 4 (unchanged) |
| **Self-paced minutes** | 20 (unchanged — see §5) |
| **Prerequisites** | `labs/setup.md`, and **`labs/lab03.md`** — §7.1 expects `dotnet-dev.agent.md`, which Lab 03 creates and which does **not** ship. The lab declares no prerequisite today. |
| **Write steps** | **Yes, two families — one writes a tracked repository directory.** (a) §7.2 creates `.github/agents/lab-orchestrator.agent.md` (both the `cat > … << 'AGENT'` heredoc and the `Out-File` variant); §7.5 creates `.github/agents/dotnet-qa.agent.md` (amended 2026-11-12: it was an optional "bonus" at the end of the lab; it is now a required step placed before the §7.4 delegation test that needs it). (b) §7.4 starts an interactive `copilot` session and runs two multi-agent delegations that call models repeatedly. A person rehearses these; **`lab-forge` must not execute any of them** (§7). |

> **Third of the "no write steps" five.** Like lab02 and lab04, this lab scans clean for
> GitHub writes, global installs and home-directory paths, and writes tracked repository
> files anyway — here **agent definitions**, which a running agent may itself load. Of the
> five labs tiered as write-free, only `lab16` and `lab17` actually are.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | Every model id named in the lab appears in the registry's `models:` block; `claude-opus-4.6` appears nowhere | `npx vitest run tests/lab-structure/lab07-contract` |
| AC5 | No text claims a model is "the repo default" other than the registry's own `default:` value | `npx vitest run tests/lab-structure/lab07-contract` |
| AC6 | The §7.0 `/model` row drops `<tier-or-id>` and still points at the registry tiers | `npx vitest run tests/lab-structure/lab07-contract` |
| AC7 | The §7.0 plan/autopilot row names `/plan` and `/autopilot` | `npx vitest run tests/lab-structure/lab07-contract` |
| AC8 | §7.4's learner-typed invocation uses the documented `/agent` form, not a bare `@agent-name` | `npx vitest run tests/lab-structure/lab07-contract` |
| AC9 | §7.1 distinguishes the agent that ships from the ones the learner creates | `npx vitest run tests/lab-structure/lab07-contract` |
| AC10 | A prerequisite line naming Lab 03 appears before the first `##` heading | `npx vitest run tests/lab-structure/lab07-contract` |
| AC11 | `dotnet-qa` is created before the delegation test that needs it: `## 7.5 Create the QA Worker Agent` sits after §7.3 and before `## 7.4 Test Multi-Agent Delegation`, every heading `7.0`–`7.6` is kept, the "Bonus" label and every "jump ahead … then come back" workaround are gone, and §7.5 points at the reference agent in `solutions/lab07-orchestrator/` | `npx vitest run tests/lab-structure/lab07-contract` |
| AC12 | §7.4 carries exactly one `🔍 Debug It (VS Code & Copilot CLI)` callout (Phase 4), after the checklist and "What you should see". It uses `/tasks` inside the same `copilot` session; says to set `COPILOT_OTEL_FILE_EXPORTER_PATH` to a file **outside the repository** (it is not git-ignored here and each run appends to it) and to look, in the same trace the subagent calls are linked into, for an `invoke_agent` span nested under the `execute_tool task` span that launched each worker; and in VS Code uses **Show Agent Debug Logs** → the Summary view → **Agent Flow Chart**. It links `docs/debugging-and-observability.md`, points at Lab 06 §6.4.1 for the commands, and names no model id (AC4) | `npx vitest run tests/lab-structure/lab07-contract tests/lab-structure/debugging-observability-contract` |
| AC13 | **Phase 5.** Every step in §7.1–§7.6 is badged 🐚, 🤖 or 💠. §7.2 shows the orchestrator as a plain Markdown block in the editor-first 💠 step, with both original heredocs (`cat > … << 'AGENT'`, `@' … '@ \| Out-File`) in one `<details><summary>🐚 Shell alternative (Bash / PowerShell heredoc)</summary>`. §7.5 adds a 💠 step that creates `dotnet-qa.agent.md` the way §7.2 did. §7.1 notes the **Agents** tab of **Chat: Open Customizations**; §7.4 adds a 💠 **Agent**-dropdown step before the `🔍 Debug It` callout and embeds `vscode-agent-debug-logs.svg` after it. AC8 and AC11 still hold: no bare `@lab-orchestrator`, the order stays 7.3 → 7.5 → 7.4 → 7.6, and §7.5 still links `solutions/lab07-orchestrator/dotnet-qa.agent.md` | `npx vitest run tests/lab-structure/lab07-contract tests/lab-structure/three-surfaces-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | L23: "`claude-opus-4.6` (**the repo default**)" | `free-check` — **FALSE twice over** | `docs/_meta/registry.yaml:138-150`: `default: auto`; tiers are cheap `claude-haiku-4.5`/`gpt-5-mini`/`gpt-5.4-mini`, standard `claude-sonnet-5`/`gpt-5.4`, premium `claude-opus-5`/`gpt-5.3-codex`/`grok-4.6`. **`claude-opus-4.6` is in no tier**, and the default is `auto`, not any id. The registry dropped `claude-opus-4.7` on 2026-10-10 because "the CLI no longer serves them, so a lab that pinned one was sending learners to a model they cannot select" — 4.6 is older still. |
| C2 | L22: pin sub-agents to `claude-haiku-4.5` | `free-check` — id is valid, practice is not | `claude-haiku-4.5` **is** in `models.cheap`. But the registry's own instruction is that "Labs MUST reference the tier names … rather than hardcoding an id". Use `models.cheap`. |
| C3 | The registry rule is enforced by a test | `free-check` — **enforced for lab10 only** | `tests/lab-structure/lab10-contract.test.ts:15` binds `LAB10 = labs/lab10.md`; the model guard reads only that file. This is why `claude-opus-4.6` has survived in lab07 with `npm test` green. AC4 closes the gap for this lab. |
| C4 | §7.0 `/model <tier-or-id>` | `free-check` — **FALSE** | `copilot help commands` (1.0.96): `/model` selects a model id or `auto`; there is no "tier" argument. Identical to the defect already fixed in `labs/lab01.md` (its spec's D6). |
| C5 | §7.0 "Plan mode vs autopilot mode — `Shift+Tab` (plan mode) vs autopilot mode" | `free-check` — **incomplete** | `copilot help commands`: `/plan` and `/autopilot` both exist; `--plan` / `--autopilot` flags too. Identical to `labs/lab01.md`'s D5, already fixed there. Leaving it here makes two labs in the same repo disagree. |
| C6 | §7.3: `tools: ["read","search","agent"]` enables delegation | `free-check` — **CORRECT** | GitHub Docs *Custom agents configuration*, *Tool aliases*, opened 2026-10-12: `agent` (aliases `custom-agent`, `Task`) — *"Allows a different custom agent to be invoked to accomplish a task."* |
| C7 | §7.4 step 2: the learner types `@lab-orchestrator <request>` into Copilot CLI | `free-check` — **not a documented CLI form** | `copilot help commands`: `/agent   Browse and select agents: /agent [name]`; `copilot --help` has `--agent`. No `@agent-name` syntax appears in the CLI help or in *Custom agents configuration*. Compare lab04, where the parallel `@prompt-name` claim was simply wrong. **Use the documented `/agent` form for the learner-typed step.** |
| C8 | `@dotnet-dev` / `@dotnet-qa` / `@code-reviewer` inside the orchestrator's **own prompt body** (§7.2) | `research` — **unverified, leave alone** | Inside an agent's Markdown body these are natural-language delegation instructions the model reads, not CLI syntax, so C7 does not condemn them. Whether `@name` carries any special meaning there is unsettled and no primary source addresses it. Not load-bearing for this pass. **Parked — §5.** |
| C9 | §7.1 "You should see:" four `.agent.md` files | `free-check` — **FALSE as presented** | `.github/agents/` contains exactly three files: `agentic-workflows.agent.md`, `code-reviewer.agent.md`, `planner.agent.md`. Of the four the lab lists, only `code-reviewer.agent.md` ships; `dotnet-dev` comes from Lab 03, `dotnet-qa` from §7.5, `lab-orchestrator` from §7.2. A learner running the `ls … | grep` sees one file and concludes the lab is broken. |
| C10 | Reference L31: "[Agent handoffs](…/custom-agents-configuration#handoffs)" | `free-check` — **misleading** | Same doc, note under the frontmatter table: *"The `argument-hint` and `handoffs` properties from VS Code and other IDE custom agents are **currently not supported** for Copilot cloud agent on GitHub.com. They are ignored to ensure compatibility."* `handoffs` is an IDE property, and the page has no `#handoffs` section — the anchor lands nowhere useful. Presenting it as the orchestration mechanism for a CLI lab points learners at the wrong thing; the mechanism this lab actually uses is the `agent` tool (C6). |
| C11 | `docs/token-and-model-guide.md` and `docs/_meta/registry.yaml` links | `free-check` — correct | Both exist; `links-resolve` covers them. |
| C12 | §7.6 worktree block: `git worktree add/remove`, `git merge` | `free-check` — correct | Standard `git-worktree` usage; the linked `git-scm.com/docs/git-worktree` is the primary source. |
| C13 | Phase 4: "`/tasks` lists the subagents the session ran, and opens one to read its transcript" | `free-check` | `copilot help commands` (1.0.111-0) and the CLI built-in docs `command:/tasks` (1.0.110-3): "View running subagents and background shell commands, check their status, and open their live transcript or recent output". §7.4 step 3 already uses `/tasks`; the callout adds no new claim about it. |
| C14 | Phase 4: "subagent calls are linked into the same trace; look for an `invoke_agent` span nested under the `execute_tool task` span that launched each worker" | `free-check` for "subagent invocations are linked into the same trace"; **observed** for the nesting; **UNVERIFIED for the lab's custom agents** | CLI built-in docs `topic:monitoring#what-gets-exported`: "Subagent invocations are automatically linked into the same trace via context propagation." Observed 2026-11-12, one `copilot -p` run in a scratch folder that delegated to the built-in `explore` agent: one trace id, with `execute_tool task` holding a child `invoke_agent explore` that held its own `chat` and `execute_tool` spans. A run with `lab-orchestrator`, `dotnet-dev`, `dotnet-qa` and `code-reviewer` was **not** made (it is the lab's most expensive step, §7), so the callout says "look for" and does not promise span names. The same probes showed that the file exporter **appends** (17 then 34 lines for two runs) and `git check-ignore -v copilot-otel.jsonl` reports it is not ignored, which is why the callout says to write it outside the repository. |
| C15 | Phase 4: "in VS Code the Summary view (select the session description in the breadcrumb), then **Agent Flow Chart**, shows which agent delegated an action and where the workflow stopped; the Logs view can group events into a tree by subagent" | `free-check` | VS Code, [Debug chat interactions](https://code.visualstudio.com/docs/agents/agent-troubleshooting/chat-debug-view), read 2026-11-12: "The Agent flow chart view visualizes the sequence of interactions between agents and subagents. Use it to identify which agent delegated an action and where a workflow stopped"; "Switch between a flat list and a tree grouped by subagent." |

## 5. Non-goals

- Do not change pacing (`presenter_minutes: 4`, `self_paced_minutes: 20`) or the registry's `lab07` rows. If a gate reports the 20 is wrong, that finding is **recorded, not fixed**.
- Do not renumber sections. `7.0`–`7.6` stay. **Amended 2026-11-12 (Phase 2):** §7.5 was *moved*, not renumbered — the file now reads 7.3 → 7.5 → 7.4 → 7.6 so the learner creates `dotnet-qa` before testing the orchestration. The number stays because `.github/agents/planner.agent.md` and `.github/skills/orchestrate/SKILL.md` both cite "section 7.5" as where `dotnet-qa` is created, and AC11 pins the order.
- Do not add or remove a section, and do not delete the §7.6 worktree callout or the 💰 cost-budget callout.
- Do not rewrite the orchestrator agent body in §7.2, beyond what C1/C2 require. Its `@dotnet-dev` phase markers are **out of scope** (C8) — changing them would alter a file the learner writes and is unverified either way.
- Do not create `.github/agents/dotnet-dev.agent.md` or `dotnet-qa.agent.md` to make §7.1's listing true. Lab 03 and §7.5 create those; shipping them would break both.
- Do not extend the registry model guard in `tests/lab-structure/lab10-contract.test.ts` to all labs. That is a worthwhile repo-wide change and it is **not this lab's pass** — record it.
- Do not touch `/plugin install owner/repo` in the §7.0 table. It mirrors `labs/lab01.md:34`, which lab01's judge left open as unverifiable without running a prohibited command. Same disposition here.
- Do not edit any file other than `labs/lab07.md`, this spec and `tests/lab-structure/lab07-contract.test.ts`.
- **Amended 2026-11-12 (Phase 4):** the lab gains **one** `🔍 Debug It` callout in §7.4 (AC12) and nothing else. It is not a section, is not timed, and leaves `self_paced_minutes` at 20 and the 💰 cost budget alone. It names no model id (AC4), no bare `@lab-orchestrator` (AC8) and no inline Copilot CLI version, and it does not say "bonus" or send the learner away and back (AC11). It does not claim span names for the lab's custom agents (C14). The files Phase 4 adds or edits for the whole lab set are `docs/debugging-and-observability.md` (new), `TROUBLESHOOTING.md` and `tests/lab-structure/debugging-observability-contract.test.ts`.
- **Amended 2026-11-13 (Phase 5):** "do not rewrite the orchestrator agent body" still holds: the body is unchanged, only its presentation is editor-first (a plain Markdown block, with the heredoc and here-string folded away). The lab gains the 🐚 / 🤖 / 💠 badges, three 💠 steps and one image (`vscode-agent-debug-logs.svg`), and **no new section**; pacing, the 💰 cost budget, the §7.6 worktree callout and the single `🔍 Debug It` callout are untouched. The "do not edit any file other than" bullet also allows the Phase 5 files named in `specs/labs/three-surfaces.md` §5.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | L22–L23, 💰 cost-budget callout | `claude-opus-4.6` is in no registry tier and is not the default (C1); `claude-haiku-4.5` is hardcoded against the registry's stated rule (C2). Replace both with tier references — `models.cheap` for the simple delegations, `models.premium` for planner/reviewer — and drop "(the repo default)", or state the real default, `auto`. |
| D2 | L44, §7.0 `/model` row | `<tier-or-id>` (C4). `/model` takes a model id or `auto`; point at the registry's `models.cheap` / `models.premium` for which id to pick. Mirror the wording already corrected in `labs/lab01.md`. |
| D3 | L43, §7.0 plan/autopilot row | Names only `Shift+Tab` (C5). Add `/plan` and `/autopilot`; keep `Shift+Tab` and the literal phrases "plan mode" and "autopilot mode". |
| D4 | §7.4 steps 2 and 4 | The learner is told to type `@lab-orchestrator …` into the CLI (C7). Use the documented `/agent` form — select the agent with `/agent lab-orchestrator`, then give it the request — or start it with `copilot --agent lab-orchestrator`. |
| D5 | §7.1 step 1 and its "You should see" list | Lists four files when one ships (C9). Mark each: `code-reviewer.agent.md` **ships**; `dotnet-dev.agent.md` from **Lab 03**; `dotnet-qa.agent.md` from **§7.5**; `lab-orchestrator.agent.md` from **§7.2**. The existing 💡 note already does this for `dotnet-qa` — extend the same honesty to the rest. |
| D6 | L31, References | "Agent handoffs" points at an anchor for an IDE-only, cloud-agent-ignored property (C10). Either drop the line or relabel it to the `agent` tool / Tool aliases section, which is what this lab actually teaches. |
| D7 | Top of the lab, after the ⏱️ pace line | No prerequisite despite §7.1 expecting Lab 03's `dotnet-dev` agent (§2). Add one line linking `setup.md` and `lab03.md`, matching `labs/lab01.md:15`. |
| D8 | §7.4 | **Added 2026-11-12 (Phase 4).** The lab's hand-off check is the CLI timeline and `/tasks`; it offers no picture of who delegated to whom and no data to inspect afterwards (plan §2.1 finding 4). Fixed by the `🔍 Debug It` callout (AC12); see C13–C15. |

## 7. Out of scope for `lab-forge`

**None of §2's write or model-calling steps may be executed by any stage.** The run gate
reports each UNVERIFIED — not "could not run":

- **Any write under `.github/agents/`** — `lab-orchestrator.agent.md`, `dotnet-qa.agent.md`, or any other agent definition. These are files the running agent may itself load;
- both §7.2 heredocs (`cat > … << 'AGENT'`, `@' … '@ | Out-File -FilePath …`), now folded into the collapsed 🐚 *Shell alternative* (Phase 5);
- **Phase 5:** the 💠 steps (creating the agent files in the Explorer, the **Agents** tab, the **Agent** dropdown, **Show Agent Debug Logs**) need a running VS Code: UNVERIFIED;
- Interactive `copilot`, and any `copilot -p` / `copilot --prompt` / `copilot --agent` invocation — including the §7.4 delegations, which fan out to several agents and are the most expensive steps in the lab;
- `/agent`, `/fleet`, `/model`, `/plan`, `/autopilot`, `/plugin …`, `/clear`, and `extensions_manage`;
- **Phase 4, §7.4 callout** — `/tasks` typed into a session; starting `copilot` with `COPILOT_OTEL_FILE_EXPORTER_PATH` set, which writes a trace file and, with the §7.4 request, repeats the lab's most expensive step; and the callout's VS Code steps (**Show Agent Debug Logs**, the Summary view, **Agent Flow Chart**), which need a running VS Code. The nesting claim (C14) was observed once with a built-in agent in a scratch folder outside the tree; the run gate must not repeat it;
- `git worktree add`, `git worktree remove`, `git merge`, and the §7.6 branch commands — they mutate the repository and the very worktree the run is happening in;
- every GitHub-side write.

**May** be executed, because they are read-only and local: `npm test`, the vitest
invocations in §3, `copilot --version`, `copilot --help`, `copilot help commands`,
`ls .github/agents/` and its PowerShell equivalent, `grep`/`Select-String` over files that
already exist, `head -5` of an existing agent file, HTTP `GET` of the reference URLs, and
plain file reads.

> There is no sandbox. `lab-forge` runs in the live working tree (`loop.mjs:889`). §7.6's
> `git worktree` and `git merge` commands are the sharpest hazard in this lab: executed
> during a fanout run they would operate on the very worktree set the run depends on.
