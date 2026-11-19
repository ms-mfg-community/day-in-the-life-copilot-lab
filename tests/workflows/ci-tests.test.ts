import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

interface Step {
  id?: string;
  name?: string;
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
    defaults?: { run?: { shell?: string; 'working-directory'?: string } };
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

  it('runs all four suites on Linux with bounded, read-only jobs', () => {
    const config = workflow();
    expect(config.permissions).toEqual({ contents: 'read' });
    expect(Object.keys(config.jobs)).toEqual(['repository', 'node', 'dotnet', 'lab-studio']);
    expect(config.jobs.repository['runs-on']).toBe('ubuntu-latest');
    expect(config.jobs.node['runs-on']).toBe('ubuntu-24.04');
    expect(config.jobs.dotnet['runs-on']).toBe('ubuntu-24.04');
    expect(config.jobs['lab-studio']['runs-on']).toBe('ubuntu-latest');
    expect(config.jobs['lab-studio'].defaults?.run?.['working-directory']).toBe('lab-studio');
    for (const job of Object.values(config.jobs)) {
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
    expect(commands('lab-studio')).toContain('npm ci');
    expect(commands('lab-studio')).toContain('npm run drift');
    expect(commands('lab-studio')).toContain('npm run typecheck');
    expect(commands('lab-studio')).toContain('npm test');

    const nodeDepsStep = jobs.node.steps.find(step => step.run?.includes('pnpm install --frozen-lockfile'));
    const nodeUnitStep = jobs.node.steps.find(step => step.run?.includes('pnpm test --'));
    expect(nodeDepsStep?.id).toBe('deps');
    expect(nodeUnitStep?.if).toContain('!cancelled()');
    expect(nodeUnitStep?.if).toContain("steps.deps.outcome == 'success'");
    expect(nodeUnitStep?.if).not.toContain('steps.browsers');

    const dotnetBuildStep = jobs.dotnet.steps.find(step => step.run?.includes('dotnet build dotnet/ContosoUniversity.sln'));
    const dotnetUnitStep = jobs.dotnet.steps.find(step => step.run?.includes('dotnet test dotnet/ContosoUniversity.Tests'));
    expect(dotnetBuildStep?.id).toBe('build');
    expect(dotnetUnitStep?.if).toContain('!cancelled()');
    expect(dotnetUnitStep?.if).toContain("steps.build.outcome == 'success'");
    expect(dotnetUnitStep?.if).not.toContain('steps.browsers');
  });

  it.each([
    ['node', 'deps', 'pnpm test --'],
    ['dotnet', 'build', 'dotnet test dotnet/ContosoUniversity.Tests'],
  ])('keeps %s unit tests independent of browser-install success', (job, prerequisite, unitCommand) => {
    const steps = workflow().jobs[job].steps;
    const dependencyIndex = steps.findIndex(step => step.id === prerequisite);
    const unitIndex = steps.findIndex(step => step.run?.includes(unitCommand));

    expect(dependencyIndex).toBeGreaterThanOrEqual(0);
    expect(unitIndex).toBeGreaterThan(dependencyIndex);
    expect(steps[unitIndex].if).toBe(`\${{ !cancelled() && steps.${prerequisite}.outcome == 'success' }}`);
  });

  it('runs Lab Studio install, drift, typecheck and tests in order with its own lockfile', () => {
    const job = workflow().jobs['lab-studio'];
    const setup = job.steps.find(step => step.uses?.startsWith('actions/setup-node@'));

    expect(job.defaults?.run?.['working-directory']).toBe('lab-studio');
    expect(setup?.with).toMatchObject({
      'node-version': 22,
      cache: 'npm',
      'cache-dependency-path': 'lab-studio/package-lock.json',
    });
    expect(job.steps.filter(step => step.run).map(step => step.run)).toEqual([
      'npm ci',
      'npm run drift',
      'npm run typecheck',
      expect.stringMatching(/^npm test(?:\s|$)/),
    ]);
  });
});
