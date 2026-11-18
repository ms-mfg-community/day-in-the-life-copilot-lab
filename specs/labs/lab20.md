# Lab spec — `labs/lab20.md`

| | |
|---|---|
| **Lab** | `labs/lab20.md` (169 lines) — "Enterprise Token Optimization & Reporting" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-15) |
| **Last updated** | 2026-10-15 |

---

## 1. Target state

Lab 20 takes the individual-scale token discipline of `docs/token-and-model-guide.md` up to
the org level: aggregate usage monitoring, prompt-library governance, and knowledge-base
consistency across teams. The teaching idea is that the enterprise lever is *policy*, not
per-session model choice — and that the right reporting source is the usage/billing surface,
not the audit log.

After the refresh the lab teaches exactly the same three governance surfaces, but **every
date and audit-log field it asserts is one a published source actually carries**. Lab 20 is
the last file in the repository still carrying the unsourced `2026-09-01` enforcement date
and the retired `agent_session.task` event family — both of which Lab 17's pass already
removed from its own file. This is a currency pass on a discussion lab: no new section, no
new exercise, and it stays a read-and-discuss lab with no commands.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `github.com` — the lab discusses enterprise/org settings, audit logs and billing dashboards. Its one 🖥️ block (§20.2) is a discussion prompt, not a command. |
| **Tier** | `advanced` |
| **Presenter minutes** | 6 (unchanged) |
| **Self-paced minutes** | 25 (unchanged) |
| **Prerequisites** | Lab 17 (admin controls — §20.1 and §20.2 both build on its audit-log and model-policy material) and Lab 19 (the reporting/drift shape §20.2 and §20.4 extend). Labs 05, 10, 11 and 16 are referenced but are not prerequisites. |
| **Write steps** | **None.** Every code fence in the file is a discussion prompt or a table. There is no shell command, no file write, no network call, no GUI step, and no `git` mutation anywhere in the lab. Verified by reading all 169 lines. |
| **`lab-forge` verdict** | **`run`** — no write steps at all. This is the only lab in the final batch that earns a clean `run`. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | `labs/lab20.md` contains no `2026-09-01` enforcement date, and states the sourced effective date `2026-08-26` instead | `npx vitest run tests/lab-structure/lab20-contract` |
| AC5 | `labs/lab20.md` does not name the undocumented `agent_session.task` audit event family, and describes the audit log by its documented fields instead | `npx vitest run tests/lab-structure/lab20-contract` |
| AC6 | §20.0 is not a heading with nothing but a boilerplate callout under it | `npx vitest run tests/lab-structure/lab20-contract` |
| AC7 | Declared pacing is internally consistent: frontmatter `pace`, the inline `⏱️` callout, and `docs/_meta/registry.yaml` `labs.lab20` agree | `npx vitest run tests/lab-structure/lab20-contract` |
| AC8 | Every model identifier the lab names appears in the `models:` block of `docs/_meta/registry.yaml` | `npx vitest run tests/lab-structure/lab20-contract` |

> AC7 asserts **agreement between the three places**, never that a particular number is
> correct. Per `specs/labs/README.md`, a pacing number may be changed by anyone without
> ceremony; only internal consistency has teeth.

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | "**Since 2026-09-01**, any newly-GA model a developer's org hasn't explicitly disabled is available in their `/model` picker" (line 50) | `free-check` | `docs/_meta/registry.yaml` → `model_default_availability_policy`, whose comment records that the changelog publishes **only** `2026-08-26` ("On August 26, the policy takes effect") and that `2026-09-01` "appears nowhere in the source and was re-verified absent on 2026-10-12". That comment names `labs/lab20.md:50` as the last remaining holdout. `grep -rn 2026-09-01 labs/` returns exactly one hit: `lab20.md:50`. Fix to 2026-08-26. |
| C2 | Audit logs give policy/session-lifecycle events — "that an `agent_session.task` ran, what config it touched" (§20.2) | `free-check` | `agent_session.task` is not a documented event family. Lab 17's own contract already bans it: `tests/lab-structure/lab17-contract.test.ts` asserts `expect(lab()).not.toMatch(/agent_session\.task/)`. Lab 20 carries the same retired claim. Replace with the documented agent fields Lab 17 kept — `actor_is_agent` and `agent_session_id`. |
| C3 | Audit logs explicitly do **not** carry token/cost figures or conversation content | `cite` | Lab 17 §17.3, locked by `lab17-contract` AC9 ("still states local session content is excluded from the audit log"). Lab 20 is consistent with it; no change. |
| C4 | "the 2026-07-28 MCP spec revision removed protocol-level sessions entirely" (§20.4) | `free-check` | `docs/_meta/registry.yaml` → `mcp_protocol_spec_version: "2026-07-28"` and the `memory` server note, which states the same thing in the same words. Already consistent; no change. |
| C5 | Copilot usage metrics/billing views are the source for aggregate seat and premium-request consumption | `free-check` | The lab already hedges correctly ("check your enterprise's Copilot usage dashboard", "check your Copilot administration usage/billing export docs … since usage-export APIs evolve"). It asserts no endpoint, no schema and no date. Keep the hedge as written — it is the honest shape for a surface that moves. |
| C6 | This repo's `.copilot/lessons/` pattern is scoped to one repo (§20.4) | `free-check` | `.copilot/lessons/` exists on disk. Claim is about this repository, not the outside world. No change. |

**No `research` disposition on this lab.** Every claim is settled by the registry, by an
existing contract test, or by the lab's own hedge.

## 5. Non-goals

- Do not turn Lab 20 into a hands-on lab. It is deliberately read-and-discuss; it closes the series and has no exercise. Adding commands would also break its `run` verdict.
- Do not renumber or restructure §20.1–§20.6, and do not add a §20.7.
- Do not edit `docs/_meta/registry.yaml`. Its `model_default_availability_policy` note is already correct and already names this lab as the thing to fix; the fix belongs in the lab.
- Do not edit `labs/lab17.md` or its contract test. Lab 17 is merged and green; Lab 20 cites it.
- Do not add cost/token multipliers or any vendor-attributed price figure — the same trap `specs/labs/lab10.md` C2 cut.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab20.md:50` | "Since 2026-09-01" — an enforcement date that appears in no published source. The registry comment flags this exact line. **Last remaining instance in the repository.** |
| D2 | `labs/lab20.md` §20.2, first bullet | Names `agent_session.task` as an audit event. Undocumented family, already purged from Lab 17 by `lab17-contract` AC7. Lab 20 is the surviving copy. |
| D3 | `labs/lab20.md` §20.0 | The heading "20.0 Copilot CLI currency (2026 refresh)" is followed by a single 💡 blockquote and nothing else. It is also **not** the shared `@include docs/_partials/currency.md` block that every other refreshed lab carries — it is a hand-written one-liner that mimics it. Either give the section content or drop the heading; do not inline-expand the partial here (see `specs/labs/lab10.md` D6 for why a shared partial is not edited from inside a lab). |
| D4 | `labs/lab20.md` §20.2 | Discusses audit-log capabilities at length but links no audit-log reference. Lab 17 links `agentic-audit-log-events`; Lab 20 should link the same page rather than only pointing at Lab 17 §17.3. |

## 7. Out of scope for `lab-forge`

Nothing. The lab declares no write steps, so there is nothing for the run gate to report
UNVERIFIED — it can execute the lab's content in full, because the lab's content is prose.

The one thing to watch is **scope leak rather than execution risk**: this lab references
Labs 05, 10, 11, 16, 17 and 19 and the registry, all of which are merged and green. The
editing stage must not "fix" any of them. Diff every file after the run, including test
files — the scope fence has leaked before (`specs/labs/README.md`, QA step 5).
