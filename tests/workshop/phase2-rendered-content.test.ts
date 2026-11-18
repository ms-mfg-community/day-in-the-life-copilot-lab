import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { loadSegments } from '../../workshop/spa/vite-content-plugin';

const ROOT = process.cwd();
const SOURCE = process.env.PHASE2_QA_SOURCE_ROOT ?? ROOT;
const segments = loadSegments(SOURCE);
const moduleHtml = (code: string) => {
  const segment = segments.find((entry) => entry.module === code);
  expect(segment, `module ${code} must reach the SPA content manifest`).toBeDefined();
  return segment!;
};

describe('Phase 2: teaching corrections reach the rendered SPA and speaker surface', () => {
  it('M1 renders command skills, explicit skill invocation and the no-precedence rule', () => {
    const { html } = moduleHtml('M1');

    expect(html).toContain('<strong>Command skills</strong>');
    expect(html).toContain('disable-model-invocation: true');
    expect(html).toMatch(/\.github\/skills\/(?:&#x3C;|&lt;)name(?:>|&gt;|&#x3E;)\/SKILL\.md/);
    expect(html).toContain('<code>/skill-name</code>');
    expect(html).toContain('no precedence order');
    expect(html).toContain('does not override a broader one');
    expect(html).not.toContain('.github/prompts');
    expect(html).not.toContain('you do not invoke them');
  });

  it('M1 speaker inventory matches the actual skill kinds, agents and hook scripts', () => {
    const skills = readdirSync(join(ROOT, '.github/skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => matter(readFileSync(join(ROOT, '.github/skills', entry.name, 'SKILL.md'), 'utf8')).data);
    const commandCount = skills.filter((data) => data['disable-model-invocation'] === true).length;
    const agents = readdirSync(join(ROOT, '.github/agents')).filter((file) => file.endsWith('.agent.md'));
    const hooks = readdirSync(join(ROOT, 'scripts/hooks')).filter((file) => /\.(?:sh|ps1)$/.test(file));
    const { scriptHtml } = moduleHtml('M1');

    const claim = scriptHtml.match(/this repo has (\d+) skills \((\d+) knowledge skills and (\d+) command skills\), (\d+) agents, (\d+) hook scripts/i);

    expect(claim, 'the speaker must distinguish command skills from knowledge packs').not.toBeNull();
    expect(claim!.slice(1).map(Number)).toEqual([
      skills.length, skills.length - commandCount, commandCount, agents.length, hooks.length,
    ]);
  });

  it('M4 slide and speaker both name the full committed workflow inventory, not a single shipped workflow', () => {
    const workflows = readdirSync(join(ROOT, '.github/workflows')).filter((file) => file.endsWith('.md'));
    const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const count = numberWords[workflows.length];
    const { html, scriptHtml } = moduleHtml('M4');

    expect(workflows).toHaveLength(4);
    expect(html).toContain(`one of the ${count} committed gh-aw workflows`);
    expect(scriptHtml).toContain(`commits ${count} gh-aw workflows`);
    for (const file of workflows) {
      expect(html).toContain(file);
      expect(scriptHtml).toContain(file);
    }
    expect(scriptHtml).not.toContain('one production gh-aw workflow');
  });
});
