# Lab spec — `labs/lab-hardening.md`

| | |
|---|---|
| **Lab** | `labs/lab-hardening.md` (392 lines) — "Hardening Skills, Agents, and MCP for Deterministic Production Use" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-15) |
| **Last updated** | 2026-10-15 |

---

> **Merge decision:** standalone. See `specs/labs/lab06.md` §0 for the hooks-cluster
> decision and its reasoning. No lab number moves; R3 does not apply.

## 1. Target state

This lab builds two composing guardrails — a `tight-reviewer` custom agent whose frontmatter
enumerates exactly the tools it may call, and a `preToolUse` hook that denies anything
outside an allow-list — and shows that they are independent, so a mis-edited frontmatter
cannot widen the blast radius. Its teaching idea is **two-layer tool gating**: a call
succeeds only if layer 1 exposes it and layer 2 permits it.

The lab's architecture is right and survives the refresh untouched. **Its stated
justification is not.** The banner at the very top of the file — `preToolUse` only acts on
`deny`; `allow` and `ask` are accepted but **NOT** honored — is contradicted by the
reference it cites. After the refresh the lab teaches the same default-deny posture, but
grounds it where it actually belongs: **default-deny is a design choice about blast radius,
not a workaround for a runtime limitation.** That is a stronger lesson, not a weaker one — a
guardrail you chose is one you can defend; a guardrail you adopted because "allow doesn't
work" collapses the moment allow starts working.

The same false claim is repeated in two other files this lab owns, and they are corrected in
the same change so the repository is internally consistent.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — the whole lab is `copilot --agent=…` invocations plus file copies into `.github/agents/` and `.github/hooks/`. §1 step 3 additionally requires an *interactive* `copilot` session to inspect the `/agent` picker. |
| **Tier** | `advanced` |
| **Presenter minutes** | 5 (unchanged) |
| **Self-paced minutes** | 20 (unchanged) |
| **Prerequisites** | Lab 03 (custom agents — §1 is a custom agent and assumes frontmatter is familiar), Lab 06 (hooks — §2 assumes the reader knows what a `preToolUse` hook is and how its stdin payload is shaped), and Lab 05 (MCP — §0 requires the `microsoft-learn` server to be wired up, and §3.1 fails without it). |
| **Write steps** | **Yes, and two of them are hazardous.** (a) §1.1 and §2.1 copy files into `.github/agents/tight-reviewer.agent.md` and `.github/hooks/deny-unlisted-tools.json` — new files on committed paths. (b) §1.3, §3.1 and §3.2 run `copilot --allow-all-tools --agent=tight-reviewer --prompt …` — **three nested agent sessions with every tool pre-approved**. (c) §3.3 instructs the reader to broaden the agent's `tools:` to `["*"]` and re-run. (d) §3.3 runs `git stash push -- .github/hooks/`, a stash mutation. |
| **`lab-forge` verdict** | **`run with §7 fenced`** — the required edit is prose: one banner, three URLs, one cross-file claim. It needs none of (a)–(d) executed. Every item is enumerated in §7. |

> 🚨 **(a) is a self-lockout, not just a write.** `deny-unlisted-tools.json` is a
> **default-deny `preToolUse` hook**. Dropping it into `.github/hooks/` in a live working
> tree arms it against the session that is editing the lab: its allow-list is
> `read|view|glob|grep|microsoft-learn*`, so the very next `edit`, `create` or `bash` call
> the run makes is denied. The run gate would not merely mutate the tree — it would
> disable itself. This must not execute.

> ⚠️ **(b) spawns agents.** `--allow-all-tools` pre-approves every tool in the child
> session. Three of them, from inside a `lab-forge` run, is an unbounded fan-out with no
> gate between it and the filesystem.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` — **see D7: this test does not actually cover this file.** AC12 is the real observation. |
| AC4 | `labs/lab-hardening.md` no longer claims `allow`/`ask` are unhonored, and states that `permissionDecision` accepts `allow`, `deny` and `ask` | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC5 | The lab states the conditions under which `ask` degrades to `deny` — cloud agent, and CLI autopilot mode | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC6 | The default-deny posture is justified as a blast-radius design choice, not as a runtime limitation | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC7 | `docs/copilot-config-reference.md` no longer asserts that `allow`/`ask` are accepted-but-ignored, in §4, in its event catalogue, or in its accuracy table | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC8 | `solutions/lab-hardening/deny-unlisted-tools.json` `_comment` no longer carries the false claim, while its allow-list behaviour is unchanged | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC9 | The lab cites `copilot/reference/hooks-reference`, not the superseded `hooks-configuration` path | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC10 | The hook allow-list the lab describes in prose matches the one `solutions/lab-hardening/deny-unlisted-tools.json` actually enumerates | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC11 | The two-layer gating lesson survives: the lab still teaches an exact agent `tools:` allow-list *and* an independent hook, and still distinguishes frontmatter names from runtime tool names | `npx vitest run tests/lab-structure/lab-hardening-contract` |
| AC12 | Frontmatter is present with `title`/`lab_number`/`pace`, and declared pacing is internally consistent with the inline `⏱️` callout | `npx vitest run tests/lab-structure/lab-hardening-contract` |

> AC11 is a **guard**. The whole risk of this refresh is that correcting the premise
> dismantles the lesson. It must not.

## 4. Outside-world claims

Primary source for C1–C3: <https://docs.github.com/en/copilot/reference/hooks-reference>,
fetched directly 2026-10-15 (the lab's cited `…/hooks-configuration` 302s to it).

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | **"`preToolUse` only acts on `deny`. `allow` and `ask` outputs are accepted by the runtime today but are NOT honored."** (lines 11–17, and restated at §2.2, §2 step 3, and in the hook JSON's `_comment`) | `free-check` → **CONTRADICTED** | The reference's **`preToolUse` decision control** table now reads: `permissionDecision` — values `"allow"`, `"deny"`, `"ask"` — "Whether the tool executes. Empty output uses default behavior." It additionally documents `modifiedArgs` ("substitute tool arguments"). The event table's *Output processed* cell for `preToolUse` reads **"Yes — can allow, deny, or modify."** Two further passages only make sense if `allow` is honored: the fail-closed note ("a non-zero exit … denies the tool call, **even if the hook's stdout JSON reports `permissionDecision: "allow"`**") and the docs' own progress-message example, which ends `echo '{"permissionDecision": "allow"}'`. **The claim is false as stated.** |
| C2 | Corollary: "absence of deny is allow" | `free-check` → **still true, for a different reason** | The same table: "Empty output uses default behavior." A hook that emits nothing does not block. So the *behaviour* the lab relies on is intact — only the *explanation* was wrong. Keep the sentence; re-ground it. |
| C3 | `ask` is inert | `free-check` → **partially true, and worth teaching** | `ask` is honored where a user can answer. It degrades to `deny` in two named cases: under cloud agent ("no user is available to answer") and in **CLI autopilot mode** ("no prompt is shown and `"ask"` is denied"). This is a better, sharper fact than "ask is ignored", and it costs one sentence. |
| C4 | `infer:` is retired; use `disable-model-invocation` and `user-invocable` | `cite` | `docs/copilot-config-reference.md` §2.1 rows for `disable-model-invocation`, `user-invocable` and `infer` (the last marked "**Retired.**"), plus its accuracy-table row 7. Source link `…/reference/custom-agents-configuration` returns **200** (checked 2026-10-15). Correct; no change. |
| C5 | Hook allow-lists key on **runtime** tool names: the `read` category surfaces as `view`/`glob`/`grep`, and MCP tools surface hyphen-joined | `free-check` | Corroborated by the reference's runtime→Claude tool-name table, which lists `view`, `grep`, `glob`, `bash`, `edit`, `create` as the runtime names a hook sees. Corroborated in-repo by `solutions/lab-hardening/deny-unlisted-tools.json`, whose allow-list enumerates exactly `read|view|glob|grep|microsoft-learn/microsoft_docs_search|microsoft-learn-microsoft_docs_search`. **This is the lab's best material. Keep it verbatim.** |
| C6 | `shell` / `execute` / `bash` are aliases for the same tool | `free-check` | Partially corroborated: the reference maps `bash` and `powershell` to the Claude name `Bash`; it does not document an `execute` spelling. The lab's *advice* — under a default-deny allow-list all spellings are blocked anyway, and a deny-list must enumerate them all — is correct regardless of how many aliases exist. Keep the advice; soften the enumeration to "may surface under several names, including `bash` and `powershell`". |
| C7 | Frontmatter `tools:` accepts globs such as `shell:*` and `mcp:microsoft-learn:*` | `free-check` | `docs/copilot-config-reference.md` §2.2 is the in-repo compiled grammar and §4 of the lab links it for "the `server/tool` and `server/*` MCP-prefix syntax" — note the in-repo reference uses a **slash** (`server/*`), while the lab's callout uses a **colon** (`mcp:microsoft-learn:*`). The two spellings disagree. Prefer the reference's `server/*`; the lab's posture (avoid globs, use an exact allow-list) is unaffected. |
| C8 | `copilot --allow-all-tools --agent=… --prompt …` is the only way to reach a `user-invocable: false` agent | `cite` | `docs/copilot-config-reference.md` §2.3 — "Programmatic: `copilot --agent=<name> --prompt "…"`", with the `/agent` picker and natural-language mention both gated by the two frontmatter flags. Correct; no change. |

**No `research` disposition.** C1–C3 and C5–C6 were settled by reading the primary reference
directly; C4, C7 and C8 by the in-repo compiled reference. A `spec-forge` run buys nothing
here — the question was never "what is true", it was "did anyone look recently".

> **Why this one claim got a primary-source read when 19 labs' worth did not.** It is the
> first thing in the file, it is the stated reason the lab is designed the way it is, it is
> repeated in three other files, and a reader who believes it will write a hook that fails
> open in production. That is the definition of load-bearing.

## 5. Non-goals

- **Do not restructure the lab around `permissionRequest`.** It is real, current, CLI-only, purpose-built for programmatic allow/deny, and genuinely better suited to §3's non-interactive probes than `preToolUse` is. It is also a different lesson. Record it as a pointer (D5); do not rebuild §2 on it.
- Do not teach `modifiedArgs`, HTTP hooks, sandboxed sessions, policy hooks or Claude-format matchers. Naming `modifiedArgs` once while correcting C1 is fine.
- Do not weaken the default-deny posture. The correction is to the *justification*, never to the *design*. The exact allow-list, the independence of the two layers, and the belt-and-braces check in §3.3 all stay.
- Do not edit `labs/lab06.md` or `labs/lab-copilot-cli-extensions.md`. They carry related claims and are specced separately in this same batch; parallel worktrees must not both touch a file.
- Do not edit `docs/_partials/cleanup.md` or `docs/_partials/currency.md` — shared `@include` blocks.
- Do not change the behaviour of `solutions/lab-hardening/deny-unlisted-tools.json`. AC8 touches its `_comment` prose only; the `bash`/`powershell` branches and the allow-list stay byte-identical (AC10 depends on them).
- Do not add this lab to `README.md` or `docs/_meta/registry.yaml`. D7 records the gap; closing it is a repo-wide decision about three un-indexed labs, not this lab's pass.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab-hardening.md:11–17` | The headline "Read this first" banner asserts `allow`/`ask` are not honored. **False as of 2026-10-15** — see C1. It is the first thing a reader sees and the stated basis for the lab's design. |
| D2 | §2 step 2, second bullet and the ⚠️ sub-callout; §2.2 "the only event whose output is honored" | Same false claim, restated twice more. `preToolUse` is **not** the only event whose output is processed: `postToolUse` (`modifiedResult`, `additionalContext`), `agentStop`/`subagentStop` (`decision: block`), `sessionStart`/`subagentStart` (`additionalContext`), `permissionRequest` (`behavior`) and `userPromptTransformed` all process output. |
| D3 | §2.2 top-of-lab banner link; §4 bullet 2; References block | Three citations to `https://docs.github.com/en/copilot/reference/hooks-configuration`. The page now 302s to `…/reference/hooks-reference`. Resolves today; the canonical path has moved. |
| D4 | `docs/copilot-config-reference.md` §4 — lines 168, 215, 221 and accuracy-table row 10 (line 328) | The same false deny-only claim, in the repo's *canonical parameter reference*. This lab is the reference's hands-on counterpart and §4 of the lab sends readers straight to it, so fixing only the lab moves the error rather than removing it. **Fix in the same change** — the precedent is `specs/labs/lab10.md` D4, where the registry was corrected alongside the lab. |
| D5 | `solutions/lab-hardening/deny-unlisted-tools.json` `_comment` | Carries the false claim a third time ("the runtime currently honors only `deny`; `allow`/`ask` outputs are accepted but ignored, so designing around them gives false confidence") **and** the superseded URL. The hook's *behaviour* is correct and must not change. |
| D6 | §3 generally | The lab never mentions `permissionRequest`, which is now the documented way to approve or deny programmatically and is described by the reference as "especially useful in CLI pipe mode (`-p`) and other CLI CI usages where no interactive prompt is available" — precisely §3's scenario. A one-line "where to go next" pointer, per §5. |
| D7 | repo-wide | `tests/lab-structure/labs-have-frontmatter.test.ts` filters on `/^lab\d+\.md$/`, so it **never sees** `lab-hardening.md`. Likewise `tests/content-currency/registry-consumed.test.ts`. The lab is also absent from `README.md` and has no `docs/_meta/registry.yaml` `labs:` entry. **AC3 is a no-op for this file** — that is why AC12 exists. Same gap applies to `lab-gh-extensions.md` and `lab-copilot-cli-extensions.md`. |
| D8 | §1 step 2 table, `tools` row | The wildcard callout spells an MCP glob `mcp:microsoft-learn:*` (colons) while §4 and `docs/copilot-config-reference.md` use `server/*` (slash). One of the two spellings is wrong; prefer the reference's. |
| D9 | Cleanup (shared partial), step 2 | Tells the reader to restore `~/.copilot/config.json`; the current reference says the CLI no longer reads that file for hooks. **Shared partial — out of scope** (§5); recorded for the eventual partial pass. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them.

- **§1.1** — `mkdir -p .github/agents` + `cp solutions/lab-hardening/tight-reviewer.agent.md .github/agents/` (and the PowerShell equivalent). Installs a live custom agent.
- **§2.1** — `mkdir -p .github/hooks` + `cp solutions/lab-hardening/deny-unlisted-tools.json .github/hooks/` (and the PowerShell equivalent). **Arms a default-deny `preToolUse` hook against the running session.** See the §2 callout: the run would disable its own tool access.
- **§1.3** — opening an interactive `copilot` session and typing `/agent`. Requires a TTY; slash commands do not execute under `--prompt`.
- **§1.3, §3.1, §3.2** — all three `copilot --allow-all-tools --agent=tight-reviewer --prompt …` invocations. Nested agent sessions with every tool pre-approved.
- **§3.1** — requires the `microsoft-learn` MCP server to be wired into the learner's CLI (§0). Network + MCP dependency.
- **§3.3** — editing the agent's `tools:` to `["*"]`, and `git stash push -m "lab-hardening: hook variant" -- .github/hooks/`. A stash mutation; in a worktree the stash is shared repository state.
- **Cleanup (shared partial)** — step 1 kills background jobs; step 5 runs `git config --unset core.hooksPath`, a git-config mutation shared across worktrees.

> Every §6 defect is a prose, link or `_comment` change across three files. None of them
> requires any §7 item to execute, which is why the verdict is `run with §7 fenced`.
