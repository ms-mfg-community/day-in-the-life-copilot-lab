# Lab spec — `labs/lab11.md`

| | |
|---|---|
| **Lab** | `labs/lab11.md` (16.2 KB) — "Building & Distributing a Copilot Plugin (Enterprise Marketplace Pattern)" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13, batch lab05/08/09/11/12) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 11 teaches the enterprise plugin supply chain end to end: a plugin is a directory with a
manifest and entrypoints, it is published from a **private org registry repo** under a
signed, SBOM-bearing release, consumers are pinned to that source, and a **deny-by-default
allowlist** decides what may be installed. The teaching idea is that plugin distribution is a
supply-chain problem, not a convenience feature.

After the refresh the lab teaches the same thing, but **the managed-settings facts it states
match `docs/_meta/registry.yaml` instead of a frozen five-key snapshot**, the fictional
`contoso-internal/...` commands are unambiguously marked as illustrative rather than steps a
learner will fail to run, and the declared duration matches the exercises that actually
execute. No section is added or renamed; the `plugin-template/` contract and its four CI
suites are already correct and stay as they are.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — §11.1/§11.2/§11.5/§11.7 are local file + `node` work in this repo; §11.3/§11.4 describe a `github.com` publish-and-install flow against an org registry the learner does not have. |
| **Tier** | `advanced` |
| **Presenter minutes** | 6 (unchanged) |
| **Self-paced minutes** | 25 — **under review. Derived estimate ≈30**, see D5. A guideline for the editing stage, *not* a floor; the teachability gate re-derives duration and its number wins. The contract test asserts only that frontmatter, registry and the inline callout agree. |
| **Prerequisites** | **Lab 03** (bundled agents) and **Lab 04** (bundled skills and prompts) — §11.1's entrypoint table assumes the learner knows what an agent, a skill and a prompt file are. **Lab 16** is *forward*-referenced, not a prerequisite. |
| **Write steps** | **Mostly contained, with two exceptions.** §11.2 `cp -a plugin-template my-plugin` creates an **untracked directory inside the working tree** that the lab never deletes. §11.3 `export COPILOT_PLUGIN_REGISTRIES=...` is shell-local. §11.4 `/plugin install contoso-internal/contoso-copilot-plugins` **reaches the network for a repository that does not exist**. `node plugin-template/scripts/install.mjs` is a declared **dry run** and `§11.5`'s policy snippet is pure evaluation — both are safe to execute. |

> **`lab-forge` verdict: `run with §7 fenced`.** This is the most runnable lab in the batch.
> The run gate **may** execute `node plugin-template/scripts/install.mjs` and the §11.5
> `isAllowed` snippet — both are read-only and both are already covered by committed tests.
> It must not run §11.2's `cp -a` (leaves `my-plugin/` untracked in the tree) or anything in
> §11.3/§11.4.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The four `plugin-template` suites the lab names in §11.7 are exactly the `*.test.ts` files in `tests/plugin-template/` | `npx vitest run tests/lab-structure/lab11-contract` |
| AC5 | Every managed-settings key the lab names appears in registry `enterprise_managed_settings.supported_keys` | `npx vitest run tests/lab-structure/lab11-contract` |
| AC6 | The lab does not present its key list as complete — it states no closed enumeration ("Supported keys today: … `model`.") without pointing at the registry as the live list | `npx vitest run tests/lab-structure/lab11-contract` |
| AC7 | `disableBypassPermissionsMode` never appears without its `permissions.` prefix | `npx vitest run tests/lab-structure/lab11-contract` |
| AC8 | §11.4 marks the `contoso-internal/...` install as illustrative — a learner is told to substitute their own org before running it | `npx vitest run tests/lab-structure/lab11-contract` |
| AC9 | `plugin-template/manifest.yaml` `minimum_cli_version` still equals registry `copilot_cli_version_floor` — the "key contract" §11.1 asserts | `npx vitest run tests/plugin-template/manifest-schema` |
| AC10 | Frontmatter `pace.self_paced_minutes` equals registry `labs.lab11.pace_self_minutes`, and the inline `⏱️` callout states the same number | `npx vitest run tests/lab-structure/lab11-contract` |
| AC11 | The §11.0 currency block is byte-identical to `docs/_partials/currency.md`'s body — no inline drift | `npx vitest run tests/lab-structure/lab11-contract` |
| AC12 | Every file `plugin-template/manifest.yaml` declares under `entrypoints:`, and every non-glob row of §11.1's anatomy table, resolves **relative to `plugin-template/`** | `npx vitest run tests/lab-structure/lab11-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | "Supported keys today: `extraKnownMarketplaces`, `enabledPlugins`, `strictKnownMarketplaces`, `disableBypassPermissionsMode`, `model`." (L146) | `free-check` | `docs/_meta/registry.yaml` `enterprise_managed_settings.supported_keys` lists **13**, and the bypass key is `permissions.disableBypassPermissionsMode`, not the bare form. The registry's own comment says GitHub "will continuously add keys — treat this as a floor". The lab froze the 2026-07-01 GA announcement's five keys and never re-synced. Point at the registry instead of enumerating. |
| C2 | `copilot/managed-settings.json` in the enterprise's source org `.github-private` repo is canonical; `.github/copilot/settings.json` is the legacy path (L136–144) | `free-check` | `docs/_meta/registry.yaml` `enterprise_managed_settings.canonical_path`, `.legacy_path`, `.source_repo_pattern` — all three match exactly. Consistent. Keep, and link the registry. |
| C3 | Managed settings are fetched on every authentication and refreshed hourly, and take precedence over local config (L140–143) | `free-check` (precedence) + `cut` (the timing) | Precedence is in the registry as `precedence_order` (mdm-managed → server-managed → file-based → user-level) — keep it and cite the key. The "every authentication, refreshed hourly" cadence appears nowhere in the registry and has no source in the file; it is incidental to the teaching idea. Cut the cadence. |
| C4 | `manifest.yaml → minimum_cli_version` must equal `registry.yaml → copilot_cli_version_floor`, and CI enforces it (L78–80) | `free-check` → **true, keep verbatim** | `plugin-template/manifest.yaml` says `minimum_cli_version: "1.0.82"`; registry says `copilot_cli_version_floor: "1.0.82"`; `tests/plugin-template/manifest-schema.test.ts:31` is the test `'manifest minimum_cli_version matches registry.yaml floor'`. The lab's single strongest claim and it holds. |
| C5 | §11.7 names four suites: `install-dry-run`, `install-runs`, `manifest-schema`, `org-policy-allowlist` | `free-check` → **true, keep** | `tests/plugin-template/` contains exactly those four `*.test.ts` files (plus `manifest.schema.json`). Declared count matches reality. AC4 fences it against future drift. |
| C6 | The release workflow generates a **CycloneDX SBOM** via `anchore/sbom-action` and attests provenance via `actions/attest-build-provenance` (§11.3) | `free-check` | Read `plugin-template/.github/workflows/release.yml` and confirm both actions and the `sbom.cdx.json` artifact name. If the file names different actions, the lab is wrong, not the workflow. |
| C7 | `COPILOT_PLUGIN_REGISTRIES` pins the install source at the devcontainer/shell layer (L126–131) | `free-check` | `plugin-template/README.md` is cited by the lab for exactly this ("`COPILOT_PLUGIN_REGISTRIES` pinning"). Verify the variable name appears there; if it does not, the lab is inventing an env var and the claim becomes `cut`. |
| C8 | `plugin-template/scripts/policy.mjs` supports segment-wildcard globs, and `isAllowed(policy, "contoso-internal/anything-else")` returns `allowed: true` (§11.5) | `free-check` | `npx vitest run tests/plugin-template/org-policy-allowlist` — a committed suite exists for exactly this behaviour. The §11.5 snippet's expected output is checkable without the network. |

**Research required: none.** C1 and C3 are the only live-product claims, and the registry
settles C1 outright while C3 splits into a registry-backed half (keep) and an unsourced half
(cut).

## 5. Non-goals

- **Do not edit `docs/_partials/currency.md`.** §11.0 includes it; 10 labs share it. AC11
  exists so the editing stage does not "fix" the stale `Shift+Tab`/`<tier-or-id>` wording
  inline, which would be re-synced away. That is a separate repo-wide pass.
- **Do not edit `plugin-template/`.** The template, its manifest, its schema and its four
  suites are the thing the lab teaches *about*, and C4/C5 confirm they are correct. If a §11
  claim disagrees with the template, **the lab is wrong**.
- **Do not merge Lab 11 into Lab 16.** The 11+16 merge hypothesis is foreclosed — Lab 16 was
  refreshed standalone on 2026-10-12 and merging would discard that work. Lab 11 is standalone;
  the forward-reference to Lab 16 for the full managed-settings walkthrough stays.
- Do not expand §11.3 into the full `managed-settings.json` schema. That is Lab 16's job and
  the lab already says so.
- Do not change `pace_presenter_minutes` or `pace_workshop_minutes` — only `pace_self_minutes`.
- Do not add `@include docs/_partials/cleanup.md` content beyond what is already there; the
  lab already carries the generic sweep. D4 only asks for one line about `my-plugin/`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab11.md:146` | The managed-settings key list is a frozen snapshot of the 2026-07-01 GA announcement: five keys where the registry now records 13, and the bare `disableBypassPermissionsMode` where the registry records `permissions.disableBypassPermissionsMode`. The lab presents it as "Supported keys today" — a closed list, stated as current, that is neither. This is exactly the Lab 10 D1 shape: a lab hardcoding what the registry exists to hold. |
| D2 | `labs/lab11.md:171` (§11.4 step 1) | `/plugin install contoso-internal/contoso-copilot-plugins` is presented as a numbered step under "🖥️ **In a clean directory**". `contoso-internal` is fictional. Every learner who follows §11.4 literally gets an install failure, then §11.4 steps 2–3 ("Verify it loaded", "Run the bundled `/example` prompt") cannot be done at all. §11.3's `copilot plugin install ... --ref v0.1.0` at L123 has the same problem but reads as narrative; §11.4 reads as a procedure. |
| D3 | `labs/lab11.md:140–143` | "fetched by Copilot clients on every authentication and refreshed hourly" — an unsourced cadence claim embedded in an otherwise registry-backed paragraph. See C3. |
| D4 | `labs/lab11.md:106` (§11.2) + §11.8 | `cp -a plugin-template my-plugin` leaves an untracked `my-plugin/` directory in the repo root. §11.8's generic cleanup says "Any unexpected files … should be removed" but never names it, and step 6's `git status --short` will show it. One targeted line fixes it. |
| D5 | frontmatter + `⏱️` callout + registry `labs.lab11.pace_self_minutes` | Declared 25 self-paced minutes. Rough derivation: §11.1 anatomy, 9 rows against a real directory (5–7) + §11.2 scaffold and dry run (4–5) + §11.3 read, including the long managed-settings callout (5–6) + §11.4 read, since it cannot be run (2–3) + §11.5 policy read and run the snippet (5–6) + §11.6/§11.7 (3–4) = **≈24–31**. **An estimate, not a measurement, and not a gate** — the declared 25 may well be right, and saying so is worth as much as a correction. Suggest ≈30; the teachability gate adjudicates. |
| D6 | `labs/lab11.md:63–75` (§11.1) | Not a defect today — **a fence against one**. All nine rows resolve under `plugin-template/`, and `manifest.yaml`'s `entrypoints:` names the four bundled files exactly. Note that three backticked paths in this lab are deliberately *not* repo paths and must not be "fixed": `.github/workflows/release.yml` is relative to the plugin directory, and `copilot/managed-settings.json` / `.github/copilot/settings.json` live in an **enterprise's `.github-private` repo**, not this one. A naive repo-wide path sweep flags all three. AC12 is scoped to `plugin-template/` for exactly this reason. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them:

- §11.2 — `cp -a plugin-template my-plugin`, and the `extensions_manage operation scaffold` prompt that writes to `./my-plugin`. Both create untracked state in the working tree.
- §11.3 — `copilot plugin install contoso-internal/... --ref v0.1.0` and `export COPILOT_PLUGIN_REGISTRIES=...`.
- §11.4 — `/plugin install contoso-internal/contoso-copilot-plugins` (**network fetch of a non-existent repository**), and the `extensions_manage` list/inspect prompts that depend on it having succeeded.
- Anything that pushes a `vMAJOR.MINOR.PATCH` tag or triggers `plugin-template/.github/workflows/release.yml`. The lab does not instruct this, but §11.3 describes it and a run gate must not "try it".

**Explicitly in scope to execute** (read-only, already covered by committed suites):
`node plugin-template/scripts/install.mjs` (a declared dry run) and the §11.5 `isAllowed`
snippet.
