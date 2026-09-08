import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export function command(workspace, name, file, args, env = process.env, expectedFailure) {
  const result = spawnSync(file, args, { cwd: workspace, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const logs = join(workspace, '.lab-state/evidence');
  mkdirSync(logs, { recursive: true });
  writeFileSync(join(logs, `${name}.log`), output);
  if (result.error) throw result.error;
  if (expectedFailure) {
    assert.notEqual(result.status, 0, `${name} unexpectedly accepted the negative test`);
    assert.match(output, expectedFailure, `${name} failed for the wrong reason:\n${output.slice(-6000)}`);
  } else {
    assert.equal(result.status, 0, `${name} failed:\n${output.slice(-10000)}`);
  }
  process.stdout.write(`${JSON.stringify({ event: 'core.check', name, status: expectedFailure ? 'expected-failure' : 'pass' })}\n`);
  return output;
}

export async function withServer(workspace, name, file, args, env, url, action) {
  const log = createWriteStream(join(workspace, '.lab-state/evidence', `${name}.log`));
  const child = spawn(file, args, { cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  let startError;
  child.once('error', (error) => { startError = error; });
  try {
    let responsive = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (startError) throw startError;
      if (child.exitCode !== null) throw new Error(`${name} exited before its endpoint was ready; see its log`);
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(500) });
        if (response.ok) { responsive = true; break; }
      } catch (error) {
        if (!(error instanceof TypeError) && error.name !== 'TimeoutError') throw error;
      }
      await delay(250);
    }
    assert.ok(responsive, `${name} did not become HTTP-ready`);
    await action();
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      try { await exited; } finally { clearTimeout(timer); }
    }
    log.end();
  }
}
