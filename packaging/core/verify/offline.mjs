import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { coreEnvironment } from '../runtime/profile.mjs';
import { readJson, sha256, writeJson } from '../runtime/io.mjs';
import { command, withServer } from './commands.mjs';
import { exerciseSourceEdits } from './source-edits.mjs';
import { probeAttendeeMemory } from './protocols.mjs';

const runtime = '/opt/lab';
const ROOT = '/workspaces';
const FIRST = join(ROOT, 'first checkout');
const RENAMED = join(ROOT, 'renamed attendee checkout');
const EVIDENCE = join(ROOT, 'core-verification.json');
const NODE_URL = 'http://127.0.0.1:3000';
const DOTNET_URL = 'http://127.0.0.1:52380';
const DOTNET_E2E = 'dotnet/ContosoUniversity.PlaywrightTests/ContosoUniversity.PlaywrightTests.csproj';

function verifyIsolation() {
  assert.notEqual(process.getuid(), 0, 'The core must be exercised as a non-root attendee');
  assert.equal(Object.values(networkInterfaces()).flat().some((nic) => !nic.internal), false, 'Use docker --network none');
  for (const key of ['GITHUB_TOKEN', 'GH_TOKEN', 'COPILOT_GITHUB_TOKEN', 'AZURE_CLIENT_SECRET']) {
    assert.equal(process.env[key], undefined, `Credentials must not be inherited by the package test: ${key}`);
  }
  for (const file of ['.config/gh/hosts.yml', '.copilot/config.json']) {
    assert.equal(existsSync(join(process.env.HOME, file)), false, `The image contains user authentication state: ${file}`);
  }
}

function checkout(destination) {
  assert.equal(existsSync(destination), false, `Refusing to replace ${destination}`);
  mkdirSync(destination);
  execFileSync('tar', ['-xf', join(runtime, 'source.tar'), '-C', destination]);
  execFileSync('git', ['init', '--quiet', destination]);
  const files = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: destination, encoding: 'utf8' }).split('\0').filter(Boolean);
  execFileSync('git', ['add', '--', ...files], { cwd: destination });
  execFileSync('git', [
    '-c', 'user.name=Prepared Core Verification', '-c', 'user.email=verification@example.invalid',
    '-c', 'commit.gpgSign=false', '-c', 'core.hooksPath=/dev/null',
    'commit', '--quiet', '-m', 'test: isolated prepared source',
  ], { cwd: destination });
}

function proveDeniedEndpoints(workspace) {
  for (const [name, url] of [
    ['npm', 'https://registry.npmjs.org/'],
    ['nuget', 'https://api.nuget.org/v3/index.json'],
    ['python', 'https://pypi.org/simple/'],
    ['browsers', 'https://cdn.playwright.dev/'],
  ]) command(workspace, `denied-${name}`, 'curl', ['--head', '--max-time', '2', '--silent', '--show-error', url], process.env, /resolve|connect|timed out|network/i);
}

async function applications(workspace, marker, env, createAttendee) {
  const node = join(workspace, 'node');
  mkdirSync(join(node, '.lab-state/evidence'), { recursive: true });
  await withServer(node, 'node-http', 'node', ['--import', 'tsx', 'web/server.ts'], env, NODE_URL, async () => {
    assert.ok((await (await fetch(NODE_URL)).text()).includes(marker), 'The running Node app ignored its edited source');
    if (createAttendee) {
      const response = await fetch(`${NODE_URL}/students/create`, {
        method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'firstMidName=Attendee&lastName=ResumeSentinel&enrollmentDate=2026-09-08',
      });
      assert.equal(response.status, 302);
    }
    assert.ok((await (await fetch(`${NODE_URL}/students`)).text()).includes('ResumeSentinel'), 'Attendee database work was lost');
  });
  const web = join(workspace, 'dotnet/ContosoUniversity.Web');
  mkdirSync(join(web, '.lab-state/evidence'), { recursive: true });
  await withServer(web, 'dotnet-http', 'dotnet', [join(web, 'bin/Debug/net8.0/ContosoUniversity.Web.dll')], env, DOTNET_URL, async () => {
    assert.ok((await (await fetch(DOTNET_URL)).text()).includes(marker), 'The running .NET app ignored its rebuilt source');
    if (createAttendee) command(workspace, 'dotnet-e2e', 'dotnet', [
      'test', DOTNET_E2E, '--no-restore',
    ], { ...env, E2E_BASE_URL: DOTNET_URL });
  });
}

function fingerprints(workspace) {
  const paths = [
    'node/web/views/layout.ts', 'dotnet/ContosoUniversity.Web/Views/Home/Index.cshtml',
    '.lab-state/memory.jsonl', '.lab-state/contoso-node.db', '.lab-state/contoso-dotnet.db',
  ];
  return Object.fromEntries(paths.map((path) => [path, sha256(readFileSync(join(workspace, path)))]));
}

function negativeStartup() {
  const broken = join(ROOT, 'missing content checkout');
  checkout(broken);
  const incomplete = join(ROOT, 'incomplete-runtime');
  mkdirSync(incomplete);
  writeFileSync(join(incomplete, 'release.json'), readFileSync(join(runtime, 'release.json')));
  command(broken, 'missing-content', 'node', [join(runtime, 'core/runtime/cli.mjs'), 'init'], {
    ...process.env, LAB_RUNTIME: incomplete,
  }, /Missing bundled content/);
  assert.equal(existsSync(join(broken, 'node_modules')), false, 'Missing content triggered partial installation');
}

async function firstRun() {
  checkout(FIRST);
  proveDeniedEndpoints(FIRST);
  command(FIRST, 'initialization', 'lab-core', ['init']);
  const env = coreEnvironment(FIRST, runtime);
  command(FIRST, 'shell-lint', 'shellcheck', ['packaging/core/build.sh', 'packaging/core/build/os.sh',
    'packaging/core/build/dependencies.sh', 'packaging/core/build/content.sh', 'packaging/core/lab-core', 'packaging/core/copilot'], env);
  command(FIRST, 'root-regressions', 'npm', ['test', '--', '--run', 'tests/packaging', 'tests/devcontainer', 'tests/build', 'tests/hooks', '--coverage'], env);
  command(FIRST, 'node-coverage', 'pnpm', ['-C', 'node', 'test', '--coverage'], env);
  const marker = `SOURCE_EDIT_${randomUUID()}`;
  exerciseSourceEdits(FIRST, marker, env);
  command(FIRST, 'node-e2e', 'pnpm', ['-C', 'node', 'exec', 'playwright', 'test'], { ...env, CI: 'true' });
  command(FIRST, 'real-copilot-version', 'copilot', ['--version'], env);
  await applications(FIRST, marker, env, true);
  await probeAttendeeMemory(FIRST, runtime, env, marker, true);
  const before = fingerprints(FIRST);
  command(FIRST, 'resume', 'lab-core', ['ready']);
  assert.deepEqual(fingerprints(FIRST), before, 'Readiness overwrote attendee content');
  renameSync(FIRST, RENAMED);
  command(RENAMED, 'relocated-readiness', 'lab-core', ['ready']);
  await probeAttendeeMemory(RENAMED, runtime, coreEnvironment(RENAMED, runtime), marker);
  assert.deepEqual(fingerprints(RENAMED), before, 'Relocation overwrote attendee content');
  const second = join(ROOT, 'additional worktree');
  execFileSync('git', ['worktree', 'add', '--detach', second, 'HEAD'], { cwd: RENAMED, stdio: 'pipe' });
  command(second, 'additional-worktree', 'lab-core', ['init']);
  negativeStartup();
  const release = readJson(join(runtime, 'release.json'));
  const evidence = { schemaVersion: 1, releaseId: release.releaseId, marker, fingerprints: before,
    network: 'none', nonRootUid: process.getuid(), firstCreation: 'pass', resume: 'pass', renamedCheckout: 'pass',
    additionalWorktree: 'pass', sourceEditBuildTest: 'pass', nodeE2e: 'pass', dotnetE2e: 'pass',
    rebuildEquivalent: 'not-yet-exercised', codespaces: 'not-exercised', copilotAuthorization: 'not-exercised' };
  writeJson(EVIDENCE, evidence);
  process.stdout.write(`${JSON.stringify({ event: 'core.offline.first-pass', ...evidence })}\n`);
}

async function rebuildRun() {
  const evidence = readJson(EVIDENCE);
  assert.equal(evidence.releaseId, readJson(join(runtime, 'release.json')).releaseId);
  assert.deepEqual(fingerprints(RENAMED), evidence.fingerprints, 'Replacing the container lost persistent work');
  command(RENAMED, 'replacement-container-readiness', 'lab-core', ['ready']);
  assert.deepEqual(fingerprints(RENAMED), evidence.fingerprints, 'Rebuild startup rewrote attendee work');
  const env = coreEnvironment(RENAMED, runtime);
  await probeAttendeeMemory(RENAMED, runtime, env, evidence.marker);
  command(RENAMED, 'rebuild-dotnet-build', 'dotnet', ['build', 'dotnet/ContosoUniversity.sln', '--no-restore'], env);
  await applications(RENAMED, evidence.marker, env, false);
  const result = { ...evidence, rebuildEquivalent: 'pass', completedAt: new Date().toISOString() };
  writeJson(EVIDENCE, result);
  process.stdout.write(`${JSON.stringify({ event: 'core.offline.complete', ...result })}\n`);
}

try {
  verifyIsolation();
  if (process.argv[2] === 'first') await firstRun();
  else if (process.argv[2] === 'rebuild') await rebuildRun();
  else throw new Error('Use first or rebuild on a dedicated verification volume');
} catch (error) {
  process.stderr.write(`${JSON.stringify({ event: 'core.offline.failed', error: error.message })}\n`);
  process.exitCode = 1;
}
