
---

## Contoso Governance Tasks

> Contoso SDD Standards — this fragment is APPENDED after the core task list.
> It is not a whole template: everything above this line comes from the layer
> below, and this file only ever contributes the tasks below.

- [ ] **G1.** Record the data classification in the service catalog entry.
- [ ] **G2.** Confirm the Risk & Compliance table in the spec is still accurate
      after planning — risks discovered during design go back into the spec.
- [ ] **G3.** Attach the architecture-review sign-off to the pull request.
- [ ] **G4.** Confirm no secret, key or connection string is committed; verify
      every credential resolves from configuration at runtime.
- [ ] **G5.** Add or update the runbook entry before release, not after.
- [ ] **G6.** For Restricted data: confirm the retention obligation from the
      spec is implemented, not merely documented.
