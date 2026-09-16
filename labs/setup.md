# Hands-on Lab Setup

> **Setup has moved!** All setup instructions are now in the [README](../README.md).
>
> → [Go to README — Choose Your Path](../README.md#choose-your-path)
>
> **Picking a track?** See [Pick a stack: .NET track or Node track](../README.md#pick-a-stack-net-track-or-node-track).
>
> Quick reference once your environment is up:
>
> | Track | Test command |
> |-------|--------------|
> | **.NET** (`dotnet/`) | `make test-dotnet` |
> | **Node** (`node/`) | `make test-node` |
> | Both | `make test-all` |
>
> **Lab catalogue:** Labs 01–10 cover the core agentic surface; Lab 11
> teaches the enterprise plugin marketplace pattern; [Lab 12](lab12.md)
> wires up the **Fabric MCP** for both Copilot CLI and VS Code and ships
> an **offline simulator path** (local Parquet fixture) so Codespaces
> learners can complete it without Fabric auth; [Lab 13](lab13.md)
> introduces **A2A / ACP** orchestration with a two-agent
> implementer + critic walkthrough on the Node app, including the three
> classic failure modes (looping, context drift, hand-off ambiguity)
> and their mitigations; [Lab 14](lab14.md) operationalises that schema
> as the **orchestrator + tmux deep-dive** — a long-lived orchestrator
> pane plus short-lived worker panes driven by `scripts/orchestrator/`
> through a strict `plan → implement → handoff → clear → qa → clear`
> cycle (it's the same loop this repo's modernization was built with).
> Labs 15–20 are the **2026 modernization track**: [Lab 15](lab15.md)
> LSP-backed code intelligence, [Lab 16](lab16.md) enterprise
> marketplace/plugin governance (`managed-settings.json`),
> [Lab 17](lab17.md) GitHub admin AI controls, [Lab 18](lab18.md)
> spec-driven design with stacked PRs and per-layer Code Review,
> [Lab 19](lab19.md) a self-improving-agents gh-aw template, and
> [Lab 20](lab20.md) enterprise-scale token optimization and reporting.

---

*This page is kept for backwards compatibility. Please follow the README for the most up-to-date setup instructions.*
