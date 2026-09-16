import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  closeSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, realpathSync,
  renameSync, rmSync, unlinkSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { assertPlainPath, readJson, safePath, writeJson } from './io.mjs';
import { assertCompatible, loadRelease, verifyInputs, verifyRuntime } from './release.mjs';
import { normalizePristineScripts, planScriptCompatibility } from './scripts.mjs';

const STATE = '.lab-state';
const MARKER = '.lab-bundle.json';

function readState(workspace, release) {
  const path = assertPlainPath(workspace, `${STATE}/state.json`);
  if (!existsSync(path)) return undefined;
  const state = readJson(path);
  if (state.releaseId !== release.releaseId) throw new Error('Workspace release mismatch; export work before an explicit upgrade');
  if (!['initializing', 'ready'].includes(state.status) || !Array.isArray(state.completed)
      || state.completed.some((name) => !release.bundles.some((bundle) => bundle.name === name))
      || new Set(state.completed).size !== state.completed.length
      || (state.status === 'ready' && state.completed.length !== release.bundles.length)
      || typeof state.workspaceId !== 'string' || !/^[a-f0-9-]{36}$/.test(state.workspaceId)) {
    throw new Error('Invalid workspace initialization state; no automatic reset was performed');
  }
  return state;
}

function inspectTargets(workspace, release, state) {
  for (const bundle of release.bundles) {
    const target = assertPlainPath(workspace, bundle.target);
    if (state?.completed.includes(bundle.name) && !existsSync(target)) {
      throw new Error(`Missing initialized dependencies: ${bundle.target}; refusing to reinstall on resume`);
    }
    if (!existsSync(target)) continue;
    const marker = assertPlainPath(workspace, `${bundle.target}/${MARKER}`);
    if (!state || !existsSync(marker)) throw new Error(`Unowned existing dependencies at ${bundle.target}; use a fresh checkout`);
    const owned = readJson(marker);
    if (owned.releaseId !== release.releaseId || owned.sha256 !== bundle.sha256) {
      throw new Error(`Initialized dependency ownership mismatch: ${bundle.target}`);
    }
  }
}

function hydrate(workspace, runtime, release, bundle) {
  const target = safePath(workspace, bundle.target);
  if (existsSync(target)) return;
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const stage = mkdtempSync(join(dirname(target), '.lab-hydrate-'));
  try {
    const archive = safePath(runtime, bundle.archive);
    const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    for (const entry of entries.trim().split('\n')) {
      if (entry !== './' && entry !== '.') safePath(stage, entry);
    }
    execFileSync('tar', ['-xzf', archive, '--no-same-owner', '-C', stage], { stdio: 'pipe' });
    writeJson(join(stage, MARKER), { releaseId: release.releaseId, sha256: bundle.sha256 });
    renameSync(stage, target);
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true });
  }
}

function acquireLock(workspace) {
  const directory = assertPlainPath(workspace, STATE);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.getuid && lstatSync(directory).uid !== process.getuid()) {
    throw new Error('Workspace state belongs to another user; fix the workspace mount ownership explicitly');
  }
  const path = assertPlainPath(workspace, `${STATE}/initializing.lock`);
  try {
    const descriptor = openSync(path, 'wx', 0o600);
    closeSync(descriptor);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Workspace initialization lock already exists; do not run concurrent initialization');
    throw error;
  }
  return path;
}

export function inspectWorkspace(directory, runtime) {
  const workspace = realpathSync(directory);
  const release = loadRelease(runtime);
  assertCompatible(release);
  verifyInputs(workspace, release);
  verifyRuntime(runtime, release);
  const state = readState(workspace, release);
  if (state?.status !== 'ready') throw new Error('Workspace is not initialized; run lab-core init once');
  inspectTargets(workspace, release, state);
  planScriptCompatibility(workspace, release, false);
  return { workspace, release, state };
}

export function initializeWorkspace(directory, runtime) {
  const workspace = realpathSync(directory);
  const release = loadRelease(runtime);
  assertCompatible(release);
  verifyInputs(workspace, release);
  verifyRuntime(runtime, release);
  const previous = readState(workspace, release);
  inspectTargets(workspace, release, previous);
  planScriptCompatibility(workspace, release, previous?.status !== 'ready');
  const lock = acquireLock(workspace);
  try {
    const current = readState(workspace, release);
    inspectTargets(workspace, release, current);
    const repairs = planScriptCompatibility(workspace, release, current?.status !== 'ready');
    if (current?.status === 'ready') return { workspace, release, state: current };
    const initial = current ?? {
      releaseId: release.releaseId, workspaceId: randomUUID(), status: 'initializing', completed: [],
    };
    writeJson(join(workspace, STATE, 'state.json'), initial);
    normalizePristineScripts(repairs);
    const state = release.bundles.reduce((progress, bundle) => {
      hydrate(workspace, runtime, release, bundle);
      const next = { ...progress, completed: [...new Set([...progress.completed, bundle.name])] };
      writeJson(join(workspace, STATE, 'state.json'), next);
      return next;
    }, initial);
    const ready = { ...state, status: 'ready' };
    writeJson(join(workspace, STATE, 'state.json'), ready);
    return { workspace, release, state: ready };
  } finally {
    unlinkSync(lock);
  }
}
