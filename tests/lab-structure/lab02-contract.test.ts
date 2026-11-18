import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 02 contract — the mechanical definition of done for `specs/labs/lab02.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab02.md');
const SPEC = join(ROOT, 'specs/labs/lab02.md');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

/**
 * Lab 02 pastes Markdown the learner copies, so `## ContosoUniversity Conventions`
 * and `### ADR-001` appear *inside* fenced blocks. Section slicing has to ignore those
 * or it cuts a section short at a heading that is really sample content.
 */
function lines(): Line[] {
  let inFence = false;
  const out: Line[] = [];
  for (const text of lab().split('\n')) {
    if (/^\s*(```|~~~)/.test(text)) {
      inFence = !inFence;
      out.push({ text, inFence: true });
      continue;
    }
    out.push({ text, inFence });
  }
  return out;
}

const headingLevel = (l: Line): number => {
  if (l.inFence) return 0;
  const m = l.text.match(/^(#{2,6})\s/);
  return m ? m[1].length : 0;
};

/** Text of one numbered section, stopping at the next heading of the same or higher level. */
function section(prefix: string): string {
  const all = lines();
  const head = new RegExp(`^#{2,6}\\s+${prefix.replace(/\./g, '\\.')}(?![\\d.])`);
  const from = all.findIndex((l) => headingLevel(l) > 0 && head.test(l.text));
  expect(from, `heading "${prefix}" not found outside a code fence`).toBeGreaterThanOrEqual(0);
  const level = headingLevel(all[from]);
  const rest = all.slice(from + 1);
  const end = rest.findIndex((l) => {
    const lv = headingLevel(l);
    return lv > 0 && lv <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).map((l) => l.text).join('\n');
}

/**
 * The `/instructions` slash command, never the `.github/instructions/` path.
 * Without the lookbehind this check passes on the unedited lab, which already
 * contains `ls -1 .github/instructions/*.instructions.md`.
 */
const SLASH_INSTRUCTIONS = /(?<![\w./])\/instructions\b/;

describe('lab02 contract: the spec exists and governs', () => {
  it('specs/labs/lab02.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });

  it('the section parser ignores headings inside fenced sample Markdown', () => {
    expect(section('2.1')).toContain('## ContosoUniversity Conventions');
    expect(section('2.3')).toContain('### ADR-001');
  });
});

describe('lab02 contract: AC4 — References name the CLI doc', () => {
  it('links the Copilot CLI custom-instructions doc, not only the github.com one', () => {
    expect(lab()).toContain('copilot-cli/customize-copilot/add-custom-instructions');
  });
});

describe('lab02 contract: AC5 — the research citation points at the real paper', () => {
  it('arXiv 2506.17056 appears nowhere (it is a superconductivity paper)', () => {
    expect(lab()).not.toMatch(/2506\.17056/);
  });

  it('cites arXiv 2602.11988 and names it', () => {
    expect(lab()).toMatch(/2602\.11988/);
    expect(lab()).toMatch(/Evaluating AGENTS\.md/i);
  });
});

describe('lab02 contract: AC6 — the research callout matches its source', () => {
  const research = (): string => section('2.3');

  it('states the abstract\'s cost finding: inference cost over 20% on average', () => {
    expect(research()).toMatch(/over\s+20\s*%/i);
  });

  it('does not carry the invented 14-22% reasoning-token range', () => {
    expect(research()).not.toMatch(/14\s*[-\u2013\u2014]\s*22\s*%/);
  });

  it('does not carry the unsupported "nearly 100% redundant" figure', () => {
    expect(research()).not.toMatch(/nearly\s+100\s*%/i);
  });

  it('keeps the finding that it held for developer-committed files too', () => {
    expect(research()).toMatch(/developer-(committed|written|authored)/i);
  });

  it('names repository overviews as the unhelpful part, per the abstract', () => {
    expect(research()).toMatch(/overview/i);
  });
});

describe('lab02 contract: AC7 — /instructions is the deterministic check', () => {
  it('§2.2.3 names the /instructions command', () => {
    expect(section('2.2.3')).toMatch(SLASH_INSTRUCTIONS);
  });

  it('the model probe is no longer crowned the authoritative test', () => {
    expect(lab()).not.toMatch(/functional probe above is the authoritative test/i);
  });
});

describe('lab02 contract: AC8 — restart callout names both documented remedies', () => {
  it('§2.1 names /new and copilot --continue', () => {
    const sec = section('2.1');
    expect(sec).toMatch(/(?<![\w./])\/new\b/);
    expect(sec).toMatch(/--continue\b/);
  });
});

describe('lab02 contract: AC9 — setup prerequisite is stated up front', () => {
  it('links setup.md before the first ## heading', () => {
    const body = lab().replace(/^---\n[\s\S]*?\n---\n/, '');
    const head = body.slice(0, body.search(/^## /m));
    expect(head).toMatch(/\]\((?:\.\/)?setup\.md\)/);
  });
});

describe('lab02 contract: AC10 — sources are combined, not ranked', () => {
  it('§2.2 says Copilot combines the applicable instruction files', () => {
    expect(section('2.2')).toMatch(/combin/i);
  });

  it('§2.2 still names all three files that apply to a .cshtml edit', () => {
    const sec = section('2.2');
    for (const f of ['copilot-instructions.md', 'AGENTS.md', 'razor-views.instructions.md']) {
      expect(sec, `cascade callout no longer names ${f}`).toContain(f);
    }
  });

  it('the lab introduces no numbered precedence ranking for instruction sources', () => {
    expect(lab()).not.toMatch(/\|\s*Priority\s*\|/i);
  });
});

/** Contents of each fenced block in `text`, in order, fence lines excluded. */
function fencedBlocks(text: string): string[] {
  const blocks: string[] = [];
  let current: string[] | null = null;
  for (const l of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(l)) {
      if (current === null) current = [];
      else {
        blocks.push(current.join('\n'));
        current = null;
      }
    } else if (current) current.push(l);
  }
  return blocks;
}

/** The contiguous `>` blockquote that contains `marker`, `> ` prefixes removed. */
function blockquoteContaining(text: string, marker: string): string {
  const all = text.replace(/\r\n/g, '\n').split('\n');
  const at = all.findIndex((l) => l.startsWith('>') && l.includes(marker));
  expect(at, `no blockquote callout containing "${marker}"`).toBeGreaterThanOrEqual(0);
  let from = at;
  while (from > 0 && all[from - 1].startsWith('>')) from--;
  let to = at;
  while (to + 1 < all.length && all[to + 1].startsWith('>')) to++;
  return all
    .slice(from, to + 1)
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n');
}

describe('lab02 contract: AC11 — §2.2 spots the bloated-domain-instructions anti-pattern', () => {
  const TITLE = '🚫 Spot the Anti-Pattern: Bloated Domain Instructions';
  const EXEMPLAR = '.github/instructions/dotnet.instructions.md';
  const callout = (): string => blockquoteContaining(section('2.2'), TITLE);

  it('is a blockquote callout titled "🚫 Spot the Anti-Pattern: Bloated Domain Instructions"', () => {
    expect(section('2.2').replace(/\r\n/g, '\n')).toMatch(new RegExp(`^> \\*\\*${TITLE}\\*\\*`, 'm'));
  });

  it('contrasts a ~40-line stack-matched file with a ~230-line copy-pasted financial-compliance prompt', () => {
    const c = callout();
    expect(c, 'names no ~40-line figure').toMatch(/\b40\b/);
    expect(c, 'names no ~230-line figure').toMatch(/\b230\b/);
    expect(c).toMatch(/PCI-DSS/);
    expect(c).toMatch(/SOX/);
    expect(c).toMatch(/saga/i);
  });

  it('says why it costs: it spends context tokens each time a matching file loads it', () => {
    const c = callout();
    expect(c).toMatch(/token/i);
    expect(c).toMatch(/match/i);
  });

  it('points at the real concise exemplar, which is still far smaller than the 230-line prompt', () => {
    expect(callout()).toContain(EXEMPLAR);
    expect(existsSync(join(ROOT, EXEMPLAR)), `${EXEMPLAR} is not on disk`).toBe(true);
    const n = readFileSync(join(ROOT, EXEMPLAR), 'utf8').split(/\r?\n/).length;
    expect(n, `${EXEMPLAR} is ${n} lines — the lab calls it concise`).toBeLessThanOrEqual(60);
  });
});

describe('lab02 contract: AC12 — §2.3 teaches AGENTS.md by contrast: an ADR-001 anti-pattern box, then non-discoverable context', () => {
  const TITLE = '🚫 Spot the Anti-Pattern: What Does NOT Belong in AGENTS.md';
  const sec = (): string => section('2.3').replace(/\r\n/g, '\n');
  const adrBlock = (): string | undefined => fencedBlocks(sec()).find((b) => b.includes('### ADR-001'));
  const notesBlock = (): string | undefined => fencedBlocks(sec()).find((b) => b.includes('52379'));

  it('titles the box "🚫 Spot the Anti-Pattern: What Does NOT Belong in AGENTS.md"', () => {
    expect(sec()).toMatch(new RegExp(`^> \\*\\*${TITLE}\\*\\*`, 'm'));
  });

  it('keeps ### ADR-001 inside a fenced block that follows the box title — never as a live heading', () => {
    expect(adrBlock(), '§2.3 has no fenced block containing "### ADR-001"').toBeDefined();
    expect(sec().indexOf(TITLE)).toBeGreaterThanOrEqual(0);
    expect(sec().indexOf(TITLE)).toBeLessThan(sec().indexOf('### ADR-001'));
    const live = lines().filter((l) => !l.inFence && l.text.includes('### ADR-001'));
    expect(live.map((l) => l.text), '### ADR-001 appears outside a code fence').toEqual([]);
  });

  it('no longer has the learner paste the ADR: the anti-pattern block and the block to add are different blocks', () => {
    expect(notesBlock(), '§2.3 has no fenced block with the operational notes (port 52379)').toBeDefined();
    expect(notesBlock()).not.toBe(adrBlock());
    expect(adrBlock() as string).not.toMatch(/52379|lock\.yml|lab-sources/);
  });

  it('the block the learner adds states SQLite seed behavior, ports 52379/52380, and never hand-editing .lock.yml or lab-sources.json', () => {
    const notes = notesBlock() ?? '';
    expect(notes).toMatch(/SQLite/i);
    expect(notes).toMatch(/seed/i);
    expect(notes).toContain('52379');
    expect(notes).toContain('52380');
    expect(notes).toContain('.lock.yml');
    expect(notes).toContain('lab-sources.json');
    expect(notes).toMatch(/never/i);
  });

  it('explains the box with its two reasons — it duplicates copilot-instructions.md and lists discoverable structure — and cites arXiv 2602.11988', () => {
    const s = sec();
    expect(s).toMatch(/duplicat/i);
    expect(s).toMatch(/discover/i);
    expect(s).toContain('copilot-instructions.md');
    expect(s).toContain('2602.11988');
  });

  it('the notes only state what the repository really does (ports, SQLite dev config, seed-only-when-empty)', () => {
    const launch = readFileSync(join(ROOT, 'dotnet/ContosoUniversity.Web/Properties/launchSettings.json'), 'utf8');
    expect(launch).toContain('52379');
    expect(launch).toContain('52380');
    const dev = readFileSync(join(ROOT, 'dotnet/ContosoUniversity.Web/appsettings.Development.json'), 'utf8');
    expect(dev).toMatch(/Data Source=/);
    const seed = readFileSync(join(ROOT, 'dotnet/ContosoUniversity.Infrastructure/Data/DbInitializer.cs'), 'utf8');
    expect(seed, 'DbInitializer no longer skips seeding when Students exist').toMatch(/Students\.AnyAsync/);
    expect(existsSync(join(ROOT, 'lab-studio/lab-sources.json'))).toBe(true);
  });
});

describe('lab02 contract: AC13 — §2.2.3 carries a Debug It callout: did the rule reach the model?', () => {
  const TITLE = '🔍 Debug It (VS Code & Copilot CLI)';
  const callouts = (text: string): string[] => {
    const all = text.replace(/\r\n/g, '\n').split('\n');
    const out: string[] = [];
    all.forEach((l, i) => {
      if (!l.startsWith(`> **${TITLE}**`)) return;
      let to = i;
      while (to + 1 < all.length && all[to + 1].startsWith('>')) to++;
      out.push(all.slice(i, to + 1).map((x) => x.replace(/^>\s?/, '')).join('\n'));
    });
    return out;
  };
  const callout = (): string => callouts(section('2.2.3'))[0] ?? '';

  it('has exactly one such callout in the lab, and it sits in §2.2.3, the verification step', () => {
    expect(callouts(lab()).length).toBe(1);
    expect(callouts(section('2.2.3')).length, 'the callout is not inside §2.2.3').toBe(1);
  });

  it('goes beyond /instructions: /env for what the session loaded and /context for the Custom Instructions share', () => {
    expect(callout()).toContain('`/env`');
    expect(callout()).toContain('`/context`');
    expect(callout()).toContain('Custom Instructions');
    expect(callout()).toMatch(/inside a running `copilot` session/);
  });

  it('names the VS Code route: Chat: Open Customizations, Show Agent Debug Logs with Discovery events, and the System prompt in Show Chat Debug View', () => {
    expect(callout()).toContain('Chat: Open Customizations');
    expect(callout()).toContain('Show Agent Debug Logs');
    expect(callout()).toContain('Discovery');
    expect(callout()).toContain('Show Chat Debug View');
    expect(callout()).toContain('System prompt');
  });

  it('separates loaded and included from followed, and links the guide', () => {
    expect(callout()).toMatch(/follow/i);
    expect(callout()).toContain('debugging-and-observability.md');
  });

  it('does not disturb the §2.2 anti-pattern callout: the two stay separate blockquotes', () => {
    const sec = section('2.2').replace(/\r\n/g, '\n');
    const anti = sec.split('\n').findIndex((l) => l.startsWith('> **🚫 Spot the Anti-Pattern: Bloated Domain Instructions**'));
    const debug = sec.split('\n').findIndex((l) => l.startsWith(`> **${TITLE}**`));
    expect(anti).toBeGreaterThanOrEqual(0);
    expect(debug).toBeGreaterThan(anti);
    const between = sec.split('\n').slice(anti, debug);
    expect(between.some((l) => !l.startsWith('>')), 'the callouts run together').toBe(true);
  });
});

describe('lab02 contract: spec alignment — specs/labs/lab02.md records the Phase 4 criterion', () => {
  it('has AC13 observed by this contract test', () => {
    expect(readFileSync(SPEC, 'utf8')).toMatch(/^\|\s*AC13\s*\|[^\n]*lab02-contract/m);
  });
});
