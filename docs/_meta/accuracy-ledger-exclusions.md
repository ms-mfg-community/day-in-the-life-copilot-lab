# WS-B Accuracy Ledger — File Exclusions

**Rule:** The WS-B accuracy-ledger sweep MUST NOT modify any file listed below. These files are either part of the recent lab10 rewrite (editing them now would re-litigate a just-landed merge), authored by WS-B itself (editing sibling output is circular), or authored by the WS-A1 / WS-A2 workstreams (their output is correct by construction and outside the ledger's scope).

**Cutoff SHA:** `dcf076b` (lab10 rewrite — "UP: rewrite labs to teach markdown lessons pattern", plus follow-ups `46438e7` and `2b581d6`).
**Date:** 2026-04-24

| Path | Reason for exclusion |
| --- | --- |
| .github/prompts/handoff.prompt.md | lab10-rewrite (recent merge — re-litigation risk) |
| .github/prompts/skill-create.prompt.md | lab10-rewrite (recent merge — re-litigation risk) |
| AGENTS.md | lab10-rewrite (recent merge — re-litigation risk) |
| README.md | lab10-rewrite (recent merge — re-litigation risk) |
| docs/memory-decision-tree.md | lab10-rewrite (recent merge — re-litigation risk) |
| labs/lab01.md | lab10-rewrite (recent merge — re-litigation risk) |
| labs/lab05.md | lab10-rewrite (recent merge — re-litigation risk) |
| labs/lab09.md | lab10-rewrite (recent merge — re-litigation risk) |
| labs/lab10.md | lab10-rewrite (recent merge — re-litigation risk) |
| labs/lab13.md | lab10-rewrite (recent merge — re-litigation risk) |
| labs/lab14.md | lab10-rewrite (recent merge — re-litigation risk) |
| solutions/README.md | lab10-rewrite (recent merge — re-litigation risk) |
| solutions/lab10-session-management/README.md | lab10-rewrite (recent merge — re-litigation risk) |
| solutions/lab10-session-management/memory-entities.json | lab10-rewrite (recent merge — re-litigation risk) |
| solutions/lab10-session-management/memory-relations.json | lab10-rewrite (recent merge — re-litigation risk) |
| solutions/lab10-session-management/sample-handoff.md | lab10-rewrite (recent merge — re-litigation risk) |
| tests/memory/decision-tree-coverage.test.ts | lab10-rewrite (recent merge — re-litigation risk) |
| workshop/attendee-handout.md | lab10-rewrite (recent merge — re-litigation risk) |
| workshop/curriculum.md | lab10-rewrite (recent merge — re-litigation risk) |
| workshop/slides/10-module-1.md | lab10-rewrite (recent merge — re-litigation risk) |
| workshop/speaker-scripts/module-01-extensibility-architecture.md | lab10-rewrite (recent merge — re-litigation risk) |
| labs/lab-hardening.md | WS-B authored (sibling output — circular) |
| solutions/lab-hardening/** | WS-B authored (sibling output — circular) |
| docs/copilot-config-reference.md | WS-B authored (sibling output — circular) |
| labs/lab-gh-extensions.md | WS-A1 authored |
| labs/appendices/dotnet/lab-gh-extensions.md | WS-A1 authored |
| labs/appendices/node/lab-gh-extensions.md | WS-A1 authored |
| solutions/lab-gh-extensions/** | WS-A1 authored |
| workshop/slides/55-module-5b-gh-extensions.md | WS-A1 authored |
| labs/lab-copilot-cli-extensions.md | WS-A2 authored |
| labs/appendices/dotnet/lab-copilot-cli-extensions.md | WS-A2 authored |
| labs/appendices/node/lab-copilot-cli-extensions.md | WS-A2 authored |
| solutions/lab-copilot-cli-extensions/** | WS-A2 authored |
| workshop/slides/56-module-5c-copilot-cli-extensions.md | WS-A2 authored |
