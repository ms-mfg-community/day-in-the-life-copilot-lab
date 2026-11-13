import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 03 contract — the mechanical definition of done for `specs/labs/lab03.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab03.md');
const SPEC = join(ROOT, 'specs/labs/lab03.md');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

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

/** The table row whose first cell contains `needle`. */
function row(text: string, needle: string): string {
  const found = text.split('\n').find((l) => l.startsWith('|') && l.split('|')[1]?.includes(needle));
  expect(found, `no table row whose first cell contains "${needle}"`).toBeDefined();
  return found as string;
}

describe('lab03 contract: the spec exists and governs', () => {
  it('specs/labs/lab03.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });
});

describe('lab03 contract: AC4 — the documented invocation form is used', () => {
  const atForms: Array<[string, RegExp]> = [
    ['@dotnet-dev', /@dotnet-dev/],
    ['@<track>-dev', /@<track>-dev/],
    ['@agent-name', /@agent-name/],
  ];

  it.each(atForms)('the %s invocation form is gone', (_label, re) => {
    expect(lab()).not.toMatch(re);
  });

  it('§3.4 selects the agent with the documented --agent flag', () => {
    expect(section('3.4')).toMatch(/--agent\b/);
  });
});

describe('lab03 contract: AC5 — the takeaways name the real invocation', () => {
  it('the Invocation row names --agent or /agent', () => {
    const r = row(section('3.5'), 'Invocation');
    expect(r).toMatch(/--agent\b|(?<![\w./])\/agent\b/);
    expect(r).not.toMatch(/@agent-name/);
  });
});

describe('lab03 contract: AC6 — mcp-servers has the published shape', () => {
  it('mcp-servers is not an array of strings', () => {
    expect(lab()).not.toMatch(/mcp-servers:\s*\[/);
  });

  it('the lab still demonstrates the mcp-servers key', () => {
    expect(lab()).toContain('mcp-servers');
  });
});

describe('lab03 contract: AC7 — the repo-local MCP config is named', () => {
  it('§3.3 names this repository .copilot/mcp-config.json', () => {
    const sec = section('3.3');
    const repoLocal = sec
      .split('\n')
      .some((l) => /(?<!~\/)(?<!\w)\.copilot\/mcp-config\.json/.test(l) && !/~\/\.copilot/.test(l));
    expect(repoLocal, '§3.3 points only at the home-directory MCP config').toBe(true);
  });
});

describe('lab03 contract: AC8 — no unsourced suffix absolute', () => {
  it('drops the claim that a plain .md file will not be picked up', () => {
    expect(lab()).not.toMatch(/will not be picked up/i);
  });

  it('still recommends the .agent.md convention', () => {
    expect(lab()).toContain('.agent.md');
  });
});

describe('lab03 contract: AC9 — name is not sold as the invocation handle', () => {
  it('the frontmatter comment no longer says name is how users invoke', () => {
    expect(lab()).not.toMatch(/How users invoke/i);
  });
});

describe('lab03 contract: AC10 — the tools table survives intact', () => {
  it.each([['read'], ['edit'], ['execute'], ['search'], ['agent'], ['web']])(
    'the %s tool alias is still listed',
    (alias) => {
      expect(row(section('3.1'), `\`${alias}\``)).toBeDefined();
    },
  );
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

describe('lab03 contract: AC11 — §3.3 is a read-only forward-reference preview of Lab 05', () => {
  const sec = (): string => section('3.3').replace(/\r\n/g, '\n');

  it('links Lab 05 by its title and calls the mcp-servers block a forward-reference preview', () => {
    expect(sec()).toContain('[Lab 05 — MCP Server Configuration](lab05.md)');
    expect(sec()).toMatch(/forward[- ]reference/i);
    expect(sec()).toMatch(/preview/i);
  });

  it('says the learner wires the block up after completing Lab 05, and not in this lab', () => {
    expect(sec()).toMatch(/after[\s\S]{0,120}Lab 05/i);
    expect(sec()).toMatch(/don.t (add|paste|wire)|do not (add|paste|wire)|not yet/i);
  });

  it('the mcp-servers frontmatter block itself tells the reader to wait for Lab 05', () => {
    const block = fencedBlocks(sec()).find((b) => b.includes('mcp-servers:'));
    expect(block, '§3.3 shows no fenced mcp-servers: block').toBeDefined();
    expect(block as string).toMatch(/^\s*#.*Lab 05/m);
  });

  it('keeps the hands-on steps on built-in tools: §3.2 (create) and §3.4 (test) wire up no MCP server', () => {
    for (const id of ['3.2', '3.4']) {
      expect(section(id), `§${id} mentions mcp-servers`).not.toMatch(/mcp-servers/);
      expect(section(id), `§${id} mentions context7`).not.toMatch(/context7/i);
    }
  });

  it('the agent the learner creates declares only built-in tool aliases (per both appendices)', () => {
    for (const rel of ['labs/appendices/dotnet/lab03.md', 'labs/appendices/node/lab03.md']) {
      const text = readFileSync(join(ROOT, rel), 'utf8');
      const toolLines = text.split(/\r?\n/).filter((l) => /^tools:/.test(l));
      expect(toolLines.length, `${rel} declares no tools: line`).toBeGreaterThan(0);
      for (const l of toolLines) expect(l, `${rel}: ${l}`).not.toMatch(/\//);
      expect(text, `${rel} wires an MCP server into the agent`).not.toMatch(/mcp-servers:/);
    }
  });
});

describe('lab03 contract: AC12 — §3.4 carries a Debug It callout: was the agent loaded, and what does it cost?', () => {
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
  const callout = (): string => callouts(section('3.4'))[0] ?? '';

  it('has exactly one such callout in the lab, and it sits in §3.4, before the learner leaves the session', () => {
    expect(callouts(lab()).length).toBe(1);
    expect(callouts(section('3.4')).length, 'the callout is not inside §3.4').toBe(1);
    const s = section('3.4');
    expect(s.indexOf(TITLE), 'the callout must come before the instruction to type /exit').toBeLessThan(
      s.indexOf('type `/exit` to leave Copilot'),
    );
  });

  it('uses /env to see the loaded agents and /context for the split of the window, with per-skill and per-agent usage tied to experimental mode', () => {
    expect(callout()).toContain('`/env`');
    expect(callout()).toContain('`/context`');
    expect(callout()).toContain('System Prompt');
    expect(callout()).toMatch(/experimental/i);
    expect(callout()).toMatch(/inside (?:the same|a running) `copilot` session|in the same `copilot` session/);
  });

  it('names the VS Code route: Discovery events in the Logs view, and the agent definition in the System prompt', () => {
    expect(callout()).toContain('Show Agent Debug Logs');
    expect(callout()).toContain('Logs view');
    expect(callout()).toContain('Discovery');
    expect(callout()).toContain('Show Chat Debug View');
    expect(callout()).toContain('System prompt');
  });

  it('adds no MCP wiring to the hands-on steps: the callout names neither mcp-servers nor context7', () => {
    expect(callout()).not.toMatch(/mcp-servers|context7/i);
  });

  it('links the guide', () => {
    expect(callout()).toContain('debugging-and-observability.md');
  });
});

describe('lab03 contract: spec alignment — specs/labs/lab03.md records the Phase 4 criterion', () => {
  it('has AC12 observed by this contract test', () => {
    expect(readFileSync(SPEC, 'utf8')).toMatch(/^\|\s*AC12\s*\|[^\n]*lab03-contract/m);
  });
});
