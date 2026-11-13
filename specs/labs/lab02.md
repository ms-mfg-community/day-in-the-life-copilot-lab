# Lab spec — `labs/lab02.md`

| | |
|---|---|
| **Lab** | `labs/lab02.md` (231 lines) — "Custom Instructions & AGENTS.md" |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 · amended 2026-11-12 (Phase 2 anti-pattern teachable moments — AC11, AC12, §2, §5, D8; Phase 4 Debug It callout — AC13, C13–C14, D9, §5, §7) |

---

## 1. Target state

After this lab a learner can place a rule in the right file — repository-wide
(`.github/copilot-instructions.md`), path-specific (`.github/instructions/*.instructions.md`
with an `applyTo` glob), or project context (`AGENTS.md`) — and **confirm with a command
that Copilot actually loaded it**. The single teaching idea is *"Copilot combines the
instruction files that apply; your job is to put each rule where it belongs and then check
it loaded."*

This is a currency and correctness pass. Every section, command and code block stays. What
changes is that the lab stops attributing invented numbers to a paper that does not exist,
teaches `/instructions` as the deterministic way to confirm loading instead of crowning a
model probe "authoritative", and names the two documented ways to pick up an instruction
change.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — all steps are terminal-driven (`copilot`, file edits, `head`/`Get-Content`). §2.1 step 1 launches `$EDITOR` with a documented `code` fallback, so it is not VS Code-only. |
| **Tier** | `beginner` |
| **Presenter minutes** | 4 (unchanged) |
| **Self-paced minutes** | 15 (unchanged — see §5) |
| **Prerequisites** | Setup complete: `copilot --version` answers and the learner is signed in (`labs/setup.md`). The lab declares none today, yet §2.1 step 3 and §2.2.3 step 2 both call a model. |
| **Write steps** | **Yes, four families — and three of them write *tracked files in this repository*.** (a) append a `## ContosoUniversity Conventions` section to `.github/copilot-instructions.md`; (b) create `.github/instructions/razor-views.instructions.md`; (c) append an `## Operational Notes` section to `AGENTS.md` (amended 2026-11-12: this used to be an `## Architecture Decisions` ADR, which §2.3 now shows as the anti-pattern instead of asking the learner to paste it); (d) launch an editor, and run two interactive `copilot` prompts that call a model. A person rehearses these; **`lab-forge` must not execute any of them** (§7). |

> **Why (a)–(c) are the dangerous ones.** The Key-Discovery write-step survey classified
> this lab "no write steps detected" because it scanned for GitHub writes, global installs
> and home-directory paths. It has none of those. It instead writes **the three files that
> configure the agents editing it** — `.github/copilot-instructions.md`, a new file under
> `.github/instructions/`, and `AGENTS.md`. `lab-forge` runs in the live working tree
> (`loop.mjs:889`), so a stage that "followed the lab to check it works" would rewrite its
> own instructions mid-run and blow the scope check. This is the Lab 10 lesson in the
> `specs/labs/README.md` repeating: read the commands, do not trust a keyword count.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The References list links the **Copilot CLI** custom-instructions doc, not only the github.com/IDE one | `npx vitest run tests/lab-structure/lab02-contract` |
| AC5 | arXiv `2506.17056` appears nowhere; the research reference is arXiv `2602.11988` and names the paper's real title | `npx vitest run tests/lab-structure/lab02-contract` |
| AC6 | The "What research says" callout states the paper's finding — inference cost **over 20%**, holding for **developer-committed as well as generated** files, with repository **overviews** singled out as unhelpful — and contains neither "14-22%" nor "nearly 100% redundant" | `npx vitest run tests/lab-structure/lab02-contract` |
| AC7 | §2.2.3 names `/instructions` as the deterministic check, and no sentence calls the model probe the *authoritative* test for instruction loading | `npx vitest run tests/lab-structure/lab02-contract` |
| AC8 | The restart callout names both documented ways to apply an instruction change: `/new` and `copilot --continue` | `npx vitest run tests/lab-structure/lab02-contract` |
| AC9 | A setup prerequisite links `setup.md` before the first `##` heading | `npx vitest run tests/lab-structure/lab02-contract` |
| AC10 | The cascade callout says Copilot **combines** the applicable files (no precedence ranking anywhere in the lab) | `npx vitest run tests/lab-structure/lab02-contract` |
| AC11 | §2.2 carries a `🚫 Spot the Anti-Pattern: Bloated Domain Instructions` callout contrasting a roughly 40-line stack-matched instruction file (the repo's own `.github/instructions/dotnet.instructions.md`, which must stay concise) with a roughly 230-line copy-pasted financial-compliance prompt (PCI-DSS, SOX, sagas) that spends context tokens on every file match | `npx vitest run tests/lab-structure/lab02-contract` |
| AC12 | §2.3 frames `### ADR-001` as `🚫 Spot the Anti-Pattern: What Does NOT Belong in AGENTS.md` — kept inside a code fence, never a live heading, so §2.3 still contains it — explains why (duplicates `copilot-instructions.md`, lists discoverable structure, cites arXiv 2602.11988), and has the learner add a *different* block of operational notes (SQLite dev-seed behavior, ports 52379/52380, never hand-edit `.lock.yml` or `lab-sources.json`) whose facts match the repo | `npx vitest run tests/lab-structure/lab02-contract` |
| AC13 | §2.2.3 carries exactly one `🔍 Debug It (VS Code & Copilot CLI)` callout (Phase 4), after the `/instructions` check and separate from the §2.2 anti-pattern callout. It goes beyond `/instructions`: `/env` for what the session loaded and `/context` for the Custom Instructions share, typed inside a running `copilot` session; and in VS Code **Chat: Open Customizations**, **Show Agent Debug Logs** (its **Discovery** events) and **Show Chat Debug View** (the **System prompt**). It separates a file that was discovered, one whose text was included, and one the model followed, and links `docs/debugging-and-observability.md` | `npx vitest run tests/lab-structure/lab02-contract tests/lab-structure/debugging-observability-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | L19: "Research: Do context files actually help?" → `https://www.arxiv.org/abs/2506.17056` | `free-check` — **FALSE, fabricated citation** | Opened 2026-10-12: arXiv **2506.17056** is *"Electric field control of superconducting fluctuations and quasiparticle interference at oxide interfaces"* — condensed-matter physics, unrelated. The URL returns **HTTP 200**, so `links-resolve` passes and the error is invisible to the existing gate. The real paper is **arXiv:2602.11988**, *"Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?"* (Gloaguen, Mündler-Sasahara, Müller, Raychev, Vechev; 2026-02-12). |
| C2 | L207: "Every instruction you add costs **14-22% more reasoning tokens**" | `free-check` — **FALSE, fabricated number** | 2602.11988 abstract, verbatim: *"does not generally improve task success rates, while **increasing inference cost by over 20% on average**."* No 14–22% range appears, and the measure is inference cost, not "reasoning tokens". |
| C3 | L207: auto-generated files are "**nearly 100% redundant** with existing documentation" | `free-check` — **unsupported** | No such figure in the abstract. Its nearest real finding: *"while instructions in the context files are well followed by coding agents, **repository overviews**, although popular and recommended by model providers, **are not helpful**."* State that instead. |
| C4 | L207: auto-generated files make performance worse; "hand-written files … **consistently outperform**" | `free-check` — **CONTRADICTED** | The abstract: the no-improvement result *"holds across different LLMs, coding agents, and for **both LLM-generated and developer-committed context files**."* The paper's axis is **instructions vs. overviews**, not handwritten vs. generated. The lab's *advice* ("keep it short, only non-discoverable things") survives — *"context files are useful for specifying non-standard coding practices"* — but its stated evidence does not. |
| C5 | L23 / L205: repo-wide instructions and `AGENTS.md` are "**always loaded**" | `free-check` — substantially correct, one caveat | GitHub Docs *Adding custom instructions for Copilot CLI*, opened 2026-10-12: both are discovered in the standard locations and combined. Caveat: *"An instruction file that you disable using `/instructions` is not included."* Not worth rewording on its own; AC7 introduces `/instructions`, which is where the caveat belongs. |
| C6 | L137: "Instructions cascade … all three apply simultaneously" | `free-check` — correct, and worth sharpening | Same doc: *"Copilot CLI **combines** their instructions … but **does not define a general precedence order** between these files. Avoid conflicting instructions."* "Cascade" implies an order the docs explicitly decline to define; "combines" is the documented word and matches lab01's corrected §1.2. |
| C7 | L135: the instruction "only loads when Razor files (`.cshtml`) are in context" | `free-check` — correct | Same doc: *"Path-specific instructions are included only when their `applyTo` value matches a file that Copilot CLI is working with."* |
| C8 | L61–71: config files load once at session start, are not hot-reloaded; remedy given is `exit` then `copilot` | `free-check` — correct but **incomplete** | Same doc, *Custom instructions in use*: *"Changes … are not immediately available for use in active CLI sessions. To apply your changes, exit the current session and then either resume it (for example, run `copilot --continue`), or start a new session (for example, use `/new` from within an interactive session)."* The lab omits both named commands. |
| C9 | L169: `extensions_manage operation: list` is a sanity check, and "the functional probe above is **the authoritative test** for instruction loading" | `free-check` — **FALSE** | `copilot help commands` (1.0.96) lists `/instructions` — *"View and toggle custom instruction files"* — and `/env` — *"Show loaded environment details (instructions, MCP servers, skills, agents, hooks, plugins, LSPs, extensions)."* A deterministic command exists, so a non-deterministic model probe is not the authoritative test. The `extensions_manage` sentence is true but a red herring in an instructions lab. |
| C10 | §2.2: filename must end `.instructions.md`; frontmatter carries an `applyTo` glob; `'**/*.cshtml'` syntax | `free-check` — correct | Same doc, *Creating path-specific custom instructions*, steps 3–4, including the `**/*.py` glob examples. The lab's `applyTo: '**/*.cshtml'` is well-formed. |
| C11 | L16–19: three reference URLs | `free-check` | All three returned **HTTP 200** on 2026-10-12. C1 is a wrong-paper problem, not a dead-link problem. The github.com/IDE instructions doc also returns 200, but this is a CLI lab (§2) — add the CLI doc rather than replace it. |
| C12 | §2.1/§2.2 PowerShell uses `$env:EDITOR ?? 'code'` (PowerShell 7 syntax) | `free-check` — **parked, house-wide** | `??` requires PowerShell 7; `scripts/preflight.ps1:31` invokes `pwsh`, and three lab files already use the operator. A repo-wide convention, not a lab02 defect. See §5. |
| C13 | Phase 4: "`/context` splits the context window into System Prompt, Custom Instructions, System Tools, MCP Tools, Messages, Free Space and Buffer" | `free-check` | `copilot help commands` (1.0.111-0) and the CLI built-in docs `command:/context` (1.0.110-3): "Show context window token usage for the current model, split into System Prompt, Custom Instructions, System Tools, MCP Tools, Messages, Free Space and Buffer (room reserved for the reply and compaction)". Per-skill and per-agent usage is **experimental mode only**; this callout does not claim it. |
| C14 | Phase 4: "**Chat: Open Customizations** → **Instructions** shows each file's source and any error; the **Discovery** events say loaded, skipped or rejected; the **System prompt** shows whether the text reached the model; discovery, inclusion and following are three different checks" | `free-check` | VS Code, [Troubleshoot AI in VS Code](https://code.visualstudio.com/docs/agents/agent-troubleshooting/troubleshooting), "Check customization diagnostics" (run **Chat: Open Customizations**, select **Instructions**, check "its source, location, and any reported errors"; "Inclusion alone doesn't establish compliance"), and [Debug chat interactions](https://code.visualstudio.com/docs/agents/agent-troubleshooting/chat-debug-view), "Instructions or a prompt file are not applied" ("distinguish discovery, inclusion, and adherence"). Read 2026-11-12. |

## 5. Non-goals

- Do not change pacing (`presenter_minutes: 4`, `self_paced_minutes: 15`) or the registry's `lab02` rows (`docs/_meta/registry.yaml:217-221`). If a gate reports the 15 is wrong, that finding is **recorded, not fixed**.
- Do not renumber sections. `2.1` / `2.2` / `2.2.3` / `2.3` / `2.4` stay as they are.
- Do not add or remove a section or renumber one. **Amended 2026-11-12 (Phase 2):** within §2.2 and §2.3 the lab does gain content — one anti-pattern callout in §2.2, and in §2.3 the anti-pattern box plus a new notes block — so "do not add or remove a step or a code block" no longer applies there. Everywhere else, keep both the Bash and PowerShell variants of every command, and keep the `<details>` PowerShell alternative in §2.2.
- Do not change the ContosoUniversity conventions or the Razor rules. **Amended 2026-11-12 (Phase 2):** the ADR-001 text is unchanged, but it is no longer pasted — it is the anti-pattern the learner is shown, inside a code fence (AC12). The learner now adds the `## Operational Notes` block instead.
- Do not "fix" `??` to a PowerShell 5.1-compatible form (C12). That is a repo-wide convention; changing it here only in lab02 creates an inconsistency.
- Do not expand the lab to cover `$HOME/.copilot/` personal instructions, `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`, `COPILOT_HOME`, `CLAUDE.md`/`GEMINI.md`, `@`-file references or `excludeAgent`. All are real and documented; all are Lab 1 / Lab 15 territory and would blow a 15-minute beginner lab.
- Do not delete the "What research says" callout. It is corrected (D2), not cut — its advice is sound and now matches its source.
- Do not edit any file other than `labs/lab02.md`, this spec and `tests/lab-structure/lab02-contract.test.ts`. No other lab, no registry, no `AGENTS.md`, no `.github/copilot-instructions.md`, no other test.
- **Amended 2026-11-12 (Phase 4):** the lab gains **one** `🔍 Debug It` callout in §2.2.3 (AC13), after the `/instructions` check and apart from the §2.2 anti-pattern callout, and nothing else. It does not renumber, is not timed, and leaves `self_paced_minutes` at 15 and the §2.3 research callout alone. It carries no inline Copilot CLI version. The previous bullet now also allows the files Phase 4 adds or edits for the whole lab set: `docs/debugging-and-observability.md` (new), `TROUBLESHOOTING.md` and `tests/lab-structure/debugging-observability-contract.test.ts`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | L19, References | Wrong paper (C1). Point at `https://arxiv.org/abs/2602.11988` and title it as the real paper, *"Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?"*. Drop the `www.` host while here. |
| D2 | L207, "What research says" | Two invented numbers and a contradicted claim (C2, C3, C4). Rewrite to the abstract's actual findings: context files did **not** generally improve task success while raising **inference cost by over 20% on average**; the result held for **developer-committed as well as generated** files; **instructions are followed, repository overviews are not helpful**; context files earn their keep on **non-standard practices**. Keep the closing bold takeaway — it is what the paper supports. |
| D3 | L169, optional-sanity-check callout | Crowns a model probe "the authoritative test" when `/instructions` exists (C9). Replace with `/instructions` (view and toggle the discovered instruction files), optionally `/env`. Keep the §2.2.3 step-2 functional probe — it still shows the rule *influencing an answer* — but demote it from *authoritative* to *behavioural confirmation*. |
| D4 | L61–71, 🔄 restart callout | Omits the two documented remedies (C8). Name `/new` for a fresh session from inside the CLI and `copilot --continue` to resume; keep the existing `exit`/restart and VS Code **Developer: Reload Window** lines. |
| D5 | L16–19, References | CLI-surface mismatch (C11). Add [Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions) — this lab's steps are CLI steps. Keep the existing github.com link. |
| D6 | Top of the lab, after the ⏱️ pace line | No prerequisite despite §2.1 step 3 and §2.2.3 step 2 calling a model (C-none; structural). Add one line linking `setup.md`, matching `labs/lab01.md:15`. |
| D7 | L137, "Instructions cascade" callout | "Cascade" implies a defined order (C6). Say Copilot **combines** the applicable files and defines no precedence between them. Keep the sentence naming all three files and "apply simultaneously" — that part is right. |
| D8 | L205, "AGENTS.md vs copilot-instructions.md" | Harmless as written (C5), but it sits immediately above D2's callout and repeats "Both are always loaded". Leave the rules/context split alone; no change required unless D2's rewrite makes the two read as contradictory. **Amended 2026-11-12 (Phase 2):** the callout, the §2.3 opening sentence and the §2.4 takeaway row now say `AGENTS.md` is for context the agent *can't discover*; "architecture and why" had become the anti-pattern the new §2.3 box teaches against. |
| D9 | §2.2.3 | **Added 2026-11-12 (Phase 4).** The verification step stops at `/instructions` ("it found the file") and offers no way to tell whether the text reached the model or whether the model followed it, which is where most "it's not working" reports end up (plan §2.1 finding 4). Fixed by the `🔍 Debug It` callout (AC13); see C13, C14. |

## 7. Out of scope for `lab-forge`

**None of §2's write or model-calling steps may be executed by any stage.** The run gate
reports each UNVERIFIED — not "could not run":

- **Any write to `.github/copilot-instructions.md`** (§2.1 step 2) — this is the file that governs the agent doing the run;
- **Creating `.github/instructions/razor-views.instructions.md`** (§2.2 step 1, both the `cat > …` heredoc and the `Out-File` variant). It does not exist on disk and must not after the run;
- **Any write to `AGENTS.md`** (§2.3 step 1);
- Launching an editor: `"${EDITOR:-code}" …`, `& ($env:EDITOR ?? 'code') …`, or any `code` invocation;
- Interactive `copilot`, and any `copilot -p` / `copilot --prompt` / `copilot --agent` invocation — including the two learner probes at §2.1 step 3 and §2.2.3 step 2 (these call a model and may use tools);
- `/instructions`, `/env`, `/new`, `/init` typed into any session, and `extensions_manage`;
- **Phase 4:** `/context` typed into a session, and the callout's VS Code steps (**Chat: Open Customizations**, **Show Agent Debug Logs**, **Show Chat Debug View**, the capture setting), which need a running VS Code;
- `copilot --continue` (it resumes a real session);
- every GitHub-side write.

**May** be executed, because they are read-only and local: `npm test`, the vitest
invocations in §3, `copilot --version`, `copilot --help`, `copilot help commands`,
`head -4 …` / `Get-Content … -Head 4` against files that already exist, directory listings,
HTTP `GET` of the reference URLs, and plain file reads.

> There is no sandbox. `lab-forge` runs in the live working tree (`loop.mjs:889`). The
> three repository files in §2's write steps are tracked, and two of them are instruction
> files the running agent itself obeys. This section is the only thing between a green run
> and a lab that silently rewrote the repo's own Copilot configuration.
