import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GUIDE = join(ROOT, 'docs/token-and-model-guide.md');

// The full model enum exposed by the Copilot CLI `task` tool.
// Keep this list in sync with the model list documented in the
// `task` tool description. Phase 7 requires the guide to mention
// every one of these so learners can decide which to pick.
const MODEL_IDS = [
  'claude-sonnet-4.6',
  'claude-sonnet-4.5',
  'claude-haiku-4.5',
  'claude-opus-4.7',
  'claude-opus-4.6',
  'claude-opus-4.6-1m',
  'claude-opus-4.5',
  'claude-sonnet-4',
  'goldeneye',
  'gpt-5.4',
  'gpt-5.3-codex',
  'gpt-5.2-codex',
  'gpt-5.2',
  'gpt-5.4-mini',
  'gpt-5-mini',
  'gpt-4.1',
];

const REQUIRED_SECTIONS = [
  /^##\s+Model selection/m,
  /^##\s+Batching/m,
  /^##\s+Context hygiene/m,
  /^##\s+Prompt shape/m,
  /^##\s+Measuring/m,
];

describe('docs/token-and-model-guide.md', () => {
  it('exists', () => {
    expect(existsSync(GUIDE), `expected ${GUIDE} to exist`).toBe(true);
  });

  it('mentions every model in the task tool enum', () => {
    const body = readFileSync(GUIDE, 'utf8');
    const missing = MODEL_IDS.filter((id) => !body.includes(id));
    expect(missing, `guide is missing models: ${missing.join(', ')}`).toEqual([]);
  });

  it('has the five required sections', () => {
    const body = readFileSync(GUIDE, 'utf8');
    for (const re of REQUIRED_SECTIONS) {
      expect(body, `missing section matching ${re}`).toMatch(re);
    }
  });

  it('cross-references /clear, view_range, and strategic-compact', () => {
    const body = readFileSync(GUIDE, 'utf8');
    expect(body).toMatch(/\/clear/);
    expect(body).toMatch(/view_range/);
    expect(body).toMatch(/strategic-compact/);
  });
});
