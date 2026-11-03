import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DECISION_TREE = join(process.cwd(), 'docs', 'memory-decision-tree.md');

// Every memory mechanism the repo teaches must appear in the 1-page
// decision tree so learners can pick the right tool. Lab 10 teaches memory
// as a spectrum laid over three layers (Raw sources → Recall → Schema):
// native GitHub Copilot Memory (curated by Copilot Dreaming), the in-repo
// markdown wiki (curated by /consolidate-lessons), and a custom local
// memory service (SCNS). Every one of those must be represented — plus the
// non-memory surfaces (reindex) that learners commonly confuse for memory.
const REQUIRED_MECHANISMS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  // Layer 1 — Raw sources (session-scoped)
  { label: 'Layer 1: plan.md', pattern: /plan\.md/ },
  { label: 'Layer 1: SQL todos table', pattern: /SQL\s+todos|todos\s+table|todo_deps/i },
  { label: 'Layer 1: session-state workspace', pattern: /session[- ]state/i },

  // Layer 2, native — GitHub Copilot Memory and its hosted curator
  { label: 'Layer 2 native: Copilot Memory', pattern: /Copilot Memory/ },
  { label: 'Layer 2 native: repository-level facts', pattern: /repository-level fact/i },
  { label: 'Layer 2 native: user-level preferences', pattern: /user-level preference/i },
  { label: 'Layer 2 native: Copilot Dreaming', pattern: /Dreaming/ },

  // Layer 2, DIY — The Wiki (LLM-maintained markdown)
  { label: 'Layer 2: project wiki (.copilot/lessons/)', pattern: /\.copilot\/lessons/ },
  { label: 'Layer 2: global wiki (~/.copilot/lessons/)', pattern: /~\/\.copilot\/lessons/ },
  { label: 'Layer 2: consolidate-lessons command', pattern: /consolidate-lessons/ },

  // Layer 2, custom — a self-hosted memory service
  { label: 'Layer 2 custom: SCNS memory service', pattern: /SCNS/ },

  // Layer 3 — The Schema (binding rulebook)
  { label: 'Layer 3: AGENTS.md', pattern: /AGENTS\.md/ },
  { label: 'Layer 3: .github/instructions/', pattern: /\.github\/instructions/ },
  { label: 'Layer 3: agent personalities', pattern: /agent personalit|\.github\/agents/i },

  // Non-memory surfaces commonly confused for memory
  { label: 'Disambiguation: reindex is not a memory layer', pattern: /reindex/i },
];

describe('memory: decision tree covers every mechanism', () => {
  it('docs/memory-decision-tree.md exists', () => {
    expect(
      existsSync(DECISION_TREE),
      'docs/memory-decision-tree.md is missing',
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
