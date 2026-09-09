import type { Release } from './types.mjs';
export function sealRelease(content: Omit<Release, 'releaseId'>): Release;
export function loadRelease(runtime: string): Release;
export function assertCompatible(release: Release, actual?: Release['platform']): void;
export function verifyInputs(workspace: string, release: Release): void;
export function verifyRuntime(runtime: string, release: Release): void;
