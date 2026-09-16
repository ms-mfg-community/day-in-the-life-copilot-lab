import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import matter from 'gray-matter';

const ROOT = process.cwd();
const WORKFLOW_PATH = join(ROOT, '.github', 'workflows', 'weekly-content-audit.md');

describe('workflows: weekly-content-audit gh-aw schema', () => {
  it('workflow file exists at .github/workflows/weekly-content-audit.md', () => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true);
  });

  it('declares cron "0 5 * * 0" (Sunday 05:00 UTC) and workflow_dispatch triggers', () => {
    const fm = matter(readFileSync(WORKFLOW_PATH, 'utf8')).data as Record<string, any>;
    const on = fm.on as Record<string, any> | undefined;
    expect(on, 'frontmatter must declare on:').toBeDefined();
    expect(on, 'must declare workflow_dispatch trigger').toHaveProperty('workflow_dispatch');
    const schedule = on!.schedule as Array<{ cron: string }> | undefined;
    expect(Array.isArray(schedule), 'on.schedule must be an array').toBe(true);
    const crons = (schedule ?? []).map((s) => s.cron);
    expect(crons, `cron list was ${JSON.stringify(crons)}`).toContain('0 5 * * 0');
  });

  it('uses scoped permissions (no write-all, no implicit org-wide write)', () => {
    const fm = matter(readFileSync(WORKFLOW_PATH, 'utf8')).data as Record<string, any>;
    const perms = fm.permissions;
    expect(perms, 'frontmatter must declare permissions:').toBeDefined();
    expect(typeof perms, 'permissions must be a mapping, not a string like write-all').toBe('object');
    const flat = JSON.stringify(perms).toLowerCase();
    expect(flat).not.toContain('write-all');
    // Read-only at the top level: any writes happen through safe-outputs.
    for (const [scope, level] of Object.entries(perms as Record<string, string>)) {
      expect(
        ['read', 'none'],
        `permissions.${scope} must be read or none (got ${level})`,
      ).toContain(level);
    }
  });

  it('safe-outputs declares create-pull-request with required labels and chore(audit) prefix', () => {
    const fm = matter(readFileSync(WORKFLOW_PATH, 'utf8')).data as Record<string, any>;
    const safe = fm['safe-outputs'] as Record<string, any> | undefined;
    expect(safe, 'frontmatter must declare safe-outputs:').toBeDefined();
    const pr = safe!['create-pull-request'];
    expect(pr, 'safe-outputs.create-pull-request must be configured').toBeDefined();
    expect(pr.labels).toEqual(expect.arrayContaining(['automated', 'content-audit', 'needs-review']));
    expect(String(pr['title-prefix'] ?? '')).toMatch(/chore\(audit\)/);
  });

  it('compiles cleanly with `gh aw compile` (schema validation)', () => {
    // Compile in an isolated copy of the repo so we never mutate the working tree.
    const work = mkdtempSync(join(tmpdir(), 'gh-aw-compile-'));
    try {
      cpSync(join(ROOT, '.github'), join(work, '.github'), { recursive: true });
      // Drop any sibling workflows so a pre-existing bug elsewhere doesn't fail this test.
      const targetDir = join(work, '.github', 'workflows');
      for (const f of ['code-review.md', 'generate-prd.md', 'code-review.lock.yml', 'generate-prd.lock.yml']) {
        const p = join(targetDir, f);
        if (existsSync(p)) rmSync(p, { force: true });
      }
      let stdout = '';
      let stderr = '';
      const res = spawnSync('gh', ['aw', 'compile', 'weekly-content-audit'], {
        cwd: work,
        encoding: 'utf8',
      });
      stdout = res.stdout ?? '';
      stderr = res.stderr ?? '';
      if (res.status !== 0) {
        throw new Error(
          `gh aw compile failed (exit ${res.status}):\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
        );
      }
      const combined = `${stdout}\n${stderr}`;
      expect(combined).toMatch(/0 error\(s\)/);
      expect(existsSync(join(targetDir, 'weekly-content-audit.lock.yml'))).toBe(true);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
