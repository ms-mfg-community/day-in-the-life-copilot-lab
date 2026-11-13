import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bashExe } from '../helpers/platform';

const ROOT = process.cwd();
const SOURCE = process.env.PHASE2_QA_SOURCE_ROOT ?? ROOT;
const fixtures: string[] = [];

afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 20_000 });
  expect(result.error, `git ${args.join(' ')}`).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'lab19-qa with spaces-'));
  fixtures.push(dir);
  const checkout = join(dir, 'original checkout');
  // Use real committed repository data, without committing or contacting a remote.
  git(ROOT, 'clone', '--shared', '--no-checkout', '--quiet', ROOT, checkout);
  git(checkout, 'sparse-checkout', 'init', '--cone');
  git(checkout, 'sparse-checkout', 'set', '.github/skills');
  git(checkout, 'checkout', '--quiet', '-B', 'main', 'HEAD');
  const observation = join(dir, 'observation.json');
  const recorder = join(dir, 'copilot-double.cjs');
  // The model is not exercised here. This double writes one file where Copilot
  // would write the requested skill, and records the actual cwd/branch.
  writeFileSync(recorder, `
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const skill = '.github/skills/drift-rehearsal/SKILL.md';
fs.mkdirSync(path.dirname(skill), { recursive: true });
fs.writeFileSync(skill, '---\\nname: drift-rehearsal\\ndescription: Local QA sentinel\\n---\\nADD: read .github/prompts/verify.prompt.md\\n');
fs.writeFileSync(process.env.QA_OBSERVATION, JSON.stringify({
  cwd: fs.realpathSync(process.cwd()),
  branch: cp.execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
  skill: fs.readFileSync(skill, 'utf8')
}));
`);
  return { dir, checkout, observation, recorder };
}

function snippets() {
  const lab = readFileSync(join(SOURCE, 'labs/lab19.md'), 'utf8').replace(/\r\n/g, '\n');
  const section = lab.split(/^## 19\.3 /m)[1]?.split(/^## 19\.4 /m)[0] ?? '';
  const blocks = [...section.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]);
  const setup = blocks.find((block) => block.includes('git worktree add'));
  const cleanup = blocks.find((block) => block.includes('git worktree remove'));
  expect(setup, 'the rehearsal setup must be executable Bash').toBeDefined();
  expect(cleanup, 'the rehearsal cleanup must be executable Bash').toBeDefined();
  return { setup: setup!, cleanup: cleanup! };
}

function run(code: string, context: ReturnType<typeof fixture>) {
  const bash = bashExe();
  expect(bash, 'Git Bash (Windows) or Bash (POSIX) is required').not.toBeNull();
  return spawnSync(bash!, ['--noprofile', '--norc', '-c',
    `copilot() { "$QA_NODE" "$QA_RECORDER"; }\n${code}`], {
    cwd: context.checkout,
    env: {
      ...process.env,
      QA_NODE: process.execPath.replaceAll('\\', '/'),
      QA_RECORDER: context.recorder.replaceAll('\\', '/'),
      QA_OBSERVATION: context.observation,
      GIT_PAGER: 'cat',
    },
    encoding: 'utf8',
    timeout: 20_000,
  });
}

type Context = ReturnType<typeof fixture>;

/** Copilot must not have started anywhere, and the learner's real checkout must be exactly as they left it. */
function expectCopilotNeverStarted(context: Context, result: ReturnType<typeof run>, statusBefore: string) {
  expect(result.error).toBeUndefined();
  expect(existsSync(context.observation), 'copilot was launched even though setup failed').toBe(false);
  expect(existsSync(join(context.checkout, '.github/skills/drift-rehearsal')), 'the planted skill reached the real checkout').toBe(false);
  expect(git(context.checkout, 'status', '--short')).toBe(statusBefore);
  expect(git(context.checkout, 'branch', '--show-current')).toBe('main');
  expect(result.status, 'a failed setup step must be reported, not swallowed').not.toBe(0);
}

describe('Lab 19: execute the local rehearsal without a live model or GitHub', () => {
  it('isolates the planted skill from a dirty main checkout and removes the scratch worktree and branch', () => {
    const context = fixture();
    const original = join(context.checkout, 'AGENTS.md');
    writeFileSync(original, `${readFileSync(original, 'utf8')}\nLocal edits that must survive.\n`);
    const originalBytes = readFileSync(original);
    const originalStatus = git(context.checkout, 'status', '--short');
    const { setup, cleanup } = snippets();

    const result = run(`${setup}\n${cleanup}`, context);

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    const observed = JSON.parse(readFileSync(context.observation, 'utf8')) as {
      cwd: string; branch: string; skill: string;
    };
    expect(observed.cwd).toBe(join(realpathSync(context.dir), 'drift-rehearsal'));
    expect(observed.branch).toBe('scratch/drift-rehearsal');
    expect(observed.skill).toContain('ADD: read .github/prompts/verify.prompt.md');
    expect(readFileSync(original)).toEqual(originalBytes);
    expect(git(context.checkout, 'status', '--short')).toBe(originalStatus);
    expect(git(context.checkout, 'branch', '--show-current')).toBe('main');
    expect(existsSync(join(context.checkout, '.github/skills/drift-rehearsal'))).toBe(false);
    expect(existsSync(join(context.dir, 'drift-rehearsal'))).toBe(false);
    expect(git(context.checkout, 'worktree', 'list', '--porcelain').match(/^worktree /gm)).toHaveLength(1);
    expect(git(context.checkout, 'branch', '--list', 'scratch/drift-rehearsal')).toBe('');
  });
});

describe('Lab 19: a failed setup step never launches Copilot', () => {
  // Copilot's next prompt writes a skill into whichever checkout it starts in, so every way the
  // setup can fail has to stop before `copilot` -- not only the happy path above.

  it('stops when worktree creation fails because an interrupted teardown left the scratch branch behind', () => {
    const context = fixture();
    git(context.checkout, 'branch', 'scratch/drift-rehearsal'); // the folder is gone, the branch is not
    const statusBefore = git(context.checkout, 'status', '--short');
    const { setup } = snippets();

    const result = run(setup, context);

    expectCopilotNeverStarted(context, result, statusBefore);
    expect(existsSync(join(context.dir, 'drift-rehearsal')), 'no scratch folder should exist').toBe(false);
  });

  it('stops when worktree creation fails even though the leftover scratch folder could still be entered', () => {
    const context = fixture();
    git(context.checkout, 'worktree', 'add', '../drift-rehearsal', '-b', 'scratch/drift-rehearsal'); // an earlier attempt, never cleaned up
    const statusBefore = git(context.checkout, 'status', '--short');
    const { setup } = snippets();

    const result = run(setup, context);

    expectCopilotNeverStarted(context, result, statusBefore);
  });

  it('uses the documented recovery commands to remove dirty leftovers before a safe retry', () => {
    const context = fixture();
    const original = join(context.checkout, 'AGENTS.md');
    writeFileSync(original, `${readFileSync(original, 'utf8')}\nUncommitted learner notes.\n`);
    const originalBytes = readFileSync(original);
    const statusBefore = git(context.checkout, 'status', '--short');
    const scratch = join(context.dir, 'drift-rehearsal');
    git(context.checkout, 'worktree', 'add', scratch, '-b', 'scratch/drift-rehearsal');
    writeFileSync(join(scratch, 'unfinished-rehearsal.txt'), 'Discard only this scratch work.');
    const { setup, cleanup } = snippets();
    const lab = readFileSync(join(SOURCE, 'labs/lab19.md'), 'utf8');
    const advice = lab.split(/\r?\n/).find((line) => line.startsWith('> ⚠️ **If this block stops'));
    expect(advice, 'the failed setup needs recovery instructions').toBeDefined();
    const recovery = [...advice!.matchAll(/`(git [^`]+)`/g)].map((match) => match[1]);
    expect(recovery, 'recover both the leftover worktree and its scratch branch').toHaveLength(2);

    expectCopilotNeverStarted(context, run(setup, context), statusBefore);
    const recovered = run(recovery.join(' &&\n'), context);

    expect(recovered.error).toBeUndefined();
    expect(recovered.status, recovered.stderr).toBe(0);
    expect(existsSync(scratch), 'recovery must discard the dirty scratch checkout').toBe(false);
    expect(git(context.checkout, 'branch', '--list', 'scratch/drift-rehearsal')).toBe('');
    expect(existsSync(context.observation), 'recovery itself must not start Copilot').toBe(false);

    const retried = run(`${setup}\n${cleanup}`, context);

    expect(retried.error).toBeUndefined();
    expect(retried.status, retried.stderr).toBe(0);
    const observed = JSON.parse(readFileSync(context.observation, 'utf8'));
    expect(observed.cwd).toBe(join(realpathSync(context.dir), 'drift-rehearsal'));
    expect(observed.branch).toBe('scratch/drift-rehearsal');
    expect(readFileSync(original)).toEqual(originalBytes);
    expect(git(context.checkout, 'status', '--short')).toBe(statusBefore);
    expect(git(context.checkout, 'branch', '--show-current')).toBe('main');
    expect(existsSync(join(context.checkout, '.github/skills/drift-rehearsal'))).toBe(false);
    expect(existsSync(scratch)).toBe(false);
    expect(git(context.checkout, 'worktree', 'list', '--porcelain').match(/^worktree /gm)).toHaveLength(1);
    expect(git(context.checkout, 'branch', '--list', 'scratch/drift-rehearsal')).toBe('');
  });

  it('stops when the directory change fails after the worktree was created', () => {
    const context = fixture();
    const statusBefore = git(context.checkout, 'status', '--short');
    const { setup } = snippets();
    const failingCd = 'cd() { echo "simulated cd failure" >&2; return 1; }';

    const result = run(`${failingCd}\n${setup}`, context);

    expectCopilotNeverStarted(context, result, statusBefore);
    expect(existsSync(join(context.dir, 'drift-rehearsal')), 'worktree creation itself should have succeeded').toBe(true);
    expect(result.stderr).toContain('simulated cd failure');
  });
});
