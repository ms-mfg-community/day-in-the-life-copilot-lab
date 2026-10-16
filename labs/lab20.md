---
title: "Enterprise Token Optimization & Reporting"
lab_number: 20
pace:
  presenter_minutes: 6
  self_paced_minutes: 25
registry: docs/_meta/registry.yaml
---

# 20 — Enterprise Token Optimization & Reporting

[`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md) taught
individual-scale token discipline: model tiers, batching, context hygiene,
and `/cost-check`. This lab takes the same discipline to the **enterprise/
org level** — usage monitoring across teams, prompt-management governance,
and knowledge-base consistency at scale, incorporating the new default-on
model policy from [Lab 17](lab17.md).

> ⏱️ Presenter pace: 6 minutes | Self-paced: 25 minutes

> 🧭 **Two routes through this lab.** The pace above is fixed, so each
> audience spends it differently. Neither route runs anything: this is a
> read-and-discuss lab, and the one 🖥️ block in §20.2 is a question to
> answer, not a command.
>
> - **Presenter route (6 min).** Talk it through; the only discussion is
>   in §20.2. Spend about 1 minute on §20.1 (items 1 and 2; mention item 3
>   only as the bridge to §20.3 and §20.4). Spend about 2 minutes on the
>   one source-choice exchange in §20.2: name the three sources, ask the
>   🖥️ question, take one answer, then give the expected answer. Take
>   §20.3 and §20.4 together in about 2 minutes, one sentence per
>   mechanism, with one through-line: anything shared org-wide needs an
>   owner, a review, and a version history. Use the last minute to read
>   the three §20.5 checks aloud.
> - **Self-paced route (25 min).** Read §20.1–§20.6 in order, and write
>   your own answer to the §20.2 question before you read the expected
>   answer. Everything the presenter route skips is for you: the
>   audit-log field detail in §20.2, the optional MCP background in §20.4,
>   and the §20.6 table (a recap of what you have just read).

> 💡 **Why this is a separate lab from the individual guide:** an
> individual developer optimizes *their own* session. An enterprise admin
> optimizes *aggregate spend and consistency across hundreds of
> developers* — a fundamentally different lens, with different levers
> (org-wide policy, not per-session model choice) and different failure
> modes (silent cost creep from newly-default-on models, divergent
> per-team prompt conventions, knowledge that lives in one team's
> `.copilot/lessons/` and never reaches another team).

References:
- [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md) — the individual-scale guide this lab extends
- [Default model enablement for Copilot Business and Enterprise](https://github.blog/changelog/2026-07-29-default-model-enablement-for-copilot-business-and-enterprise/)
- [Audit log events for agents](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/agentic-audit-log-events)
- [Lab 17 — GitHub Admin Controls for Copilot/AI](lab17.md)
- [Lab 16 — Enterprise Marketplace & Plugin Governance](lab16.md)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — `model_default_availability_policy` and `mcp_protocol_spec_version`

## 20.1 Why Individual-Scale Advice Doesn't Automatically Scale

The individual guide's core moves — pick `auto` by default, batch tool
calls, `/clear` between phases, downshift to `models.cheap` for
tool-heavy loops — are all **per-session, developer-initiated** decisions.
At enterprise scale, three things break that assumption:

1. **The default-on model policy (Lab 17) removes the implicit cost
   ceiling.** Since the policy took effect on 2026-08-26 (per the
   changelog, as recorded in the registry's
   `model_default_availability_policy`), generally available models an
   admin has not explicitly configured follow the org/enterprise "default
   availability for released models" policy. That policy is on by default,
   so those models are available to developers; if an admin disables it,
   they are not. Explicit per-model choices are always preserved, and
   open-weight models and models not covered by GitHub's data retention
   agreement are excluded from default enablement regardless of the
   policy. In practice, a developer's `/model` picker can show models the
   individual guide's `models.premium` tier never anticipated. A developer
   optimizing *their own* cost has no visibility into whether the *org*
   wants such models available at all.
2. **No developer has aggregate visibility.** An individual can watch
   their own token spend; only an org admin can see whether 40 developers
   are all defaulting to a premium model for routine work.
3. **Prompt/skill/agent drift compounds across teams**, not just across
   time (which [Lab 19](lab19.md) addresses within one repo) — five teams
   independently inventing five slightly different `.copilot/lessons/`
   conventions is an org-level consistency problem, not a per-repo one.

## 20.2 Org-Level Usage Monitoring

At the enterprise/org level, token/usage visibility is a governance
concern, not a per-developer curiosity. Three sources get mixed up here,
and only one of them is where the aggregate usage numbers come from:

- **The standard enterprise audit log (Lab 17 §17.3)** gives you
  *policy-change and agent-activity* events — which Copilot settings and
  policies changed, and what an agent did on GitHub — but **not**
  token/cost figures or the content of local IDE/CLI sessions. The
  standard audit log is not a usage source.
  *Self-paced detail:* agent events carry documented fields such as
  `actor_is_agent` (always `true` for agentic events) and
  `agent_session_id` (present when an event came from an agent session; it
  ties the event to that session) — see the
  [Audit log events for agents](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/agentic-audit-log-events)
  reference. The same reference also documents a public-preview *Streaming
  audit log events* feature (available only to enterprises that use
  Enterprise Managed Users or GitHub Enterprise Cloud with data residency)
  that streams Copilot API usage records whose fields include the
  request/response body — a content/compliance stream, not the aggregate
  seat and premium-request source the question below asks about.
- **Copilot usage metrics/billing views** (enterprise/org settings; the
  "usage/billing dashboard" in the question below) are the **primary
  usage source** for aggregate seat usage and premium-request
  consumption — check your enterprise's Copilot usage dashboard, which is
  distinct from the audit log.
- **A locally-built reporting harness** (this repo's pattern) sits
  *downstream* of that usage source: extend the
  [Lab 19](lab19.md) self-improving-agents template's reporting shape — a
  scheduled gh-aw workflow that aggregates *whatever your org's actual
  usage-export mechanism provides* (check your Copilot administration
  usage/billing export docs for the current mechanism, since usage-export
  APIs evolve) into a weekly digest, rather than expecting every developer
  to self-report. It repackages usage data; it is not a second place the
  numbers come from.

🖥️ **Discuss/answer:**

```
Our finance team wants a monthly view of how many Copilot seats are in
use and how many premium requests the org has consumed, without reading
any conversation content. Which of the three sources above (audit log,
usage/billing dashboard, custom harness) is the primary source for
that, and why aren't the other two?
```

> 💡 **Expected answer:** the usage/billing dashboard is the primary
> source for aggregate seat usage and premium-request consumption. The
> standard audit log records policy changes and agent activity, not token or
> cost figures, so it can't answer a consumption question. A custom harness is
> downstream: it can only repackage what the org's usage export provides,
> so it never replaces that export as the source of the numbers. Nothing
> in this lab establishes anything finer (per-team splits, per-session
> averages, model-tier breakdowns), so check what your usage/billing
> documentation actually offers before promising those to finance.

## 20.3 Enterprise Prompt-Management Governance

The individual guide treats a `.prompt.md` file as a personal productivity
tool. At org scale, prompt files are a **governance surface**:

- **Central prompt libraries** — an org-wide `.github-private` repo (the
  same repo pattern Lab 16 used for `managed-settings.json`) can host
  vetted, reusable prompts that teams reference instead of each
  reinventing them — reducing both duplicated design effort and
  inconsistent quality.
- **Review requirements** — treat a shared prompt file the same way this
  repo treats `plugin-template/`'s manifest and release workflow (Lab 11):
  require `CODEOWNERS` review before a prompt that will run org-wide can
  change, since a bad prompt change affects every team using it at once.
- **Deprecation discipline** — same rule as Lab 11 §11.6: never delete a
  shipped shared prompt outright; mark it deprecated with a migration
  pointer, so teams mid-adoption aren't broken silently.

## 20.4 Knowledge-Base Governance Across Teams

This repo's own [`.copilot/lessons/`](../.copilot/lessons/) pattern
(Lab 05 §5.3, Lab 10) is scoped to **one repo**. At the enterprise level,
the same governance question repeats one layer up: how do lessons learned
in Team A's repo reach Team B?

- **Don't** try to build a single global knowledge base — a cross-repo
  "memory service" that every team's agents read and write. Nobody would
  clearly own it, nothing would review what goes into it, and nobody could
  say which version of a lesson an agent acted on. The shared repo in the
  next bullet gives you all three: the `CODEOWNERS` review requirement
  from §20.3 supplies the owner and the review, and git history supplies
  the versions.
  *Optional background:* [Lab 05 §5.3](lab05.md#53-cross-session-persistence--markdown-lessons-not-a-server)
  and [Lab 10](lab10.md) explain why this repo keeps its memory in
  markdown lessons rather than an MCP server. The 2026-07-28 MCP spec
  revision removed protocol-level sessions (implicit state the protocol
  itself kept between calls), so a cross-repo memory would have to be an
  explicit, versioned, org-owned application, not a protocol feature. You
  don't need this history to apply the rule above.
- **Do** promote genuinely reusable lessons into the same kind of shared,
  reviewed artifact as §20.3's prompt libraries — a curated, versioned
  `.github-private` knowledge repo other teams' agents can be configured
  to read, with the same review discipline (CODEOWNERS, deprecation
  markers) as any other shared config surface.
- **Measure knowledge-base health the same way [Lab 19](lab19.md)
  measures agent/skill health** — stale references, underused entries,
  duplicated content across teams are the org-level analogue of that
  lab's drift signals, just applied to a knowledge base instead of an
  agent roster.

## 20.5 Check your work

✅ You can explain why the default-on model policy (Lab 17) removes an
implicit cost ceiling that individual-scale guidance used to rely on.

✅ You can name which of audit logs / usage-billing dashboard / custom
harness is the primary source for aggregate seat usage and premium-request
consumption, and say why the standard audit log isn't one and a custom
harness sits downstream of it.

✅ You can describe one concrete governance mechanism (review requirement,
deprecation discipline, or shared repo pattern) for keeping prompts or
knowledge bases consistent across teams, not just within one repo.

## 20.6 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Scale shift** | Individual guide optimizes one session; enterprise lens optimizes aggregate spend + consistency |
| **No implicit ceiling anymore** | Default-on model policy (Lab 17) means new models can silently appear org-wide |
| **Right reporting source** | The usage/billing dashboard is the primary source for aggregate seat usage and premium-request consumption — NOT the standard audit log (policy changes and agent activity); a custom harness is downstream of the usage export |
| **Prompt governance** | Central, reviewed prompt libraries beat per-team reinvention |
| **Knowledge-base governance** | Promote reusable lessons to a shared repo with explicit ownership, versioning, and review — don't build a cross-repo memory *service* that has none of the three |

</details>

**Lab series complete.** Return to the [README](../README.md) for the full
lab index, or revisit [Lab 01](lab01.md) to start again from a fresh
Codespace/devcontainer.
