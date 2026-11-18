import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bashExe, HAS_BASH } from '../helpers/platform';

const ROOT = resolve(__dirname, '..', '..');
const APPENDIX_PATH = join(ROOT, 'labs', 'appendices', 'node', 'lab06.md');
const IS_WINDOWS = process.platform === 'win32';

const appendixMd = (): string => readFileSync(APPENDIX_PATH, 'utf8').replace(/\r\n/g, '\n');

const probe = (command: string, args: string[]): string | null => {
  const r = spawnSync(command, args, { encoding: 'utf8', timeout: 20_000 });
  return r.error || r.status !== 0 ? null : `${r.stdout}${r.stderr}`;
};

const pwshCommand = (): string | null =>
  Number(probe('pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'])?.trim()) >= 7 ? 'pwsh' : null;

const bashWithJqCommand = (): string | null => {
  const candidates = IS_WINDOWS
    ? ['C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe'].filter((p) => existsSync(p))
    : ['bash'];
  return candidates.find((c) => probe(c, ['-c', 'command -v jq']) !== null) ?? null;
};

interface HookSnippet {
  id: string;
  label: string;
  ext: '.sh' | '.ps1';
  command: string | null;
  args: (scriptPath: string) => string[];
  extract: (md: string) => string | undefined;
}

const SNIPPETS: HookSnippet[] = [
  {
    id: 'bash-vscode',
    label: 'Bash (VS Code block)',
    ext: '.sh',
    command: bashWithJqCommand(),
    args: (s) => [s],
    extract: (md) => md.match(/## A\.[^\n]*\n[\s\S]*?```bash\n(#!\/usr\/bin\/env bash\n[\s\S]*?)```/)?.[1],
  },
  {
    id: 'bash-heredoc',
    label: 'Bash (heredoc)',
    ext: '.sh',
    command: bashWithJqCommand(),
    args: (s) => [s],
    extract: (md) =>
      md.match(/cat > \.github\/hooks\/post-tool-use-node-build\.sh << 'HOOK'\n(#!\/usr\/bin\/env bash\n[\s\S]*?)\nHOOK\n/)?.[1],
  },
  {
    id: 'pwsh-vscode',
    label: 'PowerShell (VS Code block)',
    ext: '.ps1',
    command: pwshCommand(),
    args: (s) => ['-NoProfile', '-NonInteractive', '-File', s],
    extract: (md) => md.match(/## B\. PowerShell variant\n[\s\S]*?```powershell\n([\s\S]*?)```/)?.[1],
  },
  {
    id: 'pwsh-heredoc',
    label: 'PowerShell (heredoc)',
    ext: '.ps1',
    command: pwshCommand(),
    args: (s) => ['-NoProfile', '-NonInteractive', '-File', s],
    extract: (md) =>
      md.match(/@'\n([\s\S]*?)\n'@ \| Out-File -FilePath \.github\/hooks\/post-tool-use-node-build\.ps1/)?.[1],
  },
];

interface HookCase {
  name: string;
  stdin: string;
  expectedCalls: string[];
}

interface HookRun {
  status: number | null;
  stdout: string;
  stderr: string;
  pnpmCalls: string[];
}

const WIN_CWD = 'C:\\Users\\johnhain\\Documents\\day-in-the-life-copilot-lab';
const POSIX_CWD = '/workspace/day-in-the-life-copilot-lab';

const patchText = (...lines: string[]): string => ['*** Begin Patch', ...lines, '*** End Patch'].join('\n');

const hookEvent = (toolName: unknown, toolArgs?: unknown, cwd: unknown = WIN_CWD): string =>
  JSON.stringify({
    sessionId: 's',
    timestamp: 1700000000000,
    hookType: 'postToolUse',
    ...(cwd === undefined ? {} : { cwd }),
    ...(toolName === undefined ? {} : { toolName }),
    ...(toolArgs === undefined ? {} : { toolArgs }),
  });

const runsTestOnce = (name: string, stdin: string): HookCase => ({
  name,
  stdin,
  expectedCalls: ['-C node test --run'],
});

const skipsTest = (name: string, stdin: string): HookCase => ({
  name,
  stdin,
  expectedCalls: [],
});

const HOOK_CASES: HookCase[] = [
  // (a) edit/create with an absolute toolArgs.path under cwd + node/ (Windows-backslash and POSIX forms)
  runsTestOnce(
    '(a) edit with Windows absolute toolArgs.path under cwd\\node\\',
    hookEvent('edit', { path: `${WIN_CWD}\\node\\web\\app.ts` }, WIN_CWD),
  ),
  runsTestOnce(
    '(a) create with POSIX absolute toolArgs.path under cwd/node/',
    hookEvent('create', { path: `${POSIX_CWD}/node/tests/student-repo.test.ts` }, POSIX_CWD),
  ),
  runsTestOnce(
    '(a) str_replace_editor with JSON-encoded toolArgs file_path and trailing slash on cwd',
    hookEvent('str_replace_editor', JSON.stringify({ file_path: `${WIN_CWD}\\node\\web\\routes.ts` }), `${WIN_CWD}\\`),
  ),

  // (b) apply_patch raw patch text with absolute headers under cwd/node/
  runsTestOnce(
    '(b) apply_patch *** Update File: with Windows absolute path under cwd\\node\\',
    hookEvent('apply_patch', patchText(`*** Update File: ${WIN_CWD}\\node\\web\\app.ts`, '@@', '-a', '+b'), WIN_CWD),
  ),
  runsTestOnce(
    '(b) apply_patch *** Add/Delete/Move headers under cwd/node/ runs pnpm test exactly once',
    hookEvent(
      'apply_patch',
      patchText(
        `*** Add File: ${POSIX_CWD}/node/web/new.ts`,
        '+export const x = 1;',
        `*** Delete File: ${POSIX_CWD}/node/web/old.ts`,
        `*** Update File: ${POSIX_CWD}/README.md`,
        `*** Move to: ${POSIX_CWD}/node/README.md`,
      ),
      POSIX_CWD,
    ),
  ),

  // (c) relative node/... paths (illustrative event form)
  runsTestOnce(
    '(c) edit with relative node/... path',
    hookEvent('edit', { path: 'node/web/app.ts' }, POSIX_CWD),
  ),

  // (d) paths outside node/, non-edit tools, and non-patch/malformed toolArgs
  skipsTest(
    '(d) path outside node/: Windows cwd\\dotnet\\...',
    hookEvent('edit', { path: `${WIN_CWD}\\dotnet\\ContosoUniversity.Web\\Program.cs` }, WIN_CWD),
  ),
  skipsTest(
    '(d) sibling prefix outside node/: POSIX cwd/node-legacy/... and Windows cwd\\node-legacy\\...',
    hookEvent(
      'apply_patch',
      patchText(
        `*** Update File: ${POSIX_CWD}/node-legacy/index.ts`,
        `*** Update File: ${WIN_CWD}\\node-legacy\\index.ts`,
      ),
      POSIX_CWD,
    ),
  ),
  skipsTest(
    '(d) non-edit tools: bash and view',
    hookEvent('view', { path: `${POSIX_CWD}/node/web/app.ts` }, POSIX_CWD),
  ),
  skipsTest(
    '(d) non-edit tool: bash',
    hookEvent('bash', { command: 'pnpm -C node test', path: `${WIN_CWD}\\node\\web\\app.ts` }, WIN_CWD),
  ),
  skipsTest(
    '(d) toolArgs is empty string',
    hookEvent('edit', '', WIN_CWD),
  ),
  skipsTest(
    '(d) toolArgs is null',
    hookEvent('edit', null, WIN_CWD),
  ),
  skipsTest(
    '(d) toolArgs is a JSON array',
    hookEvent('edit', [`${POSIX_CWD}/node/web/app.ts`], POSIX_CWD),
  ),
  skipsTest(
    '(d) toolArgs is text that is not a patch',
    hookEvent('apply_patch', 'not a patch at all', WIN_CWD),
  ),
];

async function inPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const runHook = (command: string, args: string[], input: string, binDir: string, logFile: string): Promise<HookRun> =>
  new Promise((resolveRun) => {
    const newPath = `${binDir}${delimiter}${process.env.PATH ?? process.env.Path ?? ''}`;
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: newPath,
        Path: newPath,
        PNPM_LOG: logFile,
      },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), 60_000);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.stdin.on('error', () => {});
    const finish = (status: number | null, errText?: string) => {
      clearTimeout(timer);
      const pnpmCalls = existsSync(logFile)
        ? readFileSync(logFile, 'utf8')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
        : [];
      resolveRun({ status, stdout, stderr: errText ? `${stderr}${errText}` : stderr, pnpmCalls });
    };
    child.on('error', (e) => finish(null, String(e)));
    child.on('close', (status) => finish(status));
    child.stdin.end(input);
  });

describe('lab06 Node appendix hook: all four snippets handle real postToolUse payloads', () => {
  const available = SNIPPETS.filter((s) => s.command !== null);
  const results = new Map<string, HookRun[]>();
  let dir = '';
  let binDir = '';

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'lab06-node-hook-'));
    binDir = join(dir, 'bin');
    mkdirSync(binDir, { recursive: true });

    const stubCjs = join(binDir, 'pnpm-stub.cjs');
    writeFileSync(
      stubCjs,
      "const { appendFileSync } = require('node:fs');\n" +
        "if (process.env.PNPM_LOG) appendFileSync(process.env.PNPM_LOG, process.argv.slice(2).join(' ') + '\\n', 'utf8');\n",
    );
    const pnpmSh = join(binDir, 'pnpm');
    writeFileSync(pnpmSh, '#!/usr/bin/env sh\nprintf "%s\\n" "$*" >> "$PNPM_LOG"\n');
    chmodSync(pnpmSh, 0o755);
    const pnpmCmd = join(binDir, 'pnpm.cmd');
    writeFileSync(pnpmCmd, `@"${process.execPath}" "${stubCjs}" %*\r\n`);

    const md = appendixMd();
    for (const s of SNIPPETS) {
      const source = s.extract(md);
      if (source !== undefined) {
        const scriptPath = join(dir, `${s.id}${s.ext}`);
        writeFileSync(scriptPath, source);
        if (s.ext === '.sh') chmodSync(scriptPath, 0o755);
      }
    }

    const jobs = available.flatMap((s) => HOOK_CASES.map((c, index) => ({ s, c, index })));
    const runs = await inPool(jobs, 6, ({ s, c, index }) => {
      const scriptPath = join(dir, `${s.id}${s.ext}`);
      const logFile = join(dir, `pnpm-${s.id}-${index}.log`);
      return runHook(s.command!, s.args(scriptPath), c.stdin, binDir, logFile);
    });
    jobs.forEach(({ s, index }, k) => {
      const list = results.get(s.id) ?? [];
      list[index] = runs[k];
      results.set(s.id, list);
    });
  }, 600_000);

  afterAll(() => {
    if (dir !== '') rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it.each(SNIPPETS.map((s) => [s.id, s.label]))('extracts %s (%s) from labs/appendices/node/lab06.md', (_id, _label) => {
    const snippet = SNIPPETS.find((s) => s.id === _id)!;
    expect(snippet.extract(appendixMd()), `failed to extract ${snippet.label}`).toBeDefined();
  });

  it('keeps the VS Code fence and heredoc fence identical for both Bash and PowerShell', () => {
    const md = appendixMd();
    const bashVscode = SNIPPETS.find((s) => s.id === 'bash-vscode')!.extract(md)?.trim();
    const bashHeredoc = SNIPPETS.find((s) => s.id === 'bash-heredoc')!.extract(md)?.trim();
    const pwshVscode = SNIPPETS.find((s) => s.id === 'pwsh-vscode')!.extract(md)?.trim();
    const pwshHeredoc = SNIPPETS.find((s) => s.id === 'pwsh-heredoc')!.extract(md)?.trim();
    expect(bashHeredoc).toBe(bashVscode);
    expect(pwshHeredoc).toBe(pwshVscode);
  });

  it.skipIf(!HAS_BASH)('both Bash hook snippets pass bash -n syntax validation', () => {
    const bash = bashExe()!;
    for (const id of ['bash-vscode', 'bash-heredoc']) {
      const r = spawnSync(bash, ['-n', join(dir, `${id}.sh`)], { encoding: 'utf8' });
      expect({ id, status: r.status, stderr: r.stderr }).toEqual({ id, status: 0, stderr: '' });
    }
  });

  for (const s of SNIPPETS) {
    it.skipIf(s.command === null)(`${s.label} satisfies criteria (a)-(d) across all ${HOOK_CASES.length} payloads`, () => {
      const runs = results.get(s.id) ?? [];
      const failures = HOOK_CASES.flatMap((c, i) => {
        const r = runs[i];
        if (!r) return [`${c.name}: never ran`];
        if (r.status !== 0) {
          return [`${c.name}: exited ${r.status} (stderr: ${r.stderr.trim().split('\n')[0] ?? ''})`];
        }
        if (JSON.stringify(r.pnpmCalls) !== JSON.stringify(c.expectedCalls)) {
          return [`${c.name}: expected pnpm calls ${JSON.stringify(c.expectedCalls)}, got ${JSON.stringify(r.pnpmCalls)}`];
        }
        return [];
      });
      expect(failures, `${s.label} failed on ${failures.length} case(s)`).toEqual([]);
    });
  }
});
