import type { WorkspaceContext } from './types.mjs';
export function initializeWorkspace(directory: string, runtime: string): WorkspaceContext;
export function inspectWorkspace(directory: string, runtime: string): WorkspaceContext;
