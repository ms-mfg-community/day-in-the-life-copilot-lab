import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LAB13 = join(ROOT, 'labs/lab13.md');

function read() {
  const body = readFileSync(LAB13, 'utf8');
  return { body, lower: body.toLowerCase() };
}

describe('lab13: A2A / ACP concepts content', () => {
  it('covers ACP / A2A concept primer with both acronyms expanded', () => {
    const { lower } = read();
    expect(lower, 'lab13 must mention A2A').toMatch(/\ba2a\b/);
    expect(lower, 'lab13 must mention ACP').toMatch(/\bacp\b/);
    // Expand at least one acronym so a learner who has never heard of them gets context.
    expect(lower).toMatch(/agent[- ]to[- ]agent|agent\s+communication\s+protocol/);
  });

  it('contrasts peer-agent A2A with single-agent + sub-agents', () => {
    const { lower } = read();
    // The primer must explicitly call out when to reach for A2A vs the
    // simpler "one agent calling sub-agents via the task tool" pattern.
    expect(lower).toMatch(/sub[- ]agent/);
    expect(lower).toMatch(/single[- ]agent|one\s+agent|vs\.?\s+/);
    expect(lower, 'lab13 must discuss trust boundaries').toMatch(/trust\s+boundar/);
  });

  it('walks through a concrete two-agent task (implementer + critic style)', () => {
    const { body } = read();
    const hasImplementer = /implementer|implement(er|ing)\s+agent|builder/i.test(body);
    const hasCritic = /critic|reviewer|critique/i.test(body);
    expect(hasImplementer, 'lab13 must name the implementer/builder peer').toBe(true);
    expect(hasCritic, 'lab13 must name the critic/reviewer peer').toBe(true);
  });

  it('demonstrates the in-CLI A2A primitives (task / write_agent / read_agent)', () => {
    const { body } = read();
    expect(body, 'lab13 must reference the task tool').toMatch(/\btask\b/);
    expect(body, 'lab13 must show write_agent').toContain('write_agent');
    expect(body, 'lab13 must show read_agent').toContain('read_agent');
  });

  it('shows how to inspect the multi-agent transcript', () => {
    const { lower } = read();
    expect(lower).toMatch(/transcript|list_agents|agent\s+log/);
  });

  it('documents all three failure modes with mitigations', () => {
    const { lower } = read();
    expect(lower, 'must cover the looping failure mode').toMatch(/loop(ing)?\b/);
    expect(lower, 'must cover context drift').toMatch(/context\s+drift|stale\s+(context|assumption)/);
    expect(lower, 'must cover hand-off ambiguity').toMatch(/hand[- ]?off\s+ambigu|ambigu(ous|ity)\s+hand[- ]?off|under[- ]?specified\s+hand[- ]?off/);
    expect(lower, 'must teach a turn-cap mitigation').toMatch(/turn[- ]?cap|max(imum)?\s+turns|iteration\s+limit/);
    expect(lower, 'must teach an explicit hand-off contract / schema').toMatch(/hand[- ]?off\s+(schema|contract|doc)/);
  });

  it('cross-references existing orchestrator + rubber-duck patterns', () => {
    const { lower } = read();
    expect(lower, 'lab13 must cross-reference the orchestrator agent').toMatch(/orchestrator/);
    expect(lower, 'lab13 must cross-reference the rubber-duck pattern').toMatch(/rubber[- ]?duck/);
  });
});
