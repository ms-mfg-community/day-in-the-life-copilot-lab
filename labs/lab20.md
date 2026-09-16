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
- [Lab 17 — GitHub Admin Controls for Copilot/AI](lab17.md)
- [Lab 16 — Enterprise Marketplace & Plugin Governance](lab16.md)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — `model_default_availability_policy`

## 20.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

## 20.1 Why Individual-Scale Advice Doesn't Automatically Scale

The individual guide's core moves — pick `auto` by default, batch tool
calls, `/clear` between phases, downshift to `models.cheap` for
tool-heavy loops — are all **per-session, developer-initiated** decisions.
At enterprise scale, three things break that assumption:

1. **The default-on model policy (Lab 17) removes the implicit cost
   ceiling.** Since 2026-09-01, any newly-GA model a developer's org
   hasn't explicitly disabled is available in their `/model` picker —
   including models the individual guide's `models.premium` tier never
   anticipated. A developer optimizing *their own* cost has no visibility
   into whether the *org* wants that model available at all.
2. **No developer has aggregate visibility.** An individual can watch
   their own token spend; only an org admin can see whether 40 developers
   are all defaulting to a premium model for routine work.
3. **Prompt/skill/agent drift compounds across teams**, not just across
   time (which [Lab 19](lab19.md) addresses within one repo) — five teams
   independently inventing five slightly different `.copilot/lessons/`
   conventions is an org-level consistency problem, not a per-repo one.

## 20.2 Org-Level Usage Monitoring

At the enterprise/org level, token/usage visibility is a governance
concern, not a per-developer curiosity:

- **Audit logs (Lab 17 §17.3)** give you *policy and session-lifecycle*
  events — that an `agent_session.task` ran, what config it touched — but
  explicitly **not** token/cost figures or conversation content.
- **Copilot usage metrics/billing views** (enterprise/org settings) are
  the actual source for aggregate seat usage and premium-request
  consumption — check your enterprise's Copilot usage dashboard, which is
  distinct from the audit log.
- **A locally-built reporting harness** (this repo's pattern): extend the
  [Lab 19](lab19.md) self-improving-agents template's reporting shape — a
  scheduled gh-aw workflow that aggregates *whatever your org's actual
  usage-export mechanism provides* (check your Copilot administration
  usage/billing export docs for the current mechanism, since usage-export
  APIs evolve) into a weekly digest, rather than expecting every developer
  to self-report.

🖥️ **Discuss/answer:**

```
Our finance team wants a monthly report showing which teams' average
Copilot session uses which model tier, without reading any conversation
content. Which of the three sources above (audit log, usage/billing
dashboard, custom harness) actually gives us that, and why don't the
other two?
```

> 💡 **Expected answer:** the usage/billing dashboard is the right source
> for aggregate model/seat consumption; the audit log doesn't carry
> token/cost figures, and a custom harness would need to be built *on top
> of* the org's usage-export mechanism rather than replacing it.

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

- **Don't** try to build a single global knowledge graph across every
  repo — that reintroduces exactly the MCP-protocol-session assumptions
  Lab 05/10 explicitly moved away from (recall: the 2026-07-28 MCP spec
  revision removed protocol-level sessions entirely; a cross-repo
  "memory service" would have to be an explicit, versioned, org-owned
  application, not a protocol feature).
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
harness is the right source for aggregate token/model-tier reporting.

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
| **Right reporting source** | Usage/billing dashboard for token/model data — NOT the audit log, which is policy/lifecycle only |
| **Prompt governance** | Central, reviewed prompt libraries beat per-team reinvention |
| **Knowledge-base governance** | Promote reusable lessons to a shared, reviewed repo — don't build a cross-repo memory *service* |

</details>

**Lab series complete.** Return to the [README](../README.md) for the full
lab index, or revisit [Lab 01](lab01.md) to start again from a fresh
Codespace/devcontainer.
