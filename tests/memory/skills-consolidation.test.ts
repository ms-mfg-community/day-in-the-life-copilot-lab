import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const SKILLS_DIR = join(process.cwd(), '.github', 'skills');

// Phase 2: continuous-learning, iterative-retrieval, and strategic-compact
// are *older* surfaces that get folded into the v2 instinct loop. They must
// stay on disk (teaching moment) but advertise their deprecation and redirect
// readers to the canonical surface.
const DEPRECATED_SKILLS = [
  'continuous-learning',
  'iterative-retrieval',
  'strategic-compact',
] as const;

const CANONICAL_SKILL = 'continuous-learning-v2';

function readSkill(name: string) {
  const path = join(SKILLS_DIR, name, 'SKILL.md');
  expect(existsSync(path), `${path} missing`).toBe(true);
  return matter(readFileSync(path, 'utf8'));
}

describe('memory: skills consolidation frontmatter', () => {
  it.each(DEPRECATED_SKILLS)(
    '%s is marked deprecated with a redirect target',
    (name) => {
      const { data, content } = readSkill(name);

      expect(
        data.deprecated,
        `${name}/SKILL.md must declare "deprecated: true" in frontmatter`,
      ).toBe(true);

      expect(
        typeof data.redirect === 'string' && data.redirect.length > 0,
        `${name}/SKILL.md must declare a non-empty "redirect" frontmatter key pointing at the canonical surface`,
      ).toBe(true);

      // Body must contain a visible deprecation banner so users opening the
      // skill in their editor see the redirect, not just the metadata.
      expect(
        /deprecat/i.test(content),
        `${name}/SKILL.md body must contain a visible deprecation note`,
      ).toBe(true);

      // Redirect should point at the v2 skill or the decision tree doc.
      expect(
        /continuous-learning-v2|memory-decision-tree/.test(String(data.redirect)),
        `${name}/SKILL.md redirect should point at continuous-learning-v2 or docs/memory-decision-tree.md`,
      ).toBe(true);
    },
  );

  it(`${CANONICAL_SKILL} is NOT deprecated (canonical surface)`, () => {
    const { data } = readSkill(CANONICAL_SKILL);
    expect(data.deprecated).not.toBe(true);
  });
});
