# Weekly Content Staleness Audit

> Generated automatically by `.github/workflows/weekly-content-audit.md`.

## Summary

| Check | Findings | Safe to apply | Needs review |
|-------|---------:|--------------:|-------------:|
| 1. Copilot CLI version | 0 | 0 | 0 |
| 2. gh-aw schema/features | 1 | 0 | 1 |
| 3. MCP server versions | 0 | 0 | 0 |
| 4. Documentation URLs | 0 | 0 | 0 |
| 5. Package versions | 0 | 0 | 0 |
| 6. Model names & pricing | 2 | 0 | 2 |
| 7. Lab pacing | 0 | 0 | 0 |
| **Total** | **3** | **0** | **3** |

## Checks

Registry reading (from `docs/_meta/registry.yaml` itself):

- Freshness threshold: not stated; could not be determined.
- Verification dates: recorded in comments and in `last_verified` fields; the latest is 2026-10-12 (in a comment).
- Structured claim-to-file mapping: none exists; could not be determined.
- Consumers named in comments: `scripts/preflight.*`, the `tests/` files, `workshop/curriculum.md`, labs 14 and 20.

Limitation: the drift run's source snapshots (`/tmp/gh-aw/agent/sources/`, `manifest.json`) are not available in this run; items were re-checked by fetching the cited pages directly.

### 1. Copilot CLI version

_No findings._

### 2. gh-aw schema/features

- `gh_aw_schema_version` is `0.86.2`; `github/gh-aw` v1.0.0 (2026-10-26) through v1.3.0 (2026-11-16) are released. Report-only: the value is not changed and `.github/workflows/` is untouched. A maintainer decides whether to recompile.

### 3. MCP server versions

_No findings._

### 4. Documentation URLs

_No findings._

### 5. Package versions

_No findings._

### 6. Model names & pricing

Report-only (model-catalogue churn); no registry or lab edits were made. Confirmed at the cited changelog pages:

- Deprecated 2026-11-16 (https://github.blog/changelog/2026-11-16-github-copilot-models-deprecated-on-november-16-2026/): Claude Opus 4.8 and Claude Opus 5 (alternative Claude Opus 5.5), GPT-5.6 Terra (alternative GPT-6.1 Sol or GPT-6 Luna). `models.premium` lists `claude-opus-5`, which is also named in `docs/token-and-model-guide.md`, `specs/_template.md` and `specs/001-research-sota/memory.md`.
- Deprecating 2026-12-14 (https://github.blog/changelog/2026-11-13-upcoming-deprecation-of-selected-github-copilot-models-in-december/): Claude Fable 5, Claude Haiku 4.5 (stays for individual annual plans; alternative Claude Haiku 5.5), Gemini 3.8 Flash, Gemini 4 Argon, Grok 4.6 (alternative Grok 4.7), Kimi K3. The registry lists `claude-haiku-4.5` in `models.cheap` and `grok-4.6` in `models.premium`; labs, workshop slides, `docs/token-and-model-guide.md` and `.github/skills/cost-check/SKILL.md` also name them.

### 7. Lab pacing

_No findings._

## Suggestions for Additions

- Enterprise control over where Copilot customizations come from (labs 11, 16, 17): https://github.blog/changelog/2026-11-16-control-where-github-copilot-customizations-come-from
- VS Code Local harness retirement in February 2027 (lab 14 and CLI/VS Code content): https://github.blog/changelog/2026-11-16-vs-code-retires-the-local-harness-in-february-2027

## Metadata

- run_date_utc: `2026-11-17T13:53:27Z`
- branch: `weekly-audit-2026-11-17`
- registry_schema_version: `1`
- workflow: `.github/workflows/weekly-content-audit.md`
