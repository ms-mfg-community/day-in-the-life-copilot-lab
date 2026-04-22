import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const WORKFLOW_MD = join(ROOT, '.github', 'workflows', 'weekly-content-audit.md');

/**
 * "Dry-run plan shape" — gh-aw's compiler is the dry-run planner: it converts
 * the Markdown workflow into a fully-resolved GitHub Actions plan (the .lock.yml).
 * This test compiles in an isolated tree (so we never write to the repo as a
 * side-effect of `npm test`) and asserts the resulting plan has the shape Phase 4
 * promised: weekly cron + manual dispatch, scoped activation permissions,
 * a create_pull_request safe-output with the agreed labels + title prefix, and
 * the workflow body references the registry, the audit report, and the
 * automation/weekly-audit-* branch convention.
 */
describe('workflows: weekly-content-audit dry-run plan shape', () => {
  it('compiled lock.yml has cron, workflow_dispatch, and create_pull_request safe-output', () => {
    expect(existsSync(WORKFLOW_MD), 'workflow .md must exist').toBe(true);

    const work = mkdtempSync(join(tmpdir(), 'gh-aw-plan-'));
    try {
      cpSync(join(ROOT, '.github'), join(work, '.github'), { recursive: true });
      const targetDir = join(work, '.github', 'workflows');
      for (const f of ['code-review.md', 'generate-prd.md', 'code-review.lock.yml', 'generate-prd.lock.yml']) {
        const p = join(targetDir, f);
        if (existsSync(p)) rmSync(p, { force: true });
      }
      const res = spawnSync('gh', ['aw', 'compile', 'weekly-content-audit'], {
        cwd: work,
        encoding: 'utf8',
      });
      if (res.status !== 0) {
        throw new Error(
          `gh aw compile failed (exit ${res.status}):\nSTDOUT:\n${res.stdout ?? ''}\nSTDERR:\n${res.stderr ?? ''}`,
        );
      }
      const lockPath = join(targetDir, 'weekly-content-audit.lock.yml');
      expect(existsSync(lockPath), 'compiler must emit weekly-content-audit.lock.yml').toBe(true);
      const lockText = readFileSync(lockPath, 'utf8');
      const lock = yaml.load(lockText) as Record<string, any>;

      // Triggers
      const on = lock.on as Record<string, any>;
      expect(on, 'lock.on must be present').toBeDefined();
      expect(on.workflow_dispatch, 'lock must keep workflow_dispatch trigger').toBeDefined();
      const crons = (on.schedule as Array<{ cron: string }>).map((s) => s.cron);
      expect(crons).toContain('0 5 * * 0');

      // Activation job runs read-only.
      const activation = (lock.jobs as Record<string, any>)?.activation;
      expect(activation, 'lock must have an activation job').toBeDefined();
      const actPerms = activation.permissions as Record<string, string> | undefined;
      expect(actPerms, 'activation job must declare permissions').toBeDefined();
      for (const v of Object.values(actPerms ?? {})) {
        expect(['read', 'none']).toContain(v);
      }

      // Safe-output: the lock encodes the create_pull_request handler config
      // (labels appear inside an escaped JSON string in the env block).
      expect(lockText).toContain('create_pull_request');
      expect(lockText).toMatch(/automated/);
      expect(lockText).toMatch(/content-audit/);
      expect(lockText).toMatch(/needs-review/);
      expect(lockText).toMatch(/title_prefix["\\\s:]+["\\']*chore\(audit\):/);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it('workflow body wires the audit to registry.yaml, the report template, and the weekly branch convention', () => {
    const body = readFileSync(WORKFLOW_MD, 'utf8');
    // Inputs the agent must read.
    expect(body).toContain('docs/_meta/registry.yaml');
    expect(body).toContain('docs/_meta/audit-report.template.md');
    // Output it must produce.
    expect(body).toContain('docs/_meta/audit-report.md');
    // Branch convention from the plan.
    expect(body).toMatch(/automation\/weekly-audit-YYYY-MM-DD/);
    // The seven required checks.
    for (const check of [
      'Copilot CLI version',
      'gh-aw',
      'MCP server',
      'documentation URLs',
      'Package versions',
      'Model names',
      'Lab pacing',
    ]) {
      expect(body.toLowerCase(), `workflow must instruct check: ${check}`).toContain(check.toLowerCase());
    }
    // Auth + safety knobs called out in the plan.
    expect(body).toContain('COPILOT_GITHUB_TOKEN');
    expect(body).toContain('CODEOWNERS');
    expect(body).toContain('draft_pr_if_changes_exceed');
  });
});
