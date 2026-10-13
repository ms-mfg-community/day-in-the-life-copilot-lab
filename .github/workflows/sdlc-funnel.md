---
on:
  push:
    # Spec Kit feature branches are named NNN-short-name; stage events land there first.
    branches: ["main", "[0-9][0-9][0-9]-*"]
    paths:
      - "stage-events/**"
  workflow_dispatch:
    inputs:
      events:
        description: "Stage-event file or directory to route (the workshop uses the Lab 24 fixture)"
        required: false
        default: "labs/fixtures/lab24/stage-events"
permissions:
  contents: read
  issues: read
  pull-requests: read
tools:
  github:
    toolsets: [issues, pull_requests]
  bash: ["cat"]
strict: false
pre-agent-steps:
  - name: Compute the route (deterministic)
    env:
      EVENTS: ${{ github.event.inputs.events || 'stage-events' }}
    run: node labs/fixtures/lab24/scripts/route.mjs --events "$EVENTS" --out route.json
safe-outputs:
  # Workshop path: every write is previewed, nothing is applied.
  staged: true
  steps:
    - name: Check out the router
      uses: actions/checkout@v7.0.1
      with:
        persist-credentials: false
    - name: Reject agent output that disagrees with the route
      env:
        EVENTS: ${{ github.event.inputs.events || 'stage-events' }}
        GH_AW_AGENT_OUTPUT: ${{ steps.setup-agent-output-env.outputs.GH_AW_AGENT_OUTPUT }}
      run: node labs/fixtures/lab24/scripts/route.mjs --events "$EVENTS" --check "$GH_AW_AGENT_OUTPUT"
  add-comment:
    max: 1
    target: "*"
  assign-to-user:
    allowed: [avery-pm, blake-lead, casey-qa, dana-dev]
    max: 1
    target: "*"
  add-reviewer:
    allowed-reviewers: [blake-lead, casey-qa, dana-dev]
    allowed-team-reviewers: [copilot-platform]
    max: 3
    target: "*"
  update-project:
    project: "https://github.com/orgs/contoso-internal/projects/24"
    max: 1
  noop:
    report-as-issue: false
# AI-credits fallback for the `auto` model alias (#63). The AWF api-proxy prices
# per model and rejects with HTTP 400 any model missing from its curated table;
# `auto` resolves to the literal `copilot/auto`, which has no row. Rates are
# $/1M tokens, set to the maximum across the models `auto` can reach
# (`large` -> sonnet | gpt-5* | gemini-pro) so maxAiCredits binds early rather
# than late. Requires AWF >= v0.27.43; this lock pins v0.27.44.
models:
  default-ai-credits-pricing:
    input: 5.00
    output: 30.00
description: "Lab 24 notification funnel: routes a Spec Kit stage event to the person who is up next"
---
## SDLC notification funnel

A Spec Kit stage just finished and its artifact is ready for the next person.
The routing has already been decided. Read it with `cat route.json`.

You do **not** choose who is notified, which issue or pull request is targeted,
or which Project status is set. Copy those values from `route.json` exactly.
A guard step re-computes the route and rejects any output that differs.

If `target` in `route.json` is `null`, call `noop` and stop.

Otherwise emit, in this order:

1. `assign_to_user` on `target.number` with the single login in `assignees`.
2. `add_reviewer` on `target.number` with `reviewers` and `team_reviewers`,
   **only** when `target.kind` is `pr` and at least one reviewer is listed.
3. `update_project` setting the item for `target.number` to `project_status`
   in the `Status` field.
4. `add_comment` on `target.number`. Write two or three plain sentences that
   tell `@<notify>` what is ready (`stage`, `artifact`), what they are asked to
   do (`next`), and which surface they normally use (`surface`). End the
   comment with the line `correlation_key: <correlation_key>`.

When `transition` is `rework`, say so and include `classification`. When
`escalated_to` is set, say that the scope change needs that owner's re-review
before QA resumes.

Do not summarise the artifact, do not judge the work, and do not mention
anyone who is not in `route.json`.
