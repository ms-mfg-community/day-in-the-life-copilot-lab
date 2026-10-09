# Contoso Implementation Plan

> Contoso SDD Standards — this file WRAPS the Spec Kit core plan template.
> The placeholder below (a single token on its own line, between the two rules)
> is replaced at resolution time with whatever the next layer down provides —
> an extension's plan template, or core's. Remove it and the wrap can no longer
> produce output.
>
> Deliberately written without naming the token here: Spec Kit substring-matches
> the whole file, so a second mention in prose would satisfy the check and mask a
> deleted placeholder. One occurrence only.

## Architecture Review Gate — before planning

- [ ] Data classification from the spec is carried forward and still correct.
- [ ] An existing Contoso service was considered before proposing a new one.
- [ ] Any new external dependency is named here, with its licence.

---

{CORE_TEMPLATE}

---

## Architecture Review Sign-off — after planning

| Role | Name | Date | Decision |
|---|---|---|---|
| Architecture Council | | | [Approved / Rework] |
| Security | | | [Approved / Rework] |
| Data Protection *(Restricted only)* | | | [Approved / Rework / N-A] |

> A plan without sign-off may be implemented behind a feature flag, but may not
> be released. This is the gate Lab 23 turns into an enforced workflow.
