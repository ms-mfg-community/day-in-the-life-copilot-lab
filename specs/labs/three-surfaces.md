# Cross-lab spec — the 3-Surface UX facelift (`labs/*.md` + `docs/images/labs/`)

> This is a **cross-lab** spec: Phase 5 touches every lab file at once, so it has no single
> `labs/<lab>.md` to own it. Each lab's own spec still governs that lab's facts; this one
> governs the **surface vocabulary** they share and the seven images that illustrate it.
> The per-lab specs for Setup and Labs 01–07 carry a short Phase 5 amendment that points here.

| | |
|---|---|
| **Lab** | all of `labs/*.md` (`setup`, `lab01`–`lab20`, `lab-hardening`, `lab-copilot-cli-extensions`, `lab-gh-extensions`) and the track appendices under `labs/appendices/`; the seven SVGs in `docs/images/labs/`; the two guides that embed them (`docs/debugging-and-observability.md`, `docs/copilot-config-reference.md`) |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-11-13) |
| **Last updated** | 2026-11-13 |

---

## 1. Target state

A learner can always tell **where a step is typed**. Every step names one of three surfaces with a
badge — 🐚 **In your OS Terminal**, 🤖 **In Copilot CLI**, 💠 **In VS Code** — so an OS command
(`ls`, `cat`, `dotnet`, `git`) never ends up in a `copilot>` session, a slash command never ends up in
a shell, and a file edit is not mistaken for either. The single teaching idea is **"the badge names
what you type into, not the window it sits in"** (VS Code's integrated terminal is still a 🐚 shell).

Setup and Lab 01 teach the legend up front, with an image. Labs 02, 03, 04, 06 and 07, where learners
create `.github/` files, show the **editor-first** instruction (open or create the file in VS Code, paste,
save) and fold the Bash / PowerShell heredoc into a collapsed *Shell alternative*. Labs 01–07 each gain
a short 💠 counterpart: pick a custom agent from the **Agent** dropdown, run a skill with `/skill-name`,
inspect what loaded with **Chat: Open Customizations**, open the Agent Debug Logs and the Chat Debug View.
Seven annotated SVGs make the surfaces, the VS Code panels, the CLI session commands, the hook lifecycle
and the OpenTelemetry span tree visible.

This is a **presentation** pass. No lab changes what it teaches, what it asks the learner to run, or how
long it takes.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — OS Terminal, Copilot CLI session, VS Code. Two further markers are **not** typing surfaces and are defined in the legend: 🌐 (a page on github.com) and 💬 (a discussion question to answer aloud, used by Labs 16, 17, 19 and 20). |
| **Tier** | n/a — cross-cutting. Each lab keeps its own tier. |
| **Presenter minutes** | unchanged for every lab. Pacing is never asserted here (see `specs/labs/README.md`). |
| **Self-paced minutes** | unchanged for every lab. |
| **Prerequisites** | None added. |
| **Write steps** | **None added.** The 💠 steps are UI actions (open a panel, pick an agent, create a file in the editor). Labs that already had write steps keep them and their existing `lab-forge` verdicts. |
| **`lab-forge` verdict** | `run with §7 fenced` — the facelift adds no write step to any lab. The 💠 steps need a running VS Code and are reported UNVERIFIED (§7). |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | **No ambiguous terminal header.** No file under `labs/` (appendices included) contains `🖥️`, and no bold header such as "In your terminal:" remains | `npx vitest run tests/lab-structure/three-surfaces-contract` |
| AC3 | **The legend is up front.** `labs/setup.md` and `labs/lab01.md` each carry a "The Three Surfaces Legend" section with the three canonical badges verbatim, what belongs on each surface, the `three-surfaces-guide.svg` image, and the "badge names what you type into" rule; in Lab 01 it precedes `## 1.1` | same |
| AC4 | **Every lab names its surface.** Each of the 24 lab files has at least one 🐚, 🤖 or 💠 marker; every `##`/`###` section that holds a `bash`/`powershell` block has one; no code fence is left unterminated; **and a Copilot prompt is never left under a 🐚 badge** — for every slash command or plain-English request in a blank or `text` fence, the last 🐚 / 🤖 / 💠 / 💬 above it is 🤖, 💠 or 💬, never 🐚 and never nothing (a 🌐 aside does not move it, and a folded *Shell alternative* labels only its own fold). Lab 10 §10.3a, §10.3b, §10.5a and §10.5b are also pinned by name: each carries a 🤖 line of its own, and §10.3a says, under 🐚, to start `copilot` | same |
| AC5 | **A badge names its surface.** Every paragraph that uses 🐚, 🤖 or 💠 also says "OS Terminal", "Copilot CLI" (or `copilot>`) or "VS Code", respectively | same |
| AC6 | **Editor-first.** In Labs 02, 03, 04, 06 and 07 and their appendices, every heredoc / here-string / `Set-Content` block that writes a file sits inside `<details><summary>🐚 Shell alternative (Bash / PowerShell heredoc)</summary>`, after a 💠 In VS Code step in the same section. Labs 01–07 each have a 💠 counterpart: Agent dropdown (01, 03, 07), `/skill-name` (04), **Chat: Open Customizations** (01–06), **MCP Servers** tab (05), **Hooks** tab (06), **Show Chat Debug View** (02), **Show Agent Debug Logs** (06, 07) | same |
| AC7 | **Seven valid SVGs.** `docs/images/labs/` holds exactly the seven files; each is well-formed XML (checked by an in-test parser, with negative cases), declares `xmlns`, `viewBox` ≥ 1200 wide, `role="img"` and `aria-labelledby` naming a direct-child `<title>` and `<desc>`, draws on a dark background, has no script, handler, external reference or raster, no inline `1.0.NN` CLI version, and carries the labels its captions promise | same |
| AC8 | **Every image resolves.** Every Markdown or HTML image under `labs/` and `docs/` has descriptive alt text and a target that exists and is not empty; each SVG is embedded in the files named in the embedding map below, and none is an orphan | same |
| AC9 | **The hook diagram matches the catalogue.** The 15 events drawn are exactly the 15 in `docs/copilot-config-reference.md` §4.3, in four groups of 5 / 3 / 2 / 5; no invented PascalCase alias; `preMcpToolCall` is marked as a CLI build setting; command dispatch is fail-closed and HTTP is fail-open for `preToolUse`; HTTP is the *recommended built-in* type for ephemeral cloud-agent audit logs, not the only way; shell-free `exec` works in Copilot CLI and the VS Code Copilot harness | same |
| AC10 | Every existing contract keeps passing: pacing frontmatter untouched, no inline CLI version string in `labs/lab06.md`, the single `🔍 Debug It` callout per lab 01–07, the Phase 4 guide's retired claims stay retired | `npx vitest run tests/lab-structure/ tests/labs/ tests/content-currency/` |

Embedding map (AC8): `three-surfaces-guide` → `setup`, `lab01`; `vscode-customizations-and-hooks` → `lab01`,
`lab06`; `vscode-agent-debug-logs` → `lab06`, `lab07`, `docs/debugging-and-observability.md`;
`vscode-chat-debug-view` → `lab02`, `docs/debugging-and-observability.md`; `cli-env-context-diagnose` →
`lab01`, `lab04`, `lab06`; `hooks-lifecycle-15-events` → `lab06`, `docs/copilot-config-reference.md`;
`otel-span-tree` → `lab06`, `docs/debugging-and-observability.md`.

## 4. Outside-world claims

| # | Claim as the labs and SVGs state it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | **Chat: Open Customizations**, or **Open Customizations** in the Chat view title bar, opens the Agent Customizations editor; its tabs include **Instructions**, **Skills**, **Agents**, **MCP Servers** and **Hooks**; the `+` next to **Workspace** or **User** creates a file; typing `/hooks` in chat opens Hooks; a listed item is *discovered*, not proof it is *used* | `free-check` | VS Code docs, read 2026-11-13: [Customize agents for your workflow](https://code.visualstudio.com/docs/agent-customization/overview#_agent-customizations-editor), [Use custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions) ("select the **Instructions** tab"), [Configure agent hooks](https://code.visualstudio.com/docs/agent-customization/hooks#_find-and-manage-hooks) (`/hooks`, **New Hook**). The mock-up says layouts vary with the VS Code version. |
| C2 | A custom agent from `.github/agents/` is chosen from the **Agent** dropdown in the Chat view, with the **Copilot** harness selected | `free-check` | [Custom agents in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-agents#_verify-your-custom-agent): "Select **Reviewer** from the **Agent** dropdown." |
| C3 | Typing `/` in the chat input lists skills; selecting one invokes it, and context can follow the command (`/test-changes for the authentication update`) | `free-check` | [Agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills#_use-skills-as-slash-commands). A skill with `user-invocable: false` is not offered as a command. |
| C4 | **Show Agent Debug Logs** (Chat view **...** menu) / **Developer: Open Agent Debug Logs**; the Logs view's discovery events are *Load Instructions*, *Load Agents*, *Load Hooks*, *Load Skills*; the Summary view offers View Logs, Agent Flow Chart and Cache Explorer; the sparkle icon and `#debugEventsSnapshot` attach events to chat; capture is not retroactive. **Show Chat Debug View** shows System prompt, User prompt, Context, Response and Tool responses | `free-check` | Already verified for Phase 4 and kept in `docs/debugging-and-observability.md` §2 and §8 (VS Code [Debug chat interactions](https://code.visualstudio.com/docs/agents/agent-troubleshooting/chat-debug-view), page dated 11/11/2026; [Debugging agent work](https://code.visualstudio.com/learn/foundations/debugging-and-whats-happening-behind-the-scenes) for the event names). The panel is in Preview; the SVGs say so and use sample values. |
| C5 | `/env`, `/instructions`, `/context` (System Prompt, Custom Instructions, System Tools, MCP Tools, Messages, Free Space, Buffer) and `/diagnose [prompt]` are typed inside a `copilot` session | `free-check` | Copilot CLI built-in docs `command:/env`, `command:/instructions`, `command:/context`, `command:/diagnose` (see the guide's §8). Per-skill, per-agent and per-MCP-server usage appears only in experimental mode; the SVG says so. |
| C6 | The 15 hook events and their groups; which can block; command vs HTTP dispatch; `preToolUse` is fail-closed for command hooks and fail-open for HTTP hooks; PascalCase aliases exist for 11 events; `exec` + `args` is shell-free and works in Copilot CLI and the VS Code Copilot harness; HTTP is the recommended built-in type for audit logs from ephemeral cloud-agent jobs | `free-check` | `docs/copilot-config-reference.md` §4.2–§4.4 cites the [GitHub hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) for each claim, and `tests/lab-structure/lab06-contract.test.ts` already pins them. AC9 ties the diagram to that table. The grouping into four lanes is this repo's teaching aid, and the figure captions say so. |
| C7 | OpenTelemetry: the documented tree is `invoke_agent` → `plan` (plan mode only) → `chat <model>` / `execute_tool <tool>`; the `execute_tool task` → `invoke_agent explore` nesting and the `github.copilot.hook.start` / `.end` span events are **observed**, not documented | `free-check` | `docs/debugging-and-observability.md` §5.2 and §8 (the **Observed** row). The SVG tags each span name *documented* or *observed*. |
| C8 | Sample values in the mock-ups (timings, token counts, file names) | `cut` | Not a claim. Each SVG and each caption says the values are illustrative. |

## 5. Non-goals

- Do not change what any lab teaches, the order of its sections, its numbered headings, its `pace:` frontmatter, the registry's pace rows, or any `⏱️` callout.
- Do not add a section to a lab other than the **unnumbered** legend in Setup and Lab 01. Do not add a second `🔍 Debug It` callout to any lab; the new 💠 steps sit beside the existing steps, before the callout.
- Do not use raster images, screenshots of a real session, or an external image host. The SVGs are drawn from the documented UI, not captured, and say so.
- Do not carry a Copilot CLI version string (`1.0.NN`) into a lab, an SVG or a caption.
- Do not edit `docs/_partials/*`, `docs/_meta/registry.yaml`, `README.md`, `AGENTS.md`, `.github/**`, `lab-studio/**`, `scripts/**` or `workshop/**`. **Known drift, parked:** the shared `docs/_partials/cleanup.md` still opens its checklist with `🖥️ **In your terminal:**`. Seven labs include that partial (Labs 06, 11, 12, 13 and the three `lab-*` labs), so each lab's copy now says `🐚 **In your OS Terminal:**`. Re-sync the partial in a follow-up so the two agree, and mirror the change into Lab Studio (Phase 6).
- Do not rewrite a track appendix beyond making file creation editor-first and badging its command blocks.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | every `labs/*.md` header that began `🖥️` (94 lines in 22 files) | The glyph meant three different things: a shell command, a `copilot>` prompt, a browser page. Replaced by 🐚, 🤖, 💠, 🌐 or 💬 as the step required. |
| D2 | `labs/lab02.md` §2.2, `labs/lab03.md` + appendices, `labs/lab04.md` + appendices, `labs/lab06.md` §6.3, `labs/lab07.md` §7.2 | File creation led with `cat > … <<'EOF'` or a PowerShell here-string, which is a Bash-only route on Windows and teaches the shell where the editor is the natural tool. Now editor-first, with the heredoc folded into a *Shell alternative*. |
| D3 | `labs/appendices/dotnet/lab03.md`, `labs/appendices/dotnet/lab05.md` | "Try the agent" steps used `@dotnet-dev` and `@context7`, which the CLI does not support as invocation (`@` mentions a file). Rewritten as `/agent dotnet-dev` and "Using Context7, …". |
| D4 | `labs/setup.md`, `labs/lab01.md` | No legend: the three places a learner types were never named. |
| D5 | `docs/debugging-and-observability.md`, `docs/copilot-config-reference.md`, Labs 01, 02, 04, 06, 07 | The VS Code panels, the CLI session commands, the hook lifecycle and the span tree were described in prose only. |
| D6 | `labs/lab10.md` §10.3a, §10.3b, §10.5a, §10.5b | Each section ran a 🐚 step and then showed a prompt for `copilot>` with no badge of its own, so a learner could paste it into the shell. AC4 only asked for *a* badge somewhere in a section that holds a shell block, so it passed. Each prompt now has a 🤖 line, and §10.3a and §10.3b also say, under 🐚, to start `copilot`. |

## 7. Out of scope for `lab-forge`

**None of the 💠 steps may be executed by any stage.** They need a running VS Code with the Copilot
harness, and some open Preview panels. The run gate reports each UNVERIFIED — not "could not run":

- **Chat: Open Customizations**, the **Agent** dropdown, `/skill-name` in the Chat view, **Show Agent Debug Logs**, **Show Chat Debug View**, **MCP: List Servers**, and creating a file in the Explorer;
- every command a lab types into a `copilot>` session (`/agent`, `/skills`, `/instructions`, `/env`, `/context`, `/diagnose`, `/plugin …`), and every `copilot -p` / `--prompt` call;
- all existing write steps in the labs, under each lab's own spec §7.

**May** be executed, because they are read-only and local: `npx vitest run tests/lab-structure/three-surfaces-contract`,
the other vitest invocations in §3, and plain file reads. To look at an SVG, open it in a browser or run a
headless browser screenshot into a scratch folder; do not commit the PNG.
