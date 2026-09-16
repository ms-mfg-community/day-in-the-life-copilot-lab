import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { archiveSource, resolveInputs } from './build/inputs.mjs';
import { writeJson } from './runtime/io.mjs';

const { values } = parseArgs({
  options: {
    revision: { type: 'string', default: 'HEAD' },
    output: { type: 'string', default: 'packaging/core/out' },
  },
});
const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const temporary = mkdtempSync(join(tmpdir(), 'lab-core-build-'));
const context = join(temporary, 'context');

try {
  const source = archiveSource(repository, values.revision, context);
  const inputs = resolveInputs(context);
  writeJson(join(context, '.lab-build/inputs.json'), inputs);
  const tag = `lab-packaging-core:${source.commit.slice(0, 12)}`;
  const args = [
    'build', '--platform', inputs.platform, '--target', 'prepared',
    '--file', join(context, 'packaging/core/Dockerfile'),
    '--build-arg', `NODE_IMAGE=${inputs.images.node}`,
    '--build-arg', `DOTNET8_IMAGE=${inputs.images.dotnet8}`,
    '--build-arg', `DOTNET9_IMAGE=${inputs.images.dotnet9}`,
    '--build-arg', `SOURCE_COMMIT=${source.commit}`,
    '--tag', tag, context,
  ];
  execFileSync('docker', args, { stdio: 'inherit' });
  const image = JSON.parse(execFileSync('docker', ['image', 'inspect', tag], { encoding: 'utf8' }))[0];
  const release = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'none', tag, 'cat', '/opt/lab/release.json'], { encoding: 'utf8' }));
  const output = resolve(values.output);
  mkdirSync(output, { recursive: true });
  const record = {
    schemaVersion: 1, source, localTag: tag, imageId: image.Id, imageBytes: image.Size,
    imageDigest: null, distribution: 'local-only-unpublished', releaseId: release.releaseId,
    platform: inputs.platform, builtAt: new Date().toISOString(),
    evidence: { container: 'not-yet-exercised', codespaces: 'not-exercised', copilotAuthorization: 'not-exercised' },
  };
  writeJson(join(output, 'release-record.json'), record);
  writeJson(join(output, 'release.json'), release);
  process.stdout.write(`${JSON.stringify({ event: 'core.image.local', record: join(output, 'release-record.json'), ...record })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ event: 'core.build.failed', error: error.message })}\n`);
  process.exitCode = 1;
} finally {
  rmSync(temporary, { recursive: true });
}
