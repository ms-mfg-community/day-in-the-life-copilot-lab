# Lab spec — `labs/lab10.md`

| | |
|---|---|
| **Lab** | `labs/lab10.md` (1,048 lines) — retitled to "Agent Memory: Copilot Memory, Lessons, and Custom Memory Services" |
| **Spec state** | `ready` |
| **Author** | John (reframe authored 2026-10-11; supersedes the 2026-10-10 currency-pass spec) |
| **Last updated** | 2026-10-11 |
| **Research spec** | [`specs/006-copilot-memory-dreaming-scns.md`](../006-copilot-memory-dreaming-scns.md) — the F-rows cited in §4 |

---

## 1. Target state

Lab 10 teaches agent memory as a **spectrum of three options** for Layer 2, the
cross-session layer, mapped onto the existing three-layer model (Layer 1 *Raw sources* →
Layer 2 *Recall* → Layer 3 *Schema*). Name Layer 2 "Recall" consistently, because it now
holds more than the wiki:

1. **Native and hosted:** GitHub Copilot Memory. It has two scopes, *repository-level
   facts* and *user-level preferences*. Copilot Dreaming is its optional, billed,
   background curation pass.
2. **DIY in git:** the LLM-maintained markdown wiki in `.copilot/lessons/`, which the lab
   already teaches.
3. **Custom service:** a self-hosted memory service. SCNS
   (<https://github.com/johnhain-msft/scns>) is the worked example.

After the lab, a learner can:

- store, recall, inspect and delete both kinds of Copilot Memory;
- validate a bulk import without submitting it;
- explain what Dreaming would do, what it costs, and why this lab does not switch it on;
- say when the cost of running a custom memory service is worth paying.

The single teaching idea: **memory is advisory, and instruction files are binding.**
Every Layer 2 option feeds Layer 3. None of them replaces it.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed`. Mostly `cli`: `copilot`, `/memory`, `copilot memories import --dry-run`, `~/.copilot/session-state/`, `~/.copilot/lessons/`. Cleanup also uses `github.com` settings pages to delete stored memories. VS Code alone cannot complete it. |
| **Tier** | `advanced` |
| **Presenter minutes** | 5 (unchanged). In a workshop, 7 (unchanged). Workshop module minutes are fixed elsewhere and are not under review. |
| **Self-paced minutes** | ≈ 115, up from 75. Breakdown: start + §10.0–10.1 ≈ 18 · §10.2 ≈ 20 · §10.3 ≈ 12 · §10.4 ≈ 12 · §10.5 ≈ 20 · §10.6 ≈ 10 · §10.7 ≈ 9 · §10.8 ≈ 14. The teachability stage may revise these. Whatever the final figure, the frontmatter, the ⏱️ callout, the "Before you start" breakdown and `docs/_meta/registry.yaml` must agree (AC15). |
| **Prerequisites** | Lab 02, because §10.4 extends an instructions file and the lab's thesis is that instruction files are the binding layer. Lab 04, because §10.5 runs a command skill. The learner also needs **a fork of this repository they can write to**: only someone with write access can create a repository-level fact, and a fact stored on the upstream repo would reach other people. They need **a Copilot plan with Copilot Memory available**. On Pro and Pro+ it is on by default; on Business and Enterprise it stays off until an administrator enables the policy. A learner without Memory follows §10.2 as a read-along. |
| **Write steps** | **These steps write to GitHub through the Copilot Memory service:** §10.2's prompts that store one user-level preference and one repository-level fact on the learner's fork, and the learner's approval of each at the approval prompt. **These steps change state outside the repository:** the §10.4 extension (old §10.2c) runs `mkdir -p ~/.copilot/lessons`; §10.1 and §10.7 write `plan.md` and a handoff into `~/.copilot/session-state/`; §10.5 runs `copilot --prompt '/consolidate-lessons --scope both' --allow-all-tools`; §10.8 runs `rm -f`/`rm -rf ~/.copilot/lessons`, `git restore`, and deletes both stored memories in github.com settings (GUI). **One command is read-only:** `copilot memories import solutions/lab10-session-management/sample-memories.jsonl --dry-run` validates the file and submits nothing. `/memory` with no argument only reads status. `/memory on` and `/memory off` write to the CLI config, and the lab never tells the learner to run them. |
| **`lab-forge` verdict** | `run with §7 fenced` |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | §10.0 still names all five current CLI capabilities and still references the registry | `npx vitest run tests/content-currency/cli-commands-current` |
| AC5 | Every model identifier in the lab appears in the registry's `models:` block. **Any model Dreaming requires is described, never written as a hyphenated id.** | `npx vitest run tests/lab-structure/lab10-contract` |
| AC6 | No hardcoded cost multiplier, relative-price claim, or credit amount | `npx vitest run tests/lab-structure/lab10-contract` |
| AC7 | Every backticked repo path the lab cites resolves on disk | `npx vitest run tests/lab-structure/lab10-contract` |
| AC8 | Sections 10.0–10.8 appear in order, each about its topic: surface check, Layer 1, Copilot Memory, wiki, schema, consolidation/curation, custom/SCNS, wrap, cleanup. `## Lab Complete` follows §10.8. | `npx vitest run tests/lab-structure/lab10-contract` |
| AC9 | §10.2 names "repository-level fact", "user-level preference" and `` `/memory` ``, and links the Copilot Memory concept doc. The lab says that asking Copilot to forget only downvotes a memory. | `npx vitest run tests/lab-structure/lab10-contract` |
| AC10 | Every fenced `copilot memories import` carries `--dry-run`. `solutions/lab10-session-management/sample-memories.jsonl` exists and is cited by path, and every record is schema-shaped and fact-tagged "Lab 10 sample". | `npx vitest run tests/lab-structure/lab10-contract` |
| AC11 | §10.5 explains Copilot Dreaming, links its concept doc, and names the AI-credit cost model. The lab states plainly that it does not enable Dreaming. | `npx vitest run tests/lab-structure/lab10-contract` |
| AC12 | §10.6 links SCNS, says it is alpha, and says a custom service does not replace instruction files | `npx vitest run tests/lab-structure/lab10-contract` |
| AC13 | §10.8 deletes the lab's user-level preference and repository-level fact in settings | `npx vitest run tests/lab-structure/lab10-contract` |
| AC14 | No stale "28-day" expiry | `npx vitest run tests/lab-structure/lab10-contract` |
| AC15 | The frontmatter pace, the ⏱️ callout and the registry pace agree. The registry title equals the frontmatter title, and the H1 is `# 10 — <title>`. | `npx vitest run tests/lab-structure/lab10-contract` |
| AC16 | The sample import validates and submits nothing: it exits 0 and prints `no records were submitted` | `copilot memories import solutions/lab10-session-management/sample-memories.jsonl --dry-run` — safe to execute |
| AC17 | `docs/memory-decision-tree.md` covers every mechanism, including Copilot Memory, both scopes, Dreaming and SCNS. *This is downstream of the lab-forge run (§5), but it is part of the same PR.* | `npx vitest run tests/memory/decision-tree-coverage` |

## 4. Outside-world claims

F-rows are in `specs/006-copilot-memory-dreaming-scns.md`. Free-checks were run against
Copilot CLI 1.0.106 on 2026-10-11.

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | Copilot Memory stores two kinds of memory: repository-level facts and user-level preferences | `cite` | 006 §3.1 — F3, F4, F11, F12 |
| C2 | Repository-level facts: created only by a user with write access and Memory enabled; used for anyone with read access and Memory enabled; scoped to that repository; not copied to forks; deleted in the repository's settings | `cite` | 006 §3.1 — F5, F6, F8, F9, F43, F67, F127, F128, F130, F507 |
| C3 | User-level preferences follow the user across repositories and are deleted in personal settings. On Business and Enterprise they belong to the billing entity, whose admins can view, export and delete them. | `cite` | 006 §3.1 — F3, F5, F7, F9, F13, F14, F111, F114, F115, F123 |
| C4 | User-level preferences are on by default on Pro, Pro+ and Max, and off on Business and Enterprise until an admin enables the policy. Repository facts have their own setting, allowed unless a policy restricts it. | `cite` | 006 §3.1 — F48, F89, F90, F102, F189, F477 (user-level preferences; repository facts have a separate default, F48/F96 — Q3) |
| C5 | Memories expire after 90 days by default, and the clock resets when one is upvoted. An org or enterprise can set the expiry for repository facts. | `cite` | 006 §3.1 — F60, F61, F69, F73, F74, F459, F479 (VS Code docs still say 28 days — Q13; teach GitHub Docs) |
| C6 | Asking Copilot to forget something only downvotes it. Deletion happens in settings. You cannot create or edit memories in settings. | `cite` | 006 §3.1 — F31, F50, F59, F83, F130, F487, F493 |
| C7 | Scope comes from your phrasing ("in this repository" vs "in all my projects"), and Copilot asks when it is unclear. Asking does not guarantee storage. | `cite` | 006 §3.1 — F34, F35, F38, F39, F41, F49, F52, F488 |
| C8 | The approval prompt offers approve once, reject (with feedback), and allow future stores for a scope | `cite` | 006 §3.3 — F44, F248, F249, F288, F486 (situation→scope mapping unpublished — Q16c) |
| C9 | In the CLI, only the root agent stores and votes on memories; subagents only use them | `cite` | 006 §3.3 — F45, F46, F252, F253, F486 |
| C10 | Memory does not store secrets, sensitive information or short-lived instructions | `cite` | 006 §3.1 — F63, F64, F65, F66, F485 |
| C11 | `/memory` shows memory status, or enables or disables memory | `free-check` | `copilot help commands` → `/memory  Show memory status, or enable/disable memory across sessions` |
| C12 | The `memory` config setting defaults to `true`. Non-interactive `-p` runs start with memory off unless you pass `--enable-memory`. | `free-check` | `copilot help config` (`memory` entry); `copilot --help` (`--enable-memory  Enable memory in prompt mode (disabled by default)`) |
| C13 | `copilot memories import --dry-run` validates a JSONL file and submits nothing. A bad record fails validation with a per-line reason. Import counts as approval. | `free-check` + `cite` | Running AC16 prints `Memory JSONL is valid; no records were submitted.` A record with an empty `reason` prints `Line 1: Memory reason must be a non-empty string. [invalid_reason]`, exit 1. "Import counts as approval" — 006 §3.3 F47, F287, F288. |
| C14 | Copilot Dreaming is in public preview, opt-in and off by default. It runs a background analysis of synced sessions (and PR review feedback) and updates context, not the model. | `cite` | 006 §3.2 — F133, F134, F137, F140, F141, F465, F482 |
| C15 | Dreaming applies memory changes without per-change approval, and proposes instruction or skill file changes only as pull requests | `cite` | 006 §3.2 — F153, F154, F156, F157, F470 |
| C16 | Dreaming needs a plan above Pro, a model that your policy allows, and session sync. It is unavailable with GHE.com data residency. | `cite` | 006 §3.2 — F142, F147, F174, F181, F183, F184, F504, F505 (name no model id in the lab — AC5) |
| C17 | Every Dreaming run bills AI credits, even a run that changes nothing. Turning Dreaming off does not undo what it changed. | `cite` | 006 §3.2 — F162, F169, F199, F200, F226, F484, F496 |
| C18 | SCNS is an alpha, local-first memory service. Its pieces: a broker, per-repository child brokers, and a SQLite vault with full-text and local-embedding search. It integrates with Copilot CLI through an extension and hooks. | `cite` | 006 §3.4 — F301, F303, F317, F321, F322, F340, F341, F342, F375, F377, F383, F388 (SCNS docs disagree on whether the meta-broker supervisor is a separate process — Q14e; do not assert either side) |
| C19 | SCNS does not replace instruction files. Its writes and prunes default to preview. It is not hosted. | `cite` | 006 §3.4 — F302, F305, F306, F387, F399, F400, F404, F406, F561 |
| C21 | Copilot Memory is generally available on paid Copilot plans (since 2026-10-28). Do not call it a public preview. Dreaming is the only preview piece. | `cite` | 006 §3.1 — F108, F135, F461 |
| C20 | Agents keep knowledge better when they keep their own notes | `cut` attribution | Stated as the lab's own framing, not attributed to anyone (carried over from the 2026-10-10 spec, C3). |

## 5. Non-goals

- **No SCNS install.** No SCNS command is run in the lab. §10.6 links the repository's
  README and teaches the trade-off only.
- **No Dreaming enablement.** No step turns on Dreaming, session sync, `remoteExport`, or
  the "store local sessions in the cloud" policy.
- **No live import.** Every `copilot memories import` in the lab carries `--dry-run`.
- **Never tell the learner to run `/memory on` or `/memory off`.** Only the bare `/memory`
  status check appears.
- **Don't edit `docs/_partials/`.** §10.0 stays lab-local, and its markers stay: `/plugin
  install`, `/fleet`, plan/autopilot mode, `/model`, `extensions_manage`,
  `docs/_meta/registry.yaml`.
- **Keep the existing teaching.** The Layer 1, wiki, schema and consolidation teaching
  moves and is renumbered, with only the prose edits the reframe requires. The guarded
  wiki-creation and cleanup logic (`.created-by-lab10` marker, baseline check) is kept
  as is.
- **No hardcoded model ids, prices, credit amounts or multipliers.** Dreaming's model is
  described, never named.
- **Edit only `labs/lab10.md` in the lab-forge run — plus the `lab10:` entry under the
  registry's lab pacing block in `docs/_meta/registry.yaml`.** AC15 couples that entry's
  title and pace to the lab frontmatter, so whichever stage revises the self-paced minutes
  updates both. Already set: title "Agent Memory: Copilot Memory, Lessons, and Custom
  Memory Services", pace 5 / 7 / 115. The SPA, Lab Studio, the decision tree doc,
  `solutions/`, and cross-references in other labs and skills are synced afterwards, in the
  same PR. Some of that is already done: `docs/memory-decision-tree.md`,
  `workshop/slides/10-module-1.md`, and the `§10.5` references in `labs/lab05.md`,
  `.copilot/lessons/README.md` and `.github/skills/consolidate-lessons/SKILL.md`.
- **Don't oversell any Layer 2 option.** Never claim Copilot Memory, Dreaming or SCNS
  makes instruction files unnecessary.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | lines 14–18, 98, 340 | The thesis "without a knowledge-graph server, without embeddings" is now wrong for a lab that teaches a hosted service (Copilot Memory) and an embedding-backed one (SCNS). Recast it: the markdown wiki is **the DIY option**, not the only right answer. |
| D2 | lines 26–35 | The layer table shows only the wiki at Layer 2. Show the spectrum: native (Copilot Memory + Dreaming), DIY (the wiki), custom (SCNS). |
| D3 | line 260 | The Lab 05 §5.3 link ("markdown lessons, not a server") has to keep resolving. Its prose must not contradict the new spectrum. |
| D4 | §10.4d (lines 674–694) | The autopilot/cron example runs `copilot -p`. It should note that prompt mode starts with Copilot Memory off unless `--enable-memory` is passed (C12). |
| D5 | lines 37–85 | "Before you start" lacks three things: the plan/policy check, the fork-with-write-access requirement, and the warning that §10.2 writes to the learner's GitHub account until §10.8 deletes it. It also lacks a read-along path for learners without Memory. |
| D6 | lines 123–128 | The references list lacks the Copilot Memory and Dreaming docs and SCNS. |
| D7 | throughout | Renumbering. Old §10.2 → §10.3, §10.3 → §10.4, §10.4 → §10.5, §10.5 → §10.7, §10.6 → §10.8. Every in-lab cross-reference (§10.2c, §10.3a, §10.4b, §10.5, §10.6 …) must follow. |
| D8 | lines 1–13, 37–47 | Retitle, then recompute the ⏱️ callout and the per-section time breakdown for the new sections (AC15). |
| D9 | lines ~890–910 | `rm -rf ~/.copilot/lessons` in a learner file. It is guarded by the marker and the baseline check. **Carried over and not fixed**, as in the previous spec's D7. Do not weaken the guard. |

## 7. Out of scope for `lab-forge`

The run gate reports these as UNVERIFIED and does not execute them:

- Every §10.2 prompt that stores a Copilot memory: the user-level preference, the
  repository-level fact, and the approval-prompt choice.
- Any `copilot memories import` **without** `--dry-run`.
  - The `--dry-run` form (AC16) is safe and may be executed.
- `/memory on` and `/memory off`.
  - Bare `/memory` reads status only.
- Anything that enables Dreaming or session sync.
- The SCNS install or any SCNS command.
- `mkdir -p ~/.copilot/lessons` and anything that writes into it.
- Every `/consolidate-lessons` run, dry run or not, including
  `copilot --prompt '/consolidate-lessons --scope both' --allow-all-tools`.
- The §10.8 deletions:
  - `rm -f`/`rm -rf ~/.copilot/lessons`;
  - deleting memories in github.com personal or repository settings, which needs a GUI
    and the learner's account.
- Anything under `~/.copilot/session-state/` that belongs to a live session.

> `~/.copilot/lessons/` does not exist on this workstation. If a run needs those steps
> exercised, point `HOME` at a scratch directory rather than trusting a prompt rule to
> skip them.
