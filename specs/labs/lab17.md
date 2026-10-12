# Lab spec — `labs/lab17.md`

| | |
|---|---|
| **Lab** | `labs/lab17.md` (157 lines) — "GitHub Admin Controls for Copilot/AI" |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 |

---

## 1. Target state

After this lab an admin-minded learner can describe the default-on model policy with the
dates and exceptions GitHub actually published, and can say precisely what the Copilot
audit log does and does not capture — using the field names an admin would really search
on. The single teaching idea is *"the platform decides what is on by default and records
that a thing happened; it does not record what was said."*

This is a correctness pass on a discussion lab. Its structure, its two 🖥️ discussion
prompts and its expected answers all stay. What changes is that every date, count and
field name it asserts matches the source it cites.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `github.com` — the lab surveys enterprise/org settings and the audit log. Nothing is typed into a terminal. |
| **Tier** | `advanced` |
| **Presenter minutes** | 6 (unchanged) |
| **Self-paced minutes** | 25 (unchanged — see §5) |
| **Prerequisites** | Conceptual only: `labs/lab16.md` is referenced twice (managed settings source-org, MCP policy). No tooling prerequisite — a learner without enterprise access can still answer both prompts. |
| **Write steps** | **None.** There are no commands at all: no file writes, no installs, no model calls, no GitHub writes. The two 🖥️ blocks are discussion questions, not commands to run. This is one of only **two** labs in the wave (with `lab16`) that is genuinely write-free. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The policy's effective date is the published `2026-08-26`; no `2026-09-01` enforcement date is asserted | `npx vitest run tests/lab-structure/lab17-contract` |
| AC5 | The exception list matches the changelog: no `FedRAMP` category, and no claim of "four" exception categories | `npx vitest run tests/lab-structure/lab17-contract` |
| AC6 | §17.0 is not an empty section — it has content or it is gone | `npx vitest run tests/lab-structure/lab17-contract` |
| AC7 | The agent audit fields named are the documented ones (`actor_is_agent`, `agent_session_id`); `agent_session.task` is gone | `npx vitest run tests/lab-structure/lab17-contract` |
| AC8 | The lab links the *Audit log events for agents* reference that documents those fields | `npx vitest run tests/lab-structure/lab17-contract` |
| AC9 | The correct, sourced claims survive: 180-day retention, SIEM streaming, and that local session content is excluded | `npx vitest run tests/lab-structure/lab17-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | §17.2 + §17.5: default-on policy "**enforced org-wide by 2026-09-01**"; §17.2 heading "(Confirmed, Sept 2026)" | `free-check` — **UNSOURCED** | The cited changelog, opened 2026-10-12: *"For the next 28 days, this policy is configurable but has no effect… **On August 26, the policy takes effect**."* There is **no 2026-09-01 date** anywhere in it, and no second "org-wide enforcement" milestone. The only published date is 2026-08-26. The same error had propagated into `docs/_meta/registry.yaml`, **corrected separately in commit `d0a36c1`**; `labs/lab14.md:45` and `labs/lab20.md:50` still carry it and are out of scope here (§5). |
| C2 | §17.2 rollout "began 2026-08-26" | `free-check` — **CORRECT** | Same changelog: *"On August 26, the policy takes effect."* |
| C3 | §17.2 + §17.4 + §17.5: **four** exception categories — open-weight, non-data-retention, **pre-GA**, **FedRAMP-restricted** | `free-check` — **two sourced, one is scope, one is invented** | Changelog, verbatim: *"**Open-weight models (e.g., DeepSeek, Kimi K2.7) and models not covered by GitHub's data retention agreement (e.g., Fable 5)** are excluded from default enablement regardless of your policy."* That is **two** categories. Pre-GA is not an exception but the policy's *scope* (it governs "generally available" models). **FedRAMP appears nowhere in the changelog** — it is unsourced. §17.4 then asks the learner to "name the four exception categories", teaching the invented count. |
| C4 | §17.2: "open-weight models (e.g. DeepSeek, **Kimi**)" | `free-check` — imprecise | Changelog names **Kimi K2.7**, and gives **Fable 5** as the data-retention example, which the lab omits. |
| C5 | §17.2: "previously a newly-GA'd model was effectively off until an admin enabled it; now on by default unless configured" | `free-check` — **CORRECT** | Changelog: models *"relabeled from 'unconfigured' to 'inherits default'"*; *"If your policy is enabled (i.e., the default), those models become available"*; *"Explicit choices are always preserved."* |
| C6 | §17.2: an admin can flip the global switch to "disabled" to restore the curated allowlist | `free-check` — **CORRECT** | Changelog: *"If you'd rather manually approve each model, set the policy to `disabled` before August 26."* |
| C7 | §17.3: retention is **180 days**; longer via SIEM streaming | `free-check` — **CORRECT** | GitHub Docs *Reviewing audit logs for GitHub Copilot*, opened 2026-10-12: *"The audit log retains events for the last 180 days. We recommend streaming the audit log to a Security Information and Event Management (SIEM) platform, where you can view long-term history."* Reconfirmed on the agents reference: *"…over the last 180 days."* |
| C8 | §17.3 ⚠️: local IDE/CLI prompts, responses and generated code are **not** in the audit log | `free-check` — **CORRECT, and better sourced than the lab claims** | Same doc: *"The audit log does **not** include client session data, such as the prompts a user sends to Copilot locally. A custom solution is required… some companies use custom hooks to send Copilot CLI events to their own logging service."* The lab's expected answer already anticipates exactly this. |
| C9 | §17.3: an **`actor_is_agent`** field distinguishes human- from agent-initiated events | `free-check` — **CORRECT** | GitHub Docs *Audit log events for agents*, opened 2026-10-12: `actor_is_agent` — *"Indicates whether the actor is an AI agent. This will always be `true` for agentic audit log events."* |
| C10 | §17.3: "**`agent_session.task`** lifecycle events (session start/end, task completion)" | `free-check` — **not documented** | The agents reference documents four key fields: `action` (example `pull_request.create`), `actor_is_agent`, **`agent_session_id`** (*"A unique identifier linking to the specific agent session"*), and `user`. No `agent_session.task` action is listed, and the page does not enumerate a session-lifecycle event family. Name `agent_session_id`, which is what an admin actually correlates on. |
| C11 | §17.3: audit events include content-exclusion, coding-agent config, MCP policy and firewall-allowlist changes | `free-check` — plausible, not enumerated at the cited page | The how-to says the log records *"Changes to your Copilot plan, such as changes to settings and policies"* and *"Agent activity on the GitHub website"*, then points to the full event lists for enterprise/organization. The specific four are not listed on either page I opened. Not load-bearing enough to cut — but the lab should stop saying "Per GitHub's enterprise audit-log docs" over a list those docs do not give, and should link the reference that does (C12). |
| C12 | References list (L24–L27) | `free-check` — incomplete | All four resolve. Missing the page that actually documents the agent fields: `/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/agentic-audit-log-events`. |
| C13 | §17.1: the AI Controls nav covers custom admin roles, agent session activity, managed-settings source-org selection, and global model policy | `research` — **unverified, parked** | None of the three pages opened describes an "AI Controls" nav or enumerates its contents; confirming it needs an authenticated enterprise settings view, which §7 forbids. The §17.4 check-your-work asks the learner to "name three things the AI Controls nav covers", so this is load-bearing — but it is also unfalsifiable from here. **Parked — §5.** |
| C14 | A second content-capturing mechanism exists | `cut` — do not add | The agents reference documents Copilot **API usage record streaming** (public preview, EMU / data residency) whose records include a `body` field holding the request or response body. It does not contradict C8 — that is streaming, not the audit log — but an admin asking "can we see what they asked?" would care. Adding it would enlarge a 25-minute lab and needs its own treatment. Record it; do not teach it here. |

## 5. Non-goals

- Do not change pacing (`presenter_minutes: 6`, `self_paced_minutes: 25`) or the registry's `lab17` rows. If a gate reports the 25 is wrong, that finding is **recorded, not fixed**.
- Do not renumber sections. `17.0`–`17.5` stay, except as AC6 allows for the empty `17.0`.
- Do not change the two 🖥️ discussion prompts or their 💡 expected answers, beyond the factual corrections C1/C3 force.
- **Do not edit `docs/_meta/registry.yaml`** (C1). Its copy of the unsourced date was already corrected in commit `d0a36c1`; the registry is shared by other labs and tests, and this pass has no business touching it.
- **Do not edit `labs/lab14.md` or `labs/lab20.md`**, which still carry the same unsourced `2026-09-01` date. They have no spec and no contract test yet; correcting them here would be an unspecced edit to two labs outside this pass. **Record them.**
- Do not verify, rewrite or expand §17.1's AI Controls nav list (C13). It needs an authenticated enterprise view that §7 forbids, and guessing is worse than leaving a sourced-looking list alone.
- Do not add the Copilot API usage streaming material (C14).
- Do not add commands to this lab. It is deliberately a discussion lab and the only write-free one besides `lab16`.
- Do not edit any file other than `labs/lab17.md`, this spec and `tests/lab-structure/lab17-contract.test.ts`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §17.2 bullet "Rollout timeline", §17.5 table row, and the §17.2 heading "(Confirmed, Sept 2026)" | Asserts enforcement "org-wide by 2026-09-01" (C1). The changelog's only date is **2026-08-26**. Drop the second date; keep 2026-08-26 and the 28-day configurable window that preceded it. |
| D2 | §17.2 "What's still off by default (exceptions)" | Four categories claimed; two are sourced (C3). Keep **open-weight models (e.g. DeepSeek, Kimi K2.7)** and **models not covered by GitHub's data retention agreement (e.g. Fable 5)**. Delete **FedRAMP-restricted** — unsourced. Recast **pre-GA** as the policy's scope ("the policy governs generally available models"), not an exception. |
| D3 | §17.4 second ✅ | "name the **four** exception categories" (C3) — follows D2. Two categories, plus the scope point. |
| D4 | §17.5 Key Takeaways table, "Exceptions still off by default" row | Same four-item list as D2. |
| D5 | §17.0 | **Empty section.** A `## 17.0 Copilot CLI currency (2026 refresh)` heading followed by a boilerplate 💡 callout and nothing else — no table, no commands, no content. Lab 01 (§1.0a) and Lab 07 (§7.0) carry real tables under this heading. Either give §17.0 content appropriate to an admin lab or remove the heading; an empty numbered section is a dead end for a learner. |
| D6 | §17.3 bullet list, last two items | `agent_session.task` is not documented (C10). Name **`agent_session_id`** and keep **`actor_is_agent`**; describe correlating an event to a session rather than a lifecycle event family. |
| D7 | §17.3 opening line | "Per GitHub's enterprise audit-log docs, Copilot/agent-relevant audit events include:" introduces a list the cited how-to does not give (C11). Point at the *Audit log events for agents* reference, and soften to what the docs support. |
| D8 | References (L24–L27) | Add [Audit log events for agents](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/agentic-audit-log-events) (C12) — it is the source for `actor_is_agent`, `agent_session_id` and the 180-day agentic window. |

## 7. Out of scope for `lab-forge`

This lab has **no write steps** (§2), which makes it the safest in the wave — but "no
write steps" is not "no boundary". The run gate reports each of these UNVERIFIED rather
than executing them:

- Visiting or authenticating to any enterprise/org settings page, the **AI Controls** nav, or any audit log — including to settle C13. There are no credentials for this, and a stage that tried would be driving a real enterprise console;
- any `gh api` call against an enterprise, organization or audit-log endpoint;
- every GitHub-side write;
- editing `docs/_meta/registry.yaml`, `labs/lab14.md` or `labs/lab20.md` (§5).

**May** be executed, because they are read-only and local: `npm test`, the vitest
invocations in §3, HTTP `GET` of the four reference URLs and the agents reference, and
plain file reads.

> The hazard here is not a command — it is confident prose. Every number in this lab is
> the kind a reader quotes into a compliance document. A claim that cannot be settled from
> a public page must be left visibly unsettled (C13), not tidied into something that reads
> as sourced.
