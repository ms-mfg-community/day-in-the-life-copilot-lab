import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DECISION_TREE = join(process.cwd(), 'docs', 'memory-decision-tree.md');

// Every memory/learning mechanism the repo teaches must appear in the
// 1-page decision tree so learners can pick the right tool. Phase 2 plan.md:
// "every memory mechanism in the repo is represented in the decision tree".
const REQUIRED_MECHANISMS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'Session context (plan.md / SQL todos)', pattern: /plan\.md|session[- ]state|SQL todos/i },
  { label: 'Project memory (AGENTS.md)', pattern: /AGENTS\.md/ },
  { label: 'Project memory (.github/instructions/)', pattern: /\.github\/instructions/ },
  { label: 'Cross-session (Memory MCP knowledge graph)', pattern: /Memory MCP|knowledge graph/i },
  { label: 'Offline Memory MCP variant', pattern: /offline|memory-offline|local[- ]only/i },
  { label: 'Continuous learning v1 (deprecated)', pattern: /continuous-learning(?!-v2)/ },
  { label: 'Continuous learning v2 (canonical)', pattern: /continuous-learning-v2/ },
  { label: 'Iterative retrieval (deprecated)', pattern: /iterative-retrieval/ },
  { label: 'Strategic compact (deprecated)', pattern: /strategic-compact/ },
  { label: 'Instinct loop (capture/promote)', pattern: /instinct/i },
];

describe('memory: decision tree covers every mechanism', () => {
  it('docs/memory-decision-tree.md exists', () => {
    expect(
      existsSync(DECISION_TREE),
      'docs/memory-decision-tree.md is missing — Phase 2 deliverable',
    ).toBe(true);
  });

  const body = existsSync(DECISION_TREE) ? readFileSync(DECISION_TREE, 'utf8') : '';

  it.each(REQUIRED_MECHANISMS)(
    'mentions $label',
    ({ pattern }) => {
      expect(
        pattern.test(body),
        `decision tree must reference ${pattern}`,
      ).toBe(true);
    },
  );

  it('contains a flowchart-style "which memory do I use?" framing', () => {
    expect(/which memory|decide|decision/i.test(body)).toBe(true);
  });
});
