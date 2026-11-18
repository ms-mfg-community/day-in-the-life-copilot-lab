# Lab spec — `labs/lab16.md`

| | |
|---|---|
| **Lab** | `labs/lab16.md` (264 lines) — "Enterprise Marketplace & Plugin Governance" |
| **Spec state** | `ready` |
| **Author** | John / Copilot (2026-10-12) |
| **Last updated** | 2026-10-12 |

---

## 1. Target state

After this lab an admin-minded learner can write `copilot/managed-settings.json` with each
key in its **correct shape**, and can explain why `strictKnownMarketplaces` is an array of
marketplace objects rather than a boolean. The single teaching idea is *"the names look
like booleans and lists; the schema is not, and getting the shape wrong is how a lockdown
silently fails to lock anything down."*

This is a **light** pass. Lab 16 is the best-sourced lab in the wave: it already carries
release-stage precision, a shapes-matter callout, and an explicit "don't assume a
first-party exemption" warning, and its one runnable command works. The dominant risk
here is **regression**, not correction — §3 is weighted accordingly.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — one local `node -e` command in §16.2. The admin walkthrough in §16.3 is explicitly narrated, not performed. |
| **Tier** | `advanced` |
| **Presenter minutes** | 6 (unchanged) |
| **Self-paced minutes** | 25 (unchanged — see §5) |
| **Prerequisites** | `labs/lab11.md` — §16.2 runs `plugin-template/scripts/policy.mjs` and reuses `org-policy.example.yaml`, both from Lab 11, and the opening paragraph assumes Lab 11's plugin material. Stated in prose and in References today. |
| **Write steps** | **None.** The single `node -e` command is read-only: it imports `plugin-template/scripts/policy.mjs` and reads `plugin-template/org-policy.example.yaml`. No file is written, nothing is installed, no model is called, and §16.3 is narrated rather than executed. With `lab17`, this is one of only **two** genuinely write-free labs in the wave. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | §16.2's analogy no longer uses `strictKnownMarketplaces: true`, the value the lab itself calls the classic mistake | `npx vitest run tests/lab-structure/lab16-contract` |
| AC5 | §16.0 is not an empty section — it has content or it is gone | `npx vitest run tests/lab-structure/lab16-contract` |
| AC6 | The shape warnings survive: array-not-boolean, `[]` = total lockdown, `disableBypassPermissionsMode` nested under `permissions` as a string | `npx vitest run tests/lab-structure/lab16-contract` |
| AC7 | The no-first-party-exemption warning survives, and still contrasts with `deniedMcpServers` | `npx vitest run tests/lab-structure/lab16-contract` |
| AC8 | The release-stage precision survives: GA `2026-07-01`, public preview `2026-06-25` | `npx vitest run tests/lab-structure/lab16-contract` |
| AC9 | Both paths survive: canonical `copilot/managed-settings.json`, legacy `.github/copilot/settings.json` | `npx vitest run tests/lab-structure/lab16-contract` |
| AC10 | The four-tier precedence and its most-restrictive-composition exception survive | `npx vitest run tests/lab-structure/lab16-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | §16.2 harness: "treat **`strictKnownMarketplaces: true`** as equivalent to `default_action: deny` plus an allowlist" (L151) | `free-check` — **CONTRADICTS THE LAB'S OWN CORRECTION** | The same lab says at L106 the key is *"an **array of marketplace objects**, not `true`"*, and at L220 *"Answering `strictKnownMarketplaces: true` is **the most common mistake**: the key takes an **array**, not a boolean."* L151 teaches the error the lab is built to prevent. |
| C2 | §16.1: canonical `copilot/managed-settings.json` in the source org's `.github-private`; legacy `.github/copilot/settings.json` | `free-check` — **CORRECT** | `docs/_meta/registry.yaml:169-171` (`canonical_path`, `legacy_path`, `source_repo_pattern`), verified against the published schema reference, `last_verified: 2026-09-04`. GitHub Docs *Enterprise managed settings*, opened 2026-10-12, confirms the schema page and a per-environment support matrix. |
| C3 | §16.1 precedence: MDM → server → file-based → user, with `sandbox` and `permissions.deny`/`.ask`/`.allow` composing most-restrictively; `disableBypassPermissionsMode` **not** in the exception | `free-check` — **CORRECT** | `docs/_meta/registry.yaml:191-196` records exactly this order and exception, verified against the schema reference. |
| C4 | §16.4: supported keys now include `permissions.deny`/`.ask`/`.allow`, `allowedMcpServers`, `deniedMcpServers`, `sandbox`, `telemetry`, `remoteControl` beyond the five announced at GA | `free-check` — **CORRECT** | `docs/_meta/registry.yaml:177-189` lists all thirteen. The schema reference's *Supported keys* table confirms `permissions.disableBypassPermissionsMode` and `permissions.deny` with a per-client support matrix (e.g. `disableBypassPermissionsMode` is **not** supported for Copilot cloud agent). |
| C5 | §16.2: `strictKnownMarketplaces` GA on **2026-07-01**; public preview **2026-06-25** | `free-check` — **CORRECT** | `docs/_meta/registry.yaml:197` `strict_known_marketplaces_ga_date: "2026-07-01"  # public preview: 2026-06-25`. Both changelog URLs returned **HTTP 200** on 2026-10-12. |
| C6 | §16.2 ⚠️: no documented first-party exemption for `strictKnownMarketplaces`; one *does* exist for `deniedMcpServers` | `free-check` — correct as a **negative** claim, and carefully worded | The lab asserts an absence ("the published schema documents no … carve-out") rather than inventing a presence, and the `[]`-means-lockdown semantics support it. This is the right way to state a negative. Leave the wording alone. |
| C7 | §16.1: clients fetch on every authentication, hold in memory, refresh hourly | `free-check` — **CORRECT** | `docs/_meta/registry.yaml` block and the GA changelog (cited, HTTP 200). Matches §16.3 step 4 and the §16.5 "Refresh cadence" row. |
| C8 | §16.2 `node -e …` prints `allowed: false` for an untrusted source and `allowed: true` for a trusted one (asserted in §16.4) | `free-check` — **CORRECT, executed 2026-10-12** | Ran the command verbatim from the repo root: `random-user/x -> { allowed: false, reason: 'source "random-user/untrusted-plugin" is not on the allowlist (deny by default)' }` and `contoso-internal/anything -> { allowed: true, reason: 'matched allowlist glob "contoso-internal/*"' }`. Both files exist. |
| C9 | §16.1 JSON example shapes — `extraKnownMarketplaces` named-object map, `enabledPlugins` `NAME@MARKETPLACE` boolean map, `permissions.disableBypassPermissionsMode: "disable"`, `model: "auto"` | `free-check` — **CORRECT** | Key names match the schema reference's *Supported keys* table and the registry's `supported_keys`. `model` is a plain scalar; `auto` is the registry's `models.default`. |
| C10 | Intro callout: managed settings are enforced on CLI, VS Code, the Copilot app, the cloud agent and JetBrains, "per-key support varies; see the published support matrix" | `free-check` — **CORRECT and appropriately hedged** | The schema reference's table has exactly those five client columns with per-key ✓/✗. The hedge is accurate — e.g. `permissions.disableBypassPermissionsMode` is unsupported for the cloud agent. |
| C11 | §16.3 admin walkthrough: AI Controls tab → source org → commit to `.github-private` default branch → confirm on the Agents page → wait up to an hour | `research` — **partly unverified, parked** | The source-org/commit/propagation steps match C2 and C7. The specific "**Agents** page under **AI Controls**" confirmation step needs an authenticated enterprise console, which §7 forbids. Same class as lab17's C13. **Parked — §5.** |

## 5. Non-goals

- Do not change pacing (`presenter_minutes: 6`, `self_paced_minutes: 25`) or the registry's `lab16` rows. If a gate reports the 25 is wrong, that finding is **recorded, not fixed**.
- Do not renumber sections. `16.0`–`16.5` stay, except as AC5 allows for the empty `16.0`.
- **Do not rewrite this lab.** It is the best-sourced file in the wave. §3 is deliberately weighted toward regression guards: AC6–AC10 exist to make a careless edit fail, not to request changes. The only required changes are D1 and D2.
- Do not soften or "balance" the C6 first-party-exemption warning. It is a correctly stated negative claim and the kind of thing an edit pass tends to hedge into uselessness.
- Do not verify or expand §16.3's Agents-page confirmation step (C11) — it needs an authenticated enterprise console.
- Do not change the `node -e` command in §16.2. It runs and produces exactly what §16.4 claims (C8).
- Do not update `docs/_meta/registry.yaml`, including its `last_verified` date. The registry is shared by other labs and tests.
- Do not edit any file other than `labs/lab16.md`, this spec and `tests/lab-structure/lab16-contract.test.ts`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §16.0 | **Empty section.** `## 16.0 Copilot CLI currency (2026 refresh)` followed by a boilerplate 💡 callout and nothing else — no table, no commands. Lab 01 (§1.0a) and Lab 07 (§7.0) carry real tables under this heading; `labs/lab17.md` §17.0 has the identical defect. Either give §16.0 content appropriate to an enterprise-governance lab or remove the heading. |
| D2 | §16.2, L151 | The harness analogy says "treat `strictKnownMarketplaces: true` as equivalent to…" (C1), teaching the exact boolean the lab calls the most common mistake 70 lines later. Restate the analogy without the boolean — e.g. a **populated `strictKnownMarketplaces` array** is equivalent to `default_action: deny` plus an allowlist of the marketplaces named in `extraKnownMarketplaces`. Keep the 💡 "teaching analogy, not a literal reimplementation" note that follows it. |

## 7. Out of scope for `lab-forge`

This lab has **no write steps** (§2). The run gate reports each of these UNVERIFIED rather
than executing them:

- Visiting or authenticating to any enterprise/org settings page, the **AI Controls** tab, or the **Agents** page — including to settle C11;
- committing anything to a `.github-private` repository, or any other GitHub-side write;
- any `gh api` call against an enterprise or organization endpoint;
- editing `docs/_meta/registry.yaml`.

**May** be executed, because they are read-only and local: `npm test`, the vitest
invocations in §3, the §16.2 `node -e` policy-evaluator command (verified read-only and
already run for C8), HTTP `GET` of the reference URLs, and plain file reads.

> The hazard in this lab is not a command — it is an editing stage "tidying" a file that
> is already right. Four of its callouts encode distinctions that took real research to
> establish: array-not-boolean, `[]`-means-lockdown, no first-party exemption, and GA
> versus public-preview dates. AC6–AC10 exist so that losing any of them fails the gate.
