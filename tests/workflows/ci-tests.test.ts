import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

interface Step {
  run?: string;
  uses?: string;
  if?: string;
  with?: Record<string, unknown>;
}

interface Workflow {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<string, {
    'runs-on': string;
    'timeout-minutes': number;
    steps: Step[];
  }>;
}

describe('automatic test checks', () => {
  const workflow = () => load(readFileSync('.github/workflows/tests.yml', 'utf8')) as Workflow;

  it('runs on every PR and main push without path filters', () => {
    const triggers = workflow().on;
    expect(triggers.pull_request).toBeNull();
    expect(triggers.push).toEqual({ branches: ['main'] });
    expect(triggers).toHaveProperty('workflow_dispatch');
  });

  it('runs all three suites on Linux with bounded, read-only jobs', () => {
    const config = workflow();
    expect(config.permissions).toEqual({ contents: 'read' });
    expect(Object.keys(config.jobs)).toEqual(['repository', 'node', 'dotnet']);
    for (const job of Object.values(config.jobs)) {
      expect(job['runs-on']).toBe('ubuntu-latest');
      expect(job['timeout-minutes']).toBeGreaterThan(0);
      for (const step of job.steps) {
        if (step.uses) expect(step.uses).toMatch(/@[a-f0-9]{40}$/);
        expect(step).not.toHaveProperty('continue-on-error');
      }
      expect(job.steps.some(step => step.uses?.startsWith('actions/upload-artifact@')
        && step.if === 'always()')).toBe(true);
    }
  });

  it('provisions Linux dependencies and exercises unit, integration and E2E suites', () => {
    const jobs = workflow().jobs;
    const commands = (name: string) => jobs[name].steps.map(step => step.run ?? '').join('\n');
    expect(commands('repository')).toContain('tmux');
    expect(commands('repository')).toContain('gh extension install github/gh-aw --pin');
    expect(commands('repository')).toContain('npm test --');
    expect(commands('node')).toContain('pnpm install --frozen-lockfile');
    expect(commands('node')).toContain('pnpm test --');
    expect(commands('node')).toContain('playwright install --with-deps chromium');
    expect(commands('node')).toContain('pnpm exec playwright test');
    expect(commands('dotnet')).toContain('dotnet build dotnet/ContosoUniversity.sln');
    expect(commands('dotnet')).toContain('dotnet test dotnet/ContosoUniversity.Tests');
    expect(commands('dotnet')).toContain('playwright.ps1 install --with-deps chromium');
    expect(commands('dotnet')).toContain('dotnet test dotnet/ContosoUniversity.PlaywrightTests');
    expect(commands('dotnet')).toContain('trap');
    expect(commands('dotnet')).toContain('curl --fail');
  });
});
