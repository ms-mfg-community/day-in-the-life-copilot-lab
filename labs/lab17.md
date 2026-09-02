---
title: "GitHub Admin Controls for Copilot/AI"
lab_number: 17
pace:
  presenter_minutes: 6
  self_paced_minutes: 25
registry: docs/_meta/registry.yaml
---

# 17 — GitHub Admin Controls for Copilot/AI

This lab surveys the **AI Controls** area of enterprise/org settings — the
centralized nav where admins manage Copilot policy, review agent activity,
and audit AI-driven changes — and walks through the single biggest policy
shift of 2026: the move to **default-on model availability**.

> ⏱️ Presenter pace: 6 minutes | Self-paced: 25 minutes

> 💡 **Enterprise context:** Labs 01–16 taught you what an individual
> developer or repo can configure. This lab is the admin's-eye view: what
> an enterprise/org owner sees, what they can restrict, and what they're
> accountable for auditing.

References:
- [Agents and enterprise management](https://docs.github.com/copilot/concepts/agents/enterprise-management)
- [Reviewing audit logs for Copilot](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/manage-for-enterprise/review-audit-logs)
- [Default model enablement for Copilot Business and Enterprise](https://github.blog/changelog/2026-07-29-default-model-enablement-for-copilot-business-and-enterprise/) — confirmed via direct fetch
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) `model_default_availability_policy`

## 17.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

## 17.1 The AI Controls Nav

GitHub's enterprise/org settings now surface a dedicated **AI Controls**
area (not merely "Copilot settings") that covers:

- **Custom admin roles** scoped to AI/Copilot management, separate from
  full org-owner access — lets an enterprise delegate "manage Copilot
  policy" without granting broader admin rights.
- **Agent session activity** — a view of coding-agent and other
  agent-driven sessions across the enterprise/org, filterable by repo,
  actor, and time range.
- **Managed settings source-org selection** — the same "AI Controls" tab
  Lab 16 used to pick which org's `.github-private` repo hosts
  `managed-settings.json`.
- **Global model availability policy** — see §17.2.

## 17.2 The Default-On Model Policy (Confirmed, Sept 2026)

Per GitHub's own changelog (fetched directly): a new single global
**"Default availability for released models"** policy replaced the
previous per-model implicit-hold behavior.

- **Rollout timeline:** began 2026-08-26, enforced org-wide by 2026-09-01.
- **What changed:** previously, a newly-GA'd model was effectively *off*
  for an org until an admin explicitly enabled it. Now, **any newly-GA
  model an admin has not explicitly configured is available to users by
  default.**
- **What's still off by default (exceptions):** open-weight models (e.g.
  DeepSeek, Kimi), models outside GitHub's data retention agreement, pre-GA
  models, and FedRAMP-restricted models.
- **How to restore the old behavior:** an admin can flip the global switch
  to "disabled," which restores the curated-allowlist model.

> ⚠️ **Why this matters for the model tiers in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):**
> the registry's `models.cheap`/`standard`/`premium` lists are a **curated
> teaching convention** for this lab suite, not an enforcement mechanism.
> Under the new default-on policy, a learner's actual Copilot CLI `/model`
> picker may show additional models the registry doesn't list — because
> their org hasn't explicitly disabled the global policy. That's expected
> and not a bug in the labs; it's the new default platform behavior.

🖥️ **Discuss/answer:**

```
Our enterprise wants engineers to only ever pick from a small,
security-reviewed set of models — no silent additions when GitHub ships
a new model. What's the one global switch we need to flip, and what
governance step follows from flipping it?
```

> 💡 **Expected answer:** disable the global "default availability for
> released models" policy, then explicitly enable each reviewed model —
> the exact inverse of the new default (this restores the old
> curated-allowlist behavior, at the cost of manually re-enabling each
> future model an org actually wants).

## 17.3 Audit Logs for AI Activity

Per GitHub's enterprise audit-log docs, Copilot/agent-relevant audit events
include:

- Access changes (who can use Copilot, plan changes)
- Content-exclusion policy changes
- Coding-agent configuration changes
- MCP policy changes (including managed-settings.json commits, per Lab 16)
- Firewall allowlist changes (for coding-agent network access)
- An `actor_is_agent` field distinguishing human-initiated vs. agent-
  initiated audit events
- `agent_session.task` lifecycle events (session start/end, task
  completion)

Retention is **180 days** in the standard audit log; enterprises that need
longer retention stream to a SIEM.

> ⚠️ **Explicitly excluded from audit logs:** the actual content of local
> IDE/CLI sessions — prompts, responses, and generated code in tools like
> Copilot CLI itself are **not** captured in the audit log. The audit log
> tells you *that* an agent session ran and *what config/policy* it
> touched, not the literal conversation content. Don't design a compliance
> story that assumes otherwise.

🖥️ **Discuss/answer:**

```
A security reviewer asks: "Can we see exactly what a developer asked
Copilot CLI locally last Tuesday?" What does the audit log actually give
us, and what does it NOT give us?
```

> 💡 **Expected answer:** the audit log shows policy/config-level events
> (e.g. that an agent session ran, what MCP/coding-agent config changed) —
> it does not capture the literal local CLI conversation content. That
> would require a different mechanism (e.g. a locally-enforced logging
> hook the org opts into, which is out of scope for the platform audit
> log).

## 17.4 Check your work

✅ You can name three things the **AI Controls** nav covers beyond
per-repo Copilot settings.

✅ You can explain the default-on model policy in one sentence and name
the four exception categories that remain off by default.

✅ You can state what the Copilot audit log does and does NOT capture
about local CLI/IDE session content.

## 17.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **AI Controls nav** | Custom admin roles, agent session activity, managed-settings source-org selection, global model policy |
| **Default-on model policy** | GA models are on by default unless disabled; enforced org-wide since 2026-09-01 |
| **Exceptions still off by default** | Open-weight models, non-data-retention models, pre-GA models, FedRAMP-restricted models |
| **Audit log retention** | 180 days standard, longer via SIEM streaming |
| **Audit log scope** | Config/policy/session-lifecycle events, NOT local IDE/CLI conversation content |

</details>

**Next:** [Lab 18 — Spec-Driven Design, Stacked PRs & Code Review in the Loop](lab18.md)
