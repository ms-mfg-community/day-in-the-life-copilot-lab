---
name: modernization-drift-scanner
description: >-
  Scans a repo's agents/skills/prompts directories for the five drift
  signals used by the modernization-bundle plugin (stale references,
  contradicted instructions, underused skills, eval-harness contradictions,
  duplicated responsibility) and produces a structured report.
---

# Modernization Drift Scanner Skill

Invoke this skill to produce a drift report for a repo's AI configuration.
It expects the caller (typically the `modernization-auditor` agent) to
supply the repo's configured paths — this skill is portable and makes no
assumption about directory names.

## Inputs

- `agents_dir` — where custom agent `.md` files live (e.g. `.github/agents/`).
- `skills_dir` — where `SKILL.md`-based skills live.
- `prompts_dir` — where `.prompt.md` slash-prompts live.
- `eval_harness_dir` — optional; if present, cross-check agents/skills
  against its rubric.

## Procedure

1. Enumerate every file under `agents_dir`, `skills_dir`, `prompts_dir`.
2. For each file, `grep`/`find` every referenced path and command it
   mentions; flag any that don't resolve against the current repo tree.
3. Search recent commit messages / merged-PR review comments (if available)
   for corrections that contradict a file's stated instructions.
4. If session/invocation history is available, flag any skill or prompt with
   zero invocations in the lookback window.
5. If `eval_harness_dir` exists, flag any agent/skill whose stated behavior
   would score poorly against its rubric.
6. Compare pairs of agents/skills for materially overlapping scope; list
   as consolidation candidates (do not merge).

## Output

A structured report grouped by signal type (stale references, contradicted
instructions, underused, eval-harness contradictions, consolidation
candidates), each entry naming the specific file and evidence found.

## Notes

- This skill only *reports* — it does not edit or delete files. The calling
  agent decides what, if anything, is safe to fix mechanically.
- Designed to be reused by the `.github/workflows/self-improving-agents.md`
  gh-aw template (see that workflow's "Portability config" block) — this
  skill is the same scan logic, callable interactively from Copilot CLI
  instead of only from a scheduled workflow.
