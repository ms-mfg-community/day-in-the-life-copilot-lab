# Accuracy Pass V.4 — Independent Sub-Agent Audit Result

**Date:** 2026-04-25
**Phase:** Phase 2 — Validation V.4 (per plan §233 / Phase 2)
**Auditor:** Fresh sub-agent, model `claude-opus-4.7`, no shared context.
**Method:** Cross-check every file produced or edited by Phase 1 (waves 1+2)
against the 11 inaccurate claims catalogued in
`files/cli-research.md` §C ("Accuracy Check — Summary of Flags"). A row is
`pass` if no in-scope file asserts the wrong claim as fact (callouts that
explicitly refute the claim count as `pass`); `fail` if any file teaches the
wrong claim as truth.

**Acceptance criterion:** zero `fail` rows.

## Result table

| # | claim (one-line) | result | evidence |
|---|------------------|--------|----------|
| 1 | SKILL.md supports `model:` frontmatter | pass | `docs/copilot-config-reference.md:33,321` explicitly refute; no positive assertion in any SKILL.md |
| 2 | SKILL.md `allowed-tools` accepts `server/tool` MCP scoping | pass | `docs/copilot-config-reference.md:35,37,39,322` flag as "not documented for skills"; no positive assertion |
| 3 | `.prompt.md` works in Copilot CLI | pass | warning callouts at `labs/lab04.md:59`, `labs/appendices/dotnet/lab04.md:14`, `labs/appendices/node/lab04.md:11`, `docs/token-and-model-guide.md:15`, `docs/copilot-config-reference.md:229,323`; no file asserts CLI support |
| 4 | `mode:`/`tools:`/`model:` are official prompt-file frontmatter | pass | `docs/copilot-config-reference.md:240,324` flag as VS Code community convention; `lab04.md:118-121` lists them descriptively (not as "official") within the IDE-scoped section already gated by the IDE-only callout |
| 5 | `gh-aw` is on docs.github.com | pass | `labs/lab-gh-extensions.md:216,224-226`, `workshop/slides/55-module-5b-gh-extensions.md:125,141-142`, `docs/copilot-config-reference.md:7` all cite the `githubnext` repo and explicitly say "no canonical docs.github.com page" |
| 6 | Node.js is a first-class extension category like Go | pass | `labs/lab-gh-extensions.md:47-53,63-67` and `workshop/slides/55-module-5b-gh-extensions.md:25-34` enumerate the 3 docs categories and call Node a "subtype of interpreted" |
| 7 | `infer:` is the current way to control auto-delegation | pass | `docs/copilot-config-reference.md:72,76,325`, `labs/lab-hardening.md:80-84`, `solutions/lab-hardening/tight-reviewer.agent.md:8-9,43-46` all teach `disable-model-invocation` + `user-invocable` and mark `infer:` retired |
| 8 | `~/.copilot/config.json` is the CLI settings file | pass | `docs/copilot-config-reference.md:173,175,326` specify `settings.json` and warn legacy is auto-migrated; in-scope files only reference `mcp-config.json` (the correct MCP filename) |
| 9 | `sse` MCP type is current/recommended | pass | `docs/copilot-config-reference.md:136,139,327` and `workshop/slides/20-module-2.md:42,45` mark `sse` as deprecated and prefer `http` (Streamable HTTP) |
| 10 | `preToolUse` hooks support allow/deny/ask | pass | `labs/lab-copilot-cli-extensions.md:176`, `workshop/slides/56-module-5c-copilot-cli-extensions.md:56`, `solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json:2`, `docs/copilot-config-reference.md:168,215,221,328`, `labs/lab-hardening.md:12-13` all state deny-only, allow/ask ignored |
| 11 | Default Copilot CLI model is GPT-5 | pass | no in-scope file asserts GPT-5 as default; `docs/token-and-model-guide.md:30-32` names `auto` as default; `solutions/lab-hardening/tight-reviewer.agent.md:41` cites Claude Sonnet 4.5 as default |

**RESULT: 11/11 pass, 0/11 fail.** ✅ Acceptance met.

## Files in scope (audited)

WS-A1 (7), WS-A2 (8), WS-B (9), accuracy-ledger soft-callout edits (6),
WS-C (2). Total: 32 files. Full list reproduced in the auditor prompt; see
`.orchestrator/session.md` (phase 2 handoff) for the canonical file list.
