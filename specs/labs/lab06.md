# Lab spec — `labs/lab06.md`

| | |
|---|---|
| **Lab** | `labs/lab06.md` (512 lines) — "Hooks" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-15) |
| **Last updated** | 2026-10-15 |

---

## 0. The hooks-cluster merge decision — **keep all four standalone**

The plan held `lab06` back to this final batch so the hooks merge could be decided with all
four cluster labs in hand: `lab06`, `lab-hardening`, `lab-gh-extensions` and
`lab-copilot-cli-extensions`. All four have now been read end to end. **Decision: no merge.
All four stay standalone.** Recorded here because `lab06` is the cluster anchor; the other
three specs cite this section.

| Candidate | Verdict | Why |
|---|---|---|
| `lab06` + `lab-gh-extensions` | **No** | `lab-gh-extensions` is not a hooks lab. Its only hook is a **git** `pre-commit` hook, and the lab opens §4 with an explicit warning not to conflate git hooks with Copilot CLI hooks. Merging it into the hooks lab would manufacture exactly the confusion it was written to prevent. |
| `lab06` + `lab-copilot-cli-extensions` | **No** | That lab's subject is the extension runtime — `joinSession()`, tool registration, `session.sendAndWait()`. Hooks are the second half, used as gates *around* an extension. Teaching `.mjs` SDK authoring inside a 3-minute beginner hooks lab is not possible: the combined pacing alone is 3+12 presenter and 10+35 self-paced minutes. |
| `lab06` + `lab-hardening` | **No** (closest call) | `lab-hardening`'s subject is **two-layer tool gating**; the `preToolUse` hook is one of its two layers and the custom-agent allow-list — the other layer — belongs with Lab 03, not Lab 06. Merging a 20-minute advanced lab into a 10-minute beginner lab destroys Lab 06's tier, which is its main virtue: it is the one place a beginner meets hooks without a security frame. |

**What actually looked like duplication was not duplicated content — it was one duplicated
wrong claim.** The "`preToolUse` is deny-only; `allow`/`ask` are not honored" banner appears
in `lab-hardening`, in `lab-copilot-cli-extensions` §4.2, in `docs/copilot-config-reference.md`
§4 and in `solutions/lab-hardening/deny-unlisted-tools.json`. As of 2026-10-15 it is false
(see `specs/labs/lab-hardening.md` §4 C1). The remedy is to correct the claim in each place
and let the labs cross-reference — not to collapse four labs that teach four different things.

Because there is no merge, **R3 does not apply**: no lab number moves and no redirect stub
is needed.

## 1. Target state

Lab 06 is the beginner's introduction to Copilot CLI hooks: what the lifecycle events are,
what the config file looks like, how to read the hooks this repo already ships, how a hook
receives its event, and how to build one `postToolUse` hook that verifies the .NET build.
Its single teaching idea is **the stdin-JSON IPC contract** — that a hook is handed a JSON
event on stdin, and that the `TOOL_NAME`/`FILE_PATH` environment variables every blog post
reads do not exist.

After the refresh the lab teaches the same thing at the same tier and pace, but **its claims
about hook blocking semantics, hook discovery locations and the event catalogue match the
current published reference**, and its one external link is not a 404. Three specific
corrections, each one callout or one table row: non-zero exits are *not* universally
ignored, `.github/hooks/` is *not* the only place hooks come from, and the five-event table
is *not* the complete catalogue. No new section, no new exercise, tier and pacing unchanged.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — the lab reads and writes files under `scripts/hooks/` and `.github/hooks/`, and exercises a hook by piping JSON into it. §6.3 step 3 also calls `code` (a GUI editor). |
| **Tier** | `beginner` |
| **Presenter minutes** | 3 (unchanged) |
| **Self-paced minutes** | 10 (unchanged) |
| **Prerequisites** | Lab 01 (repository configuration tour — the learner must know what `.github/` holds before being asked to edit `.github/hooks/default.json`). The .NET build hook assumes `dotnet/ContosoUniversity.sln` exists, which `setup` provides. Lab 07 is linked as *next*, not as a prerequisite. |
| **Write steps** | **Yes — four kinds, all inside the repository but not all harmless.** (a) §6.3 step 1–2 `cat > scripts/hooks/post-tool-use-dotnet-build.sh` / `.ps1` — creates two new files in the working tree, plus `chmod +x`. (b) §6.3 step 3–4 **edits `.github/hooks/default.json`, a committed file**, to register the new hook. (c) §6.3 step 3 `code .github/hooks/default.json` — launches a GUI editor. (d) §6.4 pipes a crafted event into the hook, which runs `dotnet build` on the real solution. The shared cleanup partial additionally runs `git config --unset core.hooksPath`, a git-config mutation. Per `specs/labs/README.md`, (b) and the git-config mutation are write steps by definition. |
| **`lab-forge` verdict** | **`run with §7 fenced`** — the edit this lab needs is prose and table corrections, which require executing none of the above. Every item is enumerated in §7 and the run gate must report each UNVERIFIED. |

> ⚠️ **The sharp edge is (b), and it is sharper than it looks.** Registering
> `post-tool-use-dotnet-build.sh` in `.github/hooks/default.json` in a live working tree
> installs a **real `postToolUse` hook into the session that is editing the lab**. From that
> point every `edit`/`create` of a `.cs`, `.csproj` or `.cshtml` file triggers a full
> `dotnet build`, inside the run, on every tool call. This is a self-modifying lab: it
> reconfigures the runtime that is running it. Do not let the run gate execute §6.3.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | `labs/lab06.md` does not cite the dead `copilot/using-github-copilot/using-hooks` URL, and does cite the live `copilot/reference/hooks-reference` | `npx vitest run tests/lab-structure/lab06-contract` |
| AC5 | The lab does not claim that a non-zero hook exit is universally ignored, and states that command `preToolUse` hooks are fail-closed on a non-zero exit | `npx vitest run tests/lab-structure/lab06-contract` |
| AC6 | The §6.1 event table is marked non-exhaustive and points at the published catalogue | `npx vitest run tests/lab-structure/lab06-contract` |
| AC7 | The lab names hook sources beyond `.github/hooks/` — at minimum the user-level hooks directory and policy hooks | `npx vitest run tests/lab-structure/lab06-contract` |
| AC8 | The lab hardcodes no Copilot CLI version in prose; it references the registry floor instead | `npx vitest run tests/lab-structure/lab06-contract` |
| AC9 | Every hook the §6.5 "Hooks in this repository" table presents as shipped is actually registered in `.github/hooks/default.json` (excluding `dotnet-build`, which the learner creates) | `npx vitest run tests/lab-structure/lab06-contract` |
| AC10 | Declared pacing is internally consistent: frontmatter `pace`, the inline `⏱️` callout, and `docs/_meta/registry.yaml` `labs.lab06` agree | `npx vitest run tests/lab-structure/lab06-contract` |
| AC11 | The stdin-JSON IPC teaching survives: the lab still states the payload arrives on stdin and that `TOOL_NAME`/`FILE_PATH` are not exported | `npx vitest run tests/lab-structure/lab06-contract` |

> AC11 is a **guard**, not a change. It is the lab's single teaching idea and the editing
> stage must not lose it while fixing the claims around it.

## 4. Outside-world claims

Primary source for C1–C5 is <https://docs.github.com/en/copilot/reference/hooks-reference>,
fetched directly 2026-10-15. Note that `…/reference/hooks-configuration` — the URL this
repo cites everywhere — now **302s to `…/reference/hooks-reference`**. It still resolves, so
this is currency rather than breakage, but the canonical path has moved.

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | References block: hooks are documented at `https://docs.github.com/en/copilot/using-github-copilot/using-hooks` | `free-check` | **Hard 404.** `Invoke-WebRequest` against that URL returns `(404) Not Found` (run 2026-10-15). It is the lab's only external reference. Replace with `…/reference/hooks-reference` and `…/concepts/agents/hooks`. |
| C2 | "A non-zero exit from any hook is logged and **silently ignored** by the runtime; only the stdout JSON contract blocks." (§6.2 callout, restated in §6.5) | `free-check` | **Contradicted.** The reference states command `preToolUse` hooks are **fail-closed**: "a crash or non-zero exit (including exit `2`) denies the tool call, even if the hook's stdout JSON reports `permissionDecision: allow`." Timeouts, by contrast, are fail-open. `permissionRequest` also treats exit `2` as deny. The lab is wrong in the *unsafe* direction — a learner who writes `exit 1` believing it is inert will silently block tool calls. |
| C3 | The lifecycle events are the five in the §6.1 table (`sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred`) | `free-check` | Incomplete. The reference's event table now lists fourteen: those five plus `sessionEnd`, `agentStop`, `subagentStart`, `subagentStop`, `postToolUseFailure`, `preCompact`, `permissionRequest`, `notification`, `userPromptTransformed`. The lab's own §6.2.1 already name-drops `agentStop`/`subagentStop`/`sessionEnd`, so the §6.1 table contradicts the §6.2.1 prose on the same page. Fix by marking the table non-exhaustive and linking the catalogue — **not** by enumerating fourteen rows in a 3-minute lab. |
| C4 | Hooks are configured in `.github/hooks/default.json` | `free-check` | Incomplete, and it is the first thing a learner trips on. The reference lists five sources, combined in load order **policy → user → project → plugins**: platform policy directories, `~/.copilot/hooks/` (`%USERPROFILE%\.copilot\hooks\` on Windows), `.github/hooks/*.json`, an inline `hooks` block in `settings.json`, and plugin-contributed `hooks.json`. One callout. |
| C5 | Hooks receive the event as JSON on stdin; `TOOL_NAME` / `FILE_PATH` are **not set**; `COPILOT_PROJECT_DIR` / `CLAUDE_PROJECT_DIR` are | `free-check` | **Confirmed and correct.** The reference's per-event input payloads are JSON objects with `sessionId`/`timestamp`/`cwd`/`toolName`/`toolArgs`, and document no such environment variables. The `preToolUse`-string vs `postToolUse`-object asymmetry the lab calls out also matches (`toolArgs: unknown`, parsed from a JSON string where possible). **Keep this section as the lab's centrepiece.** Optional one-line addition: a PascalCase event name selects a VS Code-compatible snake_case payload. |
| C6 | "(Copilot CLI 1.0.37+, re-verified on 1.0.83)" (§6.2.1 heading) | `free-check` | `docs/_meta/registry.yaml` → `copilot_cli_version_floor: "1.0.82"`. The lab hardcodes two versions in a heading, which is exactly what §6.0's own currency callout says labs must not do ("labs reference it rather than hardcoding values"). The lab contradicts itself on the same page — the same self-contradiction `specs/labs/lab10.md` D1 recorded. |
| C7 | §6.5 "Hooks in this repository" lists secret-scan, doc-blocker, long-running, format, **typecheck**, console-warn | `free-check` | `.github/hooks/default.json` registers seven bash entries: `user-prompt-submitted`, `pre-tool-use-long-running`, `pre-tool-use-doc-blocker`, `pre-tool-use-secret-scan`, `post-tool-use-format`, `post-tool-use-console-warn`, `error-occurred`. **`post-tool-use-typecheck.sh` exists in `scripts/hooks/` but is not registered**, and `user-prompt-submitted` / `error-occurred` are registered but absent from the lab's table. The table is wrong in both directions. |

**No `research` disposition on this lab.** C1 and C7 were settled by running a command; C2–C6
were settled by reading the primary reference directly. No `spec-forge` run is justified.

## 5. Non-goals

- **Do not grow the lab.** It is 3 presenter minutes and a beginner's first contact with hooks. Every correction in §6 is one callout, one table row, or one link. If a fix cannot fit in a callout, it belongs in `docs/copilot-config-reference.md`, not here.
- Do not enumerate all fourteen hook events. Mark the table non-exhaustive and link the catalogue.
- Do not teach `permissionRequest`, `modifiedArgs`, HTTP hooks, prompt hooks, sandboxed sessions, Claude-format matchers or agent-scoped hooks. They are real and current, and they belong in `lab-hardening` or the config reference. Naming `permissionRequest` in passing is fine; teaching it is scope creep.
- Do not edit `docs/_partials/currency.md` or `docs/_partials/cleanup.md`. Both are shared `@include` blocks — `cleanup.md` alone is included by every lab in this batch. See `specs/labs/lab10.md` D6.
- Do not edit `docs/copilot-config-reference.md`. Its §4 carries the same false deny-only claim, but that file is owned by `specs/labs/lab-hardening.md` AC7 in this batch. **Two parallel worktrees must not both edit it.**
- Do not renumber §6.1–§6.6, and do not change the `postToolUse` .NET build exercise, which is the lab's deliverable.
- Do not "fix" `.github/hooks/default.json` by registering `post-tool-use-typecheck.sh`. AC9 is satisfied by correcting the lab's table to match reality; changing the repo's live hook configuration is a behaviour change nobody asked for.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab06.md:15` (References) | `https://docs.github.com/en/copilot/using-github-copilot/using-hooks` returns **404**. The lab's only external link is dead. |
| D2 | §6.2 closing 💡 callout, repeated in §6.5 "Blocking" row | "A non-zero exit from any hook is logged and silently ignored." False and unsafe — command `preToolUse` hooks are fail-closed on non-zero exit. See C2. |
| D3 | §6.1 step 2 event table | Presented as the lifecycle event list; it is five of fourteen, and §6.2.1 on the same page names three more. |
| D4 | §6.1 step 1 and §6.5 "Config file" row | `.github/hooks/default.json` presented as *the* hook configuration. Omits policy hooks, `~/.copilot/hooks/`, the `settings.json` inline block and plugin hooks, and omits the policy→user→project→plugins load order. |
| D5 | §6.2.1 heading | Hardcodes "Copilot CLI 1.0.37+, re-verified on 1.0.83" while §6.0's currency callout on the same page says labs must reference the registry instead of hardcoding. Self-contradiction. |
| D6 | §6.5 "Hooks in this repository" table | Lists `typecheck` as a shipped hook; it is not registered in `default.json`. Omits `user-prompt-submitted` and `error-occurred`, which are. |
| D7 | §6.2 step 2 / step 3 | Instructs `cat scripts/hooks/pre-tool-use-secret-scan.sh` under a **PowerShell** heading using `Get-Content` on a `.sh` file — correct, but the doc-blocker step repeats `pre-tool-use-doc-blocker.sh` for PowerShell while the `.ps1` sibling exists. Cosmetic; fix only if touching the surrounding lines. |
| D8 | §6.6 Cleanup (shared partial) | The partial's step 2 tells the reader to restore `~/.copilot/config.json`. The current reference states the CLI "no longer reads `~/.copilot/config.json` for hooks" — it is `settings.json` now. **Shared partial; out of scope here** (see §5), recorded so the eventual partial pass has the location. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them.

- **§6.3 steps 1–2** — `cat > scripts/hooks/post-tool-use-dotnet-build.sh` and `.ps1`, and `chmod +x`. Creates files in the working tree.
- **§6.3 steps 3–4** — editing `.github/hooks/default.json` to register the new hook. **This is the dangerous one**: it installs a live `postToolUse` hook into the running session, which then shells out to `dotnet build` on every subsequent `.cs` edit. The lab reconfigures its own runtime.
- **§6.3 step 3** — `code .github/hooks/default.json`. Launches a GUI editor.
- **§6.4 steps 1–3** — piping a crafted event into the hook script. Executes `dotnet build dotnet/ContosoUniversity.sln` for real.
- **§6.6 cleanup (shared partial), step 5** — `git config --unset core.hooksPath`. A git-config mutation; in a worktree it edits configuration shared with every other worktree.
- **§6.6 cleanup (shared partial), step 1** — `Get-Job | Stop-Job` / `jobs -l` plus kill-by-PID. Terminates background processes that may not belong to the lab.

> The lab's *content* changes are prose, tables, callouts and one link. None of them requires
> any of the above to run, which is why the verdict is `run with §7 fenced` and not
> `do not run`.
