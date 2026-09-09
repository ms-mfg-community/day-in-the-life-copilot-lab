import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { writeJson } from './runtime/io.mjs';

const { values } = parseArgs({ options: {
  image: { type: 'string' }, output: { type: 'string', default: 'packaging/core/out' },
} });
if (!values.image) throw new Error('Pass --image LOCAL_IMAGE_ID_OR_TAG; this command never pulls an image');
const directory = dirname(fileURLToPath(import.meta.url));
const volume = `lab-core-verification-${randomUUID()}`;
const created = [];
const docker = (args, options = {}) => execFileSync('docker', args, { encoding: 'utf8', ...options });
const image = JSON.parse(docker(['image', 'inspect', values.image]))[0];
const output = resolve(values.output);
mkdirSync(output, { recursive: true });

try {
  docker(['volume', 'create', '--label', 'io.github.lab.purpose=local-core-verification', volume]);
  for (const phase of ['first', 'rebuild']) {
    const container = `${volume}-${phase}`;
    created.push(container);
    docker(['create', '--name', container, '--pull=never', '--network=none', '--user=node',
      '--mount', `type=volume,source=${volume},target=/workspaces`,
      '--mount', `type=bind,source=${directory},target=/verification,readonly`,
      '--workdir', '/workspaces', image.Id, 'node', '/verification/verify/offline.mjs', phase]);
    const inspected = JSON.parse(docker(['inspect', container]))[0];
    if (inspected.HostConfig.NetworkMode !== 'none') throw new Error('Verification requires no external network interfaces');
    docker(['start', '--attach', container], { stdio: 'inherit' });
    const completed = JSON.parse(docker(['inspect', container]))[0];
    if (completed.State.ExitCode !== 0) throw new Error(`Offline ${phase} verification failed (exit ${completed.State.ExitCode})`);
    docker(['cp', `${container}:/workspaces/core-verification.json`, join(output, 'verification.json')]);
    docker(['cp', `${container}:/workspaces/renamed attendee checkout/.lab-state/evidence`,
      join(output, `${image.Id.slice(7, 19)}-${phase}-evidence`)]);
    docker(['rm', container]);
  }
  const evidence = JSON.parse(readFileSync(join(output, 'verification.json'), 'utf8'));
  writeJson(join(output, 'verified-image.json'), { imageId: image.Id, imageDigest: null, distribution: 'local-only-unpublished', ...evidence });
  process.stdout.write(`${JSON.stringify({ event: 'core.verify.local', imageId: image.Id, evidence: join(output, 'verified-image.json') })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ event: 'core.verify.failed', error: error.message })}\n`);
  process.exitCode = 1;
} finally {
  for (const container of created) {
    const matches = docker(['container', 'ls', '--all', '--quiet', '--filter', `name=^/${container}$`]).trim();
    if (!matches) continue;
    for (const [name, workspace] of [
      ['first', 'first checkout'], ['renamed', 'renamed attendee checkout'], ['worktree', 'additional worktree'],
    ]) {
      const copied = spawnSync('docker', ['cp', `${container}:/workspaces/${workspace}/.lab-state/evidence`,
        join(output, `${container}-${name}-logs`)], { stdio: 'ignore' });
      if (copied.status !== 0) process.stderr.write(`${JSON.stringify({ event: 'core.evidence.unavailable', workspace })}\n`);
    }
    docker(['rm', '--force', container], { stdio: 'ignore' });
  }
  docker(['volume', 'rm', volume], { stdio: 'ignore' });
}
