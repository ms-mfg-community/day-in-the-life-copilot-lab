import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

/**
 * Lab 10 contract — the mechanical definition of done for `specs/labs/lab10.md`.
 *
 * Follows the per-lab pattern already used by lab12/13/14, and exists so that
 * "the lab is current" is a command's verdict rather than a reviewer's opinion.
 * Each test below maps to a numbered acceptance criterion in the spec.
 */

const ROOT = process.cwd();
const LAB10 = join(ROOT, 'labs/lab10.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const SPEC = join(ROOT, 'specs/labs/lab10.md');
const SAMPLE_MEMORIES_REL = 'solutions/lab10-session-management/sample-memories.jsonl';
const SAMPLE_MEMORIES = join(ROOT, SAMPLE_MEMORIES_REL);
const SCNS_URL = 'https://github.com/johnhain-msft/scns';
const MEMORY_CONCEPT_URL = 'https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory';
const DREAMING_CONCEPT_URL = 'https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-dreaming';

function labBody(): string {
  return readFileSync(LAB10, 'utf8');
}

/** Text of the `## <id> …` section, up to the next level-2 heading. Empty if absent. */
function section(id: string): string {
  const lines = labBody().split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(`## ${id} `));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return [lines[start], ...(end === -1 ? rest : rest.slice(0, end))].join('\n');
}

/** Lines inside fenced code blocks. */
function codeLines(body: string): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) out.push(line);
  }
  return out;
}

/** Every model id named in the registry's `models:` block, flattened across tiers. */
function registryModels(): Set<string> {
  const doc = yaml.load(readFileSync(REGISTRY, 'utf8')) as {
    models?: Record<string, unknown>;
  };
  const models = doc.models ?? {};
  const out = new Set<string>();
  for (const value of Object.values(models)) {
    if (typeof value === 'string') out.add(value);
    else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') out.add(v);
  }
  return out;
}

// Vendor model identifiers, e.g. claude-opus-4.7 / gpt-5.4 / claude-haiku-4.5.
// Deliberately narrow: it matches an id shape, not any mention of a vendor.
const MODEL_ID = /\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi;

describe('lab10 contract: the spec exists and governs', () => {
  it('specs/labs/lab10.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab10 contract: AC5 — model names come from the registry', () => {
  it('every model identifier in lab10 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((labBody().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab10 names model(s) absent from docs/_meta/registry.yaml models:: ${unknown.join(', ')}. ` +
        `Either add them to the registry or have the lab reference the registry tier instead of ` +
        `hardcoding an id. Registry currently knows: ${[...known].sort().join(', ')}`,
    ).toEqual([]);
  });
});

describe('lab10 contract: AC6 — no unsourced relative-cost claims', () => {
  // These were asserted with no citation. Pricing moves and the lab cannot
  // carry a vendor-attributed number it does not source.
  const COST_CLAIMS: RegExp[] = [
    /\d+\s*\/\s*\d+\s*×/,
    /≈\s*\d+(?:\.\d+)?\s*\/\s*\d+\s*×/,
    /\d+\s*[–-]\s*\d+\s*%\s*more expensive/i,
    /\bcheaper than\b.*\b\d+\s*×/i,
  ];

  it('contains no hardcoded cost multiplier or relative-price claim', () => {
    const body = labBody();
    const hits = COST_CLAIMS.flatMap((re) => body.match(re) ?? []);
    expect(
      hits,
      `lab10 states a relative cost with no cited source: ${hits.join(' | ')}. ` +
        `Keep the cheap/standard/premium ordering, drop the multiplier.`,
    ).toEqual([]);
  });
});

describe('lab10 contract: AC7 — cited paths resolve', () => {
  it('every backticked repo path in lab10 exists on disk', () => {
    const body = labBody();
    // Backticked tokens that look like a repo-relative file path. Excludes
    // globs, home-relative paths and session-state placeholders, which are
    // illustrative rather than checkable.
    const candidates = [...body.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|mjs|ts))`/g)]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<'));

    const missing = [...new Set(candidates)].filter((rel) => {
      // A bare filename (README.md, log.md) is a reference to a file discussed
      // in prose, not necessarily a repo-root path; only check real paths.
      if (!rel.includes('/')) return false;
      return !existsSync(join(ROOT, rel));
    });

    expect(missing, `lab10 cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lab10 contract: AC8 — the memory spectrum is laid out in teaching order', () => {
  // Native recall first, then the DIY wiki, the binding schema, curation
  // (DIY + hosted), the custom service, the wrap, and cleanup last.
  const ORDER: Array<[string, RegExp]> = [
    ['10.0', /surface check/i],
    ['10.1', /Layer 1/i],
    ['10.2', /Copilot Memory/],
    ['10.3', /wiki|lessons/i],
    ['10.4', /Layer 3|schema/i],
    ['10.5', /consolidat|curat/i],
    ['10.6', /SCNS|custom/i],
    ['10.7', /wrap/i],
    ['10.8', /cleanup/i],
  ];

  it('has sections 10.0–10.8, in order, each about its topic', () => {
    const body = labBody();
    let last = -1;
    for (const [id, topic] of ORDER) {
      const heading = body.split(/\r?\n/).find((l) => l.startsWith(`## ${id} `));
      expect(heading, `lab10 is missing a "## ${id} …" section`).toBeDefined();
      expect(heading!, `"## ${id}" should be about ${topic}`).toMatch(topic);
      const at = body.indexOf(heading!);
      expect(at, `"## ${id}" is out of order`).toBeGreaterThan(last);
      last = at;
    }
    expect(body.indexOf('## Lab Complete'), 'Lab Complete must come after the 10.8 cleanup').toBeGreaterThan(last);
  });
});

describe('lab10 contract: AC9 — native Copilot Memory is taught with both scopes', () => {
  it('§10.2 names both memory types, the /memory command and the primary doc', () => {
    const s = section('10.2');
    expect(s, '§10.2 must name repository-level facts').toMatch(/repository-level fact/i);
    expect(s, '§10.2 must name user-level preferences').toMatch(/user-level preference/i);
    expect(s, '§10.2 must show the /memory slash command').toMatch(/`\/memory`/);
    expect(s, '§10.2 must link the Copilot Memory concept page').toContain(MEMORY_CONCEPT_URL);
  });

  it('teaches that asking Copilot to "forget" only downvotes a memory', () => {
    expect(labBody()).toMatch(/downvot/i);
  });
});

describe('lab10 contract: AC10 — bulk import is validation-only in this lab', () => {
  it('every `copilot memories import` command the lab shows carries --dry-run', () => {
    const imports = codeLines(labBody()).filter((l) => /copilot\s+memories\s+import\b/.test(l));
    expect(imports.length, 'lab10 should show a `copilot memories import … --dry-run` command').toBeGreaterThan(0);
    const live = imports.filter((l) => !/--dry-run\b/.test(l));
    expect(live, `lab10 shows an import that would submit memories: ${live.join(' | ')}`).toEqual([]);
  });

  it('the sample JSONL exists, is cited by the lab, and every record is schema-shaped and lab-tagged', () => {
    expect(existsSync(SAMPLE_MEMORIES), `expected ${SAMPLE_MEMORIES_REL}`).toBe(true);
    expect(labBody()).toContain(SAMPLE_MEMORIES_REL);
    const records = readFileSync(SAMPLE_MEMORIES, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      for (const key of ['type', 'version', 'scope', 'subject', 'fact', 'reason', 'citations']) {
        expect(r, `sample record is missing required field "${key}"`).toHaveProperty(key);
      }
      expect(r.type).toBe('memory');
      expect(Array.isArray(r.citations) && (r.citations as unknown[]).length > 0).toBe(true);
      // If a learner drops --dry-run by mistake, the record must be easy to find and delete.
      expect(String(r.fact), 'every sample fact must start with "Lab 10 sample"').toMatch(/^Lab 10 sample/);
    }
  });
});

describe('lab10 contract: AC11 — Dreaming is explained, never switched on', () => {
  it('§10.5 explains Copilot Dreaming, its cost model, and links the primary doc', () => {
    const s = section('10.5');
    expect(s, '§10.5 must explain Copilot Dreaming').toMatch(/Dreaming/);
    expect(s, '§10.5 must link the Copilot Dreaming concept page').toContain(DREAMING_CONCEPT_URL);
    expect(s, '§10.5 must say Dreaming runs bill AI credits').toMatch(/AI credits?/i);
  });

  it('says plainly that this lab does not enable Dreaming', () => {
    expect(labBody()).toMatch(
      /(?:not|never)\b[^.\n]{0,60}\b(?:enable|turn on|switch on)\b[^.\n]{0,40}Dreaming|Dreaming[^.\n]{0,80}\b(?:not|never)\b[^.\n]{0,30}\b(?:enable|turn on|switch on|exercise)/i,
    );
  });
});

describe('lab10 contract: AC12 — the custom-service option is taught honestly', () => {
  it('§10.6 links SCNS, flags its maturity, and keeps instructions as the binding layer', () => {
    const s = section('10.6');
    expect(s, '§10.6 must link the SCNS repository').toContain(SCNS_URL);
    expect(s, '§10.6 must say SCNS is alpha').toMatch(/\balpha\b/i);
    expect(s, '§10.6 must say a memory service does not replace instruction files').toMatch(/not a replacement|does not replace|doesn't replace/i);
  });
});

describe('lab10 contract: AC13 — cleanup removes what the lab stored on GitHub', () => {
  it('§10.8 deletes the lab\'s user-level and repository-level memories in settings', () => {
    const s = section('10.8');
    expect(s, '§10.8 must cover user-level preferences').toMatch(/user-level preference/i);
    expect(s, '§10.8 must cover repository-level facts').toMatch(/repository-level fact/i);
    expect(s, '§10.8 must send the learner to settings to delete them').toMatch(/settings/i);
  });
});

describe('lab10 contract: AC14 — no stale memory facts', () => {
  it('does not repeat the superseded 28-day expiry', () => {
    expect(labBody()).not.toMatch(/28[- ]day/i);
  });
});

describe('lab10 contract: AC15 — declared pacing and title are consistent', () => {
  it('frontmatter, the ⏱️ callout and the registry agree on minutes and title', () => {
    const fm = matter(labBody()).data as {
      title?: string;
      pace?: { presenter_minutes?: number; self_paced_minutes?: number };
    };
    const callout = labBody().match(/Presenter pace:\s*(\d+)\s*minutes?\s*\|\s*Self-paced:\s*(\d+)/);
    expect(callout, 'lab10 is missing its "⏱️ Presenter pace: …" callout').not.toBeNull();
    const reg = yaml.load(readFileSync(REGISTRY, 'utf8')) as {
      labs?: Record<string, { title?: string; pace_presenter_minutes?: number; pace_self_minutes?: number }>;
    };
    const row = reg.labs?.lab10;
    expect([Number(callout![1]), row?.pace_presenter_minutes]).toEqual([fm.pace?.presenter_minutes, fm.pace?.presenter_minutes]);
    expect([Number(callout![2]), row?.pace_self_minutes]).toEqual([fm.pace?.self_paced_minutes, fm.pace?.self_paced_minutes]);
    expect(row?.title, 'registry lab10 title must equal the lab frontmatter title').toBe(fm.title);
    expect(labBody(), 'the H1 must carry the frontmatter title').toContain(`# 10 — ${fm.title}`);
  });
});
