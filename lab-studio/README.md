# Copilot Lab Studio

Run **labs 01–05** of the _Everything GitHub Copilot_ workshop entirely in the
browser — a guided SPA with a **live GitHub Copilot session** on the right-hand
"bench", driven through the official [`@github/copilot-sdk`](https://www.npmjs.com/package/@github/copilot-sdk).

![layout](./docs/layout.png)

| Pane                | What it is                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Rail** (left)     | Labs 01–05 with per-step punch-holes that fill green as steps verify                                        |
| **Manual** (center) | The teaching content — prose, concept tables, and action cards                                              |
| **Bench** (right)   | A terminal that emulates the Copilot CLI against a sandboxed workspace, plus a Files tab with a live editor |

Everything **blue is real**: prompts, custom agents, skills (including
auto-activation via the `skill.invoked` event), instruction discovery, and MCP
tool calls round-trip through an actual Copilot session. Everything **amber is
simulated** — the plugin marketplace and anything that would need a GitHub
remote — so the labs work without a fork, a remote, or marketplace access.
Every step ends with a **Verify** check that inspects the real workspace state
server-side.

## Prerequisites

- Node.js 22+
- Copilot CLI authenticated **once** on this machine: `npm i -g @github/copilot && copilot login`
  (the studio reuses that login through the SDK — it never asks for credentials)

## Run it

```bash
cd lab-studio
npm install --include=dev   # --include=dev matters if your npm config sets omit=dev
npm start                   # builds the client, serves everything at http://localhost:5180
```

For development (hot reload):

```bash
npm run dev                 # server on :5180, Vite client on :5190
```

Other commands: `npm test` (server unit tests) · `npm run typecheck`.

## How it works

```
Browser SPA (React + Vite)
   │  REST + Server-Sent Events
   ▼
Fastify server (lab-studio/server)
   ├─ sandbox.ts         copies server/template → .sandbox/workspace per run
   ├─ sim-terminal.ts    shell builtins + simulated `copilot plugin …` commands
   ├─ copilot-bridge.ts  one CopilotClient; sessions created per `copilot` /
   │                     `/new`, with the sandbox as workingDirectory
   └─ verify.ts          per-step checks against workspace + session state
   │
   ▼
@github/copilot-sdk  →  Copilot CLI runtime (JSON-RPC)
```

The learner's workspace is a disposable copy of `server/template/` — a
miniature TypeScript ContosoUniversity with the same `.github/` + `.copilot/`
configuration surfaces the real workshop repository uses. **Reset workspace**
in the rail restores it.

### SDK notes (hard-won, verified by probing)

The Copilot SDK harness is _not_ identical to the interactive CLI:

- `.github/copilot-instructions.md` and `AGENTS.md` **are** discovered from the
  session's `workingDirectory` automatically.
- `.github/agents/` and `.github/skills/` are **not** — an SDK host must pass
  `agentDirectories` / `skillDirectories` in the session config (full
  `enableConfigDiscovery` requires an extension SDK path). The bridge does this
  on every session start.
- `session.rpc.agent.list` skips the project scan unless you pass
  `agentDirectories` to the call itself.
- Discovery events (`session.skills_loaded`, `session.mcp_servers_loaded`)
  arrive lazily — often on the first turn — so `/skills`, `/mcp` and `/agent`
  answer from direct RPC pulls (`rpc.skills.list`, `rpc.mcp.list`).
- MCP servers from the sandbox's `.copilot/mcp-config.json` are passed per
  session; relative script paths are resolved against the sandbox so the
  shipped `lab-docs` stdio server (`template/.copilot/mcp/lab-docs.mjs`) works
  from any cwd.

### Session semantics the labs rely on

Configuration loads **once at session start** — exactly like the real CLI.
The studio keeps that behavior on purpose: labs 02–05 teach the
edit → restart (`/exit` + `copilot`, or `/new`) → verify loop, and the
`/instructions` command flags files created after the running session started.

## Lab map

| Lab                                | Steps                                                                                | Live / simulated                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 01 Exploring Copilot Configuration | config map · marketplace · hierarchy · ask the planner                               | marketplace simulated, planner live                                  |
| 02 Custom Instructions & AGENTS.md | repo rules · path rule · ADR · restart + `/instructions`                             | all live                                                             |
| 03 Creating a Dev Agent            | anatomy · create `contoso-dev` · discover + select · analyze                         | all live                                                             |
| 04 Skills & Prompts                | anatomy · create `contoso-testing` · auto-activation · prompts-vs-skills             | activation live (`skill.invoked`), prompt files explained (IDE-only) |
| 05 MCP Server Configuration        | inspect config · add `lab-docs` stdio server · live MCP tool call · markdown lessons | all live                                                             |

## Safety

Copilot runs with auto-approved tools (the labs' `--allow-all-tools`
equivalent) against the sandbox workspace in `.sandbox/` — the same trust
posture the workshop's own non-interactive examples use. The sandbox directory
is gitignored and disposable.
