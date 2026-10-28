import { Cmd, FileCard, Note, PromptCard, Quiz } from "./content";
import type { Lab } from "./types";

const SELF_IMPROVING_WORKFLOW = `---
on: schedule-weekly
permissions: contents-read
tools: edit-search
safe-outputs: create-pull-request
description: Scans this repo's agents, skills and prompts for drift; opens a small, draft, human-reviewed refinement PR.
---

## Self-Improving Agents — drift scan

### Portability config
agents_dir: .github/agents/
skills_dir: .github/skills/
prompts_dir: .github/prompts/
eval_harness_dir: .github/skills/eval-harness/
lessons_dir: .copilot/lessons/
drift_signal_sources: [agents_dir, skills_dir, prompts_dir]

### The five drift signals
1. Stale references — a path an agent/skill names that no longer exists
2. Contradicted instructions — two sources demanding opposite behavior
3. Underused skills — descriptions no realistic prompt would activate
4. Duplicated responsibility — two agents quietly covering the same ground
5. Eval-convention drift — files contradicting eval-harness conventions
   (if eval_harness_dir does not resolve, record the limitation; do not fabricate a rubric)

### Hard constraints
- Propose ONLY mechanical fixes in the draft PR; design-level findings go
  in the report, for a human.
- NEVER edit this workflow file or its compiled .lock.yml (self-privilege-
  escalation risk). Never delete an agent or skill.
- At most one draft PR, labeled: automated, self-improving-agents, needs-review.

### Required output
A report: findings per signal, consolidation candidates, limitations.
`;

export const lab19: Lab = {
  id: "lab19",
  number: "19",
  title: "Self-Improving Agents",
  tagline:
    "A DIY gh-aw pattern — scheduled drift scans over your own agents and skills, bounded to draft-only mechanical fixes.",
  steps: [
    {
      key: "lab19/workflow",
      title: "The pattern, bounded on purpose",
      kind: "mixed",
      verifyId: "lab19/workflow",
      body: (
        <>
          <p>
            Set expectations first: there is{" "}
            <strong>no GitHub product called "self-improving agents."</strong>{" "}
            This is a community pattern you assemble from primitives you now own
            — agents (07), skills (04), gh-aw (08). Agents and skills are files,
            and files drift: paths move, conventions change, a skill nobody
            invokes rots. The pattern: detect drift on a schedule → propose only
            mechanical fixes as a draft PR → escalate anything design-level to a
            human → <strong>never let the workflow touch itself</strong>.
          </p>
          <FileCard
            path=".github/workflows/self-improving-agents.md"
            content={SELF_IMPROVING_WORKFLOW}
          />
          <p>
            The <strong>Portability config</strong> block is the whole
            repo-specific surface — port the workflow to another repo by editing
            those six lines. Compile it:
          </p>
          <Cmd
            lines={["gh aw compile .github/workflows/self-improving-agents.md"]}
          />
        </>
      ),
    },
    {
      key: "lab19/dryrun",
      title: "Dry-run the drift scan locally",
      kind: "live",
      verifyId: "lab19/dryrun",
      body: (
        <>
          <p>
            Before any scheduled run: rehearse the same reasoning locally and{" "}
            <em>read the report yourself</em>:
          </p>
          <PromptCard prompt="Acting as the drift evaluator described in .github/workflows/self-improving-agents.md, scan .github/agents/ and .github/skills/ for the five drift signals it defines. Do NOT make any edits — produce only the report from the workflow's Required output section." />
          <p>Judge what comes back the way the lab prescribes:</p>
          <ul>
            <li>Are the "stale references" real, or false positives?</li>
            <li>
              Anything surprising under consolidation candidates? (Two agents
              covering the same ground is common in a fast-moving repo — you may
              have built a few look-alikes in these labs.)
            </li>
            <li>
              Is anything flagged as a fix that's actually a design opinion the
              workflow shouldn't make unattended?
            </li>
          </ul>
          <Note>
            In the real lab,{" "}
            <code>gh workflow run self-improving-agents.lock.yml</code> then
            triggers the Actions run, which opens at most one draft PR — and "no
            PR because nothing was actionable" is success, not failure.
          </Note>
        </>
      ),
    },
    {
      key: "lab19/bounded",
      title: "Why the bounds are the feature",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>The pattern's safety comes from what it's forbidden to do:</p>
          <table>
            <thead>
              <tr>
                <th>Allowed (three things)</th>
                <th>Forbidden (two things)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Apply a mechanical fix in the draft PR · flag a design finding
                  in the report · log a limitation
                </td>
                <td>Delete an agent/skill · edit its own .md or .lock.yml</td>
              </tr>
            </tbody>
          </table>
          <Quiz
            stepKey="lab19/bounded"
            question="Why is the workflow explicitly forbidden from editing its own workflow file and compiled lock file?"
            options={[
              "To keep the diff small enough to review",
              "Self-privilege-escalation: a workflow that can edit itself can expand its own permissions and scope",
              "Because gh aw compile would fail otherwise",
            ]}
            correct={1}
            explain="A drift-fixer that can rewrite its own permissions block stops being bounded. The self-exclusion plus draft-only PRs keep a human between the pattern and every consequential change."
          />
        </>
      ),
    },
  ],
};
