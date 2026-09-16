---
name: modernization-scan
description: Runs the modernization-drift-scanner skill and reports findings without editing anything.
---

# /modernization-scan

Invoke the `modernization-drift-scanner` skill against this repo's
`.github/agents/`, `.github/skills/`, and `.github/prompts/` directories
(adjust paths if this repo uses different locations). Report the five
drift-signal categories (stale references, contradicted instructions,
underused skills, eval-harness contradictions, consolidation candidates)
as a structured summary. Do not edit or delete any file — this prompt is
report-only; use the `modernization-auditor` agent if you want mechanical
fixes applied.
