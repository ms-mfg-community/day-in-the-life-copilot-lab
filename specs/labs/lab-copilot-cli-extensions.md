# Lab spec — `labs/lab-copilot-cli-extensions.md`

| | |
|---|---|
| **Lab** | `labs/lab-copilot-cli-extensions.md` (463 lines, 31 KB — largest in the batch) — "Authoring a Copilot CLI Extension and Triggering It from a Hook" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-15) |
| **Last updated** | 2026-10-15 |

---

> **Merge decision:** standalone. See `specs/labs/lab06.md` §0. The subject here is the
> extension runtime; hooks are gates wrapped around it. No lab number moves; R3 does not
> apply.

## 1. Target state

The learner authors a Copilot CLI extension — an in-process `.mjs` module that calls
`joinSession()` and registers a tool whose body delegates back to the runtime model via
`session.sendAndWait()` — then wraps two hooks around it: a `preToolUse` gate that rejects
oversize input before the model is consulted, and a `userPromptSubmitted` detector for a
deterministic trigger. The teaching idea is **the seam where a deterministic gate meets a
probabilistic body**: put the certain, microsecond thing in front of the approximate,
second-long, token-costing thing.

That thesis is sound and survives the refresh intact. Three of the lab's *supporting* claims
about the hook runtime do not. After the refresh the lab teaches the same seam, but its
statements about what `preToolUse` can decide, the order hooks load in, and what
`userPromptSubmitted` can do all match the published reference — and its "source of truth"
points at something a reader can actually open. No new section, no change to the extension
code, pacing unchanged.

> Note the irony worth preserving in the edit: this lab's §4.2 tells the reader "do not
> internalize an `allow`/`ask` decision model from prior tooling." The reference now
> documents exactly that model. The lab was right to be careful and wrong about the fact.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — everything happens inside a running `copilot` session (`extensions_manage`, `extensions_reload`, natural-language prompts) or in `.github/extensions/` and `.github/hooks/`. |
| **Tier** | `advanced` |
| **Presenter minutes** | 12 (unchanged) |
| **Self-paced minutes** | 35 (unchanged) |
| **Prerequisites** | Lab 06 (hooks — §4 and §5 assume the stdin-JSON contract and the `preToolUse` payload shape), Lab 05 (MCP — §1 and §7.1 define Copilot CLI extensions by contrast with MCP servers), and Lab 01 (the `.github/` layout). `lab-gh-extensions.md` is a **sibling**, not a prerequisite — §1's whole point is that they are different surfaces. |
| **Write steps** | **Yes, including one that terminates the agent running the lab.** (a) §3.1 `extensions_manage({operation:"scaffold", name:"clab-summarize"})` — writes `.github/extensions/clab-summarize/extension.mjs` into the working tree. (b) §3.2 replaces that file from `solutions/`. (c) §3.3 `extensions_reload({})` — **mutates the live session's extension registry mid-turn**. (d) §4.1 and §5.1 copy two hook JSONs into `.github/hooks/`, one of which is a live `preToolUse` deny gate. (e) §3.4, §4.3, §5.3 drive real agent turns, each an LLM call. (f) §8 step 1 instructs `exit` / `Ctrl-D`; step 2 `pgrep -af '^copilot( \|$)'` / `Get-Process -Name copilot`; step 4 re-launches `copilot`. |
| **`lab-forge` verdict** | **`run with §7 fenced`** — every §6 defect is prose, a link or a reference path. The extension code and both hook JSONs are already committed under `solutions/` and are **not** under review. Nothing in §6 requires (a)–(f). All are enumerated in §7. |

> 🚨 **(f) is the single most dangerous step across all five labs in this batch.** §8 step 1
> tells the reader to exit the `copilot` session, and step 2 to confirm the `copilot`
> process is gone. Executed by a `lab-forge` run, that is **the lab instructing the agent to
> terminate itself** — and because it is written as cleanup, a gate that skims for "write
> steps" will not flag it. Lab 10's lesson was a keyword scan missing a home-directory
> write; this is the same class of miss, one step further.

> ⚠️ **(c) and (d) reconfigure the running runtime.** `extensions_reload({})` is documented
> to take effect *in the same turn*; the `preToolUse` JSON in (d) is a live deny gate keyed
> on a 10 KB input cap. Both would apply to the session doing the editing.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` — **no-op for this file; see `specs/labs/lab-hardening.md` D7.** AC10 is the real observation. |
| AC4 | §4.2 no longer claims `allow`/`ask` are unhonored; it states that `permissionDecision` accepts `allow`, `deny` and `ask` | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC5 | The lab states the conditions under which `ask` degrades to `deny` — cloud agent, and CLI autopilot mode | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC6 | The hook load order is stated as policy → user → project → plugins, not "project files before user files" | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC7 | The `userPromptSubmitted` limitation is attributed to the config-file hook surface, naming `modifiedPrompt` and the SDK-only carve-out — not to the runtime wholesale | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC8 | The lab cites no `~/.copilot/session-state/…` path as a source of truth | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC9 | The lab cites `copilot/reference/hooks-reference`, not the superseded `hooks-configuration` path | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC10 | Frontmatter is present with `title`/`lab_number`/`pace`, and declared pacing is internally consistent with the inline `⏱️` callout | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC11 | Every backticked repo-relative path the lab cites resolves on disk | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |
| AC12 | The lesson survives: the lab still teaches `joinSession`, `session.sendAndWait` over a hand-rolled `fetch`, the deterministic-gate-in-front-of-probabilistic-body framing, and the §7.1 three-surface disambiguation | `npx vitest run tests/lab-structure/lab-copilot-cli-extensions-contract` |

> AC12 is a **guard**. The lab is 31 KB and the edit touches its most quotable callouts;
> the risk is that a correction pass thins out the teaching while fixing the facts.

## 4. Outside-world claims

Primary source for C1–C4: <https://docs.github.com/en/copilot/reference/hooks-reference>,
fetched directly 2026-10-15. The lab cites `…/hooks-configuration` four times; that URL
302s to the above.

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | §4.2: "**`preToolUse` honors `deny` only.** The runtime accepts `allow` and `ask` … but **does not act on them**. … A hook that emits `allow` is a no-op; one that emits `ask` is also a no-op." | `free-check` → **CONTRADICTED** | The reference's **`preToolUse` decision control** table lists `permissionDecision` values `"allow"`, `"deny"`, `"ask"`, plus `modifiedArgs` for argument substitution; its event table gives the *Output processed* cell as "Yes — can allow, deny, or modify." See `specs/labs/lab-hardening.md` C1 for the two corroborating passages. **Same claim, same remedy** — keep "absence of `deny` is allow" (the reference's "empty output uses default behavior" still supports it) and re-ground the default-deny posture as a design choice. |
| C2 | §4.2 🔗 "Hook stacking": "the runtime executes them **in load order** (**project files before user files**; within a scope, lexicographic by file path) and stops at the **first `deny`**" | `free-check` → **CONTRADICTED on the ordering** | The reference states hooks "are loaded from the following sources in order (**policy, then user, then project, then plugins**) and combined" — user **before** project, the opposite of the lab, and with two source tiers the lab does not know about. The "first deny wins" half is not stated in those terms either; the documented composition is that all matching hooks run and outputs merge (for `permissionRequest`, "later hook outputs override earlier ones"). **Fix the order; soften "stops at the first deny" to the operational advice that survives — put cheap gates before expensive ones.** |
| C3 | §5.2: "`userPromptSubmitted` output is **not honored** by the runtime today … the docs label it as **prompt mutation not supported**" | `free-check` → **premise outdated, conclusion correct** | The reference documents a `modifiedPrompt` output that "Replaces the prompt for the rest of the turn" — but carries the explicit carve-out: "`modifiedPrompt` is **only honored by SDK programmatic hooks**. Command and HTTP config-file `userPromptSubmitted` hooks have their output dropped." So the lab's *conclusion* — the config-file surface cannot rewrite the prompt to inject a tool call — is **right**, and the lab even anticipates the distinction ("the config-file hook surface is more constrained than the SDK-side hook surface"). Only the blanket premise needs correcting. This is a cheap, satisfying fix: the lab gets *more* right, not less. |
| C4 | §4.2 📏: the 10 KB cap is bytes — `wc -c` in bash, `UTF8.GetByteCount` in PowerShell — so a 5,000-character CJK paste trips it | `free-check` | Verifiable against `solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json`, which ships both branches. The `wc -c` vs `wc -m` distinction is a property of `wc`, not of Copilot. **Correct, and the best callout in the lab.** Keep verbatim. |
| C5 | Reference block: "`~/.copilot/session-state/$(uuidgen)/files/copilot-cli-extensions-authoring-guide.md` … **This is the source of truth for every extension code line in this lab.**" | `cut` | The path cannot resolve for any reader — it names a per-session artifact from the author's own machine, and `$(uuidgen)` generates a *fresh random* UUID that will never match a real session. A lab cannot cite a file that exists only in the author's session. Replace with the instruction that produces it: run `extensions_manage({operation: "guide"})` in your own session and read that. Same information, actually reachable. |
| C6 | §2: discovery/launch/connection/registration/lifecycle contract; `.mjs` only; `extension.mjs` filename; `@github/copilot-sdk` auto-resolved; tool names globally unique; stdout reserved for JSON-RPC | `cite` (self-labelled) | These are quoted from the runtime guide and the lab already fences them correctly in §7.2 as "**runtime-documented; verify against your current build**", with "if your local guide disagrees with this lab, **trust the guide**". That is the honest disposition for a surface not yet on docs.github.com. **Keep the §7.2 caveat — it is what makes these claims legitimate.** Do not promote them to asserted fact, and do not research them: the lab already tells the reader how to check. |
| C7 | §2 ⚠️ re-entrancy: `session.sendAndWait()` from inside a tool handler deadlocks the session | `cite` (self-labelled) | Same §7.2 fence. It is a sharp, useful warning with a stated mechanism and a stated workaround (`session.send` + `setTimeout`). Keep under the caveat. |
| C8 | §7.2 lists the SDK-side hook surface as `onUserPromptSubmitted`, `onPreToolUse`, `onPostToolUse`, `onSessionStart`, `onSessionEnd`, `onErrorOccurred` | `free-check` (partial) | The reference confirms an SDK programmatic hook surface exists and is distinct from the config-file surface (it is exactly the carve-out in C3). The published event catalogue has since grown well past six — `postToolUseFailure`, `permissionRequest`, `preCompact`, `subagentStart`/`subagentStop`, `notification`, `userPromptTransformed`. Mark the §7.2 list non-exhaustive; do not enumerate. |

**No `research` disposition.** C1–C3 and C8 were settled by reading the primary reference
directly, C4 against a committed fixture, C5 by inspection, and C6/C7 are already fenced by
the lab's own verify-against-your-build caveat. No `spec-forge` run is justified.

## 5. Non-goals

- **Do not touch the extension code or either hook JSON** under `solutions/lab-copilot-cli-extensions/`. They are the lab's deliverable and are not what is wrong. The exception is narrow: if §4.2's corrected text contradicts a `_comment` in `pretooluse-deny-large-input.json`, fix that comment only.
- **Do not edit `docs/copilot-config-reference.md`.** Its §4 carries the same false deny-only claim, and it is owned by `specs/labs/lab-hardening.md` AC7 in this batch. Two parallel worktrees must not both edit it. Likewise do not edit `solutions/lab-hardening/deny-unlisted-tools.json`.
- Do not edit `labs/lab06.md`, `labs/lab-hardening.md` or `labs/lab-gh-extensions.md`.
- Do not rebuild the lab around `permissionRequest`, `modifiedArgs`, HTTP hooks, policy hooks, sandboxed sessions or Claude-format matchers. Naming `modifiedArgs` once while correcting C1 is fine; the rest is a different lab.
- Do not promote the §7.2 runtime-only claims to asserted fact, and do not delete §7.2. The caveat is load-bearing: it is what licenses §2's verbatim quotes.
- Do not renumber §1–§8 or restructure the three hands-on parts.
- Do not edit `docs/_partials/cleanup.md`.
- Do not add this lab to `README.md` or the registry — see `specs/labs/lab-hardening.md` D7.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §4.2, 🚨 "The deny-only banner" | Asserts `allow` and `ask` are no-ops. **False as of 2026-10-15** — see C1. The lab also tells the reader the hardening lab "re-states this banner verbatim", so the two files are wrong together and must be fixed together (in separate worktrees, each its own file). |
| D2 | §4.2, 🔗 "Hook stacking" | States "project files before user files". The reference says **policy, then user, then project, then plugins** — user before project — and the lab knows nothing of policy or plugin hooks. Also asserts "stops at the first `deny`", which the reference does not state in those terms. |
| D3 | §5.2, ⚠️ "The honest limitation" | "`userPromptSubmitted` output is not honored by the runtime today." Outdated premise: `modifiedPrompt` **is** honored, but only by SDK programmatic hooks; config-file command/HTTP hooks have output dropped. The lab's conclusion is right; its reason is wrong. |
| D4 | References block, first bullet | Cites `~/.copilot/session-state/$(uuidgen)/files/copilot-cli-extensions-authoring-guide.md` as "the source of truth for every extension code line in this lab". Unreachable for any reader; `$(uuidgen)` cannot name an existing session. See C5. |
| D5 | §4.1 shape block, §4.2 banner, §5.2, §7.2 | Four citations to `…/reference/hooks-configuration`, which now 302s to `…/reference/hooks-reference`. Resolves today; canonical path has moved. |
| D6 | §7.2, last bullet | The SDK-side hook list (six `on*` names) is presented as the surface. The published catalogue is now fourteen events. Mark non-exhaustive. |
| D7 | §8 cleanup, steps 1–2 | Instructs exiting the `copilot` session and confirming the process is gone. For a *human reader* this is correct and well-written. For an automated run it is self-termination. Not a defect in the lab's text — recorded here so §7 fences it and no future pass mistakes it for an executable step. |
| D8 | §6, "Forward-compat" bullet; §4.2 | Refers to `labs/lab-hardening.md` as "upcoming" and to "Workstream B of the materials-gap branch". The lab shipped; the workstream vocabulary is build-process residue that means nothing to a learner. Same for §1's "(Workstream A1)" against `lab-gh-extensions.md`. |
| D9 | repo-wide | Not covered by `labs-have-frontmatter.test.ts` or `registry-consumed.test.ts` (both filter `/^lab\d+\.md$/`); absent from `README.md`; no registry `labs:` entry. Shared with the other two named labs — see `specs/labs/lab-hardening.md` D7. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them.

- **§3.1** — `extensions_manage({operation: "scaffold", name: "clab-summarize"})`. Writes `.github/extensions/clab-summarize/extension.mjs` into the working tree; with `location: "user"` it writes to the user-level extensions directory instead, i.e. **outside the repository**.
- **§3.2** — replacing that file's body from `solutions/`.
- **§3.3** — `extensions_reload({})` and `extensions_manage({operation: "list" | "inspect"})`. `reload` stops and relaunches every extension and takes effect **mid-turn, in the running session**.
- **§4.1 / §5.1** — copying `pretooluse-deny-large-input.json` and `userpromptsubmitted-auto-summarize.json` into `.github/hooks/`. The first arms a live `preToolUse` deny gate against the running session.
- **§3.4, §4.3, §5.3** — the natural-language prompts that drive `clab_summarize`. Each is a real agent turn and a real LLM call; §4.3 step 3 deliberately sends a >10 KB payload.
- **§8 steps 1, 2 and 4** — `exit` / `Ctrl-D`; `pgrep -af '^copilot( |$)'` / `Get-Process -Name copilot`; and re-launching `copilot`. **Session self-termination. Never execute.**
- **§8 step 3** — `git checkout` of the three lab paths, or deleting them.
- **Cleanup (shared partial)** — step 1 kills background jobs; step 3 instructs a full `copilot` restart; step 5 runs `git config --unset core.hooksPath`.

> Every §6 defect is prose, a link, or a reference path — all of it reachable with `view`
> and `edit` alone. That is why the verdict is `run with §7 fenced` rather than
> `do not run`, despite §8 being the most hazardous cleanup section in the curriculum.
