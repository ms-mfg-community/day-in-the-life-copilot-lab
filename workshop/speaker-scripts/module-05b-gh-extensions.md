---
module: M5b
title: "gh extensions — speaker script"
slide_source: workshop/slides/55-module-5b-gh-extensions.md
minutes: 20
phase: 3c
---

# M5b — Speaker script

Target audience: fluent CLI users who already install `gh` extensions
(`gh copilot`, `gh models`, `gh-aw`). The room knows what `gh extension`
is. This module is about **authoring your own** `gh` command that calls
an LLM, ships with a zero-credentials contract, and wires into a git
hook — all inside the auth context `gh` already has. 20 minutes.

## 1. Open with the advanced problem

Do **not** explain what `gh` is or what extensions are conceptually.
The room already installs them. Start with the build problem.

**Verbatim hook (~60 seconds):**

> "Everyone here has installed a `gh` extension — `gh copilot`,
> `gh models`, maybe `gh-aw`. The advanced question is: **how do
> you ship your own `gh` command that calls an LLM, works without
> credentials in a workshop, and wires cleanly into a git hook?**
> That is what we are building right now. `gh clab` is an
> interpreted Node extension — no compile step, no release pipeline,
> one executable script with a `#!/usr/bin/env node` shebang. It
> shells out to `gh models run` for completions, so auth inherits
> from `gh auth` — zero API-key surface. And when `gh models` is
> unavailable it falls back through an OpenAI endpoint, then to a
> deterministic mock, so the demo never breaks on stage. Private
> tooling, composed on top of `gh`'s auth and host context, in a
> language you already know, distributable via tagged GitHub
> releases. That is the mechanism."

Anchor lab: `labs/lab-gh-extensions.md`.
Reference solution: `solutions/lab-gh-extensions/gh-clab/`.

## 2. Demo script

**Copilot CLI or terminal. Every file exists in this repo — no live
GitHub Actions run required.**

### Demo A — Install the `gh-clab` extension (~3 min)

```bash
cd solutions/lab-gh-extensions/gh-clab
chmod +x gh-clab
gh extension install .
gh extension list | grep gh-clab
```

Walk the output: `gh extension list` shows the extension with a
symlink pointing back to the working directory. Explain the dev-loop
story — because this is an interpreted extension, every edit to
`gh-clab` takes effect immediately on the next invocation; there is
no rebuild. The `gh-` prefix on the directory name is stripped to
form the command: `gh-clab/` → `gh clab`.

Open `solutions/lab-gh-extensions/gh-clab/gh-clab` and point at the
shebang (`#!/usr/bin/env node`), the lack of runtime dependencies
outside Node ≥ 20, and the `package.json` that declares `"engines":
{"node": ">=20"}`.

### Demo B — Three-mode fallback walkthrough (~5 min)

Same command, three backends. This is the heart of the module.

**Mode 1 — `gh models` (primary, zero-config):**

```bash
gh extension install github/gh-models   # if not already present
gh clab
```

Narrate: `pickMode()` detects `gh` on PATH and `github/gh-models` in the
extension list. It shells out to `gh models run openai/gpt-4o-mini
"<prompt>"`. Auth inherits from `gh auth`. No API key. No env var.

**Mode 2 — OpenAI / Azure OpenAI (BYO key):**

```bash
export OPENAI_API_KEY="sk-..."
gh clab
```

Or for Azure:

```bash
export AZURE_OPENAI_API_KEY="..."
export AZURE_OPENAI_ENDPOINT="https://my-resource.openai.azure.com"
export AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
gh clab
```

Narrate: when `gh models` is not installed, `pickMode()` checks for
`OPENAI_API_KEY` or `AZURE_OPENAI_API_KEY`. The fetch call is ≤ 15
lines in the script — show them.

**Mode 3 — Mock (deterministic, offline):**

```bash
GH_CLAB_MOCK=1 gh clab --allow-empty
# or simply:
gh clab --mock --allow-empty
```

Narrate: canned output, 12-bullet structured changelog, exit 0. This
is the "no credentials" path — every section of the lab runs end-to-end
with zero secrets. Stress: **the fallback ladder is what makes the
extension demo-proof.** If network drops mid-presentation, the mock
catches the failure and the audience never sees an error.

### Demo C — Wire into a git pre-commit hook (~4 min)

```bash
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
MODE_FLAG="${GH_CLAB_HOOK_MODE:---mock}"
gh clab "$MODE_FLAG" --allow-empty > .git/CLAB_SUMMARY.md || true
echo "[pre-commit] gh clab summary written to .git/CLAB_SUMMARY.md"
HOOK
chmod +x .git/hooks/pre-commit
```

Walk line by line: `MODE_FLAG` defaults to `--mock` so the hook never
blocks on network. `|| true` makes it non-blocking — a commit never
fails because the LLM did. The summary lands in `.git/CLAB_SUMMARY.md`
so the presenter can reference it in the commit message template.

Explain why this works *because* `gh` already has the user's auth — the
hook does not need to provision a token, manage a secret, or talk to an
OAuth flow. That is the composability payoff of building on `gh`.

> **Accuracy note:** this is a **git** hook (`.git/hooks/pre-commit`),
> **not** a Copilot CLI hook. Copilot CLI hooks (`preToolUse`,
> `postToolUse`, etc.) are a different surface covered in M5c.

### Demo D — Distribution (~3 min)

Two paths:

**Local install (what you just did):**

```bash
gh extension install .
```

Perfect for internal tools, prototypes, and this workshop. No release
needed. The extension stays on your machine.

**Published (tagged release):**

```bash
gh extension install owner/repo
```

Once the repo is pushed to GitHub with a tagged release, anyone can
install it. For interpreted extensions, no release binaries are
needed — the shebang'd script at repo root is the release.

Mention `gh extension upgrade` to pull the latest tag, and forward-point
to the `gh-extension-precompile` workflow for teams that want per-OS
binaries from Go or other compiled languages.

## 3. Timing cues

<!-- total: 20 min -->

- 0:00 — Open with the advanced problem. Name the mechanism. (2 min)
- 2:00 — Slide: "The three official extension types." Read the table. (1 min)
- 3:00 — **Demo A** — install `gh-clab`, show `gh extension list`. (3 min)
- 6:00 — Slide: "Three modes, one script." Walk the priority table. (1 min)
- 7:00 — **Demo B** — three-mode fallback walkthrough. (5 min)
- 12:00 — Slide: "Hook-like pattern." Explain git hook vs Copilot CLI hook. (1 min)
- 13:00 — **Demo C** — write the `pre-commit` hook, run a commit. (4 min)
- 17:00 — Slide: "Distribution — local vs tagged release." (1 min)
- 18:00 — **Demo D** — explain `gh extension install owner/repo` + upgrade. (1 min)
- 19:00 — Slide: "Accuracy sidebar — three things that sound alike, aren't." (1 min, closes at 20:00)

## 4. Expected pitfalls

- **Auth scope missing.** `gh models run` requires `gh auth` to have the `read:models` scope. If the attendee authed long ago, the scope may be missing. Fix: `gh auth refresh --scopes read:models`. Show this before Demo B.
- **`gh models` not enabled in tenant.** Some enterprise tenants disable GitHub Models at the org level. The extension does not crash — it silently falls through to OpenAI, then mock. But the attendee who *expects* the primary path will be confused. Tell them to check `gh models list` first; an empty or error response means the fallback is working as designed.
- **Mock mode forgotten when network is up.** An attendee runs `GH_CLAB_MOCK=1 gh clab`, gets canned output, then wonders why the "real" summary looks the same every time. Remind them to `unset GH_CLAB_MOCK` or drop the `--mock` flag when switching to live mode.
- **PATH / shebang issues on Windows.** Windows does not honor `#!/usr/bin/env node` natively. Git Bash and WSL handle it; PowerShell does not. If the room has Windows-only users, tell them to run from Git Bash or prefix with `node gh-clab`. The lab README documents Node ≥ 20 as the floor.
- **Releases not tagged so `gh extension install owner/repo` 404s.** `gh extension install` looks for a tagged release or a default-branch script. If neither exists the command returns a 404. Walk through: push the repo, create a tag (`git tag v0.1.0 && git push --tags`), then retry.
- **Confusing `gh extension` hooks with Copilot CLI hooks.** The `pre-commit` hook in Demo C is a **git** hook — it runs in `.git/hooks/`. Copilot CLI hooks (`preToolUse`, `postToolUse`, `sessionStart`) are a completely different surface. Name both explicitly on stage.

## 5. Q&A prompts

Seed these if the room is quiet:

- "What is the security model for `gh extension install`? Does the extension inherit all of `gh auth`'s scopes, or is there a sandbox?" *(Answer: full inheritance — the extension shells out to `gh` and gets whatever scopes the user authed with. There is no per-extension sandbox today. That is why org-controlled allowlists and CODEOWNERS matter.)*
- "Why Node instead of Go or Bash for this extension?" *(Answer: Node gives you `fetch()`, `child_process`, and JSON natively — ideal for an LLM-calling script. Go extensions need a compile step and per-OS binaries. Bash works for simple wrappers but gets painful for structured JSON handling. Pick the language that fits the problem.)*
- "How is a `gh extension` different from a Copilot CLI extension?" *(Answer: `gh extension` is an external process invoked by `gh`. Copilot CLI extensions are in-process JS/TS modules that expose tools to the Copilot agent. Different runtime, different authoring model, different distribution. Module M5c covers the Copilot CLI side.)*
- "Can I monetize a `gh extension`?" *(Answer: there is no built-in monetization surface. Extensions are open-source repos or private repos. You can gate access via repo visibility, but there is no licensing or payment integration in `gh extension install`.)*
- "What about `gh extension exec` — when would I use that instead of `gh <name>`?" *(Answer: `gh extension exec <name>` lets you invoke an extension without the `gh-` prefix and with explicit control over the execution context. Useful in CI pipelines where you need to disambiguate or pass flags that overlap with `gh`'s own flags.)*

## 6. Advanced-tip callouts

Drop these between slides as time permits. Each is ~30 seconds.

- **`gh extension exec` for CI pipelines.** When you need to call an extension from a GitHub Actions step, `gh extension exec clab -- --mock` is more explicit than `gh clab --mock` and avoids flag collisions with the `gh` top-level.
- **The `gh-extension-precompile` workflow.** The `cli/gh-extension-precompile` GitHub Action builds per-OS binaries and attaches them to a release. If you outgrow the interpreted model, this is the bridge to precompiled distribution without writing your own release workflow.
- **Signing with attestations.** `actions/attest-build-provenance` works for extension releases just like it does for plugin releases (M5). Add it to your release workflow and consumers can verify provenance with `gh attestation verify`.
- **Dotfile patterns for extension config.** Extensions can read `~/.config/gh-clab/config.yaml` (or similar) for user preferences. Keep defaults sane — the extension must work with zero config — but power users appreciate a config seam for model choice, output format, or prompt customization.
- **`gh api` inside extensions is free auth.** Any REST or GraphQL call you make via `gh api` inherits auth automatically. That means your extension can query repos, issues, PRs, and packages without managing a token — the same composability that makes the `gh clab` hook work.

## Takeaway

`gh extension` is the mechanism for shipping private CLI tooling on top of GitHub's auth and host context. Interpreted Node is the zero-compile, edit-and-run shape that fits a workshop. The three-mode fallback — `gh models`, OpenAI/Azure, mock — is the contract that makes the extension demo-proof and credential-free. Wire it into a git hook and you get LLM-powered commit summaries without a single API key in your dotfiles. That is what you want presenters to leave this slot knowing: **compose on `gh`, fall back gracefully, distribute via tags.**
