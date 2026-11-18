import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { bashExe, hasCommand, IS_WINDOWS } from '../helpers/platform';

// Execute the lab's own snippets, never copies of its algorithm. All writes
// belong to disposable test fixtures; no live HOME, session, or GitHub account.
const ROOT = process.cwd();
const BODY = readFileSync(join(ROOT, 'labs/lab10.md'), 'utf8').replace(/\r\n/g, '\n');
const SAMPLE = readFileSync(join(ROOT, 'solutions/lab10-session-management/sample-memories.jsonl'), 'utf8');
const fixtures: string[] = [];
const shells = IS_WINDOWS ? ['bash', 'powershell'] as const : ['bash'] as const;

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function fixture(): string {
  const path = mkdtempSync(join(tmpdir(), 'lab10-qa with spaces-'));
  fixtures.push(path);
  return path;
}

function section(id: string): string {
  const start = BODY.indexOf(`## ${id} `);
  expect(start, `missing section ${id}`).toBeGreaterThanOrEqual(0);
  const end = BODY.indexOf('\n## ', start + 1);
  return BODY.slice(start, end === -1 ? undefined : end);
}

function excerpt(id: string, shell: string, marker: string): string {
  const blocks = [...section(id).matchAll(/```(bash|powershell)\n([\s\S]*?)```/g)];
  const block = blocks.find((m) => m[1] === shell && m[2].includes(marker));
  expect(block, `missing ${shell} ${id} excerpt containing ${marker}`).toBeDefined();
  return block![2];
}

function run(shell: string, code: string, home: string, cwd = ROOT) {
  const env = { ...process.env, HOME: home, USERPROFILE: home, LAB10_QA_HOME: home, GIT_PAGER: 'cat' };
  const result = shell === 'bash'
    ? spawnSync(bashExe()!, ['--noprofile', '--norc', '-c', code], { cwd, env, encoding: 'utf8', timeout: 20000 })
    : spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Set-Variable -Name HOME -Value $env:LAB10_QA_HOME -Force; $ErrorActionPreference = 'Stop'; ${code}`],
    { cwd, env, encoding: 'utf8', timeout: 20000 });
  expect(result.error, `${shell} process must start`).toBeUndefined();
  expect(result.status, `${shell} exit; stderr:\n${result.stderr}`).toBe(0);
  return result.stdout;
}

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 20000 });
  expect(result.status, `git ${args.join(' ')}:\n${result.stderr}`).toBe(0);
  return result.stdout.trim();
}

describe('Lab 10 execution boundaries', () => {
  it('names no hyphenated model id, even one present in the registry', () => {
    expect(BODY).not.toMatch(/\b(?:claude|gpt|gemini|grok|mai)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/i);
  });

  it('shows /memory status only, no live import, and no Dreaming or SCNS activation', () => {
    const code = [...BODY.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
    expect(code).not.toMatch(/\/memory\s+(?:on|off)\b/);
    for (const line of code.split('\n').filter((l) => /\bcopilot memories import\b/.test(l))) {
      expect(line).toContain('--dry-run');
    }
    expect(code).not.toMatch(/\bscns\s+(?:install|start|setup)|remoteExport["']?\s*[:=]\s*true/);
  });

  it('separates Memory GA from Dreaming preview and explicitly scopes both store prompts', () => {
    const native = section('10.2');
    const prompts = [...native.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1].trim());
    const userPrompt = prompts.find((text) => text.includes('I prefer that you explain'));
    const repositoryPrompt = prompts.find((text) => text.includes('the Node track lives'));
    expect(native).toMatch(/generally available/);
    expect(native).not.toMatch(/public preview/i);
    expect(userPrompt).toMatch(/^In all my projects, I prefer/);
    expect(repositoryPrompt).toMatch(/^In this repository, the Node track/);
    expect(native.match(/begin the memory text with "Lab 10 exercise:"/g)).toHaveLength(2);
    expect(native).toMatch(/approve once/i);
    expect(native).toMatch(/choose \*\*reject\*\*/i);
    expect(section('10.5')).toMatch(/\*\*public preview\*\*/);
    expect(section('10.5')).toContain('This lab does not enable Dreaming');
  });

  it('keeps the repository fact true in a clean checkout without Node-track dependencies', () => {
    const home = fixture();
    const checkout = join(home, 'checkout');
    git(ROOT, 'clone', '--shared', '--no-checkout', '--quiet', ROOT, checkout);
    git(checkout, 'sparse-checkout', 'init', '--cone');
    git(checkout, 'sparse-checkout', 'set', 'node');
    git(checkout, 'checkout', '--quiet');
    const prompt = [...section('10.2').matchAll(/```text\n([\s\S]*?)```/g)]
      .map((m) => m[1].trim())
      .find((text) => text.startsWith('In this repository,'));

    expect(git(checkout, 'status', '--short')).toBe('');
    expect(existsSync(join(checkout, 'node_modules'))).toBe(false);
    expect(existsSync(join(checkout, 'node/node_modules'))).toBe(false);
    expect(prompt).toBeDefined();
    // The prerequisites deliberately omit Node/pnpm. A runnable test command
    // here would recreate r1's missing-vitest failure, even inside a memory.
    expect(prompt).not.toMatch(/\b(?:pnpm|npm|npx|yarn|bun|dotnet)\b|\bnode\s+(?!track\b)/i);
    const paths = [...prompt!.matchAll(/\b(node\/[a-z0-9/-]*)/g)].map((m) => m[1]);
    expect(paths).toEqual(['node/', 'node/tests/', 'node/e2e/']);
    for (const path of paths) {
      expect(existsSync(join(checkout, path)), `repository fact cites ${path}`).toBe(true);
    }
  });

  it('retains the specified 5/7/115 pace rather than merely agreeing on any numbers', () => {
    const fm = matter(BODY).data;
    const registry = yaml.load(readFileSync(join(ROOT, 'docs/_meta/registry.yaml'), 'utf8')) as {
      labs: { lab10: { pace_presenter_minutes: number; pace_workshop_minutes: number; pace_self_minutes: number } };
    };
    const row = registry.labs.lab10;
    expect([fm.pace.presenter_minutes, row.pace_workshop_minutes, fm.pace.self_paced_minutes])
      .toEqual([5, 7, 115]);
    expect([row.pace_presenter_minutes, row.pace_workshop_minutes, row.pace_self_minutes]).toEqual([5, 7, 115]);
  });

  it('renumbers every in-lab section reference to an existing heading', () => {
    const headings = new Set([...BODY.matchAll(/^#{2,3} (10\.\d+[a-z]?)\b/gm)].map((m) => m[1]));
    const references = [...BODY.matchAll(/§(10\.\d+[a-z]?)\b/g)].map((m) => m[1]);
    expect([...new Set(references)].filter((id) => !headings.has(id))).toEqual([]);
  });
});

describe.each(shells)('%s: extracted global-wiki snippets in isolated HOME', (shell) => {
  it('creates the index, log and zero-byte ownership marker from an absent wiki', () => {
    const home = fixture();
    const lessons = join(home, '.copilot/lessons');
    const code = excerpt('10.3', shell, '.created-by-lab10');
    run(shell, code, home);
    expect(readFileSync(join(lessons, 'index.md'), 'utf8')).toContain('# Lessons — Global Index');
    expect(readFileSync(join(lessons, 'log.md'), 'utf8')).toContain('# Lessons — Global Log');
    expect(readFileSync(join(lessons, '.created-by-lab10'))).toHaveLength(0);
  });

  it('does not overwrite or adopt an existing unmarked wiki, including on repeated invocation', () => {
    const home = fixture();
    const lessons = join(home, '.copilot/lessons');
    mkdirSync(lessons, { recursive: true });
    const sentinel = join(lessons, 'index.md');
    writeFileSync(sentinel, 'personal wiki: preserve these exact bytes\r\n');
    const before = readFileSync(sentinel);
    const code = excerpt('10.3', shell, '.created-by-lab10');
    run(shell, code, home);
    run(shell, code, home);
    expect(readFileSync(sentinel)).toEqual(before);
    expect(existsSync(join(lessons, '.created-by-lab10'))).toBe(false);
    expect(existsSync(join(lessons, 'log.md'))).toBe(false);
  });

  it('preserves an unmarked personal wiki during cleanup', () => {
    const home = fixture();
    const lessons = join(home, '.copilot/lessons');
    mkdirSync(lessons, { recursive: true });
    const sentinel = join(lessons, 'personal.md');
    writeFileSync(sentinel, 'not owned by this lab\n');
    run(shell, excerpt('10.8', shell, '.created-by-lab10'), home);
    expect(readFileSync(sentinel, 'utf8')).toBe('not owned by this lab\n');
  });

  it('removes a marked lab wiki and can clean up again when it is absent', () => {
    const home = fixture();
    const lessons = join(home, '.copilot/lessons');
    run(shell, excerpt('10.3', shell, '.created-by-lab10'), home);
    writeFileSync(join(lessons, 'promoted-topic.md'), 'lab-owned promotion\n');
    const code = excerpt('10.8', shell, '.created-by-lab10');
    run(shell, code, home);
    expect(existsSync(lessons)).toBe(false);
    run(shell, code, home);
    expect(existsSync(lessons)).toBe(false);
  });
});

describe.each(shells)('%s: tracked cleanup in a clean local-clone fixture', (shell) => {
  it('restores staged and unstaged lab edits while preserving an untracked topic', () => {
    const home = fixture();
    const checkout = join(home, 'checkout');
    git(ROOT, 'clone', '--shared', '--no-checkout', '--quiet', ROOT, checkout);
    git(checkout, 'sparse-checkout', 'init', '--cone');
    git(checkout, 'sparse-checkout', 'set', '.github/instructions', '.copilot/lessons');
    git(checkout, 'checkout', '--quiet');
    expect(git(checkout, 'status', '--short')).toBe('');
    const instruction = '.github/instructions/dotnet.instructions.md';
    const log = '.copilot/lessons/log.md';
    const beforeInstruction = readFileSync(join(checkout, instruction));
    const beforeLog = readFileSync(join(checkout, log));
    writeFileSync(join(checkout, instruction), 'lab schema rule\n');
    writeFileSync(join(checkout, log), 'lab log entry\n');
    git(checkout, 'add', '--', instruction, log);
    writeFileSync(join(checkout, log), 'unstaged consolidation after staged log entry\n');
    const topic = join(checkout, '.copilot/lessons/qa-new-topic.md');
    writeFileSync(topic, 'keep untracked files for explicit review\n');
    const code = excerpt('10.8', shell, 'git restore');
    run(shell, code, home, checkout);
    expect(readFileSync(join(checkout, instruction))).toEqual(beforeInstruction);
    expect(readFileSync(join(checkout, log))).toEqual(beforeLog);
    expect(git(checkout, 'diff', '--cached', '--name-only')).toBe('');
    expect(readFileSync(topic, 'utf8')).toBe('keep untracked files for explicit review\n');
    expect(git(checkout, 'status', '--short')).toBe('?? .copilot/lessons/qa-new-topic.md');
  });
});

describe.skipIf(!hasCommand('copilot'))('native import: credential-free disposable config', () => {
  function validate(text: string) {
    const home = fixture();
    const file = join(home, 'memories.jsonl');
    writeFileSync(file, text);
    const env = {
      ...process.env, HOME: home, USERPROFILE: home, COPILOT_HOME: join(home, '.copilot'),
      COPILOT_AUTO_UPDATE: 'false', GH_TOKEN: '', GITHUB_TOKEN: '', COPILOT_GITHUB_TOKEN: '', LAB10_QA_JSONL: file,
    };
    const result = IS_WINDOWS
      ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        '& copilot memories import $env:LAB10_QA_JSONL --dry-run; exit $LASTEXITCODE'],
      { cwd: home, env, encoding: 'utf8', timeout: 20000 })
      : spawnSync('copilot', ['memories', 'import', file, '--dry-run'],
        { cwd: home, env, encoding: 'utf8', timeout: 20000 });
    expect(result.error).toBeUndefined();
    return result;
  }

  it('validates both shipped scopes without credentials or repository/session state', () => {
    const result = validate(SAMPLE);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('no records were submitted');
  });

  it('rejects an empty reason with its line number and invalid_reason, before submission', () => {
    const record = JSON.parse(SAMPLE.split(/\r?\n/)[0]);
    record.reason = '';
    const result = validate(`${JSON.stringify(record)}\n`);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/Line 1(?: \([^)]+\))?:.*non-empty string.*invalid_reason/);
  });

  it('rejects a malformed second record instead of silently accepting a partial file', () => {
    const good = SAMPLE.split(/\r?\n/)[0];
    const result = validate(`${good}\n{malformed JSON\n`);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/Line 2:/);
  });
});
