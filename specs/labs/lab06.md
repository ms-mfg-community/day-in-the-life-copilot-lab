# Lab spec — `labs/lab06.md`

| | |
|---|---|
| **Lab** | `labs/lab06.md` — "Hooks" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-15) |
| **Last updated** | 2026-11-12 — Phase 3 (hooks overhaul) of the 2026-11 remediation plan; see §1 "Phase 3 widening", AC12–AC19, §4 C8–C20, §5 and §6 D9–D14. AC18–AC19, C18, C20, D13 and D14 record the fixes after the first independent review (the `.env` guards crashed on non-object arguments; the guard registration was unnamed and outlived its script). |

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

**Phase 3 (2026-11-12) does not reopen this decision.** The new hook-type, polyglot and
15-event material is an *optional, untimed* extension inside `lab06` (a collapsed deep dive
in §6.1 and the new §6.2.2). It teaches no extension SDK (`lab-copilot-cli-extensions`), no
git hooks (`lab-gh-extensions`) and no two-layer gating design (`lab-hardening`), so all four
labs stay standalone and Lab 06 keeps its beginner tier and its 3 / 10 minute pacing.

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

### Phase 3 widening (2026-11-12)

Phase 3 of the 2026-11 remediation plan (hooks overhaul) supersedes the "no new section"
sentence above and the 2026-10-15 stance that the lab must not grow, **without changing the
lab's tier, its timed route or its pacing**. `labs/lab06.md` gains two optional, untimed
extensions that sit after the core path: a collapsible **Deep Dive: All 15 Hook Lifecycle
Interrupts & Surface Matrix** at the end of §6.1, and a new **§6.2.2 Polyglot hooks,
shell-free `exec`, and calling external services (`"type": "http"`)**. §6.2.2 teaches Node.js,
Python, Bash and PowerShell hooks, shell-free `exec` + `args`, `"type": "http"` webhooks
(`url`, `headers`, `allowedEnvVars`, `COPILOT_HOOK_ALLOW_LOCALHOST=1`,
`COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1`), `"type": "prompt"` and the advanced capabilities.

Two things stay exactly as they were. §6.1's beginner intro table remains **concise** (the four
events this repo registers) and marked **non-exhaustive** (AC6), and `.github/hooks/default.json`
is never changed. The exhaustive reference moves to `docs/copilot-config-reference.md` §4.3,
which becomes the 15-event catalogue: the 14 events in the GitHub hooks reference plus
`preMcpToolCall`, which only the Copilot CLI's built-in docs describe. Its §4.1–§4.9 cover all
three hook types, failure semantics, advanced outputs, matchers, payload formats and
agent-scoped hooks.

**Two rules joined them after the first independent review of Phase 3.** First, the four `.env`
guards in §6.2.2 are *run*, not read (AC18). The prose said they "behave identically", and nobody
had fed them anything but friendly input: given an `apply_patch` call, whose `toolArgs` is patch
text rather than JSON, every one threw while parsing, and a thrown error in a command `preToolUse`
hook is a deny. They now follow three stated rules (tool name first, odd arguments are "no
opinion", non-JSON input fails) and inspect `apply_patch`. Second, the one live, fail-closed
registration §6.2.2 offers lives in a named scratch file that Clean up deletes before the script it
points at, and is never `default.json` (AC19). `.github/hooks/default.json` is still never changed.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — the lab reads and writes files under `scripts/hooks/` and `.github/hooks/`, and exercises a hook by piping JSON into it. §6.3 step 3 also calls `code` (a GUI editor). |
| **Tier** | `beginner` |
| **Presenter minutes** | 3 (unchanged; the Phase 3 additions are optional and untimed) |
| **Self-paced minutes** | 10 (unchanged; the Phase 3 additions are optional and untimed) |
| **Prerequisites** | Lab 01 (repository configuration tour — the learner must know what `.github/` holds before being asked to edit `.github/hooks/default.json`). The .NET build hook assumes `dotnet/ContosoUniversity.sln` exists, which `setup` provides. Lab 07 is linked as *next*, not as a prerequisite. The optional §6.2.2 Node.js examples need Node.js 22+, which the README already lists as a prerequisite; its Python variant needs Python 3 and is optional. |
| **Write steps** | **Yes — seven kinds, and one of them is outside the repository.** (a) §6.3 step 1–2 `cat > scripts/hooks/post-tool-use-dotnet-build.sh` / `.ps1` — creates two new files in the working tree, plus `chmod +x`. (b) §6.3 step 3–4 **edits `.github/hooks/default.json`, a committed file**, to register the new hook. (c) §6.3 step 3 `code .github/hooks/default.json` — launches a GUI editor. (d) §6.4 pipes a crafted event into the hook, which runs `dotnet build` on the real solution. (e) §6.2.2 (optional) saves scratch scripts under `scripts/hooks/` (`guard-env.*`, `guard_env.py`, `audit-receiver.mjs`), pipes sample events into them, and starts a local Node listener on `127.0.0.1:8787` in a second terminal. (f) §6.2.2 part 2 (optional) creates `.github/hooks/guard-env-local.json`, a scratch hooks file **inside the repository** (never `default.json`): a live, **fail-closed** `preToolUse` hook for every Copilot CLI session in this checkout until it is deleted. While `scripts/hooks/guard-env.mjs` exists it denies `.env` writes; once the script is gone it denies every `edit`, `create`, `write` and `apply_patch` call. It sits in the repository, not the user hooks folder, because its script path is relative to the repository. Clean up must delete it before the script (AC19). (g) §6.2.2 part 3 (optional) creates `audit-local.json` in the **user** hooks folder (`~/.copilot/hooks/`), **outside the repository**: a live user-level hook for every Copilot CLI session on the machine until it is deleted, used with `COPILOT_HOOK_ALLOW_LOCALHOST=1`. The shared cleanup partial additionally runs `git config --unset core.hooksPath`, a git-config mutation. Per `specs/labs/README.md`, (b), (f), (g) and the git-config mutation are write steps by definition. |
| **`lab-forge` verdict** | **`run with §7 fenced`** — the edit this lab needs is prose, tables and code listings, which require executing none of the above. Every item is enumerated in §7 and the run gate must report each UNVERIFIED. Phase 3 keeps this verdict. |

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
| AC6 | The §6.1 beginner intro table is marked non-exhaustive and points at the full event catalogue (the deep dive and `docs/copilot-config-reference.md` §4.3) | `npx vitest run tests/lab-structure/lab06-contract` |
| AC7 | The lab names hook sources beyond `.github/hooks/` — at minimum the user-level hooks directory and policy hooks | `npx vitest run tests/lab-structure/lab06-contract` |
| AC8 | The lab hardcodes no Copilot CLI version in prose; it references the registry floor instead | `npx vitest run tests/lab-structure/lab06-contract` |
| AC9 | Every hook the §6.5 "Hooks in this repository" table presents as shipped is actually registered in `.github/hooks/default.json` (excluding `dotnet-build`, which the learner creates) | `npx vitest run tests/lab-structure/lab06-contract` |
| AC10 | Declared pacing is internally consistent: frontmatter `pace`, the inline `⏱️` callout, and `docs/_meta/registry.yaml` `labs.lab06` agree | `npx vitest run tests/lab-structure/lab06-contract` |
| AC11 | The stdin-JSON IPC teaching survives: the lab still states the payload arrives on stdin and that `TOOL_NAME`/`FILE_PATH` are not exported | `npx vitest run tests/lab-structure/lab06-contract` |
| AC12 | §6.1's beginner intro table stays concise (at most six event rows) and marked non-exhaustive, and a collapsible **Deep Dive: All 15 Hook Lifecycle Interrupts & Surface Matrix** inside §6.1 names all 15 events in four groups (session, turn and prompt, subagent, tool-execution), attributes `preMcpToolCall` to the Copilot CLI built-in docs rather than the hooks reference table, and links `docs/copilot-config-reference.md#43-event-catalogue` | `npx vitest run tests/lab-structure/lab06-contract` |
| AC13 | `docs/copilot-config-reference.md` §4.3 is the exhaustive 15-event catalogue: exactly 15 numbered rows, a surface matrix whose Source column sends 14 events to the hooks reference and `preMcpToolCall` to the CLI build docs, PascalCase aliases only for the 11 documented ones (none invented for `userPromptTransformed`, `preMcpToolCall`, `subagentStart` or `notification`), the four `errorOccurred` `errorContext` values, and the cloud agent and VS Code surface notes | `npx vitest run tests/lab-structure/lab06-contract` |
| AC14 | `labs/lab06.md` §6.2.2 sits between §6.2.1 and §6.3 and teaches Node.js, Python, Bash and PowerShell hooks, shell-free `exec` + `args`, `"type": "http"` (`url`, `headers`, `allowedEnvVars`, `COPILOT_HOOK_ALLOW_LOCALHOST=1`, `COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1`), `"type": "prompt"` and the advanced capabilities | `npx vitest run tests/lab-structure/lab06-contract` |
| AC15 | Surface and failure semantics are attributed precisely: `exec` + `args` are not called Copilot-CLI-only; an `http` hook is the *recommended built-in hook type* for cloud agent log retention once the host is admin-allowlisted, never "the only way"; command `preToolUse` is fail-closed on a non-zero exit while timeouts and empty or unparseable stdout fall through, and HTTP `preToolUse` is fail-open; `stop_hook_active` is attributed to `agentStop` and both stop events share the 8-consecutive-block guard | `npx vitest run tests/lab-structure/lab06-contract` |
| AC16 | `docs/copilot-config-reference.md` §4 documents all three hook types (`command` including `exec` / `args`, `http`, `prompt`), the advanced outputs, the matcher table, camelCase versus PascalCase payloads with the Claude tool-name map, and agent-scoped hooks | `npx vitest run tests/lab-structure/lab06-contract` |
| AC17 | The Phase 3 material stays off the timed route (the *Timed route* callout names §6.2.2 as untimed) and out of the live hook config: `.github/hooks/default.json` registers none of the §6.2.2 example hooks | `npx vitest run tests/lab-structure/lab06-contract` |
| AC18 | The four `.env` guards in §6.2.2 (Node.js, Python, Bash, PowerShell) are executed as the lab writes them, on every runtime available, against one shared event matrix, and give the same decision on every event. A write to `.env`, `.env.local` and the like is denied, including through `apply_patch`, whose arguments are patch text (raw or JSON-encoded). Any other tool, and arguments that are not an object (an empty string, an array, `null`, a number, text that is not JSON), mean no opinion: no output and exit `0`, never a crash. Only input that is not JSON at all exits non-zero. The lab states those three rules and says `toolArgs` is not always a JSON object, the config reference §4.9 says the same, and the line the lab promises for its example events is exactly what every guard prints | `npx vitest run tests/lab-structure/lab06-contract` |
| AC19 | The optional guard registration in §6.2.2 part 2 is a complete hooks file the learner creates under a name the lab gives, `.github/hooks/guard-env-local.json`: never `default.json`, and not the user hooks folder, because its script path is relative to the repository. The lab warns that a registration outliving its script denies every call it matches (command `preToolUse` is fail-closed), Clean up deletes the registration files before the scripts in both shells, and the repository ships no copy of the scratch registration | `npx vitest run tests/lab-structure/lab06-contract` |

> AC11 is a **guard**, not a change. It is the lab's single teaching idea and the editing
> stage must not lose it while fixing the claims around it. AC12–AC17 were added with Phase 3
> (2026-11-12); AC12's concise-table clause and AC17 are guards in the same sense. AC18–AC19 were
> added after the first independent review of Phase 3. AC18 is the only criterion that *executes*
> lab content: it runs the guards from an OS temp directory, outside the working tree and with no
> Copilot session, which is why it does not conflict with the §7 fences on the learner-facing steps.

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
| C8 | Phase 3: "Copilot defines 15 lifecycle events: 14 in the GitHub hooks reference plus `preMcpToolCall`, which only the Copilot CLI's built-in docs describe" (§6.1 deep dive; config reference §4.3) | `free-check` | The hooks reference's "Hook events" table lists 14: `agentStop`, `errorOccurred`, `notification`, `permissionRequest`, `postToolUse`, `postToolUseFailure`, `preCompact`, `preToolUse`, `sessionEnd`, `sessionStart`, `subagentStart`, `subagentStop`, `userPromptSubmitted`, `userPromptTransformed`. Copilot CLI 1.0.110-3's built-in docs add `setting:hooks.preMcpToolCall` ("Hooks that run before an MCP tool request is sent, able to adjust its metadata") and the `COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS` variable (`topic:environment#environment-variables-4`). The reference publishes no payload schema for `preMcpToolCall`, so the lab and the catalogue say so. Khriss adjudication 2026-11-12. |
| C9 | "Only 11 events document a PascalCase configuration alias: `SessionStart`, `UserPromptSubmit`, `PermissionRequest`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SubagentStop`, `Stop`, `PreCompact`, `ErrorOccurred`, `SessionEnd`; `userPromptTransformed`, `preMcpToolCall`, `subagentStart` and `notification` have none" | `free-check` | The reference's input-payload headings pair camelCase and PascalCase names (`sessionStart / SessionStart` … `agentStop / Stop`); `subagentStart`, `userPromptTransformed` and the `notification` hook section carry no alias, and `notification` only emits `hook_event_name: "Notification"` in its payload. `preMcpToolCall` is not in the reference at all. Khriss item 5. |
| C10 | "Shell-free `exec` + `args` work in Copilot CLI and in VS Code's Copilot harness; the cloud agent honors `bash` / `command` entries" | `free-check` | VS Code agent hooks page, "Configure commands and event data": "A shell-free `exec` and `args` form is also available; these arguments are not a replacement for the event JSON on stdin", and VS Code, the Copilot app and Copilot CLI "share this harness and its hook format". The GitHub reference's field table calls `exec` "Only supported in Copilot CLI" while contrasting the CLI with the cloud agent, which honors only `bash` / `command`. The lab must not turn that into "CLI only". Khriss item 1. |
| C11 | "`"type": "http"` hooks POST the event JSON to `url`, take `headers` and `allowedEnvVars`, accept only `https://` by default, need `COPILOT_HOOK_ALLOW_LOCALHOST=1` for loopback, and need `COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1` for plain `http://` on `preToolUse`, `preMcpToolCall` and `permissionRequest`; `allowedEnvVars` requires `https://`" | `free-check` | Hooks reference "HTTP hooks" field table (the `url` row restricts `preToolUse` and `permissionRequest` to `https://`); Copilot CLI built-in docs `topic:environment#environment-variables-4` for both variables and for `preMcpToolCall`. |
| C12 | "`"type": "http"` is the *recommended built-in hook type* for retaining persistent audit logs from ephemeral cloud agent jobs, once the destination host is admin-allowlisted" — not "the only way" | `free-check` | Hooks reference "Cloud agent execution environment": the filesystem is ephemeral ("To retain hook output, send it via an `http` hook entry") and the firewall reaches only GitHub and Copilot hosts without an admin allow rule. A command hook can also make an outbound request, so "only" would be wrong. Khriss item 2. |
| C13 | "Command `preToolUse` hooks are fail-closed on a non-zero exit (even if stdout said `allow`); timeouts and empty or unparseable stdout fall through. HTTP `preToolUse` hooks are fail-open on network errors, timeouts and non-2xx responses" | `free-check` | Hooks reference `preToolUse` "Command vs HTTP fail behavior" callout, "Exit codes for command hooks", and the progress-message note ("If the leftover output is empty, or fails to parse as JSON, the hook is treated as having produced no output and falls through to default behavior"). Khriss item 3. |
| C14 | "`agentStop` and `subagentStop` both take `{"decision": "block", "reason": "..."}` and share the 8-consecutive-block runaway guard; `stop_hook_active` is documented on the `agentStop` input" | `free-check` | Hooks reference "`agentStop` / `subagentStop` decision control" and its Runaway guard note. The `agentStop` input lists `stop_hook_active`; the shared-runtime `subagentStop` input does not. VS Code's legacy Local reference lists it on its own `SubagentStop` payload, which is a different harness. Khriss item 4. |
| C15 | "`permissionRequest` and `notification` are documented as firing in Copilot CLI and not firing (or having no effect) in the cloud agent; `userPromptSubmitted` fires at most once per cloud agent job; `errorOccurred` has four `errorContext` values, and the CLI setting describes it as running when a model call fails" | `free-check` | Hooks reference "Hook events" table, "Cloud agent" column, plus the `permissionRequest` and `notification` sections and the `errorOccurred` payload; Copilot CLI built-in `setting:hooks.errorOccurred`. The lab and the catalogue do **not** assert that the VS Code Copilot harness excludes either event. Khriss item 6. |
| C16 | "`postToolUse` caps combined `additionalContext` at 10 KB; `sessionStart` and `subagentStart` accumulate it up to the 10 MiB hook-output limit; `modifiedArgs`, `modifiedResult`, `modifiedResponse` and live `{"type":"progress"}` lines are honored" | `free-check` | Hooks reference `postToolUse` output, the `sessionStart` and `subagentStart` output notes, "`preToolUse` decision control", "`agentStop` / `subagentStop` decision control" and "Progress messages". Khriss item 6. |
| C17 | "`"type": "prompt"` auto-submits a prompt or slash command; `sessionStart` only; new interactive Copilot CLI sessions only; not on resume or in `-p` mode; may not fire under the cloud agent" | `free-check` | Hooks reference "Prompt hooks". |
| C18 | "Any language that reads stdin JSON and writes stdout JSON works; the Node.js, Python, Bash and PowerShell guards in §6.2.2 follow the same three rules and give the same decision on the same event" | `free-check` | Settled by running them on 2026-11-12, and kept settled by AC18. The contract test extracts the four guards from the lab, writes them out under the names the lab gives them, and feeds every runtime it finds one shared event matrix (76 events when this was written): the `.env` cases the guards were written for (`.env`, `.env.local`, `.env.example`, nested paths, either path key, upper case, Windows separators); `apply_patch` as raw patch text and as JSON-encoded patch text (add, update, delete, move, several files, CRLF); every kind of `toolArgs` that is not an object (an empty string, `[1,2]` as text and as a real array, `null`, numbers, booleans, plain text, truncated JSON); tools that are not file-writing tools given arguments that are not JSON; input that is not JSON (non-zero exit); and JSON that is not an event object (no opinion). All four agreed on every decision and on the exact `permissionDecisionReason`, and every example event the lab pipes in prints exactly the line the lab promises. Run with Node 24, Python 3.13, PowerShell 7.6 and Git Bash 5.3 with jq 1.7.1, and the same matrix once more under WSL Bash 5.2 with jq 1.7. **Not run:** macOS Bash 3.2, jq 1.6 (the Bash guard uses only builtins that exist since jq 1.5) and Windows PowerShell 5.1 (the lab requires PowerShell 7), so those three are UNVERIFIED. The first version of this row said the guards had been fed "eight events" and agreed. They had not been fed arguments that were not an object. When they were, all four threw on a raw `apply_patch` patch, Python and Bash also threw on a JSON-encoded one, and Node and PowerShell never inspected it, so a `.env` write through `apply_patch` was never denied. A throw in a command `preToolUse` hook is a deny, so the guards locked the learner out of `apply_patch` instead of guarding it. The `audit-receiver.mjs` listener, run from the lab's own code, answered `200` and `{}` to a posted event and to a garbage body. The CLI-side behavior (launching `exec`, the matcher, the HTTP POST, the environment-variable gates) is documented behavior only: no live Copilot CLI run was made, so it is UNVERIFIED (§7). |
| C19 | "`allowedEnvVars` expands environment variables inside `headers` values" — the placeholder syntax | `cut` | The reference describes the field ("Environment variable names that may be expanded inside `headers` values. When set, `url` must use `https://`") but shows no placeholder example. The lab and the catalogue tell the reader to test the expansion against a throwaway `https://` endpoint and **teach no placeholder form**. |
| C20 | "`toolArgs` is typed `unknown`: a JSON-encoded string of an object, an object that is already parsed, or plain text. `apply_patch`, an edit tool, sends its patch as plain text, so a guard must check the tool name before it parses the arguments" | `free-check` | The hooks reference types `toolArgs` as `unknown` in the `preToolUse`, `postToolUse` and `postToolUseFailure` inputs, and says the PascalCase `tool_input` is "parsed from JSON string when possible". Its Claude tool-name map lists `apply_patch` with `edit` and `str_replace_editor` as an `Edit` tool. A real `postToolUse` payload recorded in a Copilot CLI session log on the author's machine (a `hook.start` event) carries `"toolName":"apply_patch","toolArgs":"*** Begin Patch\n*** Add File: …"`, and the tool's own recorded arguments are the same patch text; the review that found the defect reported the same. **No `preToolUse` payload for `apply_patch` was found in the local logs**, so whether it arrives raw or JSON-encoded is UNVERIFIED, and the guards accept both (AC18). |

**No `research` disposition on this lab.** C1 and C7 were settled by running a command; C2–C6
were settled by reading the primary reference directly. No `spec-forge` run is justified.
C8–C17 and C19 are the Phase 3 claims, adjudicated by Khriss on 2026-11-12 against the hooks
reference, the VS Code agent hooks page and the Copilot CLI 1.0.110-3 built-in docs. C18 and C20
came out of the first independent review: C18 was settled by running the guards, and C20 by the
hooks reference plus a recorded payload. Each one is also pinned by AC12–AC19.

## 5. Non-goals

- **Do not grow the timed route.** The beginner path (§6.1–§6.4 and §6.6) stays 3 presenter minutes and 10 self-paced minutes, a beginner's first contact with hooks. Everything Phase 3 adds is optional, untimed reference placed after the core path or inside a collapsed `<details>`. If a fix cannot fit there, it belongs in `docs/copilot-config-reference.md`, not in the lab.
- **Keep §6.1's beginner intro table concise and `non-exhaustive`.** It stays at the four events this repo registers (AC12 caps it at six rows) and keeps its non-exhaustive marker (AC6). Do not enumerate all 15 events there. The full list lives in the collapsible **Deep Dive: All 15 Hook Lifecycle Interrupts & Surface Matrix** at the end of §6.1, and `docs/copilot-config-reference.md` §4.3 is the exhaustive 15-event catalogue.
- **Phase 3 supersedes the old ban on HTTP hooks, prompt hooks, `modifiedArgs` and agent-scoped hooks.** They are now taught, but only in the optional §6.2.2 (polyglot Node.js / Python / Bash / PowerShell hooks, shell-free `exec` + `args`, `"type": "http"` webhooks, `"type": "prompt"` and the advanced capabilities) and in the config reference, never in the timed route. Still out of scope: sandboxed-session troubleshooting, authoring enterprise policy hooks (they are named, not taught), migrating hooks from Claude Code or the legacy VS Code Local harness, the SDK programmatic-hooks API (`modifiedPrompt`), and debugging and observability (Phase 4).
- Do not edit `docs/_partials/currency.md` or `docs/_partials/cleanup.md`. Both are shared `@include` blocks — `cleanup.md` alone is included by every lab in this batch. See `specs/labs/lab10.md` D6.
- **`docs/copilot-config-reference.md` is now in scope for Phase 3, and only §4 and its banner and accuracy rows are.** The 2026-10-15 "do not edit" rule was a parallel-worktree guard for that batch, when `specs/labs/lab-hardening.md` AC7 owned the file; Phase 3 owns §4 deliberately. Lab-hardening AC7 still binds: §4 must never say `allow` / `ask` are "accepted but ignored" or that only `deny` is acted on. §1–§3 and §5–§6 of the reference are untouched.
- Do not renumber §6.1–§6.6, and do not change the `postToolUse` .NET build exercise, which is the lab's deliverable. §6.2.2 is a sub-section of §6.2, so nothing renumbers.
- Do not "fix" `.github/hooks/default.json` by registering `post-tool-use-typecheck.sh`, and never register any §6.2.2 example hook there. AC9 is satisfied by correcting the lab's table to match reality, and AC17 pins that the file registers none of the new examples; changing the repo's live hook configuration is a behaviour change nobody asked for.
- Leave the frontmatter `pace` (3 / 10) and the registry row untouched, and keep inline Copilot CLI versions out of `labs/lab06.md` (AC8).
- Do not call shell-free `exec` + `args` "Copilot CLI only", and do not call an `http` hook "the only way" to keep cloud agent logs (AC15, C10, C12).
- **The `.env` guards are teaching code, not a security boundary.** They check the file-writing tools (`edit`, `create`, `write`, `apply_patch`) and nothing else: a shell command such as `echo X=1 > .env` arrives as a `bash` call and they have no opinion on it. The lab says so. Closing that gap (a shell-command parser, a permission rule) is out of scope, as is extending the guards to the PascalCase `PreToolUse` payload (`tool_name`, `tool_input`).
- **Never ship the scratch registration.** `.github/hooks/guard-env-local.json` is a file the learner creates and deletes. The repository must not contain it, in any hooks folder (AC19): committed without its script, it would deny every `edit`, `create`, `write` and `apply_patch` call for everyone who clones the repository.

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
| D9 | `labs/lab06.md` §6.1 step 3, §6.2, §6.5 | Taught only `"type": "command"` with `bash` / `powershell`, and said "always provide both". No polyglot hook, no shell-free `exec` + `args`, no `"type": "http"`, no `"type": "prompt"`. Fixed by the new §6.2.2, with the §6.1 callout and the §6.5 rows adjusted to match. See C10–C12, C17, C18. |
| D10 | `labs/lab06.md` §6.1 | The beginner table names four events and the lab never named the other eleven. Fixed by the collapsible 15-event deep dive at the end of §6.1; the table itself stays four rows and non-exhaustive. See C8, C9, C15. |
| D11 | `docs/copilot-config-reference.md` §4.1–§4.3 | Documented only `"type": "command"`, listed 8 of the 15 events and admitted it in a trailing sentence, and had no coverage of failure semantics, advanced outputs, matchers, payload formats or agent-scoped hooks. Fixed: §4.1–§4.9, with §4.3 the exhaustive catalogue and accuracy-table rows 11–17. |
| D12 | `docs/copilot-config-reference.md` banner | The "Compiled 2026-04-24 … Copilot CLI 1.0.36" banner no longer described §4. Fixed by a second banner line recording the 2026-11-12 re-verification of §4. |
| D13 | `labs/lab06.md` §6.2.2 part 1 (the four `.env` guards) | Found by the first independent review. Each guard parsed `toolArgs` as JSON before it checked the tool name, so a tool whose arguments are not JSON made it throw, and a throw in a command `preToolUse` hook is a deny: `apply_patch`, whose `toolArgs` is patch text, was denied on every call, and a `.env` write through it was never inspected. The four also disagreed with each other on an empty string, arrays, case, Windows separators and more, against the prose that said they "behave identically". Fixed: tool name first, arguments that are not an object mean "no opinion", `apply_patch` headers are inspected, one shared contract in all four, and AC18 runs them. See C18, C20. |
| D14 | `labs/lab06.md` §6.2.2 part 2 and its Clean up | Found by the first independent review. Part 2 said to put an `exec` entry in "a hooks file shaped like the one in §6.1 step 3" without naming it, and the only hooks file the lab has the learner open is `default.json`. Clean up deleted `scripts/hooks/guard-env.mjs` but never the registration, so a learner who followed the lab literally was left with a fail-closed hook pointing at a missing script and every tool call denied. Fixed: a complete hooks file in a named scratch file (`.github/hooks/guard-env-local.json`, never `default.json`), a warning that a registration must not outlive its script, and Clean up deleting the registration first, in both shells. See AC19. |

**Found during Phase 3 and deliberately not fixed** (recommendations for the next pass; QA should confirm they are unchanged, not gone):

- `labs/lab06.md` §6.2.1 and §6.4 show `"resultType": "ok"` in the `postToolUse` payload. The hooks reference documents `resultType: "success"`, which §6.2.2 and the config reference use. The build hook does not read the field, so nothing breaks. Fix when that sample is next touched.
- `labs/lab06.md` §6.4's "Verifying hooks in VS Code" callout points at the **GitHub Copilot Chat Hooks** output channel, which the VS Code page ties to the legacy Local harness. Phase 4 (debugging and observability) owns the replacement.
- `lab-studio/lab-sources.json` still records the previous hash of `labs/lab06.md`, and `lab-studio/client/src/labs/lab06.tsx` does not yet teach §6.2.2. Phase 6 re-syncs Lab Studio and runs `npm run drift:accept`.
- `labs/lab06.md` §6.2.1 says `postToolUse` delivers `toolArgs` "already a parsed object". That holds for tools whose arguments are a JSON object. A recorded `postToolUse` payload for `apply_patch` carries the patch as plain text (C20). §6.2.2's callout and the config reference §4.9 state the exception; the §6.2.1 sentence is pre-existing core teaching and was left as it was. Qualify it when §6.2.1 is next touched.

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them.

- **§6.3 steps 1–2** — `cat > scripts/hooks/post-tool-use-dotnet-build.sh` and `.ps1`, and `chmod +x`. Creates files in the working tree.
- **§6.3 steps 3–4** — editing `.github/hooks/default.json` to register the new hook. **This is the dangerous one**: it installs a live `postToolUse` hook into the running session, which then shells out to `dotnet build` on every subsequent `.cs` edit. The lab reconfigures its own runtime.
- **§6.3 step 3** — `code .github/hooks/default.json`. Launches a GUI editor.
- **§6.4 steps 1–3** — piping a crafted event into the hook script. Executes `dotnet build dotnet/ContosoUniversity.sln` for real.
- **§6.2.2 part 1, "In your terminal"** — saving `scripts/hooks/guard-env.mjs` and piping sample events into it (the `edit` example and the `apply_patch` example), plus the "break it on purpose" step. Creates a file in the working tree and runs a script that exits non-zero by design. (AC18 runs the same guards from an OS temp directory, outside the working tree and with no Copilot session; that is a repository test, not the learner's step, and is not fenced.)
- **§6.2.2 part 2, "Registering it"** — creating `.github/hooks/guard-env-local.json`. A project-level **fail-closed** `preToolUse` hook: with `scripts/hooks/guard-env.mjs` in place it denies `.env` writes, and once the script is gone it denies every `edit`, `create`, `write` and `apply_patch` call in the checkout. Run inside a Copilot session it reconfigures the runtime that is running the lab. The run gate must not create it, and the repository must never contain it (AC19).
- **§6.2.2 part 3, "Try it locally"** — saving `scripts/hooks/audit-receiver.mjs`, starting a Node listener on `127.0.0.1:8787`, creating `audit-local.json` in the user hooks folder (`~/.copilot/hooks/`, **outside the repository**), setting `COPILOT_HOOK_ALLOW_LOCALHOST=1` and launching `copilot`. A live user-level hook reconfigures every Copilot CLI session on the machine, and, run inside a Copilot session, it reconfigures the runtime that is running the lab.
- **§6.2.2 "Clean up"** — `rm -f` / `Remove-Item` on the two registration files (`.github/hooks/guard-env-local.json`, which must go **before** the scripts, and `audit-local.json`), then on the scratch scripts, plus clearing `COPILOT_HOOK_ALLOW_LOCALHOST` in PowerShell. Deletes files, one of them in the user's home directory. The order matters: a registration whose script is gone denies calls (AC19).
- **Live Copilot CLI behavior behind C10, C11 and C17** — that `exec` launches the interpreter, that an `http` hook POSTs to a loopback listener only when `COPILOT_HOOK_ALLOW_LOCALHOST=1` is set, and that a prompt hook fires on a new interactive session. These are documented behavior; the run gate must not start a Copilot CLI session to confirm them.
- **§6.6 cleanup (shared partial), step 5** — `git config --unset core.hooksPath`. A git-config mutation; in a worktree it edits configuration shared with every other worktree.
- **§6.6 cleanup (shared partial), step 1** — `Get-Job | Stop-Job` / `jobs -l` plus kill-by-PID. Terminates background processes that may not belong to the lab.

> The lab's *content* changes are prose, tables, callouts, code listings and links. None of them
> requires any of the above to run, which is why the verdict is `run with §7 fenced` and not
> `do not run`.
