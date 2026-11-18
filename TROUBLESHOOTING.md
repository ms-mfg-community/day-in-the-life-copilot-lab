# GitHub Copilot CLI Demo - Troubleshooting Guide

Quick reference for handling common issues during the demo.

---

## 🔍 Diagnostic Toolkit: VS Code Debug Views, CLI `/diagnose`, Session Data & OpenTelemetry

When Copilot does something unexpected, look at what it received and did before you change the prompt. Everything here is read-only and takes a minute or two. The full guide, with its sources and a note on what was observed rather than documented, is [Debugging and observability](docs/debugging-and-observability.md).

**Type the `/` commands inside a running `copilot` session, not at your shell prompt.**

| Symptom | In Copilot CLI | In VS Code |
|---------|----------------|------------|
| Copilot ignores a rule you wrote | `/instructions`, `/env`, then `/context` | **Show Agent Debug Logs** (Discovery events), then **Show Chat Debug View** (System prompt) |
| An agent or skill is not offered | `/env`, `/agent`, `/skills list` | Discovery events in the Logs view |
| An MCP tool is never called | `/mcp list` (look for `failed: <reason>`) | **MCP: List Servers**, then **Show Output** |
| A hook did not fire | `hook.start` and `hook.end` records in `events.jsonl`; `/env` | The Agent Debug Logs |
| A subagent never ran | `/tasks` | **Agent Flow Chart** |
| "Why did it ask me to approve that?" | `/diagnose` | — |
| The session is slow or expensive | `/context`, `/usage` | The Summary view |

### VS Code: Agent Debug Logs and the Chat Debug view

1. **Before** you reproduce the problem, turn capture on: `chat.agentHost.agentDebugLog.enabled` for the Copilot harness, or `github.copilot.chat.agentDebugLog.fileLogging.enabled` for the Local harness. Capture is not retroactive.
2. Open the Chat view's **...** menu and choose **Show Agent Debug Logs** (or run **Developer: Open Agent Debug Logs**). The Logs view lists events in order, the Summary view shows tool calls, tokens, errors and duration, and **Agent Flow Chart** shows which agent delegated to which.
3. **Show Chat Debug View** (or **Developer: Show Chat Debug View**) shows the System prompt, User prompt, Context, Response and Tool responses for one request.
4. Ask Copilot about what was captured: select the sparkle icon in the panel, type `#debugEventsSnapshot` in chat, or run `/troubleshoot <question>`, for example `/troubleshoot Which customizations were loaded, and did any fail?`.

The **GitHub Copilot Chat Hooks** Output channel belongs to VS Code's legacy Local hook setup. **GitHub Copilot Chat** is the general Output channel (`Ctrl+Shift+U` on Windows, `Cmd+Shift+U` on macOS, `Ctrl+K Ctrl+H` on Linux).

### Copilot CLI: `/diagnose`, `/collect-debug-logs` and session data

- `/diagnose [prompt]` analyzes the current session's logs, including why a permission request needed approval.
- `/collect-debug-logs` collects debug logs to a local `.tgz` file, shares them with GitHub after you consent, or creates a secret GitHub gist. Choose the local file; `*.tgz` is git-ignored in this repository.
- `/context` shows where the context window goes: System Prompt, Custom Instructions, System Tools, MCP Tools, Messages, Free Space and Buffer. Experimental mode adds usage per skill, subagent, MCP server, tool and plugin.
- Session data lives in `~/.copilot/session-state/<session-id>/`. `events.jsonl` is the session's chronological event log, `workspace.yaml` holds session metadata (`id`, `cwd`, `repository`, `branch`, `created_at`, `updated_at`), and `plan.md` and `session.db` are created when the session uses plans or the `sql` tool. `/session id` shows the current ID.
- Process logs: `copilot --log-level debug --log-dir ./logs`. This repository's `.gitignore` ignores `*.log`, so those files are not committed.

### OpenTelemetry

Setting any one of these switches OpenTelemetry on:

| Set | Effect |
|-----|--------|
| `COPILOT_OTEL_ENABLED=true` | Switches it on. The exporter defaults to `otlp-http` |
| `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` | Switches it on and sends to an OTLP/HTTP collector at that address |
| `COPILOT_OTEL_FILE_EXPORTER_PATH=./copilot-otel.jsonl` | Switches it on and writes JSON-lines to that file. No collector needed |

**WSL/Bash:**
```bash
COPILOT_OTEL_FILE_EXPORTER_PATH=/tmp/copilot-otel.jsonl copilot
```

**PowerShell:**
```powershell
$env:COPILOT_OTEL_FILE_EXPORTER_PATH = Join-Path ([IO.Path]::GetTempPath()) 'copilot-otel.jsonl'
copilot
# afterwards: Remove-Item Env:COPILOT_OTEL_FILE_EXPORTER_PATH
```

By default only metadata is recorded. `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY` also records prompts, responses, system instructions, tool arguments and results, and sandbox decisions. That is sensitive: use it only in a trusted environment, write the file outside the repository (`copilot-otel.jsonl` is not git-ignored here) and delete it afterwards. Each run appends to the file.

**Before you share any of this:** debug logs, exported files and session folders can contain prompts, source code, file paths and secrets. Read them first.

**Time:** 2 minutes

---

## 🟢 Per-Lab & Per-Track Issues (2026 modernization)

These cover the labs added in Phases 1, 5, 6, and 7 plus the Node parity track.

### Issue: Node track — `pnpm install` fails or wrong Node version

**Symptoms:**
- `ERR_PNPM_UNSUPPORTED_ENGINE`
- `better-sqlite3` build errors (node-gyp / Python missing)
- Drizzle migrations don't apply

**Quick Fix:**
```bash
# Confirm Node 18+ and pnpm
node --version          # Should be >= 18
corepack enable && corepack prepare pnpm@latest --activate

# Reinstall from a clean lockfile
cd node
rm -rf node_modules
pnpm install --frozen-lockfile

# Re-create the in-memory db (no real migrations — drizzle drives schema directly)
pnpm test
```

**If Fastify port 3000 is in use:**
```bash
PORT=3001 pnpm -C node dev
```

**Time:** 3 minutes

---

### Issue: Lab 11 — plugin registry / `COPILOT_PLUGIN_REGISTRIES` not picked up

**Symptoms:**
- `/plugin install owner/repo` returns "plugin not found"
- The private registry repo is not enumerated

**Quick Fix:**
```bash
# Confirm the env var is set in the shell where you launch copilot
echo "$COPILOT_PLUGIN_REGISTRIES"     # bash
echo $env:COPILOT_PLUGIN_REGISTRIES   # pwsh

# Format: comma-separated owner/repo refs (no spaces)
export COPILOT_PLUGIN_REGISTRIES="my-org/copilot-registry,my-org/internal-plugins"

# Re-launch copilot in the same shell
copilot
```

**Allowlist policy:** if your org enforces an allowlist, the plugin's `name`
field in `manifest.yaml` must be listed in `plugin-template/org-policy.example.yaml`
(or the equivalent file your org has adopted from that template) for the
install to succeed. See Lab 11 §11.4.

**Time:** 3 minutes

---

### Issue: Lab 12 — Fabric MCP authentication fails in Codespaces

**Symptoms:**
- `fabric-mcp` server starts but `/list lakehouses` returns 401/403
- No browser available to complete the device-code login

**Fallback (offline simulator):** Lab 12 ships an offline path so the lab is
completable without Fabric credentials. The pattern is **skip the Fabric MCP
entirely** and read a local Parquet fixture instead — no env-var toggle on the
MCP server itself.

```bash
# 1) Generate the fixture (one-time, requires python + pandas + pyarrow)
python labs/appendices/fabric/build-fixture.py

# 2) In your copilot session, point at the fixture instead of the live MCP
#    The lab's offline path uses pandas/pyarrow directly inside notebook cells.
#    See Lab 12 §12.2 for the full snippet.
```

The lakehouse enumeration, notebook editing, and inline-chat steps work
identically against the simulator. See Lab 12 §12.2 (offline simulator setup)
and §12.5 (notebook hygiene) for the full fallback flow.

**If you do have Fabric access:** launch `@microsoft/fabric-mcp` with
`server start --mode all`; otherwise only `docs_*` tools are exposed and live
`onelake_*` tools are unavailable. The server authenticates through
`DefaultAzureCredential`, so it uses your Azure CLI session and does **not**
read `FABRIC_AUTH_TOKEN`.

- **401 Unauthorized:** run `az login` (or
  `az login --tenant <fabric-tenant-guid>`) and confirm with
  `az account show`.
- **403 Forbidden:** ask for at least the **Contributor** role on the Fabric
  workspace.
- **Wrong workspaces listed / 404 on your workspace (multi-tenant identity):**
  `DefaultAzureCredential`'s browser fallback signed you in to your **home
  tenant**, not your Fabric tenant. Pin auth to your `az login` session with
  `export AZURE_TOKEN_CREDENTIALS=AzureCliCredential` **and**
  `export AZURE_TENANT_ID=<fabric-tenant-guid>` (both — the tenant var alone
  isn't enough), then restart the server.
- **`400 "Namespace is required"` from `onelake_list_tables`/`onelake_get_table`:**
  these tools need a `namespace`; for a standard lakehouse it's `dbo`
  (discover via `onelake_list_table_namespaces`).
- **No browser / headless / Codespaces:** use
  `az login --use-device-code`.
- `FABRIC_AUTH_TOKEN` is only useful as an optional curl smoke-test token, for
  example from `az account get-access-token --resource https://api.fabric.microsoft.com`.

**Time:** 5 minutes

---

### Issue: Lab 14 — tmux pane targeting / orchestrator scripts misbehave

**Symptoms:**
- `scripts/orchestrator/handoff.sh` writes to the wrong pane
- `clear-context.sh` clears the orchestrator pane instead of the worker
- `tmux-start.sh` errors "session already exists"

**Quick Fix:**
```bash
# 1) Check the current session name and pane indexes
tmux ls
tmux list-panes -t <session> -F "#{pane_index}: #{pane_current_command}"

# 2) Re-bootstrap idempotently — tmux-start.sh is safe to re-run
bash scripts/orchestrator/tmux-start.sh

# 3) Pass an explicit pane to handoff/clear if auto-detection picks the wrong one
bash scripts/orchestrator/handoff.sh --pane orchestrator:1.1
bash scripts/orchestrator/clear-context.sh --pane orchestrator:1.1
```

**Pre-reqs reminder for `clear-context.sh`:** the worker pane must currently be
running an interactive `copilot` session — the script sends `/clear` followed
by `Enter`. If the pane is at a shell prompt, the script noops with a warning.

**Schema mismatch on `handoff.sh`:** the script writes a `session.md` at the
project root with the YAML front-matter expected by Lab 14. If you customized
the schema, copy `scripts/orchestrator/handoff.sh` into `scripts/orchestrator/handoff-custom.sh`
rather than editing the shipped script — Lab 14 tests assert the original shape.

**Time:** 4 minutes

---

### Issue: Phase 7 — `/cost-check` reports "session store empty"

**Symptoms:**
- The `/cost-check` prompt runs but says it cannot find usage events
- `events.usage_input_tokens` / `usage_output_tokens` SQL example returns 0 rows

**Cause:** `/cost-check` queries the per-session events table populated by the
Copilot CLI runtime. A brand-new session has no events until the first
assistant turn completes.

**Fix:**
```bash
# Run any small task first so the session store has at least one event
copilot -p "Hello, capabilities check"

# Then re-invoke the prompt
/cost-check
```

If the SQL example in `.github/skills/cost-check/SKILL.md` errors with
"no such column", the runtime schema has shifted — the prompt body is a
template, not a guarantee. See `docs/token-and-model-guide.md` for the
schema-agnostic fallback (the Cost Budget sidebars in labs 07/10/13/14
provide order-of-magnitude numbers).

**Time:** 1 minute

---

## 🟡 Known Limitations (Carry-forwards — surfaced, not silently fixed)

These are non-blocking issues tracked across phases. They are documented here
so learners hit them with eyes open; the weekly content audit (Phase 4) will
sweep them on its next pass.

| Carry-forward | Where | Workaround |
|---------------|-------|-----------|
| `safe-outputs.add-pr-comment` typo | `.github/workflows/code-review.md` (Phase 4) | The gh-aw compiler accepts both forms; rename on next workflow edit. |
| `CODEOWNERS` placeholder team | `.github/CODEOWNERS` references `@ms-mfg-community/maintainers` | Replace with a real team before enabling required reviews. |
| `nbdime` install not version-pinned | Lab 12 §12.5.1 | Pin to `nbdime==4.x` in your devcontainer if reproducibility matters. |
| Top-level `prompts/` blocked | Repo convention is `.github/prompts/` (enforced by `pre-tool-use-doc-blocker`) | Keep prompts under `.github/prompts/`; the blocker is intentional. |
| `MODEL_IDS` test list hand-maintained | `tests/content-currency/cli-commands-current.test.ts` | Update when GitHub publishes a new model tier. |
| Cost Budget numbers are order-of-magnitude | Labs 07, 10, 13, 14 sidebars | Treat as guidance, not SLA. Re-run `/cost-check` for actuals. |

---

## 🔴 Critical Issues (Demo Blockers)

### Issue: Copilot CLI Not Authenticated

**Symptoms:**
```
Error: Not authenticated
```

**Quick Fix:**
```bash
gh auth login
# Follow prompts
# Select: GitHub.com, HTTPS, Authenticate with browser

# Verify
gh auth status
```

**Time:** 2 minutes

---

### Issue: MCP Servers Not Loading

**Symptoms:**
- "MCP tool not available"
- No Context7/Memory/Sequential Thinking responses

**Quick Fix:**
```bash
# Check config exists
cat ~/.copilot/mcp-config.json

# If missing, copy from repo
cp .copilot/mcp-config.json ~/.copilot/

# Restart Copilot
exit
copilot
```

**Fallback:** Continue demo without MCP, explain what it would have done

**Time:** 3 minutes

---

### Issue: No Internet Connection

**Symptoms:**
- "Network error"
- Copilot hangs on requests

**Fallback Options:**
1. **Use pre-recorded video** (play 10-min segment)
2. **Walk through static code** in `/examples` directory
3. **Switch to slide-based explanation** of workflows

**Time:** 0 minutes (immediate fallback)

---

## 🟡 Non-Critical Issues (Recoverable)

### Issue: Copilot Output is Truncated

**Symptoms:**
Code stops mid-function or mid-file

**Fix:**
```bash
copilot -p "Continue the previous response from where it was cut off. Start with: [last few words of truncated output]"
```

**Alternative:**
```bash
copilot -p "Regenerate just the [component name] section from the previous response."
```

**Time:** 1 minute

---

### Issue: Copilot Ignores Constraints

**Symptoms:**
- Uses React when you said "vanilla JavaScript"
- Creates 10 files when you wanted 3
- Suggests complex architecture for simple app

**Fix:**
```bash
copilot -p "STOP. Disregard previous response.

CRITICAL CONSTRAINTS (follow exactly):
- Vanilla JavaScript ONLY (no React, Vue, Angular)
- Exactly 3 files: index.html, styles.css, app.js
- Maximum 400 lines per file
- No external dependencies

Now retry: [original request]"
```

**Teaching Moment:**
"Notice how I had to be **very explicit**. AI is powerful but literal. Ambiguity kills."

**Time:** 2 minutes

---

### Issue: Generated Code Doesn't Work

**Symptoms:**
- JavaScript errors in console
- Features don't work as expected
- UI looks broken

**Debug Steps:**

1. **Check browser console** (F12)
   ```javascript
   // Look for errors
   // Common issues: undefined variables, syntax errors
   ```

2. **Ask Copilot to debug:**
   ```bash
   copilot -p "The todo app has this error: [paste error message].

   Current code:
   - app.js lines 45-67 (where error occurs)

   Debug and provide fixed code."
   ```

3. **Manual fix** if time-constrained:
   - Show the error
   - Explain what's wrong
   - Say "In a real session, we'd fix this, but let's move on..."

**Teaching Moment:**
"AI writes **first drafts**. Always test. Always review. Never trust blindly."

**Time:** 3-5 minutes

---

### Issue: Skills Not Loading

**Symptoms:**
Copilot doesn't reference skills when expected

**Diagnosis:**
```bash
# Check skills directory exists
ls -la .github/skills/

# Check SKILL.md format
cat .github/skills/coding-standards/SKILL.md | head -20
# Should have YAML frontmatter with name and description
```

**Fix:**
```bash
# Explicitly reference the skill in prompt
copilot -p "Follow the patterns in .github/skills/coding-standards/SKILL.md when implementing the component."
```

**Explanation:**
"Skills **auto-activate** based on keywords, but aren't guaranteed. When critical, reference them explicitly."

**Time:** 2 minutes

---

## 🟢 Minor Issues (Style Points)

### Issue: Code Style Inconsistent

**Symptoms:**
- Mixing `function` and arrow functions
- Inconsistent quotes (single vs double)
- Variable naming not consistent

**Fix:**
```bash
copilot -p "Refactor app.js to use consistent style:
- Arrow functions for all function expressions
- Single quotes for strings
- camelCase for all variables
- 2-space indentation

Preserve all functionality."
```

**Alternative:** Skip and address in Q&A

**Teaching Moment:**
"Style consistency can be enforced by referencing a coding-standards skill."

**Time:** 2 minutes (or skip)

---

### Issue: Missing Comments

**Symptoms:**
Code is uncommented or sparsely commented

**Fix:**
```bash
copilot -p "Add comprehensive comments to app.js:
- JSDoc for all functions
- Inline comments for complex logic
- Section headers for major blocks

Preserve all code, just add comments."
```

**Alternative:** Explain that production code would have comments, skip for demo

**Time:** 2 minutes (or skip)

---

## ⚙️ Environment Issues

### Issue: Terminal Font Too Small

**Quick Fix:**
- **macOS Terminal:** Cmd+Plus
- **iTerm2:** Cmd+Plus
- **Windows Terminal:** Ctrl+Plus
- **Linux Terminal:** Ctrl+Shift+Plus

**Time:** 10 seconds

---

### Issue: Screen Sharing Lag

**Quick Fix:**
1. Close unnecessary applications
2. Disable webcam (audio only)
3. Lower screen resolution
4. Switch to "optimize for motion" if available

**Fallback:** Use local recording, share after

**Time:** 1 minute

---

### Issue: Git Status Shows Dirty Workspace

**Symptoms:**
```bash
git status
# Shows modified files from previous work
```

**Quick Fix:**
```bash
# Stash changes
git stash

# Or create new branch
git checkout -b demo-session

# Or create worktree
git worktree add ../demo-workspace main
cd ../demo-workspace
```

**Time:** 1 minute

---

## 📞 Emergency Contacts & Resources

### If Completely Stuck

**Option 1: Skip to next section**
- "Let's move on and circle back if time permits"

**Option 2: Audience participation**
- "Has anyone seen this before? How did you solve it?"

**Option 3: Take a break**
- "Let's take a 5-minute break while I troubleshoot"

### Help Resources During Demo

- **Copilot CLI Docs:** https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli
- **MCP Spec:** https://spec.modelcontextprotocol.io/
- **This Repo's README:** ../README.md
- **Presenter Notes:** ./DEMO_PRESENTER_NOTES.md

### Post-Demo Help

- **GitHub Support:** https://support.github.com/
- **Community Forum:** https://github.com/orgs/community/discussions
- **Copilot Feedback:** https://github.com/github/feedback/discussions/categories/copilot-feedback

---

## 🎯 Prevention Checklist

Run this **30 minutes before demo** to prevent issues:

```bash
# 1. Verify authentication
gh auth status

# 2. Test Copilot
copilot -p "Hello, test message"

# 3. Check MCP
cat ~/.copilot/mcp-config.json

# 4. Clean workspace
git status  # Should be clean

# 5. Test browser
open index.html  # Should open default browser

# 6. Verify skills
ls .github/skills/ | wc -l  # Should show ~28

# 7. Check internet
ping github.com -c 3

# 8. Increase font size
# (Manually adjust terminal)

# 9. Close unnecessary apps
# (Manually close)

# 10. Test screen share
# (Share screen in Zoom/Teams, verify quality)
```

**If all checks pass: You're ready! 🚀**

---

## 💡 Pro Tips

1. **Keep presenter notes open in separate monitor/window**
   - Quick reference without switching contexts

2. **Have pre-written commands in a text file**
   - Copy-paste instead of typing live
   - Avoids typos during demo

3. **Use a countdown timer**
   - Stay on track with time blocks
   - 5-minute warning for each section

4. **Record the demo**
   - Even if you don't share it, useful for review
   - Can extract clips for future reference

5. **Practice the demo at least once**
   - Identifies issues beforehand
   - Builds muscle memory for commands

6. **Have a "debug buddy" in the room**
   - Someone who can troubleshoot while you present
   - Can google errors while you keep talking

---

**Stay calm. You've prepared. Handle issues gracefully and use them as teaching moments!**
