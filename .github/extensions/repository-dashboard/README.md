# Repository dashboard canvas

A project-scoped Copilot CLI extension that renders repository issues, pull
requests and GitHub Actions runs in one canvas, and lets you hand an issue to a
new Copilot session without leaving it.

## Opening it

The extension registers a canvas named `repository-dashboard`. Ask Copilot to
open the repository dashboard, or invoke the canvas directly. It serves a local
page from an ephemeral loopback port for as long as the canvas is open.

It reads GitHub through the `gh` CLI already authenticated in your session; it
never asks for or stores a token of its own. Verified against `gh` 2.83.1 and
Node 24.

## What it shows

- **Overview** — issues grouped into ready, in progress and blocked lanes.
- **Issues / Pull requests / Actions** — filterable lists with labels,
  assignees, linked pull requests, check rollups and run outcomes.
- **Failure breakout** — expand a failed run for its failed jobs, failed steps
  and the tail of its failed logs.

## Starting work on an issue

`Assign work` on an issue card opens a form that picks an agent, a local or
cloud session, and an optional GitHub assignee.

Issue text is written by third parties, so the extension treats it as data
rather than instruction:

- The title and body are sanitised, length-capped, and wrapped in an explicit
  untrusted-data fence, preceded by a guard telling the agent not to follow
  anything inside it. Forged fence markers in the content are stripped.
- Expanding the form fetches the **exact text that will be sent** and shows it
  verbatim. The submit button stays disabled until it has been shown — the
  approval is meant to be informed, so do read it.
- Submitting echoes a digest of the text you were shown. The server rebuilds the
  text and compares, so an issue edited between preview and click is rejected
  with `409` rather than quietly sent.
- The new session is kicked off in `interactive` mode, not `autopilot`.

The same fencing applies to the failed-job and log text sent by
`Recommend fix`, which anyone able to trigger a workflow run can influence.

## Limits you will actually notice

These are deliberate. A bounded, honest answer beats an unbounded one that
degrades to an empty list.

| Limit | Value | Effect |
|---|---|---|
| GraphQL pages per section | 20 (100 nodes each) | Larger repositories show a "lists are incomplete" notice |
| Pagination deadline | 45s overall, 20s per page | Slow responses truncate rather than fail the section |
| REST pages for assignees | 10 × 100 | Same notice |
| Actions runs | 30 most recent | Same notice |
| Failed log output | final 60,000 characters | Noted in the run details |
| Issue body sent to Copilot | first 4,000 characters | Noted inside the fenced block |

A section that fails loads as empty with the reason shown in a banner; the rest
of the dashboard still renders.

## Request security

The local server binds to `127.0.0.1` on an ephemeral port and requires a
192-bit CSPRNG token on **every** route including `/`. The token is accepted
from the query string only for the initial `GET /`, and from the
`X-Canvas-Token` header everywhere else, so it cannot leak through a referrer.
Requests must also carry the expected `Host`, and a mismatched `Origin` is
rejected.

Routes are rate limited per canvas instance — 60 reads, 20 writes and 6 Copilot
operations per minute — and the two routes that spawn a Copilot session are
additionally serialised per issue or run, so a double click returns `409`
instead of starting a second session.

Every `gh` invocation uses `execFile` with an argument array. There is no shell
anywhere in this extension, and no user-supplied string is ever concatenated
into a command.

## Checking it

```shell
node .github/extensions/repository-dashboard/self-check.mjs
```

The self-check asserts behaviour, not source text: it instantiates the browser
script against a DOM stub and pushes hostile payloads through the real
renderer, exercises the prompt fencing, the schema validation, the pagination
bounds, the rate limiter and the argument guards. It exits non-zero on failure
and prints nothing on success.

If you change a security control here, mutate it deliberately and confirm the
self-check fails — that is the bar this file is held to.

## Files

| File | Responsibility |
|---|---|
| `extension.mjs` | Canvas registration, HTTP route table, server lifecycle |
| `github-data.mjs` | All `gh` access, pagination, normalisation |
| `prompt-builder.mjs` | Untrusted-data fencing, prompt assembly, approval digests |
| `request-security.mjs` | Token, Host and Origin checks |
| `request-validation.mjs` | Shared JSON schemas for canvas actions and HTTP bodies |
| `rate-limit.mjs` | Token buckets and the in-flight guard |
| `dashboard-html.mjs` / `dashboard-script.mjs` / `dashboard-styles.mjs` | The rendered page |
| `self-check.mjs` | Behavioural checks for all of the above |
