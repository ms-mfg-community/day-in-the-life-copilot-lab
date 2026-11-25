import { afterAll, describe, expect, it } from 'vitest';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { TRACKS } from '../../lab-studio/client/src/labs/tracks';

/**
 * Lab 27 contract — the mechanical definition of done for `specs/labs/lab27.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared (see lab20-contract.test.ts).
 * Everything here is offline: no model call, no network, no AIU. The Vally CLI is
 * never required; where a script needs one, a fake `vally` stands in for it.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab27.md');
const SPEC = join(ROOT, 'specs/labs/lab27.md');
const TEMPLATE = join(ROOT, 'specs/labs/_lab-template.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const FIXTURE = join(ROOT, 'labs/fixtures/lab27');
const GRADERS = join(FIXTURE, 'evals/graders');
const HOOKS = join(FIXTURE, 'evals/guards/hooks');
const RECORDED = join(FIXTURE, 'evals/fixtures/recorded-results.jsonl');
const MODULE_SLIDE = join(ROOT, 'workshop/slides/65-module-6b-agent-evals-vally.md');
const MODULE_SCRIPT = join(ROOT, 'workshop/speaker-scripts/module-06b-agent-evals-vally.md');

const require = createRequire(import.meta.url);

const read = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const loadYaml = (path: string): any => yaml.load(read(path));
const lab = (): string => read(LAB);
const spec = (): string => read(SPEC);

const NODE = process.execPath;
const runNode = (args: string[], options: { input?: string; cwd?: string; env?: NodeJS.ProcessEnv } = {}) =>
  spawnSync(NODE, args, { encoding: 'utf8', cwd: options.cwd ?? ROOT, input: options.input, env: options.env ?? process.env });

/** Temp directories this file created, removed by exact path in afterAll. */
const scratchDirs: string[] = [];
const scratch = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratchDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

/** Text files under a directory, skipping run output and dependency folders. */
function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name === 'vally-results' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

/** A markdown string with its fenced code blocks removed, so only prose remains. */
const withoutFences = (md: string): string => md.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');

// ---------------------------------------------------------------------------
// The spec exists and is shaped like specs/labs/_lab-template.md
// ---------------------------------------------------------------------------
describe('lab27 contract: AC3 — the per-lab spec exists and follows the template', () => {
  it('specs/labs/lab27.md exists and is non-empty — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
    expect(statSync(SPEC).size).toBeGreaterThan(0);
  });

  it('is marked ready and states the lab-forge verdict explicitly', () => {
    const text = spec();

    expect(text).toMatch(/\|\s*\*\*Spec state\*\*\s*\|\s*`ready`\s*\|/);
    expect(text).toMatch(/\*\*`lab-forge` verdict\*\*\s*\|\s*\*\*`run with §7 fenced`\*\*/);
  });

  it('has the template’s seven H2 sections, in order', () => {
    const headings = [...spec().matchAll(/^## (.+)$/gm)].map((m) => m[1]);

    expect(headings).toEqual([
      '1. Target state',
      '2. Declared surface',
      '3. Acceptance criteria',
      '4. Outside-world claims',
      '5. Non-goals',
      '6. Known defects',
      '7. Out of scope for `lab-forge`',
    ]);
  });

  it('keeps AC1–AC3 verbatim from the template and gives every criterion an observing command', () => {
    const rowOf = (text: string, id: string): string => text.split('\n').find((l) => l.startsWith(`| ${id} |`)) ?? '';
    for (const id of ['AC1', 'AC2', 'AC3']) {
      expect(rowOf(spec(), id), `${id} must match specs/labs/_lab-template.md exactly`).toBe(rowOf(read(TEMPLATE), id));
    }

    const rows = spec()
      .split('\n')
      .filter((l) => /^\| AC\d+ \|/.test(l));
    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const row of rows) {
      const cells = row.split(/(?<!\\)\|/).map((c) => c.trim());
      expect(cells[3], `${cells[1]} has no "Observed by" command`).not.toBe('');
    }
  });
});

// ---------------------------------------------------------------------------
// AC2 / AC5 — the lab file and its registry entry
// ---------------------------------------------------------------------------
describe('lab27 contract: AC2 — frontmatter, H1, callouts and section structure', () => {
  it('has exactly the four frontmatter keys, in the sibling labs’ shape', () => {
    const fm = matter(lab()).data;

    expect(fm).toEqual({
      title: 'Evaluating Agents, Skills, and Models with Vally and AgentEvals',
      lab_number: 27,
      pace: { presenter_minutes: 8, self_paced_minutes: 40 },
      registry: 'docs/_meta/registry.yaml',
    });
    expect(lab().split('\n').slice(0, 8).join('\n')).toBe(
      [
        '---',
        'title: "Evaluating Agents, Skills, and Models with Vally and AgentEvals"',
        'lab_number: 27',
        'pace:',
        '  presenter_minutes: 8',
        '  self_paced_minutes: 40',
        'registry: docs/_meta/registry.yaml',
        '---',
      ].join('\n'),
    );
  });

  it('has the H1 on line 10 and the three opening callouts', () => {
    const lines = lab().split('\n');

    expect(lines[8]).toBe('');
    expect(lines[9]).toBe('# 27 — Evaluating Agents, Skills, and Models with Vally and AgentEvals');
    expect(lab()).toContain('> ⏱️ Presenter pace: 8 minutes | Self-paced: 40 minutes');
    expect(lab()).toContain(
      '**Part of:** Labs 21–27, the enterprise agentic SDLC harness arc — builds on [Lab 25](lab25.md) and [Lab 26](lab26.md)',
    );
    expect(lab()).toContain('> 💰 **Cost Budget**');
    expect(lab()).toContain('[docs/token-and-model-guide.md](../docs/token-and-model-guide.md)');
  });

  it('has sections 27.0 to 27.10 in order, then Versions and pins', () => {
    const headings = [...withoutFences(lab()).matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    const numbered = headings.filter((h) => /^27\.\d+ /.test(h)).map((h) => h.split(' ')[0]);

    expect(numbered).toEqual(Array.from({ length: 11 }, (_, i) => `27.${i}`));
    expect(headings[headings.length - 1]).toBe('Versions and pins');
    expect(headings.indexOf('Versions and pins')).toBeGreaterThan(headings.findIndex((h) => h.startsWith('27.10')));
  });

  it('uses all four surface badges', () => {
    for (const badge of ['\u{1F41A}', '\u{1F916}', '\u{1F4A0}', '\u{1F4AC}']) {
      expect(lab(), `lab27.md never uses ${badge}`).toContain(badge);
    }
  });
});

describe('lab27 contract: AC5 — registry agreement', () => {
  const registry = (): any => loadYaml(REGISTRY);

  it('labs.lab27 carries the title and pacing the lab declares, with workshop >= presenter', () => {
    const entry = registry().labs.lab27;
    const fm = matter(lab()).data;

    expect(entry.title).toBe(fm.title);
    expect(entry.pace_presenter_minutes).toBe(fm.pace.presenter_minutes);
    expect(entry.pace_self_minutes).toBe(fm.pace.self_paced_minutes);
    expect(entry.pace_workshop_minutes).toBeGreaterThanOrEqual(entry.pace_presenter_minutes);
    expect(lab()).toContain(
      `> ⏱️ Presenter pace: ${entry.pace_presenter_minutes} minutes | Self-paced: ${entry.pace_self_minutes} minutes`,
    );
  });

  it('pins the Vally CLI with a dated verification, and the Track 5 comments say Labs 21-27', () => {
    const raw = read(REGISTRY);
    const doc = registry();

    expect(doc.vally_cli_version).toBe('0.21.0');
    expect(doc.vally_cli_version_last_verified).toBe('2026-11-24');
    expect(raw).toMatch(/Labs 21-27/);
    expect(raw, 'a Track 5 comment still says Labs 21-26').not.toMatch(/Labs 21-26/);
  });
});

describe('lab27 contract: AC6 — models and versions come from the registry', () => {
  const MODEL_ID = /\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi;

  function registryModels(): Set<string> {
    const out = new Set<string>();
    for (const value of Object.values(loadYaml(REGISTRY).models ?? {})) {
      if (typeof value === 'string') out.add(value);
      else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') out.add(v);
    }
    return out;
  }

  it('names only models listed in the registry', () => {
    const known = registryModels();
    const named = [...new Set([...lab().matchAll(MODEL_ID)].map((m) => m[0].toLowerCase()))];

    expect(named.length, 'lab27 should name the default MODEL it uses').toBeGreaterThan(0);
    expect(named.filter((id) => !known.has(id))).toEqual([]);
  });

  it('hardcodes no Vally version: it reads vally_cli_version from the registry', () => {
    const pin = String(loadYaml(REGISTRY).vally_cli_version);

    expect(lab(), 'the pinned Vally version must not appear in lab prose').not.toContain(pin);
    expect(lab()).toContain('vally_cli_version');
    expect(lab()).toContain('docs/_meta/registry.yaml');
  });
});

describe('lab27 contract: AC7 — every backticked repository path resolves', () => {
  const EXT = /\.(?:md|json|jsonl|yaml|yml|sh|ps1|cjs|mjs|ts|js|cs|csproj|sln)$/;

  const pathsIn = (markdown: string): string[] =>
    [...withoutFences(markdown).matchAll(/`([A-Za-z0-9_.\/-]+)`/g)]
      .map((m) => m[1])
      .filter((token) => token.includes('/') && EXT.test(token) && !token.startsWith('http'));

  // Every backticked path is repository-root-relative, like the other labs' contract tests require.
  const resolves = (token: string): boolean => existsSync(resolve(ROOT, token));

  it.each([
    ['labs/lab27.md', lab],
    ['specs/labs/lab27.md', spec],
  ])('%s cites only paths that exist', (_name, source) => {
    const tokens = pathsIn(source());

    expect(tokens.length).toBeGreaterThan(3);
    expect(tokens.filter((t) => !resolves(t))).toEqual([]);
  });

  it('the path check is live: a made-up path is flagged and a real one is not', () => {
    expect(pathsIn('`no/such/folder/file.md`').filter((t) => !resolves(t))).toEqual(['no/such/folder/file.md']);
    expect(pathsIn('`docs/_meta/registry.yaml`').filter((t) => !resolves(t))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC8 — the graders, the cost tool and the fixture run offline
// ---------------------------------------------------------------------------
describe('lab27 contract: AC8 — Demo A and Demo C run offline with zero model calls', () => {
  it('self-check.cjs exits 0 and ends with the five-check summary', () => {
    const run = runNode([join(GRADERS, 'self-check.cjs')]);

    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout.trimEnd().split('\n').pop()).toBe('self-check: 5/5 checks passed (0 model calls, 0 AIU)');
  });

  it('eval-cost.cjs prices the recorded fixture root-only and passes the default budget', () => {
    const run = runNode([join(GRADERS, 'eval-cost.cjs'), RECORDED]);

    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toMatch(/Total root-only AIU: 2\.93 AIU \| Budget status: PASS/);
    expect(run.stdout).toMatch(/SYNTHESIZED and illustrative/);
    expect(run.stdout).toMatch(/\(2\.00x\): never add a root to its children/);
  });

  it('eval-cost.cjs fails the same run under a lower ceiling, exiting 1', () => {
    const run = runNode([join(GRADERS, 'eval-cost.cjs'), RECORDED, '--max-aiu', '2']);

    expect(run.status).toBe(1);
    expect(run.stdout).toMatch(/Total root-only AIU: 2\.93 AIU \| Budget status: FAIL/);
  });

  it('eval-cost.cjs reports UNKNOWN, exiting 2, when a run recorded no usage', () => {
    const { analyzeResultsJsonl } = require(join(GRADERS, 'eval-cost.cjs'));
    const noUsage = JSON.stringify({ type: 'trial-result', stimulus: 'a', trajectory: { events: [], metrics: {} } });

    const analysis = analyzeResultsJsonl(noUsage, { maxAiu: 5 });

    expect(analysis.status).toBe('UNKNOWN');
    expect(analyzeResultsJsonl('', { maxAiu: 5 }).status).toBe('UNKNOWN');
  });

  it('eval-cost.cjs reports UNKNOWN, exiting 2, when only some trials are priced', () => {
    const trial = (stimulus: string, metrics: object) =>
      JSON.stringify({ type: 'trial-result', stimulus, trajectory: { events: [], metrics } });
    const priced = trial('priced', { tokenUsage: { cost: { provider: 'github-copilot', unit: 'nano-aiu', amount: 1270000000 } } });
    const results = join(scratch('lab27-cost-'), 'results.jsonl');
    writeFileSync(results, `${priced}\n${trial('unpriced', {})}\n`);

    const run = runNode([join(GRADERS, 'eval-cost.cjs'), results]);

    expect(run.status, run.stderr).toBe(2);
    expect(run.stdout).toMatch(/WARN: unpriced:/);
    expect(run.stdout).toMatch(/Budget status: UNKNOWN/);
  });

  it('the recorded fixture is synthesized, honest about its executor, and names only placeholders', () => {
    const records = read(RECORDED)
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const trials = records.filter((r) => r.type === 'trial-result');

    expect(records.map((r) => r.type)).toEqual(['trial-result', 'trial-result', 'trial-result', 'run-summary']);
    expect(trials.map((t) => t.stimulus.name ?? t.stimulus)).toHaveLength(3);
    for (const t of trials) {
      expect(t.runId).toBe('run-lab27-recorded-001');
      expect(t.workspacePath).toBe('/workspace/contoso-university');
      expect(t.trajectory.workDir).toBe('/workspace/contoso-university');
      expect(t.trajectory.metadata.executor).toBe('mock');
    }
  });
});

// ---------------------------------------------------------------------------
// AC9 / AC11 — the project file, the four evals and the AgentEvals bridge
// ---------------------------------------------------------------------------
describe('lab27 contract: AC9 — .vally.yaml and the four eval specs', () => {
  const project = (): any => loadYaml(join(FIXTURE, '.vally.yaml'));
  const EVALS = {
    'evals/hermetic/reviewer-routing/eval.yaml': 'capability',
    'evals/hermetic/skill-triggers/eval.yaml': 'capability',
    'evals/guards/no-unapproved-push/eval.yaml': 'regression',
    'evals/guards/secret-scan-guard/eval.yaml': 'regression',
  } as const;
  const evalPath = (rel: string): string => join(FIXTURE, rel);
  const baseDirOf = (rel: string): string => resolve(evalPath(rel), '..');

  it('uses only the seven root keys Vally accepts, with the declared paths and params', () => {
    const doc = project();

    expect(Object.keys(doc).every((k) => ['metadata', 'paths', 'environments', 'suites', 'plugins', 'defaults', 'params'].includes(k))).toBe(true);
    expect(doc.paths).toEqual({
      skills: ['../../../.github/skills'],
      evals: ['evals'],
      results: 'vally-results',
      evalFilenames: ['eval.yaml', 'eval.yml'],
    });
    expect(doc.params).toEqual({
      MODEL: 'gpt-5-mini',
      EVALS_DIR: 'evals',
      RUN_DIR: 'vally-results',
      AGENTS_DIR: '../../../.github/agents',
    });
    expect(Object.keys(doc.suites).sort()).toEqual(['full', 'full-guards', 'pr-gate', 'pr-gate-guards']);
  });

  it('resolves project-level paths from the project file and environment paths from each eval', () => {
    const doc = project();

    expect(resolve(FIXTURE, doc.paths.skills[0])).toBe(join(ROOT, '.github/skills'));
    expect(resolve(FIXTURE, doc.params.AGENTS_DIR)).toBe(join(ROOT, '.github/agents'));

    const guards = doc.environments['contoso-guards'];
    for (const rel of ['evals/guards/no-unapproved-push/eval.yaml', 'evals/guards/secret-scan-guard/eval.yaml']) {
      for (const skill of guards.skills) expect(existsSync(resolve(baseDirOf(rel), skill)), `${rel}: ${skill}`).toBe(true);
      for (const file of guards.files) expect(existsSync(resolve(baseDirOf(rel), file.src)), `${rel}: ${file.src}`).toBe(true);
    }
    expect(guards.files.map((f: any) => f.dest)).toEqual(['.github/hooks/default.json', 'scripts/hooks/pre-tool-guard.cjs']);
  });

  it('each suite globs at least one existing eval, and pr-gate keeps the P0 filter', () => {
    const doc = project();

    expect(doc.suites['pr-gate'].filter).toEqual({ priority: 'p0' });
    expect(doc.suites['pr-gate-guards'].filter).toEqual({ priority: 'p0' });
    for (const [name, suite] of Object.entries<any>(doc.suites)) {
      const dir = suite.evals[0].replace(/\/\*\/eval\.yaml$/, '');
      const matches = readdirSync(join(FIXTURE, dir)).filter((d) => existsSync(join(FIXTURE, dir, d, 'eval.yaml')));
      expect(matches.length, `suite ${name} matches no eval.yaml under ${dir}`).toBeGreaterThanOrEqual(2);
    }
  });

  describe.each(Object.entries(EVALS))('%s', (rel, type) => {
    const doc = (): any => loadYaml(evalPath(rel));

    it('declares the type and the scoring the lab teaches, and is not an AgentEvals file', () => {
      expect(doc().type).toBe(type);
      expect(doc().scoring).toEqual({ threshold: 1.0, weights: { program: 1.0 } });
      expect(doc()).not.toHaveProperty('execution');
      expect(doc()).not.toHaveProperty('assert');
      if (type === 'regression') expect(doc().agent_environment).toBe('contoso-guards');
    });

    it('stages its graders into .vally-grading from files that exist, resolved from the eval’s own folder', () => {
      const files = doc().grading_environment.files;

      expect(files.length).toBeGreaterThanOrEqual(2);
      for (const f of files) {
        expect(f.dest).toMatch(/^\.vally-grading\/graders\/[a-z-]+\.cjs$/);
        expect(existsSync(resolve(baseDirOf(rel), f.src)), `${f.src} does not resolve from ${rel}`).toBe(true);
      }
      const inline = doc().agent_environment;
      if (typeof inline === 'object') {
        for (const f of inline.files) expect(existsSync(resolve(baseDirOf(rel), f.src)), `${f.src}`).toBe(true);
      }
    });

    it('uses unique kebab-case grader names of 60 characters or fewer and parseable JSON config', () => {
      const names: string[] = [];
      for (const s of doc().stimuli) {
        expect(s.constraints.max_agent_duration, `${s.name} has no max_agent_duration`).toBeTruthy();
        expect(Object.keys(s).every((k) => ['name', 'prompt', 'tags', 'constraints', 'graders'].includes(k)), s.name).toBe(true);
        for (const g of s.graders) {
          expect(g.type).toBe('program');
          expect(g.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
          expect(g.name.length).toBeLessThanOrEqual(60);
          names.push(g.name);
          const blob = g.config.env.ISSUED_CALL_CONFIG ?? g.config.env.GUARD_CONFIG;
          expect(() => JSON.parse(blob), `${g.name} config is not JSON`).not.toThrow();
        }
      }
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('every ISSUED_CALL_CONFIG uses only the eight settings the grader understands', () => {
    const allowed = new Set([
      'requiredTools', 'forbiddenTools', 'requiredArgSubstrings', 'forbiddenArgSubstrings',
      'requiredAgents', 'forbiddenAgents', 'requiredSkills', 'forbiddenSkills',
    ]);
    for (const rel of ['evals/hermetic/reviewer-routing/eval.yaml', 'evals/hermetic/skill-triggers/eval.yaml']) {
      for (const s of loadYaml(evalPath(rel)).stimuli) {
        for (const g of s.graders) {
          const keys = Object.keys(JSON.parse(g.config.env.ISSUED_CALL_CONFIG));
          expect(keys.filter((k) => !allowed.has(k)), `${s.name}`).toEqual([]);
        }
      }
    }
  });

  it('keeps the claim the lab makes: every hermetic eval pairs positives with a negative, and pr-gate runs five of six stimuli', () => {
    const all: any[] = [];
    for (const rel of ['evals/hermetic/reviewer-routing/eval.yaml', 'evals/hermetic/skill-triggers/eval.yaml']) {
      const stimuli = loadYaml(evalPath(rel)).stimuli;
      const kinds = stimuli.map((s: any) => s.tags.kind);
      expect(kinds, rel).toContain('positive');
      expect(kinds, rel).toContain('negative');
      all.push(...stimuli);
    }

    expect(all).toHaveLength(6);
    expect(all.filter((s) => s.tags.priority === 'p0')).toHaveLength(5);
    expect(all.filter((s) => s.tags.priority === 'p1').map((s) => s.name)).toEqual([
      'negative-no-lab-studio-sync-on-ef-core-question',
    ]);
  });

  it('every staged agent and skill the evals name exists in the repository', () => {
    const text = [
      'evals/hermetic/reviewer-routing/eval.yaml',
      'evals/hermetic/skill-triggers/eval.yaml',
    ]
      .map((rel) => read(evalPath(rel)))
      .join('\n');
    const agents = [...text.matchAll(/\.github\/agents\/([a-z-]+)\.agent\.md/g)].map((m) => m[1]);

    expect(agents.length).toBeGreaterThanOrEqual(4);
    for (const name of new Set(agents)) expect(existsSync(join(ROOT, '.github/agents', `${name}.agent.md`)), name).toBe(true);
  });
});

describe('lab27 contract: AC11 — the AgentEvals bridge is a valid-looking EVAL.yaml that Vally never discovers', () => {
  const evalYaml = (): any => loadYaml(join(FIXTURE, 'evals/agentevals/EVAL.yaml'));

  it('uses top-level assert (never execution.evaluators) and demonstrates the seven headline evaluators', () => {
    const doc = evalYaml();

    expect(doc.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(doc.name.length).toBeGreaterThanOrEqual(2);
    expect(doc.name.length).toBeLessThanOrEqual(64);
    expect(doc.version).toBe('1.0');
    expect(doc.execution).not.toHaveProperty('evaluators');
    expect(Array.isArray(doc.assert)).toBe(true);
    const types = new Set(doc.assert.map((a: any) => a.type));
    for (const t of ['code_judge', 'llm_judge', 'rubric', 'composite', 'tool_trajectory', 'field_accuracy', 'execution_metrics']) {
      expect(types.has(t), `assert: is missing a ${t}`).toBe(true);
    }
    expect(doc.tests.length).toBeGreaterThanOrEqual(2);
  });

  it('carries the three-way ecosystem and gen_ai.evaluation.result commentary, and fetches nothing', () => {
    const raw = read(join(FIXTURE, 'evals/agentevals/EVAL.yaml'));

    expect(raw).toMatch(/THREE DIFFERENT THINGS SHARE THE NAME/);
    expect(raw).toMatch(/gen_ai\.evaluation\.result/);
    expect(raw).toMatch(/404/);
    expect(raw).not.toMatch(/^\s*\$schema\s*:/m);
  });

  it('is excluded from Vally discovery because filename matching is case-sensitive', () => {
    const names: string[] = loadYaml(join(FIXTURE, '.vally.yaml')).paths.evalFilenames;

    expect(names).toContain('eval.yaml');
    expect(names).not.toContain('EVAL.yaml');
    expect(names.some((n) => n === 'EVAL.yaml')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC10 — the guard hook is exercised for real; the repo's own hooks are untouched
// ---------------------------------------------------------------------------
describe('lab27 contract: AC10 — the staged preToolUse guard hook', () => {
  const HOOK = join(HOOKS, 'pre-tool-guard.cjs');
  const fire = (payload: string, workspace: string) =>
    runNode([HOOK], { input: payload, cwd: workspace, env: { ...process.env, EVALUATE_WORKSPACE: workspace } });
  const auditLines = (workspace: string): any[] => {
    const file = join(workspace, '.vally-guard-audit.jsonl');
    return existsSync(file) ? read(file).split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  };

  it('denies the recorded git push payload and appends one audit line', () => {
    const workspace = scratch('lab27-hook-');

    const run = fire(read(join(FIXTURE, 'evals/fixtures/hook-payload-git-push.json')), workspace);

    expect(run.status).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual({
      permissionDecision: 'deny',
      permissionDecisionReason: expect.stringContaining('git push'),
    });
    const lines = auditLines(workspace);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ event: 'preToolUse', toolName: 'bash', permissionDecision: 'deny' });
  });

  it('stays silent on git status and writes no audit line', () => {
    const workspace = scratch('lab27-hook-');

    const run = fire(read(join(FIXTURE, 'evals/fixtures/hook-payload-git-status.json')), workspace);

    expect(run.status).toBe(0);
    expect(run.stdout).toBe('');
    expect(auditLines(workspace)).toEqual([]);
  });

  it('denies a hardcoded credential written through a file tool, and not an environment lookup', () => {
    const credential = 'Pass' + 'word=' + 'hunter2x' + ';'; // assembled so no secret literal sits in this file
    const write = (text: string): string =>
      JSON.stringify({ toolName: 'create', toolArgs: JSON.stringify({ path: 'Data/Conn.cs', file_text: text }) });
    const workspace = scratch('lab27-hook-');

    const denied = fire(write(`var cs = "Server=db;${credential}";`), workspace);
    const allowed = fire(write('var cs = config.GetConnectionString("School");'), workspace);

    expect(JSON.parse(denied.stdout).permissionDecision).toBe('deny');
    expect(allowed.stdout).toBe('');
    expect(auditLines(workspace)).toHaveLength(1);
  });

  it('never throws on garbage input: it reports on stderr and decides nothing', () => {
    const run = fire('this is not json', scratch('lab27-hook-'));

    expect(run.status).toBe(0);
    expect(run.stdout).toBe('');
    expect(run.stderr).toMatch(/not JSON/);
  });

  it('is not wired into the repository’s own hook configuration, which still has no push handler', () => {
    const rootConfig = read(join(ROOT, '.github/hooks/default.json'));

    expect(rootConfig).not.toMatch(/pre-tool-guard/);
    expect(rootConfig).not.toMatch(/\bpush\b/i);
    expect(Object.values(JSON.parse(rootConfig).hooks as Record<string, unknown[]>).flat()).toHaveLength(7);
    expect(read(join(HOOKS, 'default.json'))).toContain('node ./scripts/hooks/pre-tool-guard.cjs');
    expect(existsSync(join(ROOT, 'scripts/hooks/pre-tool-guard.cjs'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC12 — Track 5 range, the forward link, and the README
// ---------------------------------------------------------------------------
describe('lab27 contract: AC12 — Track 5 reads Labs 21–27 everywhere it should', () => {
  it.each(['lab20', 'lab21', 'lab22', 'lab23', 'lab24', 'lab25', 'lab26'])('labs/%s.md names the 21–27 arc, not 21–26', (name) => {
    const text = read(join(ROOT, `labs/${name}.md`));

    expect(text).toMatch(/Labs 21–27/);
    expect(text).not.toMatch(/21–26|21-26/);
  });

  it('the executive blueprint says its hands-on implementation is Labs 21–27', () => {
    const text = read(join(ROOT, 'docs/enterprise-harness-blueprint.md'));

    expect(text).toContain('the hands-on implementation is Labs 21–27.');
    expect(text).not.toMatch(/Labs 21–26/);
  });

  it('Lab 26 ends by linking forward to Lab 27', () => {
    expect(read(join(ROOT, 'labs/lab26.md')).trimEnd().split('\n').pop()).toBe(
      '**Next:** [Lab 27 — Evaluating Agents, Skills, and Models with Vally and AgentEvals](lab27.md)',
    );
  });
});

describe('lab27 contract: AC12 — the README agrees with the registry and with Lab Studio', () => {
  const readme = (): string => read(join(ROOT, 'README.md'));
  const labs = (): Record<string, any> => loadYaml(REGISTRY).labs;
  const hours = (minutes: number): string => (minutes / 60).toFixed(1);

  it('counts 27 labs wherever it counts labs, and keeps the skills count at 26', () => {
    const text = readme();

    expect(text).toContain('The 27 labs are organized into **five learning tracks**.');
    expect(text).toContain('# 27 hands-on lab modules + per-track appendices');
    expect(text).toContain('| 27 hands-on labs — start here');
    expect(text).toContain('Browser-based guided runner for all 27 labs');
    expect(text).toContain('across all 27 labs)');
    expect(text).not.toMatch(/\b26 (?:hands-on|labs)\b/);
    expect(text).toContain('7 knowledge packs and 19 `/name` command skills | 26 |');
  });

  it('derives its hour totals from the registry’s pacing: ~17.1 hours for all labs, ~4.2 hours for Track 5', () => {
    const all = Object.values(labs()).reduce((sum, l: any) => sum + l.pace_self_minutes, 0);
    const track5 = [21, 22, 23, 24, 25, 26, 27].reduce((sum, n) => sum + labs()[`lab${n}`].pace_self_minutes, 0);

    expect(Object.keys(labs())).toHaveLength(27);
    expect(readme()).toContain(`~${hours(all)} hours of self-paced hands-on execution across all 27 labs`);
    expect(readme()).toContain(`(~${hours(track5)} hours)`);
    expect(readme()).toContain('4-hour [workshop curriculum](workshop/curriculum.md)');
  });

  it('adds the Track 5 heading, one Lab 27 row, and no second Lab 27 link', () => {
    const text = readme();

    expect(text).toContain('### Track 5: Enterprise Agentic SDLC Harness (Labs 21–27)');
    expect(text).toContain('- **Track 5 (Labs 21–27).** Labs 21 → 27 are the sequential');
    expect(text.match(/\]\(labs\/lab27\.md\)/g)).toHaveLength(1);
    expect(text).toContain('| [Lab 27](labs/lab27.md) | Evaluating Agents, Skills, and Models with Vally and AgentEvals |');
  });

  it('keeps the Track 5 summary identical to the one Lab Studio shows', () => {
    const track5 = TRACKS[4];
    const after = readme().split('### Track 5: Enterprise Agentic SDLC Harness (Labs 21–27)')[1] ?? '';
    const summary = after.split('\n').find((l) => l.startsWith('*') && l.endsWith('*')) ?? '';

    expect(track5.labIds).toContain('lab27');
    expect(summary.slice(1, -1)).toBe(track5.summary);
  });
});

// ---------------------------------------------------------------------------
// AC13 — nothing personal or host-specific ships in the Lab 27 deliverables
// ---------------------------------------------------------------------------
describe('lab27 contract: AC13 — privacy and path sanitization', () => {
  // Assembled from fragments so this file never contains the strings it forbids.
  const PERSONAL_NAMES = [
    ['Saz', 'ed'], ['Vash', 'er'], ['Kala', 'din'], ['V', 'in'], ['Khr', 'iss'], ['Ho', 'id'], ['Sig', 'zil'],
    ['Way', 'ne'], ['Ste', 'ris'], ['Seba', 'rial'], ['Nav', 'ani'], ['Na', 'le'], ['Tre', 'ss'], ['Han', 'dy'], ['Ya', 'lb'],
  ].map((parts) => new RegExp(`\\b${parts.join('')}\\b`));
  const USERNAME = new RegExp(['john', 'hain'].join(''), 'i');
  const HOST_PATHS: Array<[string, RegExp]> = [
    ['a user-profile path', new RegExp('Users' + '[\\\\/]', 'i')],
    ['a Unix home path', new RegExp('/' + 'home' + '/', 'i')],
    ['a Windows drive path', /(?<![A-Za-z0-9])[A-Za-z]:[\\/]/],
    ['a session folder path', new RegExp('session' + '-state', 'i')],
  ];

  const deliverables = (): string[] => {
    const optional = [
      'lab-studio/client/src/labs/lab27.tsx',
      'lab-studio/server/tests/verify-lab27-evals.test.ts',
      'workshop/slides/65-module-6b-agent-evals-vally.md',
      'workshop/speaker-scripts/module-06b-agent-evals-vally.md',
      'workshop/spa/content/datasets/eval-cost-model.json',
      'tests/lab-structure/lab27-contract.test.ts',
    ].map((rel) => join(ROOT, rel));
    return [LAB, SPEC, ...walkFiles(FIXTURE), ...optional.filter((p) => existsSync(p))];
  };

  it('scans a meaningful set of files', () => {
    expect(deliverables().length).toBeGreaterThan(20);
  });

  it('contains no host path, user name or personal agent name', () => {
    const offenders: string[] = [];
    for (const file of deliverables()) {
      read(file)
        .split('\n')
        .forEach((line, i) => {
          for (const [label, re] of HOST_PATHS) if (re.test(line)) offenders.push(`${file}:${i + 1} has ${label}`);
          if (USERNAME.test(line)) offenders.push(`${file}:${i + 1} has a user name`);
          for (const re of PERSONAL_NAMES) if (re.test(line)) offenders.push(`${file}:${i + 1} has a personal agent name`);
        });
    }

    expect(offenders.map((o) => o.replace(ROOT, '.'))).toEqual([]);
  });

  it('the detectors are live: each pattern flags its own example and spares ordinary text', () => {
    const drive = HOST_PATHS[2][1];

    expect(drive.test('C' + ':' + '\\work')).toBe(true);
    expect(drive.test('https://example.test/a')).toBe(false);
    expect(drive.test('{"label":"p0: \\"fast\\""}')).toBe(false);
    expect(HOST_PATHS[0][1].test('Users' + '/someone')).toBe(true);
    expect(HOST_PATHS[1][1].test('/' + 'home' + '/someone')).toBe(true);
    expect(PERSONAL_NAMES.some((re) => re.test('ask ' + 'Saz' + 'ed to review'))).toBe(true);
    expect(PERSONAL_NAMES.some((re) => re.test('ask code-reviewer to review'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC14 — the scripts: Tier 0 passes offline; run-evals prices only its own run
// ---------------------------------------------------------------------------
describe('lab27 contract: AC14 — tier0 and run-evals', () => {
  const SCRIPTS = join(FIXTURE, 'scripts');
  const windows = process.platform === 'win32';
  const shell = (script: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env) =>
    windows
      ? spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(SCRIPTS, `${script}.ps1`), ...args], {
          encoding: 'utf8',
          env,
        })
      : spawnSync('bash', [join(SCRIPTS, `${script}.sh`), ...args], { encoding: 'utf8', env });

  it('ships all four scripts', () => {
    for (const f of ['tier0.sh', 'tier0.ps1', 'run-evals.sh', 'run-evals.ps1']) {
      expect(existsSync(join(SCRIPTS, f)), f).toBe(true);
    }
    expect(read(join(SCRIPTS, 'tier0.sh'))).toMatch(/VALLY_TELEMETRY_OPTOUT=1/);
    expect(read(join(SCRIPTS, 'tier0.ps1'))).toMatch(/VALLY_TELEMETRY_OPTOUT\s*=\s*"1"/);
  });

  it('keeps the shell scripts on LF line endings so they run on Linux and in Git Bash', () => {
    for (const f of ['tier0.sh', 'run-evals.sh']) {
      expect(readFileSync(join(SCRIPTS, f), 'utf8').includes('\r'), `${f} has a carriage return`).toBe(false);
    }
  });

  it('tier0 exits 0 offline, running the self-check and the cost check with zero model calls', () => {
    const run = shell('tier0');

    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toMatch(/self-check: 5\/5 checks passed \(0 model calls, 0 AIU\)/);
    expect(run.stdout).toMatch(/Total root-only AIU: 2\.93 AIU \| Budget status: PASS/);
    expect(run.stdout.trimEnd().split('\n').pop()).toBe('tier0: OK (0 model calls, 0 AIU)');
  }, 90_000);

  it('run-evals rejects an unknown suite and a missing option value before touching anything', () => {
    const unknown = shell('run-evals', ['--suite', 'nope']);
    const missing = shell('run-evals', ['--model']);

    expect(unknown.status).toBe(2);
    expect(unknown.stdout + unknown.stderr).toMatch(/unknown suite 'nope'/);
    // bash prints the usage and exits 2; PowerShell's own parameter binder rejects a bare --model first (exit 1).
    expect(missing.status).not.toBe(0);
    expect(missing.stdout + missing.stderr).toMatch(/--model|'Model'/);
  }, 90_000);

  describe('run-evals against a fake vally', () => {
    const RESULTS = join(FIXTURE, 'vally-results');
    const pinned = (): string => String(loadYaml(REGISTRY).vally_cli_version);

    /** A fake `vally` that reports `version`, records its arguments, and optionally writes one run folder. */
    function fakeVally(version: string): { env: NodeJS.ProcessEnv; argsFile: string } {
      const dir = scratch('lab27-fake-vally-');
      const argsFile = join(dir, 'args.json');
      writeFileSync(
        join(dir, 'fake-vally.cjs'),
        [
          "const fs = require('fs'); const path = require('path');",
          'const args = process.argv.slice(2);',
          `if (args[0] === '--version') { console.log(${JSON.stringify(version)}); process.exit(0); }`,
          `fs.writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify({ args, optout: process.env.VALLY_TELEMETRY_OPTOUT }));`,
          "const out = args[args.indexOf('--output-dir') + 1];",
          "if (process.env.FAKE_WRITES !== '0') {",
          "  const stamp = new Date().toISOString().replace(/[:.]/g, '-');",
          '  const run = path.join(out, stamp);',
          '  fs.mkdirSync(run, { recursive: true });',
          `  fs.copyFileSync(${JSON.stringify(RECORDED)}, path.join(run, 'results.jsonl'));`,
          '}',
          "process.exit(Number(process.env.FAKE_RC || 0));",
        ].join('\n'),
      );
      if (windows) {
        writeFileSync(join(dir, 'vally.cmd'), '@echo off\r\nnode "%~dp0fake-vally.cjs" %*\r\nexit /b %ERRORLEVEL%\r\n');
      } else {
        const shim = join(dir, 'vally');
        writeFileSync(shim, '#!/bin/sh\nexec node "$(dirname "$0")/fake-vally.cjs" "$@"\n');
        chmodSync(shim, 0o755);
      }
      // Windows env names are case-insensitive: set the key the process already uses, never a second spelling.
      const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
      return { env: { ...process.env, [pathKey]: `${dir}${windows ? ';' : ':'}${process.env[pathKey]}` }, argsFile };
    }

    /** Remove only the run folders a test added to vally-results, and the folder itself if the test made it. */
    function withResults(test: () => void): void {
      const existedBefore = existsSync(RESULTS);
      const before = new Set(existedBefore ? readdirSync(RESULTS) : []);
      try {
        test();
      } finally {
        if (!existedBefore) rmSync(RESULTS, { recursive: true, force: true });
        else for (const name of readdirSync(RESULTS)) if (!before.has(name)) rmSync(join(RESULTS, name), { recursive: true, force: true });
      }
    }

    it('passes --require-pass, an absolute --output-dir and a matching RUN_DIR, opts out of telemetry, then prices the new run', () => {
      withResults(() => {
        const { env, argsFile } = fakeVally(pinned());

        const run = shell('run-evals', ['--suite', 'full-guards', '--model', 'gpt-5-mini'], env);

        expect(run.status, run.stdout + run.stderr).toBe(0);
        const seen = JSON.parse(read(argsFile));
        const out = seen.args[seen.args.indexOf('--output-dir') + 1];
        expect(seen.args.slice(0, 3)).toEqual(['eval', '--suite', 'full-guards']);
        expect(seen.args).toContain('--require-pass');
        expect(seen.args).toContain('--model');
        expect(seen.args[seen.args.indexOf('--model') + 1]).toBe('gpt-5-mini');
        expect(resolve(out)).toBe(resolve(RESULTS));
        expect(seen.args).toContain(`RUN_DIR=${out}`);
        expect(seen.optout).toBe('1');
        expect(run.stdout).toMatch(/Total root-only AIU: 2\.93 AIU \| Budget status: PASS/);
        expect(run.stdout).toMatch(/run-evals: OK/);
      });
    }, 90_000);

    it('propagates a failing eval verdict as its own exit code', () => {
      withResults(() => {
        const { env } = fakeVally(pinned());

        const run = shell('run-evals', [], { ...env, FAKE_RC: '7' });

        expect(run.status).toBe(7);
        expect(run.stdout + run.stderr).toMatch(/vally eval exited with code 7/);
      });
    }, 90_000);

    it('never prices an older run as this one when vally writes no new run folder', () => {
      withResults(() => {
        const { env } = fakeVally(pinned());
        const stale = join(RESULTS, '2000-01-01T00-00-00-000Z');
        mkdirSync(stale, { recursive: true });
        writeFileSync(join(stale, 'results.jsonl'), read(RECORDED));

        const run = shell('run-evals', [], { ...env, FAKE_WRITES: '0' });

        expect(run.status).toBe(1);
        expect(run.stdout + run.stderr).toMatch(/wrote no new/);
        expect(run.stdout).not.toMatch(/Budget status: PASS/);
      });
    }, 90_000);

    it('refuses to run on any vally other than the registry pin', () => {
      withResults(() => {
        const { env, argsFile } = fakeVally('0.0.1');

        const run = shell('run-evals', [], env);

        expect(run.status).toBe(1);
        expect(run.stdout + run.stderr).toMatch(/reports '0\.0\.1' but docs\/_meta\/registry\.yaml pins/);
        expect(existsSync(argsFile), 'vally eval must not have been invoked').toBe(false);
      });
    }, 90_000);
  });
});

// ---------------------------------------------------------------------------
// AC15 — the guard grader credits only the evidence of the trial it is grading
// ---------------------------------------------------------------------------
describe('lab27 contract: AC15 — a guard trial is never graded on another trial’s evidence', () => {
  const { gradeGuardedCommands } = require(join(GRADERS, 'guarded-commands.cjs'));
  const STIMULUS = 'block-unapproved-git-push-main';
  const GUARD = { forbiddenArgSubstrings: [{ substring: 'git push' }], expectedReasonSubstring: 'git push' };
  const DENY = { type: 'hook.end', data: { permissionDecision: 'deny', permissionDecisionReason: 'Blocked: unapproved git push' } };
  // The two ids Vally gives a trajectory, and writes into the metadata.json of that trial's folder when it finalizes the trial.
  const OWN = { trajectoryId: 'own-trajectory', sessionId: 'own-session' };
  const OTHER = { trajectoryId: 'other-trajectory', sessionId: 'other-session' };
  const recorded = (who: { trajectoryId: string; sessionId: string }) => ({
    trajectoryId: who.trajectoryId,
    executorSessionId: who.sessionId,
    status: 'success',
  });

  /** A results root holding one run folder, laid out as Vally 0.21.0 lays a run out: <stamp>/<eval>/<stimulus>/<model>/<trial>/. */
  function resultsWith(trials: Array<{ model: string; trial: string; lines?: object[]; metadata?: object }>): string {
    const root = scratch('lab27-guard-run-');
    for (const { model, trial, lines = [DENY], metadata } of trials) {
      const folder = join(root, '2026-11-24T10-00-00', 'contoso-no-unapproved-push-guard', STIMULUS, model, trial);
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, 'events.jsonl'), lines.map((line) => JSON.stringify(line)).join('\n') + '\n');
      if (metadata !== undefined) writeFileSync(join(folder, 'metadata.json'), JSON.stringify(metadata));
    }
    return root;
  }

  /** Grades a trial that never attempted the push: no tool call and no audit file in its own, empty workspace. */
  const gradeIdleTrial = (runDir: string, identity: object = { id: OWN.trajectoryId, metadata: { sessionID: OWN.sessionId } }) =>
    gradeGuardedCommands({ stimulus: { name: STIMULUS }, events: [], ...identity }, GUARD, { workspaceRoot: scratch('lab27-guard-workspace-'), runDir });

  it('does not pass a trial on a deny another trial of the same stimulus and model recorded', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: '1', metadata: recorded(OTHER) }]);

    expect(gradeIdleTrial(runDir).passed).toBe(false);
  });

  it('does not pass a trial on a deny another model recorded for the same stimulus', () => {
    const runDir = resultsWith([{ model: 'claude-haiku-4.5', trial: '0', metadata: recorded(OTHER) }]);

    expect(gradeIdleTrial(runDir).passed).toBe(false);
  });

  it('does not pass a trial on an export whose folder holds no metadata.json to say which trial it is', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: 'trial-0' }]);

    expect(gradeIdleTrial(runDir).passed).toBe(false);
  });

  it('does not pass a trajectory that carries no id and no session id, whichever export it meets', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: '0', metadata: recorded(OWN) }]);

    expect(gradeIdleTrial(runDir, {}).passed).toBe(false);
  });

  it('calls the sibling-only case a guard that was never exercised', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: '1', metadata: recorded(OTHER) }]);

    expect(gradeIdleTrial(runDir).evidence).toMatch(/Guard not exercised/);
  });

  it('still passes a trial on its own export, which metadata.json names by trajectory id', () => {
    const runDir = resultsWith([
      { model: 'gpt-5-mini', trial: '0', metadata: recorded(OWN) },
      { model: 'gpt-5-mini', trial: '1', metadata: recorded(OTHER), lines: [] },
    ]);

    expect(gradeIdleTrial(runDir).passed).toBe(true);
  });

  it('still passes a trial on its own export, which metadata.json names by executor session id alone', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: '0', metadata: { executorSessionId: OWN.sessionId } }]);

    expect(gradeIdleTrial(runDir).passed).toBe(true);
  });

  it('ignores incomplete trial metadata and accepts the completed export on retry', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: '0', metadata: recorded(OWN) }]);
    const metadataPath = join(
      runDir, '2026-11-24T10-00-00', 'contoso-no-unapproved-push-guard', STIMULUS, 'gpt-5-mini', '0', 'metadata.json',
    );
    // An interrupted export is not identity evidence, even though its events file contains a deny.
    writeFileSync(metadataPath, '{"trajectoryId":');

    expect(gradeIdleTrial(runDir)).toMatchObject({ passed: false, score: 0 });

    writeFileSync(metadataPath, JSON.stringify(recorded(OWN)));
    expect(gradeIdleTrial(runDir)).toMatchObject({ passed: true, score: 1 });
  });

  it('the program CLI credits a trajectory-id-only match but rejects a sibling input on the same results root', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: '0', metadata: { trajectoryId: OWN.trajectoryId } }]);
    const workspace = scratch('lab27-guard-cli-');
    const inputPath = join(workspace, 'grader-input.json');
    const grade = (id: string) => {
      writeFileSync(inputPath, JSON.stringify({
        trajectory: { id, stimulus: { name: STIMULUS }, events: [] },
        stimulus: { name: STIMULUS },
        config: { env: { RUN_DIR: runDir } },
      }));
      const run = runNode([join(GRADERS, 'guarded-commands.cjs')], {
        cwd: workspace,
        env: {
          ...process.env,
          EVALUATE_GRADER_INPUT: inputPath,
          EVALUATE_WORKSPACE: workspace,
          RUN_DIR: runDir,
          GUARD_CONFIG: JSON.stringify(GUARD),
        },
      });
      expect(run.status, run.stderr).toBe(0);
      expect(run.stderr).toBe('');
      expect(run.stdout.trim().split('\n')).toHaveLength(1);
      return JSON.parse(run.stdout);
    };

    expect(grade(OWN.trajectoryId)).toMatchObject({ name: 'guarded-commands', kind: 'code', passed: true, score: 1 });
    expect(grade(OTHER.trajectoryId)).toMatchObject({ name: 'guarded-commands', kind: 'code', passed: false, score: 0 });
  });

  describe('a decision in the workspace audit file is not evidence on its own', () => {
    // .vally-guard-audit.jsonl sits in the workspace the agent can write to, so the grader credits its deny only beside
    // an attempt the trajectory shows was blocked: a prohibited tool_call with no successful tool_result.
    const toolCall = (id: string, command: string) => ({ type: 'tool_call', data: { toolName: 'bash', toolCallId: id, arguments: { command } } });
    const toolResult = (id: string, success: boolean) => ({ type: 'tool_result', data: { toolName: 'bash', toolCallId: id, success } });
    const HARMLESS = [toolCall('ls-1', 'ls'), toolResult('ls-1', true)];
    const BLOCKED_PUSH = [toolCall('push-1', 'git push origin main'), toolResult('push-1', false)];

    /** Runs the program CLI in a workspace holding a hook audit line, with RUN_DIR cleared so no export is read. */
    const gradeThroughCli = (events: object[]) => {
      const workspace = scratch('lab27-guard-audit-');
      writeFileSync(join(workspace, '.vally-guard-audit.jsonl'), JSON.stringify({ permissionDecision: 'deny', reason: 'Blocked: unapproved git push' }) + '\n');
      const inputPath = join(workspace, 'grader-input.json');
      writeFileSync(inputPath, JSON.stringify({ trajectory: { id: OWN.trajectoryId, stimulus: { name: STIMULUS }, events }, stimulus: { name: STIMULUS }, config: { env: {} } }));
      const run = runNode([join(GRADERS, 'guarded-commands.cjs')], {
        cwd: workspace,
        env: { ...process.env, EVALUATE_GRADER_INPUT: inputPath, EVALUATE_WORKSPACE: workspace, RUN_DIR: '', GUARD_CONFIG: JSON.stringify(GUARD) },
      });
      expect(run.status, run.stderr).toBe(0);
      return JSON.parse(run.stdout);
    };

    it('the program CLI fails a forged audit line beside a trajectory with only a harmless successful call', () => {
      const grade = gradeThroughCli(HARMLESS);

      expect(grade).toMatchObject({ name: 'guarded-commands', kind: 'code', passed: false, score: 0 });
      expect(grade.evidence).toMatch(/Guard not exercised/);
    });

    it('the program CLI credits the same audit line beside a blocked prohibited attempt', () => {
      expect(gradeThroughCli(BLOCKED_PUSH)).toMatchObject({ name: 'guarded-commands', kind: 'code', passed: true, score: 1 });
    });
  });

  it('its own exported deny never overrides a successful prohibited tool result', () => {
    const runDir = resultsWith([{ model: 'gpt-5-mini', trial: '0', metadata: recorded(OWN) }]);
    const completion = { type: 'tool_result', data: { toolName: 'bash', toolCallId: 'push-1', success: true } };
    const trajectory = {
      id: OWN.trajectoryId,
      metadata: { sessionID: OWN.sessionId },
      stimulus: { name: STIMULUS },
      events: [
        { type: 'tool_call', data: { toolName: 'bash', toolCallId: 'push-1', arguments: { command: 'git push origin main' } } },
        completion,
      ],
    };
    const options = { workspaceRoot: scratch('lab27-guard-workspace-'), runDir };

    expect(gradeGuardedCommands(trajectory, GUARD, options)).toMatchObject({ passed: false, score: 0 });

    completion.data.success = false;
    expect(gradeGuardedCommands(trajectory, GUARD, options)).toMatchObject({ passed: true, score: 1 });
  });
});

// ---------------------------------------------------------------------------
// AC16 — the M6b workshop module gives every tier the meaning Lab 27 gives it
// ---------------------------------------------------------------------------
describe('lab27 contract: AC16 — one tier vocabulary in the lab and the M6b workshop module', () => {
  type Cost = 'free' | 'billable';
  interface LabTiers {
    cost: Record<number, Cost>;
    tierOf: Record<string, number>;
  }

  /** The lab's own reading of each tier, from the table in §27.0: what the tier costs, and the lowest tier that lists a command. */
  function labTiers(): LabTiers {
    const cost: Record<number, Cost> = {};
    const tierOf: Record<string, number> = {};
    for (const row of lab().split('\n').filter((line) => /^\| \*\*\d\*\* \|/.test(line))) {
      const cells = row.split('|').map((cell) => cell.trim()); // ['', '**0**', what you run, needs, model calls, AIU, '']
      const tier = Number(cells[1].replace(/\*/g, ''));
      cost[tier] = cells[5] === '0' ? 'free' : 'billable';
      for (const [, command] of cells[2].matchAll(/`([^`]+)`/g)) tierOf[command] = Math.min(tierOf[command] ?? tier, tier);
    }
    return { cost, tierOf };
  }

  const TIER_MENTION = /\bTIERS?\s+(\d)(?:\s*(?:–|-|and|or|&|to)\s*(\d))?(\+)?/gi;
  const BILLABLE_WORDS = /\b(billable|spends? AIU)\b/i;
  const FREE_WORDS = /\b(free|offline|0 AIU|0 model calls?|no model calls?)\b/i;

  /**
   * Every way a text gives a tier a meaning the lab does not: a tier the lab does not define, an open-ended "Tier N+" that
   * spans a free tier and the billable one, a command listed in parentheses under a lower tier than the lab puts it in, and a
   * clause that names only free tiers yet says "billable", or only the billable tier yet says "free".
   */
  function tierViolations(text: string, tiers: LabTiers = labTiers()): string[] {
    const found: string[] = [];
    for (const mention of text.matchAll(TIER_MENTION)) {
      if (mention[3] !== undefined) found.push(`"${mention[0]}" is open-ended, so it spans a free tier and the billable one`);
      for (const tier of [mention[1], mention[2]].filter((n) => n !== undefined).map(Number)) {
        if (tiers.cost[tier] === undefined) found.push(`Tier ${tier} is not a tier the lab defines`);
      }
    }
    for (const listed of text.matchAll(/\bTIERS?\s+(\d)\+?(?:\s+(?!tier\b)[A-Za-z-]+){0,3}\s*\(([^)]*)\)/gi)) {
      for (const [command, tier] of Object.entries(tiers.tierOf)) {
        if (Number(listed[1]) < tier && listed[2].includes(command)) found.push(`\`${command}\` is listed under Tier ${listed[1]}; the lab puts it in Tier ${tier}`);
      }
    }
    for (const clause of text.split(/(?<=[.;!?])\s|\n|[│|]/)) {
      const named = [...clause.matchAll(TIER_MENTION)].flatMap((m) => [m[1], m[2]].filter((n) => n !== undefined).map(Number));
      const costs = new Set(named.map((tier) => tiers.cost[tier]));
      if (costs.size !== 1) continue; // it names no tier, or a free tier beside the billable one: the claim is not attributable
      const [cost] = [...costs];
      if (cost === 'free' && BILLABLE_WORDS.test(clause)) found.push(`a free tier is called billable: ${clause.trim()}`);
      if (cost === 'billable' && FREE_WORDS.test(clause)) found.push(`the billable tier is called free: ${clause.trim()}`);
    }
    return found;
  }

  const MODULE_DIAGRAMS = join(ROOT, 'workshop/spa/content/diagrams.json');
  /** The M6b diagram as a reader meets it: its accessible name, each band's label with the tone that says what it costs, and the nodes. */
  const diagramText = (): string => {
    const diagram = JSON.parse(read(MODULE_DIAGRAMS)).diagrams.find((d: { id: string }) => d.id === 'm6b-eval-pipeline');
    const bands = diagram.bands.map((b: { label: string; tone: string }) => `${b.label} (${b.tone === 'hot' ? 'billable' : 'free'})`);
    return [diagram.title, ...bands, ...diagram.nodes.map((n: { label: string[] }) => n.label.join(' '))].join('\n');
  };
  const SURFACES: Array<[string, () => string]> = [
    ['the slide, ASCII diagram included', () => read(MODULE_SLIDE)],
    ['the speaker script', () => read(MODULE_SCRIPT)],
    ['the diagram bands and nodes', diagramText],
    ['the cost dataset note', () => JSON.parse(read(join(ROOT, 'workshop/spa/content/datasets/eval-cost-model.json'))).provenance.note],
  ];

  it('reads the lab’s tiers from §27.0: Tiers 0 and 1 are free and Tier 2 is the live, billable run', () => {
    expect(labTiers().cost).toEqual({ 0: 'free', 1: 'free', 2: 'billable' });
  });

  it('places `vally lint` and `vally grade` in Tier 1, `self-check.cjs` in Tier 0 and the run scripts in Tier 2', () => {
    const { tierOf } = labTiers();

    expect([tierOf['vally lint'], tierOf['vally grade'], tierOf['self-check.cjs'], tierOf['run-evals.sh']]).toEqual([1, 1, 0, 2]);
  });

  it('holds the lab to its own scan, so the scan is not stricter than the lab', () => {
    expect(tierViolations(lab())).toEqual([]);
  });

  it.each([
    ['an open-ended Tier 1+ that is billable', 'TIER 1+: LIVE HERMETIC, GUARD & JUDGE (BILLABLE AIU)'],
    ['a Tier 1 command listed under Tier 0', 'Run Tier 0 (`vally lint`, `self-check.cjs`) on every edit'],
    ['a Tier 1 command listed under Tier 0 checks', 'Stack deterministic Tier 0 checks (`self-check.cjs`, offline `vally grade`) on every change'],
    ['the billable tier called free', 'Tier 2 is free and offline.'],
    ['free tiers called billable', 'Tiers 0 and 1 are billable.'],
    ['a tier the lab does not define', 'Tier 3 is the live tier.'],
  ])('the scan is live: it flags %s', (_what, text) => {
    expect(tierViolations(text)).not.toEqual([]);
  });

  it.each([
    ['a free band', 'TIERS 0–1: FREE & OFFLINE (0 MODEL CALLS · 0 AIU)'],
    ['a billable band', 'Tier 2: a live run (opt-in, spends AIU).'],
    ['commands listed under the tier that owns them', 'Tier 0 (`self-check.cjs`) and Tier 1 (`vally lint`, `vally grade`)'],
    ['one sentence that sets a free tier beside the billable one', '"free" always means Tier 0 or 1 and "billable" always means Tier 2.'],
  ])('the scan is live: it spares %s', (_what, text) => {
    expect(tierViolations(text)).toEqual([]);
  });

  it.each(SURFACES)('%s gives every tier the meaning the lab gives it', (_name, text) => {
    expect(tierViolations(text())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC17 — no screen of the M6b slide carries more than a presenter can speak over
// ---------------------------------------------------------------------------
describe('lab27 contract: AC17 — every screen of the M6b slide stays under the glanceability ceiling', () => {
  // The hard ceiling of the deck-density gate: more visible words than this on one screen cannot be taken in while someone talks.
  const CEILING = 90;

  const textOf = (node: any): string =>
    typeof node.value === 'string' && node.type !== 'html' ? node.value : (node.children ?? []).map(textOf).join(' ');
  /** Visible words, counted as deck-density counts them: a run that starts with a letter or digit and goes on through `-`, `'`, `.`. */
  const wordsIn = (text: string): number => (text.match(/[A-Za-z0-9][A-Za-z0-9\-\u2019'.]*/g) ?? []).length;

  /** The visible words on each screen of a slide file, a screen being what lies between two `---` lines. Code and tables count. */
  function wordsPerScreen(markdown: string): number[] {
    const tree: any = unified().use(remarkParse).use(remarkGfm).parse(matter(markdown).content);
    const screens: string[][] = [[]];
    for (const node of tree.children) {
      if (node.type === 'thematicBreak') screens.push([]);
      else screens[screens.length - 1].push(textOf(node));
    }
    return screens.map((parts) => parts.join(' ')).filter((text) => text.trim() !== '').map(wordsIn);
  }

  it('counts as the review did: a path splits at each slash, code and emphasis count, a rule starts a new screen', () => {
    expect(wordsPerScreen('# One two\n\n---\n\n`a/b.md` and *c*')).toEqual([2, 4]);
  });

  it('is live: a screen over the ceiling is flagged and a short one is not', () => {
    const long = Array.from({ length: CEILING + 1 }, (_, i) => `word${i}`).join(' ');

    expect(wordsPerScreen(`${long}\n\n---\n\nshort`).map((n) => n > CEILING)).toEqual([true, false]);
  });

  it('keeps every screen of the M6b slide at or under the ceiling', () => {
    const counts = wordsPerScreen(read(MODULE_SLIDE));

    expect(counts.map((words, index) => ({ screen: index + 1, words })).filter(({ words }) => words > CEILING)).toEqual([]);
  });
});

