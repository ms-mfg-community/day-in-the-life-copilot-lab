import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const WORKFLOW = join(ROOT, '.github/workflows/lab25-improvement-review.md');
const LOCK = join(ROOT, '.github/workflows/lab25-improvement-review.lock.yml');
const SETTINGS = join(ROOT, 'labs/fixtures/lab25/managed-settings.telemetry.json');

describe('lab25 governance: managed telemetry settings', () => {
  const { telemetry } = JSON.parse(readFileSync(SETTINGS, 'utf8'));

  it('turns every capture class off and locks it', () => {
    expect(Object.keys(telemetry.capture).sort()).toEqual(
      ['identity', 'policyDetail', 'prompts', 'responses', 'toolArguments', 'toolOutput'],
    );
    expect(Object.values(telemetry.capture).every((v) => v === false)).toBe(true);
    expect(telemetry.lockCaptureContent).toBe(true);
    expect(telemetry).not.toHaveProperty('captureContent', true);
  });

  it('stamps the bundle version and keeps secrets out of headers', () => {
    expect(telemetry.resourceAttributes['contoso.bundle.version']).toMatch(/^\d+\.\d+\.\d+$/);
    expect(telemetry.headers).toEqual({});
  });
});

describe('lab25 governance: the improvement-review workflow', () => {
  const { data, content } = matter(readFileSync(WORKFLOW, 'utf8'));

  it('is read-only and writes only through one safe-output issue', () => {
    expect(Object.values(data.permissions).every((v) => v === 'read')).toBe(true);
    expect(data['safe-outputs']).toEqual({ 'create-issue': expect.objectContaining({ max: 1, 'close-older-issues': true }) });
  });

  it('runs on a schedule and computes findings before the agent starts', () => {
    expect(data.on.schedule).toBeTruthy();
    expect(JSON.stringify(data['pre-agent-steps'])).toContain('lab25.mjs report --json');
  });

  it('tells the agent to treat strings as untrusted and to name target, owner and re-measurement', () => {
    expect(content).toMatch(/untrusted/i);
    expect(content).toMatch(/owner/i);
    expect(content).toMatch(/gateOwners/);
    expect(content).toMatch(/Query/);
    expect(content).toMatch(/insufficient-sample/);
  });

  it('has a compiled lock file', () => {
    expect(readFileSync(LOCK, 'utf8')).toMatch(/lab25\.mjs report --json/);
  });
});
