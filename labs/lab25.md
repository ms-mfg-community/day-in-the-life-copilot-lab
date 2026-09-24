---
title: "Telemetry, Log Analytics & the Improvement Loop"
lab_number: 25
pace:
  presenter_minutes: 8
  self_paced_minutes: 45
registry: docs/_meta/registry.yaml
---

# 25 — Telemetry, Log Analytics & the Improvement Loop

> 🚧 **Stub.** This lab is scaffolding for the enterprise agentic SDLC harness
> arc (EPIC-001). The content is specified but not yet written — see
> [EPIC-001](../docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md),
> unit **U5**, for the user stories and acceptance criteria this lab must
> satisfy.

> ⏱️ Presenter pace: 8 minutes | Self-paced: 45 minutes

**Part of:** Labs 21–26, the enterprise agentic SDLC harness arc — builds on Lab 24, and
chains forward to Lab 26.

## What this lab will cover

- The Copilot OpenTelemetry export and the `telemetry` key in `managed-settings.json`.
- `captureContent` as a governance decision.
- An **offline path** that completes with no Azure subscription.
- The Azure path, via the Logs Ingestion API.
- A KQL pack and a Workbook.

## Prerequisites

[Lab 19](lab19.md) and [Lab 20](lab20.md). Azure is **optional** — the offline path
completes without it.

## Versions and pins

This lab reads every version it depends on from the content registry at
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). No version string
is hardcoded in this file. See the registry's re-verification obligations
before running this lab with a cohort.

## Status

Not yet authored. Tracked by EPIC-001 decomposition item 7.
