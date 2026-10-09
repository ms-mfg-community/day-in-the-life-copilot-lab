# 001 — Research SOTA: agent memory in the GitHub Copilot ecosystem

| | |
|---|---|
| **State** | `verified` |
| **Created** | 2026-10-09 |
| **Last updated** | 2026-10-09 |
| **Milestone** | Curriculum v2 — Labs Refresh & Teaching SPA |
| **Depends on** | none |
| **Executed by** | `spec-forge` |

---

## 1. Objective and non-goals

### Objective

This is the **memory slice** of the verified research baseline for Curriculum v2. It records what
the published, primary-source record says about agent memory in and around the GitHub Copilot
ecosystem as of **2026-10-09**, so that the refreshed memory lab (`labs/lab10.md`, the most out of
date lab in the curriculum) and the curriculum-architecture spec can teach current practice and cite
a source for every claim they make. It answers six questions: what GitHub Copilot's own memory
features store on each surface and how they are enabled, scoped, retained and deleted; what the
major agent tools document about file-based memory stores and persistent instruction files,
including the AGENTS.md convention as its own specification publishes it and Anthropic's file-based
memory tool; what the official MCP reference memory server stores and exposes; whether any primary
source defines the practices called "loop engineering" and "graph engineering"; what vendors publish
about memory consolidation and sleep-time processing; and what limits, privacy, governance and
administrator controls they document. Every fact in §3 is attributed to the **surface** it applies
to — github.com, VS Code, Copilot CLI, the Copilot cloud agent (the coding agent), Copilot code
review, or a named non-Copilot tool — and to the plan or availability tier **where the cited page
states one**. Sources older than twelve months, and pages that carry no date at all, are flagged, so
a downstream author can see at a glance which ground is firm. The target state is a record a lab
author can cite line by line without re-opening the web, and a reviewer can falsify by opening the
URLs in §3.

### Non-goals

This spec does **not** cover, because other runs do:

- Custom agents, skills and prompt files.
- Instruction hierarchy and precedence across personal, repository and organization levels. (§3
  records what individual tools publish about their own file precedence where that is part of a
  memory mechanism; it does not reconcile them into a cross-level model.)
- CLI extensions, plugins and agentic workflows.
- MCP specification revisions. (§3 covers the reference memory *server*, not the protocol.)
- The Copilot coding agent and Copilot code review **as products**. (§3 covers only what they do
  with memory.)
- The model lineup.

It also does **not**:

- Describe any local or private project. The SCNS project is a worked example belonging to the
  memory-lab spec and cannot be verified from public sources, so it appears nowhere in §3.
- Say what the memory lab should *teach*, how long it should take, or how it should be paced. This
  spec supplies the facts; the memory-lab spec makes the teaching decisions and cites §3 for each.
- Resolve any question in §4 by assertion. A question carried there is carried, not answered.
- Touch the `feature/epic-enterprise-harness` arc (Labs 21–26), which remains out of scope for
  Curriculum v2 work generally.

---

## 2. Acceptance criteria

Each criterion is **observable**: checkable by a named command or a named artifact.
A criterion no one can run is a wish, not a criterion.

Every command below is run from the repository root in PowerShell and is reproduced in full in the
block that follows the table, keyed by its criterion number. `SPEC` is this file,
`specs/001-research-sota/memory.md`.

Each criterion tests a **property** — a shape the file must hold, or an equality between a number
the file states and the same number recomputed from the file. None of them freezes a row count or a
section at its present size. A correct addition to §3 or §4 therefore passes these criteria rather
than failing them, which is what a record that is expected to grow needs.

| # | Criterion | How it is observed |
|---|---|---|
| AC1 | This spec carries every top-level section heading of the template, in the template's order, and no others | `AC1` — `Compare-Object` of the `^## ` lines in `specs/_template.md` and `SPEC` returns nothing |
| AC2 | §3 holds at least one fact row, and the rows are numbered uniquely and contiguously from `F1`, with no gap and no repeat | `AC2` — row count is greater than `0`, and the sorted row numbers differ from `1..<row count>` in nothing |
| AC3 | Every §3 fact row carries the verdict `VERIFIED`; no other verdict appears in the table | `AC3` — count of fact rows whose final cell is not `` `VERIFIED` `` is `0` |
| AC4 | Every §3 fact row cites exactly one absolute `https://` URL in its Primary source URL cell | `AC4` — the count of rows matching the single-URL pattern equals the total fact-row count |
| AC5 | Every fact row is attributed to a surface exactly once in the §3 surface index, and the index names the five Copilot surfaces this spec was asked about | `AC5` — the index's F-numbers are as many as the table's, all distinct, and differ from the table's in nothing; `AC5b` finds all five surface names |
| AC6 | Each of the six questions in the Objective has its own subsection in §3, numbered `3.1` to `3.6` | `AC6` — six `^### 3.[1-6] ` headings |
| AC7 | Every F-number cited in the §3 narrative subsections exists in the §3 table | `AC7` — no narrative F-number falls outside the set of F-numbers in the table |
| AC8 | Each of the six subsections answers its question **from the record**: it cites at least one fact row, or names at least one §4 entry that carries the finding instead. No question is silently dropped | `AC8` — each `3.1`–`3.6` subsection body matches `F<digits>` or `Q<digits>` |
| AC9 | Sources older than twelve months are flagged by F-number in the §3 source-currency subsection, and the undated-page count that subsection states equals the count recomputed from the table | `AC9` — the currency subsection names `F119`, `F120`, `F121`, `F73` and `F99`, and the integer it states for undated pages equals the number of rows whose Published cell records the page as undated or as showing no date |
| AC10 | §3 states how many **distinct** source URLs the table rests on and how many rows rest on its single most-cited page, and both match the table, so row count is never read as breadth | `AC10` — the two integers in the source-concentration subsection equal the recomputed distinct-URL count and the largest per-URL row count |
| AC11 | §4 carries one row per item that did not verify and per sub-question on which this slice records no finding; `Q` numbers are unique and contiguous, and every row names its grade (`CONTRADICTED`, `UNVERIFIED` or `NO-SOURCE`) | `AC11` — the sorted `^\| Q\d+ \|` numbers differ from `1..<Q count>` in nothing, and the count of rows naming none of the three grades is `0` |
| AC12 | The sub-question on loop engineering and graph engineering is answered by §4 entries rather than by a §3 row: §3.4 cites no F-number and sends the reader to both entries | `AC12` — the `3.4` subsection contains no `F<digits>` token and names `Q7` and `Q12` |
| AC13 | Where the body gives the repository navigation path for deleting repository-level facts, it cites the row whose own source page publishes that path, and the caveats record which page does | `AC13` — in `3.1`, `F11` follows the path within the same sentence; the `F59` and `F132` caveat entries each name a `how-to` page |

```powershell
# Run from the repository root.
$SPEC = 'specs/001-research-sota/memory.md'
$raw  = Get-Content $SPEC -Raw
$rows = Select-String -Path $SPEC -Pattern '^\| F(\d+) \|'
$n    = $rows | ForEach-Object { [int]$_.Matches[0].Groups[1].Value }

# AC1 — template conformance, order-sensitive
Compare-Object (Select-String -Path 'specs/_template.md' -Pattern '^## ').Line `
               (Select-String -Path $SPEC -Pattern '^## ').Line -SyncWindow 0   # expect no output

# AC2 — fact rows numbered uniquely and contiguously from F1
$rows.Count -gt 0                                                # expect True
(Compare-Object $n (1..$rows.Count)).Count                       # expect 0

# AC3 — every fact row ends in VERIFIED
($rows | Where-Object { $_.Line -notmatch '\| `VERIFIED` \|\s*$' }).Count       # expect 0

# AC4 — one absolute https URL per fact row
(Select-String -Path $SPEC -Pattern '^\| F\d+ \|.+ \| https://[^ |]+ \| ').Count -eq $rows.Count   # expect True

# AC5 — every fact row attributed to a surface exactly once
$idx = [regex]::Match($raw, '(?sm)^### Surface index(.*?)^### 3\.1 ').Groups[1].Value
$f   = [regex]::Matches($idx, 'F(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
$f.Count -eq $rows.Count                                         # expect True
($f | Sort-Object -Unique).Count -eq $rows.Count                 # expect True
(Compare-Object $f $n).Count                                     # expect 0
# AC5b — the five Copilot surfaces are named in the index
'github.com','VS Code','Copilot CLI','cloud agent','code review' |
  ForEach-Object { if ($idx -notmatch [regex]::Escape($_)) { "MISSING: $_" } }  # expect no output

# AC6 — six area subsections
(Select-String -Path $SPEC -Pattern '^### 3\.[1-6] ').Count      # expect 6

# AC7 — narrative F-numbers all exist in the table
$nar = [regex]::Match($raw, '(?sm)^### 3\.1 (.*?)^## 4\. ').Groups[1].Value
([regex]::Matches($nar, 'F(\d+)') | ForEach-Object { [int]$_.Groups[1].Value } |
   Where-Object { $n -notcontains $_ }).Count                    # expect 0

# AC8 — every area subsection rests on the record: a fact row or an open-question entry
1..6 | ForEach-Object {
  $b = [regex]::Match($raw, "(?sm)^### 3\.$_ (.*?)(?=^### 3\.|^## 4\. )").Groups[1].Value
  if ($b -notmatch 'F\d+' -and $b -notmatch 'Q\d+') { "UNSUPPORTED: 3.$_" }
}                                                                # expect no output

# AC9 — currency flags, and the undated count recomputed from the table
$cur = [regex]::Match($raw, '(?sm)^### Source currency(.*?)^### Source concentration').Groups[1].Value
'F119','F120','F121','F73','F99' |
  ForEach-Object { if ($cur -notmatch [regex]::Escape($_)) { "MISSING: $_" } }  # expect no output
$undated = ($rows | Where-Object { ($_.Line -split ' \| ')[3] -match '(?i)undated|no date' }).Count
$cur -match "\b$undated\b"                                       # expect True

# AC10 — distinct sources and the most-cited page, recomputed from the table
$con  = [regex]::Match($raw, '(?sm)^### Source concentration(.*?)^### Surface index').Groups[1].Value
$urls = $rows | ForEach-Object { if ($_.Line -match '\| (https://[^ |]+) \| ') { $Matches[1] } }
$d    = ($urls | Sort-Object -Unique).Count
$top  = ($urls | Group-Object | Sort-Object Count -Descending | Select-Object -First 1).Count
$con -match "\b$d\b"                                             # expect True
$con -match "\b$top\b"                                           # expect True

# AC11 — open questions: contiguous, each graded
$q  = Select-String -Path $SPEC -Pattern '^\| Q(\d+) \|'
$qn = $q | ForEach-Object { [int]$_.Matches[0].Groups[1].Value }
(Compare-Object $qn (1..$q.Count)).Count                         # expect 0
($q | Where-Object { $_.Line -notmatch 'CONTRADICTED|UNVERIFIED|NO-SOURCE' }).Count   # expect 0

# AC12 — §3.4 rests on §4, not on a fact row
$s34 = [regex]::Match($raw, '(?sm)^### 3\.4 (.*?)^### 3\.5 ').Groups[1].Value
[regex]::Matches($s34, 'F\d+').Count                             # expect 0
if ($s34 -notmatch 'Q7' -or $s34 -notmatch 'Q12') { 'MISSING Q reference' }     # expect no output

# AC13 — the repository navigation path is cited to the page that publishes it
$s31 = [regex]::Match($raw, '(?sm)^### 3\.1 (.*?)^### 3\.2 ').Groups[1].Value
$s31 -match '(?s)Settings then Copilot then Memory.{0,200}?F11'  # expect True
$cav = [regex]::Match($raw, '(?sm)^### Verifier caveats(.*?)^### Source currency').Groups[1].Value
[regex]::Match($cav, '(?sm)^- F59 .*?(?=^- F\d+ |^$)').Value  -match 'how-to'   # expect True
[regex]::Match($cav, '(?sm)^- F132 .*?(?=^- F\d+ |^$)').Value -match 'how-to'   # expect True
```

---

## 3. Verified facts

Every factual claim this spec relies on. **Mandatory** — a spec with no factual claims
states that explicitly rather than omitting the table.

A search-engine summary is a lead, not a source. The verifier opens the primary page.

The table below is the record itself: 160 claim rows, each one graded by a verifier that opened the
cited page. **Row count is not breadth.** Those 160 rows rest on **30 distinct source URLs**, and 38
of them rest on one page — GitHub's Copilot Memory concept page — because the research behind the
table was decomposed by sub-question and the same proposition was graded more than once when more
than one sub-question reached it. Read "160" as 160 independently graded statements, never as 160
sources; the **source concentration** subsection below gives the arithmetic.

The table is followed by four things a reader needs in order to use it safely — the **verifier
caveats** (where a verifier's finding is narrower than the claim it graded), the **source currency**
flags (what is old, and what carries no date at all), the **source concentration** figures (how many
distinct pages the rows actually rest on, and which propositions are restated across rows), and the
**surface index** (which surface, plan and tier each row applies to) — and then by **subsections 3.1
to 3.6**, one per question in the Objective, which say what the record amounts to and cite the rows
they rest on. Nothing is stated in those subsections that is not in this table.

A verdict of `VERIFIED` means the cited page was opened and states the claim. It does **not** mean
the claim is true of the world, that the page is complete, or that the behaviour it describes has
been observed. Where a claim is a statement of **silence** ("the page does not mention X"), it is
evidence about that page on the date it was read and nothing more.

| # | Claim | Primary source URL | Published | Verdict |
|---|---|---|---|---|
| F1 | GitHub's concept page for Copilot Memory says the feature is in public preview and subject to change. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page; github/docs source file last changed 2026-09-25 (commit 18d99623, #63493); accessed 2026-10-09 | `VERIFIED` |
| F2 | Copilot Memory stores two kinds of memory: repository-level facts (coding conventions, architectural decisions, build commands, project-specific rules) and user-level preferences (implied or stated personal preferences about how a user wants to interact with Copilot). | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page; github/docs source file last changed 2026-09-25 (commit 18d99623, #63493); accessed 2026-10-09 | `VERIFIED` |
| F3 | The concept page lists Copilot cloud agent, Copilot code review, Copilot CLI and agentic autofix as the features that currently use Copilot Memory. It does not list Copilot Chat on github.com. Facts learned by one feature can be used by another. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F4 | Copilot CLI applies repository-level facts plus the user-level preferences of the user who started the operation. Copilot code review uses repository-level facts only, and user-level preferences are not applied during code review. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F5 | Scope: repository-level facts are stored with citations to supporting code and are checked against the current branch before use. They are created only from actions by users with write access who have Memory enabled. They are available to any user with Memory access in that repository, and usable only in operations on the same repository. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F6 | User-level preferences are stored with citations that may include direct user quotes. They are created only from that user's interactions and are available only in that user's later interactions, across repositories. Users can view and delete their own preferences regardless of plan. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F7 | On Copilot Business and Enterprise plans, user-level preferences are owned by the billing entity (the organization or enterprise granting the license). They can be exported or deleted by an organization or enterprise administrator, in bulk or per user. Only memories owned by the user's current active billing entity are retrieved. Users with licenses from several places must choose a default billing entity to generate user-level preferences. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F8 | Retention: any stored fact or preference that goes unused is automatically deleted after 28 days. The timer may reset when Copilot successfully validates and uses an entry. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F9 | Copilot Memory is enabled per user, not per repository. It is on by default for individual plans. For enterprise- and organization-managed plans an administrator must enable the policy first, and individual users can then opt out. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F10 | Individual users have Memory on by default if they are on a paid individual Copilot plan, or if their plan is managed by an organization or enterprise that allows Memory. They can disable or re-enable it in personal Copilot settings: profile picture > Copilot settings > Features > Copilot Memory > Enabled/Disabled. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-for-yourself | Undated page; source file last committed 2026-06-02 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F11 | Repository owners can view and delete repository-level facts at repository Settings > Copilot > Memory. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-for-yourself | Undated page; source file last committed 2026-06-02 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F12 | Users can view and delete their own user-level preferences in their personal settings. The concept page links https://github.com/settings/copilot/memory, which shows each stored preference and its owner. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F13 | For enterprise- and organization-managed Copilot subscriptions, Copilot Memory is off by default and must be enabled in enterprise or organization settings. Once enabled it is on for users by default, and users can opt out. If a user is licensed by several organizations, Memory is not used unless all of them enable it. The enterprise policy may control whether organization owners can enable or disable it. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | No date shown on page; last commit to the source file in github/docs main: 2026-08-24; read live 2026-10-09 | `VERIFIED` |
| F14 | Enterprise admins set the Memory policy under the enterprise's AI controls > Copilot > Configure features & clients > Features > Copilot Memory. Organization owners can enable or disable Memory for all members with a Copilot license. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | No date shown on page; last commit to the source file in github/docs main: 2026-08-24; read live 2026-10-09 | `VERIFIED` |
| F15 | On 2026-03-04 GitHub made Copilot Memory on by default for individual Copilot Pro and Pro+ users, previously opt-in in public preview. It works across the Copilot coding agent, code review and Copilot CLI. Memories are strictly scoped to a single repository, validated against the current codebase, and expire after 28 days. Users can opt out under Features > Copilot Memory in personal Copilot settings. Enterprise and organization admins retain control through policies. | https://github.blog/changelog/2026-03-04-copilot-memory-now-on-by-default-for-pro-and-pro-users-in-public-preview/ | 2026-03-04 | `VERIFIED` |
| F16 | VS Code's built-in memory tool lets agents save and recall notes as they work, and you can explicitly ask the agent to remember something. User, repository, and session memory are stored locally on the user's machine. | https://code.visualstudio.com/docs/agents/run/memory | 2026-10-07 (ms.date page metadata, 10/7/2026) | `VERIFIED` |
| F17 | VS Code memory has three scopes. User memory (/memories/) persists across sessions and workspaces. Repository memory (/memories/repo/) persists across sessions but is workspace-scoped. Session memory (/memories/session/) is current conversation only. | https://code.visualstudio.com/docs/agents/run/memory | 2026-10-07 (page ms.date 10/7/2026; DateApproved 10/7/2026 in microsoft/vscode-docs) | `VERIFIED` |
| F18 | The first 200 lines of VS Code user memory are automatically loaded into the agent's context at the start of every session. | https://code.visualstudio.com/docs/agents/run/memory | 2026-10-07 (page ms.date 10/7/2026) | `VERIFIED` |
| F19 | VS Code docs state that all memory scopes on that page are stored locally. Repository memory is associated with the current workspace but is not a shared project file. Reviewed team guidance should go in source-controlled docs or custom instructions, and stale local memory should be updated or removed. | https://code.visualstudio.com/docs/agents/run/memory | 2026-10-07 (page ms.date 10/7/2026) | `VERIFIED` |
| F20 | In VS Code you store a memory by asking the agent in natural language to remember something. The agent chooses the scope and creates or updates the memory file. The Plan agent uses session memory to persist its plan in plan.md. | https://code.visualstudio.com/docs/agents/run/memory | 2026-10-07 (page ms.date 10/7/2026) | `VERIFIED` |
| F21 | VS Code management commands: 'Chat: Show Memory Files' lists all memory files across scopes and lets you view them. 'Chat: Clear All Memory Files' removes all memory files across all scopes. To update or delete an individual memory file, ask the agent. | https://code.visualstudio.com/docs/agents/run/memory | 2026-10-07 (page ms.date 10/7/2026) | `VERIFIED` |
| F22 | VS Code's Agents concepts page describes memory as available 'when the memory tool is available' and stored locally in three scopes. Session memory is cleared when the conversation ends. Memory is separate from the conversation context a session accumulates automatically. | https://code.visualstudio.com/docs/agents/concepts/agents | 2026-10-07 (ms.date page metadata, 10/7/2026) | `VERIFIED` |
| F23 | The VS Code memory documentation page states no plan restrictions, no enabling setting, and no time-based retention or expiry for the local memory tool. Apart from session memory, which ends with the conversation, it documents only manual removal. | https://code.visualstudio.com/docs/agents/run/memory | 2026-10-07 (page ms.date 10/7/2026) | `VERIFIED` |
| F24 | GitHub's cloud 'Copilot Memory' (public preview) is a separate feature from the VS Code local memory tool. It is used by Copilot cloud agent, Copilot code review, Copilot CLI and agentic autofix. VS Code is not listed among those surfaces. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date). VS Code memory docs: ms.date 2026-10-07 | `VERIFIED` |
| F25 | GitHub Copilot Memory stores repository-level facts (with citations validated against the current branch) and user-level preferences. Unused entries are automatically deleted after 28 days. It is enabled per user. It is on by default for individual plans. For organization- and enterprise-managed plans an administrator must enable the policy first and users can then opt out. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F26 | Copilot Memory is documented as currently used by Copilot cloud agent, Copilot code review, Copilot CLI, and agentic autofix; facts and preferences captured by one feature can be used by another. The page carries a public-preview note. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F27 | Copilot CLI applies repository-level facts and the user-level preferences of the user who initiated the operation. Copilot code review uses repository-level facts only. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last commit to the page source in github/docs; the rendered page shows no date) | `VERIFIED` |
| F28 | Copilot Memory stores repository-level facts (with citations to supporting code, validated against the current branch before use) and user-level preferences (with citations that may include direct user quotes). Repository facts are only created by actions of users with write access who have Memory enabled, and can only be used in operations on the same repository. User preferences are available only to the user who created them. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F29 | Retention: any stored Copilot Memory fact or preference that goes unused is automatically deleted after 28 days; the timer may reset whenever Copilot successfully validates and uses an entry. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F30 | Copilot Memory is enabled per user, not per repository. It is on by default for individual plans. For organization- and enterprise-managed plans an administrator must enable the policy first, and then users can opt out. Users can disable or re-enable it in their personal Copilot settings. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F31 | Repository owners can review and delete repository-level facts stored for their repository. Users can view and delete their own user-level preferences at github.com/settings/copilot/memory. On Business and Enterprise plans, administrators can export or delete user-level preferences in bulk or per user. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | Undated page; source file last committed 2026-09-25 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F32 | The CLI command reference documents a --enable-memory option: 'Enable memory in prompt mode (disabled by default).' | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference | Undated page; source file last committed 2026-10-09 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F33 | The CLI command reference documents a 'memory' permission kind ('Storing facts to agent memory') usable in tool permission patterns. It also states only the root agent can call store_memory or vote_memory, while subagents keep read access to stored memories via read_memories but cannot write or vote. | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference | Undated page; source file last committed 2026-10-09 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F34 | The CLI configuration directory reference lists 'memory' as a permission request kind that approves memory write and vote requests. | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference | Undated page; source file last committed 2026-10-08 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F35 | CLI changelog: v1.0.49 (2026-05-18) added a persistent /memory on\|off\|show slash command to enable, disable, or view memory status. Memory permission prompts name who can see a stored memory (user scope, or the specific owner/repo for repository scope) and timeline entries show '(for user)' or '(shared with repository collaborators)'. | https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md | 2026-05-18 | `VERIFIED` |
| F36 | CLI changelog: v1.0.51 (2026-05-20) states '/memory show' displays documentation links for learning about and managing Copilot Memory. | https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md | 2026-05-20 | `VERIFIED` |
| F37 | CLI changelog history of the memory feature: v0.0.384 (2026-01-16) injected repo memories in the prompt and added a memory storage tool to remember facts across sessions. v0.0.385 (2026-01-19) included the store_memory tool only when memory is enabled for the user. v0.0.411 (2026-02-17) showed subject, fact and citations in the timeline. v1.0.55 (2026-05-28) throttled vote_memory calls. v1.0.71 (2026-07-16) refreshes memory context after 30 minutes in long-lived sessions. | https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md | 2026-01-16; 2026-01-19; 2026-02-17; 2026-05-28; 2026-07-16 | `VERIFIED` |
| F38 | CLI changelog: v1.0.85 (2026-09-16) added 'session and memory import commands for the semantic JSONL interchange format'. v1.0.62 (2026-06-13) allowed SDK clients to configure session memory through session.create and session.resume. | https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md | 2026-09-16; 2026-06-13 | `VERIFIED` |
| F39 | CLI changelog: v0.0.412 (2026-02-19) added experimental cross-session memory (ask about past work, files and PRs across sessions). v0.0.419 (2026-02-27) added experimental /chronicle with standup, tips and improve subcommands. v1.0.40 (2026-05-01) made session history, file tracking and /chronicle available to all users. | https://raw.githubusercontent.com/github/copilot-cli/main/changelog.md | 2026-02-19; 2026-02-27; 2026-05-01 | `VERIFIED` |
| F40 | The CLI stores its configuration, session history, logs and customizations in one directory, ~/.copilot by default. session-state/ holds session history organized by session ID, with an events.jsonl event log and workspace artifacts (plans, checkpoints, tracked files), and enables --resume and --continue. Deleting it removes the ability to resume past sessions. | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference | Undated page; source file last committed 2026-10-08 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F41 | session-store.db is a SQLite database used by the CLI for cross-session data such as checkpoint indexing and search. It is auto-managed. If deleted it is re-created, and it can be rebuilt with /chronicle reindex, which also syncs session data to your account. command-history-state/ holds command history for reverse search. | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference | 2026-10-08 (last commit to this page's source in github/docs; page retrieved 2026-10-09) | `VERIFIED` |
| F42 | Deleting files under ~/.copilot/session-state/ removes only local copies; sessions synced to the user's GitHub account are stored separately and are not affected, and can be deleted or hidden from GitHub.com. | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference | 2026-10-08 (last commit to this page's source in github/docs; page retrieved 2026-10-09) | `VERIFIED` |
| F43 | Session data concept page: Copilot CLI and the GitHub Copilot app store the complete record of each local session under ~/.copilot/session-state/ and a subset in a local SQLite 'session store' that supports session-history queries and /chronicle. By default, locally-run CLI sessions are synced to the user's GitHub account (controllable with the remote and remoteExport settings). For Business/Enterprise users, the 'Store local sessions in the Cloud' policy must be at least 'View from cloud' for syncing; if disabled or unconfigured, sessions are stored locally only. Synced data is accessible only to the user by default. | https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/session-data | undated page (no on-page date); source file last changed 2026-09-23 (github/docs commit fc2c908a78); retrieved 2026-10-09 | `VERIFIED` |
| F44 | Clearing CLI sessions: /session delete deletes the current session; /session delete SESSION-ID shows a preview and needs --yes; /session delete-all --yes deletes all local sessions except the current one; /session prune --older-than DAYS (with --dry-run preview) deletes old sessions. delete-all and prune affect only local sessions, not synced data. When deleting a synced session, /session delete asks whether to delete the remote copy. Manual deletion of ~/.copilot/session-state/ requires a manual /chronicle reindex. | https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle | No date shown on page; last commit to the source file in github/docs main: 2026-09-23; read live 2026-10-09 | `VERIFIED` |
| F45 | The CLI documents copilot --continue (resume most recent session), copilot --resume (picker) and copilot --resume SESSION-ID, plus /resume in an interactive session. Copilot CLI session data enables /chronicle standup/tips/improve reports and natural-language questions about past sessions. | https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle | No date shown on page; last commit to the source file in github/docs main: 2026-09-23; read live 2026-10-09 | `VERIFIED` |
| F46 | The CLI command reference lists /chronicle <standup\|tips\|improve\|reindex\|skills create\|skills review\|skills status> as session history tools, and /session (alias /sessions) with subcommands info, checkpoints, files, plan, rename, cleanup, prune, delete, delete-all. | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference | Undated page; source file last committed 2026-10-09 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F47 | The github/copilot-cli README at main contains no mention of memory, session storage, session history or /chronicle; it points to the official docs on docs.github.com. | https://raw.githubusercontent.com/github/copilot-cli/main/README.md | branch main as fetched 2026-10-09 | `VERIFIED` |
| F48 | GitHub documents Copilot Memory as being in public preview and subject to change. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F49 | Copilot Memory is currently used by Copilot cloud agent (the coding agent), Copilot code review, Copilot CLI, and agentic autofix. Facts and preferences captured by one of these features can be used by another; for example, facts learned by the cloud agent can be applied by code review, and vice versa. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F50 | Copilot Memory stores two kinds of memory. Repository-level facts cover coding conventions, architectural decisions, build commands and project-specific rules, and are available to all users with Copilot Memory access for that repository. User-level preferences are implied or stated personal preferences about how a user wants to interact with Copilot, and are available only to that user's own Copilot interactions across repositories. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F51 | Copilot code review uses repository-level facts only; user-level preferences are not applied during code review. Copilot CLI applies repository-level facts plus the user-level preferences of the user who initiated the operation. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F52 | Repository-level facts are stored with citations to supporting code. When Copilot finds a fact relevant to its current work, it checks those citations against the current branch, and only validated facts are used. Facts can also be captured from pull requests closed without merging; validation ensures behaviour is unaffected unless the current codebase still substantiates the information. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F53 | Repository-level facts are created only in response to actions by users with write access to the repository who have Copilot Memory enabled. Once stored they are available to any user with Copilot Memory access in that repository, but can only be used in operations on the same repository. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F54 | User-level preferences are stored with citations that may include direct user quotes. Copilot uses its best judgment to confirm that a preference still applies. They are created only from interactions initiated by that user and are used only in that same user's later interactions. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F55 | Retention: any stored fact or preference that goes unused is automatically deleted after 28 days. The 28-day timer may reset whenever Copilot successfully validates and uses an entry. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | 2026-09-25 (last change to page source per github/docs commit history; rendered page is undated; fetched 2026-10-09) | `VERIFIED` |
| F56 | Enablement is per user, not per repository. Once enabled, it applies in any repository where that user works with Copilot. For individual plans it is on by default. For enterprise- and organization-managed plans an administrator must first enable the policy, and then individual users can opt out. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F57 | For a personal account, Copilot Memory is enabled by default if the user is on a paid individual Copilot plan, or if their plan is managed by an enterprise or organization that has allowed Copilot Memory. In either case the user can disable or re-enable it in personal Copilot settings (Features > Copilot Memory > Enabled/Disabled). | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-for-yourself | Undated page; source file last committed 2026-06-02 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F58 | For enterprise- and organization-managed Copilot subscriptions, Copilot Memory is off by default and must be enabled in enterprise or organization settings. Once enabled it is on for users by default and saves both repository-level facts and user-level preferences, and individual users can opt out in their account settings. If a user is assigned a Copilot subscription by more than one organization, the most restrictive setting applies, so Memory is not used unless all of those organizations have enabled it. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | No date shown on page; last commit to the source file in github/docs main: 2026-08-24; read live 2026-10-09 | `VERIFIED` |
| F59 | Repository owners can review and manually delete the repository-level facts stored for their repository (repository Settings > Copilot > Memory lists the facts, which can be deleted). | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | No date shown on page; last commit to the source file in github/docs main: 2026-09-25 (concept page); the cited admin page last committed 2026-08-24; both read live 2026-10-09 | `VERIFIED` |
| F60 | Users can view and delete their own user-level preferences regardless of their Copilot plan. On Copilot Business and Copilot Enterprise plans, an organization or enterprise administrator can also export or delete user-level preferences, in bulk or per user. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F61 | On Business and Enterprise plans, user-level preferences are owned by the billing entity (the organization or enterprise granting the license). A memory is stored against the user's active billing entity, and only memories owned by the current active billing entity are retrieved when building agent session context. Users with multiple licenses must select a default billing entity in account settings to generate user-level preferences. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F62 | Administrators can export user-level preferences as JSONL, for everyone ('Get usage report' > 'Download user memories') or for one user ('Export Copilot memories'). Existing exports are reused for a two-hour window, and exports are limited to 10 per hour. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | No date shown on page; last commit to the source file in github/docs main: 2026-08-24 (export reusable last changed 2026-06-02); read live 2026-10-09 | `VERIFIED` |
| F63 | AGENTS.md is described as 'a simple, open format for guiding coding agents' and as 'a README for agents': a dedicated, predictable place to provide context and instructions to help AI coding agents work on a project. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F64 | The site says README.md files are for humans, while AGENTS.md holds extra context agents need (build steps, tests, conventions). It is intentionally kept separate from the README to give agents a clear, predictable place for instructions and to keep READMEs concise. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F65 | Location: the 'How to use' section says to create an AGENTS.md file at the root of the repository. Suggested sections include project overview, build and test commands, code style guidelines, testing instructions and security considerations. The site says commit/PR guidelines, security gotchas, large datasets and deployment steps can also go in it. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F66 | Nested files and discovery: for large monorepos, place another AGENTS.md inside each package. The site says agents automatically read the nearest file in the directory tree, so the closest one takes precedence. As an example, it says the main OpenAI repo had 88 AGENTS.md files at time of writing. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F67 | Conflict rule (FAQ): the closest AGENTS.md to the edited file wins, and explicit user chat prompts override everything. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F68 | Format: there are no required fields. AGENTS.md is standard Markdown, any headings can be used, and the agent simply parses the text provided. The FAQ says to treat it as living documentation that can be updated later. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F69 | The FAQ says an agent will attempt to run testing commands listed in AGENTS.md and fix failures before finishing the task, if those commands are listed. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F70 | Migration: the FAQ says to rename existing files to AGENTS.md and create symbolic links for backward compatibility, e.g. 'mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md'. Tool configuration examples given: Aider via '.aider.conf.yml' with 'read: AGENTS.md'; Gemini CLI via '.gemini/settings.json' with context.fileName set to AGENTS.md. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F71 | Tool support: the page lists as compatible Codex (OpenAI), Jules (Google), Factory, Aider, goose, opencode, Zed, Warp, VS Code, Devin (Cognition), Autopilot & Coded Agents (UiPath), Junie (JetBrains), Amp, Cursor, RooCode, Gemini CLI (Google), Kilo Code, Phoenix, Semgrep, 'Coding agent from GitHub Copilot', Ona, Windsurf (Cognition) and Augment Code. It says the format is used by over 60k open-source projects. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F72 | Origin and stewardship: the About section says AGENTS.md emerged from collaborative efforts across OpenAI Codex, Amp, Jules from Google, Cursor and Factory. It states 'AGENTS.md is now stewarded by the Agentic AI Foundation under the Linux Foundation'. The footer reads 'Copyright © AGENTS.md a Series of LF Projects, LLC'. | https://agents.md/ | Page undated; site source repo agentsmd/agents.md HEAD d001185 committed 2026-09-10; fetched live 2026-10-09 | `VERIFIED` |
| F73 | The source repository github.com/agentsmd/agents.md (owned by the 'agentsmd' GitHub organization) was created 2025-08-19 and last pushed 2026-09-10. Its README repeats 'AGENTS.md is a simple, open format for guiding coding agents' and 'a README for agents'. The README says the repo also holds a basic Next.js website hosted at agents.md. The repo contains a Technical_Charter.pdf. | https://github.com/agentsmd/agents.md | Created 2025-08-19; last pushed 2026-09-10 (GitHub API, read 2026-10-09) | `VERIFIED` |
| F74 | Claude Code docs: each session starts with a fresh context window, and two mechanisms carry knowledge across sessions: CLAUDE.md files (instructions you write) and auto memory (notes Claude writes itself from your corrections and preferences). Both are loaded at the start of every conversation and treated as context, not enforced configuration. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F75 | Claude Code docs comparison table: CLAUDE.md is written by you and holds instructions and rules, with scope project, user, or org. Auto memory is written by Claude and holds learnings and patterns, with scope per repository shared across worktrees. Auto memory loads every session, limited to the first 200 lines or 25KB. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F76 | Claude Code CLAUDE.md locations by scope: managed policy (/Library/Application Support/ClaudeCode/CLAUDE.md on macOS, /etc/claude-code/CLAUDE.md on Linux and WSL, C:\Program Files\ClaudeCode\CLAUDE.md on Windows); user ~/.claude/CLAUDE.md; project ./CLAUDE.md or ./.claude/CLAUDE.md, shared via source control; local ./CLAUDE.local.md (add to .gitignore). Files above the working directory load at launch; subdirectory files load on demand. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F77 | Claude Code CLAUDE.md size and loading: the docs recommend under 200 lines per CLAUDE.md file. Imported files (via @path, max depth four hops) are loaded at launch and do not reduce context cost. Block-level HTML comments are stripped before injection. A CLAUDE.md file of up to 4 MiB is loaded in full and a larger file is skipped. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F78 | Claude Code auto memory: Claude writes four kinds of notes (type field: user, feedback, project, reference). It skips anything derivable from the codebase or already in CLAUDE.md, and does not save something every session; it decides what is worth remembering. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F79 | Claude Code auto memory is on by default in local sessions. It can be toggled with /memory (which saves autoMemoryEnabled to ~/.claude/settings.json), disabled per project with autoMemoryEnabled:false, or disabled with env var CLAUDE_CODE_DISABLE_AUTO_MEMORY=1. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F80 | Claude Code auto memory storage: ~/.claude/projects/<project>/memory/, where <project> is derived from the git repository so all worktrees and subdirectories share one directory. The directory holds a MEMORY.md index (one line per memory) plus one topic file per memory. It is machine-local and not shared across machines or cloud environments. The location can be changed with the autoMemoryDirectory setting. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F81 | Claude Code auto memory loading limits: the first 200 lines of MEMORY.md or the first 25KB, whichever comes first, load at the start of every conversation; content beyond that is not loaded at session start. Topic files are not loaded at startup and are read on demand with standard file tools. If MEMORY.md exceeds a limit the write succeeds but Claude Code returns an error telling Claude to rewrite the index. | https://code.claude.com/docs/en/memory | Undated page (no publication or last-updated date shown); content verified as retrieved 2026-10-09 | `VERIFIED` |
| F82 | Claude Code auto memory retention and management: memory files are excluded from the cleanupPeriodDays transcript retention sweep and stay until you or Claude edit or delete them. They are plain markdown that can be edited or deleted at any time. /memory lists memory files, toggles auto memory and opens the auto memory folder. Asking Claude to 'remember' something saves it to auto memory; asking it to 'add this to CLAUDE.md' writes to CLAUDE.md instead. Claude Code records a modified ISO 8601 timestamp in frontmatter when it writes a memory file (v2.1.214+). | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F83 | Claude Code AGENTS.md handling: Claude Code reads AGENTS.md as project instructions by default only when no CLAUDE.md or CLAUDE.local.md exists in the working directory or above it (v2.1.277+). Otherwise it reads CLAUDE.md files only. The 'Project instructions' setting can be changed to claude-md-and-agents-md, claude-md, or managed-only. A CLAUDE.md containing @AGENTS.md imports it, and AGENTS.local.md and AGENTS.override.md are not read. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F84 | Claude Code rules and organization controls: .claude/rules/*.md files load at launch, or on demand when they carry a paths frontmatter glob; user-level rules live in ~/.claude/rules/. Organizations can deploy a managed CLAUDE.md (or the claudeMd key in managed settings) that individual settings cannot exclude. claudeMdExcludes can skip other CLAUDE.md files in monorepos. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F85 | OpenAI Codex AGENTS.md: Codex reads AGENTS.md files before doing any work, building an instruction chain once per run (per launched session in the TUI). Global scope is ~/.codex (CODEX_HOME) AGENTS.override.md, else AGENTS.md (first non-empty file only). Project scope walks from the project root down to the working directory, at most one file per directory (AGENTS.override.md, then AGENTS.md, then project_doc_fallback_filenames). Files are concatenated root-down so files nearer the working directory appear later and override earlier guidance. | https://learn.chatgpt.com/docs/agent-configuration/agents-md | Undated page; verified live 2026-10-09. developers.openai.com/codex/guides/agents-md returns HTTP 308 to this URL (confirmed). Last-Modified header 2026-10-09T19:05:09Z appears to be a site build time, not a content date. | `VERIFIED` |
| F86 | OpenAI Codex memories feature: memories let ChatGPT and Codex carry useful context from earlier work into future work. Local Codex clients use a separate local memory store. The docs say to keep required team guidance in AGENTS.md or checked-in documentation and to treat memories as a helpful recall layer, not the only source for rules that must always apply. | https://learn.chatgpt.com/docs/customization/memories?surface=app | Undated page; verified live 2026-10-09. developers.openai.com/codex/memories returns HTTP 308 to this URL (confirmed). | `VERIFIED` |
| F87 | OpenAI Codex memories are generated automatically: once enabled, Codex turns useful context from eligible prior chats into local memory files. It skips active or short-lived sessions, redacts secrets from generated memory fields, and updates in the background after a chat has been idle long enough. A background pass can be skipped when the rate-limit remaining percentage is below a configured threshold. | https://learn.chatgpt.com/docs/customization/memories?surface=app | Undated page; verified live 2026-10-09 | `VERIFIED` |
| F88 | OpenAI Codex memories storage: files live under the Codex home directory (default ~/.codex), mainly in ~/.codex/memories/. They include summaries, durable entries, recent inputs, and supporting evidence from prior chats. The docs say to treat them as generated state and not to rely on hand-editing them as the primary control surface. | https://learn.chatgpt.com/docs/customization/memories?surface=app | Undated page; verified live 2026-10-09 | `VERIFIED` |
| F89 | OpenAI Codex memories controls: local Codex memories are off by default. They are enabled via Settings > Personalization > 'Enable Codex memories' or [features] memories = true in config.toml. /memories controls per-chat use and contribution. 'Delete Codex memories' resets the machine's store. Settings include memories.generate_memories, memories.use_memories, memories.disable_on_external_context (keeps chats that used MCP or web search out of generation), memories.min_rate_limit_remaining_percent, memories.extract_model and memories.consolidation_model. | https://learn.chatgpt.com/docs/customization/memories?surface=app | Undated page; verified live 2026-10-09 | `VERIFIED` |
| F90 | Cursor rules docs: 'Large language models don't retain memory between completions. Rules provide persistent, reusable context at the prompt level.' Rule contents are included at the start of the model context. | https://cursor.com/docs/rules | undated (page shows no date; retrieved 2026-10-09) | `VERIFIED` |
| F91 | Cursor rule types: Project Rules in .cursor/rules as .mdc files (version-controlled; plain .md is ignored), User Rules (global, set in Customize > Rules, used by Agent chat only), Team Rules (dashboard-managed, Team and Enterprise plans, admins can enforce), and AGENTS.md in the project root or nested subdirectories as a plain-markdown alternative. Rule application modes are Always Apply, Apply Intelligently, Apply to Specific Files (globs), and Apply Manually via @-mention. | https://cursor.com/docs/rules | undated (page shows no date; retrieved 2026-10-09) | `VERIFIED` |
| F92 | Cursor rules writing and management: rules are authored by the user, either by hand or by asking Agent via /create-rule in chat, which saves the rule to .cursor/rules. Best practice is to keep rules under 500 lines, split large rules, and reference files with @file instead of copying them (referenced files are read by Agent, not inlined). Rules are checked into git, and the docs suggest tagging @cursor on a GitHub issue or PR to have Agent update a rule. Nested AGENTS.md files combine with parent directories, with more specific ones taking precedence. | https://cursor.com/docs/rules | undated (page shows no date; retrieved 2026-10-09) | `VERIFIED` |
| F93 | Cursor Team Rules: they apply in the order Team Rules, then Project Rules, then User Rules, and earlier sources win on conflict. Non-enforced Team Rules can be disabled by users, and an 'Enforce this rule' option prevents that. The docs add that AI guidance should not be your only security control. | https://cursor.com/docs/rules | undated (page shows no date; retrieved 2026-10-09) | `VERIFIED` |
| F94 | GitHub Copilot repository custom instructions (docs.github.com): three types are supported. Repository-wide .github/copilot-instructions.md applies to all requests in the repo. Path-specific .github/instructions/NAME.instructions.md files apply to matching paths, and both are used if both match. Agent instructions are one or more AGENTS.md files anywhere in the repo (nearest takes precedence), or a single CLAUDE.md or GEMINI.md in the repo root. All are repository files written in Markdown and are not described as an automatically written memory store. | https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions | No date shown on page; last commit to the source file in github/docs main: 2026-09-30; read live 2026-10-09 | `VERIFIED` |
| F95 | GitHub Copilot custom instructions are created by hand or generated by Copilot cloud agent. The page provides an 'onboard this repository' prompt that has the cloud agent open a draft pull request adding .github/copilot-instructions.md. That prompt sets a limit that instructions be no longer than 2 pages and not task-specific. For Copilot code review, the user's personal choice to use custom instructions must be enabled, and it is enabled by default. | https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions | No date shown on page; last commit to the source file in github/docs main: 2026-09-30; read live 2026-10-09 | `VERIFIED` |
| F96 | Anthropic's memory tool lets Claude store and retrieve information across conversations in a directory of memory files. Claude can create, read, update and delete files that persist between sessions. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F97 | The memory tool operates client-side: Claude requests file operations and the developer's application executes them against storage the developer controls, returning results in a tool_result block. Memory lives entirely in the application. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F98 | The tool is enabled with the tools entry {"type": "memory_20250818", "name": "memory"}. The name must be 'memory' and no input schema is defined for this Anthropic-provided tool. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F99 | Beta status: the current page does not label the memory tool as beta and states that the memory tool itself doesn't require a beta header. The SDK helpers and tool-runner surfaces live in the SDKs' beta namespaces. The basic cURL example sends no beta header. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page; live content fetched 2026-10-09. Vendor release notes: memory tool launched in beta 2025-09-29; beta header no longer required 2026-02-17 | `VERIFIED` |
| F100 | The memory tool is available on all Claude 4 and later models. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F101 | Claude stores what it learns in files under /memories and checks the memory directory before starting a task. /memories is a path prefix that the developer's handler maps onto real storage, such as a per-user directory or database keys. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F102 | The client must implement six commands: view (directory listing up to 2 levels deep, or file contents with line numbers and optional view_range), create (path, file_text), str_replace (path, old_str, optional new_str), insert (path, insert_line, insert_text), delete (file or directory, recursive), and rename (old_path, new_path). The page describes these as recommended behaviors and return strings. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F103 | Details for specific commands: create returns an error if the file exists ('Error: File {path} already exists'), though overwriting is a valid implementation choice. rename must not overwrite an existing destination. The /memories root itself must not be deleted or renamed, so handlers should reject those requests. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F104 | When the memory tool is in the request's tools, the API automatically adds a system-prompt instruction: 'ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE', plus a memory protocol and 'ASSUME INTERRUPTION: Your context window might be reset at any moment'. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F105 | Security guidance: the application is responsible for the safeguards. Claude usually refuses to write sensitive information to memory, but the page recommends validation that strips sensitive data before writing. It also recommends capping file sizes and the characters returned by view, and periodically deleting memory files that have not been accessed in a long time. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F106 | Path traversal protection: a path such as /memories/../../secrets.env can escape the directory, so every path in every command must be validated. Recommended safeguards are requiring paths to start with /memories, resolving them to canonical form, rejecting ../ and ..\ patterns, watching for URL-encoded traversal such as %2e%2e%2f, and using language path utilities (for example pathlib.Path.resolve() and relative_to()). | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | Undated page (no last-updated stamp, no Last-Modified header); live content fetched 2026-10-09 | `VERIFIED` |
| F107 | Relationship to compaction: compaction summarizes older conversation context server-side when the conversation approaches the context window limit. For long-running agents the page suggests using both, with compaction keeping the active context small and memory preserving information that must survive summarization. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F108 | The page describes a multisession software development pattern: an initializer session sets up a progress log, a feature checklist and a startup script reference. Later sessions begin by reading those memory files, and each session updates the progress log at its end. Work proceeds one feature at a time, and a feature is marked complete only after end-to-end verification. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F109 | SDK helpers exist: subclass BetaAbstractMemoryTool (Python, C#), use betaMemoryTool (TypeScript), or implement BetaMemoryToolHandler (Java). Python and TypeScript also ship a ready-made BetaLocalFilesystemMemoryTool. The Go and Ruby SDKs have no memory helper. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F110 | Date: the fetched page text carries no visible last-updated or publication date in its front matter or body, so no last-updated date can be stated from the primary source. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F111 | The memory server README describes the server as a basic implementation of persistent memory using a local knowledge graph, published on npm as @modelcontextprotocol/server-memory. | https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md | 2026-09-03 (last commit to src/memory/README.md, abbbddb2e3) | `VERIFIED` |
| F112 | The graph stores three things. Entities have a unique name, an entityType and a list of observations. Relations are directed connections stored in active voice, each with from, to and relationType. Observations are atomic string facts attached to entities, and can be added or removed independently. | https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md | 2026-09-03 (last commit to src/memory/README.md, abbbddb2e3) | `VERIFIED` |
| F113 | The README lists nine tools: create_entities (entities[]: name, entityType, observations[]); create_relations (relations[]: from, to, relationType); add_observations (observations[]: entityName, contents[]); delete_entities (entityNames[]); delete_observations (deletions[]: entityName, observations[]); delete_relations (relations[]: from, to, relationType); read_graph (no input); search_nodes (query string, searched across entity names, types and observation content); open_nodes (names[]). | https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md | 2026-09-03 (last commit to src/memory/README.md, abbbddb2e3) | `VERIFIED` |
| F114 | The README documents these behaviours. create_entities ignores entities whose names already exist. create_relations skips duplicates and fails if the source or target entity is missing. add_observations fails if the entity does not exist. delete_entities cascades to the entity's relations. open_nodes silently skips non-existent nodes. | https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md | 2026-09-03 (last commit to src/memory/README.md, abbbddb2e3) | `VERIFIED` |
| F115 | The README also documents an MCP Resource, 'knowledge-graph' at memory://knowledge-graph (application/json), which returns the same shape as read_graph. The six mutation tools emit notifications/resources/updated for that URI. | https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md | 2026-09-03 (UTC): last commit to src/memory/README.md (abbbddb2); the resource section was added 2026-06-17 (7b1170d1) | `VERIFIED` |
| F116 | The storage location is configured with the MEMORY_FILE_PATH environment variable, a path to a JSONL file. The README states the default is memory.jsonl in the server directory. The README's Docker examples mount a volume named claude-memory at /app/dist. | https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md | 2026-09-03 (UTC): last commit to src/memory/README.md (abbbddb2) | `VERIFIED` |
| F117 | In source, defaultMemoryPath is memory.jsonl next to the compiled index.js. MEMORY_FILE_PATH, if set, has a leading ~ expanded, and a relative path is resolved against the package directory. A legacy memory.json is migrated to memory.jsonl. The file is JSONL, one line per record, with type 'entity' (name, entityType, observations) or 'relation' (from, to, relationType). Saves write a temp file and rename it into place. | https://github.com/modelcontextprotocol/servers/blob/main/src/memory/index.ts | 2026-09-03 (last commit to src/memory/index.ts, d73f99efbf) | `VERIFIED` |
| F118 | The most recent commit touching src/memory in modelcontextprotocol/servers (as of this query) is d73f99e, dated 2026-09-03: 'fix(memory): serialize graph mutations to prevent concurrent write race (#4555)'. It adds an in-process async mutex around the six mutation methods. | https://api.github.com/repos/modelcontextprotocol/servers/commits?path=src/memory&per_page=1 | 2026-09-03 | `VERIFIED` |
| F119 | RESEARCH (arXiv, Letta/UC Berkeley authors Kevin Lin, Charlie Snell et al.): 'Sleep-time compute' is defined as allowing models to 'think' offline about contexts before queries are presented, anticipating likely queries and pre-computing useful quantities to cut test-time compute. It is evaluated on Stateful GSM-Symbolic and Stateful AIME reasoning tasks. The abstract reports about 5x less test-time compute for the same accuracy, up to 13% (GSM) and 18% (AIME) accuracy gains from scaling sleep-time compute, and 2.5x lower average cost per query when amortised over related queries. It also reports a case study on an agentic SWE task. This is a compute-scaling paper; its abstract does not describe consolidating or editing a persistent memory store. | https://arxiv.org/abs/2504.13171 | 2025-04-17 | `VERIFIED` |
| F120 | RESEARCH: The sleep-time compute paper states that the efficacy of sleep-time compute correlates with the predictability of the user query. | https://arxiv.org/abs/2504.13171 | 2025-04-17 | `VERIFIED` |
| F121 | VENDOR BLOG (Letta): Letta describes sleep-time compute as agents that keep running while idle, using downtime to 'reorganize information and reason through the information they have available in advance'. It says a conversational agent can 'reflect on previous interaction from the user to consolidate information', transforming 'raw context' into 'learned context'. It also states that sleep-time compute 'fundamentally requires stateful AI agents' that maintain memory or context over time. | https://www.letta.com/blog/sleep-time-compute | 2025-04-21 | `VERIFIED` |
| F122 | PRODUCT DOCS (Letta, current docs, undated): Letta agents use MemFS, a git-backed memory filesystem. 'Dreaming' uses background subagents to review recent conversations, consolidate useful lessons and update memory without interrupting active work. It is configured with /sleeptime in the CLI or 'Dream settings' in the app, and runs after a set number of completed agent steps or when the context window is compacted. The 'Agent reviews before applying' option has the agent review and revise proposed memory updates in a second background conversation; this uses more tokens and does not ask the user for approval. Memory updates are committed to MemFS. The /doctor command audits placement, duplication and system-prompt token usage. A memory reorganisation backs up the repository before splitting large files, merging duplicates or restructuring the hierarchy. | https://docs.letta.com/configuration/memory | Undated page; HTTP Last-Modified 2026-10-02; retrieved 2026-10-09 | `VERIFIED` |
| F123 | PRODUCT DOCS (Anthropic, Claude Managed Agents 'Dreams', research preview, gated by beta header dreaming-2026-04-21; example timestamps April 2026): A dream is an asynchronous job that takes an existing memory store plus 1 to 100 past session transcripts, and produces a new, reorganised output memory store. It merges duplicates, replaces stale or contradicted entries with the latest value, and surfaces new insights. The input store is never modified, so the output can be reviewed and discarded. The docs motivate this by saying agent memory writes are local and incremental, so over many sessions a store accumulates duplicates, contradictions and stale entries. | https://platform.claude.com/docs/en/managed-agents/dreams | undated (example created_at 2026-04-29; fetched 2026-10-09) | `VERIFIED` |
| F124 | PRODUCT DOCS (Anthropic Dreams): Recommended usage is as follows. The optional 'instructions' field steers synthesis at a high level, for example focus areas or content to preserve. The pipeline is a synthesis pass, not a text editor, so line-targeted imperative edits generally produce no change; targeted edits should be made through the Memory Stores API on the output store. Dreams run asynchronously and typically take minutes to a few hours depending on the number of transcripts. Statuses are pending, running, completed, failed and canceled. A failed or canceled dream leaves the output store as-is with whatever was written. The output is an ordinary memory store that you either attach to future sessions or discard by deleting or archiving it. A running dream exposes an underlying session whose events can be streamed, and that session is archived when the dream ends. | https://platform.claude.com/docs/en/managed-agents/dreams | undated (example created_at 2026-04-29; fetched 2026-10-09) | `VERIFIED` |
| F125 | VENDOR ANNOUNCEMENT (Anthropic): Dreaming is described as a scheduled process in Claude Managed Agents that reviews agent sessions and memory stores, extracts patterns and curates memories. Developers choose whether it updates memory automatically or lets them review changes before they land. Anthropic frames memory as capturing what an agent learns 'as it works' and dreaming as refining memory 'between sessions', and says it surfaces recurring mistakes, converged workflows and shared team preferences. It launched as a research preview. Customer figures in the announcement, such as Harvey's ~6x completion rate, are vendor-reported test results. | https://claude.com/resources/articles/new-in-claude-managed-agents | 2026-05-19 | `VERIFIED` |
| F126 | PRODUCT DOCS (GitHub): GitHub's Copilot Memory documentation (public preview) describes validation and expiry, not consolidation. Repository-level facts are stored with citations to code and checked against the current branch before use, and only validated facts are used. Any stored fact or preference that goes unused is automatically deleted after 28 days, and the timer may reset when Copilot successfully validates and uses an entry. The page does not describe any background merge, dedup or reorganisation of memories, so the lab should not attribute dreaming or sleep-time behaviour to Copilot Memory. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F127 | GitHub's Copilot Memory documentation labels the feature 'currently in public preview and is subject to change'. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F128 | For enterprise- and organization-managed Copilot subscriptions (Business and Enterprise), Copilot Memory is OFF by default and must be enabled in the enterprise or organization settings. Once enabled, it is on for users by default, and individual users can opt out in their account settings. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | No date shown on page; last commit to the source file in github/docs main: 2026-08-24; read live 2026-10-09 | `VERIFIED` |
| F129 | For individual plans, Copilot Memory is on by default. For enterprise- and organization-managed plans, an administrator must enable the policy first, and then individual users can opt out. Memory is enabled per user, not per repository. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F130 | Enterprise policy: an enterprise admin sets a 'Copilot Memory' policy under the enterprise's AI controls > Copilot > 'Configure features & clients' > Features. Organization policy: an organization owner can enable or disable it for all members with a Copilot license under Organization Settings > Copilot > Policies > Features > Copilot Memory (select Enabled). If the organization belongs to an enterprise, the owner's ability to change it may be controlled by the enterprise-level policy. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | No date shown on page; last commit to the source file in github/docs main: 2026-08-24; read live 2026-10-09 | `VERIFIED` |
| F131 | If a user is assigned a Copilot subscription by more than one organization, the most restrictive setting applies: Copilot Memory is not used unless all of those organizations have enabled it. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | No date shown on page; last commit to the source file in github/docs main: 2026-08-24; read live 2026-10-09 | `VERIFIED` |
| F132 | Repository-level facts can be reviewed and deleted by repository owners/administrators, in the repository's Settings > Copilot > Memory. Facts are created only from actions by users with write access who have Memory enabled, and can only be used in operations on the same repository. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | Undated page; source file last committed 2026-09-25 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F133 | User-level preferences are available only to that user's Copilot interactions. On Copilot Business and Copilot Enterprise plans they can be viewed/exported and deleted by an organization or enterprise administrator, in bulk or per user. Users can also view and delete their own preferences on any plan. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F134 | User-level preferences are owned by the billing entity (the organization or enterprise granting the license). A memory is stored against the user's active billing entity, and only memories owned by the current active billing entity are retrieved. Users with multiple licenses must select a default billing entity to generate preferences. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F135 | Admins export user-level preferences in JSONL format, for everyone ('Get usage report' > 'Download user memories') or per user ('Export Copilot memories'). Organization path: Settings > Copilot > Access. Enterprise path: Billing and licensing > Licensing > Copilot Manage. Delete uses 'Delete user memories' (bulk) or 'Delete Copilot memories' (per user). Existing exports are reused for a two-hour window, and exports are limited to 10 per hour. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | Undated page; source file last committed 2026-08-24 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F136 | Retention: any stored fact or preference that goes unused is automatically deleted after 28 days. The timer may reset whenever Copilot successfully validates and uses an entry. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F137 | Audit logging: events appear in the organization or enterprise audit log when an administrator exports or deletes memories, and when a user opts out of Copilot Memory. The page does not state that other memory events (for example, creation of individual memories) are logged. | https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator | Undated page; source file last committed 2026-08-24 in github/docs; retrieved 2026-10-09 | `VERIFIED` |
| F138 | Surfaces: Copilot Memory is used by Copilot cloud agent, Copilot code review, Copilot CLI and agentic autofix. Code review uses repository-level facts only, while Copilot CLI applies repository facts plus the initiating user's preferences. Facts captured by one feature can be used by another. The page does not mention VS Code or github.com chat as surfaces. | https://docs.github.com/en/copilot/concepts/agents/copilot-memory | undated page (no on-page date); source file last changed 2026-09-25 (github/docs commit 18d99623f4); retrieved 2026-10-09; feature is public preview | `VERIFIED` |
| F139 | Anthropic's memory tool documentation says the memory tool operates client-side: Claude requests file operations and the application executes them against storage the developer controls; memory lives entirely in the application. Retrieved 2026-10-09; the page shows no last-updated date. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 (server Date header 09 Oct 2026 19:18:25 GMT) | `VERIFIED` |
| F140 | Anthropic's memory tool docs, under 'Security considerations', state that the application executes every file operation Claude requests, so the safeguards are the developer's responsibility. They list four: sensitive information, file storage size, memory expiration, and path traversal protection. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F141 | Anthropic's memory tool docs on sensitive information: 'Claude usually refuses to write sensitive information to memory files. For stronger guarantees, add validation that strips sensitive data before your handler writes the file.' | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F142 | Anthropic's memory tool docs on size limits: developers should track memory file sizes and cap how large a file can grow, and should consider capping how many characters the view command returns, letting Claude page through the rest with view_range. The docs add that Claude's tool description truncates the text view of files longer than 16,000 characters, and that files over 999,999 lines should return an error. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F143 | Anthropic's memory tool docs on expiration: developers should periodically delete memory files that haven't been accessed in a long time. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F144 | Anthropic's memory tool docs carry a Warning that a malicious path such as /memories/../../secrets.env can reach files outside /memories, and that the implementation must validate every path in every command. Recommended safeguards: validate that paths start with /memories, resolve to canonical form, reject ../ and ..\ sequences, and watch for URL-encoded traversal (%2e%2e%2f). | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F145 | Anthropic's memory tool docs say the SDK memory helpers let developers back memory with their own storage, such as files on disk, a database, cloud storage, or encrypted files. This is the only encryption mention found, and it is a storage option, not a built-in control. The page links to 'API and data retention' for how zero data retention (ZDR) applies to the feature. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F146 | The Anthropic memory tool page, as retrieved 2026-10-09, contains no section on prompt injection or memory poisoning. Its security guidance is limited to sensitive information, file size, expiration and path traversal. | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool | No date shown on the page; retrieved 2026-10-09 | `VERIFIED` |
| F147 | The README for the MCP reference memory server (@modelcontextprotocol/server-memory) describes a local knowledge graph (entities, relations, observations) persisted to a JSONL file. The path is set by MEMORY_FILE_PATH, defaulting to memory.jsonl in the server directory. The README text I retrieved contains no statement on size limits, sensitive-data handling, prompt injection or memory poisoning, encryption, or access control. Last commit to this README per the GitHub API: 2026-09-03. | https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/memory/README.md | last commit 2026-09-03; retrieved 2026-10-09 | `VERIFIED` |
| F148 | The README for the MCP reference memory server says the memory prompt's categories and update frequency depend on the use case: 'Changing the prompt will help the model determine the frequency and types of memories created.' It also gives an example personalization prompt that stores basic identity (age, gender, location, job title, education level), behaviors, preferences, goals and relationships. The README adds no privacy caution to that example. | https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/memory/README.md | last commit 2026-09-03; retrieved 2026-10-09 | `VERIFIED` |
| F149 | The MCP servers repository's SECURITY.md says the servers in the repository are reference implementations that demonstrate MCP features and SDK usage. It calls them 'educational examples' and 'not ... production-ready solutions', and says the repository is not eligible for security vulnerability reporting (SDK vulnerabilities go to the relevant SDK repository). Retrieved 2026-10-09. | https://raw.githubusercontent.com/modelcontextprotocol/servers/main/SECURITY.md | last commit 2026-02-18; retrieved 2026-10-09 | `VERIFIED` |
| F150 | Claude Code docs: CLAUDE.md and auto memory are loaded as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook. 'Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer.' | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F151 | Claude Code docs on size limits: the first 200 lines or 25KB of auto-memory MEMORY.md (whichever comes first) load at the start of every conversation, and content beyond that is not loaded at session start. A CLAUDE.md up to 4 MiB loads in full, and a larger file is skipped. The docs recommend under 200 lines per CLAUDE.md because longer files consume more context and reduce adherence. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F152 | Claude Code docs on auto memory storage and retention: it is on by default in local sessions and stored per project at ~/.claude/projects/<project>/memory/ as plain markdown. It is machine-local and not shared across machines or cloud environments. Old session transcripts are deleted after cleanupPeriodDays, but memory files are excluded from that sweep and persist until edited or deleted by the user or Claude. Users can toggle it with /memory, autoMemoryEnabled, or CLAUDE_CODE_DISABLE_AUTO_MEMORY=1. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F153 | Claude Code docs on admin controls: organizations can deploy a managed-policy CLAUDE.md (macOS /Library/Application Support/ClaudeCode/CLAUDE.md, Linux/WSL /etc/claude-code/CLAUDE.md, Windows C:\Program Files\ClaudeCode\CLAUDE.md) that individual settings cannot exclude. The managed `claudeMd` key is honored only in managed and policy settings. The 'Project instructions' setting value `managed-only` loads only the organization's managed CLAUDE.md plus auto memory at launch. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F154 | Claude Code docs: imports in a project-level memory file that resolve outside the working directory trigger an approval dialog on first encounter, 'to protect you from files other people commit to a shared project'. Symlinks in .claude/rules/ pointing outside the working directory are treated like external imports. Network-path symlinks (UNC, /net, /Network) are not followed. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F155 | Claude Code docs: the autoMemoryDirectory setting can be set in any settings scope. A project settings file's value is honored under the same workspace trust rule as hooks in settings files. While permissions.blockReadsOutsideWorkingDirectories is on, Claude Code loads no auto memory from, and saves none to, a directory chosen by a repository-supplied settings file. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F156 | The Claude Code memory page, as retrieved 2026-10-09, contains no statement on encryption of memory files and no explicit prompt-injection or memory-poisoning warning for CLAUDE.md or auto memory. Its safeguards are the external-import approval dialog, the workspace-trust rule and managed policy. | https://code.claude.com/docs/en/memory | Undated (page shows no date); retrieved 2026-10-09 | `VERIFIED` |
| F157 | Codex AGENTS.md guide: Codex concatenates AGENTS.md files from the project root down to the working directory and stops adding files once the combined size reaches project_doc_max_bytes, 32 KiB by default. It says to 'Raise the limit or split instructions across nested directories when you hit the cap'. At most one file per directory is included, and empty files are skipped. | https://learn.chatgpt.com/docs/agent-configuration/agents-md | Undated page; verified live 2026-10-09 (Last-Modified header 2026-10-09T19:05:09Z appears to be a site build time, not a content date) | `VERIFIED` |
| F158 | Codex memories documentation says to keep required team guidance in AGENTS.md or checked-in documentation and to treat memories 'as a helpful recall layer, not as the only source for rules that must always apply'. Local Codex memories are off by default and enabled via Settings > Personalization or [features] memories = true. They are stored under ~/.codex/memories/ as generated state. | https://learn.chatgpt.com/docs/customization/memories?surface=app | Undated page; verified live 2026-10-09 | `VERIFIED` |
| F159 | Codex memories documentation on privacy: 'Don't store secrets in memories.' Codex redacts secrets from generated memory fields but the user should still review memory files before sharing the Codex home directory. Codex skips active or short-lived sessions when generating memories. | https://learn.chatgpt.com/docs/customization/memories?surface=app | Undated page; verified live 2026-10-09 | `VERIFIED` |
| F160 | Codex memories documentation on controls: /memories sets per-chat use and generation of memories; 'Allow memories from tool-assisted chats' and memories.disable_on_external_context (when true, chats that used MCP tool calls, web search or tool search are kept out of memory generation) control external-context inputs; 'Delete Codex memories' resets the selected machine's memory store. memories.generate_memories and memories.use_memories toggle generation and injection. The page does not state encryption of the memory store and does not use the terms prompt injection or memory poisoning. | https://learn.chatgpt.com/docs/customization/memories?surface=app | Undated page; verified live 2026-10-09 | `VERIFIED` |

### Verifier caveats

Where the verifier's finding is narrower, broader or otherwise different from the claim it graded,
the limit is recorded here, and it is honoured wherever that claim is used in 3.1 to 3.6. A row not
listed here was graded without qualification. Ten of these notes were themselves returned truncated;
those are marked, and the claims they attach to are used conservatively.

- F3 — this is the concept page's own list of features. It is not evidence that other clients cannot use Copilot Memory.
- F7 — the concept page is internally inconsistent: one bullet says administrators can view and delete, the detailed subsection says export or delete. The claim follows the detailed subsection.
- F9 — "individual plans" is the concept page's wording. The personal how-to narrows default-on to a *paid* individual plan, and no page says Copilot Free or Student has it on by default.
- F12 — the settings URL appears on the concept page only as the link target of the words "personal settings", never as visible text, and the verifier did not open the login-gated page. That deletion happens under Memory in personal settings is stated on the how-to page, not on the cited page.
- F14 — the enterprise steps name no role. "Enterprise admins" maps to the page's audience box, which reads "Enterprise, organization, or repository administrators".
- F15 — graded as the content of the 2026-03-04 announcement, not as current behaviour. The live docs still say public preview, add user-level preferences that are not repository-scoped, tie the 28 days to unused entries, and use the name Copilot cloud agent.
- F18 — the 200-line automatic load applies to VS Code *user* memory only.
- F19 — "update or remove the local memory" is step 4 of the page's workflow for promoting repository memory into shared docs, not free-standing advice.
- F21 — a revision of the page before 2026-09-17 said deleting individual memory files was not yet supported. The current revision, which the claim matches, supersedes that.
- F23 — truncated note. A statement of silence about the current page only. It is not proof that no enabling setting exists: until the 2026-09-16 revision the same page carried a preview banner and documented an experimental `chat.tools.memory.enabled` setting, both removed by a docs commit on 2026-09-17.
- F24 — truncated note. The word "cloud" is not on GitHub's concept page; it comes from VS Code source. The note also flags that the VS Code 1.109 release notes of 2026-02-04 still document a since-removed Copilot Memory bridge.
- F25 — the same plan caveat as F9: default-on is worded "individual plans" here and "paid, individual Copilot plan" on the how-to.
- F26 — "documented as" means the GitHub page's list. Read F3 and F24 before treating it as exhaustive.
- F28 — "available only to that user" means usable in that user's Copilot interactions. On Business and Enterprise plans an administrator can still export and delete those preferences, so this is not a privacy guarantee.
- F30 — truncated note. The final sentence is not on the cited concept page but on the linked how-to, and GitHub's plan wording varies across its own pages: "individual plans", "paid, individual Copilot plan", "Pro and Pro+", and "Pro, Pro+ or Max".
- F31 — truncated note. The source of record is the concept page. The settings URL is a link target the verifier did not open, and the cited how-to supports only the first sentence.
- F32 — the cited page's source changed on the day of retrieval; the verifier notes that this page moves frequently.
- F34 — the page calls these "approval kinds" rather than "permission request kinds". The meaning is the same.
- F43 — the claim narrows the sync default from the page's "CLI or the GitHub Copilot app" to the CLI alone. Narrower, not contradictory.
- F44 — the `--older-than` and `--dry-run` flags rest on the chronicle page alone; the verifier did not find them in the command reference.
- F45 — one line in the CLI reference's picker-shortcuts section contradicts that reference's own flag table about what opens the picker. The cited page and the flag table agree with the claim.
- F46 — the reference co-lists `/sessions` in the same entry with identical syntax and does not use the word "alias" for it.
- F47 — grades the README text as fetched and nothing more. It is a statement of silence, and no README commit date was checked, so the date given is the fetch date.
- F49 — the parenthetical naming the cloud agent as the coding agent is not on the concept page; it rests on a GitHub changelog of 2026-04-01 recording the rename.
- F51 — the CLI bullet describes interactive use. The command reference documents `--enable-memory` as disabled by default, so a non-interactive prompt-mode run does not use memory unless that flag is passed.
- F56 — "individual plans" means paid individual plans per the page's plan gate. A January 2026 GitHub engineering post calling the feature opt-in is superseded by the current docs.
- F57 — the concept page omits the word "paid"; this claim follows the cited how-to, which includes it.
- F59 — the claim's sentence is on the concept page named in this row's URL cell, but the
  parenthetical navigation path and the "administrators" label are not: they are published on the
  administrator how-to page, which this row does not cite. The path is sourced at F11, which cites a
  how-to page. GitHub's two pages also disagree on the role label: the concept page says repository
  owners, the administrator how-to says repository administrators, and administrator is the more
  precise label. Cite F11 for the path; cite this row only for the sentence.
- F61 — stated under the Business and Enterprise heading only; the page says nothing about ownership of preferences on individual plans. The claim also compresses "multiple licenses from different places".
- F62 — export and delete are scoped to preferences generated with that organization or enterprise as the user's active billing entity.
- F66 — the figure of 88 nested files is the site's own undated snapshot; the verifier did not count the repository.
- F69 — verifies what the FAQ says, not the behaviour of any particular tool.
- F71 — the compatibility list is the site's own statement. No tool was tested.
- F72 — the five named projects are illustrative, not an exhaustive list of contributors.
- F73 — the push date is a moving value, read on 2026-10-09, and the repository creation date is older than twelve months. See Source currency.
- F79 — scoped to local sessions. Sessions in a self-hosted environment default to auto memory off, and the toggle cannot turn it on in background sessions or in sessions started by another Claude Code session.
- F82 — the modified timestamp is written only when the memory file already begins with YAML frontmatter. Claude Code never adds frontmatter to a file that has none, so such files get no timestamp.
- F84 — no sentence on the cited memory page names the managed `claudeMd` key itself as non-excludable. The grade rests on a combined reading with the settings reference, a page the cited URL does not cover.
- F85 — the page's discovery section hedges the per-session point with "usually"; its verification section states the same thing unhedged.
- F89 — the page's phrase is "external context such as MCP tool calls, web search, or tool search"; the claim names only a subset of it. The Settings path described is the ChatGPT desktop app's.
- F90 — the page's next sentence is conditional, "When applied". Three of the four rule modes are selective, so not every rule is applied to every request.
- F92 — "by hand" is the claim's gloss on authoring the file yourself; the page also offers a settings path. "Rules are checked into git" is the page's recommendation and applies to Project Rules, not to User or Team Rules.
- F94 — the closing clause is a statement of silence about that one page. The page does let Copilot cloud agent generate the repository-wide file on request, which is user-triggered generation rather than a memory store. Scope: this is the github.com variant, where path-specific instructions are documented for Copilot cloud agent and Copilot code review.
- F95 — the page is internally inconsistent about the custom-instructions toggle, placing it in a personal setting in one place and in repository settings in another. Cloud-agent generation is documented here only for the repository-wide file.
- F98 — "no input schema is defined" is the developer-side statement. Anthropic defines the schema and the application executes the tool, so this is not a claim that the tool takes no input.
- F99 — a statement about how the current page labels the tool. The beta history, including a launch on 2025-09-29, comes from release notes rather than from the cited page. See Source currency.
- F102 — the page presents these as recommended behaviours and return strings, not a mandated protocol: Claude reads whatever text the tool result contains.
- F103 — returning an error when the file already exists is the reference behaviour; overwriting instead is a valid implementation choice.
- F105 — these are recommendations addressed to the developer. The page is explicit that the safeguards are the application's responsibility; none of them is built in.
- F106 — the page shows the backslash traversal pattern with a doubled backslash in both its markdown and its rendered HTML. The claim treats it as an escaped single backslash, which the page does not state.
- F107 — truncated note. The claim restates the memory-tool page. The vendor's own compaction documentation splits compaction into two kinds, both marked beta.
- F109 — truncated note. The SDK cross-check was a code search over indexed commits, not an inspection of each file.
- F112 — atomicity of observations is a README guideline, not something the implementation enforces. Graded as the README's description of the data model.
- F114 — for `open_nodes` the README and the implementation disagree on which relations come back: the README says relations between the requested entities, the source returns relations with at least one endpoint in the requested set.
- F115 — the implementation sends the resource-updated notification only to clients that have subscribed.
- F117 — the legacy migration happens only when the environment variable is unset, the old file exists and the new one does not. The claim omits those conditions.
- F118 — "the most recent commit" is a moving fact, checked on 2026-10-09.
- F119 — truncated note. The final sentence is scoped to the paper's abstract; the paper's body implements the sleep-time step with a memory-block rewrite, so it is not evidence that the work is unrelated to memory stores. The source is older than twelve months.
- F120 — the source is older than twelve months.
- F121 — a vendor blog about its own product. Accurate as to what Letta says; not independent confirmation that the technique works as described. The source is older than twelve months.
- F122 — the page frames the two triggers as a user choice rather than as fixed behaviour.
- F123 — a research preview, gated behind a dated beta header, on a page that carries no publication date.
- F124 — truncated note. Graded as the page read on 2026-10-09; the feature is a research preview.
- F125 — the customer figure is that customer's own test relayed in the vendor's announcement, with no independent confirmation. The verifier also corrected the publication date to 2026-05-19.
- F126 — truncated note. The claim's final clause is an editorial directive rather than something the source says, and page silence alone would not prove that no consolidation exists.
- F128 — the plan parenthetical is not in the page body; it comes from the page's audience box.
- F130 — the enterprise steps name no role; the audience box supplies it.
- F132 — the concept page named in this row's URL cell carries the creation-by-write-access and
  same-repository statements and the sentence that repository owners can review and delete
  repository-level facts. It does **not** publish the `Settings > Copilot > Memory` navigation path
  or the "administrators" role label that the claim also carries; those are on the how-to pages —
  the path at F11, the administrator label on the administrator how-to. Anyone citing this row for
  the path would cite the wrong page: cite F11 instead.
- F133 — the claim fuses "viewed" and "exported". The documented administrator mechanisms are export and delete, scoped to the active billing entity.
- F134 — stated under the Business and Enterprise heading; the page says nothing about ownership of preferences on individual plans.
- F135 — export and delete are limited to preferences generated with that organization or enterprise as the active billing entity.
- F137 — the second sentence describes what the page does not say, not what GitHub does or does not log.
- F138 — the four-surface list is page-scoped. The verifier notes a separate GitHub reference page marking Copilot Memory unsupported for IDEs, the GitHub Copilot app and Copilot Chat on github.com, and a 2026-08-11 changelog announcing memory in JetBrains agent chat. Neither is a graded claim here, so neither is stated below.
- F142 — the 16,000-character truncation and the 999,999-line error are in the page's view-command specification, not in its security section.
- F144 — the page's list of traversal patterns is illustrative, and a fifth recommended safeguard, using the language's own path utilities, is not in the claim.
- F145 — encryption appears only as one storage option a developer may choose, not as a built-in control.
- F146 — a statement of silence about that page as retrieved on 2026-10-09. It is not evidence that the vendor publishes nothing on prompt injection or memory poisoning elsewhere.
- F147 — the absence statement is scoped to the README text only.
- F148 — the claim compresses two adjacent README sentences, and the absence of a privacy caution is a statement about that README.
- F152 — the storage path is the default and is configurable, and self-hosted sessions default to auto memory off.
- F156 — truncated note. It verifies that one page only; other vendor pages were not searched, and the closing characterisation of three mechanisms as "safeguards" is the researcher's wording, not the page's.
- F157 — vendor pages disagree on whether the byte cap is per file or a combined budget across the chain. The guide's "combined" wording is the one that matches the published implementation.
- F158 — the page says the *main* memory files live under that directory; the claim drops "main". Prefer the page's wording.
- F160 — the negative assertions about encryption, prompt injection and memory poisoning were established by full-text search of that page only.

### Source currency

Today is 2026-10-09. A source published before 2025-10-09 is older than twelve months and is flagged
here by F-number. Every row's Published cell states the basis for its own date, so any single row can
be re-checked without this subsection.

**Older than twelve months — three rows.** F119 and F120 rest on an arXiv paper published
2025-04-17; F121 on a vendor blog post published 2025-04-21. All three concern sleep-time compute
(3.5). Treat them as the origin of an idea, not as a description of any current product.

**A pre-cutoff date alongside a current one — two rows.** F73 reports a source repository created
2025-08-19 and last pushed 2026-09-10; only the creation date is old, and the push date is a moving
value. F99 reports a page read on 2026-10-09 whose beta history includes a launch on 2025-09-29.

**Pages carrying no publication or last-updated date — 127 of the 160 rows.** A row counts here when
its own Published cell records the page as undated or as showing no date, so the figure can be
recomputed from the table at any time rather than taken on trust. This is the dominant
currency risk in this slice, and it is not the same risk as staleness. For GitHub Docs rows the
rendered page is undated and the date given is the last change to the page's source file in the
`github/docs` repository. For the AGENTS.md site the date is its source repository's HEAD commit.
For Anthropic's Claude Code pages, Anthropic's platform pages, Anthropic's dreaming pages, OpenAI's
Codex pages and Cursor's pages, no date is published at all and currency rests on the retrieval date
of 2026-10-09, or on an HTTP header where one exists. A reader cannot tell from those pages when the
behaviour they describe last changed.

**Everything in this slice is a snapshot of 2026-10-09**, and several of the features it describes
are explicitly provisional: GitHub's Copilot Memory is in public preview and subject to change
(F1, F48, F127), and Anthropic's dreaming is a research preview behind a dated beta header (F123).
A lab that teaches any of them should be re-checked against these URLs before it ships.

### Source concentration

The 160 rows above cite **30 distinct source URLs**. The distribution is uneven by construction: the
research was decomposed by sub-question, several sub-questions reached the same page, and where two
researchers reported the same proposition it was graded again rather than dropped. Those
restatements are kept as separate rows, so the row count measures graded statements and the figures
below measure evidence.

The five most-cited pages, with the number of rows resting on each:

- **38 rows** — `https://docs.github.com/en/copilot/concepts/agents/copilot-memory`
- **23 rows** — `https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool`
- **18 rows** — `https://code.claude.com/docs/en/memory`
- **10 rows** — `https://agents.md/`
- **9 rows** — `https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator`

The remaining 25 URLs carry **62 rows** between them, so 38 + 23 + 18 + 10 + 9 + 62 = 160.

The restatement is concentrated in a few propositions, each graded more than once from the same
page. The wording that an *unused* entry is automatically deleted after 28 days appears in five rows
(F8, F29, F55, F126, F136); the phrase "public preview" in six (F1, F15, F24, F48, F126, F127); the
four-feature surface list in five (F3, F24, F26, F49, F138); billing-entity ownership of user-level
preferences in three (F7, F61, F134); and "enabled per user, not per repository" in three (F9, F30,
F129). At a larger grain, F25–F31 restate F2–F12, F48–F62 are a third pass over the same concept
page, F139–F146 restate F96–F110, and F150–F156 restate F74–F84.

Two consequences for anyone citing this slice. First, a proposition that appears in five rows is not
five times better supported than one that appears in one row; it is one page, read five times. The
right citation is one row, not the cluster. Second, the concentration marks where this slice is
fragile: 38 rows, and much of §3.1 and §3.6, stand or fall with a single public-preview page that
carries no publication date of its own.

### Surface index

Every row in the table above is attributed below to the surface it describes and, where the cited
page states one, to the plan or availability tier. Each F-number appears exactly once across the 19
surfaces.

**GitHub Copilot Memory — the service itself** — github.com-hosted service, public preview; the plan gate on the cited pages reads "all paid Copilot plans"; on by default for individual plans, admin-enabled for organization- and enterprise-managed plans.
F1, F2, F5, F6, F8, F9, F25, F28, F29, F30, F48, F50, F52, F53, F54, F55, F56, F126, F127, F129, F136

**GitHub Copilot Memory — which surfaces use it** — Copilot cloud agent (the coding agent), Copilot code review, Copilot CLI and agentic autofix, as the concept page lists them; one row in this group is a Pro and Pro+ announcement snapshot rather than a statement of current behaviour.
F3, F4, F15, F24, F26, F27, F49, F51, F138

**GitHub Copilot Memory — governance and administration** — github.com organization and enterprise settings; Copilot Business and Copilot Enterprise.
F7, F13, F14, F31, F58, F60, F61, F62, F128, F130, F131, F133, F134, F135, F137

**GitHub Copilot Memory — repository settings on github.com** — repository owners and administrators; repository-level facts only.
F11, F59, F132

**GitHub Copilot Memory — personal settings on github.com** — any Copilot plan for viewing and deleting your own preferences; enablement differs by plan.
F10, F12, F57

**VS Code — the local memory tool** — a separate, file-based mechanism stored on the user's machine; the cited pages state no plan restriction.
F16, F17, F18, F19, F20, F21, F22, F23

**Copilot CLI — memory flags, permissions and slash commands** — the CLI client; no plan tier stated on the cited pages.
F32, F33, F34, F35, F36, F37, F38, F39, F47

**Copilot CLI — local session data, the session store and session deletion** — the CLI client and the local ~/.copilot directory; session syncing is governed by a Business and Enterprise policy.
F40, F41, F42, F43, F44, F45, F46

**AGENTS.md — the published format** — tool-agnostic repository files; no plan or tier.
F63, F64, F65, F66, F67, F68, F69, F70, F71, F72, F73

**Claude Code — CLAUDE.md, rules and auto memory** — Anthropic's CLI surface; organization controls via managed settings.
F74, F75, F76, F77, F78, F79, F80, F81, F82, F83, F84, F150, F151, F152, F153, F154, F155, F156

**OpenAI Codex — AGENTS.md discovery and local Codex memories** — Codex local clients and the ChatGPT desktop app; no plan tier stated on the cited pages.
F85, F86, F87, F88, F89, F157, F158, F159, F160

**Cursor — rules as persistent context** — Project, User and AGENTS.md rules on any plan; Team Rules on Team and Enterprise plans.
F90, F91, F92, F93

**GitHub Copilot repository custom instructions on github.com** — repository files, not an automatically written memory store; path-specific instructions on github.com are documented for Copilot cloud agent and Copilot code review.
F94, F95

**Anthropic Claude Developer Platform — the memory tool** — API feature executed client-side by the developer's own application; available on all Claude 4 and later models.
F96, F97, F98, F99, F100, F101, F102, F103, F104, F105, F106, F107, F108, F109, F110, F139, F140, F141, F142, F143, F144, F145, F146

**Model Context Protocol — the reference memory server** — @modelcontextprotocol/server-memory, a reference implementation, not a production-ready solution.
F111, F112, F113, F114, F115, F116, F117, F118, F147, F148, F149

**Research — sleep-time compute** — an arXiv paper, not a product surface.
F119, F120

**Letta — vendor blog on sleep-time compute** — vendor writing about its own platform; not a Copilot surface.
F121

**Letta — product documentation on dreaming and MemFS** — the Letta platform and CLI; not a Copilot surface.
F122

**Anthropic Claude Managed Agents — dreaming** — research preview, beta-header gated; not a Copilot surface.
F123, F124, F125

### 3.1 GitHub Copilot's own memory features, surface by surface

Two different things in this ecosystem are called memory, and conflating them is the single most
likely way for a lab to go wrong.

**The cloud feature: GitHub Copilot Memory.** It is in public preview and subject to change
(F1, F48, F127). It stores two kinds of entry: *repository-level facts* — coding conventions,
architectural decisions, build commands, project-specific rules — and *user-level preferences*,
implied or stated personal preferences about how a user wants to interact with Copilot (F2, F50).
Repository facts are stored with citations to supporting code; when a fact looks relevant Copilot
checks those citations against the current branch, and only validated facts are used. Facts can
also be captured from pull requests closed without merging, and validation is what keeps those from
taking effect unless the current codebase still substantiates them (F52). They are created only in
response to actions by users with *write access* who have Memory enabled, are then available to any
user with Memory access in that repository, and can only be used in operations on the same
repository (F5, F53, F132 — F132 carries these two statements from the concept page it cites; the
navigation path in that same row does not come from that page, and is cited at F11 below).
User-level preferences are stored with citations that may include direct user quotes, are created
only from that user's own interactions, and are used only in that same user's later interactions,
across repositories (F6, F54, F28, F50).
"Available only to that user" means usable in that user's Copilot interactions; on Business and
Enterprise plans an administrator can still export and delete them (F28 caveat, F60), so it is not
a privacy guarantee and a lab must not present it as one.

**Retention is uniform and short.** Any stored fact or preference that goes *unused* is
automatically deleted after 28 days, and the 28-day timer may reset whenever Copilot successfully
validates and uses an entry (F8, F29, F55, F136). The shorter form "memories expire after 28 days"
appears in the 2026-03-04 changelog (F15) but the current documentation is the narrower, unused-entry
wording.

**Enablement is per user, not per repository.** Once enabled it applies in any repository where that
user works with Copilot. For individual plans it is on by default; for organization- and
enterprise-managed plans an administrator must enable the policy first, after which individual users
can opt out (F9, F30, F56, F129). The plan boundary is the one place GitHub's own pages differ:
the concept page says "individual plans", the personal how-to says "a paid, individual Copilot
plan", and the 2026-03-04 changelog says Pro and Pro+ (F9, F25, F30, F56 caveats). No cited page
says Copilot Free or Student has it on by default, and this spec does not claim either way.

**Which surfaces use it.** The concept page lists exactly four: Copilot cloud agent, Copilot code
review, Copilot CLI and agentic autofix; and it says facts and preferences captured by one of them
can be used by another, giving cloud agent and code review as the worked example (F3, F26, F49,
F138). Copilot cloud agent is the coding agent (F49, whose parenthetical rests on a changelog
rename rather than on the concept page). The two surface-specific limits are stated plainly:
**Copilot code review uses repository-level facts only, and user-level preferences are not applied
during code review**; **Copilot CLI applies repository-level facts plus the user-level preferences
of the user who initiated the operation** (F4, F27, F51). The CLI limit has an important edge: the
command reference documents `--enable-memory`, "Enable memory in prompt mode (disabled by default)"
(F32), so a non-interactive prompt-mode run does not use memory unless that flag is passed
(F51 caveat).

The concept page does not list Copilot Chat on github.com, and does not mention VS Code (F3, F24,
F138). That is the page's own list and page-scoped silence; it does not establish that other clients
cannot use the feature (F3, F26, F138 caveats). What *is* established about github.com chat is
carried as an open question (Q11).

**Managing and deleting it, by surface.** In **repository settings on github.com**, repository
owners can review and manually delete the repository-level facts stored for their repository
(F59, F132), and the navigation path is Settings then Copilot then Memory — published on the how-to
page cited at F11, not on the concept page that F59 and F132 cite, so F11 is the row to cite for the
path (F59, F132 caveats). GitHub's two pages disagree on whether the role is owner or administrator,
and administrator is the more precise label (F59 caveat). In **personal
settings on github.com**, users can view and delete their own user-level preferences regardless of
their Copilot plan, under Features then Copilot Memory, and the concept page links
`github.com/settings/copilot/memory` as the target of the words "personal settings" (F6, F10, F12,
F31, F57, F60) — that URL is a link target the verifier did not open (F12, F31 caveats).

**VS Code: a separate, local, file-based mechanism.** The built-in memory tool lets agents save and
recall notes as they work, and a user can explicitly ask the agent to remember something; user,
repository and session memory are all stored locally on the user's machine (F16, F22). There are
three scopes: user memory at `/memories/` persists across sessions and workspaces; repository
memory at `/memories/repo/` persists across sessions but is workspace-scoped; session memory at
`/memories/session/` is the current conversation only and is cleared when it ends (F17, F22). The
first 200 lines of **user** memory are loaded into the agent's context at the start of every session
(F18, and that limit is user memory only — F18 caveat). Memory is separate from the conversation
context a session accumulates automatically (F22). You store a memory by asking in natural language;
the agent decides the scope and creates or updates the file, and the Plan agent uses session memory
to persist its plan in `plan.md` (F20). Management is two commands — "Chat: Show Memory Files" and
"Chat: Clear All Memory Files" — and to update or delete an individual file you ask the agent (F21;
an earlier revision of that page said individual deletion was not yet supported, and the current
revision supersedes it — F21 caveat). The page is explicit that all these scopes are local, that
repository memory is associated with the workspace but is *not* a shared project file, that reviewed
team guidance belongs in source-controlled docs or custom instructions, and that stale local memory
should be updated or removed (F19, whose last clause is step 4 of a promotion workflow — F19 caveat).
The page states no plan restriction, no enabling setting and no time-based retention, documenting
only manual removal apart from session memory (F23) — a statement of silence about the current page,
not proof that no enabling setting exists (F23 caveat).

The record keeps the two apart: GitHub's cloud Copilot Memory is used by the cloud agent, code
review, CLI and agentic autofix, and VS Code is not among those surfaces, while VS Code's own user,
repository and session memory are stored locally (F24, with its caveats).

**Copilot CLI.** Memory appears in the CLI as flags, permissions and slash commands. The command
reference documents `--enable-memory` (F32); a `memory` permission kind, "Storing facts to agent
memory", usable in tool permission patterns, together with the rule that only the root agent can
call `store_memory` or `vote_memory` while subagents keep read access through `read_memories` but
cannot write or vote (F33); and the configuration directory reference lists `memory` as an approval
kind that approves memory write and vote requests (F34). The CLI changelog gives the feature's
history: repo memories injected in the prompt and a memory storage tool added in v0.0.384
(2026-01-16); `store_memory` included only when memory is enabled for the user in v0.0.385
(2026-01-19); subject, fact and citations shown in the timeline in v0.0.411 (2026-02-17);
`vote_memory` throttled in v1.0.55 (2026-05-28); and memory context refreshed after 30 minutes in
long-lived sessions in v1.0.71 (2026-07-16) (F37). A persistent `/memory` slash command to enable,
disable or view memory status arrived in v1.0.49 (2026-05-18), along with permission prompts that
name who can see a stored memory and timeline entries that show the scope (F35), and v1.0.51
(2026-05-20) made `/memory show` display documentation links (F36). Session and memory import
commands for a semantic JSONL interchange format arrived in v1.0.85 (2026-09-16), and SDK clients
could configure session memory through `session.create` and `session.resume` from v1.0.62
(2026-06-13) (F38). A separate line of work — cross-session memory and `/chronicle` — was
experimental in v0.0.412 and v0.0.419 (2026-02-19 and 2026-02-27) and became available to all users
in v1.0.40 (2026-05-01) (F39). The `github/copilot-cli` README itself says nothing about memory,
session storage, session history or `/chronicle`, and points to the official docs (F47, a statement
of silence about the README text — F47 caveat).

**Copilot CLI session data is a second, bigger store, and it is not Copilot Memory.** The CLI keeps
configuration, session history, logs and customizations in one directory, `~/.copilot` by default.
`session-state/` holds session history by session ID, with an `events.jsonl` event log and workspace
artifacts (plans, checkpoints, tracked files), and is what makes `--resume` and `--continue` work;
deleting it removes the ability to resume past sessions (F40, F45). `session-store.db` is a SQLite
database for cross-session data such as checkpoint indexing and search; it is auto-managed,
re-created if deleted, and rebuildable with `/chronicle reindex`, which also syncs session data to
the account, while `command-history-state/` holds command history for reverse search (F41). By
default, locally-run CLI sessions are synced to the user's GitHub account, controlled by the
`remote` and `remoteExport` settings; for Business and Enterprise users the "Store local sessions in
the Cloud" policy must be at least "View from cloud" for syncing, and if it is disabled or
unconfigured sessions are stored locally only; synced data is accessible only to the user by default
(F43, which narrows the page's "CLI or the GitHub Copilot app" to the CLI — F43 caveat). Deleting
files under `session-state/` removes local copies only; synced sessions are stored separately and
can be deleted or hidden from GitHub.com (F42). The deletion commands are `/session delete`,
`/session delete SESSION-ID`, `/session delete-all --yes` and `/session prune --older-than DAYS`
with a `--dry-run` preview; `delete-all` and `prune` affect only local sessions, deleting a synced
session asks whether to delete the remote copy, and manual deletion of the directory requires a
manual `/chronicle reindex` (F44, whose flag detail rests on one page — F44 caveat). The command
reference lists `/chronicle` with standup, tips, improve, reindex and skills subcommands as session
history tools, and `/session` with info, checkpoints, files, plan, rename, cleanup, prune, delete
and delete-all (F46, which co-lists `/sessions` — F46 caveat).

### 3.2 File-based memory stores and persistent instruction files

**AGENTS.md, as its own site publishes it.** It is "a simple, open format for guiding coding agents"
and "a README for agents": a dedicated, predictable place to put the context and instructions an AI
coding agent needs (F63). It is deliberately separate from `README.md`, which is for humans, so
agents get a predictable location and READMEs stay concise (F64). You create it at the root of the
repository; popular sections are project overview, build and test commands, code style guidelines,
testing instructions and security considerations, and the site suggests commit and pull request
guidelines, security gotchas, large datasets and deployment steps as further content (F65). For
monorepos you place another file inside each package: agents read the nearest file in the directory
tree, so the closest one takes precedence, and the site cites a repository with 88 of them (F66, a
site snapshot the verifier did not count — F66 caveat). The conflict rule is explicit: the closest
file to the edited file wins, and explicit user chat prompts override everything (F67). There are no
required fields; it is standard Markdown with any headings, parsed as text, and the FAQ calls it
living documentation (F68). The FAQ says an agent will attempt to run testing commands listed in the
file and fix failures before finishing (F69, which verifies what the FAQ says rather than any tool's
behaviour — F69 caveat). Migration is a rename plus a symlink, with worked configuration for Aider
and Gemini CLI (F70). The site lists 23 compatible tools, including "Coding agent from GitHub
Copilot", VS Code, Codex, Jules, Cursor, Devin, Junie and Windsurf, and claims use by over 60,000
open-source projects (F71, the site's own statement — F71 caveat). It says the format emerged from
collaborative efforts across the ecosystem and is now stewarded by the Agentic AI Foundation under
the Linux Foundation, with an LF Projects copyright footer (F72, where the named projects are
illustrative — F72 caveat). The source repository belongs to the `agentsmd` GitHub organization,
was created 2025-08-19, was last pushed 2026-09-10, repeats the same two definitions in its README,
hosts the Next.js site, and contains a `Technical_Charter.pdf` (F73, with the currency note above).

**Claude Code.** Each session begins with a fresh context window, and two mechanisms carry knowledge
across sessions: `CLAUDE.md` files you write, and auto memory Claude writes itself from your
corrections and preferences. Both load at the start of every conversation and are treated as
*context, not enforced configuration* (F74, F150). The comparison the docs draw is the useful one for
teaching: `CLAUDE.md` is written by you, holds instructions and rules, and is scoped project, user
or org; auto memory is written by Claude, holds learnings and patterns, is scoped per repository and
shared across worktrees, and loads subject to a first-200-lines-or-25KB limit (F75). `CLAUDE.md`
lives at four scopes — managed policy, user `~/.claude/CLAUDE.md`, project `./CLAUDE.md` or
`./.claude/CLAUDE.md` shared via source control, and local `./CLAUDE.local.md` to be gitignored —
with files above the working directory loading at launch and subdirectory files on demand (F76).
The docs recommend under 200 lines per file, note that `@path` imports load at launch to a maximum
depth of four hops and do not reduce context cost, that block-level HTML comments are stripped
before injection, and that a file up to 4 MiB loads in full while a larger one is skipped (F77,
F151). Auto memory records four note types (`user`, `feedback`, `project`, `reference`), skips
anything derivable from the codebase or already in `CLAUDE.md`, and does not save something every
session (F78). It is on by default in local sessions and can be toggled with `/memory`, with a
project-level `autoMemoryEnabled` setting, or with `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (F79, F152,
with the self-hosted and background-session exceptions — F79 caveat). It is stored at
`~/.claude/projects/<project>/memory/`, derived from the git repository so worktrees share one
directory, holding a `MEMORY.md` index plus one topic file per memory; it is machine-local and not
shared across machines or cloud environments, and the location is configurable (F80, F152, F155).
Loading is bounded: the first 200 lines or 25KB of `MEMORY.md`, whichever comes first, load every
conversation, topic files are read on demand, and an over-limit write still succeeds but returns an
error telling Claude to rewrite the index (F81). Memory files are excluded from the
`cleanupPeriodDays` transcript sweep and persist until edited or deleted; `/memory` lists them,
toggles auto memory and opens the folder; asking Claude to "remember" writes auto memory while
asking it to "add this to CLAUDE.md" writes the instruction file; and a `modified` timestamp is
recorded from v2.1.214 (F82, only where frontmatter already exists — F82 caveat). From v2.1.277
Claude Code reads `AGENTS.md` as project instructions by default *only* when no `CLAUDE.md` or
`CLAUDE.local.md` exists at or above the working directory, with a four-valued setting to change
that, an `@AGENTS.md` import route, and `AGENTS.local.md` and `AGENTS.override.md` never read (F83).
Rules files in `.claude/rules/` load at launch, or on demand when they carry a `paths` glob (F84,
F153).

**OpenAI Codex.** Codex reads AGENTS.md files before doing any work, building an instruction chain
once per run: global scope from the Codex home directory, then project scope walked from the project
root down to the working directory, at most one file per directory, concatenated root-down so nearer
files override earlier guidance (F85, hedged "usually" for the per-session point — F85 caveat). The
chain stops once the combined size reaches `project_doc_max_bytes`, 32 KiB by default, and the guide
tells you to raise the limit or split instructions across nested directories (F157, where vendor
pages disagree on per-file versus combined — F157 caveat). Codex also has *memories*, which carry
useful context from earlier work into future work; ChatGPT web uses ChatGPT memory while local Codex
clients use a separate local store, and the docs tell you to keep required team guidance in AGENTS.md
or checked-in documentation and to treat memories as a recall layer rather than the only source for
rules that must always apply (F86, F158). Generation is automatic once enabled: eligible prior chats
are turned into local memory files, active or short-lived sessions are skipped, secrets are redacted
from generated fields, updates run in the background after a chat has been idle, and a pass can be
skipped when the rate-limit remaining percentage is below a threshold (F87). The main memory files
live under `~/.codex/memories/` and hold summaries, durable entries, recent inputs and supporting
evidence; the docs call them generated state and advise against hand-editing them as the primary
control surface (F88, F158 caveat). Local Codex memories are **off by default** and are enabled in
Settings under Personalization or with `[features] memories = true`; `/memories` controls per-chat
use and contribution; "Delete Codex memories" resets the machine's store; and settings exist for
generation, use, external-context exclusion, a rate-limit threshold and the extraction and
consolidation models (F89, F160, with the external-context subset caveat — F89 caveat).

**Cursor.** Cursor frames rules as the answer to the absence of memory: "Large language models don't
retain memory between completions. Rules provide persistent, reusable context at the prompt level",
and rule contents are included at the start of the model context (F90, where the page's next sentence
is conditional on the rule being applied — F90 caveat). There are four rule types — Project Rules as
`.mdc` files in `.cursor/rules` (version-controlled, plain `.md` ignored), User Rules set globally
and used by Agent chat only, Team Rules managed from the dashboard on Team and Enterprise plans with
an admin enforcement option, and `AGENTS.md` in the project root or nested subdirectories as a
plain-markdown alternative — and four application modes: Always Apply, Apply Intelligently, Apply to
Specific Files by glob, and Apply Manually by mention (F91). Rules are authored by the user, by hand
or by asking Agent with `/create-rule`, which saves to `.cursor/rules`; the guidance is to keep rules
under 500 lines, split large ones, reference files with `@file` rather than copying them, and check
them into git, and nested AGENTS.md files combine with parent directories with the more specific
taking precedence (F92, with its scope caveats). Precedence across the three rule types is Team
Rules, then Project Rules, then User Rules, with earlier sources winning on conflict; non-enforced
Team Rules can be disabled by users unless "Enforce this rule" is set; and the docs state plainly
that AI guidance should not be your only security control (F93).

**GitHub's own repository instruction files, on github.com.** Three types are supported: a
repository-wide `.github/copilot-instructions.md` applying to all requests in the repository;
path-specific `.github/instructions/NAME.instructions.md` files applying to matching paths, with
both used when both match; and agent instructions, meaning one or more `AGENTS.md` files anywhere in
the repository with the nearest taking precedence, or a single `CLAUDE.md` or `GEMINI.md` in the
repository root. All are repository files written in Markdown, and that page does not describe them
as an automatically written memory store (F94, a statement of silence about that page — F94 caveat).
They are created by hand or generated by Copilot cloud agent: the page supplies an onboarding prompt
that has the cloud agent open a draft pull request adding the repository-wide file, bounded to no
longer than two pages and not task-specific, and notes that for Copilot code review the personal
choice to use custom instructions must be enabled, which it is by default (F95, where the page is
internally inconsistent about where that toggle lives — F95 caveat). This is the sharpest
distinction in the whole slice: instruction files are *authored and reviewed*; Copilot Memory and
the local memory tools are *written by the agent*.

**Anthropic's file-based memory tool.** It lets Claude store and retrieve information across
conversations in a directory of memory files, creating, reading, updating and deleting files that
persist between sessions (F96). It operates **client-side**: Claude requests file operations, the
developer's application executes them against storage the developer controls and returns results in
a `tool_result` block, and memory lives entirely in the application (F97, F139). Enabling it is a
single `tools` entry, `{"type": "memory_20250818", "name": "memory"}`; the name must be `memory` and
no input schema is defined for an Anthropic-provided tool (F98, a developer-side statement rather
than a claim that the tool takes no input — F98 caveat). The current page applies no beta label and
says the tool itself does not require a beta header, although the SDK helper surfaces live in beta
namespaces and the basic cURL example sends no beta header (F99, with its release-note history —
F99 caveat). It is available on all Claude 4 and later models (F100). Claude stores what it learns
under `/memories` and checks the memory directory before starting a task, where `/memories` is a
path prefix the developer's handler maps onto real storage such as a per-user directory or database
keys (F101). The client must implement six commands — `view`, `create`, `str_replace`, `insert`,
`delete` and `rename` — described as recommended behaviours and return strings (F102, F103, with
the reference-behaviour caveats). When the tool is present in a request's tools the API automatically
adds a system-prompt instruction beginning "ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING
ELSE", carrying a memory protocol and the line "ASSUME INTERRUPTION: Your context window might be
reset at any moment" (F104). Four SDKs ship helpers, with ready-made local-filesystem implementations
in Python and TypeScript and none in Go or Ruby (F109, cross-checked by code search — F109 caveat).
The page carries no publication or last-updated date at all (F110). Its security guidance is in 3.6,
and its relationship to compaction in 3.5.

### 3.3 The MCP reference memory server

The reference implementation is `@modelcontextprotocol/server-memory`, described in its README as "a
basic implementation of persistent memory using a local knowledge graph" (F111). The data model has
three parts: **entities**, each with a unique name, an `entityType` and a list of observations;
**relations**, directed connections stored in active voice with `from`, `to` and `relationType`; and
**observations**, atomic string facts attached to entities that can be added or removed
independently (F112, where atomicity is a README guideline the implementation does not enforce —
F112 caveat).

It exposes **nine tools**: `create_entities`, `create_relations`, `add_observations`,
`delete_entities`, `delete_observations`, `delete_relations`, `read_graph`, `search_nodes` (searched
across entity names, types and observation content) and `open_nodes` (F113). The documented
behaviours matter for a lab exercise: `create_entities` ignores entities whose names already exist;
`create_relations` skips duplicates and fails if either endpoint is missing; `add_observations`
fails if the entity does not exist; `delete_entities` cascades to that entity's relations; and
`open_nodes` silently skips non-existent nodes (F114, where README and source disagree on which
relations `open_nodes` returns — F114 caveat). There is also one MCP **resource**, `knowledge-graph`
at `memory://knowledge-graph` with MIME type `application/json`, returning the same shape as
`read_graph`, and the six mutation tools emit `notifications/resources/updated` for that URI (F115,
sent only to subscribed clients — F115 caveat).

Storage is a JSONL file whose path is set by `MEMORY_FILE_PATH`, defaulting to `memory.jsonl` in the
server directory, with the README's Docker examples mounting a `claude-memory` volume at `/app/dist`
(F116). In source, the default sits next to the compiled `index.js`; a leading `~` in
`MEMORY_FILE_PATH` is expanded and a relative path resolved against the package directory; a legacy
`memory.json` is migrated to `memory.jsonl`; each line is a record of type `entity` or `relation`;
and saves write a temp file and rename it into place (F117, whose migration has conditions the claim
omits — F117 caveat). The most recent commit touching `src/memory` as of 2026-10-09 is `d73f99e`,
dated 2026-09-03, which serialises graph mutations behind an in-process async mutex to prevent a
concurrent write race (F118, a moving fact — F118 caveat).

What the README does *not* carry is as important for a lab as what it does: no statement on size
limits, sensitive-data handling, prompt injection or memory poisoning, encryption, or access control
(F147, scoped to the README text — F147 caveat). Its example personalization prompt tells the model
to store basic identity including age, gender, location, job title and education level, along with
behaviors, preferences, goals and relationships, and adds no privacy caution to that example (F148).
The repository's `SECURITY.md` frames the whole collection: these are reference implementations
demonstrating MCP features and SDK usage, "educational examples" and "not ... production-ready
solutions", and the repository is not eligible for security vulnerability reporting (F149).

### 3.4 Loop engineering and graph engineering

No row in the table above addresses either term. **§3 therefore states no definition and no
recommendation for either practice**, and nothing downstream may cite this slice as a source for
either one. The state of each question is carried in §4: loop engineering as Q7, graph engineering
as Q12.

The two are not in the same state, and the difference decides what anyone does next.

**Loop engineering is not unsourced.** Q7 records that first-party material naming and defining the
term was found and identified by URL and date, and says why it is absent from the table all the
same: it was never put through this slice's verification, so there is no graded row to cite it from.
The opening sentence of this subsection is thus a statement about §3, not about the published
record — §4 Q7 carries exactly the account of who publishes on the term that §3 itself cannot.

**Graph engineering is a different case.** Q12 records no finding either way: no material found, and
no absence established. Nothing was searched for and found missing — the question was never put to a
source at all.

Two things must not happen downstream as a result. Neither term may be assembled out of adjacent
material such as knowledge-graph memory or context engineering. And neither may be reported as "no
published guidance exists" — for loop engineering that answer is disproven by what Q7 records, and
for graph engineering the record is silent, which is a different claim from an absence. Both need a
research round aimed at the terms directly, and Q7 names where that round starts.

### 3.5 Memory consolidation and sleep-time processing

The published record here is thinner and younger than for the rest of the slice, and its oldest and
most-cited pieces are the ones flagged in Source currency.

**The research origin.** "Sleep-time compute" lets models think offline about contexts before
queries are presented, anticipating likely queries and pre-computing useful quantities to cut
test-time compute. Evaluated on Stateful GSM-Symbolic and Stateful AIME, the abstract reports about
5x less test-time compute for the same accuracy, accuracy gains of up to 13% and 18% from scaling
sleep-time compute, and 2.5x lower average cost per query when amortised over related queries, plus
an agentic software-engineering case study; the abstract does not describe consolidating or editing
a persistent memory store (F119). Efficacy correlates with how predictable the user query is (F120).
Both rows rest on a paper published 2025-04-17, and F119's qualifier is scoped to the abstract: the
paper's body does implement the step with a memory-block rewrite (F119 caveat). Treat this as where
the idea comes from, not as a product description.

**The vendor framing.** Letta describes sleep-time compute as agents that keep running while idle,
using downtime to "reorganize information and reason through the information they have available in
advance", with a conversational agent reflecting on previous interaction "to consolidate
information", transforming raw context into learned context, and says the technique "fundamentally
requires stateful AI agents" that maintain memory or context over time (F121 — a vendor blog
published 2025-04-21, accurate as to what Letta says and not independent confirmation that it works
— F121 caveat). Letta's current documentation describes the shipped form: agents use MemFS, a
git-backed memory filesystem; "dreaming" uses background subagents to review recent conversations,
consolidate lessons and update memory without interrupting active work; it is configured with
`/sleeptime` in the CLI or Dream settings in the app and runs either after a set number of completed
agent steps or when the context window is compacted; an "Agent reviews before applying" option has
the agent revise proposed updates in a second background conversation, which costs more tokens and
does **not** ask the user for approval; updates are committed to MemFS; a `/doctor` command audits
placement, duplication and system-prompt token usage; and a memory reorganisation backs up the
repository before splitting large files, merging duplicates or restructuring the hierarchy (F122,
where the two triggers are a user choice — F122 caveat).

**Anthropic's shipped form.** In Claude Managed Agents, a *dream* is an asynchronous job that takes
an existing memory store plus 1 to 100 past session transcripts and produces a new, reorganised
output store: duplicates merged, stale or contradicted entries replaced with the latest value, new
insights surfaced. The input store is never modified, so the output can be reviewed and discarded.
The stated motivation is that agent memory writes are local and incremental, so over many sessions a
store accumulates duplicates, contradictions and stale entries. It is a research preview gated by a
dated beta header (F123). In use: an optional `instructions` field steers synthesis at a high level,
but the pipeline is a synthesis pass rather than a text editor, so line-targeted imperative edits
generally produce no change and targeted edits should go through the Memory Stores API on the output
store; dreams take minutes to a few hours depending on transcript count; statuses are pending,
running, completed, failed and canceled; a failed or canceled dream leaves the output store with
whatever was written; the output is an ordinary memory store to attach or discard; and a running
dream exposes an underlying session whose events can be streamed and which is archived when the
dream ends (F124). Anthropic's announcement frames dreaming as a scheduled process that reviews
agent sessions and memory stores, extracts patterns and curates memories, with developers choosing
whether it updates memory automatically or lets them review changes first, surfacing recurring
mistakes, converged workflows and shared team preferences, launched as a research preview; its
customer figure is a vendor-reported test result (F125).

**Anthropic's API-level neighbour.** Compaction summarizes older conversation context server-side as
a conversation approaches the context window limit, and for long-running agents the memory-tool page
suggests using both, with compaction keeping the active context small and memory preserving what
must survive summarization (F107, restating that one page, where the vendor's compaction docs split
the feature into two beta kinds — F107 caveat). The same page sets out a multisession development
pattern: an initializer session sets up a progress log, a feature checklist and a startup script
reference; later sessions open by reading those files; each session updates the progress log before
it ends; work proceeds one feature at a time; and a feature is marked complete only after end-to-end
verification (F108). That pattern is the closest thing in the record to a teachable consolidation
discipline that needs no proprietary service.

**GitHub does not document any of this.** GitHub's Copilot Memory documentation describes validation
and expiry, not consolidation: citations checked against the current branch with only validated facts
used, and unused entries deleted after 28 days with the timer possibly resetting on use; the page
describes no background merge, dedup or reorganisation of memories (F126). Two limits apply to that
row: its closing clause is an editorial directive rather than something the source says, and page
silence alone would not prove that no consolidation exists (F126 caveat).

### 3.6 Limits, privacy, governance and administrator controls

**GitHub Copilot Memory — the governance surface is github.com organization and enterprise
settings, and the plans are Copilot Business and Copilot Enterprise.** For enterprise- and
organization-managed subscriptions the feature is **off by default** and must be enabled in
enterprise or organization settings; once enabled it is on for users by default and saves both
repository-level facts and user-level preferences, and individual users can opt out in their account
settings (F13, F58, F128). If a user is assigned a Copilot subscription by more than one
organization the most restrictive setting applies, so Memory is not used unless all of them have
enabled it (F13, F58, F131). An enterprise administrator sets the policy under the enterprise's AI
controls, then Copilot, then "Configure features & clients", then Features, then Copilot Memory; an
organization owner can enable or disable it for all members with a Copilot license under the
organization's Settings, then Copilot, then Policies, then Features; and the enterprise-level policy
may control whether organization owners can change it (F14, F130, with the role-labelling caveats).

On Business and Enterprise plans **user-level preferences are owned by the billing entity** — the
organization or enterprise granting the license. A memory is stored against the user's active
billing entity, only memories owned by the current active billing entity are retrieved when building
agent session context, and a user holding licenses from several places must select a default billing
entity before user-level preferences are generated at all (F7, F61, F134). Administrators can export
those preferences as JSONL, for everyone via "Get usage report" then "Download user memories" or for
one user via "Export Copilot memories", and delete them with "Delete user memories" or "Delete
Copilot memories"; the organization path is Settings then Copilot then Access, the enterprise path is
Billing and licensing then Licensing then the Copilot section then Manage; existing exports are
reused for a two-hour window, and exports are limited to 10 per hour (F62, F135, scoped to the active
billing entity — F62, F135 caveats). Users retain their own control regardless of plan: they can view
and delete their own user-level preferences, and repository owners can review and delete
repository-level facts (F6, F31, F60, F133, F59). Auditing is narrow and should be taught as such:
events appear in the organization or enterprise audit log when an administrator exports or deletes
memories and when a user opts out, and the page does not state that other memory events, such as the
creation of an individual memory, are logged (F137, a statement about the page rather than about what
GitHub logs — F137 caveat).

**Copilot CLI session data has its own policy.** For Business and Enterprise users the "Store local
sessions in the Cloud" policy must be at least "View from cloud" for sessions to sync; if it is
disabled or unconfigured, sessions stay local; and synced data is accessible only to the user by
default (F43). Local deletion never reaches synced copies (F42, F44).

**Anthropic's memory tool puts the controls on the developer, explicitly.** The application executes
every file operation Claude requests, "so these safeguards are your responsibility", and the page
lists exactly four: sensitive information, file storage size, memory expiration, and path traversal
protection (F140, F105). On sensitive data: "Claude usually refuses to write sensitive information
to memory files. For stronger guarantees, add validation that strips sensitive data before your
handler writes the file" (F141). On size: track file sizes and cap how large a file can grow, and
consider capping how many characters `view` returns, letting Claude page through the rest with
`view_range`; separately, the tool description truncates the text view of files longer than 16,000
characters and files over 999,999 lines should return an error (F142, where the two numeric limits
come from the command specification — F142 caveat). On expiration there is no mechanism, only
advice: periodically delete memory files that have not been accessed in a long time (F143, F105).
On traversal, a Warning: a path such as `/memories/../../secrets.env` can reach files outside
`/memories`, so every path in every command must be validated — require paths to start with
`/memories`, resolve to canonical form, reject parent-directory sequences, watch for URL-encoded
traversal, and use the language's own path utilities (F106, F144). Encryption is mentioned once, as
one storage option a developer may choose, not as a built-in control (F145), and zero data retention
is covered by a linked page rather than on this one. As retrieved on 2026-10-09 the page has **no**
section on prompt injection or memory poisoning (F146) — a statement about that page, not about the
vendor's whole corpus (F146 caveat).

**Claude Code's controls are organizational and trust-based.** `CLAUDE.md` and auto memory are
context, not enforcement: to block an action regardless of what Claude decides you use a `PreToolUse`
hook, because "Settings rules are enforced by the client regardless of what Claude decides to do.
CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer" (F150). Size
limits are real and documented: 200 lines or 25KB of `MEMORY.md` at session start, 4 MiB for a
`CLAUDE.md` before it is skipped, and a recommendation of under 200 lines because longer files
consume context and reduce adherence (F151). Auto memory is machine-local, is excluded from the
`cleanupPeriodDays` transcript sweep, and persists until a human or Claude edits or deletes it
(F152). Organizations can deploy a managed-policy `CLAUDE.md` at a fixed per-platform path that
individual settings cannot exclude, the managed `claudeMd` key is honored only in managed and policy
settings, and a `managed-only` project-instructions value loads just the organization's file plus
auto memory at launch (F153, F84, where the key's non-excludability rests on a second page — F84
caveat). Two safeguards target the shared-repository threat directly: imports in a project memory
file that resolve outside the working directory trigger an approval dialog on first encounter, "to
protect you from files other people commit to a shared project", symlinks in `.claude/rules/`
pointing outside the working directory are treated the same way, and network-path symlinks are not
followed (F154); and `autoMemoryDirectory` from a repository-supplied settings file is honored only
under the workspace trust rule, with no auto memory loaded from or saved to such a directory while
`permissions.blockReadsOutsideWorkingDirectories` is on (F155). The page states no encryption and
carries no explicit prompt-injection or memory-poisoning warning (F156, scoped to that page —
F156 caveat).

**Codex and Cursor.** Codex's privacy guidance is direct: "Don't store secrets in memories"; Codex
redacts secrets from generated memory fields, but the user should still review memory files before
sharing the Codex home directory, and active or short-lived sessions are skipped during generation
(F159). Its controls are per-chat use and generation, an external-context exclusion that keeps chats
which used MCP tool calls, web search or tool search out of generation, and a reset of the machine's
store; the page states no encryption and does not use the terms prompt injection or memory poisoning
(F160, established by full-text search of that page — F160 caveat). Local Codex memories are off by
default (F89). Cursor's governance is Team Rules on Team and Enterprise plans, where admins choose
whether each rule is required and "Enforce this rule" prevents users disabling it, with precedence
running Team then Project then User and earlier sources winning; the docs add that AI guidance
should not be your only security control (F93).

**MCP.** The reference memory server documents none of this. Its README has no statement on size
limits, sensitive-data handling, prompt injection or memory poisoning, encryption, or access control
(F147); its example personalization prompt collects identity attributes with no privacy caution
(F148); and the repository's `SECURITY.md` says these servers are educational examples, not
production-ready solutions, and that the repository is not eligible for security vulnerability
reporting (F149). Anything taught from it should be taught with that framing attached.

**VS Code.** The memory tool's governance story is locality plus manual control: all scopes are
stored locally, repository memory is not a shared project file, reviewed team guidance belongs in
source-controlled docs or custom instructions (F19), and the page states no plan restriction, no
enabling setting and no time-based retention, documenting only manual removal apart from session
memory (F23, with its caveat).

---

## 4. Open questions

Anything `UNVERIFIED`, `CONTRADICTED`, or `NO-SOURCE`, carried visibly rather than resolved
by assertion. "No published guidance exists" is a finding and belongs here as one.

Q1 to Q10 are the ten claims this round graded as something other than `VERIFIED`; each is carried
with its grade and with what the verifier actually found. Q11 and Q12 are points the Objective asks
about on which no claim was graded at all. Nothing here is resolved below, and nothing here appears
in §3.

| # | Question | Why it is still open | Blocks |
|---|---|---|---|
| Q1 | Did GitHub announce Copilot Memory in public preview on 2025-12-19, as a changelog URL with that date suggests? | `CONTRADICTED` on the date. The page at that URL displays "January 15, 2026", its `datePublished` is 2026-01-15, and its canonical link carries the 2026-01-15 slug; the 2025-12-19 URL is an alias that returns HTTP 200 and contains no December date. Corroborated by the linked engineering post, by the first docs commit for the memory concept page, and by the absence of any Internet Archive capture before 2026-01-16. Every other element of the announcement matched the page. | nothing — F15 and the concept-page rows carry the dated record |
| Q2 | Does deleting a Copilot CLI session remove it from the local session list, the session-history index **and** the synced session list? | `CONTRADICTED` as a general statement. It is quoted accurately from a CLI-specific subsection, but deleting a synced session *prompts* you to choose whether to delete the remote copy, `delete-all` and `prune` affect local sessions only, and deleting local files never touches synced data. Removal from the synced list is conditional, not automatic. | nothing — F42 and F44 carry the narrower statements |
| Q3 | Is Copilot CLI memory "shared with the github.com Copilot Memory feature", and are all memories managed at the personal settings page? | `CONTRADICTED`. The docs describe **one** feature used by several surfaces, not two that share; no page uses the phrase "CLI memory" or describes a separate github.com feature. And the personal settings page is for viewing and deleting *user-level preferences*; repository-level facts are managed in repository settings instead. | nothing — F3, F26, F49, F12 and F59 carry it correctly |
| Q4 | Are AGENTS.md files for Codex written only by the user, never generated by Codex? | `CONTRADICTED` on the final sentence. OpenAI's CLI command reference documents `/init`, which generates an AGENTS.md scaffold in the current directory for the user to review, edit and commit. The size-limit and no-cache parts of the same claim did verify. | nothing — F157 carries the size limit |
| Q5 | Does Anthropic's context editing clear tool results **on the client**? | `CONTRADICTED` by the vendor's own pages. The memory-tool page says client-side; the dedicated context-editing page lists tool-result clearing as applied server-side before the prompt reaches Claude and says the client keeps the full unmodified history. One of the two is wrong and this round cannot say which. | nothing in §3; blocks any lab claim about where context editing happens |
| Q6 | Does the MCP servers README require developers to evaluate their own security requirements? | `CONTRADICTED` on normative strength. The README says developers **should** evaluate their own security requirements and implement appropriate safeguards; the claim said *must*. Everything else in the claim matched verbatim. | nothing — F149 carries the reference-implementation framing |
| Q7 | Does any primary source define or recommend **loop engineering** for agent memory or context? The submission that covered this term also covered "graph engineering"; that half is carried separately as Q12. | `CONTRADICTED` — and the contradiction *is* the finding, so this is not an empty gap. The submission was that no published guidance exists. Verification found first-party material that names and defines the term, and identified it: a GitHub Blog post of **2026-09-02** by a GitHub senior director of developer advocacy, `https://github.blog/ai-and-ml/decoding-the-new-ai-lingo-loops-harnesses-squads-hill-climbing-oh-my/`, recorded as carrying a section headed "Loop engineering: Moving beyond one-shot prompts", a one-sentence definition — the practice of designing repeatable systems around agents rather than prompting them one task at a time — and a treatment of memory and context as parts of the harness that surrounds an agent; and a document titled "Loop Engineering Patterns" in the `github/gh-aw` repository, recorded as covering durable state persisted for the next run. **None of it was graded against the page in this round**, so none of it is a verified fact here and §3 states nothing from it. Equally, "no published guidance exists" is a *disproven* answer for this term and must not be reported downstream. The next round starts by opening that one URL. | §3.4, which carries no fact row; any lab section naming the term |
| Q8 | Does Letta create two agents — a primary agent without core-memory editing tools and a sleep-time agent that holds them? | `CONTRADICTED` on currency, not on wording. The 2025-04-21 blog says exactly this and it matched the Letta V1-server era, but as a present-tense statement it is superseded by Letta's current documentation and source. | nothing — F122 carries the current, shipped description |
| Q9 | Does Letta *recommend* a stronger, slower model for the sleep-time agent than for the primary agent? | `CONTRADICTED` on two counts. The blog reports what Letta "found useful" and gives an example rather than issuing a recommendation, and as a present-tense statement of Letta's recommendation it is superseded by current docs. The frequency and background-parsing parts did match the blog. | nothing in §3 |
| Q10 | Is the paper "Do Language Models Need Sleep? Offline Recurrence for Improved Online Inference" the v1 of arXiv 2605.26099? | `CONTRADICTED` on the version and title pairing. That title belongs to v2 and v3; v1, submitted 2026-05-25, is titled "Language Models Need Sleep". Every substantive element of the claim matched the current v3 abstract, including that it is model-architecture research on fast weights and the KV cache rather than on agent memory files. Cite v3, not v1. | nothing in §3 |
| Q11 | Does Copilot Chat on github.com have any memory feature? | `UNVERIFIED`. No claim on this point was submitted for grading, so no primary source was opened for it. What §3 establishes is only that GitHub's concept page does not list it among the features that use Copilot Memory (F3, F138) — page-scoped silence about one page's list, which is not a statement that the surface has no memory. | the github.com-chat row of any surface matrix a downstream spec builds |
| Q12 | Does any primary source define or recommend **graph engineering**? | `UNVERIFIED`. No claim about this term was submitted for grading on its own, and the single submission that mentioned it was decided on account of loop engineering alone, recording nothing either way about this one. This slice therefore holds no finding on it: neither that guidance exists nor that it is absent. It must not be reported downstream as "no published guidance exists", because no source was opened to establish that — unlike Q7, where material was in fact found. | §3.4; any lab section naming the term |

---

## 5. Execution

The work this spec specifies **is** this research: assembling and verifying the memory slice of the
Curriculum v2 research baseline. It was carried out by the `spec-forge` loop, whose stages and
contracts are below.

| Stage | Agent | Contract — what it is given, what it must return |
|---|---|---|
| 1 — Scope | `general-purpose` | Given the question and its context. Decomposes it into independently researchable sub-questions and asserts nothing. |
| 2 — Gather | `research` | One researcher per sub-question. Returns claims, each with a primary-source URL and a date, or states that nothing is published on that sub-question. |
| 3 — Verify | `Khriss` | Given numbered claims and sources only; never sees researcher prose, confidence or conclusions. Is told to open every cited source itself and to grade each claim `VERIFIED`, `UNVERIFIED`, `CONTRADICTED` or `NO-SOURCE`, with a note saying what it found and what the grade does not establish. A researcher's "nothing is published" is handed to it as a claim to refute, never dropped. |
| 4 — Author | `Vasher` | Given the verified claims, the items that did not verify, and this repository's template. Writes the spec from `VERIFIED` claims only; §3 is checked against the verified record by code before any reviewer is dispatched. |
| 5 — Review | `judge` | Given the spec and the original question; never sees the author's summary. Re-derives the acceptance criteria from the objective and tries to break the spec. |

**Loop:** `spec-forge`  **maxRounds:** `3`  **Escalates to:** John

---

## 6. Model assignment

Assignment is by **stage property**, not stage prestige.

| Stage | Model | Rationale |
|---|---|---|
| Scope | `auto` | Divergent breadth, high volume, cheap to be wrong, output immediately checkable downstream |
| Gather | `auto` | Divergent breadth, high volume, cheap to be wrong, output immediately checkable downstream — every claim is re-opened at the next stage |
| Verify | `claude-opus-5` | Adversarial judgment, load-bearing, must hold large context, wrongness is expensive **and invisible** |
| Author | `claude-opus-5` | Adversarial judgment, load-bearing, must hold large context, wrongness is expensive **and invisible** |
| Review | `claude-opus-5` | Adversarial judgment, load-bearing, must hold large context, wrongness is expensive **and invisible** |

These are the models the loop **requests**. The model that actually served each stage is recorded in
the run result and can differ, so a model named here is not evidence of what ran.

> Workflow-owned subagents are **not** subject to the `task`-tool sub-agent model gate —
> see `_decisions.md` D-2026-10-08-01. Per-stage model assignment inside a loop is free.

---

## 7. Child issues

The issues this spec generates. Created under the milestone **after** the spec is `reviewed`.
Scope comes from this list and nowhere else; anything added mid-flight needs a spec amendment.

| # | Title | Labels | Depends on |
|---|---|---|---|
| 1 | Write the memory-lab spec, citing this slice row by row | `spec`, `curriculum` | this spec `merged` |
| 2 | Carry the Copilot Memory surface matrix (cloud agent, code review, CLI, VS Code, github.com) into the curriculum-architecture spec | `spec`, `curriculum` | this spec `merged` |
| 3 | Rebuild `labs/lab10.md` against the memory-lab spec, replacing every unsourced memory claim | `lab-fixes`, `curriculum` | 1 |
| 4 | Research round on "loop engineering" and "graph engineering" aimed at the terms directly, starting from the source named in Q7 and returning gradeable claims for §3 | `research` | nothing |
| 5 | Re-check the 127 undated pages and the public-preview features (F1, F48, F127, F123) before the lab ships | `research`, `needs-review` | 3 |
| 6 | Decide whether the memory lab teaches GitHub Copilot Memory at all while it is in public preview, or teaches only file-based memory | `curriculum`, `needs-review` | 1 |

---

## Changelog

| Date | Change |
|---|---|
| 2026-10-09 | Created. 160 verified fact rows resting on 30 distinct source URLs, indexed across 19 surfaces; 12 open questions; `loop engineering` and `graph engineering` recorded as unresolved rather than answered. |
| 2026-10-09 | Revised. Acceptance criteria restated as shape invariants and recomputable equalities rather than frozen counts, with new criteria for area coverage (AC8), source concentration (AC10) and citation integrity (AC13). Added the **source concentration** subsection — 160 rows rest on 30 distinct URLs, 38 of them on one page — so row count is not read as breadth. Corrected the F59 and F132 caveats and the §3.1 passage giving the repository navigation path, which is now cited to F11, the row whose own source page publishes it. Rewrote §3.4 to scope its silence to §3 and to point at §4; Q7 now names the found-but-ungraded source on `loop engineering` by URL and date, and Q12 still records no finding either way on `graph engineering`. |
| 2026-10-09 | Fixed §3 structure. The source-concentration figures were carried in a second, two-column table inside §3, which made §3 hold table rows that are not fact rows and do not have the fact table's five columns. The figures are now a list, so §3 contains exactly one table — the five-column verified-facts table — and every table row in §3 is a fact row. No fact row, URL, date, verdict, caveat, open question or acceptance criterion changed; the figures (30 distinct URLs; 38, 23, 18, 10, 9 and 62 rows) are unchanged and AC10 still recomputes them from the table. |
